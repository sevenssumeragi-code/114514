import type {
  ChoiceOption,
  Command,
  EffectName,
  SceneMap,
  SpeakerId,
} from './types';
import {
  CHAR_IDS,
  clampParam,
  createGameState,
  type GameState,
  type LoopRecord,
  type PersistentData,
  SEAM_SOURCE_FLAGS,
  evaluateSeamStitch,
} from './state';
import { evalCondition } from './conditions';
import { textKey } from './textkey';

/* ------------------------------------------------------------------ */
/* 出力（UI が描画するもの）                                            */
/* ------------------------------------------------------------------ */

export interface TextEntry {
  /** バックログ用の一意キー（既読判定にも使う）。 */
  key: string;
  speaker: SpeakerId;
  name: string | null;
  text: string;
  slow: boolean;
  whisper: boolean;
  /** 2周目以降のノイズが差し込まれたか。 */
  echoed: boolean;
  isRead: boolean;
}

export interface ResolvedOption {
  index: number;
  text: string;
  enabled: boolean;
  lockedNote?: string;
  echoed: boolean;
}

export type Halt =
  | { kind: 'text'; entry: TextEntry }
  | { kind: 'choice'; prompt?: string; options: ResolvedOption[] }
  | { kind: 'ending'; id: string }
  | { kind: 'error'; message: string };

export interface StagedEffect {
  name: EffectName;
  duration?: number;
}

export interface StepOutput {
  halt: Halt;
  /** この step で発生した演出（UI が順に適用する）。 */
  effects: StagedEffect[];
  /** この step で発生した SE。 */
  se: string[];
  /** この step で解放されたCG。 */
  unlockedCg: string[];
  /** オートセーブ要求。 */
  autosave: string | null;
  /** 章切り替えが起きたか（章タイトル表示用）。 */
  chapterCard: { night: number; title: string; date: string; mood?: string } | null;
}

/* ------------------------------------------------------------------ */
/* 表示名                                                              */
/* ------------------------------------------------------------------ */

export const DISPLAY_NAME: Record<string, string> = {
  LEN: 'レニィ',
  HYU: 'ヒュウ',
  JIN: 'ジンパチ',
  MUN: 'ムニ',
  GER: 'ゲル',
  NEO: 'ネオ',
  KANAME: 'カナメ',
  HINATA: 'ヒナタ',
  SEN: 'セン',
  REMNANT: '残骸',
  observer: '？？？',
  system: '',
  narration: '',
};

/* ------------------------------------------------------------------ */
/* エンジン                                                            */
/* ------------------------------------------------------------------ */

export interface EngineHooks {
  /** ENDに到達したときに呼ばれる。永続データの更新は engine 側で済ませてある。 */
  onEnding?: (id: string, state: GameState) => void;
}

export class Engine {
  scenes: SceneMap;
  state: GameState;
  persistent: PersistentData;
  hooks: EngineHooks;

  private effects: StagedEffect[] = [];
  private se: string[] = [];
  private unlockedCg: string[] = [];
  private autosave: string | null = null;
  private chapterCard: StepOutput['chapterCard'] = null;
  private pendingChoice: ChoiceOption[] | null = null;

  /** 無限ループ検出用。1 step 内で処理した命令数。 */
  private static readonly MAX_OPS = 200000;

  constructor(
    scenes: SceneMap,
    state: GameState,
    persistent: PersistentData,
    hooks: EngineHooks = {},
  ) {
    this.scenes = scenes;
    this.state = state;
    this.persistent = persistent;
    this.hooks = hooks;
  }

  static newGame(
    scenes: SceneMap,
    persistent: PersistentData,
    hooks: EngineHooks = {},
  ): Engine {
    const state = createGameState(persistent.loopCount, persistent.obs);
    return new Engine(scenes, state, persistent, hooks);
  }

  /* ---------------------------------------------------------------- */

  private flush(halt: Halt): StepOutput {
    const out: StepOutput = {
      halt,
      effects: this.effects,
      se: this.se,
      unlockedCg: this.unlockedCg,
      autosave: this.autosave,
      chapterCard: this.chapterCard,
    };
    this.effects = [];
    this.se = [];
    this.unlockedCg = [];
    this.autosave = null;
    this.chapterCard = null;
    return out;
  }

