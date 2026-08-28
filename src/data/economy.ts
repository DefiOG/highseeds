import type { CustomerKey, DurationKey, PlotTierKey, Rarity } from '../types';

export const ACTIVATION_COST = 4_200;
export const PROTOCOL_FEE_ETH = 0.000001;
export const REF_RATE = 2;
export const WATER_COST_PER_STEP = 10;
export const WORKER_SHARE = 0.65;
export const OWNER_SHARE = 0.35;
export const EARLY_EXIT_SHARE = 0.8;
export const SEASON_LENGTH_DAYS = 42;

export const RARITIES: Record<Rarity, { multiplier: number; startingXp: number; color: string }> = {
  Common: { multiplier: 1, startingXp: 0, color: '#95a0a4' },
  Uncommon: { multiplier: 1.12, startingXp: 200, color: '#74c69d' },
  Rare: { multiplier: 1.25, startingXp: 600, color: '#4ea8de' },
  Epic: { multiplier: 1.4, startingXp: 1_500, color: '#a78bfa' },
  Legendary: { multiplier: 1.6, startingXp: 3_000, color: '#f2b84b' },
};

export const PLOT_TIERS: Record<PlotTierKey, {
  label: string;
  shortLabel: string;
  slots: number;
  yieldBonus: number;
  xpMultiplier: number;
  priceEth: number;
}> = {
  pot: { label: 'Pot', shortLabel: 'POT', slots: 1, yieldBonus: 1, xpMultiplier: 1, priceEth: 0.01 },
  closet: { label: 'Grow closet', shortLabel: 'CLOSET', slots: 2, yieldBonus: 1.03, xpMultiplier: 1.05, priceEth: 0.02 },
  room: { label: 'Grow room', shortLabel: 'ROOM', slots: 4, yieldBonus: 1.06, xpMultiplier: 1.1, priceEth: 0.035 },
  house: { label: 'Grow house', shortLabel: 'HOUSE', slots: 8, yieldBonus: 1.1, xpMultiplier: 1.15, priceEth: 0.06 },
  farm: { label: 'Commercial farm', shortLabel: 'FARM', slots: 36, yieldBonus: 1.15, xpMultiplier: 1.2, priceEth: 0.18 },
  mega: { label: 'Mega farm', shortLabel: 'MEGA', slots: 32, yieldBonus: 1.2, xpMultiplier: 1.25, priceEth: 0.2 },
};

export const ALPHA_PLOT_TIERS: PlotTierKey[] = ['pot', 'room', 'house', 'farm'];

export const DURATION_PRESETS: Record<DurationKey, { label: string; steps: number; maturityMultiplier: number }> = {
  '6h': { label: '6 hours', steps: 1, maturityMultiplier: 1 },
  '12h': { label: '12 hours', steps: 2, maturityMultiplier: 1.04 },
  '24h': { label: '24 hours', steps: 4, maturityMultiplier: 1.08 },
  '3d': { label: '3 days', steps: 12, maturityMultiplier: 1.15 },
  '7d': { label: '7 days', steps: 28, maturityMultiplier: 1.25 },
};

export interface Strain {
  id: string;
  name: string;
  thc: number;
  genetics: string;
  history: string;
  pedigreePremium: number;
  growModifier: number;
  playstyle: string;
}

export const STRAINS: Strain[] = [
  { id: 'bruce-banner-3', name: 'Bruce Banner #3', thc: 28.35, genetics: 'OG Kush × Strawberry Diesel', history: 'Lab-tested in Denver, 2013; a potency leader in the source roster.', pedigreePremium: 0.5, growModifier: 0.86, playstyle: 'Premium price · lower volume' },
  { id: 'strawberry-cough', name: 'Strawberry Cough', thc: 25.28, genetics: 'Strawberry Fields × Haze', history: 'Sativa-dominant legacy profile, lab-tested in Seattle, 2013.', pedigreePremium: 0.2, growModifier: 0.94, playstyle: 'Balanced contract specialist' },
  { id: 'og-kush', name: 'OG Kush', thc: 24.04, genetics: 'Disputed California lineage', history: 'A highly influential California classic in modern hybrid lineages.', pedigreePremium: 0.8, growModifier: 0.92, playstyle: 'High pedigree · steady demand' },
  { id: 'super-lemon-haze', name: 'Super Lemon Haze', thc: 22.64, genetics: 'Lemon Skunk × Super Silver Haze', history: 'Back-to-back Cannabis Cup champion in 2008 and 2009.', pedigreePremium: 0.8, growModifier: 0.97, playstyle: 'Crew-contract favorite' },
  { id: 'durban-poison', name: 'Durban Poison', thc: 22.43, genetics: 'South African landrace sativa', history: 'A legacy landrace profile with a long-established reputation.', pedigreePremium: 0.4, growModifier: 1.02, playstyle: 'Fast, reliable producer' },
  { id: 'sour-diesel', name: 'Sour Diesel', thc: 19.5, genetics: 'East Coast Chem lineage', history: 'An iconic fuel-profile classic, lab-tested in San Francisco, 2012.', pedigreePremium: 0.4, growModifier: 1.07, playstyle: 'Volume-forward street crop' },
  { id: 'northern-lights-5', name: 'Northern Lights #5', thc: 18.71, genetics: 'Afghani-derived indica', history: '1990 Cannabis Cup winner and parent of Super Silver Haze.', pedigreePremium: 0.8, growModifier: 1.05, playstyle: 'Reputation contract staple' },
  { id: 'granddaddy-purple', name: 'Granddaddy Purple', thc: 18.6, genetics: 'Old Mendocino purple lineage', history: 'A Northern California legacy profile with broad genetic influence.', pedigreePremium: 0.3, growModifier: 1.12, playstyle: 'High-volume bulk producer' },
  { id: 'super-silver-haze', name: 'Super Silver Haze', thc: 17.87, genetics: 'Haze × Northern Lights #5 × Skunk #1', history: 'Back-to-back Cannabis Cup champion in 1998 and 1999.', pedigreePremium: 0.8, growModifier: 1.08, playstyle: 'Long-term contract crop' },
  { id: 'blueberry', name: 'Blueberry', thc: 17.45, genetics: 'Eight-strain lineage by DJ Short', history: 'Award-winning, indica-dominant legacy strain from western Canada.', pedigreePremium: 0.5, growModifier: 1.18, playstyle: 'Highest volume · lower quote' },
];

