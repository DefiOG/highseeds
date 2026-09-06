// Mixed-radix traits give the 420 Genesis IDs 420 distinct base appearances.
export function farmerAppearance(tokenId: number) {
  const index = Math.max(0, Math.min(419, Math.floor(tokenId) - 1));
  return {
    shirt: ['#758d64','#a66d58','#729aaa','#ab9060','#8e789e','#9eaa78','#b07d8b'][index % 7],
    skin: ['#e7bd96','#c9956d','#a97150','#81513c','#f1d0af'][Math.floor(index / 7) % 5],
    hat: ['#d8b77d','#688c69','#a47c58','#7c8ca2','#b78065','#a49972'][Math.floor(index / 35) % 6],
    overalls: Math.floor(index / 210) === 0,
  };
}

export function drawFarmerSprite(c: CanvasRenderingContext2D, x: number, y: number, tokenId: number, level: number, step = 0, facing: 'front' | 'left' | 'right' | 'back' = 'front') {
  const art = farmerAppearance(tokenId);
  const r = (a:number,b:number,w:number,h:number,color:string) => { c.fillStyle=color;c.fillRect(Math.round(x+a),Math.round(y+b),w,h); };
  r(-6,-7,5,7+step,'#3d493b');r(2,-7,5,7-step,'#3d493b');r(-7,-1+step,7,3,'#534232');r(2,-1-step,7,3,'#534232');
  r(-7,-20,15,14,art.shirt);r(-9,-18,3,10,art.skin);r(8,-18,3,10,art.skin);
  if(art.overalls){r(-4,-17,9,11,'#526c68');r(-4,-20,2,6,'#526c68');r(3,-20,2,6,'#526c68');r(-2,-15,5,4,'#758981');}
  else{r(-6,-9,13,2,'#6b5b45');r(-1,-18,2,9,'#dfc79a');}
  r(-6,-30,13,12,art.skin);r(-7,-31,15,5,'#634c37');
  if (facing === 'back') {
    r(-6,-27,13,7,'#634c37');
  } else {
    if (facing !== 'right') r(-4,-25,2,2,'#343c32');
    if (facing !== 'left') r(3,-25,2,2,'#343c32');
    r(-2,-21,4,1,'#9b674d');
  }
  r(-12,-33,25,5,art.hat);r(-8,-39,17,7,art.hat);r(-8,-34,17,3,'#705b41');r(-6,-38,11,2,'#f4e4b15c');
  if(level>=5){r(7,-37,2,7,'#496e46');r(8,-38,4,4,'#8ca562');}
  if(level>=10){r(3,-16,3,3,level>=50?'#f3d56f':level>=35?'#d8ded1':'#c69755');}
  if(level>=20){r(-9,-13,3,3,'#d9b9cc');r(-8,-12,1,1,'#e6d483');}
  if(level>=50){r(-3,-42,7,2,'#f3d56f');r(-1,-45,3,8,'#f3d56f');}
}