  private ctx() {
    return { state: this.state, persistent: this.persistent };
  }

  private goto(sceneId: string): void {
    this.state.sceneId = sceneId;
    this.state.pc = 0;
    if (!this.state.visited.includes(sceneId)) this.state.visited.push(sceneId);
  }

  /** 現在位置から次の停止点まで実行する。 */
  step(): StepOutput {
    let ops = 0;
    for (;;) {
      if (++ops > Engine.MAX_OPS) {
        return this.flush({
          kind: 'error',
          message: `無限ループを検出しました（scene=${this.state.sceneId}）`,
        });
      }
      const scene = this.scenes[this.state.sceneId];
      if (!scene) {
        return this.flush({
          kind: 'error',
          message: `シーンが存在しません: ${this.state.sceneId}`,
        });
      }
      if (this.state.pc >= scene.commands.length) {
        return this.flush({
          kind: 'error',
          message: `シーン ${scene.id} が jump / ending で終わっていません`,
        });
      }
      const cmd = scene.commands[this.state.pc];
      const halt = this.exec(cmd);
      if (halt) return this.flush(halt);
    }
  }

  /** 選択肢を選ぶ。 */
  choose(index: number): void {
    const opts = this.pendingChoice;
    if (!opts) return;
    const resolved = opts.filter(
      (o) => !o.showIf || evalCondition(o.showIf, this.ctx()),
    );
    const opt = resolved[index];
    if (!opt) return;
    this.pendingChoice = null;
    if (opt.setFlags) this.setFlags(opt.setFlags);
    if (opt.clearFlags) for (const f of opt.clearFlags) delete this.state.flags[f];
    if (opt.affection) this.addParams(opt.affection);
    // 既読の選択肢を選び直すこと自体が「見ている」ことの証。
    if (this.state.loop > 1) this.addParams({ OBS: 5 });
    this.state.pc += 1;
    this.goto(opt.goto);
  }

  /* ---------------------------------------------------------------- */

  private setFlags(flags: string[]): void {
    for (const f of flags) this.state.flags[f] = true;
    this.syncDerivedFlags();
  }

  private addParams(add: Partial<Record<string, number>>): void {
    for (const [k, v] of Object.entries(add)) {
      if (v === undefined) continue;
      const key = k as keyof GameState['params'];
      if (this.state.params[key] === undefined) continue;
      this.state.params[key] = clampParam(key, this.state.params[key] + v);
    }
    this.syncDerivedFlags();
  }

  /** F20 / F99 のような、状態から自動的に決まるフラグを同期する。 */
  private syncDerivedFlags(): void {
    // F99 NOX_OVER
    if (this.state.params.NOX >= 80) this.state.flags.NOX_OVER = true;
    else delete this.state.flags.NOX_OVER;

    // F20 SEAM_STITCH — 周回横断でのみ成立する
    const current = SEAM_SOURCE_FLAGS.filter((f) => this.state.flags[f] === true);
    const seam = evaluateSeamStitch(
      this.persistent.loopRecords,
      current,
      this.state.loop,
    );
    if (seam.satisfied) this.state.flags.SEAM_STITCH = true;
    else delete this.state.flags.SEAM_STITCH;
  }

  /** MEM に応じたテキスト差し替え（設計書 8-4）。 */
  private applyMemVariant<T extends { below: number }>(
    variants: T[] | undefined,
  ): T | null {
    if (!variants || variants.length === 0) return null;
    const mem = this.state.params.MEM;
    const sorted = [...variants].sort((a, b) => a.below - b.below);
    for (const v of sorted) if (mem < v.below) return v;
    return null;
  }

  /**
   * 2周目以降の「一瞬の別テキスト」。既視感の演出であり、OBS を自然に加算する。
   * 露骨にならないよう、echo を持つ行の一部でのみ発火させる。
   */
  private maybeEcho(echo: string | undefined, key: string): string | null {
    if (!echo) return null;
    if (this.state.loop < 2) return null;
    // 既読の行ほど「ずれ」が出る。決定論的にするため key のハッシュを使う。
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const bucket = Math.abs(h) % 100;
    const rate = Math.min(45, 12 + this.state.loop * 6);
    if (bucket >= rate) return null;
    this.addParams({ OBS: 1 });
    return echo;
  }

