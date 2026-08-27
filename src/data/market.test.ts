import { describe, expect, it } from 'vitest';
import {
  AUGUST_26_FIXTURE,
  averageSessionMove,
  getIndicativeRegularSession,
  marketBreadth,
  rangePosition,
  sessionMove,
} from './market';

describe('read-only market fixture', () => {
  it('keeps every displayed reference value inside its daily range', () => {
    for (const asset of AUGUST_26_FIXTURE.assets) {
      expect(asset.referencePrice).toBeGreaterThanOrEqual(asset.low);
      expect(asset.referencePrice).toBeLessThanOrEqual(asset.high);
      expect(rangePosition(asset)).toBeGreaterThanOrEqual(0);
      expect(rangePosition(asset)).toBeLessThanOrEqual(100);
    }
  });

  it('derives breadth and equal-weight movement from the fixture', () => {
    const computedBreadth = AUGUST_26_FIXTURE.assets.filter((asset) => asset.referencePrice > asset.open).length;
    const computedAverage = AUGUST_26_FIXTURE.assets.reduce((sum, asset) => sum + sessionMove(asset), 0) / AUGUST_26_FIXTURE.assets.length;
    expect(marketBreadth(AUGUST_26_FIXTURE.assets)).toBe(computedBreadth);
    expect(averageSessionMove(AUGUST_26_FIXTURE.assets)).toBeCloseTo(computedAverage, 8);
  });

  it('labels the weekday clock as an indicative window only', () => {
    expect(getIndicativeRegularSession(new Date('2026-08-26T14:00:00Z'))).toBe('regular window');
    expect(getIndicativeRegularSession(new Date('2026-08-29T14:00:00Z'))).toBe('weekend');
  });
});
