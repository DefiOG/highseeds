import catalogJson from './catalog_420_v2.json';
import manifestJson from './catalog_manifest.json';
import type { Rarity } from '../types';

export const ACCESS_COLLECTION_SIZE = 420 as const;
export const ACCESS_RARITY_ORDER: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

export type SeedPattern = 'tiger' | 'mottled' | 'webbed' | 'solid' | 'heavycap';
export type SeedColor = 'charcoal' | 'espresso' | 'chestnut' | 'sandy' | 'slategray' | 'taupe' | 'mahogany' | 'rust' | 'olivetan';
export type SeedTexture = 'glossy' | 'matte';
export type SeedShape = 'oval' | 'plump' | 'elongated' | 'teardrop';

export interface AccessCatalogEntry {
  id: number;
  name: string;
  family: string;
  yield_band: 'low' | 'medium' | 'high';
  popularity_rank: number;
  popularity_score: number;
  thc_min: number;
  thc_max: number;
  thc_mid: number;
  thc_score: number;
  value_tier: 'commodity' | 'standard' | 'premium' | 'exotic';
  value_score: number;
  rarity_score: number;
  rarity: Rarity;
  rarity_rank: number;
  seed_pattern: SeedPattern;
  seed_base_color: SeedColor;
  seed_texture: SeedTexture;
  seed_shape: SeedShape;
  type: 'indica' | 'sativa' | 'hybrid';
  render_seed_key: string;
  slug: string;
  is_pheno?: boolean;
  data_provenance: {
    thc: string;
    popularity: string;
    yield: string;
    value: string;
  };
}

export interface AccessCatalogManifest {
  catalog_version: string;
  total_strains: number;
  status: string;
  intended_use: string;
  rarity_tiers: Record<Rarity, number>;
  known_limitations: string[];
}

export const ACCESS_CATALOG = catalogJson as AccessCatalogEntry[];
export const ACCESS_CATALOG_MANIFEST = manifestJson as AccessCatalogManifest;

const catalogById = new Map(ACCESS_CATALOG.map((entry) => [entry.id, entry]));

if (ACCESS_CATALOG.length !== ACCESS_COLLECTION_SIZE || catalogById.size !== ACCESS_COLLECTION_SIZE) {
  throw new Error(`Access catalog must contain ${ACCESS_COLLECTION_SIZE} unique Genesis identities.`);
}

export function getAccessCatalogEntry(tokenId: number) {
  return catalogById.get(tokenId);
}

export function availableAccessCatalog(ownedTokenIds: Iterable<number>) {
  const owned = new Set(ownedTokenIds);
  return ACCESS_CATALOG.filter((entry) => !owned.has(entry.id));
}

export function pickSimulatedAccessMint(ownedTokenIds: Iterable<number>, randomValue = Math.random()) {
  const available = availableAccessCatalog(ownedTokenIds);
  if (!available.length) return undefined;
  const normalizedRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999999999) : 0;
  return available[Math.floor(normalizedRandom * available.length)];
}

export function accessRarityCount(rarity: Rarity) {
  return ACCESS_CATALOG_MANIFEST.rarity_tiers[rarity];
}

export function formatCatalogLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
