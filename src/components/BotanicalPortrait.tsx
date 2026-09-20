import { useEffect, useRef, useState } from 'react';
import { drawBotanicalPlant, loadBotanicalAtlas } from '../lib/botanicalPlant';
import type { PlantAppearance } from '../lib/plantGrowth';

export function BotanicalPortrait({ appearance, label, archived }: { appearance: PlantAppearance; label: string; archived?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { let active = true; loadBotanicalAtlas().then(() => { if (active) setLoaded(true); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!loaded || !canvas.current) return;
    const ctx = canvas.current.getContext('2d')!;
    ctx.clearRect(0, 0, 640, 680);
    ctx.save(); ctx.scale(4, 4);
    drawBotanicalPlant(ctx, 80, 155, 1, appearance); ctx.restore();
  }, [loaded, appearance]);
  return <><canvas className={`botanical-portrait${archived ? ' archived' : ''}`} ref={canvas} width={640} height={680} role="img" aria-label={label}/>{!loaded && <span className="botanical-loading">{error ? 'Plant artwork unavailable. Your crop is saved.' : 'Loading plant artwork…'}</span>}</>;
}
