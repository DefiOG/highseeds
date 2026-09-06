import { useEffect, useRef } from 'react';
import { drawFarmerSprite } from '../lib/farmerArt';
import { farmerLevel } from '../data/farmerProgression';

export function FarmerArt({ tokenId, traits, size = 112, xp = 0 }: { tokenId: number; traits: { name: string }; size?: number; xp?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current?.getContext('2d'); if (!c) return;
    c.imageSmoothingEnabled=false;c.clearRect(0,0,64,64);
    c.fillStyle=['#d8dec0','#d4ddcf','#e3d9bf','#ded2d6'][tokenId%4];c.fillRect(0,0,64,64);
    c.fillStyle='#ffffff30';for(let i=0;i<8;i++)c.fillRect((tokenId*7+i*17)%60,(tokenId*3+i*11)%58,2,2);
    c.fillStyle='#8ca075';c.fillRect(0,53,64,11);c.fillStyle='#aabb88';c.fillRect(0,53,64,2);
    c.fillStyle='#465a4630';c.fillRect(21,53,25,4);
    drawFarmerSprite(c,32,53,tokenId,farmerLevel(xp));
    c.fillStyle='#657853';c.fillRect(6,49,7,6);c.fillRect(8,44,2,9);c.fillRect(5,46,5,2);c.fillRect(10,43,4,2);
  },[tokenId,xp]);
  return <canvas ref={canvas} width={64} height={64} style={{width:size,height:size,imageRendering:'pixelated',borderRadius:5}} role="img" aria-label={`Farmer #${tokenId}, ${traits.name} specialist, level ${farmerLevel(xp)}`} data-farmer-id={tokenId}/>;
}
