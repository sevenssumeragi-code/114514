import type {
  ChoiceOption,
  Command,
  Condition,
  EffectName,
  Faction,
  FlagId,
  ParamId,
  RouteId,
  Scene,
  SpeakerId,
  SpriteId,
  CharPos,
  Transition,
  Viewpoint,
  MajorFlag,
} from '@/engine/types';

/** シーン定義。全シーンは jump / branch / ending のいずれかで終わること。 */
export function scene(id: string, ...commands: Command[]): Scene {
  return { id, commands: commands.flat() };
}

/* --- テキスト --- */
export function n(
  text: string,
  opts: { echo?: string; slow?: boolean; mem?: { below: number; text: string }[] } = {},
): Command {
  return {
    type: 'narration',
    text,
    echo: opts.echo,
    slow: opts.slow,
    memVariants: opts.mem,
  };
}

export function d(
  speaker: SpeakerId,
  text: string,
  opts: {
    exp?: string;
    name?: string;
    echo?: string;
    slow?: boolean;
    whisper?: boolean;
    mem?: { below: number; text: string; nameOverride?: string }[];
  } = {},
): Command {
  return {
    type: 'dialogue',
    speaker,
    text,
    expression: opts.exp,
    nameOverride: opts.name,
    echo: opts.echo,
    slow: opts.slow,
    whisper: opts.whisper,
    memVariants: opts.mem,
  };
}

export function sys(text: string): Command {
  return { type: 'system', text };
}

/* --- 舞台 --- */
export function bg(id: string, transition: Transition = 'fade'): Command {
  return { type: 'background', id, transition };
}

export function ch(
  id: SpriteId,
  expression = 'normal',
  pos: CharPos = 'center',
): Command {
  return { type: 'character', id, expression, pos, action: 'show' };
}

export function hide(id: SpriteId): Command {
  return { type: 'character', id, action: 'hide' };
}

export function clearCh(): Command {
  return { type: 'clearCharacters' };
}

export function cg(id: string, transition: Transition = 'fade'): Command {
  return { type: 'cg', id, transition };
}

export function cgOnly(id: string): Command {
  return { type: 'cg', id, unlockOnly: true };
}

export function closeCg(): Command {
  return { type: 'closeCg' };
}

export function bgm(id: string | null, fade = 800): Command {
  return { type: 'bgm', id, fade };
}

export function se(id: string): Command {
  return { type: 'se', id };
}

export function fx(name: EffectName, duration?: number): Command {
  return { type: 'effect', name, duration };
}

export function wait(ms: number): Command {
  return { type: 'wait', ms };
}

/* --- 状態 --- */
export function flag(...set: FlagId[]): Command {
  return { type: 'flag', set };
}

export function unflag(...clear: FlagId[]): Command {
  return { type: 'flag', clear };
}

export function p(add: Partial<Record<ParamId, number>>): Command {
  return { type: 'param', add };
}

export function setP(set: Partial<Record<ParamId, number>>): Command {
  return { type: 'param', set };
}

/* --- 制御 --- */
export function choice(prompt: string | undefined, ...options: ChoiceOption[]): Command {
  return { type: 'choice', prompt, options };
}

export function opt(
  text: string,
  goto: string,
  extra: Omit<ChoiceOption, 'text' | 'goto'> = {},
): ChoiceOption {
  return { text, goto, ...extra };
}

export function jump(to: string): Command {
  return { type: 'jump', to };
}

export function branch(
  cases: { cond: Condition; to: string }[],
  otherwise: string,
): Command {
  return { type: 'branch', cases, else: otherwise };
}

export function chapter(
  night: number,
  title: string,
  date: string,
  viewpoint: Viewpoint,
  moodTitle?: string,
): Command {
  return { type: 'chapter', night, title, date, viewpoint, moodTitle };
}

export function route(r: { faction?: Faction; route?: RouteId }): Command {
  return { type: 'route', ...r };
}

export function ending(id: string): Command {
  return { type: 'ending', id };
}

export function autosave(label: string): Command {
  return { type: 'autosave', label };
}

export function breakFrame(on: boolean): Command {
  return { type: 'breakFrame', on };
}

/* --- よく使う条件 --- */
export const F = (id: FlagId): Condition => ({ f: id });
export const NF = (id: FlagId): Condition => ({ nf: id });
export const GTE = (param: ParamId, v: number): Condition => ({ param, gte: v });
export const LTE = (param: ParamId, v: number): Condition => ({ param, lte: v });
export const AND = (...c: Condition[]): Condition => ({ and: c });
export const OR = (...c: Condition[]): Condition => ({ or: c });
export const NOT = (c: Condition): Condition => ({ not: c });
export const LOOP = (nth: number): Condition => ({ loop: nth });
export const ROUTE_IS = (r: RouteId | null): Condition => ({ routeWouldBe: r });
export const HAPPY = (r: RouteId): Condition => ({ happyFor: r });
export const IN_ROUTE = (r: RouteId): Condition => ({ route: r });
export const IN_FACTION = (f: Faction): Condition => ({ faction: f });
export const SEEN = (endId: string): Condition => ({ endSeen: endId });
export const META = (of: MajorFlag[], gte: number): Condition => ({ metaCount: { of, gte } });
