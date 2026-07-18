"use strict";
/**
 * renderer.js — タイムラインの任意時刻 t の画面を canvas に描画する。
 * プレビューと動画書き出しの両方から使う(描画は純関数的)。
 */
const Renderer = (() => {

  const BG_FADE = 0.35;   // 背景クロスフェード秒数
  const HOP_DUR = 0.30;   // 発話開始時のぴょこっと跳ねる時間

  const FALLBACK_BG = [
    ["#4a6741", "#2c3e2a"],   // 背景1が無いとき
    ["#7a5c94", "#3c2c50"],   // 背景2
    ["#2c3e60", "#101828"],   // 背景3
  ];

  let filterSupported = null;

  function canFilter(ctx) {
    if (filterSupported === null) {
      filterSupported = typeof ctx.filter === "string";
    }
    return filterSupported;
  }

  function drawCover(ctx, img, W, H, alpha) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.restore();
  }

  function drawBg(ctx, state, tl, t, W, H) {
    const { cur, prev } = Timeline.bgAt(tl, t);

    const paint = (seg, alpha) => {
      const bg = state.bgs[seg.bgIndex];
      if (bg && bg.img && bg.img.complete && bg.img.naturalWidth) {
        drawCover(ctx, bg.img, W, H, alpha);
      } else {
        const [c1, c2] = FALLBACK_BG[seg.bgIndex % FALLBACK_BG.length];
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    };

    const fadeIn = (t - cur.start) / BG_FADE;
    if (prev && fadeIn < 1 && cur.start > 0) {
      paint(prev, 1);
      paint(cur, Math.max(0, fadeIn));
    } else {
      paint(cur, 1);
    }
  }

  function hopOffset(tInLine, H) {
    if (tInLine < 0 || tInLine >= HOP_DUR) return 0;
    const p = tInLine / HOP_DUR;
    return -Math.abs(Math.sin(p * Math.PI)) * H * 0.03;
  }

  function drawChar(ctx, state, tl, t, charIndex, W, H) {
    const char = state.chars[charIndex];
    let spIdx = Timeline.spriteAt(tl, charIndex, t);
    if (spIdx === -2) spIdx = Emotion.pickSprite(char, "通常");

    const active = Timeline.lineAt(tl, t);
    const speaking = !!(active && active.charIndex === charIndex);
    const dimmed = !!(active && !speaking);
    const hop = speaking ? hopOffset(t - active.start, H) : 0;

    const cx = charIndex === 0 ? W * 0.26 : W * 0.74;
    const targetHBase = H * 0.72 * (speaking ? 1.03 : 1.0);

    ctx.save();
    if (dimmed) {
      if (canFilter(ctx)) ctx.filter = "brightness(0.55)";
      else ctx.globalAlpha = 0.6;
    }
    if (char.flip) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }

    const sprite = spIdx >= 0 ? char.sprites[spIdx] : null;
    if (sprite && sprite.img && sprite.img.complete && sprite.img.naturalWidth) {
      const img = sprite.img;
      let scale = targetHBase / img.naturalHeight;
      if (img.naturalWidth * scale > W * 0.46) scale = (W * 0.46) / img.naturalWidth;
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, cx - w / 2, H - h + H * 0.005 + hop, w, h);
    } else {
      // 立ち絵未登録のプレースホルダ
      const w = W * 0.2, h = targetHBase * 0.8;
      const x = cx - w / 2, y = H - h + hop;
      ctx.fillStyle = char.color + "55";
      ctx.strokeStyle = char.color;
      ctx.lineWidth = 4;
      roundRect(ctx, x, y, w, h, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(H * 0.035)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char.name || `キャラ${charIndex + 1}`, cx, y + h / 2);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxW) {
    const out = [];
    let cur = "";
    for (const ch of text) {
      if (ch === "\n") { out.push(cur); cur = ""; continue; }
      if (cur && ctx.measureText(cur + ch).width > maxW) {
        out.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [""];
  }

  function drawSubtitle(ctx, state, tl, t, W, H) {
    const line = Timeline.lineAt(tl, t);
    if (!line) return;
    const char = state.chars[line.charIndex];
    const s = state.settings;

    const FONT = `'Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo',sans-serif`;
    let fontSize = Math.round(s.subtitleSize * (H / 720));
    ctx.font = `bold ${fontSize}px ${FONT}`;
    let rows = wrapText(ctx, line.text, W * 0.84);
    if (rows.length > 3) { // 3行を超えるなら縮小
      fontSize = Math.round(fontSize * 0.8);
      ctx.font = `bold ${fontSize}px ${FONT}`;
      rows = wrapText(ctx, line.text, W * 0.84);
    }

    const lineH = fontSize * 1.28;
    const bottomY = H - H * 0.055;
    const topY = bottomY - lineH * (rows.length - 1);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    rows.forEach((row, i) => {
      const y = topY + i * lineH;
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = fontSize * 0.32;
      ctx.strokeText(row, W / 2, y);
      ctx.strokeStyle = char.color;
      ctx.lineWidth = fontSize * 0.14;
      ctx.strokeText(row, W / 2, y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(row, W / 2, y);
    });

    // 話者ネームプレート
    const nameSize = Math.round(fontSize * 0.62);
    ctx.font = `bold ${nameSize}px ${FONT}`;
    const name = char.name || `キャラ${line.charIndex + 1}`;
    const nw = ctx.measureText(name).width;
    const px = W * 0.055, py = topY - fontSize - nameSize * 0.9;
    ctx.fillStyle = char.color;
    roundRect(ctx, px, py, nw + nameSize * 1.2, nameSize * 1.7, nameSize * 0.4);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1b1b1b";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(name, px + nameSize * 0.6, py + nameSize * 0.88);
    ctx.restore();
  }

  /** 時刻tの1フレームを描画する */
  function draw(ctx, state, tl, t) {
    const W = tl.width, H = tl.height;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    drawBg(ctx, state, tl, t, W, H);
    drawChar(ctx, state, tl, t, 0, W, H);
    drawChar(ctx, state, tl, t, 1, W, H);
    drawSubtitle(ctx, state, tl, t, W, H);
    ctx.restore();
  }

  return { draw };
})();