export const CUSTOMERS: Record<CustomerKey, { label: string; priceMultiplier: number; color: string }> = {
  street: { label: 'Street window', priceMultiplier: 1.3, color: '#8df9b5' },
  regular: { label: 'Regular order', priceMultiplier: 1.08, color: '#6ee7df' },
  wholesaler: { label: 'Bulk contract', priceMultiplier: 0.88, color: '#f2bd63' },
  kingpin: { label: 'Crew contract', priceMultiplier: 0.72, color: '#a78bfa' },
};

export interface DemandContract {
  id: string;
  customer: CustomerKey;
  strainId: string;
  targetGrams: number;
  unitPrice: number;
  reputationReward: number;
  seasonXpReward: number;
  title: string;
  risk: 'Quick' | 'Precision' | 'Volume';
}

export function acceptedDeliveryAmount(requested: number, remaining: number, available: number) {
  if (![requested, remaining, available].every(Number.isFinite)) return 0;
  if (requested <= 0 || remaining <= 0 || available <= 0) return 0;
  if (Math.abs(requested * 10 - Math.round(requested * 10)) > 1e-7) return 0;
  if (requested > remaining || requested > available) return 0;
  return Math.round(requested * 10) / 10;
}

export function strainBasePrice(strain: Strain): number {
  const potency = (strain.thc - 17.45) / (28.35 - 17.45);
  return 10.1 + potency * 2.1 + strain.pedigreePremium;
}

export function customerPrice(strain: Strain, customer: CustomerKey): number {
  return strainBasePrice(strain) * CUSTOMERS[customer].priceMultiplier;
}

export function demandEpoch(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

export function getDailyContracts(now: number): DemandContract[] {
  const epoch = demandEpoch(now);
  const day = Math.floor(now / 86_400_000);
  const indexes = [day % STRAINS.length, (day + 3) % STRAINS.length, (day + 7) % STRAINS.length];
  const specs: Array<{ customer: CustomerKey; target: number; rep: number; xp: number; title: string; risk: DemandContract['risk'] }> = [
    { customer: 'street', target: 8, rep: 4, xp: 35, title: 'Opening-bell pickup', risk: 'Quick' },
    { customer: 'regular', target: 18, rep: 8, xp: 75, title: 'Repeat-client reserve', risk: 'Precision' },
    { customer: 'wholesaler', target: 42, rep: 15, xp: 140, title: 'Warehouse allocation', risk: 'Volume' },
  ];
  return specs.map((spec, index) => {
    const strain = STRAINS[indexes[index]];
    const urgency = index === 1 ? 1.08 : index === 2 ? 1.12 : 1;
    return {
      id: `${epoch}-${spec.customer}-${strain.id}`,
      customer: spec.customer,
      strainId: strain.id,
      targetGrams: spec.target,
      unitPrice: customerPrice(strain, spec.customer) * urgency,
      reputationReward: spec.rep,
      seasonXpReward: spec.xp,
      title: spec.title,
      risk: spec.risk,
    };
  });
}

export function currentSeason(now: number) {
  const anchor = Date.UTC(2026, 0, 1);
  const elapsed = Math.max(0, now - anchor);
  const season = Math.floor(elapsed / (SEASON_LENGTH_DAYS * 86_400_000));
  const startedAt = anchor + season * SEASON_LENGTH_DAYS * 86_400_000;
  return { id: `Season ${season + 1}`, day: Math.floor((now - startedAt) / 86_400_000) + 1, totalDays: SEASON_LENGTH_DAYS };
}
