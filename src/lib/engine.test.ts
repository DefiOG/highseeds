import { describe, expect, it } from 'vitest';
import {
  acceptedDeliveryAmount,
  DURATION_PRESETS,
  getDailyContracts,
  PLOT_TIERS,
  RARITIES,
  STRAINS,
  WATER_COST_PER_STEP,
  WORKER_SHARE,
} from '../data/economy';
import type { AccessNft, Plot, Position } from '../types';
import { autoWaterReserve, getPositionMetrics, gramsPerStep, projectedMatureYield, xpBonus } from './engine';

const common: AccessNft = { tokenId: 1, rarity: 'Common', xp: 0, activated: true };
const rare: AccessNft = { tokenId: 2, rarity: 'Rare', xp: 600, activated: true };
const pot: Plot = { id: 1, tier: 'pot', owned: true, owner: 'You', reliability: 100 };
const room: Plot = { ...pot, id: 2, tier: 'room' };

function position(overrides: Partial<Position> = {}): Position {
  return {
    id: 'test-position',
    plotId: pot.id,
    nftId: common.tokenId,
    strainId: 'durban-poison',
    duration: '24h',
    mode: 'owner',
    startedAt: 0,
    snapshotXp: 0,
    waterLevel: 100,
    waterStep: 0,
    careSteps: [0],
    autoWater: true,
    autoWaterReserveHC: 40,
    ...overrides,
  };
}

describe('economy v2 formulas', () => {
  it('gives strains distinct production profiles', () => {
    const premium = gramsPerStep(common, pot, 'bruce-banner-3');
    const volume = gramsPerStep(common, pot, 'blueberry');
    expect(volume).toBeGreaterThan(premium);
    expect(premium).toBeCloseTo(2 * STRAINS[0].growModifier);
  });

  it('flattens long-term transferable output', () => {
    expect(DURATION_PRESETS['7d'].maturityMultiplier).toBe(1.25);
    expect(DURATION_PRESETS['24h'].maturityMultiplier).toBe(1.08);
    const shortDaily = projectedMatureYield(common, pot, 'durban-poison', '6h') * 4;
    const longDaily = projectedMatureYield(common, pot, 'durban-poison', '7d') / 7;
    expect(longDaily / shortDaily).toBeCloseTo(1.25);
  });

  it('conserves worker and owner production at an exact 65/35 split', () => {
    const metrics = getPositionMetrics(position({ mode: 'worker', duration: '6h' }), common, pot, 6 * 60 * 60 * 1_000);
    expect(WORKER_SHARE).toBe(0.65);
    expect(metrics.playerBase / metrics.grossBase).toBeCloseTo(0.65);
    expect(metrics.ownerBase / metrics.grossBase).toBeCloseTo(0.35);
    expect(metrics.playerBase + metrics.ownerBase).toBeCloseTo(metrics.grossBase);
  });

  it('keeps ownership output above work output for identical inputs', () => {
    const owner = projectedMatureYield(rare, room, 'og-kush', '24h', 'owner');
    const worker = projectedMatureYield(rare, room, 'og-kush', '24h', 'worker');
    expect(owner).toBeGreaterThan(worker);
    expect(worker / owner).toBeCloseTo(0.65);
  });

  it('never lets early exit exceed natural completion', () => {
    const metrics = getPositionMetrics(position(), common, pot, 4 * 6 * 60 * 60 * 1_000);
    expect(metrics.mature).toBe(true);
    expect(metrics.earlyExitPayout).toBeLessThan(metrics.playerMatured);
  });

  it('pre-funds exactly one water step per checkpoint', () => {
    expect(autoWaterReserve('7d')).toBe(DURATION_PRESETS['7d'].steps * WATER_COST_PER_STEP);
  });

  it('manual care improves future checkpoints without rewriting past production', () => {
    const beforeCare = getPositionMetrics(position({ duration: '3d', autoWater: false, autoWaterReserveHC: 0, careSteps: [0] }), common, pot, 4 * 6 * 60 * 60 * 1_000);
    const caredAtFour = getPositionMetrics(position({ duration: '3d', autoWater: false, autoWaterReserveHC: 0, careSteps: [0, 4] }), common, pot, 4 * 6 * 60 * 60 * 1_000);
    const nextWithoutCare = getPositionMetrics(position({ duration: '3d', autoWater: false, autoWaterReserveHC: 0, careSteps: [0] }), common, pot, 5 * 6 * 60 * 60 * 1_000);
    const nextWithCare = getPositionMetrics(position({ duration: '3d', autoWater: false, autoWaterReserveHC: 0, careSteps: [0, 4] }), common, pot, 5 * 6 * 60 * 60 * 1_000);
    expect(caredAtFour.grossBase).toBeCloseTo(beforeCare.grossBase);
    expect(nextWithCare.grossBase).toBeGreaterThan(nextWithoutCare.grossBase);
  });

  it('keeps rarity and XP power compressed', () => {
    expect(RARITIES.Legendary.multiplier).toBe(1.6);
    expect(PLOT_TIERS.mega.yieldBonus).toBe(1.2);
    expect(xpBonus(99_000)).toBeLessThanOrEqual(1.6);
  });

  it('caps the whale farm at 36 first-class positions', () => {
    expect(PLOT_TIERS.farm.slots).toBe(36);
    expect(Math.max(...Object.values(PLOT_TIERS).map((tier) => tier.slots))).toBe(36);
  });

  it('creates three finite, strain-specific daily contracts', () => {
    const contracts = getDailyContracts(Date.parse('2026-08-26T12:00:00Z'));
    expect(contracts).toHaveLength(3);
    expect(new Set(contracts.map((order) => order.id)).size).toBe(3);
    expect(new Set(contracts.map((order) => order.strainId)).size).toBe(3);
    expect(contracts.every((order) => order.targetGrams > 0)).toBe(true);
  });

  it('accepts only finite one-decimal deliveries within demand and inventory', () => {
    expect(acceptedDeliveryAmount(4.2, 8, 5)).toBe(4.2);
    expect(acceptedDeliveryAmount(Number.NaN, 8, 5)).toBe(0);
    expect(acceptedDeliveryAmount(Number.POSITIVE_INFINITY, 8, 5)).toBe(0);
    expect(acceptedDeliveryAmount(4.25, 8, 5)).toBe(0);
    expect(acceptedDeliveryAmount(6, 8, 5)).toBe(0);
    expect(acceptedDeliveryAmount(4, 3, 5)).toBe(0);
    expect(acceptedDeliveryAmount(-1, 8, 5)).toBe(0);
  });
});
