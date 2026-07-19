"use strict";
/**
 * parser.js — 台本テキストをイベント列に変換する。
 *
 * 台本記法:
 *   # コメント                 … 無視される
 *   @bg 2                      … 背景を2番に切り替え
 *   @wait 1.5                  … 1.5秒の間(ま)を入れる
 *   @bgm 緊張 / @bgm なし      … ここからのBGMムードを手動指定(なし=無音)
 *   @se 衝撃                   … この位置でSEを鳴らす
 *   名前「セリフ」              … セリフ(かぎ括弧形式)
 *   名前: セリフ               … セリフ(コロン形式、全角コロンも可)
 *   セリフ末尾の (表情:怒り 時間:2.5) で表情と表示時間を手動指定できる
 */
const Parser = (() => {

  /** 行末の (表情:xx 時間:x.x) を取り出す */
  function extractOpts(text) {
    const opts = {};
    const m = text.match(/[(（]([^()（）]*)[)）]\s*$/);
    if (m) {
      const body = m[1];
      const emo = body.match(/表情[:：]\s*(\S+?)(\s|$)/);
      const dur = body.match(/時間[:：]\s*([\d.]+)/);
      let recognized = false;
      if (emo) { opts.emotion = emo[1]; recognized = true; }
      if (dur) { opts.duration = parseFloat(dur[1]); recognized = true; }
      // 表情/時間 指定を含む括弧のみ取り除く(演技指定でない普通の括弧書きは残す)
      if (recognized) {
        text = text.slice(0, m.index).trim();
      }
    }
    return { text, opts };
  }

  /**
   * @param {string} src 台本テキスト
   * @returns {{events: Array, warnings: Array<string>}}
   */
  function parse(src) {
    const events = [];
    const warnings = [];
    const lines = (src || "").split(/\r?\n/);

    lines.forEach((raw, idx) => {
      const lineNo = idx + 1;
      const line = raw.trim();
      if (!line || line.startsWith("#") || line.startsWith("//")) return;

      // @bg n
      let m = line.match(/^@bg\s+(\d+)\s*$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n < 1 || n > 3) {
          warnings.push(`${lineNo}行目: 背景番号は1〜3で指定してください → "${line}"`);
          return;
        }
        events.push({ kind: "bg", index: n - 1, lineNo });
        return;
      }

      // @wait n
      m = line.match(/^@wait\s+([\d.]+)\s*$/i);
      if (m) {
        events.push({ kind: "wait", sec: parseFloat(m[1]), lineNo });
        return;
      }

      // @bgm タグ / @bgm なし
      m = line.match(/^@bgm\s+(\S+)\s*$/i);
      if (m) {
        const tag = m[1];
        if (/^(なし|オフ|off|none)$/i.test(tag)) {
          events.push({ kind: "bgm", off: true, lineNo });
        } else {
          events.push({ kind: "bgm", tag, lineNo });
        }
        return;
      }

      // @se タグ
      m = line.match(/^@se\s+(\S+)\s*$/i);
      if (m) {
        events.push({ kind: "se", tag: m[1], lineNo });
        return;
      }

      if (line.startsWith("@")) {
        warnings.push(`${lineNo}行目: 不明なコマンドです → "${line}"`);
        return;
      }

      // 名前「セリフ」(表情:xx)
      m = line.match(/^(.+?)\s*「(.+?)」\s*(.*)$/);
      if (m) {
        const { text, opts } = extractOpts((m[2] + " " + (m[3] || "")).trim());
        events.push({ kind: "line", name: m[1].trim(), text, opts, lineNo });
        return;
      }

      // 名前: セリフ
      m = line.match(/^([^:：]+?)\s*[:：]\s*(.+)$/);
      if (m) {
        const { text, opts } = extractOpts(m[2].trim());
        events.push({ kind: "line", name: m[1].trim(), text, opts, lineNo });
        return;
      }

      warnings.push(`${lineNo}行目: 解釈できない行です → "${line}"`);
    });

    return { events, warnings };
  }

  return { parse };
})();
