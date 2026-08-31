import { describe, it, expect } from 'vitest';
import { SCENES, START_SCENE, ALL_SCENES } from '@/scenario/index';
import { validateScenario, formatReport } from '@/engine/validator';
import { ENDINGS } from '@/data/endings';

describe('シナリオ検証（実装指示 29）', () => {
  const report = validateScenario(SCENES, START_SCENE);

  it('エラーがゼロである', () => {
    if (report.errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error(formatReport(report));
    }
    expect(report.errors).toHaveLength(0);
  });

  it('全22ENDが到達可能である', () => {
    expect(report.unreachableEndings).toEqual([]);
    expect(ENDINGS).toHaveLength(22);
  });

  it('到達不能シーンがない', () => {
    expect(report.unreachableScenes).toEqual([]);
  });

  it('シーン数が十分にある', () => {
    expect(ALL_SCENES.length).toBeGreaterThan(120);
  });
});
