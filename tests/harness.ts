import { Engine, type ResolvedOption } from '@/engine/interpreter';
import { SCENES } from '@/scenario/index';
import {
  createGameState,
  createPersistentData,
  type GameState,
  type PersistentData,
} from '@/engine/state';

export interface PlayResult {
  ending: string | null;
  error: string | null;
  state: GameState;
  persistent: PersistentData;
  /** 通過した選択肢（デバッグ用）。 */
  log: { scene: string; picked: string; options: string[] }[];
  steps: number;
}

export type Chooser = (
  sceneId: string,
  options: ResolvedOption[],
  state: GameState,
) => number;

/**
 * 見出しに一致する選択肢を優先して選ぶ chooser を作る。
 * prefs は「部分一致する文字列」の配列。先に書いたものほど優先。
 * 一致がなければ fallback（既定0）を選ぶ。
 */
export function preferChooser(prefs: string[], fallback = 0): Chooser {
  return (_scene, options) => {
    for (const p of prefs) {
      const i = options.findIndex((o) => o.enabled && o.text.includes(p));
      if (i >= 0) return i;
    }
    const enabled = options.findIndex((o) => o.enabled);
    const fb = options[fallback]?.enabled ? fallback : enabled;
    return fb >= 0 ? fb : 0;
  };
}

/** シーンIDごとに選択肢インデックスを固定する chooser。 */
export function sceneChooser(map: Record<string, number>, base: Chooser): Chooser {
  return (scene, options, state) => {
    const forced = map[scene];
    if (forced !== undefined && options[forced]?.enabled) return forced;
    return base(scene, options, state);
  };
}

export function play(
  chooser: Chooser,
  opts: {
    persistent?: PersistentData;
    startState?: GameState;
    maxSteps?: number;
    /** 各ステップ後に呼ばれるフック（パラメータの強制操作などに使う）。 */
    onStep?: (e: Engine) => void;
  } = {},
): PlayResult {
  const persistent = opts.persistent ?? createPersistentData();
  const state =
    opts.startState ?? createGameState(persistent.loopCount, persistent.obs);
  const engine = new Engine(SCENES, state, persistent);
  const log: PlayResult['log'] = [];
  const max = opts.maxSteps ?? 40000;
  let steps = 0;

  for (;;) {
    if (++steps > max) {
      return { ending: null, error: 'ステップ上限', state, persistent, log, steps };
    }
    const out = engine.step();
    opts.onStep?.(engine);
    const halt = out.halt;
    if (halt.kind === 'ending') {
      return { ending: halt.id, error: null, state, persistent, log, steps };
    }
    if (halt.kind === 'error') {
      return { ending: null, error: halt.message, state, persistent, log, steps };
    }
    if (halt.kind === 'choice') {
      const sceneId = engine.state.sceneId;
      const idx = chooser(sceneId, halt.options, engine.state);
      log.push({
        scene: sceneId,
        picked: halt.options[idx]?.text ?? '(none)',
        options: halt.options.map((o) => (o.enabled ? o.text : `[×] ${o.text}`)),
      });
      engine.choose(idx);
    }
    // text は自動で読み飛ばす
  }
}

/** 好感度を強制的に底上げする onStep（HAPPY条件の検証に使う）。 */
export function boost(target: string, value = 100) {
  return (e: Engine) => {
    const params = e.state.params as Record<string, number>;
    if (params[target] !== undefined && params[target] < value) params[target] = value;
  };
}
