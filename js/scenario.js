"use strict";
/**
 * scenario.js — プロンプトからのシナリオ自動生成。
 *
 * 2モード:
 *  - 内蔵エンジン: 起承転結スケルトン+テキストバンクによるオフライン生成
 *  - Claude API: ユーザーのAPIキーで高品質生成(ブラウザ直接アクセス)
 * どちらも動画解析プロファイル(テンポ模倣)を反映できる。
 */
const Scenario = (() => {

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const MEME_NUMBERS = ["114514", "1919", "810", "364364", "4545", "93万"];
  const DEFAULT_TOPICS = ["謎の壺", "伝説の絵画", "究極のカレー", "呪いのビデオテープ", "限定フィギュア", "自称・世界一のラーメン"];

  /** プロンプトからテーマ語を取り出す */
  function extractTopic(prompt, rng) {
    let t = (prompt || "").trim()
      .replace(/[のに]?(ついて|関する話|話|シナリオ|劇場|動画)(を|で|作って|ください|お願いします)?[。.!!]?$/g, "")
      .replace(/[。.!!??]+$/g, "")
      .trim();
    if (!t) t = DEFAULT_TOPICS[Math.floor(rng() * DEFAULT_TOPICS.length)];
    return t.length > 24 ? t.slice(0, 24) : t;
  }

  // ---------- スケルトン(起承転結テンプレート) ----------
  // 行: {s:話者0/1, t:テキスト, e:表情, d:秒, min:必要な長さ(0短/1中/2長)}
  // 指示: {bg:n} {w:秒}
  // テキスト中: {t}=テーマ {n}=ネタ数字 {A}{B}=キャラ名

  const SKELETONS = {
    "自慢披露": (p, c) => [
      { bg: 1 },
      { s: 0, t: p(["おっ、来たか。ちょうどいいところに", "よく来たな{B}。まあ座れよ"]) },
      { s: 1, t: "なんですか改まって…嫌な予感しかしないんですが" },
      { s: 0, t: "実はな…ついに手に入れたんだよ。{t}を", e: "笑顔" },
      { s: 1, t: "{t}!?どこからそんなものを!?" },
      { s: 0, t: "フッ…大人のコネってやつだよ", e: "笑顔", min: 1 },
      { s: 1, t: "絶対ロクな入手経路じゃないでしょそれ", min: 1 },
      { bg: 2 },
      { s: 0, t: "見ろよこの輝き…これが{t}の真の姿だ!" },
      { s: 1, t: "うーん…素人目には何がすごいのか全然わからないですね" },
      { s: 0, t: "はぁ!?これだから素人は困るんだよなぁ!" },
      { s: 1, t: "す、すみません…!", e: "悲しみ" },
      { s: 0, t: "いいか、{t}っていうのはなぁ…(以下、謎の講義)", min: 2 },
      { s: 1, t: "あっ、これ長くなるやつだ…", e: "悲しみ", min: 2 },
      { s: 0, t: "…とまあ、以上が{t}の素晴らしさ{n}選だ", e: "笑顔", min: 2 },
      { w: 0.8 },
      { bg: 3 },
      { s: 1, t: "…で、おいくらしたんですか、それ" },
      { s: 0, t: "{n}円" },
      { s: 1, t: "{n}円!?正気ですか!?" },
      { s: 0, t: "……", d: 1.6 },
      { s: 0, t: "実はもう後悔してる", e: "悲しみ" },
      { s: 1, t: "知ってました" },
      { s: 0, t: "{B}、半分出さない?ダメ?", e: "照れ", min: 1 },
      { s: 1, t: "帰ります", min: 1 },
    ],

    "無茶振り": (p, c) => [
      { bg: 1 },
      { s: 0, t: "{B}、折り入って頼みがあるんだが" },
      { s: 1, t: "珍しいですね、先輩がそんな神妙な顔するの" },
      { s: 0, t: "明日までに{t}を用意してほしい" },
      { s: 1, t: "ええっ!?無理に決まってるじゃないですか!!" },
      { s: 0, t: "そこをなんとか!一生のお願い!" },
      { s: 1, t: "その一生のお願い、先月も聞きましたよ…" },
      { bg: 2 },
      { s: 0, t: "実はもう先方に「用意できます」って言っちゃったんだよなぁ", e: "照れ" },
      { s: 1, t: "なんで引き受けたんですか!?" },
      { s: 0, t: "ノリと勢い" },
      { s: 1, t: "最悪だ…", e: "悲しみ" },
      { s: 1, t: "…わかりました。ただし条件があります", min: 1 },
      { s: 0, t: "な、なんだ?", e: "驚き", min: 1 },
      { s: 1, t: "今月の昼メシ、全部おごりです", e: "笑顔", min: 1 },
      { s: 0, t: "鬼かお前は!?", min: 1 },
      { w: 1.0 },
      { bg: 3 },
      { s: 1, t: "…できましたよ。徹夜で{t}、用意しました", e: "悲しみ" },
      { s: 0, t: "さすが{B}!恩に着るよ!", e: "笑顔" },
      { s: 1, t: "それで、先方はいつ来るんですか?" },
      { s: 0, t: "あ、それキャンセルになった" },
      { s: 1, t: "は?", d: 2.0 },
      { s: 0, t: "だからキャンセルに…お、おい、その手に持ってるのは何だ", e: "驚き" },
      { s: 1, t: "動かないでくださいね", d: 2.5 },
    ],

    "発見": (p, c) => [
      { bg: 1 },
      { s: 1, t: "先輩、これ見てくださいよ。変な{t}が落ちてたんですけど" },
      { s: 0, t: "ん?どれどれ…" },
      { s: 0, t: "…おい{B}。これをどこで拾った", e: "驚き" },
      { s: 1, t: "え?そこの道端ですけど…" },
      { s: 0, t: "すぐに元の場所へ戻してこい。今すぐにだ" },
      { s: 1, t: "ど、どうしたんですか急に。怖いんですけど…", e: "悲しみ" },
      { bg: 3 },
      { s: 0, t: "いいか、よく聞け。この町には古くから伝わる話があってな…" },
      { s: 0, t: "{t}を拾った者は、{n}日以内に――", d: 3.0 },
      { s: 1, t: "ひっ…{n}日以内に…?", e: "驚き" },
      { s: 0, t: "めちゃくちゃいいことがある" },
      { s: 1, t: "いい話かーい!!" },
      { s: 0, t: "ちなみに俺は今までに3回拾った", e: "笑顔", min: 1 },
      { s: 1, t: "じゃあ僕にも早くいいこと来ないですかね", min: 1 },
      { s: 0, t: "ちなみに「いいこと」の内容は{t}がもう1個増える", min: 2 },
      { s: 1, t: "無限に増えるだけじゃないですか!", min: 2 },
      { w: 0.8 },
      { s: 1, t: "…って、あれ?{t}が本当にもう1個増えてる", e: "驚き" },
      { s: 0, t: "ほらな", e: "笑顔" },
      { s: 1, t: "この町、出よう", d: 2.5 },
    ],

    "対決": (p, c) => [
      { bg: 2 },
      { s: 0, t: "{B}よ…今日こそ決着をつけようじゃないか" },
      { s: 1, t: "望むところです。{t}対決、受けて立ちますよ" },
      { s: 0, t: "先攻はもらうぞ…俺の{t}パワーは{n}だ!!", e: "叫び" },
      { s: 1, t: "な…{n}!?すごい数値なのかどうかすらわからない!", e: "驚き" },
      { s: 0, t: "ふはははは!ひれ伏せ{B}!", e: "笑顔", min: 1 },
      { s: 1, t: "くっ…でもまだ終わってませんよ", min: 1 },
      { s: 1, t: "なら僕は奥の手を使います…必殺、{t}返し!!", e: "叫び" },
      { s: 0, t: "ぐああああ!!", e: "叫び" },
      { w: 0.8 },
      { bg: 3 },
      { s: 0, t: "ば、馬鹿な…この俺が負けるなんて…", e: "悲しみ" },
      { s: 1, t: "勝負の世界は非情なんですよ、先輩" },
      { s: 0, t: "…実は俺、最初からルールわかってなかったんだけどな" },
      { s: 1, t: "実は僕もです" },
      { s: 0, t: "じゃあ今の茶番は何だったんだよ!" },
      { s: 1, t: "若さ、ですかね", e: "笑顔" },
      { s: 0, t: "そういうことにしておくか…次は{t}の本場で勝負だ", min: 2 },
      { s: 1, t: "{t}に本場ってあるんですか…?", min: 2 },
    ],

    "旅立ち": (p, c) => [
      { bg: 2 },
      { s: 0, t: "なあ{B}…ちょっと話があるんだ" },
      { s: 1, t: "どうしたんですか、真面目な顔して" },
      { s: 0, t: "俺、来月からしばらくここを離れることになった" },
      { s: 1, t: "えっ…そんな、急すぎますよ…", e: "悲しみ" },
      { s: 0, t: "今まで言えなくてすまなかった。お前には世話になったな…", e: "悲しみ" },
      { s: 1, t: "先輩…僕、先輩からたくさんのことを学びました…", e: "悲しみ" },
      { s: 0, t: "泣くなよ…また会えるさ", e: "悲しみ", min: 1 },
      { s: 1, t: "うぅ…約束ですよ…", e: "悲しみ", min: 1 },
      { w: 1.2 },
      { bg: 3 },
      { s: 1, t: "それで…どちらに行かれるんですか" },
      { s: 0, t: "隣の駅" },
      { s: 1, t: "近っ!!" },
      { s: 0, t: "{t}の修行でな…片道{n}分の長い旅になる", d: 2.5 },
      { s: 1, t: "日帰りできるじゃないですか!なんなら通えますよ!" },
      { s: 0, t: "別れとは距離じゃない。心の問題なんだ…", d: 3.0 },
      { s: 1, t: "いい話風にまとめないでください" },
      { s: 0, t: "餞別とか、くれてもいいんだぞ?", e: "照れ", min: 1 },
      { s: 1, t: "隣の駅に行く人に渡す餞別はないです", min: 1 },
    ],
  };

  const TASTE_SKELETONS = {
    "おまかせ": ["自慢披露", "無茶振り", "発見", "対決", "旅立ち"],
    "コメディ": ["自慢披露", "無茶振り", "対決"],
    "シリアス風": ["旅立ち", "発見"],
    "ホラー風": ["発見"],
    "バトル風": ["対決"],
  };

  // テンポ模倣で尺が足りないときに挟む「つなぎ」セリフ
  const FILLERS = [
    { s: 1, t: "なるほど…?" },
    { s: 0, t: "話はまだ終わってないぞ" },
    { s: 1, t: "それで、どうなったんですか" },
    { s: 0, t: "まあ聞けって" },
    { s: 1, t: "話が見えないんですが…" },
    { s: 0, t: "つまりだな…" },
    { s: 1, t: "はぁ…" },
  ];

  const LEN_MAP = { "短編": 0, "中編": 1, "長編": 2 };

  /** イベント列→台本テキスト */
  function serialize(events, ctx) {
    const lines = [`# 自動生成シナリオ: ${ctx.topic}(${ctx.skeletonName}/${ctx.taste})`];
    const fill = (text) => text
      .replaceAll("{t}", ctx.topic)
      .replaceAll("{n}", ctx.number)
      .replaceAll("{A}", ctx.names[0])
      .replaceAll("{B}", ctx.names[1]);
    for (const ev of events) {
      if (ev.bg) { lines.push("", `@bg ${ev.bg}`); continue; }
      if (ev.w) { lines.push(`@wait ${ev.w}`); continue; }
      const opts = [];
      if (ev.e) opts.push(`表情:${ev.e}`);
      if (ev.d) opts.push(`時間:${ev.d}`);
      lines.push(`${ctx.names[ev.s]}「${fill(ev.t)}」${opts.length ? `(${opts.join(" ")})` : ""}`);
    }
    return lines.join("\n") + "\n";
  }

  /**
   * 内蔵エンジンでシナリオ生成。
   * @param {object} o {prompt, taste, length, names, seed, profile?}
   */
  function generateLocal(o) {
    const rng = mulberry32(o.seed ?? (Date.now() & 0xFFFFFFFF));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const taste = TASTE_SKELETONS[o.taste] ? o.taste : "おまかせ";
    const skeletonName = pick(TASTE_SKELETONS[taste]);
    const lenLevel = o.profile ? 2 : (LEN_MAP[o.length] ?? 1);

    const ctx = {
      topic: extractTopic(o.prompt, rng),
      number: pick(MEME_NUMBERS),
      names: o.names,
      taste, skeletonName, rng,
    };
    let events = SKELETONS[skeletonName](pick, ctx).filter(ev => (ev.min ?? 0) <= lenLevel);

    if (o.profile) {
      events = applyProfile(events, o.profile, rng);
    }
    return serialize(events, ctx);
  }

  /**
   * 動画解析プロファイル(テンポ模倣)を適用:
   * 場面数・セリフ数・各セリフの表示時間・間(ま)・話者交代パターンを真似る。
   */
  function applyProfile(events, profile, rng) {
    const srcLines = events.filter(ev => ev.s !== undefined);
    const pLines = profile.lines && profile.lines.length ? profile.lines : null;
    if (!pLines) return events;

    const need = Math.max(4, Math.min(pLines.length, 60));
    // オチ(最後の2行)は必ず末尾に残す
    const ending = srcLines.slice(-2);
    let body = srcLines.slice(0, -2);
    while (body.length + 2 < need) {
      body.push({ ...FILLERS[Math.floor(rng() * FILLERS.length)] });
    }
    body = body.slice(0, need - 2);
    const ordered = [...body, ...ending];

    // 話者パターンの模倣(左右の動き検出ができていれば)。
    // 相手の名前を含むセリフは話者を入れ替えると破綻するため固定する。
    if (profile.speakerPattern && profile.speakerPattern.length >= need * 0.7) {
      for (let i = 0; i < ordered.length; i++) {
        if (/\{[AB]\}/.test(ordered[i].t)) continue;
        const sp = profile.speakerPattern[i % profile.speakerPattern.length];
        if (sp === 0 || sp === 1) ordered[i] = { ...ordered[i], s: sp };
      }
    }

    // 場面割り: 解析した場面ごとのセリフ数で@bgを差し込む
    const scenes = profile.scenes && profile.scenes.length ? profile.scenes : [{ lineCount: need }];
    const out = [];
    let li = 0;
    let bgCycle = 0;
    for (let si = 0; si < scenes.length && li < ordered.length; si++) {
      out.push({ bg: (bgCycle % 3) + 1 });
      bgCycle++;
      const count = Math.max(1, scenes[si].lineCount || Math.ceil(need / scenes.length));
      for (let k = 0; k < count && li < ordered.length; k++, li++) {
        const src = pLines[Math.min(li, pLines.length - 1)];
        const line = { ...ordered[li] };
        line.d = Math.round(Math.max(0.8, Math.min(8, src.dur)) * 10) / 10; // テンポを移植
        out.push(line);
        if (src.gapAfter && src.gapAfter > 0.7 && li < ordered.length - 1) {
          out.push({ w: Math.round(Math.min(4, src.gapAfter) * 10) / 10 });
        }
      }
    }
    while (li < ordered.length) out.push(ordered[li++]);
    return out;
  }

  // ---------- Claude APIによる生成 ----------

  const API_MODELS = [
    { id: "claude-opus-4-8", label: "Claude Opus 4.8(高品質)" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5(バランス)" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5(高速)" },
  ];

  function buildSystemPrompt(names) {
    return [
      "あなたは「BB劇場」(2人の掛け合いコント動画)の脚本家です。以下の台本記法で脚本のみを出力してください。説明文・前置き・コードフェンスは一切不要です。",
      "",
      "## 台本記法",
      `- セリフ: 名前「セリフ」 の形式。登場人物は「${names[0]}」と「${names[1]}」の2人のみ。この名前を正確に使うこと。`,
      "- @bg 1 / @bg 2 / @bg 3 : 背景切り替え(場面転換)。場面が変わるところで使う。",
      "- @wait 1.5 : 間(ま)を入れる(秒)。緊張や沈黙の演出に。",
      "- セリフ末尾の (表情:タグ) で表情指定。使えるタグ: 通常/笑顔/怒り/悲しみ/驚き/照れ/疑問/叫び。省略すると内容から自動選択される。",
      "- セリフ末尾の (時間:2.5) で表示秒数を指定できる(通常は省略でよい)。「……」のような沈黙には指定すると効果的。",
      "- 行頭 # はコメント。",
      "",
      "## 脚本の方針",
      "- 起承転結をつける。単調な説明の応酬にせず、ボケとツッコミ、緊張と緩和、意外なオチを入れる。",
      "- ネットミーム的な軽妙なノリは歓迎だが、実在の人物名や差別的表現は使わない。",
      "- 1セリフは50文字以内。テンポよく。",
    ].join("\n");
  }

  function buildUserPrompt(o) {
    const parts = [
      `テーマ: ${o.prompt || "おまかせ(何か面白いネタで)"}`,
      `テイスト: ${o.taste}`,
      `長さ: ${o.length}(短編=10行前後 / 中編=16行前後 / 長編=25行前後)`,
    ];
    if (o.profile && o.profile.lines && o.profile.lines.length) {
      const p = o.profile;
      parts.push(
        "",
        "## テンポ模倣(既存動画の解析結果に合わせること)",
        `- 場面数: ${p.scenes.length}(各場面のセリフ数: ${p.scenes.map(s => s.lineCount).join(", ")})`,
        `- セリフ数: 約${p.lines.length}行`,
        `- 各セリフの表示秒数(順に): ${p.lines.slice(0, 40).map(l => l.dur.toFixed(1)).join(", ")}`,
        "- 上記の秒数を各セリフの (時間:x) として順番に割り当てること。",
        `- BGMの切り替わりが約${p.bgmSwitches ? p.bgmSwitches.length : 0}回あるので、場面転換(@bg)をそれに合わせる。`,
        "- 0.7秒以上の間が空く箇所には @wait を入れる。",
      );
    }
    parts.push("", "台本のみを出力してください。");
    return parts.join("\n");
  }

  /** Claude APIで生成(ユーザー自身のAPIキーを使用) */
  async function generateAPI(o) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": o.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: o.model || "claude-opus-4-8",
        max_tokens: 4000,
        system: buildSystemPrompt(o.names),
        messages: [{ role: "user", content: buildUserPrompt(o) }],
      }),
    }).catch(() => {
      throw new Error("APIに接続できませんでした。ネットワーク制限のある環境(ホスト版Artifact等)ではAI生成は使えません。ローカル版で試すか、内蔵エンジンをご利用ください。");
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err.error && err.error.message) msg += `: ${err.error.message}`;
      } catch (_) { /* JSONでないエラー応答 */ }
      if (res.status === 401) msg = "APIキーが無効です。";
      throw new Error(`生成に失敗しました(${msg})`);
    }

    const data = await res.json();
    if (data.stop_reason === "refusal") {
      throw new Error("このテーマでの生成は拒否されました。テーマを変えてお試しください。");
    }
    let text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    text = text.replace(/^```[^\n]*\n/, "").replace(/\n```\s*$/, "").trim();
    if (!/「.+」|[:：]/.test(text)) {
      throw new Error("台本形式の応答が得られませんでした。もう一度お試しください。");
    }
    return `# AI生成シナリオ: ${o.prompt || "おまかせ"}\n` + text + "\n";
  }

  return { generateLocal, generateAPI, API_MODELS, TASTES: Object.keys(TASTE_SKELETONS), LENGTHS: Object.keys(LEN_MAP) };
})();
