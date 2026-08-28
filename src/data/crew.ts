import type { CrewOperationState } from '../types';
import { FAST_TIME_ENABLED } from '../lib/clock';

const DAY_MS = 86_400_000;

export const CREW_TARGET_GRAMS = 500;
export const CREW_PERSONAL_CAP_GRAMS = 100;
export const CREW_QUALIFIER_GRAMS = 10;
export const CREW_MIN_CONTRIBUTION_GRAMS = 5;
export const CREW_COMPLETION_SXP = 100;
export const CREW_COMPLETION_REPUTATION = 10;
export const CREW_SEAL_ID = 'crew-operation-seal-alpha';

export const CREW_BINS = [
  { strainId: 'og-kush', targetGrams: 170, simulatedStart: 100, simulatedDaily: 8 },
  { strainId: 'sour-diesel', targetGrams: 165, simulatedStart: 95, simulatedDaily: 8 },
  { strainId: 'blueberry', targetGrams: 165, simulatedStart: 105, simulatedDaily: 9 },
] as const;

export const CREW_MILESTONES = [
  { percent: 25, label: 'Operation opened', detail: 'Requested crops verified' },
  { percent: 50, label: 'Sampler assembled', detail: 'All three bays active' },
  { percent: 75, label: 'Loading secured', detail: 'Seal preview revealed' },
  { percent: 100, label: 'Weekly objective', detail: '+100 SXP · +10 reputation · crew seal' },
] as const;

export const CREW_DEMO_MEMBERS = [
  { id: 'rook', name: 'Rook', role: 'Scout', contribution: 0 },
  { id: 'nova', name: 'Nova', role: 'Quartermaster', contribution: 0 },
  { id: 'moss', name: 'Moss', role: 'Cultivator', contribution: 0 },
  { id: 'echo', name: 'Echo', role: 'Archivist', contribution: 0 },
  { id: 'iris', name: 'Iris', role: 'Coordinator', contribution: 0 },
] as const;

export function crewWeekWindow(now: number) {
  const date = new Date(now);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - daysSinceMonday * DAY_MS;
  const end = start + 7 * DAY_MS;
  return { id: new Date(start).toISOString().slice(0, 10), start, end };
}

export function createCrewOperationState(weekId: string): CrewOperationState {
  return {
    weekId,
    playerGrams: 0,
    playerGramsByStrain: {},
    contributions: [],
    rewardClaimed: false,
  };
}

export function activeCrewOperation(operation: CrewOperationState, now: number) {
  const week = crewWeekWindow(now);
  return operation.weekId === week.id ? operation : createCrewOperationState(week.id);
}

export function simulatedCrewByStrain(now: number, accelerated = FAST_TIME_ENABLED) {
  if (accelerated) {
    return {
      'og-kush': 165,
      'sour-diesel': 160,
      blueberry: 165,
    };
  }
  const week = crewWeekWindow(now);
  const elapsedDays = Math.min(6, Math.max(0, Math.floor((now - week.start) / DAY_MS)));
  return Object.fromEntries(CREW_BINS.map((bin) => [
    bin.strainId,
    Math.min(bin.targetGrams, bin.simulatedStart + elapsedDays * bin.simulatedDaily),
  ]));
}

export function crewBinProgress(operation: CrewOperationState, now: number) {
  const current = activeCrewOperation(operation, now);
  const simulated = simulatedCrewByStrain(now);
  return CREW_BINS.map((bin) => {
    const player = current.playerGramsByStrain[bin.strainId] ?? 0;
    const filled = Math.min(bin.targetGrams, simulated[bin.strainId] + player);
    return { ...bin, simulated: simulated[bin.strainId], player, filled, remaining: Math.max(0, bin.targetGrams - filled) };
  });
}

export function crewTotalProgress(operation: CrewOperationState, now: number) {
  return crewBinProgress(operation, now).reduce((sum, bin) => sum + bin.filled, 0);
}

export function crewAcceptedGrams(
  operation: CrewOperationState,
  now: number,
  strainId: string,
  requested: number,
  inventoryAvailable: number,
) {
  if (!Number.isFinite(requested) || !Number.isFinite(inventoryAvailable) || requested <= 0 || inventoryAvailable <= 0) return 0;
  if (Math.abs(requested * 10 - Math.round(requested * 10)) > 1e-7) return 0;
  const current = activeCrewOperation(operation, now);
  const bin = crewBinProgress(current, now).find((item) => item.strainId === strainId);
  if (!bin || bin.remaining <= 0) return 0;
  const capRemaining = Math.max(0, CREW_PERSONAL_CAP_GRAMS - current.playerGrams);
  const accepted = Math.min(requested, inventoryAvailable, capRemaining, bin.remaining);
  const fillsDust = Math.abs(accepted - bin.remaining) < 1e-7 || Math.abs(accepted - capRemaining) < 1e-7;
  if (accepted < CREW_MIN_CONTRIBUTION_GRAMS && !fillsDust) return 0;
  return Math.round(accepted * 10) / 10;
}

export function crewRewardEligible(operation: CrewOperationState, now: number) {
  const current = activeCrewOperation(operation, now);
  return crewTotalProgress(current, now) >= CREW_TARGET_GRAMS
    && current.playerGrams >= CREW_QUALIFIER_GRAMS
    && !current.rewardClaimed;
}
