import { storage } from './storage';
import {
  createPersistentData,
  PERSISTENT_VERSION,
  type GameState,
  type PersistentData,
} from './state';

export const KEY_PERSISTENT = 'nightweaver.persistent.v1';
export const KEY_SLOT = (id: string) => `nightweaver.slot.${id}`;
export const KEY_CONFIG = 'nightweaver.config.v1';

export const AUTO_SLOTS = ['auto1', 'auto2', 'auto3', 'auto4', 'auto5'];
export const QUICK_SLOT = 'quick';
export const MANUAL_SLOTS = Array.from({ length: 20 }, (_, i) => `m${i + 1}`);
export const ALL_SLOTS = [...AUTO_SLOTS, QUICK_SLOT, ...MANUAL_SLOTS];

export interface SaveSlot {
  id: string;
  kind: 'auto' | 'quick' | 'manual';
  savedAt: number;
  /** 表示用メタ。 */
  night: number;
  chapterTitle: string;
  chapterDate: string;
  route: string | null;
  faction: string | null;
  sceneId: string;
  speakerName: string | null;
  /** 表示テキストの冒頭。 */
  preview: string;
  /** サムネイル代わり：背景ID（素材が無くてもCSSで描ける）。 */
  background: string;
  cg: string | null;
  playtimeMs: number;
  label: string;
  /** 復元に必要な全て。 */
  state: GameState;
}

export function slotKind(id: string): SaveSlot['kind'] {
  if (AUTO_SLOTS.includes(id)) return 'auto';
  if (id === QUICK_SLOT) return 'quick';
  return 'manual';
}

export function loadPersistent(): PersistentData {
  const data = storage.getJSON<PersistentData | null>(KEY_PERSISTENT, null);
  if (!data || data.version !== PERSISTENT_VERSION) return createPersistentData();
  // 欠損フィールドの補修（バージョン差での破損を避ける）
  return { ...createPersistentData(), ...data };
}

export function savePersistent(p: PersistentData): void {
  storage.setJSON(KEY_PERSISTENT, p);
}

export function readSlot(id: string): SaveSlot | null {
  return storage.getJSON<SaveSlot | null>(KEY_SLOT(id), null);
}

export function writeSlot(slot: SaveSlot): void {
  storage.setJSON(KEY_SLOT(slot.id), slot);
}

export function clearSlot(id: string): void {
  storage.remove(KEY_SLOT(id));
}

export function listSlots(): (SaveSlot | null)[] {
  return ALL_SLOTS.map((id) => readSlot(id));
}

/** オートセーブは auto1..auto5 をリングバッファとして使う。 */
export function nextAutoSlot(): string {
  const slots = AUTO_SLOTS.map((id) => readSlot(id));
  const emptyIdx = slots.findIndex((s) => s === null);
  if (emptyIdx >= 0) return AUTO_SLOTS[emptyIdx];
  let oldest = 0;
  for (let i = 1; i < slots.length; i++) {
    if ((slots[i] as SaveSlot).savedAt < (slots[oldest] as SaveSlot).savedAt) oldest = i;
  }
  return AUTO_SLOTS[oldest];
}

/** 「全データ削除」からのみ呼ばれる完全初期化。New Game では絶対に呼ばない。 */
export function eraseEverything(): void {
  for (const id of ALL_SLOTS) clearSlot(id);
  storage.remove(KEY_PERSISTENT);
  storage.remove(KEY_CONFIG);
}

/* ------------------------------------------------------------------ */
/* CONFIG                                                             */
/* ------------------------------------------------------------------ */

export interface GameConfig {
  textSpeed: number; // 0(瞬時)〜100
  autoWait: number; // ms
  skipUnread: boolean; // 既定は false = 既読のみ高速スキップ
  masterVolume: number;
  bgmVolume: number;
  seVolume: number;
  voiceVolume: number;
  fullscreenHint: boolean;
  effectsReduced: boolean;
}

export function defaultConfig(): GameConfig {
  return {
    textSpeed: 55,
    autoWait: 1400,
    skipUnread: false,
    masterVolume: 0.8,
    bgmVolume: 0.7,
    seVolume: 0.8,
    voiceVolume: 0.8,
    fullscreenHint: true,
    effectsReduced: false,
  };
}

export function loadConfig(): GameConfig {
  return { ...defaultConfig(), ...storage.getJSON<Partial<GameConfig>>(KEY_CONFIG, {}) };
}

export function saveConfig(c: GameConfig): void {
  storage.setJSON(KEY_CONFIG, c);
}
