import { describe, expect, it } from 'vitest';
import { GROWTH_MILESTONES, growthMilestone, plantMarks, visualGrowth } from './plantGrowth';

describe('living plant progression', () => {
  it('reaches every milestone at its boundary without advancing early', () => {
    GROWTH_MILESTONES.forEach((stage, index) => {
      expect(growthMilestone(stage.at)).toBe(stage);
      if (index) expect(growthMilestone(stage.at - .00001)).toBe(GROWTH_MILESTONES[index - 1]);
    });
  });
  it('derives elapsed growth across reloads, maturity and late flower', () => {
    expect(visualGrowth(1000, 2000, 1500)).toBe(.5);
    expect(visualGrowth(1000, 2000, 2000)).toBe(1);
    expect(growthMilestone(visualGrowth(1000, 2000, 2120)).name).toBe('Late flower');
    expect(visualGrowth(1000, 2000, 900)).toBe(0);
    expect(visualGrowth(1000, 2000, 9000)).toBe(1.3);
    expect(visualGrowth(1000, 2000, 2120, true, .6)).toBe(.6);
  });
  it('preserves identity while growing continuously inside a milestone', () => {
    const base = { seed: 42, progress: .55, water: 100 };
    expect(plantMarks(base)).toEqual(plantMarks(base));
    expect(growthMilestone(.55)).toBe(growthMilestone(.56));
    expect(plantMarks(base)).not.toEqual(plantMarks({ ...base, progress: .56 }));
    expect(plantMarks(base)).not.toEqual(plantMarks({ ...base, seed: 43 }));
    expect(plantMarks(base)).not.toEqual(plantMarks({ ...base, water: 0 }));
    expect(plantMarks(base)).not.toEqual(plantMarks({ ...base, failed: true }));
  });
  it('produces finite geometry and valid opacity throughout the lifecycle', () => {
    for (const seed of [1, 42, 420]) for (let tick = 0; tick <= 130; tick++) {
      for (const mark of plantMarks({ seed, progress: tick / 100 })) {
        expect(mark.d).not.toMatch(/NaN|Infinity/);
        expect(mark.opacity).toBeGreaterThanOrEqual(0);
        expect(mark.opacity).toBeLessThanOrEqual(1);
      }
    }
  });
});
