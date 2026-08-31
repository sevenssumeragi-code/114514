import { describe, it, expect } from 'vitest';
import { play, preferChooser } from './harness';
import { PATHS, chooserFor } from './paths';
import { HAPPY_IDS, BAD_IDS, NORMAL_IDS } from '@/data/endings';

describe('Test 1-3: 三陣営すべてに到達できる', () => {
  const cases: [string, string, string[]][] = [
    ['陣営A 守る', 'A', PATHS['HE-MUN']],
    ['陣営B 暴く', 'B', PATHS['HE-GER']],
    ['陣営C 壊す', 'C', PATHS['HE-NEO']],
  ];
  for (const [name, faction, prefs] of cases) {
    it(name, () => {
      const r = play(preferChooser(prefs));
      expect(r.error).toBeNull();
      expect(r.state.faction).toBe(faction);
    });
  }
});

describe('Test 4: 6つの HAPPY END すべてに到達できる', () => {
  for (const id of HAPPY_IDS) {
    it(id, () => {
      const r = play(chooserFor(id));
      expect(r.error).toBeNull();
      expect(r.ending).toBe(id);
      // HAPPY 条件（好感度70以上・NOX70未満）が実際に満たされていること
      expect(r.state.params.NOX).toBeLessThan(70);
    });
  }
});

describe('Test 5: 12の BAD END すべてに到達できる', () => {
  for (const id of BAD_IDS) {
    it(id, () => {
      const r = play(chooserFor(id));
      expect(r.error).toBeNull();
      expect(r.ending).toBe(id);
    });
  }
});

describe('Test 6: NORMAL END に到達できる', () => {
  for (const id of NORMAL_IDS) {
    it(id, () => {
      const r = play(chooserFor(id));
      expect(r.error).toBeNull();
      expect(r.ending).toBe(id);
    });
  }
});
