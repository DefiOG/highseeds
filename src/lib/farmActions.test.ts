import { getPositionMetrics } from './engine';
import { describe, expect, it } from 'vitest';
import { getAccessCatalogEntry } from '../data/accessCatalog';
import { getNftStrain, PROTOCOL_FEE_ETH } from '../data/economy';
import { createCrewOperationState } from '../data/crew';
import type { GameState, Position } from '../types';
import { LOCK_STEP_MS } from './clock';
import { harvestPosition, plantPosition, settleMatureCrops } from './farmActions';
import { farmSlots } from './farmWorld';

function initial(): GameState {
  return {
    walletConnected: true, address: 'demo', ethBalance: 1, hcBalance: 1000,
    nfts: [1, 420].map((id) => ({ tokenId: id, rarity: getAccessCatalogEntry(id)!.rarity, xp: 0, activated: true })),
    plots: [{ id: 1, tier: 'room', owned: true, owner: 'You', reliability: 100 }],
    positions: [], grams: {}, reputation: 0, seasonXp: 0, orderFills: {},
    crewOperation: createCrewOperationState('2026-09-05'), crewLifetimeContribution: 0,
    crewCosmetics: [], crewStreak: 0, networkOwnerGrams: 0, tutorialComplete: false, activity: [],
  };
}
function crop(tokenId = 1, slotIndex = 0): Position {
  return { id: `crop-${tokenId}`, plotId: 1, slotIndex, nftId: tokenId, strainId: getNftStrain(tokenId)!.id, duration: '24h', mode: 'owner', startedAt: 0, snapshotXp: 0, waterLevel: 100, waterStep: 0, careSteps: [0], autoWater: true, autoWaterReserveHC: 40 };
}

describe('farm action settlement', () => {
  it('plants, restores saved state, harvests exactly once and releases the NFT and its bed', () => {
    const state = initial();
    const planted = plantPosition(state, crop(), state.plots[0]);
    expect(planted.hcBalance).toBe(960);
    expect(planted.ethBalance).toBeCloseTo(1 - PROTOCOL_FEE_ETH);
    const restored = JSON.parse(JSON.stringify(planted)) as GameState;
    const harvested = harvestPosition(restored, 'crop-1', 4 * LOCK_STEP_MS);
    expect(harvested.positions).toHaveLength(0);
    expect(harvested.grams[getNftStrain(1)!.id]).toBeGreaterThan(0);
    expect(harvested.nfts[0].xp).toBe(200);
    expect(harvested.farmMilestones).toEqual({ planted: true, harvested: true });
    expect(harvestPosition(harvested, 'crop-1', 5 * LOCK_STEP_MS)).toBe(harvested);
    expect(plantPosition(harvested, { ...crop(), id: 'next-crop' }, state.plots[0]).positions).toHaveLength(1);
  });

  it('rejects double planting, wrong NFT strains, occupied beds and insufficient reserves', () => {
    const state = initial();
    const planted = plantPosition(state, crop(), state.plots[0]);
    expect(plantPosition(planted, { ...crop(), id: 'duplicate', slotIndex: 1 }, state.plots[0])).toBe(planted);
    expect(plantPosition(planted, crop(420, 0), state.plots[0])).toBe(planted);
    expect(plantPosition(state, { ...crop(), strainId: getNftStrain(420)!.id }, state.plots[0])).toBe(state);
    const poor = { ...state, hcBalance: 39 };
    expect(plantPosition(poor, crop(), state.plots[0])).toBe(poor);
  });

  it('keeps other beds stationary and refunds only unused irrigation on early harvest', () => {
    const state = initial();
    const first = plantPosition(state, crop(), state.plots[0]);
    const both = plantPosition(first, crop(420, 3), state.plots[0]);
    const harvested = harvestPosition(both, 'crop-1', LOCK_STEP_MS);
    expect(harvested.hcBalance).toBe(950);
    expect(harvested.farmMilestones?.harvested).toBeFalsy();
    const beds = farmSlots(harvested);
    expect(beds[0].position).toBeUndefined();
    expect(beds[3].position?.nftId).toBe(420);
    expect(harvested.positions).toHaveLength(1);
  });
  it('automatically settles overdue crops once on return and supports opting out', () => {
    const state = initial();
    const planted = plantPosition(state, crop(), state.plots[0]);
    expect(settleMatureCrops(planted, LOCK_STEP_MS)).toBe(planted);
    const automatic = settleMatureCrops(planted, 4 * LOCK_STEP_MS);
    expect(automatic.positions).toHaveLength(0);
    expect(automatic.hcBalance).toBe(1060);
    expect(automatic.lifetimeHarvestHC).toBe(100);
    expect(automatic.ethBalance).toBe(planted.ethBalance);
    expect(automatic.nfts[0].xp).toBe(200);
    expect(settleMatureCrops(automatic, 20 * LOCK_STEP_MS)).toBe(automatic);
    const manual = { ...planted, autoHarvest: false };
    expect(settleMatureCrops(manual, 20 * LOCK_STEP_MS)).toBe(manual);
  });

});


describe('neglected crop lifecycle', () => {
  const manual = (): Position => ({ ...crop(), duration: '3d', autoWater: false, autoWaterReserveHC: 0 });
  it('warns, allows rescue before 48 hours, and prevents resurrection after failure', () => {
    const s = initial(), p = manual();
    const metrics = (position: Position, steps: number) => getPositionMetrics(position, s.nfts[0], s.plots[0], steps * LOCK_STEP_MS);
    expect(metrics(p, 3).health).toBe('thirsty');
    expect(metrics(p, 4).health).toBe('wilting');
    expect(metrics(p, 7).failed).toBe(false);
    expect(metrics(p, 8).failed).toBe(true);
    expect(metrics({...p, careSteps:[0,7]}, 8).failed).toBe(false);
    expect(metrics({...p, careSteps:[0,8]}, 9).failed).toBe(true);
  });
  it('failure releases the farmer without removing earned XP or granting any rewards', () => {
    const s = initial(); s.nfts[0].xp = 750; s.positions = [manual()];
    const result = settleMatureCrops(s, 8 * LOCK_STEP_MS);
    expect(result.positions).toHaveLength(0);
    expect(result.nfts[0].xp).toBe(750);
    expect(result.hcBalance).toBe(s.hcBalance);
    expect(result.seasonXp).toBe(s.seasonXp);
    expect(result.grams[manual().strainId]).toBe(0);
    expect(settleMatureCrops(result, 12 * LOCK_STEP_MS)).toEqual(result);
  });
  it('protects irrigated crops and never spoils short crops after maturity', () => {
    const s = initial();
    expect(getPositionMetrics({...manual(),autoWater:true},s.nfts[0],s.plots[0],30*LOCK_STEP_MS).failed).toBe(false);
    expect(getPositionMetrics({...manual(),duration:'24h'},s.nfts[0],s.plots[0],30*LOCK_STEP_MS).failed).toBe(false);
  });
});
