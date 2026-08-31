import { Engine, type Halt, type StagedEffect, type TextEntry, type ResolvedOption } from '@/engine/interpreter';
import { SCENES } from '@/scenario/index';
import {
  createGameState,
  createPersistentData,
  type GameState,
  type PersistentData,
  type StageState,
  initialStage,
} from '@/engine/state';
import {
  loadPersistent, savePersistent, loadConfig, saveConfig, eraseEverything,
  readSlot, writeSlot, clearSlot, nextAutoSlot, slotKind, listSlots,
  QUICK_SLOT, ALL_SLOTS, type GameConfig, type SaveSlot,
} from '@/engine/save';
import { audio } from './audio';
import { DISPLAY_NAME } from '@/engine/interpreter';

export type Screen =
  | 'title'
  | 'game'
  | 'config'
  | 'save'
  | 'load'
  | 'gallery'
  | 'endlist'
  | 'ending'
  | 'erase';

export interface ChapterCard {
  night: number;
  title: string;
  date: string;
  mood?: string;
}

export interface UiState {
  screen: Screen;
  /** タイトル等から戻る先。 */
  returnTo: Screen;
  stage: StageState;
  current: TextEntry | null;
  choices: ResolvedOption[] | null;
  choicePrompt?: string;
  backlog: TextEntry[];
  showBacklog: boolean;
  hideWindow: boolean;
  auto: boolean;
  skip: boolean;
  effects: StagedEffect[];
  chapterCard: ChapterCard | null;
  endingId: string | null;
  error: string | null;
  /** 章・ルートの表示用。 */
  night: number;
  chapterTitle: string;
  route: string | null;
  faction: string | null;
  loop: number;
  /** デバッグパネル表示。 */
  debug: boolean;
  /** タイピング完了済みか（クリックで全文表示のため）。 */
  typingDone: boolean;
  inGame: boolean;
}

type Listener = () => void;

const BACKLOG_MAX = 300;

export class GameStore {
  private listeners = new Set<Listener>();
  private engine: Engine | null = null;
  persistent: PersistentData;
  config: GameConfig;
  ui: UiState;

  private autoTimer: number | null = null;
  private skipTimer: number | null = null;
  private playStart = 0;

  constructor() {
    this.persistent = loadPersistent();
    this.config = loadConfig();
    audio.setConfig(this.config);
    this.ui = {
      screen: 'title',
      returnTo: 'title',
      stage: initialStage(),
      current: null,
      choices: null,
      backlog: [],
      showBacklog: false,
      hideWindow: false,
      auto: false,
      skip: false,
      effects: [],
      chapterCard: null,
      endingId: null,
      error: null,
      night: 0,
      chapterTitle: '',
      route: null,
      faction: null,
      loop: this.persistent.loopCount,
      debug: false,
      typingDone: false,
      inGame: false,
    };
  }

