import { describe, expect, it } from 'vitest';
import {
  CREW_DEMO_MEMBERS,
  CREW_PERSONAL_CAP_GRAMS,
  createCrewOperationState,
  crewAcceptedGrams,
  crewRewardEligible,
  crewTotalProgress,
  crewWeekWindow,
  simulatedCrewByStrain,
} from './crew';

const monday = Date.parse('2026-08-24T00:00:00Z');
const wednesday = Date.parse('2026-08-26T00:00:00Z');
const sunday = Date.parse('2026-08-30T23:59:59Z');

function simulatedTotal(now: number) {
  return Object.values(simulatedCrewByStrain(now)).reduce((sum, value) => sum + value, 0);
}

describe('weekly crew operation', () => {
  it('uses an exact Monday-to-Monday UTC window', () => {
    expect(crewWeekWindow(sunday).id).toBe('2026-08-24');
    expect(crewWeekWindow(Date.parse('2026-08-31T00:00:00Z')).id).toBe('2026-08-31');
  });

  it('advances the labeled local simulation without completing by itself', () => {
    expect(simulatedTotal(monday)).toBe(300);
    expect(simulatedTotal(wednesday)).toBe(350);
    expect(simulatedTotal(sunday)).toBe(450);
    expect(Math.ceil(simulatedTotal(sunday) / CREW_DEMO_MEMBERS.length)).toBeLessThanOrEqual(CREW_PERSONAL_CAP_GRAMS);
  });

  it('caps accepted inventory at the personal weekly remainder', () => {
    const operation = { ...createCrewOperationState('2026-08-24'), playerGrams: 90 };
    expect(crewAcceptedGrams(operation, monday, 'og-kush', 20, 50)).toBe(10);
  });

  it('accepts only the final crop-bay dust and subtracts no overflow', () => {
    const operation = {
      ...createCrewOperationState('2026-08-24'),
      playerGrams: 63,
      playerGramsByStrain: { 'og-kush': 63 },
    };
    expect(crewAcceptedGrams(operation, monday, 'og-kush', 20, 50)).toBe(7);
  });

  it('rejects malformed, non-requested, and subminimum contributions', () => {
    const operation = createCrewOperationState('2026-08-24');
    expect(crewAcceptedGrams(operation, monday, 'og-kush', Number.NaN, 50)).toBe(0);
    expect(crewAcceptedGrams(operation, monday, 'og-kush', Number.POSITIVE_INFINITY, 50)).toBe(0);
    expect(crewAcceptedGrams(operation, monday, 'not-requested', 10, 50)).toBe(0);
    expect(crewAcceptedGrams(operation, monday, 'og-kush', 4, 50)).toBe(0);
    expect(crewAcceptedGrams(operation, monday, 'og-kush', 5.55, 50)).toBe(0);
  });

  it('closes contributions and exposes exactly one reward after success', () => {
    const operation = {
      ...createCrewOperationState('2026-08-24'),
      playerGrams: 50,
      playerGramsByStrain: { 'og-kush': 22, 'sour-diesel': 22, blueberry: 6 },
    };
    expect(crewTotalProgress(operation, sunday)).toBe(500);
    expect(crewAcceptedGrams(operation, sunday, 'og-kush', 5, 50)).toBe(0);
    expect(crewRewardEligible(operation, sunday)).toBe(true);
    expect(crewRewardEligible({ ...operation, rewardClaimed: true }, sunday)).toBe(false);
  });
});
