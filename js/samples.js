"use strict";
/**
 * samples.js — 動作確認用のサンプル素材(立ち絵・背景・台本)をcanvasで生成する。
 * 実際の淫夢/クッキー☆系素材は権利上同梱できないため、
 * まんじゅう風のプレースホルダキャラを内蔵している。
 */
const Samples = (() => {

  function makeSprite(scheme, emotion) {
    const W = 360, H = 420;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    const cx = W / 2, cy = H * 0.56, rx = W * 0.42, ry = H * 0.40;

    // 影
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, H * 0.96, rx * 0.9, H * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();

    // 体(まんじゅう)
    ctx.fillStyle = scheme.body;
    ctx.strokeStyle = scheme.line;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 頭(髪/帽子の色分け)
    ctx.fillStyle = scheme.hair;
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.55, rx * 0.92, ry * 0.52, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.55, rx * 0.92, ry * 0.18, 0, 0, Math.PI);
    ctx.fill();

    const eyeY = cy - ry * 0.05;
    const eyeDX = rx * 0.38;
    const mouthY = cy + ry * 0.38;
    ctx.strokeStyle = "#3a2a1a";
    ctx.fillStyle = "#3a2a1a";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    const dotEyes = (r = 11) => {
      ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + eyeDX, eyeY, r, 0, Math.PI * 2); ctx.fill();
    };
    const blush = () => {
      ctx.fillStyle = "rgba(255,120,130,0.55)";
      ctx.beginPath(); ctx.ellipse(cx - eyeDX * 1.15, eyeY + 34, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + eyeDX * 1.15, eyeY + 34, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a2a1a";
    };

    switch (emotion) {
      case "笑顔":
        // にっこり目(^ ^)
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + sx * eyeDX, eyeY + 8, 16, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, mouthY - 8, 22, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        blush();
        break;

      case "怒り":
        for (const sx of [-1, 1]) {
          ctx.beginPath(); // つり眉
          ctx.moveTo(cx + sx * (eyeDX + 20), eyeY - 34);
          ctx.lineTo(cx + sx * (eyeDX - 18), eyeY - 20);
          ctx.stroke();
        }
        dotEyes(12);
        ctx.beginPath(); // への字口
        ctx.arc(cx, mouthY + 22, 24, 1.2 * Math.PI, 1.8 * Math.PI);
        ctx.stroke();
        // 怒りマーク
        ctx.strokeStyle = "#e03030";
        ctx.lineWidth = 6;
        const ax = cx + rx * 0.62, ay = cy - ry * 0.75;
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.beginPath();
          ctx.moveTo(ax + dx * 8, ay + dy * 8);
          ctx.lineTo(ax + dx * 20, ay + dy * 20);
          ctx.stroke();
        }
        break;

      case "悲しみ":
        for (const sx of [-1, 1]) {
          ctx.beginPath(); // 下がり眉
          ctx.moveTo(cx + sx * (eyeDX - 18), eyeY - 30);
          ctx.lineTo(cx + sx * (eyeDX + 18), eyeY - 18);
          ctx.stroke();
        }
        dotEyes(10);
        ctx.beginPath(); // 波線口
        ctx.moveTo(cx - 22, mouthY + 4);
        ctx.quadraticCurveTo(cx - 10, mouthY + 14, cx, mouthY + 4);
        ctx.quadraticCurveTo(cx + 10, mouthY - 6, cx + 22, mouthY + 4);
        ctx.stroke();
        // 涙
        ctx.fillStyle = "#69b7ff";
        ctx.beginPath();
        ctx.ellipse(cx - eyeDX - 4, eyeY + 34, 9, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2a1a";
        break;

      case "驚き":
        for (const sx of [-1, 1]) {
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(cx + sx * eyeDX, eyeY, 22, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 5; ctx.stroke();
          ctx.fillStyle = "#3a2a1a";
          ctx.beginPath(); ctx.arc(cx + sx * eyeDX, eyeY, 7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(cx, mouthY + 4, 16, 0, Math.PI * 2); ctx.stroke();
        break;

      case "照れ":
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + sx * eyeDX, eyeY + 8, 16, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, mouthY - 4, 14, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        blush();
        blush(); // 濃いめ
        break;

      default: // 通常
        dotEyes();
        ctx.beginPath();
        ctx.moveTo(cx - 16, mouthY);
        ctx.lineTo(cx + 16, mouthY);
        ctx.stroke();
        break;
    }

    return c.toDataURL("image/png");
  }

  function makeBg(kind) {
    const W = 1280, H = 720;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    if (kind === 0) { // 部屋
      ctx.fillStyle = "#cdbb9b";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#8a6b4a";
      ctx.fillRect(0, H * 0.78, W, H * 0.22); // 床
      ctx.fillStyle = "#7a5c3e";
      for (let x = 0; x < W; x += 160) ctx.fillRect(x, H * 0.78, 4, H * 0.22);
      // 窓
      ctx.fillStyle = "#9ed2f0";
      ctx.fillRect(W * 0.38, H * 0.12, W * 0.24, H * 0.34);
      ctx.strokeStyle = "#6b5236";
      ctx.lineWidth = 10;
      ctx.strokeRect(W * 0.38, H * 0.12, W * 0.24, H * 0.34);
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.12); ctx.lineTo(W * 0.5, H * 0.46);
      ctx.moveTo(W * 0.38, H * 0.29); ctx.lineTo(W * 0.62, H * 0.29);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(W * 0.44, H * 0.20, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.47, H * 0.21, 14, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 1) { // 夕方
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#5c3a6e");
      g.addColorStop(0.55, "#e8703a");
      g.addColorStop(1, "#f7c04a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffd98a";
      ctx.beginPath(); ctx.arc(W * 0.72, H * 0.62, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2b1c30";
      ctx.fillRect(0, H * 0.82, W, H * 0.18); // 地面
      // ビルのシルエット
      const bl = [[0.05, 0.5], [0.16, 0.38], [0.27, 0.55], [0.55, 0.6], [0.84, 0.45], [0.93, 0.58]];
      for (const [x, hh] of bl) {
        ctx.fillRect(W * x, H * hh, W * 0.08, H * (0.82 - hh) + 2);
      }
    } else { // 夜
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a1030");
      g.addColorStop(1, "#20305e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff8d8";
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, 56, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#141c42";
      ctx.beginPath(); ctx.arc(W * 0.78 - 20, H * 0.19, 50, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      let seed = 114514;
      const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.3 + rand() * 0.7;
        ctx.fillRect(rand() * W, rand() * H * 0.7, 2 + rand() * 2, 2 + rand() * 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#0c1226";
      ctx.fillRect(0, H * 0.86, W, H * 0.14);
    }
    return c.toDataURL("image/png");
  }

  const SAMPLE_SCRIPT = `# ===== サンプル台本 =====
# 記法: 名前「セリフ」 / 名前: セリフ
#   @bg 1〜3     背景切り替え
#   @wait 秒     間(ま)を入れる
#   (表情:怒り)  表情を手動指定(省略すると自動選択)
#   (時間:3)     表示時間を手動指定(秒)

@bg 1
先輩「おっ、来たか。今日は例のブツを見せてやるよ」
後輩「例のブツ…?一体何なんですか?」
先輩「そう焦るなって。まずはお茶でも飲んで落ち着けよ」(表情:笑顔)
後輩「はぁ…相変わらずマイペースですね」
@wait 0.8
@bg 2
先輩「ジャーン!これが伝説の絵画『114514』だ!」
後輩「ええっ!?ただの落書きにしか見えないんですが!?」
先輩「はぁ!?これだから素人は困るんだよなぁ」
後輩「す、すみません…でもよく見ると味がある…かも?」
先輩「だろ?わかればいいんだよ、わかれば」
@wait 1.0
@bg 3
後輩「…で、これ、いくらで買ったんですか?」
先輩「114514円」
後輩「高すぎィ!今月の家賃どうするんですか!」
先輩「……」(時間:1.6)
先輩「後輩、お前んち泊めてくれない?」(表情:照れ 時間:3)
後輩「帰ってください」
`;

  const EMOTION_SET = ["通常", "笑顔", "怒り", "悲しみ", "驚き", "照れ"];

  // ---------- サンプル音源(チップチューン風に合成) ----------

  const SR = 22050;

  function makeOfflineCtx(dur) {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    return new C(1, Math.ceil(dur * SR), SR);
  }

  function tone(ctx, { f, f2, t0, d, type = "square", g = 0.15 }) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    if (f2) osc.frequency.linearRampToValueAtTime(f2, t0 + d);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(g, t0 + 0.01);
    gain.gain.setValueAtTime(g, Math.max(t0 + 0.01, t0 + d - 0.04));
    gain.gain.linearRampToValueAtTime(0, t0 + d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + d + 0.02);
  }

  function noise(ctx, { t0, d, g = 0.2, freq = 3000, type = "highpass" }) {
    const len = Math.ceil(d * SR);
    const buf = ctx.createBuffer(1, len, SR);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(g, t0);
    gain.gain.linearRampToValueAtTime(0, t0 + d);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  // 音名→周波数(A4=440)
  const NOTE = (() => {
    const names = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const table = {};
    for (const [n, semis] of Object.entries(names)) {
      for (let oct = 1; oct <= 6; oct++) {
        table[n + oct] = 440 * Math.pow(2, (semis + (oct - 4) * 12 - 9) / 12);
        table[n + "#" + oct] = 440 * Math.pow(2, (semis + 1 + (oct - 4) * 12 - 9) / 12);
      }
    }
    return table;
  })();

  function seq(ctx, notes, { beat, type = "square", g = 0.12, staccato = 0.85 }) {
    notes.forEach((n, i) => {
      if (!n) return; // 休符
      tone(ctx, { f: NOTE[n], t0: i * beat, d: beat * staccato, type, g });
    });
  }

  async function renderWav(dur, fn) {
    const ctx = makeOfflineCtx(dur);
    fn(ctx);
    const buf = await ctx.startRendering();
    return AudioLib.bufferToWavDataURL(buf);
  }

  async function buildAudio() {
    const bgms = [];
    const ses = [];

    // BGM: 日常(ほのぼのループ)
    bgms.push({
      label: "サンプルBGM(日常)", tags: ["日常"],
      dataURL: await renderWav(6.4, (ctx) => {
        const beat = 0.2;
        const mel = ["C5", "E5", "G5", "E5", "A4", "C5", "E5", "C5", "F4", "A4", "C5", "A4", "G4", "B4", "D5", "B4"];
        seq(ctx, [...mel, ...mel], { beat, type: "square", g: 0.09 });
        const bass = ["C3", null, "G3", null, "A2", null, "E3", null, "F3", null, "C3", null, "G3", null, "G3", null];
        seq(ctx, [...bass, ...bass], { beat, type: "triangle", g: 0.2 });
      }),
    });

    // BGM: コミカル(スタッカートの跳ね)
    bgms.push({
      label: "サンプルBGM(コミカル)", tags: ["コミカル"],
      dataURL: await renderWav(4.8, (ctx) => {
        const beat = 0.15;
        const mel = ["C5", null, "C5", "D5", "E5", null, "G5", null, "E5", null, "C5", null, "D5", "D5", null, null,
                     "E5", null, "E5", "F5", "G5", null, "C6", null, "G5", "E5", "C5", null, "G4", null, null, null];
        seq(ctx, mel, { beat, type: "square", g: 0.1, staccato: 0.5 });
        const bass = ["C2", "C3", "E2", "E3", "F2", "F3", "G2", "G3"];
        seq(ctx, [...bass, ...bass, ...bass, ...bass], { beat: beat * 2, type: "triangle", g: 0.22, staccato: 0.5 });
      }),
    });

    // BGM: 緊張(低音ドローン+不協和音)
    bgms.push({
      label: "サンプルBGM(緊張)", tags: ["緊張"],
      dataURL: await renderWav(8.0, (ctx) => {
        tone(ctx, { f: NOTE["A2"], t0: 0, d: 8.0, type: "sawtooth", g: 0.08 });
        tone(ctx, { f: NOTE["A2"] * 1.02, t0: 0, d: 8.0, type: "sawtooth", g: 0.06 });
        for (let i = 0; i < 4; i++) {
          tone(ctx, { f: NOTE["A#4"], t0: i * 2 + 1.0, d: 0.35, type: "square", g: 0.06 });
          tone(ctx, { f: NOTE["A4"], t0: i * 2 + 1.15, d: 0.35, type: "square", g: 0.06 });
        }
      }),
    });

    // BGM: 激しい(疾走ベース+ハット)
    bgms.push({
      label: "サンプルBGM(激しい)", tags: ["激しい"],
      dataURL: await renderWav(4.8, (ctx) => {
        const beat = 0.15;
        const bass = ["E2", "E2", "E3", "E2", "G2", "G2", "G3", "G2", "A2", "A2", "A3", "A2", "B2", "B2", "D3", "B2"];
        seq(ctx, [...bass, ...bass], { beat, type: "sawtooth", g: 0.2, staccato: 0.7 });
        for (let i = 0; i < 32; i++) {
          noise(ctx, { t0: i * beat, d: 0.03, g: i % 4 === 0 ? 0.15 : 0.06, freq: 6000 });
        }
      }),
    });

    // BGM: 悲しい(短調の静かなアルペジオ)
    bgms.push({
      label: "サンプルBGM(悲しい)", tags: ["悲しい", "静か"],
      dataURL: await renderWav(9.6, (ctx) => {
        const beat = 0.4;
        const arp = ["A3", "C4", "E4", "A4", "E4", "C4", "G3", "B3", "D4", "G4", "D4", "B3",
                     "F3", "A3", "C4", "F4", "C4", "A3", "E3", "G#3", "B3", "E4", "B3", "G#3"];
        seq(ctx, arp, { beat, type: "sine", g: 0.18, staccato: 1.0 });
      }),
    });

    // SE: 衝撃(ドーン)
    ses.push({
      label: "サンプルSE(ドーン)", tags: ["衝撃"],
      dataURL: await renderWav(0.9, (ctx) => {
        tone(ctx, { f: 130, f2: 35, t0: 0, d: 0.8, type: "sine", g: 0.6 });
        noise(ctx, { t0: 0, d: 0.35, g: 0.35, freq: 400, type: "lowpass" });
      }),
    });

    // SE: ツッコミ(スパーン)
    ses.push({
      label: "サンプルSE(スパーン)", tags: ["ツッコミ"],
      dataURL: await renderWav(0.35, (ctx) => {
        noise(ctx, { t0: 0, d: 0.25, g: 0.45, freq: 1800, type: "highpass" });
        tone(ctx, { f: 900, f2: 500, t0: 0, d: 0.12, type: "square", g: 0.15 });
      }),
    });

    // SE: きゅん
    ses.push({
      label: "サンプルSE(きゅん)", tags: ["きゅん"],
      dataURL: await renderWav(0.6, (ctx) => {
        tone(ctx, { f: NOTE["E5"], t0: 0, d: 0.18, type: "sine", g: 0.3 });
        tone(ctx, { f: NOTE["A5"], t0: 0.14, d: 0.4, type: "sine", g: 0.3 });
        tone(ctx, { f: NOTE["C#6"], t0: 0.14, d: 0.4, type: "sine", g: 0.15 });
      }),
    });

    // SE: ズコー(ずっこけ)
    ses.push({
      label: "サンプルSE(ズコー)", tags: ["悲しい"],
      dataURL: await renderWav(0.8, (ctx) => {
        tone(ctx, { f: 500, f2: 90, t0: 0, d: 0.55, type: "square", g: 0.25 });
        noise(ctx, { t0: 0.5, d: 0.25, g: 0.2, freq: 800, type: "lowpass" });
      }),
    });

    // SE: ピコッ(汎用)
    ses.push({
      label: "サンプルSE(ピコッ)", tags: ["汎用", "笑い"],
      dataURL: await renderWav(0.25, (ctx) => {
        tone(ctx, { f: 880, f2: 1560, t0: 0, d: 0.16, type: "square", g: 0.25 });
      }),
    });

    return { bgms, ses };
  }

  /** サンプルプロジェクト一式(dataURLベース)を生成する */
  async function build() {
    const schemes = [
      { body: "#f5e2c0", hair: "#4a76c8", line: "#5a4630" },  // 先輩(青)
      { body: "#f9e9d2", hair: "#d8703c", line: "#5a4630" },  // 後輩(橙)
    ];
    const chars = schemes.map((scheme, i) => ({
      name: i === 0 ? "先輩" : "後輩",
      color: i === 0 ? "#7ec4ff" : "#ffb36e",
      flip: i === 1,
      sprites: EMOTION_SET.map(emo => ({
        label: `サンプル(${emo})`,
        tags: [emo],
        dataURL: makeSprite(scheme, emo),
      })),
    }));
    const bgs = [0, 1, 2].map(k => ({ dataURL: makeBg(k) }));
    const { bgms, ses } = await buildAudio();
    return { chars, bgs, bgms, ses, script: SAMPLE_SCRIPT };
  }

  return { build };
})();
