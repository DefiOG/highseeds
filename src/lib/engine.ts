import {
  DURATION_PRESETS,
  EARLY_EXIT_SHARE,
  OWNER_SHARE,
  PLOT_TIERS,
  RARITIES,
  REF_RATE,
  STRAINS,
  WATER_COST_PER_STEP,
  WORKER_SHARE,
} from '../data/economy';
import { LOCK_STEP_MS } from './clock';
import { farmerLevel, XP_PER_CHECKPOINT, MAX_FARMER_XP } from '../data/farmerProgression';
import type { AccessNft, DurationKey, Plot, Position } from '../types';

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function xpBonus(xp: number) {
  return 1 + ((farmerLevel(xp) - 1) / 49) * 0.2;
}

export function elapsedSteps(position: Position, now: number) {
  const preset = DURATION_PRESETS[position.duration];
  return Math.min(preset.steps, Math.max(0, Math.floor((now - position.startedAt) / LOCK_STEP_MS)));
}

export function waterMultiplier(level: number, drySteps: number) {
  if (level >= 50) return 1;
  if (level > 0) return 0.55 + (level / 50) * 0.45;
  return drySteps >= 4 ? 0.25 : 0.5;
}

export function gramsPerStep(nft: AccessNft, plot: Plot, strainId: string, water = 100, drySteps = 0) {
  const tier = PLOT_TIERS[plot.tier];
  const rarity = RARITIES[nft.rarity];
  const strain = STRAINS.find((item) => item.id === strainId) ?? STRAINS[0];
  return REF_RATE * rarity.multiplier * xpBonus(nft.xp) * tier.yieldBonus * strain.growModifier * waterMultiplier(water, drySteps);
}

export function projectedMatureYield(nft: AccessNft, plot: Plot, strainId: string, duration: DurationKey, mode: Position['mode'] = 'owner') {
  const preset = DURATION_PRESETS[duration];
  const share = mode === 'worker' ? WORKER_SHARE : 1;
  return gramsPerStep(nft, plot, strainId) * preset.steps * preset.maturityMultiplier * share;
}

export function autoWaterReserve(duration: DurationKey) {
  return DURATION_PRESETS[duration].steps * WATER_COST_PER_STEP;
}

export interface PositionMetrics {
  completedSteps: number;
  totalSteps: number;
  grossBase: number;
  playerBase: number;
  ownerBase: number;
  playerMatured: number;
  ownerMatured: number;
  earlyExitPayout: number;
  xpEarned: number;
  mature: boolean;
  progress: number;
  nextStepAt: number;
  endsAt: number;
  waterLevel: number;
  health: 'healthy' | 'thirsty' | 'wilting' | 'failed';
  failed: boolean;
  rescueSteps: number;
}

export function getPositionMetrics(position: Position, nft: AccessNft, plot: Plot, now: number): PositionMetrics {
  const preset = DURATION_PRESETS[position.duration];
  const completedSteps = elapsedSteps(position, now);
  let grossBase = 0;

  for (let step = 1; step <= completedSteps; step += 1) {
    const latestCare = Math.max(0, ...position.careSteps.filter((checkpoint) => checkpoint <= step - 1));
    const stepsSinceCare = Math.max(0, step - 1 - latestCare);
    const level = position.autoWater ? 100 : clamp(position.waterLevel - stepsSinceCare * 25, 0, 100);
    const drySteps = level === 0 ? Math.max(0, stepsSinceCare - 4) : 0;
    grossBase += gramsPerStep({ ...nft, xp: position.snapshotXp }, plot, position.strainId, level, drySteps);
  }

  // Check every historical interval so watering cannot revive an already failed crop.
  let failed = false;
  for (let step = 1; step <= completedSteps; step++) {
    const last = Math.max(0, ...position.careSteps.filter(care => care < step));
    if (!position.autoWater && step - last >= 8) failed = true;
  }
  const sinceCare = completedSteps - Math.max(0, ...position.careSteps.filter(care => care <= completedSteps));
  const waterLevel = position.autoWater ? 100 : clamp(position.waterLevel - sinceCare * 25, 0, 100);
  const health = failed ? 'failed' : waterLevel === 0 ? 'wilting' : waterLevel < 50 ? 'thirsty' : 'healthy';
  if (failed) grossBase = 0;
  const worker = position.mode === 'worker';
  const playerBase = grossBase * (worker ? WORKER_SHARE : 1);
  const ownerBase = grossBase * (worker ? OWNER_SHARE : 0);
  const endsAt = position.startedAt + preset.steps * LOCK_STEP_MS;

  return {
    health, failed, rescueSteps: position.autoWater ? 8 : Math.max(0, 8 - sinceCare),
    completedSteps,
    totalSteps: preset.steps,
    grossBase,
    playerBase,
    ownerBase,
    playerMatured: playerBase * preset.maturityMultiplier,
    ownerMatured: ownerBase * preset.maturityMultiplier,
    earlyExitPayout: playerBase * EARLY_EXIT_SHARE,
    xpEarned: !failed && completedSteps >= preset.steps ? Math.max(0, Math.min(completedSteps * XP_PER_CHECKPOINT, MAX_FARMER_XP - nft.xp)) : 0,
    mature: completedSteps >= preset.steps,
    progress: clamp((now - position.startedAt) / (preset.steps * LOCK_STEP_MS), 0, 1),
    nextStepAt: position.startedAt + Math.min(completedSteps + 1, preset.steps) * LOCK_STEP_MS,
    endsAt,
    waterLevel,
  };
}

export function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
