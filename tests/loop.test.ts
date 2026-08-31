import { describe, it, expect } from 'vitest';
import { play, preferChooser, type PlayResult } from './harness';
import { PATHS } from './paths';
import { createPersistentData, evaluateSeamStitch, SEAM_SOURCE_FLAGS } from '@/engine/state';
import type { PersistentData } from '@/engine/state';

/** 同じ persistent を使い回して周回する。 */
function loopThrough(p: PersistentData, prefs: string[]): PlayResult {
  return play(preferChooser(prefs), { persistent: p });
}

describe('Test 7: F20 は一周だけでは成立しない', () => {
  it('一周で HAPPY に到達しても SEAM_STITCH は立たない', () => {
    const p = createPersistentData();
    const r = loopThrough(p, PATHS['HE-LEN']);
    expect(r.ending).toBe('HE-LEN');
    // その周回で LENNY_WAKE は取れている
    expect(r.state.flags.LENNY_WAKE).toBe(true);
    // だが SEAM_STITCH は立たない
    expect(r.state.flags.SEAM_STITCH).toBeUndefined();
    const seam = evaluateSeamStitch(p.loopRecords, [], 1);
    expect(seam.satisfied).toBe(false);
  });

  it('単一周回で3種そろえても、周回が分かれていなければ成立しない', () => {
    const seam = evaluateSeamStitch(
      [],
      ['LENNY_WAKE', 'MUNI_SHARE', 'HYU_STORY'],
      1,
    );
    expect(seam.achieved).toHaveLength(3);
    // 達成が 1 周回に集中しているので不成立
    expect(seam.satisfied).toBe(false);
  });
});

describe('Test 8: 別周回で3種そろえると F20 が成立する', () => {
  it('3周して SEAM_STITCH が立つ', () => {
    const p = createPersistentData();
    const r1 = loopThrough(p, PATHS['HE-LEN']);
    expect(r1.ending).toBe('HE-LEN');
    const r2 = loopThrough(p, PATHS['HE-MUN']);
    expect(r2.ending).toBe('HE-MUN');
    const r3 = loopThrough(p, PATHS['HE-HYU']);
    // 三周目で HYU_STORY を取った時点で F20 が成立するため、
    // この周回の第十三夜は TRUE 側へ切り替わる（＝仕様どおりの上書き）。
    expect(r3.state.flags.HYU_STORY).toBe(true);
    expect(r3.state.flags.SEAM_STITCH).toBe(true);

    expect(p.loopRecords.map((x) => x.loop)).toEqual([1, 2, 3]);
    const seam = evaluateSeamStitch(p.loopRecords, [], 4);
    expect(seam.achieved.length).toBeGreaterThanOrEqual(3);
    expect(seam.satisfied).toBe(true);
    // 達成が複数の周回に分散していること
    const loops = new Set(
      p.loopRecords.filter((x) => x.achievements.length > 0).map((x) => x.loop),
    );
    expect(loops.size).toBeGreaterThanOrEqual(2);
  });

  it('SEAM_SOURCE_FLAGS は F14〜F19 の6種である', () => {
    expect(SEAM_SOURCE_FLAGS).toHaveLength(6);
  });
});

describe('Test 9/10: OBS と TRUE 選択肢', () => {
  it('OBS < 300 では TRUE 選択肢が選べない', () => {
    const p = createPersistentData();
    // 3周して F20 は成立させるが、OBS を意図的に 0 に抑える
    loopThrough(p, PATHS['HE-LEN']);
    loopThrough(p, PATHS['HE-MUN']);
    loopThrough(p, PATHS['HE-HYU']);
    p.obs = 0;

    let sawTrueChoiceEnabled = false;
    const r = play(
      (scene, options) => {
        if (scene === 't13_final_choice') {
          const stop = options.find((o) => o.text.includes('見るのをやめる'));
          if (stop?.enabled) sawTrueChoiceEnabled = true;
          const keep = options.findIndex((o) => o.text.includes('見続ける'));
          return keep >= 0 ? keep : 0;
        }
        return preferChooser(PATHS['HE-LEN'])(scene, options, {} as never);
      },
      { persistent: p, onStep: (e) => { e.state.params.OBS = 0; } },
    );
    expect(sawTrueChoiceEnabled).toBe(false);
    // OBS が足りないので TRUE の十三夜にも入らない
    expect(r.ending).not.toBe('TE-01');
  });

  it('OBS >= 300 かつ F20 成立で TRUE へ進める', () => {
    const p = createPersistentData();
    loopThrough(p, PATHS['HE-LEN']);
    loopThrough(p, PATHS['HE-MUN']);
    loopThrough(p, PATHS['HE-HYU']);
    // 4周目。周回で自然に積み上がった OBS を反映する
    p.obs = Math.max(p.obs, 300);

    const r = play(
      (scene, options, state) => {
        if (scene === 't13_final_choice') {
          const i = options.findIndex((o) => o.text.includes('見るのをやめる'));
          expect(options[i].enabled).toBe(true);
          return i;
        }
        return preferChooser(PATHS['HE-LEN'])(scene, options, state);
      },
      { persistent: p },
    );
    expect(r.error).toBeNull();
    expect(r.ending).toBe('TE-01');
    expect(p.trueUnlocked).toBe(true);
  });

  it('TRUE で「見続ける」を選ぶと BE-07 になる', () => {
    const p = createPersistentData();
    loopThrough(p, PATHS['HE-LEN']);
    loopThrough(p, PATHS['HE-MUN']);
    loopThrough(p, PATHS['HE-HYU']);
    p.obs = Math.max(p.obs, 300);
    const r = play(
      (scene, options, state) => {
        if (scene === 't13_final_choice') {
          return options.findIndex((o) => o.text.includes('見続ける'));
        }
        return preferChooser(PATHS['HE-LEN'])(scene, options, state);
      },
      { persistent: p },
    );
    expect(r.ending).toBe('BE-07');
  });

  it('OBS は周回を重ねると 300 に届く（1周では届かない）', () => {
    const p = createPersistentData();
    const r1 = loopThrough(p, PATHS['HE-MUN']);
    expect(r1.state.params.OBS).toBeLessThan(300);
    loopThrough(p, PATHS['HE-LEN']);
    const r3 = loopThrough(p, PATHS['HE-HYU']);
    expect(r3.state.params.OBS).toBeGreaterThanOrEqual(300);
  });
});

describe('Test 11/12: 強制バッド分岐', () => {
  it('MEM=0 で BE-03', () => {
    const r = play(preferChooser(PATHS['BE-03']));
    expect(r.ending).toBe('BE-03');
    expect(r.state.params.MEM).toBe(0);
  });

  it('NOX>=80 かつ陣営Bで BE-12', () => {
    const r = play(preferChooser(PATHS['BE-12']));
    expect(r.ending).toBe('BE-12');
    expect(r.state.params.NOX).toBeGreaterThanOrEqual(80);
    expect(r.state.faction).toBe('B');
    expect(r.state.flags.NOX_OVER).toBe(true);
  });

  it('NOX>=80 かつ陣営Cで BE-07', () => {
    const r = play(preferChooser(PATHS['BE-07']));
    expect(r.ending).toBe('BE-07');
    expect(r.state.params.NOX).toBeGreaterThanOrEqual(80);
    expect(r.state.faction).toBe('C');
  });
});
