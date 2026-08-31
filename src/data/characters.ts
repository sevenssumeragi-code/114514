import type { CharId, SpriteId } from '@/engine/types';

export interface CharacterDef {
  id: SpriteId;
  name: string;
  /** 一人称・二人称は設計書 10-1 の絶対遵守表。UI表示と執筆チェックの根拠。 */
  firstPerson: string;
  secondPerson: string;
  /** 立ち絵の基準色（素材が無い間のプレースホルダに使う）。 */
  color: string;
  accent: string;
  hair: string;
  expressions: string[];
  /** 好感度対象か。 */
  affectionTarget: boolean;
  note: string;
}

export const CHARACTERS: Record<SpriteId, CharacterDef> = {
  LEN: {
    id: 'LEN',
    name: 'レニィ',
    firstPerson: '僕',
    secondPerson: 'きみ',
    color: '#5b8fd9',
    accent: '#a8cbff',
    hair: '青',
    expressions: ['normal', 'sleepy', 'smile', 'blank', 'awake', 'cry'],
    affectionTarget: true,
    note: '錨の「起きる半分」。感情の起伏が薄い。稀に語尾を伸ばす。',
  },
  HYU: {
    id: 'HYU',
    name: 'ヒュウ',
    firstPerson: 'わたくし',
    secondPerson: 'あなた',
    color: '#4e9c72',
    accent: '#c94f4f',
    hair: '緑',
    expressions: ['normal', 'smug', 'smile', 'pain', 'blank', 'eye'],
    affectionTarget: true,
    note: '左目が魔眼。常に敬語。代償で名前と顔の結びつきが剥がれる。',
  },
  JIN: {
    id: 'JIN',
    name: 'ジンパチ',
    firstPerson: '俺',
    secondPerson: 'お前',
    color: '#b8763a',
    accent: '#ffcf6b',
    hair: '茶',
    expressions: ['normal', 'angry', 'laugh', 'shock', 'sad', 'quiet'],
    affectionTarget: true,
    note: '起源が「空」。魔術が一切効かない。妹ヒナタを唯一覚えている。',
  },
  MUN: {
    id: 'MUN',
    name: 'ムニ',
    firstPerson: 'ムニ',
    secondPerson: '（名前）',
    color: '#6fa8dc',
    accent: '#ffe9a8',
    hair: '青',
    expressions: ['normal', 'smile', 'cry', 'scared', 'sleep', 'hollow'],
    affectionTarget: true,
    note: '5歳。錨そのもの。ひらがな中心の語彙。難語・論理的説明は禁止。',
  },
  GER: {
    id: 'GER',
    name: 'ゲル',
    firstPerson: '私',
    secondPerson: 'お前',
    color: '#8a6fb0',
    accent: '#d9c2f0',
    hair: '紫',
    expressions: ['normal', 'quiet', 'pain', 'smile', 'turn', 'broken', 'shock'],
    affectionTarget: true,
    note: '七年前の契約者。女性語尾禁止。「貴様」は一人称でも二人称でも厳禁。',
  },
  NEO: {
    id: 'NEO',
    name: 'ネオ',
    firstPerson: '私',
    secondPerson: '貴様',
    color: '#d4b23c',
    accent: '#fff3c4',
    hair: '金',
    expressions: ['normal', 'cold', 'shock', 'pain', 'smile', 'resolve'],
    affectionTarget: true,
    note: '裏側の魔法剣士。高圧的・尊大。「俺」にしない。第二主役。',
  },
  KANAME: {
    id: 'KANAME',
    name: 'カナメ',
    firstPerson: '俺',
    secondPerson: 'お前',
    color: '#7c7c7c',
    accent: '#bdbdbd',
    hair: '黒',
    expressions: ['normal', 'fade'],
    affectionTarget: false,
    note: '第二夜に消える同級生。',
  },
  HINATA: {
    id: 'HINATA',
    name: 'ヒナタ',
    firstPerson: 'わたし',
    secondPerson: 'お兄ちゃん',
    color: '#e0a05a',
    accent: '#ffe0b8',
    hair: '茶',
    expressions: ['normal', 'ember', 'cry'],
    affectionTarget: false,
    note: 'ジンパチの妹。七年前の蒐夜に攫われた。',
  },
  SEN: {
    id: 'SEN',
    name: 'セン',
    firstPerson: '僕',
    secondPerson: '姉さん',
    color: '#9d86bb',
    accent: '#e5d6f5',
    hair: '紫',
    expressions: ['normal', 'ember'],
    affectionTarget: false,
    note: 'ゲルの弟。三年前に喪われた。',
  },
  REMNANT: {
    id: 'REMNANT',
    name: '残骸',
    firstPerson: '我々',
    secondPerson: 'お前たち',
    color: '#3b2d4a',
    accent: '#6e4b8f',
    hair: '—',
    expressions: ['normal'],
    affectionTarget: false,
    note: '崩壊した裏側の都の残滓。声だけの存在。',
  },
};

export const AFFECTION_CHARS: CharId[] = ['LEN', 'HYU', 'JIN', 'MUN', 'GER', 'NEO'];

/** 陣営ごとの同行キャラ（個別ルート判定の母集団）。 */
export const FACTION_MEMBERS: Record<'A' | 'B' | 'C', CharId[]> = {
  A: ['LEN', 'MUN'],
  B: ['HYU', 'GER'],
  C: ['JIN', 'NEO'],
};
