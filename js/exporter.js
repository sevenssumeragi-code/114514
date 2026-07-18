"use strict";
/**
 * exporter.js — canvas.captureStream + MediaRecorder による動画書き出し。
 * ブラウザが対応していれば MP4 (H.264)、非対応なら WebM で保存する。
 * 実時間キャプチャ方式のため、書き出しには動画の尺と同じ時間がかかる。
 */
const Exporter = (() => {

  const MIME_CANDIDATES = [
    { mime: 'video/mp4;codecs="avc1.640028"', ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: 'video/webm;codecs="vp9"', ext: "webm" },
    { mime: 'video/webm;codecs="vp8"', ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];

  function pickMime() {
    if (typeof MediaRecorder === "undefined") return null;
    for (const c of MIME_CANDIDATES) {
      try {
        if (MediaRecorder.isTypeSupported(c.mime)) return c;
      } catch (_) { /* 一部ブラウザは不正mimeで例外を投げる */ }
    }
    return null;
  }

  /**
   * @param {object} state アプリ状態
   * @param {object} tl コンパイル済みタイムライン
   * @param {(ratio:number)=>void} onProgress 進捗コールバック(0..1)
   * @param {{cancelled: boolean}} token キャンセル用トークン
   * @returns {Promise<{blob: Blob, ext: string}>}
   */
  async function exportVideo(state, tl, onProgress, token) {
    const codec = pickMime();
    if (!codec) {
      throw new Error("このブラウザは動画書き出し(MediaRecorder)に対応していません。ChromeまたはEdgeをお試しください。");
    }

    const canvas = document.createElement("canvas");
    canvas.width = tl.width;
    canvas.height = tl.height;
    const ctx = canvas.getContext("2d");
    Renderer.draw(ctx, state, tl, 0);

    const stream = canvas.captureStream(tl.fps);
    const rec = new MediaRecorder(stream, {
      mimeType: codec.mime,
      videoBitsPerSecond: tl.width >= 1920 ? 12_000_000 : 8_000_000,
    });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    const done = new Promise((resolve, reject) => {
      rec.onstop = () => resolve();
      rec.onerror = (e) => reject(e.error || new Error("録画中にエラーが発生しました"));
    });

    rec.start(250);
    const t0 = performance.now();

    // 実時間で描画し続ける。バックグラウンドタブでrAFが止まらないようsetIntervalを使う。
    await new Promise((resolve) => {
      const iv = setInterval(() => {
        const t = (performance.now() - t0) / 1000;
        if (token.cancelled || t >= tl.duration) {
          clearInterval(iv);
          resolve();
          return;
        }
        Renderer.draw(ctx, state, tl, t);
        if (onProgress) onProgress(Math.min(1, t / tl.duration));
      }, 1000 / tl.fps);
    });

    Renderer.draw(ctx, state, tl, tl.duration);
    rec.stop();
    await done;
    stream.getTracks().forEach(tr => tr.stop());

    if (token.cancelled) throw new Error("キャンセルされました");
    if (onProgress) onProgress(1);
    return { blob: new Blob(chunks, { type: codec.mime.split(";")[0] }), ext: codec.ext };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return { exportVideo, downloadBlob, pickMime };
})();
