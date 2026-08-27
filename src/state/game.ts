import { useEffect, useMemo, useState } from 'react';
import { STRAINS } from '../data/economy';
import { createCrewOperationState, crewWeekWindow } from '../data/crew';
import type { ActivityItem, GameState } from '../types';

const STORAGE_KEY = 'loud-ledger-simulation-v2';

const starterState: GameState = {
  walletConnected: false,
  address: '0x71C4a39E6200F541b6307D95a98f781eAD8E4D2a',
  ethBalance: 0.28642,
  hcBalance: 12_850,
  nfts: [
    { tokenId: 1042, rarity: 'Rare', xp: 600, activated: true },
    { tokenId: 2117, rarity: 'Uncommon', xp: 200, activated: false },
    { tokenId: 3028, rarity: 'Common', xp: 0, activated: false },
  ],
  plots: [
    { id: 4318, tier: 'room', owned: true, owner: 'You', reliability: 98 },
    { id: 5891, tier: 'pot', owned: true, owner: 'You', reliability: 94 },
  ],
  positions: [],
  grams: {
    [STRAINS[2].id]: 12.4,
    [STRAINS[5].id]: 6.8,
  },
  reputation: 0,
  seasonXp: 0,
  orderFills: {},
  crewOperation: createCrewOperationState(crewWeekWindow(Date.now()).id),
  crewLifetimeContribution: 0,
  crewCosmetics: [],
  crewStreak: 0,
  networkOwnerGrams: 0,
  tutorialComplete: false,
  activity: [{
    id: 'welcome-v2',
    at: Date.now(),
    title: 'New season initialized',
    detail: '24/7 positions, finite demand, fair work splits, and bounded progression are active.',
    kind: 'info',
  }],
};

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<GameState> & { crewContribution?: number };
      const weekId = crewWeekWindow(Date.now()).id;
      return {
        ...structuredClone(starterState),
        ...parsed,
        grams: { ...starterState.grams, ...parsed.grams },
        orderFills: { ...parsed.orderFills },
        positions: (parsed.positions ?? []).map((position) => ({ ...position, careSteps: position.careSteps ?? [0] })),
        plots: parsed.plots ?? starterState.plots,
        crewOperation: parsed.crewOperation?.weekId === weekId
          ? { ...createCrewOperationState(weekId), ...parsed.crewOperation }
          : createCrewOperationState(weekId),
        crewLifetimeContribution: parsed.crewLifetimeContribution ?? parsed.crewContribution ?? 0,
        crewCosmetics: parsed.crewCosmetics ?? [],
        crewStreak: parsed.crewStreak ?? 0,
      };
    }
  } catch {
    // Fall through to the deterministic v2 state.
  }
  return structuredClone(starterState);
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addActivity = (title: string, detail: string, kind: ActivityItem['kind'] = 'success') => {
    const item: ActivityItem = { id: `${Date.now()}-${Math.random()}`, at: Date.now(), title, detail, kind };
    setState((current) => ({ ...current, activity: [item, ...current.activity].slice(0, 30) }));
  };

  return useMemo(() => ({ state, setState, addActivity }), [state]);
}

export function resetSimulation() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}
