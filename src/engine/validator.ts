import type { Command, Scene, SceneMap } from './types';
import { collectFlagRefs } from './conditions';
import { FLAG_IDS } from '@/data/flags';
import { CG_IDS } from '@/data/cg';
import { ENDING_IDS } from '@/data/endings';
import { BG_IDS, BGM_IDS, SE_IDS } from '@/data/assets';
import { CHARACTERS } from '@/data/characters';
import { PARAM_RANGE } from './state';

export interface ValidationIssue {
  severity: 'error' | 'warn';
  code: string;
  scene?: string;
  detail: string;
}

const SPRITE_IDS = new Set(Object.keys(CHARACTERS));
const SPEAKER_EXTRA = new Set(['narration', 'system', 'observer']);
const PARAM_IDS = new Set(Object.keys(PARAM_RANGE));

/** シーンから出て行く先（jump / branch / choice goto）を列挙する。 */
export function outgoing(scene: Scene): string[] {
  const out: string[] = [];
  for (const c of scene.commands) {
    if (c.type === 'jump') out.push(c.to);
    else if (c.type === 'branch') {
      for (const k of c.cases) out.push(k.to);
      out.push(c.else);
    } else if (c.type === 'choice') {
      for (const o of c.options) out.push(o.goto);
    }
  }
  return out;
}

/** シーンが終端（ending）を持つか。 */
function hasEnding(scene: Scene): string[] {
  return scene.commands.filter((c) => c.type === 'ending').map((c) => (c as { id: string }).id);
}

/** そのコマンド列が「必ず制御を手放す」形で終わっているか。 */
function terminates(scene: Scene): boolean {
  const last = scene.commands[scene.commands.length - 1];
  if (!last) return false;
  // choice も制御を手放す（プレイヤーの選択で必ずどこかへ飛ぶ）ので終端とみなす。
  return (
    last.type === 'jump' ||
    last.type === 'branch' ||
    last.type === 'ending' ||
    last.type === 'choice'
  );
}

function collectFlagsSetIn(cmds: Command[], out: Set<string>): void {
  for (const c of cmds) {
    if (c.type === 'flag') {
      c.set?.forEach((f) => out.add(f));
      c.clear?.forEach((f) => out.add(f));
    } else if (c.type === 'choice') {
      for (const o of c.options) {
        o.setFlags?.forEach((f) => out.add(f));
        o.clearFlags?.forEach((f) => out.add(f));
      }
    }
  }
}

export interface ValidationReport {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  reachable: Set<string>;
  unreachableScenes: string[];
  reachableEndings: string[];
  unreachableEndings: string[];
}

/**
 * シナリオデータの静的検証。実装指示 29 の全項目を検査する。
 */
