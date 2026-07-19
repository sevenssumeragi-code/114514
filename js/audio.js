"use strict";
/**
 * audio.js — BGM/SEの場面自動割当と、Web Audioによる再生エンジン。
 *
 * - 場面(シーン)のムードをセリフの感情分布から推定し、タグの合う BGM を自動選択
 * - 感情の強いセリフの頭で SE を自動発火
 * - プレビュー再生と動画書き出し(MediaRecorder)の両方から同じエンジンを使う
 */
const AudioLib = (() => {

  // 場面ムードのタグ(BGM登録時に付ける)
  const MOODS = ["日常", "コミカル", "緊張", "激しい", "悲しい", "感動", "静か"];
  // SEの種類タグ
  const SE_TAGS = ["衝撃", "ツッコミ", "笑い", "きゅん", "悲しい", "汎用"];

  // セリフの感情 → ムードへの寄与
  const EMO_TO_MOOD = {
    "笑顔":   { "コミカル": 1.0 },
    "照れ":   { "コミカル": 0.6, "感動": 0.4 },
    "怒り":   { "激しい": 1.0 },
    "叫び":   { "激しい": 1.0 },
    "驚き":   { "緊張": 1.0 },
    "悲しみ": { "悲しい": 1.0 },
    "疑問":   { "緊張": 0.3, "日常": 0.5 },
    "通常":   { "日常": 0.6 },
  };

  // ムード → BGMタグの代替チェーン
  const MOOD_FALLBACK = {
    "日常":   ["日常", "コミカル", "静か"],
    "コミカル": ["コミカル", "日常"],
    "緊張":   ["緊張", "激しい", "静か"],
    "激しい": ["激しい", "緊張"],
    "悲しい": ["悲しい", "静か", "感動"],
    "感動":   ["感動", "悲しい", "日常"],
    "静か":   ["静か", "悲しい", "日常"],
  };

  // セリフの感情 → SEタグ
  const EMO_TO_SE = {
    "驚き": "衝撃",
    "叫び": "衝撃",
    "怒り": "ツッコミ",
    "笑顔": "笑い",
    "悲しみ": "悲しい",
    "照れ": "きゅん",
  };
  const SE_FALLBACK = {
    "衝撃": ["衝撃", "ツッコミ", "汎用"],
    "ツッコミ": ["ツッコミ", "衝撃", "汎用"],
    "笑い": ["笑い", "きゅん", "汎用"],
    "きゅん": ["きゅん", "笑い", "汎用"],
    "悲しい": ["悲しい", "きゅん", "汎用"],
    "汎用": ["汎用"],
  };

  /** 区間内のセリフからムードを推定 */
  function moodOfLines(lines) {
    const score = {};
    for (const l of lines) {
      const w = EMO_TO_MOOD[l.emotion] || EMO_TO_MOOD["通常"];
      for (const [mood, v] of Object.entries(w)) {
        score[mood] = (score[mood] || 0) + v;
      }
    }
    let best = "日常", bestV = 0;
    for (const m of MOODS) {
      if ((score[m] || 0) > bestV) { best = m; bestV = score[m]; }
    }
    return best;
  }

  /** ムードに合うBGMのインデックスを返す(無ければ最初のBGM、BGM自体が無ければ-1) */
  function pickBgm(bgms, mood) {
    if (!bgms.length) return -1;
    for (const tag of (MOOD_FALLBACK[mood] || [mood])) {
      const i = bgms.findIndex(b => b.tags.includes(tag));
      if (i >= 0) return i;
    }
    return 0;
  }

  /** タグに合うSEのインデックス(無ければ-1) */
  function pickSe(ses, tag) {
    if (!ses.length) return -1;
    for (const t of (SE_FALLBACK[tag] || [tag])) {
      const i = ses.findIndex(s => s.tags.includes(t));
      if (i >= 0) return i;
    }
    return -1;
  }

  /**
   * タイムラインへのBGM/SE自動割当。
   * @returns {{ bgmSegs: [{start,end,bgmIndex,mood}], seEvents: [{t,seIndex,tag,auto}] }}
   */
  function assign(state, tl, directives) {
    const bgms = state.bgms, ses = state.ses;
    const { bgmForces, manualSes } = directives; // parserからの@bgm/@se

    // --- BGM: 場面(bgSegs)境界と@bgm指定位置で区切る ---
    const bounds = new Set([0, tl.duration]);
    for (const seg of tl.bgSegs) bounds.add(seg.start);
    for (const f of bgmForces) bounds.add(f.t);
    const sorted = [...bounds].filter(t => t < tl.duration).sort((a, b) => a - b);

    const rawSegs = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i];
      const end = (i + 1 < sorted.length) ? sorted[i + 1] : tl.duration;
      if (end - start < 0.01) continue;
      // この区間に効いている@bgm指定(最後のもの)
      let force = null;
      for (const f of bgmForces) {
        if (f.t <= start + 0.001) force = f;
      }
      let mood, bgmIndex;
      if (force && force.off) {
        mood = "(なし)";
        bgmIndex = -1;
      } else {
        const linesIn = tl.lines.filter(l => l.start < end && l.end > start);
        mood = (force && force.tag) ? force.tag : moodOfLines(linesIn);
        bgmIndex = pickBgm(bgms, mood);
      }
      rawSegs.push({ start, end, bgmIndex, mood });
    }
    // 同じBGMが続く区間は結合(曲が途切れないように)
    const bgmSegs = [];
    for (const seg of rawSegs) {
      const last = bgmSegs[bgmSegs.length - 1];
      if (last && last.bgmIndex === seg.bgmIndex) last.end = seg.end;
      else bgmSegs.push({ ...seg });
    }

    // --- SE: 感情が動いたセリフの頭で発火 ---
    const seEvents = [];
    const minGap = 3.0;
    let lastT = -Infinity;
    let prevEmo = null;
    for (const l of tl.lines) {
      const tag = EMO_TO_SE[l.emotion];
      if (tag && l.emotion !== prevEmo && l.start - lastT >= minGap) {
        const seIndex = pickSe(ses, tag);
        if (seIndex >= 0) {
          seEvents.push({ t: l.start, seIndex, tag, auto: true });
          lastT = l.start;
        }
      }
      prevEmo = l.emotion;
    }
    for (const m of manualSes) {
      const seIndex = pickSe(ses, m.tag);
      if (seIndex >= 0) seEvents.push({ t: m.t, seIndex, tag: m.tag, auto: false });
    }
    seEvents.sort((a, b) => a.t - b.t);

    return { bgmSegs, seEvents };
  }

  // ---------- 再生エンジン ----------

  class Engine {
    constructor() {
      this.ctx = null;
      this.nodes = [];
    }

    ensureCtx() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }

    /** dataURL → AudioBuffer(assetにキャッシュ) */
    async decode(asset) {
      if (asset.buffer) return asset.buffer;
      const ctx = this.ensureCtx();
      const bin = atob(asset.dataURL.split(",")[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      asset.buffer = await ctx.decodeAudioData(bytes.buffer);
      return asset.buffer;
    }

    /** タイムラインが参照する音源をすべてデコードしておく */
    async prepare(state) {
      const assets = [...state.bgms, ...state.ses];
      for (const a of assets) {
        try { await this.decode(a); }
        catch (e) { console.warn("音声のデコードに失敗:", a.label, e); a.broken = true; }
      }
    }

    /**
     * 時刻t0からの再生をスケジュールする。
     * @param {AudioContext} ctx 使用するコンテキスト(書き出し時は専用のものを渡す)
     * @param {AudioNode} dest 出力先(書き出し時はMediaStreamDestination)
     */
    start(t0, state, tl, ctx, dest) {
      ctx = ctx || this.ensureCtx();
      dest = dest || ctx.destination;
      const now = ctx.currentTime + 0.05;
      const bgmVol = state.settings.bgmVolume;
      const seVol = state.settings.seVolume;
      const FADE = 0.6;

      for (const seg of (tl.bgmSegs || [])) {
        if (seg.bgmIndex < 0 || seg.end <= t0) continue;
        const asset = state.bgms[seg.bgmIndex];
        if (!asset || !asset.buffer || asset.broken) continue;
        const startAt = Math.max(seg.start, t0);
        const when = now + (startAt - t0);
        const offset = (startAt - seg.start) % asset.buffer.duration;
        const src = ctx.createBufferSource();
        src.buffer = asset.buffer;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(bgmVol, when + (startAt === seg.start ? FADE : 0.05));
        const endWhen = now + (seg.end - t0);
        gain.gain.setValueAtTime(bgmVol, Math.max(when, endWhen - FADE));
        gain.gain.linearRampToValueAtTime(0, endWhen);
        src.connect(gain).connect(dest);
        src.start(when, offset);
        src.stop(endWhen + 0.05);
        this.nodes.push(src, gain);
      }

      for (const ev of (tl.seEvents || [])) {
        if (ev.t < t0 - 0.05) continue;
        const asset = state.ses[ev.seIndex];
        if (!asset || !asset.buffer || asset.broken) continue;
        const src = ctx.createBufferSource();
        src.buffer = asset.buffer;
        const gain = ctx.createGain();
        gain.gain.value = seVol;
        src.connect(gain).connect(dest);
        src.start(now + Math.max(0, ev.t - t0));
        this.nodes.push(src, gain);
      }
    }

    stop() {
      for (const n of this.nodes) {
        try { if (n.stop) n.stop(); n.disconnect(); } catch (_) { /* 停止済み */ }
      }
      this.nodes = [];
    }
  }

  // ---------- WAVエンコード(サンプル音源の生成用) ----------

  /** AudioBuffer → 16bit PCM WAV の dataURL */
  function bufferToWavDataURL(buffer) {
    const ch = buffer.numberOfChannels;
    const rate = buffer.sampleRate;
    const len = buffer.length;
    const dataSize = len * ch * 2;
    const out = new ArrayBuffer(44 + dataSize);
    const v = new DataView(out);
    const ws = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    ws(0, "RIFF"); v.setUint32(4, 36 + dataSize, true); ws(8, "WAVE");
    ws(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    ws(36, "data"); v.setUint32(40, dataSize, true);
    let off = 44;
    const chans = [];
    for (let c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < ch; c++) {
        const s = Math.max(-1, Math.min(1, chans[c][i]));
        v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
      }
    }
    const bytes = new Uint8Array(out);
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return "data:audio/wav;base64," + btoa(bin);
  }

  return { MOODS, SE_TAGS, moodOfLines, pickBgm, pickSe, assign, Engine, bufferToWavDataURL };
})();
