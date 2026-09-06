import { describe, expect, it } from 'vitest';
import { farmerLevel, MAX_FARMER_XP, maturityReward } from './farmerProgression';
import { farmerAppearance } from '../lib/farmerArt';
import { xpBonus } from '../lib/engine';

describe('farmer identity and progression', () => {
  it('renders a different base appearance for all 420 Genesis IDs', () => {
    const appearances = Array.from({ length: 420 }, (_, i) => JSON.stringify(farmerAppearance(i + 1)));
    expect(new Set(appearances).size).toBe(420);
  });
  it('unlocks levels at exact XP boundaries and caps the production bonus', () => {
    expect(farmerLevel(0)).toBe(1);
    expect(farmerLevel(249)).toBe(1);
    expect(farmerLevel(250)).toBe(2);
    expect(farmerLevel(MAX_FARMER_XP)).toBe(50);
    expect(farmerLevel(1_000_000)).toBe(50);
    expect(xpBonus(1_000_000)).toBeCloseTo(1.2);
  });
  it('awards nothing before maturity and only the remaining XP at the cap', () => {
    expect(maturityReward(28, false, 0)).toEqual({ xp: 0, hc: 0 });
    expect(maturityReward(28, true, 0)).toEqual({ xp: 1400, hc: 700 });
    expect(maturityReward(4, true, MAX_FARMER_XP - 10)).toEqual({ xp: 10, hc: 100 });
    expect(maturityReward(4, true, MAX_FARMER_XP)).toEqual({ xp: 0, hc: 100 });
  });
});
