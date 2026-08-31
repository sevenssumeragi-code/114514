import type { Condition, MajorFlag } from './types';
import { decideRoute, happyReached } from './routing';
import {
  evaluateSeamStitch,
  type GameState,
  type PersistentData,
} from './state';

export interface ConditionContext {
  state: GameState;
  persistent: PersistentData;
}

/**
 * 条件DSLの評価。
 * `metaCount` だけは周回横断データを見る（F20 の単一周回判定を禁じるため）。
 */
export function evalCondition(cond: Condition, ctx: ConditionContext): boolean {
  const { state, persistent } = ctx;

  if ('f' in cond) return state.flags[cond.f] === true;
  if ('nf' in cond) return state.flags[cond.nf] !== true;
  if ('param' in cond) {
    const v = state.params[cond.param];
    if ('gte' in cond) return v >= cond.gte;
    return v <= cond.lte;
  }
  if ('faction' in cond) return state.faction === cond.faction;
  if ('route' in cond) return state.route === cond.route;
  if ('loop' in cond) return state.loop >= cond.loop;
  if ('endSeen' in cond) return persistent.endings[cond.endSeen] !== undefined;
  if ('metaCount' in cond) {
    const current = cond.metaCount.of.filter(
      (f) => state.flags[f] === true,
    ) as MajorFlag[];
    const status = evaluateSeamStitch(
      persistent.loopRecords,
      current,
      state.loop,
    );
    const hits = status.achieved.filter((f) =>
      cond.metaCount.of.includes(f),
    ).length;
    // 「別周回を通じて」の担保も同時に要求する。
    return hits >= cond.metaCount.gte && status.satisfied;
  }
  if ('routeWouldBe' in cond) return decideRoute(state).route === cond.routeWouldBe;
  if ('happyFor' in cond) return happyReached(state, cond.happyFor);
  if ('and' in cond) return cond.and.every((c) => evalCondition(c, ctx));
  if ('or' in cond) return cond.or.some((c) => evalCondition(c, ctx));
  if ('not' in cond) return !evalCondition(cond.not, ctx);
  return false;
}

/** validator 用：条件が参照しているフラグ名を列挙する。 */
export function collectFlagRefs(cond: Condition, out: Set<string> = new Set()): Set<string> {
  if ('f' in cond) out.add(cond.f);
  else if ('nf' in cond) out.add(cond.nf);
  else if ('metaCount' in cond) cond.metaCount.of.forEach((f) => out.add(f));
  else if ('and' in cond) cond.and.forEach((c) => collectFlagRefs(c, out));
  else if ('or' in cond) cond.or.forEach((c) => collectFlagRefs(c, out));
  else if ('not' in cond) collectFlagRefs(cond.not, out);
  return out;
}
