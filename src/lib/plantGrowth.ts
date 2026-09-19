import type { PlantTraining, Position } from '../types';
import { DURATION_PRESETS } from '../data/economy';
import { LOCK_STEP_MS } from './clock';
// Presentation only: elapsed growth never changes settlement or crop rewards.
export const GROWTH_MILESTONES = [
  { at: 0, name: 'Seed cracking', detail: 'The shell opens around a new root.' },
  { at: .035, name: 'Root emerging', detail: 'A root tip reaches into the soil.' },
  { at: .08, name: 'Shoot emerging', detail: 'The first shoot reaches the surface.' },
  { at: .13, name: 'First leaves', detail: 'Small rounded leaves unfold.' },
  { at: .20, name: 'Serrated leaves', detail: 'The first pointed fan leaves open.' },
  { at: .29, name: 'Stem extension', detail: 'New leaf pairs climb the stem.' },
  { at: .40, name: 'Branch development', detail: 'Side branches spread into a distinct silhouette.' },
  { at: .52, name: 'Canopy filling', detail: 'Leaf fans expand across the canopy.' },
  { at: .64, name: 'Early flowers', detail: 'Pale flower hairs appear at branch tips.' },
  { at: .73, name: 'Bud formation', detail: 'Individual flower clusters take shape.' },
  { at: .84, name: 'Bud swelling', detail: 'Flowers gain volume and frosted detail.' },
  { at: 1, name: 'Harvest ready', detail: 'The finished plant is ready to gather.' },
  { at: 1.12, name: 'Late flower', detail: 'Unharvested flowers take on warmer colors. Cosmetic only.' },
] as const;
const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, Number.isFinite(n) ? n : low));
const ramp = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
export function growthMilestone(progress: number) {
  const p = clamp(progress, 0, 1.3);
  return GROWTH_MILESTONES.filter(stage => p >= stage.at).at(-1)!;
}
export function visualGrowth(startedAt: number, endsAt: number, now: number, failed = false, settledProgress = 0) {
  return failed ? clamp(settledProgress) : clamp((now - startedAt) / Math.max(1, endsAt - startedAt), 0, 1.3);
}
export type PlantMark = { d: string; fill: string; stroke?: string; width?: number; opacity?: number };
export type PlantAppearance = { progress: number; seed: number; water?: number; failed?: boolean; color?: string; training?: PlantTraining; damage?: number };

// Reconstructed from recorded care checkpoints, so watering cannot erase old damage.
export function plantDamage(position: Position, now: number): number {
  if (position.autoWater) return 0;
  const steps = Math.min(DURATION_PRESETS[position.duration].steps, Math.max(0, Math.floor((now - position.startedAt) / LOCK_STEP_MS)));
  let worstDryInterval = 0;
  for (let step = 1; step <= steps; step++) {
    const lastCare = Math.max(0, ...position.careSteps.filter(care => care < step));
    worstDryInterval = Math.max(worstDryInterval, step - lastCare);
  }
  return clamp((worstDryInterval - 3) / 5);
}

