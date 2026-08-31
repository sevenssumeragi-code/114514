import type { EndingDef } from '@/engine/types';

/**
 * 全22END。HAPPY×6 / NORMAL×3 / BAD×12 / TRUE×1。
 * blurb は未到達時には伏せ字で表示する（ギャラリー側の責務）。
 */
export const ENDINGS: EndingDef[] = [
  /* ---- HAPPY ---- */
  { id: 'HE-LEN', kind: 'HAPPY', route: 'lenny', title: 'あさ', cg: 'CG-45', blurb: '半分のまま、二人で。錨は「二人で一つ」のまま維持される。' },
  { id: 'HE-HYU', kind: 'HAPPY', route: 'hugh', title: '共有記憶', cg: 'CG-46', blurb: '忘れ続ける彼に、毎朝みんなが教え直す。' },
  { id: 'HE-JIN', kind: 'HAPPY', route: 'jinpachi', title: 'おかえり', cg: 'CG-47', blurb: '兄が忘れ、六人が覚え、妹が世界に戻る。' },
  { id: 'HE-MUN', kind: 'HAPPY', route: 'muni', title: 'みんなの夜', cg: 'CG-48', blurb: '錨を七人で分け持つ。全員が少しだけ寝不足。' },
  { id: 'HE-GER', kind: 'HAPPY', route: 'geru', title: '配られる側', cg: 'CG-49', blurb: '自分の名を忘れた彼女を、六人が毎日呼ぶ。' },
  { id: 'HE-NEO', kind: 'HAPPY', route: 'neo', title: '新しい記録', cg: 'CG-50', blurb: '滅んだ国の名が、宵ノ辻の名簿に書き加えられる。' },

  /* ---- NORMAL ---- */
  { id: 'NE-1', kind: 'NORMAL', title: '別れの朝', blurb: '好感度は届いたが、踏み込めなかった。誰も欠けないまま、誰とも結ばれない朝。' },
  { id: 'NE-2', kind: 'NORMAL', route: 'lenny', title: 'よく寝る子', blurb: '町は無事。レニィは眠り続ける。' },
  { id: 'NE-3', kind: 'NORMAL', route: 'neo', title: '客人', blurb: '帰るべき場所がないまま、彼は旅立つ。' },

  /* ---- BAD ---- */
  { id: 'BE-01', kind: 'BAD', title: '眠りの底', cg: 'CG-51', blurb: 'レニィが完全に錨に沈む。町は永遠に無事で、誰も彼を思い出せない。' },
  { id: 'BE-02', kind: 'BAD', title: '名前のない朝', cg: 'CG-52', blurb: 'ジンパチが妹を忘れる。手帳が白紙になる。' },
  { id: 'BE-03', kind: 'BAD', title: '鏡のない部屋', cg: 'CG-52', blurb: 'ヒュウが自分の名前を失う。' },
  { id: 'BE-04', kind: 'BAD', title: 'ひとりぼっちの錨', cg: 'CG-51', blurb: 'ムニが回収され、町が裏返る。' },
  { id: 'BE-05', kind: 'BAD', title: '名簿の最後の行', cg: 'CG-52', blurb: 'ゲルが自分を消す。' },
  { id: 'BE-06', kind: 'BAD', title: '最後の魔法剣士', cg: 'CG-53', blurb: 'ネオが残骸と心中する。' },
  { id: 'BE-07', kind: 'BAD', title: '十三夜の観客', cg: 'CG-53', blurb: '十二月が永遠に繰り返す。優しくて、最悪の終わり。' },
  { id: 'BE-08', kind: 'BAD', title: '全部覚えている町', cg: 'CG-53', blurb: '残り火が溢れ、生者が押し出される。' },
  { id: 'BE-09', kind: 'BAD', title: '熱だけが残る', cg: 'CG-53', blurb: 'ジンパチの肉体が崩れる。' },
  { id: 'BE-10', kind: 'BAD', title: '二人で一人', cg: 'CG-51', blurb: '強制統合。二つの人格が一つに潰れる。' },
  { id: 'BE-11', kind: 'BAD', title: 'きれいな嘘', cg: 'CG-53', blurb: '偽の平和。全員が少しずつ間違った記憶で笑っている。' },
  { id: 'BE-12', kind: 'BAD', title: '冬至の焼却', cg: 'CG-53', blurb: '外部の魔術協会が町ごと処分する。' },

  /* ---- TRUE ---- */
  { id: 'TE-01', kind: 'TRUE', title: 'おやすみ、そしておはよう', cg: 'CG-54', blurb: '見る力が体に還る。立会人が消え、朝が来る。' },
];

export const ENDING_IDS = new Set(ENDINGS.map((e) => e.id));

export function endingDef(id: string): EndingDef | undefined {
  return ENDINGS.find((e) => e.id === id);
}

export const HAPPY_IDS = ENDINGS.filter((e) => e.kind === 'HAPPY').map((e) => e.id);
export const BAD_IDS = ENDINGS.filter((e) => e.kind === 'BAD').map((e) => e.id);
export const NORMAL_IDS = ENDINGS.filter((e) => e.kind === 'NORMAL').map((e) => e.id);
