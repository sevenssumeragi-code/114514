"use strict";
/**
 * analyzer.js — 既存BB劇場動画の解析(テンポ模倣用プロファイル抽出)。
 *
 * ブラウザ内だけで動画を解析し、以下を抽出する:
 *  - カット割り(場面転換)     … フレーム全体の差分スパイク
 *  - 会話のテンポ              … 画面下部(字幕領域)の変化間隔 → セリフの長さ・間
 *  - キャラの入れ替わり        … 画面左右の変化量 → 話者サイド推定
 *  - BGMの切り替わり           … 音声のRMS/ゼロ交差率の変化点
 *  - SEの頻度                  … 短時間の音量スパイク
 *
 * 抽出結果(プロファイル)はシナリオ生成に渡され、
 * 場面数・セリフ数・表示秒数・間・話者交代が新しい動画に移植される。
 */
const Analyzer = (() => {

  const MAX_ANALYZE_SEC = 480;  // 解析する最大尺(8分)
  const W = 96, H = 54;         // 解析用の縮小解像度

  function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
  function std(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(mean(arr.map(v => (v - m) * (v - m))));
  }
  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  /** しきい値超えのピーク時刻を最小間隔つきで抽出 */
  function peaks(times, values, threshold, minSep) {
    const out = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] < threshold) continue;
      if (out.length && times[i] - out[out.length - 1] < minSep) {
        continue;
      }
      out.push(times[i]);
    }
    return out;
  }

  /** 縮小フレームの輝度配列を領域別に差分する */
  function frameDiffs(cur, prev) {
    let full = 0, bot = 0, left = 0, right = 0;
    let nFull = 0, nBot = 0, nLeft = 0, nRight = 0;
    const botY = Math.floor(H * 0.72);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.abs(cur[y * W + x] - prev[y * W + x]);
        full += d; nFull++;
        if (y >= botY) { bot += d; nBot++; }
        else {
          if (x < W * 0.45) { left += d; nLeft++; }
          else if (x > W * 0.55) { right += d; nRight++; }
        }
      }
    }
    return {
      full: full / nFull,
      bot: bot / nBot,
      left: left / nLeft,
      right: right / nRight,
    };
  }

  /** 映像の解析(シーク走査) */
  async function analyzeFrames(video, duration, onProgress) {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const step = Math.max(0.2, duration / 480); // 最大~480サンプル
    const times = [], fulls = [], bots = [], lefts = [], rights = [];
    let prev = null;

    for (let t = 0; t < duration; t += step) {
      await new Promise((resolve, reject) => {
        const onSeek = () => { video.removeEventListener("seeked", onSeek); resolve(); };
        video.addEventListener("seeked", onSeek);
        video.onerror = () => reject(new Error("動画のデコードに失敗しました"));
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;
      const luma = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) {
        luma[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
      }
      if (prev) {
        const d = frameDiffs(luma, prev);
        times.push(t); fulls.push(d.full); bots.push(d.bot);
        lefts.push(d.left); rights.push(d.right);
      }
      prev = luma;
      if (onProgress) onProgress(0.1 + 0.7 * (t / duration));
    }
    return { times, fulls, bots, lefts, rights, step };
  }

  /** 音声の解析(BGM切替とSE頻度) */
  async function analyzeAudio(arrayBuffer, duration, onProgress) {
    let buf;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      buf = await ctx.decodeAudioData(arrayBuffer);
      ctx.close();
    } catch (_) {
      return { bgmSwitches: [], seTimes: [] }; // 音声なし/非対応コーデック
    }
    const ch = buf.getChannelData(0);
    const rate = buf.sampleRate;
    const maxSec = Math.min(duration, buf.duration);

    // 0.5秒窓のRMSとゼロ交差率
    const win = Math.floor(rate * 0.5);
    const rms = [], zcr = [], wTimes = [];
    for (let s = 0; s + win < Math.floor(maxSec * rate); s += win) {
      let sum = 0, z = 0;
      for (let i = 0; i < win; i++) {
        const v = ch[s + i];
        sum += v * v;
        if (i > 0 && (v >= 0) !== (ch[s + i - 1] >= 0)) z++;
      }
      rms.push(Math.sqrt(sum / win));
      zcr.push(z / win);
      wTimes.push(s / rate);
    }
    // 変化量(ノベルティ) = RMS変化 + 音色(ZCR)変化
    const novelty = [];
    for (let i = 1; i < rms.length; i++) {
      const dr = Math.abs(rms[i] - rms[i - 1]) / (mean(rms) + 1e-6);
      const dz = Math.abs(zcr[i] - zcr[i - 1]) / (mean(zcr) + 1e-6);
      novelty.push(dr + dz);
    }
    const nTimes = wTimes.slice(1);
    const bgmSwitches = peaks(nTimes, novelty, mean(novelty) + 2.0 * std(novelty), 8.0);

    // SE: 50ms窓での急激な音量スパイク
    const sWin = Math.floor(rate * 0.05);
    const sRms = [];
    for (let s = 0; s + sWin < Math.floor(maxSec * rate); s += sWin) {
      let sum = 0;
      for (let i = 0; i < sWin; i++) sum += ch[s + i] * ch[s + i];
      sRms.push(Math.sqrt(sum / sWin));
    }
    const med = median(sRms) + 1e-6;
    const seTimes = [];
    for (let i = 0; i < sRms.length; i++) {
      const t = (i * sWin) / rate;
      if (sRms[i] > med * 4 && (!seTimes.length || t - seTimes[seTimes.length - 1] > 2.0)) {
        seTimes.push(t);
      }
    }
    if (onProgress) onProgress(0.95);
    return { bgmSwitches, seTimes };
  }

  /**
   * 動画ファイルを解析してプロファイルを返す。
   * @param {File} file
   * @param {(ratio:number)=>void} onProgress
   */
  async function analyze(file, onProgress) {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    try {
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("この動画は読み込めませんでした(対応形式: MP4/WebM)"));
      });
      const duration = Math.min(video.duration, MAX_ANALYZE_SEC);
      if (!isFinite(duration) || duration < 2) {
        throw new Error("動画が短すぎるか、長さを取得できませんでした");
      }
      if (onProgress) onProgress(0.05);

      const f = await analyzeFrames(video, duration, onProgress);
      const audioRes = await analyzeAudio(await file.arrayBuffer(), duration, onProgress);

      // --- カット(場面転換) ---
      const cutTimes = peaks(f.times, f.fulls, mean(f.fulls) + 2.5 * std(f.fulls), 1.2);

      // --- 字幕変化 → セリフ区間 ---
      const subThreshold = Math.max(mean(f.bots) + 1.2 * std(f.bots), 2.0);
      const subChanges = peaks(f.times, f.bots, subThreshold, 0.5);
      const lines = [];
      for (let i = 0; i < subChanges.length - 1; i++) {
        const dur = subChanges[i + 1] - subChanges[i];
        if (dur >= 0.6 && dur <= 12) {
          lines.push({ start: subChanges[i], dur, gapAfter: 0 });
        }
      }
      // 間(ま): セリフ区間として採用されなかった長い間隔を直前セリフの後の間として記録
      for (let i = 0; i < lines.length - 1; i++) {
        const gap = lines[i + 1].start - (lines[i].start + lines[i].dur);
        if (gap > 0.3) lines[i].gapAfter = Math.min(gap, 5);
      }

      // --- 話者サイド推定(セリフ開始直後に左右どちらが動いたか) ---
      const speakerPattern = [];
      let detected = 0;
      for (const line of lines) {
        let l = 0, r = 0, n = 0;
        for (let i = 0; i < f.times.length; i++) {
          if (f.times[i] >= line.start - 0.1 && f.times[i] <= line.start + 0.6) {
            l += f.lefts[i]; r += f.rights[i]; n++;
          }
        }
        if (n && Math.abs(l - r) > (l + r) * 0.15) {
          speakerPattern.push(l > r ? 0 : 1);
          detected++;
        } else {
          speakerPattern.push(null);
        }
      }
      // 欠損は交互で補間
      for (let i = 0; i < speakerPattern.length; i++) {
        if (speakerPattern[i] === null) {
          speakerPattern[i] = i > 0 ? 1 - speakerPattern[i - 1] : 0;
        }
      }

      // --- 場面ごとのセリフ数 ---
      const sceneBounds = [0, ...cutTimes, duration];
      const scenes = [];
      for (let i = 0; i < sceneBounds.length - 1; i++) {
        const s = sceneBounds[i], e = sceneBounds[i + 1];
        if (e - s < 1.0) continue;
        const count = lines.filter(l => l.start >= s && l.start < e).length;
        scenes.push({ start: s, end: e, lineCount: Math.max(1, count) });
      }

      if (onProgress) onProgress(1);
      return {
        fileName: file.name,
        duration,
        scenes,
        lines,
        speakerPattern,
        speakerDetected: detected / Math.max(1, lines.length),
        bgmSwitches: audioRes.bgmSwitches,
        seTimes: audioRes.seTimes,
        stats: {
          medianLineDur: median(lines.map(l => l.dur)),
          meanGap: mean(lines.map(l => l.gapAfter).filter(g => g > 0)),
          linesPerMinute: lines.length / (duration / 60),
        },
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** プロファイルのUI表示用サマリー */
  function summarize(p) {
    return [
      `📼 ${p.fileName}(${Math.round(p.duration)}秒を解析)`,
      `場面転換: ${p.scenes.length}場面 / セリフ: ${p.lines.length}行(${p.stats.linesPerMinute.toFixed(1)}行/分)`,
      `セリフの長さ(中央値): ${p.stats.medianLineDur.toFixed(1)}秒 / 平均の間: ${(p.stats.meanGap || 0).toFixed(1)}秒`,
      `BGM切替: ${p.bgmSwitches.length}回 / SE的な音: ${p.seTimes.length}回`,
      `話者サイド検出率: ${Math.round(p.speakerDetected * 100)}%`,
    ].join("\n");
  }

  return { analyze, summarize };
})();