/** Canonical 160 × 180 portrait, also drawn directly into the farm canvas. */
export function plantMarks({ progress, seed, water = 100, failed = false, color, training = 'natural', damage = 0 }: PlantAppearance): PlantMark[] {
  const p = clamp(progress, 0, 1.3);
  const id = Math.abs(Math.trunc(seed)) || 1;
  const genes = (salt: number) => ((Math.imul(id + salt, 16807) >>> 0) % 997) / 997;
  const stress = failed ? 1 : 1 - clamp(water / 60);
  const late = ramp(p, 1.06, 1.3);
  const green = failed ? '#8b7552' : stress > .6 ? '#9b9b55' : '#56884d';
  const light = failed ? '#aa9165' : late > .5 ? '#b4a967' : '#91b96b';
  const flower = color ?? ['#af97c3', '#a9bd77', '#bc91aa', '#89b6a4'][id % 4];
  const marks: PlantMark[] = [];
  const shape = (d: string, fill: string, stroke?: string, width?: number, opacity = 1) => marks.push({ d, fill, stroke, width, opacity });
  const line = (d: string, stroke: string, width = 1, opacity = 1) => shape(d, 'none', stroke, width, opacity);
  // Seed and root are visible in the soil cutaway, fading as the shoot establishes.
  const seedOpacity = 1 - ramp(p, .14, .25);
  shape('M74 149 Q68 142 76 136 Q85 131 88 140 Q88 150 80 153 Z', '#987146', '#cbb07b', 1, seedOpacity);
  line(`M80 138 l${2 + ramp(p, 0, .035) * 3} 5 l-5 5`, '#3b3024', 1.5, seedOpacity);
  const root = ramp(p, .025, .13);
  line(`M80 149 Q${80 + root * 13} ${151 + root * 8} 77 ${150 + root * 22}`, '#e1cd9d', 2, seedOpacity * root);
  const shoot = ramp(p, .07, .2);
  const trainingBlend = ramp(p, .20, .64);
  const heightFactor = training === 'wide' ? 1 - .18 * trainingBlend : training === 'tall' ? 1 + .08 * trainingBlend : 1;
  const widthFactor = training === 'wide' ? 1 + .35 * trainingBlend : training === 'tall' ? 1 - .20 * trainingBlend : 1;
  const height = (12 * shoot + 104 * ramp(p, .17, .72)) * (.88 + genes(3) * .12) * heightFactor;
  const top = 142 - height;
  line(`M80 145 Q${79 + genes(7) * 4} ${142 - height / 2} 80 ${top}`, green, 1.5 + ramp(p, .25, .6) * 2, shoot);
  // Cotyledons unfold before the serrated leaves.
  for (const side of [-1, 1]) {
    const unfold = ramp(p, .11, .19);
    shape(`M80 ${top + 6} Q${80 + side * 19 * unfold} ${top - 2} ${80 + side * 17 * unfold} ${top + 8} Q${80 + side * 9} ${top + 14} 80 ${top + 6}`, light, undefined, undefined, unfold * (1 - ramp(p, .25, .38)));
  }
  const fan = (x: number, y: number, size: number, side: number, scarred = false) => {
    for (let finger = -3; finger <= 3; finger++) {
      const angle = finger * .36 + side * .85;
      const length = size * (1 - Math.abs(finger) * .14);
      const dx = Math.sin(angle) * length, dy = -Math.cos(angle) * length + stress * length * .85;
      const nx = Math.cos(angle) * size * .12, ny = Math.sin(angle) * size * .12;
      shape(`M${x} ${y} L${x + dx * .3 + nx} ${y + dy * .3 + ny} L${x + dx * .4 + nx * .5} ${y + dy * .4 + ny * .5} L${x + dx * .62 + nx} ${y + dy * .62 + ny} L${x + dx} ${y + dy} L${x + dx * .62 - nx} ${y + dy * .62 - ny} L${x + dx * .4 - nx * .5} ${y + dy * .4 - ny * .5} L${x + dx * .3 - nx} ${y + dy * .3 - ny} Z`, scarred && finger % 2 === 0 ? '#a58b53' : finger % 2 ? light : green);
      line(`M${x} ${y} L${x + dx * .87} ${y + dy * .87}`, '#c1ce8555', .6);
    }
  };
  const bud = (x: number, y: number, scale: number, index: number) => {
    const hairs = ramp(p, .63 + index * .009, .73);
    if (!hairs || failed) return;
    const mass = ramp(p, .72, 1) * scale;
    for (let j = 0; j < 5; j++) {
      const bx = x + Math.sin(j * 2.4) * 4 * mass, by = y - j * 3 * mass;
      shape(`M${bx - 4 * mass} ${by} q${-3 * mass} ${-7 * mass} ${4 * mass} ${-9 * mass} q${7 * mass} ${2 * mass} ${4 * mass} ${9 * mass} Z`, late > .5 ? '#baa06a' : flower, '#6b864e', .7, ramp(p, .72, .77));
      line(`M${bx} ${by - 2} q-4 -${3 * hairs} -2 -${6 * hairs} M${bx + 2} ${by - 1} q5 -2 4 -${5 * hairs}`, late > .2 ? '#d39b59' : '#eee1b9', .8, hairs);
      if (p > .84) shape(`M${bx - 1} ${by - 4} h1.3 v1.3 h-1.3 Z`, '#f5eed2', undefined, undefined, ramp(p, .84, .98));
    }
  };
  for (let tier = 0; tier < 5; tier++) {
    const growth = ramp(p, .18 + tier * .064, .37 + tier * .064);
    if (!growth) continue;
    const y = 137 - height * (.18 + tier * .155);
    for (const side of [-1, 1]) {
      const spread = (24 - tier * 2.6) * growth * (.8 + genes(tier * 9 + (side + 2)) * .5) * widthFactor;
      const x = 80 + side * spread;
      const endY = y - 9 * growth + stress * 10 * growth;
      line(`M80 ${y + 5} Q${80 + side * spread * .5} ${y + 2} ${x} ${endY}`, green, 1.3);
      fan(x, endY, (25 - tier * 1.5) * growth, side, tier < Math.ceil(clamp(damage) * 3));
      bud(x, endY - 3, .65 * growth, tier);
    }
  }
  if (p > .2) fan(80, top + 10, 15 * ramp(p, .2, .4), 0);
  bud(80, top + 7, 1, 0);
  return marks;
}
