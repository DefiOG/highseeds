import { describe, expect, it } from 'vitest';
import { ACCESS_CATALOG, ACCESS_CATALOG_MANIFEST, ACCESS_COLLECTION_SIZE, getAccessCatalogEntry } from './accessCatalog';

describe('420-token Access catalog', () => {
  it('contains one complete identity for every Genesis token id', () => {
    expect(ACCESS_CATALOG).toHaveLength(ACCESS_COLLECTION_SIZE);
    expect(new Set(ACCESS_CATALOG.map((entry) => entry.id)).size).toBe(ACCESS_COLLECTION_SIZE);
    expect(new Set(ACCESS_CATALOG.map((entry) => entry.name)).size).toBe(ACCESS_COLLECTION_SIZE);
    expect(new Set(ACCESS_CATALOG.map((entry) => entry.slug)).size).toBe(ACCESS_COLLECTION_SIZE);
    expect(ACCESS_CATALOG.every((entry) => entry.id >= 1 && entry.id <= ACCESS_COLLECTION_SIZE)).toBe(true);
  });

  it('matches the disclosed five-tier rarity distribution', () => {
    const counts = Object.fromEntries(
      Object.keys(ACCESS_CATALOG_MANIFEST.rarity_tiers).map((rarity) => [
        rarity,
        ACCESS_CATALOG.filter((entry) => entry.rarity === rarity).length,
      ]),
    );
    expect(counts).toEqual(ACCESS_CATALOG_MANIFEST.rarity_tiers);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(ACCESS_COLLECTION_SIZE);
  });

  it('keeps generated catalog claims explicitly labeled', () => {
    expect(ACCESS_CATALOG_MANIFEST.status).toContain('generated gameplay estimate');
    expect(ACCESS_CATALOG.every((entry) => Object.values(entry.data_provenance).every((label) => label.includes('generated_estimate')))).toBe(true);
  });

  it('maps token ids directly to catalog identities', () => {
    expect(getAccessCatalogEntry(1)?.name).toBe('Runtz');
    expect(getAccessCatalogEntry(420)?.id).toBe(420);
    expect(getAccessCatalogEntry(421)).toBeUndefined();
  });
});
