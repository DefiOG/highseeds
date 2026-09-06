export const XP_PER_CHECKPOINT = 50;
export const HC_PER_CHECKPOINT = 25;
export const XP_PER_LEVEL = 250;
export const MAX_FARMER_LEVEL = 50;
export const MAX_FARMER_XP = (MAX_FARMER_LEVEL - 1) * XP_PER_LEVEL;

export function farmerLevel(xp: number) {
  return 1 + Math.floor(Math.min(MAX_FARMER_XP, Math.max(0, Number.isFinite(xp) ? xp : 0)) / XP_PER_LEVEL);
}

export function farmerTitle(xp: number) {
  const level = farmerLevel(xp);
  return level >= 50 ? 'Master cultivator' : level >= 35 ? 'Estate steward' : level >= 20 ? 'Field expert' : level >= 10 ? 'Grower' : level >= 5 ? 'Farmhand' : 'New recruit';
}

export function maturityReward(steps: number, mature: boolean, currentXp: number) {
  if (!mature || ![1, 2, 4, 12, 28].includes(steps)) return { xp: 0, hc: 0 };
  return { xp: Math.max(0, Math.min(steps * XP_PER_CHECKPOINT, MAX_FARMER_XP - currentXp)), hc: steps * HC_PER_CHECKPOINT };
}
