"use strict";
/**
 * player.js — プレビュー再生の制御(再生/停止/シーク)。
 */
class Player {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {() => object} getState  最新のアプリ状態を返す関数
   * @param {() => object} getTimeline 最新のタイムラインを返す関数
   */
  constructor(canvas, getState, getTimeline) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.getState = getState;
    this.getTimeline = getTimeline;
    this.t = 0;
    this.playing = false;
    this._raf = null;
    this._lastNow = 0;
    this.onTick = null;   // (t, playing) => void
  }

  render() {
    const tl = this.getTimeline();
    if (!tl) return;
    if (this.canvas.width !== tl.width) this.canvas.width = tl.width;
    if (this.canvas.height !== tl.height) this.canvas.height = tl.height;
    Renderer.draw(this.ctx, this.getState(), tl, this.t);
  }

  play() {
    const tl = this.getTimeline();
    if (!tl || this.playing) return;
    if (this.t >= tl.duration - 0.01) this.t = 0; // 末尾なら頭出し
    this.playing = true;
    this._lastNow = performance.now();
    const loop = (now) => {
      if (!this.playing) return;
      const dt = (now - this._lastNow) / 1000;
      this._lastNow = now;
      this.t += dt;
      const tl2 = this.getTimeline();
      if (tl2 && this.t >= tl2.duration) {
        this.t = tl2.duration;
        this.playing = false;
      }
      this.render();
      if (this.onTick) this.onTick(this.t, this.playing);
      if (this.playing) this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    if (this.onTick) this.onTick(this.t, this.playing);
  }

  pause() {
    this.playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.onTick) this.onTick(this.t, this.playing);
  }

  seek(t) {
    const tl = this.getTimeline();
    const max = tl ? tl.duration : 0;
    this.t = Math.max(0, Math.min(max, t));
    this.render();
    if (this.onTick) this.onTick(this.t, this.playing);
  }
}
