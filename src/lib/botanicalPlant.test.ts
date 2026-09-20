import { describe, expect, it } from 'vitest';
import { botanicalFrame } from './botanicalPlant';
import { GROWTH_MILESTONES } from './plantGrowth';

describe('botanical artwork timeline', () => {
  it('aligns all thirteen named stages with their sprite and grows between them', () => {
    GROWTH_MILESTONES.forEach((stage, index) => expect(botanicalFrame(stage.at).index).toBe(index));
    expect(botanicalFrame(.55).height).toBeLessThan(botanicalFrame(.56).height);
    expect(botanicalFrame(.55).blend).toBeGreaterThan(0);
  });
  it('keeps frames and opacity bounded at invalid or overdue times', () => {
    for (const progress of [-1, NaN, 0, .2, .99, 1, 1.12, 20]) {
      const frame = botanicalFrame(progress);
      expect(frame.index).toBeGreaterThanOrEqual(0);
      expect(frame.next).toBeLessThanOrEqual(12);
      expect(frame.blend).toBeGreaterThanOrEqual(0);
      expect(frame.blend).toBeLessThanOrEqual(1);
      expect(Number.isFinite(frame.height)).toBe(true);
    }
  });
});
