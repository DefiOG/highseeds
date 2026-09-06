import { describe, expect, it } from 'vitest';
import { ACCESS_CATALOG } from './accessCatalog';
import { COLLECTION_STRAINS, STRAINS, getNftStrain, nftCanPlantStrain, getDailyContracts, strainBasePrice } from './economy';
import { getPositionMetrics, projectedMatureYield } from '../lib/engine';
import { LOCK_STEP_MS } from '../lib/clock';
import type { Plot, Position } from '../types';

const plot: Plot = { id: 1, tier: 'pot', owned: true, owner: 'You', reliability: 100 };

describe('collection gameplay integration', () => {
  it('settles a funded mature crop for each of the 420 NFT identities', () => {
    expect(COLLECTION_STRAINS).toHaveLength(420);
    expect(new Set(COLLECTION_STRAINS.map((s) => s.id)).size).toBe(420);
    for (const entry of ACCESS_CATALOG) {
      const strain = getNftStrain(entry.id)!;
      expect(strain.id).toBe(entry.slug);
      expect(strain.name).toBe(entry.name);
      expect(nftCanPlantStrain(entry.id, entry.slug)).toBe(true);
      expect(nftCanPlantStrain(entry.id, 'unknown')).toBe(false);
      expect(strainBasePrice(strain)).toBeGreaterThanOrEqual(10.1);
      expect(strainBasePrice(strain)).toBeLessThanOrEqual(13);
      const nft = { tokenId: entry.id, rarity: entry.rarity, xp: 0, activated: true };
      const position: Position = { id: 'test', plotId: 1, nftId: entry.id, strainId: strain.id,
        duration: '24h', mode: 'owner', startedAt: 0, snapshotXp: 0, waterLevel: 100,
        waterStep: 0, careSteps: [0], autoWater: true, autoWaterReserveHC: 40 };
      const result = getPositionMetrics(position, nft, plot, 4 * LOCK_STEP_MS);
      expect(result.mature).toBe(true);
      expect(result.playerMatured).toBeCloseTo(projectedMatureYield(nft, plot, strain.id, '24h'));
      expect(projectedMatureYield(nft, plot, strain.id, '24h')).toBeGreaterThan(0);
    }
    expect(getNftStrain(0)).toBeUndefined();
    expect(getNftStrain(421)).toBeUndefined();
  });

  it('preserves the retired crop profile for existing saves without adding an NFT', () => {
    expect(STRAINS.find((s) => s.id === 'bruce-banner-3')?.growModifier).toBe(0.86);
    expect(COLLECTION_STRAINS.some((s) => s.id === 'bruce-banner-3')).toBe(false);
  });

  it('offers reachable finite demand even for a single NFT and preserves caps across roster changes', () => {
    const now = Date.UTC(2026, 8, 5);
    const orders = getDailyContracts(now, [420]);
    expect(orders).toHaveLength(3);
    expect(orders.every((o) => o.strainId === getNftStrain(420)?.id)).toBe(true);
    expect(orders.reduce((sum, o) => sum + o.targetGrams, 0)).toBe(68);
    expect(getDailyContracts(now, [1, 420]).map((o) => o.id)).toEqual(orders.map((o) => o.id));
    expect(getDailyContracts(now, [420, 1, 1])).toEqual(getDailyContracts(now, [1, 420]));
    expect(getDailyContracts(now, [])).toEqual([]);
  });
});
