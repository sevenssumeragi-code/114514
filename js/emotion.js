"use strict";
/**
 * emotion.js — セリフのテキストから感情を推定し、登録済み立ち絵の中から
 * 最適な1枚を自動選択するモジュール。
 *
 * 将来的な「シナリオ全自動生成」でも同じ感情タグ体系を使う想定。
 */
const Emotion = (() => {

  // 対応する感情カテゴリ(立ち絵のタグとして使う)
  const EMOTIONS = ["通常", "笑顔", "怒り", "悲しみ", "驚き", "照れ", "疑問", "叫び"];

  // 感情ごとのキーワード辞書(正規表現)
  const DICT = {
    "怒り": [
      /ふざけ/, /コラ/, /オラァ?/, /ゴラ/, /殺/, /怒/, /やめろ/, /うるさ/, /うるせ/,
      /ぶち/, /クソ/, /くそ/, /最悪/, /許さ/, /困るんだよ/, /いい加減/, /なめ(てん|とん)/,
      /帰れ/, /黙れ/, /テメェ/, /てめえ/, /舐め/, /はぁ[っ]?[!！]?[?？]/,
    ],
    "笑顔": [
      /笑/, /ｗ{1,}/, /w{2,}/, /草/, /ハハ/, /へへ/, /えへ/, /ニヤ/, /嬉し/, /うれし/,
      /楽し/, /たのし/, /最高/, /やった/, /いいね/, /いいゾ/, /わかればいい/, /オッスオッス/,
      /ありがと/, /サンキュー/, /よかった/, /ようこそ/, /任せ/,
    ],
    "悲しみ": [
      /泣/, /悲し/, /かなし/, /つら/, /辛/, /ごめん/, /すまん/, /すみません/, /申し訳/,
      /しょんぼり/, /うぅ/, /はぁ…/, /残念/, /無理/, /悲惨/, /絶望/, /もうダメ/, /終わり/,
    ],
    "驚き": [
      /[!！][?？]/, /[?？][!！]/, /ええ+[っ!！?？]/, /えっ/, /まさか/, /なんだって/,
      /マジ/, /うそ/, /嘘/, /すぎィ/, /信じられ/, /なんと/, /ウソだろ/, /は[!？?]{2,}/,
    ],
    "照れ": [
      /照れ/, /好き/, /大好き/, /かわい/, /可愛/, /惚れ/, /ドキ/, /恥ずかし/, /はずかし/,
      /泊めて/, /デート/, /添い寝/,
    ],
    "疑問": [
      /[?？]\s*$/, /なぜ/, /なんで/, /どうして/, /とは[?？]?$/, /何なんです/, /誰[?？]/,
      /どこ[?？]/, /どういうこと/,
    ],
    "叫び": [
      /[!！]{2,}/, /ァ[!！]/, /ーッ/, /うおお/, /ぎゃあ/, /うわああ/, /アアア/, /ヤバイ[!！]/,
    ],
  };

  // 同点時の優先順位(強い感情ほど先)
  const PRIORITY = ["叫び", "驚き", "怒り", "照れ", "悲しみ", "笑顔", "疑問"];

  // 感情→立ち絵タグの代替チェーン(その感情の絵が無いときに近い絵へフォールバック)
  const FALLBACK = {
    "通常":   ["通常"],
    "笑顔":   ["笑顔", "照れ", "通常"],
    "怒り":   ["怒り", "叫び", "通常"],
    "悲しみ": ["悲しみ", "照れ", "通常"],
    "驚き":   ["驚き", "叫び", "通常"],
    "照れ":   ["照れ", "笑顔", "通常"],
    "疑問":   ["疑問", "驚き", "通常"],
    "叫び":   ["叫び", "怒り", "驚き", "通常"],
  };

  /** セリフ本文から感情を推定する */
  function detect(text) {
    const scores = {};
    for (const emo of PRIORITY) {
      let s = 0;
      for (const re of DICT[emo]) {
        if (re.test(text)) s++;
      }
      scores[emo] = s;
    }
    let best = "通常", bestScore = 0;
    for (const emo of PRIORITY) {
      if (scores[emo] > bestScore) { best = emo; bestScore = scores[emo]; }
    }
    return best;
  }

  /**
   * キャラの登録立ち絵から感情に合う1枚を選ぶ。
   * @returns スプライトのインデックス(見つからなければ 0、素材なしなら -1)
   */
  function pickSprite(char, emotion) {
    if (!char || !char.sprites || char.sprites.length === 0) return -1;
    const chain = FALLBACK[emotion] || ["通常"];
    for (const tag of chain) {
      const i = char.sprites.findIndex(sp => sp.tags.includes(tag));
      if (i >= 0) return i;
    }
    // 「通常」が明示されていなくても、どれにも当てはまらなければ先頭を既定にする
    const i = char.sprites.findIndex(sp => sp.tags.includes("通常"));
    return i >= 0 ? i : 0;
  }

  /** ファイル名から立ち絵タグを推測(手動登録の手間を減らす) */
  function inferTagsFromName(name) {
    const n = (name || "").toLowerCase();
    const rules = [
      [/怒|angry|ikari|oko/, "怒り"],
      [/笑|smile|nico|warai|egao/, "笑顔"],
      [/泣|悲|sad|naki|kanashi/, "悲しみ"],
      [/驚|odoroki|bikkuri|surprise|shock/, "驚き"],
      [/照|tere|blush|shy/, "照れ"],
      [/疑|hatena|gimon|\?/, "疑問"],
      [/叫|sakebi|shout|scream/, "叫び"],
      [/通常|normal|default|futsu/, "通常"],
    ];
    for (const [re, tag] of rules) {
      if (re.test(n)) return [tag];
    }
    return ["通常"];
  }

  return { EMOTIONS, detect, pickSprite, inferTagsFromName };
})();
