"use strict";
/**
 * exo.js — AviUtl拡張編集(exedit)用の .exo オブジェクトファイルを生成する。
 *
 * .exo は Shift_JIS のテキスト形式だが、ブラウザのJSからは Shift_JIS を
 * 直接エンコードできないため、必要な日本語リテラルを事前計算済みの
 * バイト列(SJIS_HEX)として埋め込み、バイナリとして組み立てる。
 * (テキスト本文は exo 仕様上 UTF-16LE の16進ダンプなので問題ない)
 */
const Exo = (() => {

  // Shift_JISエンコード済みリテラル(Python: "…".encode('shift_jis').hex() で生成)
  const SJIS_HEX = {
    "画像ファイル": "89e6919c837483408343838b",
    "テキスト": "8365834c83588367",
    "標準描画": "95578f80956089e6",
    "サイズ": "835483438359",
    "表示速度": "955c8ea691ac9378",
    "文字毎に個別オブジェクト": "95b68e9a968882c98cc295ca8349837583578346834e8367",
    "移動座標上に表示する": "88da93ae8dc095578fe382c9955c8ea682b782e9",
    "自動スクロール": "8ea993ae8358834e838d815b838b",
    "拡大率": "8a6791e597a6",
    "透明度": "93a796be9378",
    "回転": "89f1935d",
    "反転": "94bd935d",
    "上下反転": "8fe389ba94bd935d",
    "左右反転": "8db6894594bd935d",
    "輝度反転": "8b50937894bd935d",
    "色相反転": "9046918a94bd935d",
    "透明度反転": "93a796be937894bd935d",
    "音声ファイル": "89b990ba837483408343838b",
    "再生位置": "8dc490b688ca9275",
    "再生速度": "8dc490b691ac9378",
    "ループ再生": "838b815b83768dc490b6",
    "動画ファイルと連携": "93ae89e6837483408343838b82c698418c67",
    "標準再生": "95578f808dc490b6",
    "音量": "89b997ca",
    "左右": "8db68945",
  };

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }

  class Buf {
    constructor() { this.chunks = []; }
    ascii(str) {
      const b = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        b[i] = c < 128 ? c : 0x5F; // 非ASCIIは '_' に置換(パスはASCII推奨)
      }
      this.chunks.push(b);
    }
    sjis(word) {
      const hex = SJIS_HEX[word];
      if (!hex) throw new Error("SJIS literal not registered: " + word);
      this.chunks.push(hexToBytes(hex));
    }
    // parts: 文字列(ASCII) または {j:"日本語リテラル"}
    line(...parts) {
      for (const p of parts) {
        if (typeof p === "string") this.ascii(p);
        else this.sjis(p.j);
      }
      this.chunks.push(new Uint8Array([0x0D, 0x0A])); // CRLF
    }
    bytes() {
      let len = 0;
      for (const c of this.chunks) len += c.length;
      const out = new Uint8Array(len);
      let o = 0;
      for (const c of this.chunks) { out.set(c, o); o += c.length; }
      return out;
    }
  }

  /** exoのtextフィールド: UTF-16LEの16進ダンプ(1024文字固定・ゼロ埋め) */
  function textToHex(str) {
    let hex = "";
    const n = Math.min(str.length, 1023);
    for (let i = 0; i < n; i++) {
      const u = str.charCodeAt(i);
      hex += (u & 0xFF).toString(16).padStart(2, "0");
      hex += ((u >> 8) & 0xFF).toString(16).padStart(2, "0");
    }
    return hex.padEnd(4096, "0");
  }

  function extOf(dataURL) {
    const m = /^data:image\/(\w+)/.exec(dataURL || "");
    const t = m ? m[1].toLowerCase() : "png";
    return t === "jpeg" ? "jpg" : t;
  }

  const AUDIO_EXT = {
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
    "audio/mpeg": "mp3", "audio/mp3": "mp3",
    "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac",
    "audio/ogg": "ogg", "audio/webm": "weba", "audio/flac": "flac",
  };

  function audioExtOf(dataURL) {
    const m = /^data:([^;]+)/.exec(dataURL || "");
    return AUDIO_EXT[m ? m[1].toLowerCase() : ""] || "wav";
  }

  /** 書き出す素材ファイル名の割当計画を立てる */
  function planAssets(state) {
    const bg = state.bgs.map((b, i) => (b && b.dataURL) ? `bg${i + 1}.${extOf(b.dataURL)}` : null);
    const sprites = state.chars.map((c, ci) =>
      c.sprites.map((sp, si) => `char${ci + 1}_${String(si + 1).padStart(2, "0")}.${extOf(sp.dataURL)}`));
    const bgms = (state.bgms || []).map((b, i) => `bgm${String(i + 1).padStart(2, "0")}.${audioExtOf(b.dataURL)}`);
    const ses = (state.ses || []).map((s, i) => `se${String(i + 1).padStart(2, "0")}.${audioExtOf(s.dataURL)}`);
    return { bg, sprites, bgms, ses };
  }

  /** 秒区間の配列 → フレーム区間(1始まり・隙間なし)に変換 */
  function segsToFrames(segs, fps, totalFrames) {
    const f = (t) => Math.round(t * fps);
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      const fStart = Math.max(1, f(segs[i].start) + 1);
      const fEnd = (i === segs.length - 1) ? totalFrames : Math.max(fStart, f(segs[i + 1].start));
      if (fEnd >= fStart) out.push({ ...segs[i], fStart, fEnd });
    }
    return out;
  }

  /**
   * @param {object} state アプリ状態
   * @param {object} tl コンパイル済みタイムライン
   * @param {string} assetDir Windows側で素材を置くフォルダ(ASCII推奨)
   * @returns {Uint8Array} exoファイルのバイト列
   */
  function build(state, tl, assetDir) {
    const plan = planAssets(state);
    const fps = tl.fps, W = tl.width, H = tl.height;
    const totalFrames = Math.max(1, Math.round(tl.duration * fps));
    const dir = assetDir.replace(/[\\/]+$/, "");
    const b = new Buf();
    let objIndex = 0;

    b.line("[exedit]");
    b.line(`width=${W}`);
    b.line(`height=${H}`);
    b.line(`rate=${fps}`);
    b.line("scale=1");
    b.line(`length=${totalFrames}`);
    b.line("audio_rate=44100");
    b.line("audio_ch=2");

    const objHeader = (fStart, fEnd, layer, isAudio) => {
      b.line(`[${objIndex}]`);
      b.line(`start=${fStart}`);
      b.line(`end=${fEnd}`);
      b.line(`layer=${layer}`);
      b.line("overlay=1");
      if (isAudio) b.line("audio=1");
      b.line("camera=0");
    };

    const audioObj = (fStart, fEnd, layer, file, loop, volumePct) => {
      objHeader(fStart, fEnd, layer, true);
      b.line(`[${objIndex}.0]`);
      b.line("_name=", { j: "音声ファイル" });
      b.line({ j: "再生位置" }, "=0.00");
      b.line({ j: "再生速度" }, "=100.0");
      b.line({ j: "ループ再生" }, `=${loop ? 1 : 0}`);
      b.line({ j: "動画ファイルと連携" }, "=0");
      b.line(`file=${dir}\\${file}`);
      b.line(`[${objIndex}.1]`);
      b.line("_name=", { j: "標準再生" });
      b.line({ j: "音量" }, `=${volumePct.toFixed(1)}`);
      b.line({ j: "左右" }, "=0.0");
      objIndex++;
    };

    const stdDraw = (sub, X, Y, zoom) => {
      b.line(`[${objIndex}.${sub}]`);
      b.line("_name=", { j: "標準描画" });
      b.line(`X=${X.toFixed(1)}`);
      b.line(`Y=${Y.toFixed(1)}`);
      b.line("Z=0.0");
      b.line({ j: "拡大率" }, `=${zoom.toFixed(2)}`);
      b.line({ j: "透明度" }, "=0.0");
      b.line({ j: "回転" }, "=0.00");
      b.line("blend=0");
    };

    // ---- レイヤー1: 背景 ----
    for (const seg of segsToFrames(tl.bgSegs, fps, totalFrames)) {
      const file = plan.bg[seg.bgIndex];
      if (!file) continue; // 画像未登録の背景はスキップ(AviUtl側で図形などを敷く)
      const bgImg = state.bgs[seg.bgIndex].img;
      const zoom = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight) * 100;
      objHeader(seg.fStart, seg.fEnd, 1);
      b.line(`[${objIndex}.0]`);
      b.line("_name=", { j: "画像ファイル" });
      b.line(`file=${dir}\\${file}`);
      stdDraw(1, 0, 0, zoom);
      objIndex++;
    }

    // ---- レイヤー2,3: キャラ立ち絵 ----
    for (let ci = 0; ci < state.chars.length; ci++) {
      const char = state.chars[ci];
      if (!char.sprites.length) continue;
      const segs = Timeline.charStateSegments(tl, ci).map(seg => ({
        ...seg,
        spriteIndex: seg.spriteIndex === -2 ? Emotion.pickSprite(char, "通常") : seg.spriteIndex,
      }));
      // 実質同じ立ち絵が続く区間は結合
      const merged = [];
      for (const seg of segs) {
        const last = merged[merged.length - 1];
        if (last && last.spriteIndex === seg.spriteIndex) last.end = seg.end;
        else merged.push({ ...seg });
      }
      for (const seg of segsToFrames(merged, fps, totalFrames)) {
        const sp = char.sprites[seg.spriteIndex];
        if (!sp || !sp.img || !sp.img.naturalWidth) continue;
        const img = sp.img;
        let scale = (H * 0.72) / img.naturalHeight;
        if (img.naturalWidth * scale > W * 0.46) scale = (W * 0.46) / img.naturalWidth;
        const h = img.naturalHeight * scale;
        const cx = ci === 0 ? W * 0.26 : W * 0.74;
        const X = cx - W / 2;
        const Y = H / 2 - h / 2;   // 下端を画面下に合わせる

        objHeader(seg.fStart, seg.fEnd, 2 + ci);
        b.line(`[${objIndex}.0]`);
        b.line("_name=", { j: "画像ファイル" });
        b.line(`file=${dir}\\${plan.sprites[ci][seg.spriteIndex]}`);
        let sub = 1;
        if (char.flip) {
          b.line(`[${objIndex}.${sub}]`);
          b.line("_name=", { j: "反転" });
          b.line({ j: "上下反転" }, "=0");
          b.line({ j: "左右反転" }, "=1");
          b.line({ j: "輝度反転" }, "=0");
          b.line({ j: "色相反転" }, "=0");
          b.line({ j: "透明度反転" }, "=0");
          sub++;
        }
        stdDraw(sub, X, Y, scale * 100);
        objIndex++;
      }
    }

    // ---- レイヤー5: BGM / レイヤー6: SE ----
    const f = (t) => Math.round(t * fps);
    const bgmVolPct = (state.settings.bgmVolume ?? 0.5) * 100;
    const seVolPct = (state.settings.seVolume ?? 0.7) * 100;
    for (const seg of (tl.bgmSegs || [])) {
      if (seg.bgmIndex < 0) continue;
      const file = plan.bgms[seg.bgmIndex];
      if (!file) continue;
      const fStart = Math.max(1, f(seg.start) + 1);
      const fEnd = Math.max(fStart, Math.min(totalFrames, f(seg.end)));
      audioObj(fStart, fEnd, 5, file, true, bgmVolPct);
    }
    for (const ev of (tl.seEvents || [])) {
      const file = plan.ses[ev.seIndex];
      if (!file) continue;
      const asset = state.ses[ev.seIndex];
      const durSec = (asset && asset.buffer) ? asset.buffer.duration : 2.0;
      const fStart = Math.max(1, f(ev.t) + 1);
      const fEnd = Math.max(fStart, Math.min(totalFrames, fStart + f(durSec)));
      audioObj(fStart, fEnd, 6, file, false, seVolPct);
    }

    // ---- レイヤー4: 字幕テキスト ----
    for (const line of tl.lines) {
      const char = state.chars[line.charIndex];
      const fStart = Math.max(1, f(line.start) + 1);
      const fEnd = Math.max(fStart, Math.min(totalFrames, f(line.end)));
      const size = Math.round(state.settings.subtitleSize * (H / 720));
      objHeader(fStart, fEnd, 4);
      b.line(`[${objIndex}.0]`);
      b.line("_name=", { j: "テキスト" });
      b.line({ j: "サイズ" }, `=${size}`);
      b.line({ j: "表示速度" }, "=0.0");
      b.line({ j: "文字毎に個別オブジェクト" }, "=0");
      b.line({ j: "移動座標上に表示する" }, "=0");
      b.line({ j: "自動スクロール" }, "=0");
      b.line("B=1");
      b.line("I=0");
      b.line("type=3");        // 縁取り文字
      b.line("autoadjust=0");
      b.line("soft=1");
      b.line("monospace=0");
      b.line("align=7");        // 中央揃え[下]
      b.line("spacing_x=0");
      b.line("spacing_y=4");
      b.line("precision=1");
      b.line("color=ffffff");
      b.line(`color2=${(char.color || "#000000").replace("#", "")}`);
      b.line("font=MS UI Gothic");
      b.line(`text=${textToHex(line.text)}`);
      stdDraw(1, 0, H * 0.445, 100);
      objIndex++;
    }

    return b.bytes();
  }

  return { build, planAssets };
})();
