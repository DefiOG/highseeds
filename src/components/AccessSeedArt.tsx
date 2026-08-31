import { useEffect, useRef } from 'react';
import type { AccessCatalogEntry, SeedColor } from '../data/accessCatalog';

type SeedTraits = Pick<AccessCatalogEntry,
  'name' | 'render_seed_key' | 'seed_pattern' | 'seed_base_color' | 'seed_texture' | 'seed_shape'
>;

type Palette = {
  base: [number, number, number];
  dark: [number, number, number];
  light: [number, number, number];
};

const PALETTES: Record<SeedColor, Palette> = {
  charcoal: { base: [58, 46, 38], dark: [22, 16, 12], light: [96, 78, 62] },
  espresso: { base: [77, 51, 30], dark: [35, 20, 10], light: [122, 88, 54] },
  chestnut: { base: [140, 98, 58], dark: [82, 52, 26], light: [190, 150, 100] },
  sandy: { base: [188, 158, 112], dark: [130, 100, 62], light: [222, 200, 165] },
  slategray: { base: [104, 104, 100], dark: [58, 58, 56], light: [156, 156, 150] },
  taupe: { base: [140, 128, 112], dark: [92, 82, 68], light: [186, 174, 156] },
  mahogany: { base: [110, 55, 40], dark: [64, 26, 18], light: [162, 92, 68] },
  rust: { base: [150, 78, 42], dark: [92, 42, 20], light: [196, 128, 78] },
  olivetan: { base: [122, 112, 70], dark: [76, 68, 40], light: [166, 156, 108] },
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shapeMask(size: number, shape: AccessCatalogEntry['seed_shape']) {
  const mask: boolean[][] = [];
  const centerX = size / 2;
  const centerY = size / 2;
  let radiusX = size * 0.32;
  let radiusY = size * 0.4;
  if (shape === 'teardrop') { radiusX = size * 0.3; radiusY = size * 0.42; }
  if (shape === 'plump') { radiusX = size * 0.38; radiusY = size * 0.36; }
  if (shape === 'elongated') { radiusX = size * 0.26; radiusY = size * 0.46; }

  for (let y = 0; y < size; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x += 1) {
      let dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      if (shape === 'teardrop' && y < centerY) {
        dx /= 1 - ((centerY - y) / centerY) * 0.5;
      }
      row.push(dx * dx + dy * dy <= 1);
    }
    mask.push(row);
  }
  return mask;
}

function drawSeed(canvas: HTMLCanvasElement, tokenId: number, traits: SeedTraits, gridSize = 32) {
  const random = mulberry32(hashSeed(`access-${tokenId}-${traits.render_seed_key}`));
  const palette = PALETTES[traits.seed_base_color];
  const mask = shapeMask(gridSize, traits.seed_shape);
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;
  const context = canvas.getContext('2d');
  if (!context) return;

  const scale = canvas.width / gridSize;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const noise = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, random));

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!mask[y][x]) continue;
      let [red, green, blue] = palette.base;
      const pixelNoise = noise[y][x];

      if (traits.seed_pattern === 'mottled') {
        if (pixelNoise > 0.8) [red, green, blue] = palette.dark;
        else if (pixelNoise < 0.1) [red, green, blue] = palette.light;
      } else if (traits.seed_pattern === 'webbed') {
        const firstWave = Math.sin(x * 0.35 + y * 0.5 + pixelNoise * 4) * 0.5 + 0.5;
        const secondWave = Math.sin(x * 0.5 - y * 0.3 + pixelNoise * 3) * 0.5 + 0.5;
        if (firstWave > 0.6 && secondWave > 0.45) [red, green, blue] = palette.dark;
        else if (firstWave < 0.22) [red, green, blue] = palette.light;
      } else if (traits.seed_pattern === 'tiger') {
        const stripe = Math.sin(y * 0.9 + Math.sin(x * 0.4 + pixelNoise * 3) * 2) * 0.5 + 0.5;
        if (stripe > 0.55) [red, green, blue] = palette.dark;
        else if (stripe < 0.2) [red, green, blue] = palette.light;
      } else if (traits.seed_pattern === 'heavycap') {
        const capStrength = Math.max(0, 1 - (y / gridSize) * 1.4) + pixelNoise * 0.08;
        if (capStrength > 0.55) [red, green, blue] = palette.dark;
        else if (capStrength > 0.3) {
          red = (red + palette.dark[0]) / 2;
          green = (green + palette.dark[1]) / 2;
          blue = (blue + palette.dark[2]) / 2;
        }
      }

      const centerDistance = Math.abs(x - centerX) / (gridSize * 0.08);
      if (centerDistance < 1) {
        const ridgeMix = 1 - centerDistance;
        const ridge = traits.seed_pattern === 'solid' ? palette.light : palette.dark;
        red += (ridge[0] - red) * ridgeMix * 0.35;
        green += (ridge[1] - green) * ridgeMix * 0.35;
        blue += (ridge[2] - blue) * ridgeMix * 0.35;
      }

      const lightBias = (centerX - x + (centerY - y)) / gridSize;
      red = Math.min(255, Math.max(0, red + lightBias * 22));
      green = Math.min(255, Math.max(0, green + lightBias * 22));
      blue = Math.min(255, Math.max(0, blue + lightBias * 22));
      context.fillStyle = `rgb(${red | 0},${green | 0},${blue | 0})`;
      context.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  if (traits.seed_texture === 'glossy') {
    context.fillStyle = 'rgba(255,255,255,0.16)';
    context.beginPath();
    context.ellipse(gridSize * 0.32 * scale, gridSize * 0.28 * scale, gridSize * 0.1 * scale, gridSize * 0.06 * scale, 0, 0, Math.PI * 2);
    context.fill();
  } else {
    context.fillStyle = 'rgba(255,255,255,0.04)';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

export function AccessSeedArt({ tokenId, traits, size = 112 }: { tokenId: number; traits: SeedTraits; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const resolution = Math.max(32, Math.round(size / 32) * 32);

  useEffect(() => {
    if (ref.current) drawSeed(ref.current, tokenId, traits, 32);
  }, [tokenId, traits, size]);

  return <canvas
    ref={ref}
    width={resolution}
    height={resolution}
    style={{ imageRendering: 'pixelated', width: size, height: size }}
    role="img"
    aria-label={`${traits.name} Access #${tokenId} catalog seed art`}
    data-render-key={traits.render_seed_key}
  />;
}
