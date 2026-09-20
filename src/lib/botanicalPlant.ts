import atlasUrl from '../assets/botanical-growth-atlas-v2.png';
import { GROWTH_MILESTONES, type PlantAppearance } from './plantGrowth';

const heights = [9, 17, 24, 30, 42, 56, 72, 90, 104, 114, 122, 128, 128];
const bounded = (n: number, max = 1) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
export function botanicalFrame(progress: number) {
  const p = bounded(progress, 1.3);
  let index = 0;
  while (index < 12 && p >= GROWTH_MILESTONES[index + 1].at) index++;
  const next = Math.min(12, index + 1);
  const blend = index === next ? 0 : bounded((p - GROWTH_MILESTONES[index].at) / (GROWTH_MILESTONES[next].at - GROWTH_MILESTONES[index].at));
  return { index, next, blend, height: heights[index] + (heights[next] - heights[index]) * blend };
}

let atlas: HTMLImageElement | undefined;
let ready: Promise<void> | undefined;
type Bounds = { x: number; y: number; w: number; h: number };
let bounds: Bounds[] = [];
export function loadBotanicalAtlas() {
  if (!ready) ready = new Promise<void>((resolve, reject) => {
    atlas = new Image();
    atlas.onload = () => {
      // Measure alpha bounds inside observed sprite gutters; never alter the artwork.
      const canvas = document.createElement('canvas');
      canvas.width = atlas!.naturalWidth; canvas.height = atlas!.naturalHeight;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(atlas!, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const rows = [0, 310, 615, 915, 1254].map(y => Math.round(y / 1254 * canvas.height));
      bounds = Array.from({ length: 16 }, (_, index) => {
        const left = Math.round(index % 4 * canvas.width / 4), right = Math.round((index % 4 + 1) * canvas.width / 4);
        const top = rows[Math.floor(index / 4)], bottom = rows[Math.floor(index / 4) + 1];
        let x0 = right, x1 = left, y0 = bottom, y1 = top;
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 80) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        }
        return x1 >= x0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : { x: left, y: top, w: right - left, h: bottom - top };
      });
      resolve();
    };
    atlas.onerror = () => { ready = undefined; reject(new Error('Plant artwork could not load')); };
    atlas.src = atlasUrl;
  });
  return ready;
}

/** Root-anchored artwork shared by the portrait and the outdoor crop. */
export function drawBotanicalPlant(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, appearance: PlantAppearance) {
  if (!atlas?.complete || bounds.length !== 16) return;
  const { index, next, blend, height } = botanicalFrame(appearance.progress);
  const stress = appearance.failed ? 1 : 1 - bounded((appearance.water ?? 100) / 60);
  const gene = (Math.abs(Math.imul(appearance.seed, 16807)) % 997) / 997;
  const training = bounded((appearance.progress - .2) / .5);
  const width = (appearance.training === 'wide' ? 1 + training * .16 : appearance.training === 'tall' ? 1 - training * .12 : 1) * (.96 + gene * .08);
  const tall = appearance.training === 'tall' ? 1 + training * .06 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale * width, scale * tall * (1 - stress * .12));
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const draw = (cell: number, alpha: number, filter: string) => {
    if (alpha <= 0) return;
    const b = bounds[cell]; const w = Math.min(133, height * b.w / b.h);
    ctx.globalAlpha = alpha; ctx.filter = filter;
    ctx.drawImage(atlas!, b.x, b.y, b.w, b.h, -w / 2, -height, w, height);
  };
  const filter = appearance.failed ? 'sepia(.8) saturate(.4) brightness(.65)' : `saturate(${1 - stress * .35})`;
  const cell = (stage: number) => stage === 11 && appearance.training === 'wide' ? 13 : stage === 11 && appearance.training === 'tall' ? 14 : stage;
  draw(cell(index), 1 - blend, filter); draw(cell(next), blend, filter);
  const damage = bounded(appearance.damage ?? 0);
  if (damage > 0 && index >= 4) {
    ctx.save(); ctx.beginPath(); ctx.rect(-80, -height * .32, 160, height * .32); ctx.clip();
    draw(cell(index), damage * (1 - blend) * .7, 'sepia(.9) saturate(.6)');
    draw(cell(next), damage * blend * .7, 'sepia(.9) saturate(.6)'); ctx.restore();
  }
  ctx.restore();
}