  private makeText(
    speaker: SpeakerId,
    rawText: string,
    name: string | null,
    slow: boolean,
    whisper: boolean,
    echo: string | undefined,
  ): TextEntry {
    const key = textKey(this.state.sceneId, this.state.pc, rawText);
    const echoText = this.maybeEcho(echo, key);
    const text = echoText ?? rawText;
    const isRead = this.persistent.read[key] === true;
    this.persistent.read[key] = true;
    return {
      key,
      speaker,
      name,
      text,
      slow,
      whisper,
      echoed: echoText !== null,
      isRead,
    };
  }

  /* ---------------------------------------------------------------- */

  private exec(cmd: Command): Halt | null {
    const s = this.state;
    switch (cmd.type) {
      case 'narration': {
        const v = this.applyMemVariant(cmd.memVariants);
        const text = v ? v.text : cmd.text;
        const entry = this.makeText('narration', text, null, !!cmd.slow, false, cmd.echo);
        s.pc += 1;
        return { kind: 'text', entry };
      }
      case 'dialogue': {
        const v = this.applyMemVariant(cmd.memVariants);
        const text = v ? v.text : cmd.text;
        const nameOverride = v?.nameOverride ?? cmd.nameOverride;
        const name = nameOverride ?? DISPLAY_NAME[cmd.speaker] ?? cmd.speaker;
        if (cmd.expression) this.setExpression(cmd.speaker, cmd.expression);
        const entry = this.makeText(
          cmd.speaker,
          text,
          name,
          !!cmd.slow,
          !!cmd.whisper,
          cmd.echo,
        );
        s.pc += 1;
        return { kind: 'text', entry };
      }
      case 'system': {
        const entry = this.makeText('system', cmd.text, null, false, false, undefined);
        s.pc += 1;
        return { kind: 'text', entry };
      }
      case 'background':
        s.stage.background = cmd.id;
        s.stage.cg = null;
        s.pc += 1;
        return null;
      case 'character': {
        const action = cmd.action ?? 'show';
        const list = s.stage.characters.filter((c) => c.id !== cmd.id);
        if (action !== 'hide') {
          const prev = s.stage.characters.find((c) => c.id === cmd.id);
          list.push({
            id: cmd.id,
            expression: cmd.expression ?? prev?.expression ?? 'normal',
            pos: cmd.pos ?? prev?.pos ?? 'center',
          });
        }
        s.stage.characters = list;
        s.pc += 1;
        return null;
      }
      case 'clearCharacters':
        s.stage.characters = [];
        s.pc += 1;
        return null;
      case 'cg':
        if (!this.persistent.cg[cmd.id]) {
          this.persistent.cg[cmd.id] = true;
          this.unlockedCg.push(cmd.id);
        }
        if (!cmd.unlockOnly) s.stage.cg = cmd.id;
        s.pc += 1;
        return null;
      case 'closeCg':
        s.stage.cg = null;
        s.pc += 1;
        return null;
      case 'bgm':
        s.stage.bgm = cmd.id;
        s.pc += 1;
        return null;
      case 'se':
        this.se.push(cmd.id);
        s.pc += 1;
        return null;
      case 'effect':
        if (cmd.name === 'snow-on') s.stage.snow = true;
        if (cmd.name === 'snow-off') s.stage.snow = false;
        if (cmd.name === 'dark-on') s.stage.dark = true;
        if (cmd.name === 'dark-off') s.stage.dark = false;
        this.effects.push({ name: cmd.name, duration: cmd.duration });
        s.pc += 1;
        return null;
      case 'wait':
        this.effects.push({ name: 'pause', duration: cmd.ms });
        s.pc += 1;
        return null;
      case 'flag':
        if (cmd.set) this.setFlags(cmd.set);
        if (cmd.clear) for (const f of cmd.clear) delete s.flags[f];
        this.syncDerivedFlags();
        s.pc += 1;
        return null;
      case 'param':
        if (cmd.set)
          for (const [k, v] of Object.entries(cmd.set)) {
            if (v === undefined) continue;
            const key = k as keyof GameState['params'];
            s.params[key] = clampParam(key, v);
          }
        if (cmd.add) this.addParams(cmd.add);
        s.pc += 1;
        return null;
      case 'choice': {
        this.pendingChoice = cmd.options;
        const options: ResolvedOption[] = cmd.options
          .filter((o) => !o.showIf || evalCondition(o.showIf, this.ctx()))
          .map((o, i) => ({
            index: i,
            text: o.text,
            enabled: !o.enableIf || evalCondition(o.enableIf, this.ctx()),
            lockedNote: o.lockedNote,
            echoed:
              s.loop > 1 &&
              !!o.echo &&
              this.persistent.read[textKey(s.sceneId, s.pc, o.text)] === true,
          }));
        // 表示前に既読記録（選ばなかった選択肢も「見た」ことになる）
        for (const o of cmd.options)
          this.persistent.read[textKey(s.sceneId, s.pc, o.text)] = true;
        return { kind: 'choice', prompt: cmd.prompt, options };
      }
      case 'jump':
        this.goto(cmd.to);
        return null;
      case 'branch': {
        for (const c of cmd.cases) {
          if (evalCondition(c.cond, this.ctx())) {
            this.goto(c.to);
            return null;
          }
        }
        this.goto(cmd.else);
        return null;
      }
      case 'chapter':
        s.night = cmd.night;
        s.chapterTitle = cmd.title;
        s.chapterDate = cmd.date;
        s.viewpoint = cmd.viewpoint;
        this.chapterCard = {
          night: cmd.night,
          title: cmd.title,
          date: cmd.date,
          mood: cmd.moodTitle,
        };
        // 章を跨ぐたび、見ている者の輪郭が濃くなる。
        // 一周では 300 に届かず、周回を重ねて初めて届く配分（設計書 2-1 / 4）。
        this.addParams({ OBS: s.loop > 1 ? 20 : 8 });
        this.autosave = `第${cmd.night}夜 ${cmd.title}`;
        s.pc += 1;
        return null;
      case 'route':
        if (cmd.faction) s.faction = cmd.faction;
        if (cmd.route) s.route = cmd.route;
        s.pc += 1;
        return null;
      case 'autosave':
        this.autosave = cmd.label;
        s.pc += 1;
        return null;
      case 'breakFrame':
        s.stage.breakFrame = cmd.on;
        s.pc += 1;
        return null;
      case 'ending':
        s.pc += 1;
        this.recordEnding(cmd.id);
        return { kind: 'ending', id: cmd.id };
    }
  }

