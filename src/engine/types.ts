/**
 * 『夜継ぎの魔法使い』 — Nightweaver — エンジン型定義
 *
 * シナリオは「コマンドの配列を持つシーン」の集合として表現される。
 * 本文はここには一切書かない（src/scenario 以下のデータのみが本文を持つ）。
 */

/* ------------------------------------------------------------------ */
/* キャラクター / パラメータ                                            */
/* ------------------------------------------------------------------ */

/** 好感度を持つ6人。設計書 2-1 のパラメータ記号に一致させる。 */
export type CharId = 'LEN' | 'HYU' | 'JIN' | 'MUN' | 'GER' | 'NEO';

/** 立ち絵として画面に出せるID（好感度対象6人＋モブ/特殊）。 */
export type SpriteId = CharId | 'KANAME' | 'HINATA' | 'SEN' | 'REMNANT';

/** 話者ID。'me' は主人公（プレイヤー分身ではなく視点キャラ）。 */
export type SpeakerId = SpriteId | 'narration' | 'system' | 'observer';

/** 数値パラメータ全種。 */
export type ParamId = CharId | 'RES' | 'NOX' | 'MEM' | 'OBS';

/** 視点キャラ（章ごとに切り替わる）。 */
export type Viewpoint = CharId | 'omniscient';

/* ------------------------------------------------------------------ */
/* フラグ                                                              */
/* ------------------------------------------------------------------ */

/** 設計書 2-3 の主要フラグ内部名。 */
export type MajorFlag =
  | 'TUNNEL_SHADOW' // F01
  | 'NABE_MEMORY' // F02
  | 'KANAME_NAME' // F03
  | 'EYE_WITNESS' // F04
  | 'LENNY_ROAR' // F05
  | 'NEO_NOODLE' // F06
  | 'LEDGER_PEEK' // F07
  | 'MUNI_PROMISE' // F08
  | 'SIDE_GUARD' // F09-A
  | 'SIDE_TRUTH' // F09-B
  | 'SIDE_BREAK' // F09-C
  | 'HYU_HAND' // F10
  | 'SEVEN_YEARS' // F11
  | 'GERU_TRUST' // F12
  | 'JIN_HOLD' // F13
  | 'HINATA_NAME' // F14
  | 'LEDGER_SEN' // F15
  | 'NEO_SCAR' // F16
  | 'HYU_STORY' // F17
  | 'MUNI_SHARE' // F18
  | 'LENNY_WAKE' // F19
  | 'SEAM_STITCH' // F20
  | 'OBSERVER' // F21
  | 'NOX_OVER'; // F99

/** 通常フラグは任意の文字列も許すが、台帳登録を validator が要求する。 */
export type FlagId = MajorFlag | (string & {});

/* ------------------------------------------------------------------ */
/* ルート / 陣営 / エンディング                                         */
/* ------------------------------------------------------------------ */

export type Faction = 'A' | 'B' | 'C';
export type RouteId = 'lenny' | 'hugh' | 'jinpachi' | 'muni' | 'geru' | 'neo';
export type EndingKind = 'HAPPY' | 'NORMAL' | 'BAD' | 'TRUE';

export interface EndingDef {
  id: string; // 'HE-LEN' | 'BE-01' | 'NE-1' | 'TE-01'
  kind: EndingKind;
  title: string;
  route?: RouteId;
  cg?: string;
  /** END一覧に出す短い説明（未到達時は伏せる）。 */
  blurb: string;
}

/* ------------------------------------------------------------------ */
/* 条件DSL                                                             */
/* ------------------------------------------------------------------ */

export type Condition =
  | { f: FlagId } // フラグが立っている
  | { nf: FlagId } // フラグが立っていない
  | { param: ParamId; gte: number }
  | { param: ParamId; lte: number }
  | { faction: Faction }
  | { route: RouteId }
  | { loop: number } // 周回数 >= n（1周目 = 1）
  | { endSeen: string } // 指定ENDに到達済み（周回横断）
  | { metaCount: { of: MajorFlag[]; gte: number } } // 周回横断のフラグ達成種類数
  /** 第九夜の個別ルート判定結果。null は「個別に入れない＝NE-1」。 */
  | { routeWouldBe: RouteId | null }
  /** 指定ルートの HAPPY 条件（好感度70＋固有フラグ＋NOX<70）を満たすか。 */
  | { happyFor: RouteId }
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition };

/* ------------------------------------------------------------------ */
/* 演出                                                                */
/* ------------------------------------------------------------------ */

export type Transition =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'slowfade'
  | 'whiteout'
  | 'blackout';

export type EffectName =
  | 'shake'
  | 'bigshake'
  | 'flash'
  | 'darkflash'
  | 'blur'
  | 'unblur'
  | 'snow-on'
  | 'snow-off'
  | 'dark-on'
  | 'dark-off'
  | 'invert'
  | 'lamp-out'
  | 'pause';

