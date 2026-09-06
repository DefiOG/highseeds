import { drawFarmerSprite } from './farmerArt';
import { bedPoint, WORLD_HEIGHT, WORLD_WIDTH, type Point } from './farmWorld';

export interface CropVisual { failed?: boolean; progress: number; water: number; color: string; occupied: boolean; available: boolean }
export interface SceneFrame { farmerId: number; farmerLevel: number; player: Point; facing: Point; walking: boolean; time: number; crops: CropVisual[]; selected: number; destination?: Point }
type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
function random(seed: number) { let value = seed; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }

function oval(c: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

function tree(c: Ctx, x: number, y: number, size = 1, tint = 0) {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(size, size);
  oval(c, 9, 3, 25, 10, '#263e2760');
  rect(c, -5, -34, 12, 37, '#624832'); rect(c, -1, -28, 5, 29, '#927047');
  const colors = tint ? ['#344f35', '#476637', '#648342', '#7d944c'] : ['#244d38', '#38643d', '#537e45', '#73924c'];
  [[0, -43, 28], [-13, -62, 24], [14, -66, 26], [0, -82, 21]].forEach(([a,b,r],i) => {
    oval(c, a, b + 5, r, r * .82, colors[0]); oval(c, a - 2, b, r - 3, r * .75, colors[i % 3 + 1]);
    rect(c, a - 9, b - 10, 9, 4, '#92a85b80');
  });
  c.restore();
}

function fence(c: Ctx, x: number, y: number, length: number) {
  rect(c, x, y - 17, length, 5, '#76573b'); rect(c, x, y - 7, length, 4, '#ae8a50');
  for (let i = 0; i <= length; i += 24) { rect(c, x+i, y-23, 5, 28, '#78573c'); rect(c, x+i, y-23, 3, 25, '#bc985d'); }
}

function house(c: Ctx) {
  oval(c, 174, 221, 105, 20, '#23362b50');
  rect(c, 84, 124, 170, 107, '#68563d'); rect(c, 88, 129, 162, 95, '#e2cba0');
  rect(c, 90, 155, 160, 5, '#c2ab7c'); rect(c, 90, 199, 160, 6, '#b59b6a');
  for (let y = 167; y < 214; y += 10) for (let x = 94+(y%3)*8; x < 244; x += 28) rect(c,x,y,19,2,'#ccb88c');
  rect(c, 153, 178, 31, 47, '#5a4936'); rect(c, 158, 182, 22, 42, '#906646'); rect(c, 173, 202, 3, 3, '#f2d085');
  for (const x of [106, 207]) { rect(c,x,164,26,30,'#725c3f'); rect(c,x+3,167,20,23,'#91aaa0'); rect(c,x+5,169,7,9,'#d4e2bb'); rect(c,x+12,167,3,24,'#f4dcad'); rect(c,x+2,179,23,3,'#f4dcad'); rect(c,x-4,194,34,5,'#785a40'); }
  rect(c, 141, 222, 57, 9, '#b4ab84'); rect(c, 135, 231, 70, 7, '#cbb98f');
  // Stepped terracotta roof, hand-laid shingles and chimney.
  for (let row = 0; row < 12; row++) {
    const y =  70 + row * 6; const inset = (11-row)*6;
    rect(c, 68+inset, y, 199-inset*2, 7, row%2 ? '#9e5942' : '#b66c48');
    for (let x = 76+inset+(row%2)*9; x < 259-inset; x += 20) rect(c,x,y+1,2,5,'#cf8858');
  }
  rect(c, 65, 140, 207, 6, '#593f35'); rect(c, 199, 64, 20, 39, '#857d67'); rect(c, 195, 62, 28, 7, '#b4ac8b');
  rect(c, 140, 139, 58, 17, '#314f37');
  c.fillStyle='#eedab0'; c.font='bold 9px monospace'; c.textAlign='center'; c.fillText('HOME',169,151);
  for (const x of [91,232]) { rect(c,x,220,14,12,'#ac674a'); rect(c,x+2,213,10,10,'#537b43'); rect(c,x+5,210,4,5,'#d89a77'); }
}


function greenhouse(c: Ctx) {
  oval(c, 755, 201, 112, 19, '#23362b50');
  rect(c, 664, 112, 180, 93, '#466956'); rect(c, 669, 116, 170, 83, '#84a79b');
  for (let i=0;i<6;i++) {
    const x=673+i*27; rect(c,x,121,22,68,'#adc5b18c'); rect(c,x,121,4,60,'#dce3c06c');
    rect(c,x+2,168,17,18,'#446540'); rect(c,x+8,158,4,24,'#5c8145'); rect(c,x+4,180,16,10,'#976343');
  }
  for (let row=0;row<7;row++) { const inset=(6-row)*6; rect(c,652+inset,65+row*7,202-inset*2,8,row%2?'#94b5a5':'#c2d2b5'); }
  for (let i=0;i<6;i++) rect(c,675+i*29,110,4,88,'#f1ddad');
  rect(c,659,110,191,6,'#efe0b9'); rect(c,661,153,185,4,'#e1cf9e'); rect(c,659,199,190,8,'#c0a873');
  rect(c,738,151,33,55,'#eddfb5'); rect(c,742,158,25,43,'#486957'); rect(c,745,161,19,25,'#bed0ac'); rect(c,762,190,3,3,'#eccc79');
  rect(c,695,91,119,19,'#466746'); c.fillStyle='#f8e7b9'; c.font='bold 10px monospace'; c.textAlign='center'; c.fillText('FARMER LODGE',754,104);
  for (const x of [652,842]) { rect(c,x,195,15,14,'#99704a'); rect(c,x-2,187,19,9,'#608246'); }
}

function market(c: Ctx) {
  oval(c,754,517,95,15,'#23362b50');
  rect(c,676,447,6,71,'#755336'); rect(c,816,447,6,71,'#755336');
  rect(c,686,473,130,39,'#a77d4e'); rect(c,683,470,136,7,'#dfba77');
  for (let i=0;i<9;i++) rect(c,690+i*14,482,2,27,'#8d663e');
  for(let i=0;i<8;i++) { rect(c,668+i*20,428,20,31,i%2?'#efe0ac':'#bc7457'); rect(c,668+i*20,459,20,8,i%2?'#dac894':'#9e5a42'); }
  rect(c,674,423,151,5,'#6e5138');
  for(const x of [698,745,786]) { rect(c,x,460,25,13,'#765c3d'); for(let j=0;j<3;j++) { rect(c,x+3+j*7,454,5,9,'#69904d'); rect(c,x+4+j*7,451,3,5,'#aac173'); } }
  rect(c,713,486,70,18,'#3d5641'); c.fillStyle='#f0dfad'; c.font='bold 10px monospace'; c.textAlign='center';c.fillText('MARKET',748,499);
  // Shopkeeper peeking out from behind the counter.
  rect(c,746,448,12,15,'#b8825b'); rect(c,742,442,21,7,'#c39a55'); rect(c,746,438,14,5,'#c39a55'); rect(c,750,453,2,2,'#373f2f');
}

export function createFarmBackground(): HTMLCanvasElement {
  const canvas=document.createElement('canvas'); canvas.width=WORLD_WIDTH; canvas.height=WORLD_HEIGHT;
  const c=canvas.getContext('2d')!; c.imageSmoothingEnabled=false;
  rect(c,0,0,960,640,'#789353'); const rng=random(420);
  // Meadow texture remains deterministic across visits.
  for(let i=0;i<5600;i++) { const x=Math.floor(rng()*960),y=Math.floor(rng()*640); rect(c,x,y,2+Math.floor(rng()*4),2,['#8c9e5c','#6c884a','#9aa969','#668448'][i%4]); }
  const path=(x:number,y:number,w:number,h:number) => { rect(c,x-4,y-4,w+8,h+8,'#8f985c'); rect(c,x,y,w,h,'#c5b47c'); for(let i=0;i<w*h/95;i++)rect(c,x+rng()*w,y+rng()*h,3,2,rng()>.5?'#af9d69':'#d4c28c'); };
  path(275,218,43,351); path(171,237,601,34); path(281,452,558,37); path(744,211,30,246); path(283,549,482,28);
  path(310,303,327,25);path(310,373,327,25);path(310,443,327,15);
  // Field border and soil beds.
  fence(c,338,231,286); fence(c,341,484,284);
  for(let i=0;i<12;i++) { const p=bedPoint(i);rect(c,p.x-3,p.y-3,62,49,'#b09b63');rect(c,p.x,p.y,56,43,'#76523a');for(let row=0;row<4;row++){rect(c,p.x+3,p.y+4+row*10,50,3,'#5f4531');rect(c,p.x+4,p.y+7+row*10,48,2,'#976947');} }
  // Layered pond banks, stones and reeds.
  oval(c,165,490,99,69,'#65834b'); oval(c,165,486,89,60,'#c0ba87'); oval(c,165,484,83,55,'#587f78'); oval(c,165,481,74,48,'#739b93');
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;oval(c,165+Math.cos(a)*84,484+Math.sin(a)*56,5+rng()*5,4,'#a7ab83');}
  for (const [x,y] of [[99,514],[234,469],[116,436]]) { for(let i=0;i<5;i++)rect(c,x+i*3,y-15-rng()*8,2,24,'#527443'); }
  rect(c,201,497,68,20,'#826747');for(let x=204;x<265;x+=9)rect(c,x,499,6,16,'#b59a65');rect(c,206,490,4,10,'#6c563c');rect(c,254,490,4,10,'#6c563c');
  house(c);greenhouse(c);market(c);
  // Well, garden bench, stepping stones, crates, signs and flower patches.
  oval(c,581,161,25,13,'#50634950');rect(c,560,144,42,25,'#aaa886');rect(c,564,149,34,8,'#506456');rect(c,559,125,4,30,'#856445');rect(c,599,125,4,30,'#856445');rect(c,552,119,59,8,'#a76c48');rect(c,560,111,42,8,'#b98756');
  rect(c,456,532,5,31,'#856440');rect(c,451,519,49,25,'#594c35');rect(c,454,522,43,19,'#e2c895');c.fillStyle='#536044';c.font='bold 9px monospace';c.fillText('LAND',476,535);
  for(const x of [362,386,410]){rect(c,x,169,17,15,'#956d43');rect(c,x+3,171,11,10,'#b99259');}
  rect(c,95,329,64,7,'#aa8651');rect(c,97,317,60,6,'#bb995f');rect(c,99,329,5,15,'#765c3e');rect(c,150,329,5,15,'#765c3e');
  for(let i=0;i<120;i++){const x=52+rng()*850,y=70+rng()*530;if((x>267&&x<837&&y>216&&y<579)||(x<260&&y>100&&y<550)||(x>645&&y<220))continue;rect(c,x,y,2,7,'#547743');rect(c,x-2,y-2,6,4,['#eee1a3','#ce956e','#d9c18d'][i%3]);}
  fence(c,63,591,189);fence(c,543,596,337);
  for(let i=0;i<19;i++){tree(c,18+i*54,72+(i%3)*9,.8+(i%4)*.08,i%2);}
  for(let i=0;i<8;i++){tree(c,25+(i%2)*8,168+i*62,.78,i%2);tree(c,933+(i%2)*9,165+i*67,.95,i%2);}
  for(const [x,y,s] of [[68,294,.7],[852,314,.85],[875,398,.7],[302,137,.65],[618,586,.6],[45,625,1],[911,640,1.1]])tree(c,x,y,s);
  return canvas;
}