  /* ---------------- subscription ---------------- */

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): UiState => this.ui;

  private emit(patch: Partial<UiState> = {}): void {
    this.ui = { ...this.ui, ...patch };
    for (const l of this.listeners) l();
  }

  /* ---------------- config ---------------- */

  setConfig(patch: Partial<GameConfig>): void {
    this.config = { ...this.config, ...patch };
    saveConfig(this.config);
    audio.setConfig(this.config);
    this.emit();
  }

  /* ---------------- screens ---------------- */

  goto(screen: Screen): void {
    audio.ui('ui_select');
    const returnTo = this.ui.inGame ? 'game' : 'title';
    this.emit({ screen, returnTo });
  }

  back(): void {
    audio.ui('ui_back');
    this.emit({ screen: this.ui.returnTo, showBacklog: false });
  }

  toggleDebug(): void {
    this.emit({ debug: !this.ui.debug });
  }

  toggleBacklog(): void {
    this.emit({ showBacklog: !this.ui.showBacklog });
  }

  toggleHideWindow(): void {
    this.emit({ hideWindow: !this.ui.hideWindow });
  }

  /* ---------------- game lifecycle ---------------- */

  /**
   * New Game。周回データ（PersistentData）は絶対に消さない。
   * 完全初期化は eraseAll() からのみ。
   */
  newGame(): void {
    this.stopTimers();
    const state = createGameState(this.persistent.loopCount, this.persistent.obs);
    this.engine = new Engine(SCENES, state, this.persistent, {
      onEnding: () => savePersistent(this.persistent),
    });
    this.playStart = Date.now();
    this.emit({
      screen: 'game',
      inGame: true,
      backlog: [],
      current: null,
      choices: null,
      endingId: null,
      error: null,
      stage: initialStage(),
      loop: state.loop,
      auto: false,
      skip: false,
    });
    this.step();
  }

  /** 全データ削除。ここだけが周回データを消してよい。 */
  eraseAll(): void {
    eraseEverything();
    this.persistent = createPersistentData();
    this.config = loadConfig();
    this.engine = null;
    audio.stopBgm();
    this.emit({
      screen: 'title',
      inGame: false,
      loop: this.persistent.loopCount,
      backlog: [],
      current: null,
      choices: null,
      stage: initialStage(),
    });
  }

  returnToTitle(): void {
    this.stopTimers();
    this.flushPlaytime();
    this.engine = null;
    audio.stopBgm();
    this.emit({
      screen: 'title',
      inGame: false,
      current: null,
      choices: null,
      endingId: null,
      stage: initialStage(),
      loop: this.persistent.loopCount,
    });
  }

  private flushPlaytime(): void {
    if (!this.engine || !this.playStart) return;
    const delta = Date.now() - this.playStart;
    this.engine.state.playtimeMs += delta;
    this.persistent.totalPlaytimeMs += delta;
    this.playStart = Date.now();
    savePersistent(this.persistent);
  }

  /* ---------------- advancing ---------------- */

  private applyOutput(out: ReturnType<Engine['step']>): void {
    for (const s of out.se) audio.playSe(s);
    if (out.unlockedCg.length) savePersistent(this.persistent);

    const st = this.engine as Engine;
    audio.playBgm(st.state.stage.bgm);

    const patch: Partial<UiState> = {
      stage: { ...st.state.stage, characters: [...st.state.stage.characters] },
      effects: out.effects,
      night: st.state.night,
      chapterTitle: st.state.chapterTitle,
      route: st.state.route,
      faction: st.state.faction,
      loop: st.state.loop,
    };

    if (out.chapterCard) patch.chapterCard = out.chapterCard;

    const halt: Halt = out.halt;
    if (halt.kind === 'text') {
      patch.current = halt.entry;
      patch.choices = null;
      patch.typingDone = this.config.textSpeed >= 100;
      const bl = [...this.ui.backlog, halt.entry];
      patch.backlog = bl.length > BACKLOG_MAX ? bl.slice(bl.length - BACKLOG_MAX) : bl;
    } else if (halt.kind === 'choice') {
      patch.choices = halt.options;
      patch.choicePrompt = halt.prompt;
      patch.typingDone = true;
      this.stopTimers();
      patch.auto = false;
      patch.skip = false;
    } else if (halt.kind === 'ending') {
      this.stopTimers();
      this.flushPlaytime();
      savePersistent(this.persistent);
      patch.endingId = halt.id;
      patch.screen = 'ending';
      patch.auto = false;
      patch.skip = false;
    } else {
      patch.error = halt.message;
      console.error('[engine]', halt.message);
    }

    this.emit(patch);

    if (out.autosave) this.autosave(out.autosave);
  }

  step(): void {
    if (!this.engine) return;
    const out = this.engine.step();
    this.applyOutput(out);
    this.scheduleAuto();
  }

  /** クリック／タップ／決定キー。 */
  advance(): void {
    if (!this.engine) return;
    if (this.ui.choices) return;
    if (this.ui.showBacklog) return;
    if (!this.ui.typingDone) {
      // 一回目のクリックは全文表示
      this.emit({ typingDone: true });
      return;
    }
    this.step();
  }

  markTypingDone(): void {
    if (!this.ui.typingDone) this.emit({ typingDone: true });
  }

  choose(index: number): void {
    if (!this.engine || !this.ui.choices) return;
    const opt = this.ui.choices[index];
    if (!opt || !opt.enabled) return;
    audio.ui('ui_select');
    this.autosaveBeforeChoice();
    this.engine.choose(opt.index);
    this.emit({ choices: null });
    this.step();
  }

  /* ---------------- auto / skip ---------------- */

  private stopTimers(): void {
    if (this.autoTimer !== null) clearTimeout(this.autoTimer);
    if (this.skipTimer !== null) clearTimeout(this.skipTimer);
    this.autoTimer = null;
    this.skipTimer = null;
  }

  private scheduleAuto(): void {
    this.stopTimers();
    if (this.ui.skip) {
      const entry = this.ui.current;
      // 既読のみ高速スキップ（既定）。未読で skipUnread が false なら止める。
      if (entry && !entry.isRead && !this.config.skipUnread) {
        this.emit({ skip: false });
        return;
      }
      this.skipTimer = window.setTimeout(() => this.step(), 16);
      return;
    }
    if (this.ui.auto) {
      const len = this.ui.current?.text.length ?? 0;
      const wait = this.config.autoWait + len * 28;
      this.autoTimer = window.setTimeout(() => {
        this.emit({ typingDone: true });
        this.step();
      }, wait);
    }
  }

  toggleAuto(): void {
    const auto = !this.ui.auto;
    this.emit({ auto, skip: false, typingDone: auto ? true : this.ui.typingDone });
    this.scheduleAuto();
  }

  toggleSkip(): void {
    const skip = !this.ui.skip;
    this.emit({ skip, auto: false, typingDone: true });
    this.scheduleAuto();
  }

  /* ---------------- save / load ---------------- */

  private buildSlot(id: string, label: string): SaveSlot | null {
    if (!this.engine) return null;
    this.flushPlaytime();
    const s = this.engine.state;
    const cur = this.ui.current;
    return {
      id,
      kind: slotKind(id),
      savedAt: Date.now(),
      night: s.night,
      chapterTitle: s.chapterTitle,
      chapterDate: s.chapterDate,
      route: s.route,
      faction: s.faction,
      sceneId: s.sceneId,
      speakerName: cur?.name ?? (cur ? DISPLAY_NAME[cur.speaker] ?? null : null),
      preview: (cur?.text ?? '').replace(/<[^>]+>/g, '').slice(0, 42),
      background: s.stage.background,
      cg: s.stage.cg,
      playtimeMs: s.playtimeMs,
      label,
      state: JSON.parse(JSON.stringify(s)) as GameState,
    };
  }

  save(id: string, label?: string): void {
    const slot = this.buildSlot(id, label ?? `第${this.ui.night}夜 ${this.ui.chapterTitle}`);
    if (!slot) return;
    writeSlot(slot);
    audio.ui('ui_select');
    this.emit();
  }

  quickSave(): void {
    this.save(QUICK_SLOT, 'クイックセーブ');
  }

  private autosave(label: string): void {
    const slot = this.buildSlot(nextAutoSlot(), label);
    if (!slot) return;
    writeSlot(slot);
  }

  private autosaveBeforeChoice(): void {
    const slot = this.buildSlot(nextAutoSlot(), `選択の直前：第${this.ui.night}夜`);
    if (!slot) return;
    writeSlot(slot);
  }

  load(id: string): boolean {
    const slot = readSlot(id);
    if (!slot) return false;
    this.stopTimers();
    const state = JSON.parse(JSON.stringify(slot.state)) as GameState;
    this.engine = new Engine(SCENES, state, this.persistent, {
      onEnding: () => savePersistent(this.persistent),
    });
    this.playStart = Date.now();
    this.emit({
      screen: 'game',
      inGame: true,
      current: null,
      choices: null,
      endingId: null,
      error: null,
      backlog: [],
      auto: false,
      skip: false,
      stage: { ...state.stage, characters: [...state.stage.characters] },
      night: state.night,
      chapterTitle: state.chapterTitle,
      route: state.route,
      faction: state.faction,
      loop: state.loop,
    });
    audio.playBgm(state.stage.bgm);
    this.step();
    return true;
  }

  quickLoad(): void {
    this.load(QUICK_SLOT);
  }

  deleteSlot(id: string): void {
    clearSlot(id);
    audio.ui('ui_back');
    this.emit();
  }

  slots(): (SaveSlot | null)[] {
    return listSlots();
  }

  hasContinue(): boolean {
    return ALL_SLOTS.some((id) => readSlot(id) !== null);
  }

  continueGame(): void {
    const slots = listSlots().filter((s): s is SaveSlot => s !== null);
    if (slots.length === 0) return;
    slots.sort((a, b) => b.savedAt - a.savedAt);
    this.load(slots[0].id);
  }

  /* ---------------- ending ---------------- */

  finishEnding(): void {
    // 周回を進める。OBS と到達記録は persistent に残っている。
    savePersistent(this.persistent);
    this.returnToTitle();
  }

  /* ---------------- debug ---------------- */

  debugState(): GameState | null {
    return this.engine?.state ?? null;
  }

  debugJump(sceneId: string): void {
    if (!this.engine) {
      this.newGame();
    }
    const e = this.engine as Engine;
    e.state.sceneId = sceneId;
    e.state.pc = 0;
    this.emit({ screen: 'game', inGame: true, choices: null });
    this.step();
  }

  debugSetParam(key: string, value: number): void {
    if (!this.engine) return;
    const params = this.engine.state.params as Record<string, number>;
    if (params[key] === undefined) return;
    params[key] = value;
    this.emit();
  }

  debugSetFlag(flag: string, on: boolean): void {
    if (!this.engine) return;
    if (on) this.engine.state.flags[flag] = true;
    else delete this.engine.state.flags[flag];
    this.emit();
  }
}

export const store = new GameStore();
