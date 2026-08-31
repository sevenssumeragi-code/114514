import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '@/engine/interpreter';
import { SCENES } from '@/scenario/index';
import { createGameState, createPersistentData, type GameState } from '@/engine/state';
import { play, preferChooser } from './harness';
import { PATHS } from './paths';
import {
  loadPersistent, savePersistent, readSlot, writeSlot, eraseEverything,
  listSlots, nextAutoSlot, AUTO_SLOTS, QUICK_SLOT, MANUAL_SLOTS, ALL_SLOTS,
  loadConfig, saveConfig, defaultConfig, type SaveSlot,
} from '@/engine/save';
import { storage } from '@/engine/storage';

beforeEach(() => {
  eraseEverything();
});

function snapshot(e: Engine): GameState {
  return JSON.parse(JSON.stringify(e.state)) as GameState;
}

describe('Test 13: Save→Load で完全に状態復元される', () => {
  it('途中で保存して読み直しても、同じENDに到達する', () => {
    const persistent = createPersistentData();
    const prefs = PATHS['HE-NEO'];
    const chooser = preferChooser(prefs);

    // 1) 通しで最後まで
    const straight = play(chooser, { persistent: createPersistentData() });

    // 2) 途中（第九夜到達時点）でセーブ → 別エンジンでロードして続き
    const state = createGameState(persistent.loopCount, persistent.obs);
    const engine = new Engine(SCENES, state, persistent);
    let saved: GameState | null = null;
    for (let i = 0; i < 40000; i++) {
      const out = engine.step();
      if (engine.state.night >= 9 && saved === null) saved = snapshot(engine);
      if (out.halt.kind === 'choice') {
        engine.choose(chooser(engine.state.sceneId, out.halt.options, engine.state));
      }
      if (out.halt.kind === 'ending' || out.halt.kind === 'error') break;
    }
    expect(saved).not.toBeNull();

    const restored = JSON.parse(JSON.stringify(saved)) as GameState;
    const resumed = play(chooser, {
      persistent: createPersistentData(),
      startState: restored,
    });

    expect(resumed.error).toBeNull();
    expect(resumed.ending).toBe(straight.ending);
    expect(resumed.state.params.NEO).toBe(straight.state.params.NEO);
    expect(Object.keys(resumed.state.flags).sort()).toEqual(
      Object.keys(straight.state.flags).sort(),
    );
  });

  it('セーブスロットは丸ごと往復して同一になる', () => {
    const state = createGameState(1, 0);
    state.params.NEO = 63;
    state.flags.NEO_SCAR = true;
    state.stage.background = 'tunnel';
    state.stage.characters = [{ id: 'NEO', expression: 'cold', pos: 'center' }];

    const slot: SaveSlot = {
      id: 'm1', kind: 'manual', savedAt: 1700000000000,
      night: 10, chapterTitle: 'きろくされないくに', chapterDate: '12月22日',
      route: 'neo', faction: 'C', sceneId: 'r_neo_10', speakerName: 'ネオ',
      preview: '……何をしている。', background: 'tunnel', cg: null,
      playtimeMs: 1234567, label: 'テスト', state,
    };
    writeSlot(slot);
    const back = readSlot('m1');
    expect(back).not.toBeNull();
    expect(back).toEqual(slot);
    expect(back?.state.stage.characters[0].id).toBe('NEO');
  });

  it('スロットは 26 枠（オート5／クイック1／マニュアル20）', () => {
    expect(AUTO_SLOTS).toHaveLength(5);
    expect(MANUAL_SLOTS).toHaveLength(20);
    expect(ALL_SLOTS).toHaveLength(26);
    expect(listSlots()).toHaveLength(26);
  });

  it('オートセーブは空き→最古の順に使い回す', () => {
    const mk = (id: string, at: number): SaveSlot => ({
      id, kind: 'auto', savedAt: at, night: 1, chapterTitle: '', chapterDate: '',
      route: null, faction: null, sceneId: 'n1_open', speakerName: null,
      preview: '', background: 'black', cg: null, playtimeMs: 0, label: '',
      state: createGameState(1, 0),
    });
    expect(nextAutoSlot()).toBe('auto1');
    AUTO_SLOTS.forEach((id, i) => writeSlot(mk(id, 1000 + i)));
    expect(nextAutoSlot()).toBe('auto1'); // 最古
    writeSlot(mk('auto1', 9999));
    expect(nextAutoSlot()).toBe('auto2');
  });
});

describe('Test 14: New Game でも Persistent データは残る', () => {
  it('周回データ・OBS・到達END・CG・既読が引き継がれる', () => {
    const p = createPersistentData();
    const r1 = play(preferChooser(PATHS['HE-MUN']), { persistent: p });
    expect(r1.ending).toBe('HE-MUN');

    const obsAfter = p.obs;
    const endings = { ...p.endings };
    const cgCount = Object.keys(p.cg).length;
    const readCount = Object.keys(p.read).length;
    savePersistent(p);

    // New Game 相当：GameState だけ作り直す
    const fresh = createGameState(p.loopCount, p.obs);
    expect(fresh.loop).toBe(2);
    expect(fresh.params.OBS).toBe(obsAfter);
    expect(fresh.flags).toEqual({});
    expect(fresh.params.LEN).toBe(20);

    // persistent 側は無傷
    const reloaded = loadPersistent();
    expect(reloaded.endings).toEqual(endings);
    expect(Object.keys(reloaded.cg)).toHaveLength(cgCount);
    expect(Object.keys(reloaded.read)).toHaveLength(readCount);
    expect(reloaded.loopRecords).toHaveLength(1);
    expect(reloaded.obs).toBe(obsAfter);
  });

  it('CG解放は周回を越えて残る', () => {
    const p = createPersistentData();
    play(preferChooser(PATHS['HE-NEO']), { persistent: p });
    expect(p.cg['CG-39']).toBe(true);
    expect(p.cg['CG-50']).toBe(true);
    savePersistent(p);
    play(preferChooser(PATHS['HE-MUN']), { persistent: loadPersistent() });
    expect(loadPersistent().cg['CG-39']).toBe(true);
  });
});

describe('Test 15: 全データ削除ですべて初期化される', () => {
  it('スロット・周回データ・設定が消える', () => {
    const p = createPersistentData();
    play(preferChooser(PATHS['HE-MUN']), { persistent: p });
    savePersistent(p);
    saveConfig({ ...defaultConfig(), textSpeed: 12 });
    writeSlot({
      id: 'm2', kind: 'manual', savedAt: 1, night: 3, chapterTitle: 'x',
      chapterDate: 'y', route: null, faction: null, sceneId: 'n1_open',
      speakerName: null, preview: '', background: 'black', cg: null,
      playtimeMs: 0, label: '', state: createGameState(1, 0),
    });
    expect(readSlot('m2')).not.toBeNull();
    expect(loadPersistent().loopRecords).toHaveLength(1);

    eraseEverything();

    expect(readSlot('m2')).toBeNull();
    expect(readSlot(QUICK_SLOT)).toBeNull();
    const after = loadPersistent();
    expect(after.loopRecords).toHaveLength(0);
    expect(after.obs).toBe(0);
    expect(after.endings).toEqual({});
    expect(after.cg).toEqual({});
    expect(after.loopCount).toBe(1);
    expect(after.trueUnlocked).toBe(false);
    expect(loadConfig().textSpeed).toBe(defaultConfig().textSpeed);
    expect(storage.keys().filter((k) => k.startsWith('nightweaver.'))).toHaveLength(0);
  });
});
