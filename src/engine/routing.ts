import type { CharId, Faction, RouteId } from './types';
import type { GameState } from './state';
import { FACTION_MEMBERS } from '@/data/characters';

/** 個別ルートの固有フラグ（設計書 2-4「そのキャラの固有フラグを1つ以上」）。 */
export const ROUTE_FLAGS: Record<RouteId, string[]> = {
  lenny: ['LENNY_ROAR', 'N1_SLEPT'],
  muni: ['MUNI_PROMISE', 'A8_CHASE'],
  hugh: ['EYE_WITNESS', 'HYU_HAND'],
  geru: ['LEDGER_PEEK', 'GERU_TRUST'],
  jinpachi: ['KANAME_NAME', 'JIN_HOLD'],
  neo: ['NEO_NOODLE', 'C7_TIE_HAIR'],
};

export const CHAR_TO_ROUTE: Record<CharId, RouteId> = {
  LEN: 'lenny',
  MUN: 'muni',
  HYU: 'hugh',
  GER: 'geru',
  JIN: 'jinpachi',
  NEO: 'neo',
};

export interface RouteDecision {
  /** null なら個別ルートに入れず NE-1「別れの朝」へ。 */
  route: RouteId | null;
  /** 判定に使った陣営内1位。 */
  top: CharId;
  reason: string;
}

/**
 * 第九夜ラストの個別ルート確定。
 *  - 陣営内の好感度1位、かつそのキャラの固有フラグを1つ以上所持で個別ルートへ。
 *  - 好感度だけ高く固有フラグ無し → ノーマルエンド（NE-1）。
 *  - 同点時は RES が高ければレニィ/ムニ側、低ければもう一方。
 */
export function decideRoute(state: GameState): RouteDecision {
  const faction = (state.faction ?? 'A') as Faction;
  const members = FACTION_MEMBERS[faction];
  const [m0, m1] = members;
  const v0 = state.params[m0];
  const v1 = state.params[m1];

  let top: CharId;
  let reason: string;
  if (v0 > v1) {
    top = m0;
    reason = `${m0}(${v0}) > ${m1}(${v1})`;
  } else if (v1 > v0) {
    top = m1;
    reason = `${m1}(${v1}) > ${m0}(${v0})`;
  } else {
    // 同点。RES が高ければレニィ/ムニ側（＝錨に近い側）。
    const anchorSide: Partial<Record<Faction, CharId>> = {
      A: 'MUN',
      B: 'GER',
      C: 'NEO',
    };
    const otherSide: Partial<Record<Faction, CharId>> = {
      A: 'LEN',
      B: 'HYU',
      C: 'JIN',
    };
    const hi = state.params.RES >= 50;
    top = (hi ? anchorSide[faction] : otherSide[faction]) as CharId;
    reason = `同点(${v0})／RES=${state.params.RES} により ${top}`;
  }

  const route = CHAR_TO_ROUTE[top];
  const owned = ROUTE_FLAGS[route].some((f) => state.flags[f] === true);
  if (!owned) {
    return {
      route: null,
      top,
      reason: `${reason}／固有フラグ未所持のため NE-1`,
    };
  }
  return { route, top, reason };
}

/** HAPPY 到達条件（設計書 2-4）。条件は緩めない。 */
export const HAPPY_FLAG: Record<RouteId, string> = {
  lenny: 'LENNY_WAKE', // F19
  hugh: 'HYU_STORY', // F17
  jinpachi: 'HINATA_NAME', // F14
  muni: 'MUNI_SHARE', // F18
  geru: 'LEDGER_SEN', // F15
  neo: 'NEO_SCAR', // F16
};

export const ROUTE_CHAR: Record<RouteId, CharId> = {
  lenny: 'LEN',
  hugh: 'HYU',
  jinpachi: 'JIN',
  muni: 'MUN',
  geru: 'GER',
  neo: 'NEO',
};

export function happyReached(state: GameState, route: RouteId): boolean {
  const ch = ROUTE_CHAR[route];
  return (
    state.params[ch] >= 70 &&
    state.flags[HAPPY_FLAG[route]] === true &&
    state.params.NOX < 70
  );
}
