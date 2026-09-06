import { DURATION_PRESETS, nftCanPlantStrain, PLOT_TIERS, PROTOCOL_FEE_ETH, STRAINS, WATER_COST_PER_STEP } from '../data/economy';
import type { GameState, Plot, Position } from '../types';
import { autoWaterReserve, formatNumber, getPositionMetrics } from './engine';
import { farmSlots } from './farmWorld';
import { maturityReward, MAX_FARMER_XP } from '../data/farmerProgression';

/** Revalidate against the live state when a planting confirmation is accepted. */
export function plantPosition(state: GameState, position: Position, requestedPlot: Plot): GameState {
  const nft = state.nfts.find((item) => item.tokenId === position.nftId);
  const plot = state.plots.find((item) => item.id === requestedPlot.id) ?? requestedPlot;
  if (!state.walletConnected || !nft?.activated || !nftCanPlantStrain(nft.tokenId, position.strainId)) return state;
  if (state.positions.some((item) => item.id === position.id || item.nftId === nft.tokenId)) return state;
  if (!DURATION_PRESETS[position.duration] || !PLOT_TIERS[plot.tier] || plot.id !== position.plotId) return state;
  if (position.mode === 'owner' && (!plot.owned || !state.plots.some((item) => item.id === plot.id))) return state;
  if (position.mode === 'worker' && plot.owned) return state;
  if (state.positions.filter((item) => item.plotId === plot.id).length >= PLOT_TIERS[plot.tier].slots) return state;
  const reserve = position.autoWater ? autoWaterReserve(position.duration) : 0;
  if (state.ethBalance < PROTOCOL_FEE_ETH || state.hcBalance < reserve || reserve !== position.autoWaterReserveHC) return state;
  if (position.mode === 'owner' && !farmSlots(state).some((slot) => slot.plot.id === plot.id && slot.number - 1 === position.slotIndex && !slot.position)) return state;
  const strain = STRAINS.find((item) => item.id === position.strainId)!;
  return {
    ...state,
    ethBalance: state.ethBalance - PROTOCOL_FEE_ETH,
    hcBalance: state.hcBalance - reserve,
    plots: state.plots.some((item) => item.id === plot.id) ? state.plots : [...state.plots, plot],
    positions: [...state.positions, { ...position, snapshotXp: nft.xp }],
    farmMilestones: { ...state.farmMilestones, planted: true },
    activity: [{ id: `plant-${position.id}`, at: position.startedAt, title: `${strain.name} ${position.mode === 'worker' ? 'work' : 'grow'} opened`, detail: `${DURATION_PRESETS[position.duration].label} · plot #${plot.id} · ${position.mode === 'worker' ? '65% worker / 35% owner' : '100% operator'}.`, kind: 'success' }, ...state.activity].slice(0, 30) as GameState['activity'],
  };
}

/** Harvest by id so repeated confirmation can never settle the same crop twice. */
export function harvestPosition(state: GameState, positionId: string, now: number, automatic = false): GameState {
  const position = state.positions.find((item) => item.id === positionId);
  const fee = automatic ? 0 : PROTOCOL_FEE_ETH;
  if (!position || state.ethBalance < fee) return state;
  const plot = state.plots.find((item) => item.id === position.plotId);
  const nft = state.nfts.find((item) => item.tokenId === position.nftId);
  const strain = STRAINS.find((item) => item.id === position.strainId);
  if (!plot || !nft || !strain) return state;
  const metrics = getPositionMetrics(position, nft, plot, now);
  if (automatic && !metrics.mature && !metrics.failed) return state;
  const reward = maturityReward(metrics.totalSteps, metrics.mature && !metrics.failed, nft.xp);
  const payout = metrics.mature ? metrics.playerMatured : metrics.earlyExitPayout;
  const ownerPayout = metrics.mature ? metrics.ownerMatured : metrics.ownerBase;
  const usedWater = position.autoWater ? metrics.completedSteps * WATER_COST_PER_STEP : 0;
  const refund = Math.max(0, position.autoWaterReserveHC - usedWater);
  return {
    ...state,
    ethBalance: state.ethBalance - fee,
    hcBalance: state.hcBalance + refund + reward.hc,
    lifetimeHarvestHC: (state.lifetimeHarvestHC ?? 0) + reward.hc,
    grams: { ...state.grams, [strain.id]: (state.grams[strain.id] ?? 0) + payout },
    reputation: state.reputation + (metrics.mature && !metrics.failed ? 3 : 0),
    seasonXp: state.seasonXp + (metrics.mature && !metrics.failed ? 25 : 0),
    networkOwnerGrams: state.networkOwnerGrams + ownerPayout,
    nfts: state.nfts.map((item) => item.tokenId === nft.tokenId ? { ...item, xp: Math.min(MAX_FARMER_XP, item.xp + reward.xp) } : item),
    positions: state.positions.filter((item) => item.id !== position.id),
    farmMilestones: { ...state.farmMilestones, harvested: state.farmMilestones?.harvested || (metrics.mature && !metrics.failed) },
    activity: [{ id: `harvest-${position.id}`, at: now, title: metrics.failed ? 'Failed crop cleared' : metrics.mature ? `${formatNumber(payout)}g harvested${automatic ? ' automatically' : ''}` : `${formatNumber(payout)}g early settlement`, detail: `Farmer #${nft.tokenId} · ${strain.name} · +${reward.xp} XP · +${reward.hc} HC${ownerPayout ? ` · ${formatNumber(ownerPayout)}g demo owner allocation` : ''}.`, kind: 'success' }, ...state.activity].slice(0, 30) as GameState['activity'],
  };
}

export function settleMatureCrops(state: GameState, now: number): GameState {
  if (state.autoHarvest === false) return state;
  return state.positions.reduce((current, position) => harvestPosition(current, position.id, now, true), state);
}
