import { PLOT_TIERS } from '../data/economy';
import type { GameState, Plot, Position } from '../types';

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 640;
export const WORLD_PAGE_SIZE = 12;
export type Point = { x: number; y: number };
export type Obstacle = Point & { w: number; h: number };
export type FarmSlot = { key: string; plot: Plot; position?: Position; number: number };
export const LANDMARKS = [
  { id: 'journal', label: 'Farmhouse', x: 158, y: 215, w: 164, h: 120, approach: { x: 174, y: 263 } },
  { id: 'vault', label: 'Farmer lodge', x: 755, y: 180, w: 184, h: 113, approach: { x: 753, y: 247 } },
  { id: 'market', label: 'Market stall', x: 744, y: 469, w: 154, h: 91, approach: { x: 745, y: 551 } },
  { id: 'expansion', label: 'Land office', x: 471, y: 536, w: 50, h: 36, approach: { x: 474, y: 574 } },
] as const;

export function farmSlots(state: Pick<GameState, 'plots' | 'positions'>): FarmSlot[] {
  return state.plots.filter((plot) => plot.owned).flatMap((plot) => {
    const positions = state.positions.filter((position) => position.plotId === plot.id);
    const assigned = new Map<number, Position>();
    const legacy: Position[] = [];
    for (const position of positions) {
      const index = position.slotIndex;
      if (index !== undefined && Number.isInteger(index) && index >= 0 && index < PLOT_TIERS[plot.tier].slots && !assigned.has(index)) assigned.set(index, position);
      else legacy.push(position);
    }
    for (const position of legacy) {
      const index = Array.from({ length: PLOT_TIERS[plot.tier].slots }, (_, i) => i).find((i) => !assigned.has(i));
      if (index !== undefined) assigned.set(index, position);
    }
    return Array.from({ length: PLOT_TIERS[plot.tier].slots }, (_, index) => ({
      key: `${plot.id}:${index}`, plot, number: index + 1, position: assigned.get(index),
    }));
  });
}

export function migrateBedAssignments(state: Pick<GameState, 'plots' | 'positions'>): Position[] {
  const assignments = new Map(farmSlots(state).filter((slot) => slot.position).map((slot) => [slot.position!.id, slot.number - 1]));
  return state.positions.map((position) => ({ ...position, slotIndex: assignments.get(position.id) ?? position.slotIndex }));
}

export function bedPoint(index: number): Point {
  return { x: 352 + (index % 4) * 72, y: 267 + Math.floor(index / 4) * 70 };
}

export const OBSTACLES: Obstacle[] = [
  { x: 77, y: 115, w: 176, h: 120 },
  { x: 660, y: 90, w: 190, h: 123 },
  { x: 674, y: 426, w: 149, h: 92 },
  { x: 83, y: 432, w: 169, h: 106 },
  ...Array.from({ length: WORLD_PAGE_SIZE }, (_, index) => ({ ...bedPoint(index), w: 56, h: 43 })),
];

export function canWalk(point: Point): boolean {
  const radius = 6;
  return point.x >= 48 && point.x <= WORLD_WIDTH - 48 && point.y >= 56 && point.y <= WORLD_HEIGHT - 34
    && !OBSTACLES.some((r) => point.x > r.x - radius + 1e-6 && point.x < r.x + r.w + radius - 1e-6 && point.y > r.y - radius + 1e-6 && point.y < r.y + r.h + radius - 1e-6);
}

export function walkStep(point: Point, direction: Point, distance: number): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (!length || !Number.isFinite(distance)) return point;
  // Substeps prevent tunnelling through collision rectangles after a slow frame.
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / 4));
  let next = { ...point };
  for (let index = 0; index < steps; index++) {
    const dx = direction.x / length * distance / steps;
    const dy = direction.y / length * distance / steps;
    if (canWalk({ x: next.x + dx, y: next.y })) next.x += dx;
    if (canWalk({ x: next.x, y: next.y + dy })) next.y += dy;
  }
  return next;
}

// Four-way navigation across the same collision map used by keyboard movement.
export function walkingPath(from: Point, to: Point): Point[] {
  const unit = 16;
  const columns = WORLD_WIDTH / unit;
  const cell = (p: Point) => Math.floor(p.y / unit) * columns + Math.floor(p.x / unit);
  const center = (n: number): Point => ({ x: (n % columns) * unit + unit / 2, y: Math.floor(n / columns) * unit + unit / 2 });
  const start = cell(from);
  const goal = cell(to);
  if (!canWalk(to) || !canWalk(center(goal))) return [];
  const queue = [start];
  const parents = new Map<number, number>([[start, -1]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current === goal) {
      const result: Point[] = [to];
      let node = current;
      while (node !== start) { result.push(center(node)); node = parents.get(node)!; }
      return result.reverse();
    }
    for (const offset of [-1, 1, -columns, columns]) {
      const next = current + offset;
      if (parents.has(next) || !canWalk(center(next))) continue;
      parents.set(next, current);
      queue.push(next);
    }
  }
  return [];
}