function plant(c:Ctx,x:number,y:number,progress:number,color:string) {
  const height=progress<.2?10:progress<.6?23:34;
  rect(c,x-1,y-height,2,height,'#849952');
  // Tapered, seven-finger fan leaves grow directly from the soil, without pots.
  const fan=(cx:number,cy:number,scale:number) => {
    for(let finger=-3;finger<=3;finger++) {
      const angle=finger*.39;
      const length=(9-Math.abs(finger)*1.5)*scale;
      for(let t=0;t<length;t++) {
        const width=t>length*.75?1:2;
        rect(c,cx+Math.sin(angle)*t-width/2,cy-Math.cos(angle)*t,width,2,t%3===0?'#88aa59':'#487741');
      }
    }
  };
  if(progress<.2) { fan(x,y-3,.65); return; }
  for(let tier=0;tier<3;tier++) {
    const cy=y-5-tier*7, spread=7-tier*2;
    rect(c,x-spread,cy,spread*2,1,'#849952');
    fan(x-spread,cy,1-tier*.13);fan(x+spread,cy,1-tier*.13);
  }
  fan(x,y-height+7,.8);
  if(progress>=.6) {
    for(const [dx,dy] of [[0,-height],[-5,-17],[5,-23],[0,-12]]) {
      rect(c,x+dx-2,y+dy,5,8,'#6f8946');
      rect(c,x+dx-1,y+dy-2,3,10,progress>=1?'#b1ab63':color);
      rect(c,x+dx,y+dy,1,2,'#e1c385');rect(c,x+dx-1,y+dy+5,2,1,'#d9b474');
    }
  }
}