export type CharPos = 'left' | 'center' | 'right' | 'far-left' | 'far-right';

/* ------------------------------------------------------------------ */
/* コマンド                                                            */
/* ------------------------------------------------------------------ */

export interface CmdNarration {
  type: 'narration';
  text: string;
  /** MEM（ヒュウの記憶残量）に応じた差し替え。閾値降順で最初に一致したものを使う。 */
  memVariants?: { below: number; text: string }[];
  /** 2周目以降にごく稀に混ざる別テキスト（OBS加算のトリガでもある）。 */
  echo?: string;
  slow?: boolean;
}

export interface CmdDialogue {
  type: 'dialogue';
  speaker: SpeakerId;
  /** 表示名の上書き（「あの人」等の記憶欠落表現に使う）。 */
  nameOverride?: string;
  text: string;
  expression?: string;
  memVariants?: { below: number; text: string; nameOverride?: string }[];
  echo?: string;
  slow?: boolean;
  whisper?: boolean;
}

export interface CmdSystem {
  type: 'system';
  text: string;
}

export interface CmdBackground {
  type: 'background';
  id: string;
  transition?: Transition;
}

export interface CmdCharacter {
  type: 'character';
  id: SpriteId;
  expression?: string;
  pos?: CharPos;
  /** 'hide' で退場。 */
  action?: 'show' | 'hide' | 'move';
  transition?: Transition;
}

export interface CmdClearCharacters {
  type: 'clearCharacters';
}

export interface CmdCg {
  type: 'cg';
  id: string; // 'CG-19'
  /** 解放のみ行い表示しない場合 true。 */
  unlockOnly?: boolean;
  transition?: Transition;
}

export interface CmdCloseCg {
  type: 'closeCg';
}

export interface CmdBgm {
  type: 'bgm';
  id: string | null; // null で停止
  fade?: number;
}

export interface CmdSe {
  type: 'se';
  id: string;
}

export interface CmdEffect {
  type: 'effect';
  name: EffectName;
  duration?: number;
}

export interface CmdWait {
  type: 'wait';
  ms: number;
}

export interface CmdFlag {
  type: 'flag';
  set?: FlagId[];
  clear?: FlagId[];
}

export interface CmdParam {
  type: 'param';
  /** 加算（負値可）。範囲は engine/state.ts の clamp が保証する。 */
  add?: Partial<Record<ParamId, number>>;
  set?: Partial<Record<ParamId, number>>;
}

export interface ChoiceOption {
  text: string;
  /** 表示条件。満たさなければ選択肢自体が出ない。 */
  showIf?: Condition;
  /** 選択可能条件。満たさなければグレー表示。 */
  enableIf?: Condition;
  /** グレー時に表示する理由（ネタバレしない範囲で）。 */
  lockedNote?: string;
  setFlags?: FlagId[];
  clearFlags?: FlagId[];
  affection?: Partial<Record<ParamId, number>>;
  goto: string; // シーンID
  /** 2周目以降、既読選択肢に混ざる微細なノイズ。 */
  echo?: string;
}

export interface CmdChoice {
  type: 'choice';
  prompt?: string;
  options: ChoiceOption[];
}

export interface CmdJump {
  type: 'jump';
  to: string;
}

export interface CmdBranch {
  type: 'branch';
  /** 上から順に評価し、最初に成立した cond の to へ。 */
  cases: { cond: Condition; to: string }[];
  else: string;
}

export interface CmdChapter {
  type: 'chapter';
  night: number; // 1..13、14 = 終夜
  title: string; // 「灯が減る」
  date: string; // '12月13日'
  viewpoint: Viewpoint;
  /** 章間の心象タイトル（好感度を数値でなく言葉で暗示する）。 */
  moodTitle?: string;
}

export interface CmdRoute {
  type: 'route';
  faction?: Faction;
  route?: RouteId;
}

export interface CmdEnding {
  type: 'ending';
  id: string;
}

export interface CmdAutosave {
  type: 'autosave';
  label: string;
}

/** 立会人（プレイヤー）を直視する演出。TRUE専用。 */
export interface CmdBreakFrame {
  type: 'breakFrame';
  on: boolean;
}

export type Command =
  | CmdNarration
  | CmdDialogue
  | CmdSystem
  | CmdBackground
  | CmdCharacter
  | CmdClearCharacters
  | CmdCg
  | CmdCloseCg
  | CmdBgm
  | CmdSe
  | CmdEffect
  | CmdWait
  | CmdFlag
  | CmdParam
  | CmdChoice
  | CmdJump
  | CmdBranch
  | CmdChapter
  | CmdRoute
  | CmdEnding
  | CmdAutosave
  | CmdBreakFrame;

export interface Scene {
  id: string;
  /** 検証・デバッガ用のラベル。 */
  label?: string;
  commands: Command[];
}

export type SceneMap = Record<string, Scene>;