  private setExpression(speaker: SpeakerId, expression: string): void {
    const c = this.state.stage.characters.find((x) => x.id === speaker);
    if (c) c.expression = expression;
  }

  private recordEnding(id: string): void {
    const p = this.persistent;
    if (p.endings[id] === undefined) p.endings[id] = Date.now();
    if (id === 'TE-01') p.trueUnlocked = true;

    const achievements = SEAM_SOURCE_FLAGS.filter(
      (f) => this.state.flags[f] === true,
    );
    const rec: LoopRecord = {
      loop: this.state.loop,
      endingId: id,
      achievements,
      finishedAt: Date.now(),
    };
    // 同一周回の記録は上書きする（周回内で複数END到達＝ロード戻りの場合）。
    const idx = p.loopRecords.findIndex((r) => r.loop === rec.loop);
    if (idx >= 0) p.loopRecords[idx] = rec;
    else p.loopRecords.push(rec);

    p.obs = Math.max(p.obs, this.state.params.OBS);
    p.loopCount = Math.max(p.loopCount, this.state.loop + 1);
    this.hooks.onEnding?.(id, this.state);
  }

  /** デバッガ用：好感度上位。 */
  ranking(): { id: string; value: number }[] {
    return CHAR_IDS.map((id) => ({ id, value: this.state.params[id] })).sort(
      (a, b) => b.value - a.value,
    );
  }
}
