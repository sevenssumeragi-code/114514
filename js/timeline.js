"use strict";
/**
 * timeline.js — 台本イベント列を、時刻付きのタイムラインへコンパイルする。
 *
 * タイムライン構造:
 * {
 *   duration: 総尺(秒), fps, width, height,
 *   bgSegs:  [{start, end, bgIndex}],
 *   lines:   [{start, end, charIndex, spriteIndex, text, emotion, auto, lineNo}],
 *   charLines: [ [lines...], [lines...] ]  // キャラ別(時刻順)
 *   warnings: [string]
 * }
 */
const Timeline = (() => {

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** セリフの表示時間を文字数から自動計算する */
  function autoDuration(text, s) {
    let d = s.timeBase + text.length * s.timePerChar;
    // 「…」や読点は"間"として少し延ばす(単調さの回避)
    d += (text.match(/…/g) || []).length * 0.30;
    d += (text.match(/、/g) || []).length * 0.10;
    return clamp(d, s.timeMin, s.timeMax);
  }

  function compile(state) {
    const s = state.settings;
    const { events, warnings } = Parser.parse(state.scriptText);

    const bgSegs = [];
    const lines = [];
    const bgmForces = [];
    const manualSes = [];
    let t = 0;
    let curBg = { start: 0, bgIndex: 0 };

    for (const ev of events) {
      if (ev.kind === "bgm") {
        if (ev.tag && !AudioLib.MOODS.includes(ev.tag)) {
          warnings.push(`${ev.lineNo}行目: BGMタグは ${AudioLib.MOODS.join("/")} または「なし」で指定してください`);
        } else {
          bgmForces.push({ t, tag: ev.tag, off: !!ev.off });
        }
      } else if (ev.kind === "se") {
        manualSes.push({ t, tag: ev.tag, lineNo: ev.lineNo });
      } else if (ev.kind === "bg") {
        if (ev.index !== curBg.bgIndex) {
          if (t > curBg.start) bgSegs.push({ ...curBg, end: t });
          curBg = { start: t, bgIndex: ev.index };
        }
        if (!state.bgs[ev.index]) {
          warnings.push(`${ev.lineNo}行目: 背景${ev.index + 1}に画像が登録されていません(単色で表示されます)`);
        }
      } else if (ev.kind === "wait") {
        t += ev.sec;
      } else if (ev.kind === "line") {
        const charIndex = state.chars.findIndex(c => c.name === ev.name);
        if (charIndex < 0) {
          warnings.push(`${ev.lineNo}行目: 登場人物「${ev.name}」が見つかりません(キャラ名と台本の名前を一致させてください)`);
          continue;
        }
        const char = state.chars[charIndex];
        const auto = !ev.opts.emotion;
        const emotion = ev.opts.emotion || Emotion.detect(ev.text);
        const spriteIndex = Emotion.pickSprite(char, emotion);
        if (ev.opts.emotion && spriteIndex >= 0) {
          const sp = char.sprites[spriteIndex];
          if (!sp.tags.includes(ev.opts.emotion)) {
            warnings.push(`${ev.lineNo}行目: 「${char.name}」に表情「${ev.opts.emotion}」の立ち絵が無いため近い表情で代用します`);
          }
        }
        const dur = ev.opts.duration || autoDuration(ev.text, s);
        lines.push({
          start: t, end: t + dur,
          charIndex, spriteIndex,
          text: ev.text, emotion, auto,
          lineNo: ev.lineNo,
        });
        t += dur + s.lineGap;
      }
    }

    const duration = Math.max(t + 0.8, 1.0); // 末尾に余韻
    bgSegs.push({ ...curBg, end: duration });

    const charLines = state.chars.map((_, ci) => lines.filter(l => l.charIndex === ci));

    const tl = {
      duration,
      fps: s.fps, width: s.width, height: s.height,
      bgSegs, lines, charLines, warnings,
      bgmSegs: [], seEvents: [],
    };

    // BGM/SEの自動割当(音源が登録されていれば)
    const { bgmSegs, seEvents } = AudioLib.assign(state, tl, { bgmForces, manualSes });
    tl.bgmSegs = bgmSegs;
    tl.seEvents = seEvents;
    for (const m of manualSes) {
      if (!seEvents.some(ev => !ev.auto && ev.t === m.t && ev.tag === m.tag)) {
        warnings.push(`${m.lineNo}行目: タグ「${m.tag}」に合うSEが登録されていません`);
      }
    }

    return tl;
  }

  /** 時刻tの背景セグメント(クロスフェード用に直前のものも返す) */
  function bgAt(tl, t) {
    let cur = tl.bgSegs[0], prev = null;
    for (const seg of tl.bgSegs) {
      if (t >= seg.start) { prev = cur === seg ? prev : cur; cur = seg; }
      else break;
    }
    return { cur, prev };
  }

  /** 時刻tにアクティブなセリフ */
  function lineAt(tl, t) {
    for (const l of tl.lines) {
      if (t >= l.start && t < l.end) return l;
      if (l.start > t) break;
    }
    return null;
  }

  /** 時刻tでのキャラの立ち絵(最後に話したときの表情を維持する) */
  function spriteAt(tl, charIndex, t) {
    const ls = tl.charLines[charIndex];
    let sp = -2; // -2: まだ一度も発話していない → 既定の立ち絵
    for (const l of ls) {
      if (l.start <= t) sp = l.spriteIndex;
      else break;
    }
    return sp;
  }

  /**
   * キャラの立ち絵が変化する区間のリスト(exo書き出し用)。
   * [{start, end, spriteIndex}] を返す。spriteIndex=-2 は既定の立ち絵。
   */
  function charStateSegments(tl, charIndex) {
    const segs = [];
    let cur = { start: 0, spriteIndex: -2 };
    for (const l of tl.charLines[charIndex]) {
      if (l.spriteIndex !== cur.spriteIndex) {
        if (l.start > cur.start) segs.push({ ...cur, end: l.start });
        cur = { start: l.start, spriteIndex: l.spriteIndex };
      }
    }
    segs.push({ ...cur, end: tl.duration });
    return segs.filter(seg => seg.end > seg.start);
  }

  return { compile, bgAt, lineAt, spriteAt, charStateSegments };
})();
