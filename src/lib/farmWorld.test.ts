import { describe, expect, it } from 'vitest';
import { bedPoint, canWalk, farmSlots, LANDMARKS, migrateBedAssignments, walkingPath, walkStep } from './farmWorld';
import type { Plot, Position } from '../types';

const home: Plot = { id: 1, tier: 'room', owned: true, owner: 'You', reliability: 100 };
const crop = (id: string, slotIndex?: number): Position => ({ id, slotIndex, plotId: 1, nftId: Number(id), strainId: 'runtz', duration: '6h', mode: 'owner', startedAt: 0, snapshotXp: 0, waterLevel: 100, waterStep: 0, careSteps: [0], autoWater: true, autoWaterReserveHC: 10 });

describe('walkable farm world', () => {
  it('routes from the entrance to every building and every growing bed without crossing obstacles', () => {
    const entrance = { x: 294, y: 395 };
    const targets = [...LANDMARKS.map((landmark) => landmark.approach), ...Array.from({ length: 12 }, (_, index) => { const p = bedPoint(index); return { x: p.x + 28, y: p.y + 54 }; })];
    for (const target of targets) {
      const route = walkingPath(entrance, target);
      expect(route.length, JSON.stringify(target)).toBeGreaterThan(0);
      expect(route.at(-1)).toEqual(target);
      let actor = entrance;
      for (const waypoint of route) {
        let steps = 0;
        while (Math.hypot(waypoint.x-actor.x, waypoint.y-actor.y) >= 3 && steps++ < 100) {
          actor = walkStep(actor, { x: waypoint.x-actor.x, y: waypoint.y-actor.y }, Math.min(4, Math.hypot(waypoint.x-actor.x, waypoint.y-actor.y)));
          expect(canWalk(actor)).toBe(true);
        }
        expect(steps, JSON.stringify({ target, waypoint, actor })).toBeLessThan(100);
      }
      expect(Math.hypot(target.x-actor.x, target.y-actor.y)).toBeLessThan(3);
    }
  });

  it('blocks walls, pond and map edges even across a long movement step', () => {
    expect(walkingPath({ x: 294, y: 395 }, { x: 160, y: 480 })).toEqual([]);
    expect(canWalk({ x: 180, y: 180 })).toBe(false);
    const blocked = walkStep({ x: 294, y: 180 }, { x: -1, y: 0 }, 400);
    expect(blocked.x).toBeGreaterThanOrEqual(259);
    const edge = walkStep({ x: 294, y: 395 }, { x: 0, y: 1 }, 1000);
    expect(edge.y).toBeLessThanOrEqual(606);
  });

  it('normalizes diagonal speed instead of allowing faster diagonal movement', () => {
    const origin = { x: 294, y: 395 };
    const straight = walkStep(origin, { x: 0, y: 1 }, 5);
    const diagonal = walkStep(origin, { x: 1, y: 1 }, 5);
    expect(Math.hypot(diagonal.x-origin.x,diagonal.y-origin.y)).toBeCloseTo(Math.hypot(straight.x-origin.x,straight.y-origin.y));
  });
});

describe('persistent garden beds', () => {
  it('preserves neighboring bed positions after a harvest', () => {
    const slots = farmSlots({ plots: [home], positions: [crop('1', 0), crop('2', 3)] });
    expect(slots).toHaveLength(4);
    expect(slots[3].position?.id).toBe('2');
    const after = farmSlots({ plots: [home], positions: [crop('2', 3)] });
    expect(after[0].position).toBeUndefined();
    expect(after[3].position?.id).toBe('2');
  });

  it('migrates legacy crops without duplicates or moving assigned crops', () => {
    const state = { plots: [home], positions: [crop('1'), crop('2', 2), crop('3', 2)] };
    const migrated = migrateBedAssignments(state);
    expect(migrated.map((item) => item.slotIndex)).toEqual([0, 2, 1]);
    expect(migrateBedAssignments({ ...state, positions: migrated })).toEqual(migrated);
    expect(farmSlots({ plots: [home, { ...home, id: 2, owned: false }], positions: migrated })).toHaveLength(4);
  });
});
