export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type PlotTierKey = 'pot' | 'closet' | 'room' | 'house' | 'farm' | 'mega';
export type DurationKey = '6h' | '12h' | '24h' | '3d' | '7d';
export type CustomerKey = 'street' | 'regular' | 'wholesaler' | 'kingpin';
export type PositionMode = 'owner' | 'worker';

export interface AccessNft {
  tokenId: number;
  rarity: Rarity;
  xp: number;
  activated: boolean;
}

export interface Position {
  id: string;
  plotId: number;
  nftId: number;
  strainId: string;
  duration: DurationKey;
  mode: PositionMode;
  startedAt: number;
  snapshotXp: number;
  waterLevel: number;
  waterStep: number;
  careSteps: number[];
  autoWater: boolean;
  autoWaterReserveHC: number;
}

export interface Plot {
  id: number;
  tier: PlotTierKey;
  owned: boolean;
  owner: string;
  reliability: number;
}

export interface ActivityItem {
  id: string;
  at: number;
  title: string;
  detail: string;
  kind: 'success' | 'info' | 'warning';
}

export interface CrewContribution {
  id: string;
  strainId: string;
  grams: number;
  createdAt: number;
}

export interface CrewOperationState {
  weekId: string;
  playerGrams: number;
  playerGramsByStrain: Record<string, number>;
  contributions: CrewContribution[];
  rewardClaimed: boolean;
}

export interface GameState {
  walletConnected: boolean;
  address: string;
  ethBalance: number;
  hcBalance: number;
  nfts: AccessNft[];
  plots: Plot[];
  positions: Position[];
  grams: Record<string, number>;
  reputation: number;
  seasonXp: number;
  orderFills: Record<string, number>;
  crewOperation: CrewOperationState;
  crewLifetimeContribution: number;
  crewCosmetics: string[];
  crewStreak: number;
  networkOwnerGrams: number;
  tutorialComplete: boolean;
  activity: ActivityItem[];
}

export interface ToastState {
  id: number;
  title: string;
  body: string;
  kind: 'success' | 'info' | 'warning';
}