export function drawFarm(c:Ctx,background:HTMLCanvasElement,frame:SceneFrame) {
  c.imageSmoothingEnabled=false;c.drawImage(background,0,0);
  const seconds=frame.time/1000;
  // Ripples, lily pads, drifting butterflies and chimney smoke.
  for(let i=0;i<6;i++){const x=115+(i*23)%95,y=462+(i*13)%39;rect(c,x+Math.sin(seconds+i)*3,y,10,2,'#b4cfb070');}
  oval(c,132,475,10,4,'#6b8e51');oval(c,195,460,8,3,'#567e4a');rect(c,130,471,4,3,'#eac7a0');
  for(let i=0;i<3;i++){const drift=(seconds*7+i*15)%47;c.globalAlpha=(1-drift/47)*.35;rect(c,203+Math.sin(drift/15)*5,62-drift,10+drift/6,7,'#ede5cd');}c.globalAlpha=1;
  frame.crops.forEach((crop,index)=>{
    const p=bedPoint(index);
    if(!crop.available){rect(c,p.x,p.y,56,43,'#70834cb0');for(let j=0;j<5;j++)rect(c,p.x+7+j*9,p.y+13+j%2*9,2,12,'#9aac60');return;}
    if(frame.selected===index){c.strokeStyle='#ffe0a0';c.lineWidth=2;c.strokeRect(p.x-4,p.y-4,64,51);}
    if(crop.occupied){
      if(crop.water>=50)rect(c,p.x+1,p.y+1,54,41,'#332a2826');
      for(let j=0;j<3;j++) {
        const x=p.x+11+j*17,y=p.y+34-(j%2)*5;
        if(crop.failed) { rect(c,x,y-12,2,12,'#826143');rect(c,x-5,y-9,7,2,'#a18b60');rect(c,x+2,y-6,5,2,'#a18b60'); }
        else { c.save(); if(crop.water===0) { c.translate(x,y);c.scale(1,.7);c.translate(-x,-y); } plant(c,x,y,crop.progress,crop.water===0?'#b39a65':crop.color);c.restore(); }
      }
      if(crop.progress>=1&&!crop.failed){rect(c,p.x+22,p.y-19,14,10,'#f5d787');c.fillStyle='#4d653b';c.font='bold 9px monospace';c.textAlign='center';c.fillText('!',p.x+29,p.y-11);}
      else if(crop.water<50){rect(c,p.x+23,p.y-15,9,9,'#86cbd1');}
    } else {rect(c,p.x+25,p.y+16,6,2,'#b49a73');rect(c,p.x+27,p.y+14,2,6,'#b49a73');}
  });
  if(frame.destination){const d=frame.destination; c.strokeStyle='#f3e4b88c';c.lineWidth=2;c.beginPath();c.ellipse(d.x,d.y,7+Math.sin(seconds*5),4,0,0,Math.PI*2);c.stroke();}
  const {x,y}=frame.player;
  oval(c,x,y+1,11,4,'#203d315a');
  const step=frame.walking?Math.round(Math.sin(seconds*14)*3):0;
  const facing = Math.abs(frame.facing.x) > Math.abs(frame.facing.y)
    ? (frame.facing.x < 0 ? 'left' : 'right')
    : (frame.facing.y < 0 ? 'back' : 'front');
  drawFarmerSprite(c,x,y,frame.farmerId,frame.farmerLevel,step,facing);
  // A few quiet animated accents, kept out of the interaction layer.
  for(let i=0;i<3;i++){const bx=365+i*192+Math.sin(seconds*.5+i)*24,by=143+i*75+Math.cos(seconds*.8+i)*12;rect(c,bx,by,2,3,'#665a3d');rect(c,bx-3,by+Math.sin(seconds*8)*2,3,3,'#f3d78e');rect(c,bx+2,by-Math.sin(seconds*8)*2,3,3,'#f3d78e');}
}
