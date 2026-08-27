export type MarketAssetCategory = 'US operator' | 'International operator' | 'REIT' | 'Sector ETF';

export type MarketAssetSnapshot = {
  symbol: string;
  name: string;
  category: MarketAssetCategory;
  referencePrice: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  averageVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  sourceUrl: string;
};

export type MarketSnapshot = {
  id: string;
  capturedAt: string;
  status: 'fixture';
  sourceLabel: string;
  assets: MarketAssetSnapshot[];
};

export interface MarketDataProvider {
  readonly mode: 'fixture' | 'licensed-delayed';
  getSnapshot(): Promise<MarketSnapshot>;
}

// Manually captured public reference values. This is intentionally static: a
// licensed provider can replace this adapter without touching the game engine.
export const AUGUST_26_FIXTURE: MarketSnapshot = {
  id: 'public-reference-2026-08-26',
  capturedAt: '2026-08-26T10:55:00-04:00',
  status: 'fixture',
  sourceLabel: 'Public market reference pages · manual fixture',
  assets: [
    {
      symbol: 'GTBIF',
      name: 'Green Thumb Industries',
      category: 'US operator',
      referencePrice: 7.67,
      open: 7.58,
      high: 7.67,
      low: 7.49,
      volume: 25_200,
      averageVolume: 292_550,
      fiftyTwoWeekHigh: 10.43,
      fiftyTwoWeekLow: 5.29,
      sourceUrl: 'https://robinhood.com/us/en/stocks/GTBIF/',
    },
    {
      symbol: 'CURLF',
      name: 'Curaleaf Holdings',
      category: 'US operator',
      referencePrice: 9.87,
      open: 9.85,
      high: 9.97,
      low: 9.02,
      volume: 22_910,
      averageVolume: 147_720,
      fiftyTwoWeekHigh: 15.15,
      fiftyTwoWeekLow: 5.4,
      sourceUrl: 'https://robinhood.com/us/en/stocks/CURLF/',
    },
    {
      symbol: 'TRLV',
      name: 'Trulieve Cannabis',
      category: 'US operator',
      referencePrice: 11.54,
      open: 11.39,
      high: 11.59,
      low: 11.13,
      volume: 167_870,
      averageVolume: 1_120_000,
      fiftyTwoWeekHigh: 13.28,
      fiftyTwoWeekLow: 4.62,
      sourceUrl: 'https://robinhood.com/us/en/stocks/TRLV/',
    },
    {
      symbol: 'TLRY',
      name: 'Tilray Brands',
      category: 'International operator',
      referencePrice: 4.82,
      open: 4.84,
      high: 4.86,
      low: 4.75,
      volume: 695_630,
      averageVolume: 3_530_000,
      fiftyTwoWeekHigh: 23.2,
      fiftyTwoWeekLow: 3.67,
      sourceUrl: 'https://robinhood.com/us/en/stocks/TLRY/',
    },
    {
      symbol: 'CGC',
      name: 'Canopy Growth',
      category: 'International operator',
      referencePrice: 1.06,
      open: 1.06,
      high: 1.07,
      low: 1.05,
      volume: 580_110,
      averageVolume: 5_210_000,
      fiftyTwoWeekHigh: 2.38,
      fiftyTwoWeekLow: 0.8435,
      sourceUrl: 'https://robinhood.com/us/en/stocks/CGC/',
    },
    {
      symbol: 'IIPR',
      name: 'Innovative Industrial Properties',
      category: 'REIT',
      referencePrice: 57.67,
      open: 56.91,
      high: 57.67,
      low: 56.75,
      volume: 472_810,
      averageVolume: 305_270,
      fiftyTwoWeekHigh: 65.38,
      fiftyTwoWeekLow: 44.58,
      sourceUrl: 'https://robinhood.com/us/en/stocks/IIPR/',
    },
    {
      symbol: 'MSOS',
      name: 'AdvisorShares Pure US Cannabis ETF',
      category: 'Sector ETF',
      referencePrice: 5,
      open: 4.92,
      high: 5,
      low: 4.84,
      volume: 732_540,
      averageVolume: 3_630_000,
      fiftyTwoWeekHigh: 7.25,
      fiftyTwoWeekLow: 2.96,
      sourceUrl: 'https://robinhood.com/us/en/stocks/MSOS/',
    },
  ],
};

export const fixtureMarketProvider: MarketDataProvider = {
  mode: 'fixture',
  async getSnapshot() {
    return AUGUST_26_FIXTURE;
  },
};

export function sessionMove(asset: MarketAssetSnapshot) {
  return asset.open === 0 ? 0 : ((asset.referencePrice - asset.open) / asset.open) * 100;
}

export function rangePosition(asset: MarketAssetSnapshot) {
  const width = asset.high - asset.low;
  if (width <= 0) return 50;
  return Math.min(100, Math.max(0, ((asset.referencePrice - asset.low) / width) * 100));
}

export function marketBreadth(assets: MarketAssetSnapshot[]) {
  return assets.filter((asset) => sessionMove(asset) > 0).length;
}

export function averageSessionMove(assets: MarketAssetSnapshot[]) {
  if (!assets.length) return 0;
  return assets.reduce((total, asset) => total + sessionMove(asset), 0) / assets.length;
}

export function getIndicativeRegularSession(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = value('weekday');
  const minuteOfDay = Number(value('hour')) * 60 + Number(value('minute'));

  if (weekday === 'Sat' || weekday === 'Sun') return 'weekend' as const;
  if (minuteOfDay < 9 * 60 + 30) return 'pre-market' as const;
  if (minuteOfDay < 16 * 60) return 'regular window' as const;
  return 'after-hours' as const;
}