export function validateScenario(
  scenes: SceneMap,
  start: string,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const err = (code: string, detail: string, scene?: string) =>
    issues.push({ severity: 'error', code, detail, scene });
  const warn = (code: string, detail: string, scene?: string) =>
    issues.push({ severity: 'warn', code, detail, scene });

  const all = Object.values(scenes);
  const declaredFlags = new Set<string>();
  for (const s of all) collectFlagsSetIn(s.commands, declaredFlags);

  /* ---- 1. コマンド単位の参照検査 ---- */
  for (const s of all) {
    if (!terminates(s)) {
      err('SCENE_NOT_TERMINATED', `シーン ${s.id} が jump / branch / choice / ending で終わっていない`, s.id);
    }
    s.commands.forEach((c, i) => {
      const at = `${s.id}[${i}]`;
      switch (c.type) {
        case 'background':
          if (!BG_IDS.has(c.id)) err('BG_MISSING', `${at}: 未定義の背景 ${c.id}`, s.id);
          break;
        case 'bgm':
          if (c.id !== null && !BGM_IDS.has(c.id))
            err('BGM_MISSING', `${at}: 未定義のBGM ${c.id}`, s.id);
          break;
        case 'se':
          if (!SE_IDS.has(c.id)) err('SE_MISSING', `${at}: 未定義のSE ${c.id}`, s.id);
          break;
        case 'cg':
          if (!CG_IDS.has(c.id)) err('CG_MISSING', `${at}: 未定義のCG ${c.id}`, s.id);
          break;
        case 'character':
          if (!SPRITE_IDS.has(c.id))
            err('CHAR_MISSING', `${at}: 未定義のキャラクターID ${c.id}`, s.id);
          else if (c.expression && !CHARACTERS[c.id].expressions.includes(c.expression))
            warn('EXPR_MISSING', `${at}: ${c.id} に表情 ${c.expression} が未定義`, s.id);
          break;
        case 'dialogue':
          if (!SPRITE_IDS.has(c.speaker) && !SPEAKER_EXTRA.has(c.speaker))
            err('SPEAKER_MISSING', `${at}: 未定義の話者 ${c.speaker}`, s.id);
          break;
        case 'flag': {
          for (const f of [...(c.set ?? []), ...(c.clear ?? [])])
            if (!FLAG_IDS.has(f))
              err('FLAG_UNREGISTERED', `${at}: 台帳にないフラグ ${f}`, s.id);
          break;
        }
        case 'param': {
          for (const key of [...Object.keys(c.add ?? {}), ...Object.keys(c.set ?? {})])
            if (!PARAM_IDS.has(key))
              err('PARAM_UNKNOWN', `${at}: 未知のパラメータ ${key}`, s.id);
          for (const [k, v] of Object.entries(c.set ?? {})) {
            const range = PARAM_RANGE[k as keyof typeof PARAM_RANGE];
            if (range && (v as number) > range[1])
              warn('PARAM_RANGE', `${at}: ${k}=${v} は上限 ${range[1]} を超える（clamp される）`, s.id);
          }
          break;
        }
        case 'choice': {
          if (c.options.length === 0)
            err('CHOICE_EMPTY', `${at}: 選択肢が空`, s.id);
          if (c.options.length > 4)
            warn('CHOICE_TOO_MANY', `${at}: 選択肢が ${c.options.length} 個（モバイルで4つまで）`, s.id);
          for (const o of c.options) {
            if (!scenes[o.goto])
              err('JUMP_MISSING', `${at}: 存在しない飛び先 ${o.goto}`, s.id);
            for (const f of [...(o.setFlags ?? []), ...(o.clearFlags ?? [])])
              if (!FLAG_IDS.has(f))
                err('FLAG_UNREGISTERED', `${at}: 台帳にないフラグ ${f}`, s.id);
            for (const key of Object.keys(o.affection ?? {}))
              if (!PARAM_IDS.has(key))
                err('PARAM_UNKNOWN', `${at}: 未知のパラメータ ${key}`, s.id);
            for (const cond of [o.showIf, o.enableIf]) {
              if (!cond) continue;
              for (const f of collectFlagRefs(cond))
                if (!FLAG_IDS.has(f))
                  err('FLAG_UNREGISTERED', `${at}: 条件が台帳にないフラグ ${f} を参照`, s.id);
            }
          }
          break;
        }
        case 'jump':
          if (!scenes[c.to]) err('JUMP_MISSING', `${at}: 存在しない飛び先 ${c.to}`, s.id);
          break;
        case 'branch': {
          for (const k of c.cases) {
            if (!scenes[k.to]) err('JUMP_MISSING', `${at}: 存在しない飛び先 ${k.to}`, s.id);
            for (const f of collectFlagRefs(k.cond))
              if (!FLAG_IDS.has(f))
                err('FLAG_UNREGISTERED', `${at}: 条件が台帳にないフラグ ${f} を参照`, s.id);
          }
          if (!scenes[c.else]) err('JUMP_MISSING', `${at}: 存在しない飛び先 ${c.else}`, s.id);
          break;
        }
        case 'ending':
          if (!ENDING_IDS.has(c.id)) err('ENDING_MISSING', `${at}: 未定義のEND ${c.id}`, s.id);
          break;
        default:
          break;
      }
    });
  }

  /* ---- 2. 到達可能性（グラフ探索） ---- */
  const reachable = new Set<string>();
  const stack = [start];
  if (!scenes[start]) err('START_MISSING', `開始シーン ${start} が存在しない`);
  while (stack.length) {
    const id = stack.pop() as string;
    if (reachable.has(id)) continue;
    const sc = scenes[id];
    if (!sc) continue;
    reachable.add(id);
    for (const to of outgoing(sc)) stack.push(to);
  }

  const unreachableScenes = all.map((s) => s.id).filter((id) => !reachable.has(id));
  for (const id of unreachableScenes)
    err('SCENE_UNREACHABLE', `到達不能なシーン ${id}`, id);

  /* ---- 3. ENDの到達可能性 ---- */
  const reachableEndings = new Set<string>();
  for (const id of reachable) for (const e of hasEnding(scenes[id])) reachableEndings.add(e);
  const unreachableEndings = [...ENDING_IDS].filter((e) => !reachableEndings.has(e));
  for (const e of unreachableEndings)
    err('ENDING_UNREACHABLE', `到達不能なEND ${e}`);

  /* ---- 4. 無限ループの疑い（テキストを一切持たない閉路） ---- */
  for (const s of all) {
    const outs = outgoing(s);
    const producesText = s.commands.some(
      (c) => c.type === 'narration' || c.type === 'dialogue' || c.type === 'system' || c.type === 'choice',
    );
    if (!producesText && outs.includes(s.id))
      err('INFINITE_LOOP', `シーン ${s.id} がテキストを出さずに自分へ戻る`, s.id);
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');
  return {
    issues,
    errors,
    warnings,
    reachable,
    unreachableScenes,
    reachableEndings: [...reachableEndings],
    unreachableEndings,
  };
}

export function formatReport(r: ValidationReport): string {
  const lines: string[] = [];
  lines.push(`errors: ${r.errors.length} / warnings: ${r.warnings.length}`);
  for (const i of r.issues.slice(0, 200))
    lines.push(`[${i.severity}] ${i.code} ${i.scene ?? ''} — ${i.detail}`);
  if (r.issues.length > 200) lines.push(`… 他 ${r.issues.length - 200} 件`);
  return lines.join('\n');
}
