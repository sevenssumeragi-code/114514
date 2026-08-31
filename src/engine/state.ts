import type {
  CharId,
  Faction,
  FlagId,
  MajorFlag,
  ParamId,
  RouteId,
  SpriteId,
  CharPos,
  Viewpoint,
} from './types';

/* ------------------------------------------------------------------ */
/* パラメータ範囲（設計書 2-1）                                         */
/* ------------------------------------------------------------------ */

export const PARAM_RANGE: Record<ParamId, [number, number]> = {
  LEN: [0, 100],
  HYU: [0, 100],
  JIN: [0, 100],
  MUN: [0, 100],
  GER: [0, 100],
  NEO: [0, 100],
  RES: [0, 100],
  NOX: [0, 100],
  MEM: [0, 100],
  OBS: [0, 999],
};

export const CHAR_IDS: CharId[] = ['LEN', 'HYU', 'JIN', 'MUN', 'GER', 'NEO'];

/** 完全非表示のパラメータ。UIに数値を出してはならない。 */
export const HIDDEN_PARAMS: ParamId[] = ['OBS'];

export function clampParam(id: ParamId, value: number): number {
  const [lo, hi] = PARAM_RANGE[id];
  return Math.max(lo, Math.min(hi, Math.round(value)));
}

/* ------------------------------------------------------------------ */
/* 周回内データ（New Game で初期化される）                              */
/* ------------------------------------------------------------------ */

export interface CharacterStanding {
  id: SpriteId;
  expression: string;
  pos: CharPos;
}

export interface StageState {
  background: string;
  cg: string | null;
  characters: CharacterStanding[];
  bgm: string | null;
  snow: boolean;
  dark: boolean;
  breakFrame: boolean;
}

export interface GameState {
  /** 現在シーンと、その中の命令位置。 */
  sceneId: string;
  pc: number;

  params: Record<ParamId, number>;
  flags: Record<string, true>;

  faction: Faction | null;
  route: RouteId | null;

  night: number;
  chapterTitle: string;
  chapterDate: string;
  viewpoint: Viewpoint;

  stage: StageState;

  /** この周回で通過したシーンID（到達解析・デバッグ用）。 */
  visited: string[];

  /** 周回番号。New Game のたびに persistent 側から採番される。 */
  loop: number;

  /** 累積プレイ時間（ミリ秒）。 */
  playtimeMs: number;
}

export function initialStage(): StageState {
  return {
    background: 'black',
    cg: null,
    characters: [],
    bgm: null,
    snow: false,
    dark: false,
    breakFrame: false,
  };
}

export function initialParams(): Record<ParamId, number> {
  return {
    LEN: 20,
    HYU: 20,
    JIN: 20,
    MUN: 20,
    GER: 20,
    NEO: 0,
    RES: 10,
    NOX: 0,
    MEM: 100,
    OBS: 0,
  };
}

export function createGameState(loop: number, carriedObs: number): GameState {
  const params = initialParams();
  // OBS だけは周回を越えて持ち越す（設計書 2-1）。
  params.OBS = clampParam('OBS', carriedObs);
  return {
    sceneId: 'n1_open',
    pc: 0,
    params,
    flags: {},
    faction: null,
    route: null,
    night: 0,
    chapterTitle: '',
    chapterDate: '',
    viewpoint: 'omniscient',
    stage: initialStage(),
    visited: [],
    loop,
    playtimeMs: 0,
  };
}

/* ------------------------------------------------------------------ */
/* 周回横断データ（New Game では消えない）                              */
/* ------------------------------------------------------------------ */

/** F20 判定に使う、周回ごとの達成記録。 */
export interface LoopRecord {
  loop: number;
  endingId: string | null;
  /** その周回で達成した F14〜F19 系フラグ。 */
  achievements: MajorFlag[];
  finishedAt: number;
}

export interface PersistentData {
  version: number;
  /** 完了した周回数＋1 = 次の周回番号。 */
  loopCount: number;
  /** 周回を越えて蓄積する観測度。 */
  obs: number;
  /** 到達済みEND ID → 初回到達時刻。 */
  endings: Record<string, number>;
  /** 解放済みCG ID。 */
  cg: Record<string, true>;
  /** 既読テキストのハッシュ集合。 */
  read: Record<string, true>;
  /** 周回ごとの記録（F20 判定の唯一の根拠）。 */
  loopRecords: LoopRecord[];
  /** TRUE 解放済みか（到達したか）。 */
  trueUnlocked: boolean;
  /** 累計プレイ時間。 */
  totalPlaytimeMs: number;
}

export const PERSISTENT_VERSION = 1;

export function createPersistentData(): PersistentData {
  return {
    version: PERSISTENT_VERSION,
    loopCount: 1,
    obs: 0,
    endings: {},
    cg: {},
    read: {},
    loopRecords: [],
    trueUnlocked: false,
    totalPlaytimeMs: 0,
  };
}

/* ------------------------------------------------------------------ */
/* F20 / SEAM_STITCH の判定（設計書 2-3・実装指示 8）                   */
/* ------------------------------------------------------------------ */

/** F14〜F19。SEAM_STITCH はこのうち3種以上を「別周回で」達成することで成立する。 */
export const SEAM_SOURCE_FLAGS: MajorFlag[] = [
  'HINATA_NAME',
  'LEDGER_SEN',
  'NEO_SCAR',
  'HYU_STORY',
  'MUNI_SHARE',
  'LENNY_WAKE',
];

export interface SeamStatus {
  /** 周回横断で達成済みの種類。 */
  achieved: MajorFlag[];
  /** 達成した周回番号の集合（種類ごと）。 */
  byFlag: Partial<Record<MajorFlag, number[]>>;
  /** 別々の周回にまたがって3種以上そろっているか。 */
  satisfied: boolean;
}

/**
 * F20 は「3種類以上を、別周回を通じて達成する」ことで成立する。
 * 単一周回で3種そろえても成立しない（Test 7 の担保）。
 *
 * @param records 過去周回の記録
 * @param current 現在の周回で達成済みのフラグ（現在周回も1周分として数える）
 * @param currentLoop 現在の周回番号
 */
export function evaluateSeamStitch(
  records: LoopRecord[],
  current: MajorFlag[],
  currentLoop: number,
): SeamStatus {
  const byFlag: Partial<Record<MajorFlag, number[]>> = {};
  const push = (flag: MajorFlag, loop: number) => {
    if (!SEAM_SOURCE_FLAGS.includes(flag)) return;
    const arr = byFlag[flag] ?? [];
    if (!arr.includes(loop)) arr.push(loop);
    byFlag[flag] = arr;
  };
  for (const rec of records) for (const f of rec.achievements) push(f, rec.loop);
  for (const f of current) push(f, currentLoop);

  const achieved = SEAM_SOURCE_FLAGS.filter((f) => (byFlag[f]?.length ?? 0) > 0);

  // 「別周回を通じて」の担保：達成が2つ以上の異なる周回に分散していること。
  const loopsInvolved = new Set<number>();
  for (const f of achieved) for (const l of byFlag[f] ?? []) loopsInvolved.add(l);

  const satisfied = achieved.length >= 3 && loopsInvolved.size >= 2;
  return { achieved, byFlag, satisfied };
}

/* ------------------------------------------------------------------ */
/* 便利関数                                                            */
/* ------------------------------------------------------------------ */

export function hasFlag(state: GameState, flag: FlagId): boolean {
  return state.flags[flag] === true;
}

export function affectionRanking(state: GameState, pool: CharId[]): CharId[] {
  return [...pool].sort((a, b) => state.params[b] - state.params[a]);
}
