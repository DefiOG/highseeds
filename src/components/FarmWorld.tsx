import { farmerLevel, farmerTitle, XP_PER_LEVEL, MAX_FARMER_XP } from '../data/farmerProgression';
import { useDialogFocus } from '../lib/useDialogFocus';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Coins, Droplets, Flower2, HelpCircle, Home, Leaf, Maximize2, Search, ShoppingBasket, Sprout, Wheat, X } from 'lucide-react';
import type { ViewContext } from '../App';
import { ACCESS_CATALOG, ACCESS_RARITY_ORDER, getAccessCatalogEntry } from '../data/accessCatalog';
import { ACTIVATION_COST, ALPHA_PLOT_TIERS, RARITIES, currentSeason, DURATION_PRESETS, getDailyContracts, getNftStrain, PLOT_TIERS, STRAINS } from '../data/economy';
import { FAST_TIME_ENABLED, formatCountdown } from '../lib/clock';
import { formatNumber, getPositionMetrics, projectedMatureYield, xpBonus } from '../lib/engine';
import { bedPoint, canWalk, farmSlots, LANDMARKS, walkStep, walkingPath, WORLD_HEIGHT, WORLD_PAGE_SIZE, WORLD_WIDTH, type Point } from '../lib/farmWorld';
import { createFarmBackground, drawFarm, type CropVisual } from '../lib/farmRenderer';
import type { DurationKey } from '../types';
import { FarmerArt } from './FarmerArt';
import growthArt from '../assets/growth-progression-ui.webp';
import { farmPanelForPath } from '../lib/farmNavigation';
import './farmWorld.css';

type Panel = 'bed' | 'vault' | 'market' | 'expansion' | 'journal' | 'help' | null;
type Destination = { point: Point; panel: Panel; bed?: number };
type Props = ViewContext & { connectWallet: () => void; blocked: boolean; route: string };
const PLAYER_STORAGE = 'weed-hustle-farm-player-v1';
function startingPoint(): Point {
  try { const saved = JSON.parse(localStorage.getItem(PLAYER_STORAGE) ?? 'null'); if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && canWalk(saved)) return { x: saved.x, y: saved.y }; } catch { /* Default to the garden entrance. */ }
  return { x: 294, y: 395 };
}
const positionStyle = (x: number, y: number): CSSProperties => ({ left: `${x / WORLD_WIDTH * 100}%`, top: `${y / WORLD_HEIGHT * 100}%` });

export function FarmWorld(props: Props) {
  const { state, now, connectWallet, activateNft, buyPlot, openPosition, careForPosition, closePosition, fulfillOrder, equipFarmer, setAutoHarvest, blocked } = props;
  const panelRef = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const actor = useRef(startingPoint());
  const facing = useRef<Point>({ x: 0, y: 1 });
  const keys = useRef(new Set<string>());
  const route = useRef<Point[]>([]);
  const pending = useRef<Destination | null>(null);
  const [panel, setPanel] = useState<Panel>(() => farmPanelForPath(props.route));
  const [selectedBed, setSelectedBed] = useState(0);
  const [page, setPage] = useState(0);
  const [nearby, setNearby] = useState('');
  const [walkingTo, setWalkingTo] = useState('');
  const [tokenId, setTokenId] = useState(0);
  const [duration, setDuration] = useState<DurationKey>('6h');
  const [autoWater, setAutoWater] = useState(true);
  const [query, setQuery] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(true);
  const [rarity, setRarity] = useState('All');
  const [vaultPage, setVaultPage] = useState(0);
  const [selectedSeed, setSelectedSeed] = useState<number | null>(null);
  const slots = farmSlots(state);
  const pages = Math.max(1, Math.ceil(slots.length / WORLD_PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visibleSlots = slots.slice(safePage * WORLD_PAGE_SIZE, (safePage + 1) * WORLD_PAGE_SIZE);
  const slot = visibleSlots[selectedBed];
  const assigned = new Set(state.positions.map((position) => position.nftId));
  const available = state.nfts.filter((nft) => nft.activated && !assigned.has(nft.tokenId) && getNftStrain(nft.tokenId));
  const nft = available.find((item) => item.tokenId === tokenId) ?? available[0];
  const strain = nft ? getNftStrain(nft.tokenId) : undefined;
  const position = slot?.position;
  const growingNft = state.nfts.find((item) => item.tokenId === position?.nftId);
  const metrics = position && growingNft && slot ? getPositionMetrics(position, growingNft, slot.plot, now) : undefined;
  const growingStrain = STRAINS.find((item) => item.id === position?.strainId);
  const ownedIds = new Set(state.nfts.map((item) => item.tokenId));
  const seedResults = ACCESS_CATALOG.filter((entry) => (!ownedOnly || ownedIds.has(entry.id)) && (rarity === 'All' || entry.rarity === rarity) && `${entry.id} ${entry.name} ${entry.family} ${entry.type}`.toLowerCase().includes(query.toLowerCase()));
  const seedPages = Math.max(1, Math.ceil(seedResults.length / 12));
  const safeVaultPage = Math.min(vaultPage, seedPages - 1);
  const seed = selectedSeed ? getAccessCatalogEntry(selectedSeed) : undefined;
  const ownedSeed = state.nfts.find((item) => item.tokenId === seed?.id);
  const orders = getDailyContracts(now, state.nfts.filter((item) => item.activated).map((item) => item.tokenId));
  const inventory = STRAINS.filter((item) => (state.grams[item.id] ?? 0) > 0);
  const ready = state.positions.filter((p) => {
    const plot = state.plots.find((item) => item.id === p.plotId), credential = state.nfts.find((item) => item.tokenId === p.nftId);
    return plot && credential && getPositionMetrics(p, credential, plot, now).mature;
  }).length;
  const avatar = state.nfts.find(item => item.tokenId === state.farmerAvatarId) ?? state.nfts[0];
  const crops: CropVisual[] = Array.from({ length: WORLD_PAGE_SIZE }, (_, index) => {
    const item = visibleSlots[index]; const credential = state.nfts.find((entry) => entry.tokenId === item?.position?.nftId);
    const m = item?.position && credential ? getPositionMetrics(item.position, credential, item.plot, now) : undefined;
    const color = ['#b6bd77', '#b798bd', '#d1b57b', '#9dbbaa'][(credential?.tokenId ?? 0) % 4];
    return { occupied: Boolean(item?.position), available: Boolean(item), progress: m?.progress ?? 0, water: m?.waterLevel ?? 100, failed: m?.failed ?? false, color };
  });
  const latest = useRef({ crops, panel, blocked, selectedBed, visibleSlots, avatar });
  latest.current = { crops, panel, blocked, selectedBed, visibleSlots, avatar };

  function showPanel(next: Panel) { keys.current.clear(); route.current = []; pending.current = null; setWalkingTo(''); setPanel(next); }
  useEffect(() => { showPanel(farmPanelForPath(props.route)); }, [props.route]);
  useDialogFocus(panelRef, Boolean(panel) && !blocked, () => showPanel(null));

  function travel(destination: Destination, label: string) {
    if (blocked) return;
    setPanel(null); keys.current.clear();
    const path = walkingPath(actor.current, destination.point);
    if (Math.hypot(actor.current.x-destination.point.x, actor.current.y-destination.point.y) < 24 || !path.length) {
      if (!path.length && Math.hypot(actor.current.x-destination.point.x, actor.current.y-destination.point.y) >= 24) { setWalkingTo('That spot is blocked. Try the path beside it.'); return; }
      if (destination.bed !== undefined) setSelectedBed(destination.bed);
      showPanel(destination.panel); return;
    }
    route.current = path; pending.current = destination; setWalkingTo(label ? `Walking to ${label}...` : '');
    stage.current?.focus();
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const background = createFarmBackground();
    const c = canvas.current?.getContext('2d');
    if (!c) return;
    let frame = 0, previous = 0, tick = 0;
    const nearest = () => {
      const beds = Array.from({ length: 12 }, (_, index) => { const p = bedPoint(index); return { label: latest.current.visibleSlots[index] ? `Bed ${index + 1}` : 'Uncleared bed', point: { x: p.x + 28, y: p.y + 54 }, panel: (latest.current.visibleSlots[index] ? 'bed' : 'expansion') as Panel, bed: index }; });
      const places = [...LANDMARKS.map((item) => ({ label: item.label, point: item.approach, panel: item.id as Panel, bed: undefined as number | undefined })), ...beds];
      return places.map((item) => ({ ...item, distance: Math.hypot(actor.current.x-item.point.x, actor.current.y-item.point.y) })).sort((a,b) => a.distance-b.distance)[0];
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (latest.current.blocked) return;
      if (event.key === 'Escape') { setPanel(null); keys.current.clear(); stage.current?.focus(); return; }
      if (event.target instanceof HTMLElement && (event.target.matches('input,select,textarea,button') || event.target.isContentEditable)) return;
      if (latest.current.panel) return;
      const key = event.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) { event.preventDefault(); keys.current.add(key); route.current=[]; pending.current=null; setWalkingTo(''); }
      if (key === 'e') { const place = nearest(); if (place.distance < 62) { if (place.bed !== undefined) setSelectedBed(place.bed); setPanel(place.panel); keys.current.clear(); } }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const clear = () => { keys.current.clear(); route.current=[]; pending.current=null; };
    const save = () => { try { localStorage.setItem(PLAYER_STORAGE, JSON.stringify(actor.current)); } catch { /* Gameplay continues if browser storage is unavailable. */ } };
    const render = (time: number) => {
      const delta = Math.min((time-previous)/1000 || 0, .05); previous=time;
      let moving = false;
      if (!latest.current.panel && !latest.current.blocked && !document.hidden) {
        let direction = { x: Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')), y: Number(keys.current.has('s') || keys.current.has('arrowdown')) - Number(keys.current.has('w') || keys.current.has('arrowup')) };
        const target = route.current[0];
        if (target && !direction.x && !direction.y) {
          const distance = Math.hypot(target.x-actor.current.x,target.y-actor.current.y);
          if (distance < 3) { actor.current={...target}; route.current.shift(); if (!route.current.length && pending.current) { const destination = pending.current; if (destination.bed !== undefined) setSelectedBed(destination.bed); setPanel(destination.panel); pending.current=null; setWalkingTo(''); } }
          else direction={ x:target.x-actor.current.x, y:target.y-actor.current.y };
        }
        if (direction.x || direction.y) { const distance = target && !keys.current.size ? Math.min(106*delta,Math.hypot(direction.x,direction.y)) : 106*delta; const next = walkStep(actor.current,direction,distance); moving=next.x!==actor.current.x || next.y!==actor.current.y; actor.current=next; facing.current=direction; }
      }
      drawFarm(c,background,{player:actor.current,facing:facing.current,farmerId:latest.current.avatar?.tokenId??1,farmerLevel:farmerLevel(latest.current.avatar?.xp??0),walking:moving,time:reducedMotion?0:time,crops:latest.current.crops,selected:latest.current.panel==='bed'?latest.current.selectedBed:-1,destination:route.current.at(-1)});
      if(time-tick>200){ const place=nearest();setNearby(place.distance<62?place.label:'');tick=time; }
      frame=requestAnimationFrame(render);
    };
    frame=requestAnimationFrame(render);
    window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',clear);window.addEventListener('pagehide',save);
    const saveTimer=window.setInterval(save,5000);
    return () => { cancelAnimationFrame(frame);clearInterval(saveTimer);save();window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',clear);window.removeEventListener('pagehide',save); };
  }, []);

  const titles: Record<Exclude<Panel,null>,string> = { bed: position ? growingStrain?.name ?? 'Growing crop' : 'A little room to grow', vault:'The farmer lodge', market:'The farm market', expansion:'Put down more roots', journal:'Your farm journal', help:'Make yourself at home' };
  return <main className="farm-app">
    <header className="farm-header"><button className="farm-brand" onClick={() => showPanel(null)}><span><Leaf size={23}/></span><div><strong>WEED HUSTLE</strong><small>A LITTLE GREEN EMPIRE</small></div></button><div className="farm-wallet"><span><Coins size={17}/><b>{formatNumber(state.hcBalance,0)}</b><small>HC</small></span><span className="farm-eth">{state.ethBalance.toFixed(3)} <small>demo ETH</small></span><button onClick={() => showPanel('journal')} aria-label="Open farm journal"><BookOpen size={19}/></button><button onClick={() => showPanel('help')} aria-label="How to play"><HelpCircle size={19}/></button></div></header>
    <div className="farm-session"><span><i/> Saved in this browser · local game</span><span>{FAST_TIME_ENABLED?'Playtest pace: 6 seconds per checkpoint':'Growing continues while you are away'}</span></div>
    <section className="farm-layout">
      <div className="farm-world-column">
        <div className="farm-world-heading"><div><span>YOUR HOMESTEAD</span><h1>Grow your own kind of good.</h1></div><span className="farm-weather">☀ <span>Late summer<small>{currentSeason(now).id} · {state.seasonXp} XP</small></span></span></div>
        <div className="farm-stage" ref={stage} tabIndex={0} aria-label="Farm world. Use WASD or arrow keys to walk, E to interact, or click a place." onPointerDown={() => stage.current?.focus()}>
          <canvas ref={canvas} width={WORLD_WIDTH} height={WORLD_HEIGHT} aria-label="Pixel-art homestead with garden beds, a greenhouse, a market stall and a pond" onClick={(event) => { const box=event.currentTarget.getBoundingClientRect();const point={x:(event.clientX-box.left)/box.width*WORLD_WIDTH,y:(event.clientY-box.top)/box.height*WORLD_HEIGHT};travel({point,panel:null},''); }}/>
          <div className="farm-place-tags">{LANDMARKS.map((place) => <button key={place.id} style={positionStyle(place.x,place.y)} onClick={() => travel({point:place.approach,panel:place.id},place.label)}>{place.id==='vault'?<Sprout size={13}/>:place.id==='market'?<ShoppingBasket size={13}/>:place.id==='journal'?<Home size={13}/>:<Maximize2 size={13}/>} {place.label}</button>)}</div>
          <div className="farm-bed-hotspots">{Array.from({length:12},(_,index)=>{const point=bedPoint(index);const item=visibleSlots[index];return <button key={index} style={{...positionStyle(point.x,point.y),width:`${56/WORLD_WIDTH*100}%`,height:`${43/WORLD_HEIGHT*100}%`}} aria-label={item?`Bed ${index+1}: ${item.position?STRAINS.find(s=>s.id===item.position!.strainId)?.name:'empty'}`:`Expand into bed ${index+1}`} onClick={() => travel({point:{x:point.x+28,y:point.y+54},panel:item?'bed':'expansion',bed:index},`bed ${index+1}`)}/>;})}</div>
          {!state.walletConnected && <div className="farm-welcome"><span className="farm-kicker">WELCOME TO YOUR LITTLE PATCH</span><h2>From one seed.<br/>To something yours.</h2><p>Meet your farmers. Tend your garden.<br/>Build a farm at your own pace.</p><button className="farm-primary" onClick={connectWallet}><Sprout size={16}/> Start playing</button><small>Free local demo. No wallet connection required.</small></div>}
          <div className="farm-map-caption"><span><Leaf size={12}/> Cedar Hollow · {slots.length} growing spots</span>{pages>1&&<div><button aria-label="Previous field" disabled={safePage===0} onClick={()=>{setPage(safePage-1);setSelectedBed(0);showPanel(null);}}><ChevronLeft size={14}/></button><span>Field {safePage+1}/{pages}</span><button aria-label="Next field" disabled={safePage>=pages-1} onClick={()=>{setPage(safePage+1);setSelectedBed(0);showPanel(null);}}><ChevronRight size={14}/></button></div>}</div>
        </div>
        <div className="farm-controls"><span aria-live="polite">{walkingTo || (nearby ? <><kbd>E</kbd> {nearby}</> : <><kbd>W A S D</kbd> Walk <b>·</b> Click to explore</>)}</span><span className="farm-autosave"><Check size={12}/> Auto-saved</span></div>
        <nav className="farm-toolbelt" aria-label="Farm tools">{[{id:null,label:'Explore',icon:Home},{id:'bed',label:'Grow',icon:Sprout},{id:'vault',label:'Farmers',icon:Flower2},{id:'market',label:'Market',icon:ShoppingBasket},{id:'expansion',label:'Expand',icon:Maximize2},{id:'journal',label:'Journal',icon:BookOpen}].map((tool,index)=><button key={tool.label} className={panel===tool.id?'active':''} onClick={()=>showPanel(tool.id as Panel)}><small>{index+1}</small><tool.icon size={21}/><span>{tool.label}</span></button>)}</nav>
        <div className="farm-touch-pad" aria-label="Touch movement">{[{key:'w',label:'Walk up',icon:ArrowUp},{key:'a',label:'Walk left',icon:ArrowLeft},{key:'s',label:'Walk down',icon:ArrowDown},{key:'d',label:'Walk right',icon:ArrowRight}].map(item=><button key={item.key} aria-label={item.label} onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);if(!blocked){showPanel(null);keys.current.add(item.key);}}} onPointerUp={()=>keys.current.clear()} onPointerCancel={()=>keys.current.clear()}><item.icon size={20}/></button>)}</div>
      </div>
      <aside className="farm-sidebar">
        <section className="farm-note"><span className="farm-kicker">YOUR FARMER</span>{avatar&&<div className="farmer-avatar-summary"><FarmerArt tokenId={avatar.tokenId} traits={getAccessCatalogEntry(avatar.tokenId)!} xp={avatar.xp} size={64}/><span><strong>Farmer #{avatar.tokenId}</strong><small>Level {farmerLevel(avatar.xp)} / {farmerTitle(avatar.xp)}</small></span></div>}<h2>Your corner<br/>of the world.</h2><p>A seed, a little care, and room to grow. Every farmer has a strain specialty and a story to grow.</p><div className="farm-mini-stats"><span><b>{state.nfts.length}<small> / 420</small></b>Farmers held</span><span><b>{state.positions.length}<small> / {slots.length}</small></b>Growing now</span></div><button className="farm-text-button" onClick={()=>showPanel('vault')}>Meet your farmers <ArrowRight size={15}/></button></section>
        <section className="farm-today"><span className="farm-kicker">AROUND THE FARM</span><button onClick={()=>{const index=slots.findIndex(item=>item.position&&ready>0&&state.positions.some(p=>p.id===item.position?.id&&getPositionMetrics(p,state.nfts.find(n=>n.tokenId===p.nftId)!,item.plot,now).mature));if(index>=0){setPage(Math.floor(index/12));setSelectedBed(index%12);}showPanel('bed');}}><span className="farm-small-icon"><Wheat size={18}/></span><span><strong>{ready?`${ready} ready to harvest`:'Watch your garden grow'}</strong><small>{ready?'Your hard work is ready to gather.':'Check in on your growing beds.'}</small></span><ChevronRight size={16}/></button><button onClick={()=>showPanel('market')}><span className="farm-small-icon"><ShoppingBasket size={18}/></span><span><strong>The market is open</strong><small>{orders.length} orders waiting at the stall.</small></span><ChevronRight size={16}/></button><button onClick={()=>showPanel('expansion')}><span className="farm-small-icon"><Maximize2 size={18}/></span><span><strong>A little more room?</strong><small>Make space for your next discovery.</small></span><ChevronRight size={16}/></button></section>
        <div className="farm-collection-note"><Sprout size={28}/><p><strong>420 farmers. Your story.</strong><span>Discover the full collection, including 93 numbered phenotype variants.</span></p></div>
        <button className="farm-grow-art" onClick={()=>showPanel('bed')}><span className="farm-grow-emblem" aria-hidden="true"><Sprout size={38}/><Leaf size={24}/></span><span><strong>Good roots. Loud harvests.</strong><small>Step into your grow</small><ArrowRight size={15}/></span></button>
      </aside>
    </section>
    <footer className="farm-footer"><span>WEED HUSTLE <b>✿</b> GROW SOMETHING GOOD.</span><span>Game items only · no cash value</span></footer>

    {panel && <div className="farm-panel-backdrop" onClick={()=>showPanel(null)}><section ref={panelRef} className={`farm-panel farm-panel-${panel}`} role="dialog" aria-modal="true" aria-label={titles[panel]} onClick={event=>event.stopPropagation()}><header><div><span className="farm-kicker">CEDAR HOLLOW / {panel==='bed'?'THE GARDEN':panel.toUpperCase()}</span><h2>{titles[panel]}</h2></div><button autoFocus aria-label="Close farm panel" onClick={()=>{showPanel(null);stage.current?.focus();}}><X size={20}/></button></header>
      <div className="farm-panel-content">
        {panel==='bed' && <><figure className="farm-growth-art"><img src={growthArt} alt="Hemp growth stages: seedling, leafy plant, flowering and mature buds"/><figcaption>FROM SEED TO SOMETHING LOUD</figcaption></figure>{!slot?<div className="farm-empty"><Sprout size={36}/><h3>Room for a new beginning</h3><p>Acquire a growing spot to start your garden.</p><button className="farm-primary" onClick={()=>showPanel('expansion')}>Explore land</button></div>:<><div className="farm-bed-switcher">{visibleSlots.map((item,index)=><button key={item.key} className={index===selectedBed?'selected':''} onClick={()=>setSelectedBed(index)} aria-label={`Select bed ${index+1}`}><Sprout size={15}/>{index+1}{item.position&&<i/>}</button>)}</div><p className="farm-muted">Bed {selectedBed+1} · {PLOT_TIERS[slot.plot.tier].label} #{slot.plot.id}</p>
          {position && metrics ? <><div className="farm-growing-hero"><Sprout size={56}/><div><span className="farm-kicker">{metrics.failed?'CROP FAILED':metrics.mature?'READY TO GATHER':metrics.health.toUpperCase()}</span><h3>{growingStrain?.name}</h3><p>{metrics.failed?'Clear this bed to release your farmer. No harvest or new rewards.':metrics.mature?'Your harvest is ready.':`${formatCountdown(metrics.endsAt-now)} until harvest`}</p></div></div><p className="farm-muted" role="status">{metrics.failed?'Your farmer and earned XP are safe. This crop cannot be revived.':!position.autoWater&&!metrics.mature?`Crop health: ${metrics.health}. Water before ${formatCountdown(metrics.rescueSteps*(FAST_TIME_ENABLED?6000:21600000)-(now-position.startedAt)%(FAST_TIME_ENABLED?6000:21600000))} to prevent failure.`:'Protected from neglect.'}</p><div className="farm-growth-track"><span style={{width:`${metrics.progress*100}%`}}/></div><div className="farm-stage-labels"><span>Seedling</span><span>Vegetative</span><span>Flowering</span><span>Harvest</span></div><div className="farm-detail-grid"><div><small>Growth</small><b>{Math.round(metrics.progress*100)}%</b></div><div><small>Water</small><b>{Math.round(metrics.waterLevel)}%</b></div><div><small>Accrued crop</small><b>{formatNumber(metrics.playerMatured)}g</b></div></div><p className="farm-muted">{position.autoWater?'Automatic watering is funded for this crop.':'Manual watering costs 40 HC when the crop needs care.'}</p><div className="farm-action-row"><button className="farm-secondary" disabled={position.autoWater||metrics.waterLevel>=100||state.hcBalance<40||metrics.mature||metrics.failed} onClick={()=>careForPosition(position)}><Droplets size={16}/> Water · 40 HC</button><button className="farm-primary" disabled={!metrics.mature&&!metrics.failed} onClick={()=>closePosition(position)}><Wheat size={16}/> {metrics.failed?'Clear failed crop':metrics.mature?'Harvest crop':'Still growing'}</button></div>{!metrics.mature&&!metrics.failed&&<button className="farm-text-button" onClick={()=>closePosition(position)}>Review early harvest (reduced payout)</button>}</>:
          <><p>Choose an available farmer from your collection. Each farmer grows their specialty and tends one bed at a time.</p>{available.length ? <><label className="farm-label">Your farmer<select value={nft?.tokenId??0} onChange={event=>setTokenId(Number(event.target.value))}>{available.map(item=><option key={item.tokenId} value={item.tokenId}>#{item.tokenId} · {getNftStrain(item.tokenId)?.name} · {item.rarity}</option>)}</select></label>{nft&&strain&&<div className="farm-chosen-seed"><FarmerArt tokenId={nft.tokenId} traits={getAccessCatalogEntry(nft.tokenId)!} xp={nft.xp}/><div><span className="farm-kicker">{nft.rarity} / #{nft.tokenId}</span><h3>{strain.name}</h3><p>{strain.playstyle}</p></div></div>}<label className="farm-label">Growing time<select value={duration} onChange={event=>setDuration(event.target.value as DurationKey)}>{Object.entries(DURATION_PRESETS).map(([id,item])=><option key={id} value={id}>{FAST_TIME_ENABLED?`${item.steps*6} seconds (playtest)` : item.label} · {item.maturityMultiplier.toFixed(2)}x maturity</option>)}</select></label><label className="farm-checkbox"><input type="checkbox" checked={autoWater} onChange={event=>setAutoWater(event.target.checked)}/><span><strong>Let the irrigation take care of it</strong><small>{DURATION_PRESETS[duration].steps*10} HC reserved · unused water refunded</small></span></label><div className="farm-preview-total"><span>Estimated harvest</span><b>{nft&&strain?formatNumber(projectedMatureYield(nft,slot.plot,strain.id,duration)):'0'}g</b></div><p className="farm-muted">Maturity reward: {DURATION_PRESETS[duration].steps*50} XP (up to the level cap) + {DURATION_PRESETS[duration].steps*25} HC. {state.autoHarvest!==false?'Automatic collection is on.':'Manual collection is on.'}</p><small className="farm-muted">Gameplay estimate. Opening costs 0.000001 demo ETH. Manual harvesting has the same fee; automatic collection is fee-free.</small><button className="farm-primary farm-full" disabled={!state.walletConnected||!nft||!strain||state.ethBalance<.000001||(autoWater&&state.hcBalance<DURATION_PRESETS[duration].steps*10)} onClick={()=>nft&&strain&&openPosition(slot.plot,nft,strain,duration,'owner',autoWater,slot.number-1)}><Sprout size={17}/> Plant this seed</button></>:<div className="farm-empty"><Flower2 size={36}/><h3>No available active farmers</h3><p>Harvest an occupied NFT or activate another farmer in your vault.</p><button className="farm-primary" onClick={()=>showPanel('vault')}>Open farmer lodge</button></div>}</>}
        </>}</>}
        {panel==='vault' && <><p>Your farmers, their specialties, and every level earned. Select a farmer to see their stats or choose your avatar.</p><div className="farm-vault-top"><button className={ownedOnly?'selected':''} onClick={()=>{setOwnedOnly(true);setVaultPage(0);}}>My farmers ({state.nfts.length})</button><button className={!ownedOnly?'selected':''} onClick={()=>{setOwnedOnly(false);setVaultPage(0);}}>All 420 farmers</button></div><div className="farm-filters"><label><Search size={16}/><input aria-label="Search strains" placeholder="Find a strain, family or number..." value={query} onChange={event=>{setQuery(event.target.value);setVaultPage(0);}}/></label><select aria-label="Filter by rarity" value={rarity} onChange={event=>{setRarity(event.target.value);setVaultPage(0);}}><option>All</option>{ACCESS_RARITY_ORDER.map(item=><option key={item}>{item}</option>)}</select></div>
          {seed&&<div className="farm-seed-detail"><button aria-label="Close farmer details" onClick={()=>setSelectedSeed(null)}><X size={15}/></button><FarmerArt tokenId={seed.id} traits={seed} xp={ownedSeed?.xp??0}/><div><span className="farm-kicker">#{seed.id} / {seed.rarity}{seed.is_pheno?' / PHENOTYPE':''}</span><h3>{seed.name}</h3><p>{seed.type} · {seed.yield_band} yield · {seed.value_tier} value</p><small>Generated game traits, not verified laboratory data.</small>{ownedSeed&&<div className="farmer-progression"><div className="farm-detail-grid"><div><small>Rarity output</small><b>{RARITIES[ownedSeed.rarity].multiplier.toFixed(2)}x</b></div><div><small>XP output bonus</small><b>+{Math.round((xpBonus(ownedSeed.xp)-1)*100)}%</b></div><div><small>Status</small><b>{assigned.has(seed.id)?'Growing':ownedSeed.activated?'Ready':'Inactive'}</b></div></div><strong>Level {farmerLevel(ownedSeed.xp)} / 50 / {farmerTitle(ownedSeed.xp)}</strong><div className="farm-growth-track"><span style={{width:`${ownedSeed.xp>=MAX_FARMER_XP?100:(ownedSeed.xp%XP_PER_LEVEL)/XP_PER_LEVEL*100}%`}}/></div><small>{ownedSeed.xp} XP / {ownedSeed.xp>=MAX_FARMER_XP?'Maximum level':`${XP_PER_LEVEL-ownedSeed.xp%XP_PER_LEVEL} XP to next level`}</small><button className="farm-secondary" onClick={()=>equipFarmer(seed.id)} disabled={state.farmerAvatarId===seed.id}>Use as my farmer</button></div>}{ownedSeed?(ownedSeed.activated?<p className="farm-positive">{assigned.has(seed.id)?'Growing in a bed':'Active and ready to plant'}</p>:<button className="farm-primary" disabled={!state.walletConnected||state.hcBalance<ACTIVATION_COST} onClick={()=>activateNft(ownedSeed)}>Activate · {formatNumber(ACTIVATION_COST,0)} HC</button>):<p className="farm-muted">Not held in your current collection.</p>}</div></div>}
          <div className="farm-seed-grid">{seedResults.slice(safeVaultPage*12,safeVaultPage*12+12).map(entry=><button key={entry.id} className={selectedSeed===entry.id?'selected':''} onClick={()=>setSelectedSeed(entry.id)}><span className="farm-seed-number">#{String(entry.id).padStart(3,'0')}{ownedIds.has(entry.id)&&<Check size={12}/>}</span><FarmerArt tokenId={entry.id} traits={entry} xp={state.nfts.find(item=>item.tokenId===entry.id)?.xp??0}/><strong>{entry.name}</strong>{ownedIds.has(entry.id)&&<small>Level {farmerLevel(state.nfts.find(item=>item.tokenId===entry.id)!.xp)} / {state.nfts.find(item=>item.tokenId===entry.id)!.xp} XP</small>}<small>{entry.rarity}{entry.is_pheno?' · phenotype':''}</small></button>)}</div>{!seedResults.length&&<p className="farm-empty">No farmers match this search. Try another name or rarity.</p>}<div className="farm-pagination"><span>{seedResults.length} farmers · page {safeVaultPage+1} of {seedPages}</span><button aria-label="Previous farmer page" disabled={safeVaultPage===0} onClick={()=>setVaultPage(safeVaultPage-1)}><ChevronLeft size={17}/></button><button aria-label="Next farmer page" disabled={safeVaultPage>=seedPages-1} onClick={()=>setVaultPage(safeVaultPage+1)}><ChevronRight size={17}/></button></div><p className="farm-muted">The collection includes 93 numbered phenotype variants. Holdings shown here are your saved demo collection. Live wallet holdings are not connected yet.</p></>}
        {panel==='market' && <><p>Sell your harvested crop to simulated customers: a walk-in buyer, a returning customer, and a wholesaler. These are game orders, not other players. Deliveries exchange inventory for HC game credits. Orders refresh at midnight UTC and each has a daily limit.</p><div className="farm-market-orders">{orders.map(order=>{const remaining=Math.max(0,order.targetGrams-(state.orderFills[order.id]??0));const amount=Math.floor(Math.min(remaining,state.grams[order.strainId]??0)*10)/10;return <article key={order.id}><span className="farm-kicker">{{street:'Walk-in buyer',regular:'Returning customer',wholesaler:'Wholesaler',kingpin:'Crew buyer'}[order.customer]} / NPC</span><h3>{STRAINS.find(item=>item.id===order.strainId)?.name}</h3><p>{formatNumber(remaining,1)}g needed · {formatNumber(order.unitPrice)} HC / g</p><button className="farm-primary" disabled={!state.walletConnected||amount<=0} onClick={()=>fulfillOrder(order,amount)}>{remaining<=0?<><Check size={14}/> Order filled</>:amount>0?`Sell ${amount}g · ${formatNumber(amount*order.unitPrice)} HC`:'Grow this strain to deliver'}</button></article>;})}</div><h3 className="farm-section-title">In your basket</h3>{inventory.length?<div className="farm-inventory">{inventory.map(item=><div key={item.id}><span><Leaf size={15}/>{item.name}</span><b>{formatNumber(state.grams[item.id])}g</b></div>)}</div>:<div className="farm-empty"><ShoppingBasket size={34}/><p>Your first harvest will appear here.</p></div>}</>}
        {panel==='expansion' && <><p>More space for more stories. Your farm currently has <strong>{slots.length} growing spots</strong>. New capacity appears in the garden, with extra fields as you expand.</p><div className="farm-land-grid">{ALPHA_PLOT_TIERS.map((key,index)=>{const tier=PLOT_TIERS[key];return <article key={key}><span className="farm-land-illustration">{Array.from({length:Math.min(index+1,4)},(_,i)=><Sprout key={i} size={25+i*3}/>)}</span><span className="farm-kicker">{tier.slots} GROWING {tier.slots===1?'SPOT':'SPOTS'}</span><h3>{tier.label}</h3><p>+{Math.round((tier.yieldBonus-1)*100)}% crop output</p><button className="farm-primary" disabled={!state.walletConnected||state.ethBalance<tier.priceEth} onClick={()=>buyPlot(key)}>{tier.priceEth.toFixed(3)} demo ETH</button></article>;})}</div><p className="farm-muted">Land purchases use your local demo balance. No real transaction takes place.</p></>}
        {panel==='journal' && <><section className="farmer-rewards"><span className="farm-kicker">TIME-LOCKED REWARDS</span><h3>Grow. Complete. Level up.</h3><p>Each completed checkpoint earns 50 farmer XP and 25 HC when the entire growing term matures. Early exits and failed crops earn no XP or maturity HC. Manual crops wilt after 24 hours without water and fail after 48 hours during growth; irrigation protects them. Playtest times are compressed. Farmer level caps at 50, with a maximum 20% experience bonus.</p><label className="farm-checkbox"><input type="checkbox" checked={state.autoHarvest!==false} onChange={event=>setAutoHarvest(event.target.checked)}/><span><strong>Automatically collect mature crops</strong><small>Settles while this demo is open and when you return. Also clears failed crops. No repeat planting.</small></span></label><p><strong>{formatNumber(state.lifetimeHarvestHC??0,0)} HC</strong> earned from mature harvests.</p><small>Rewards and progress are saved in this browser. Live blockchain rewards are not connected yet.</small></section><div className="farm-journal-intro"><BookOpen size={38}/><p>A little progress, every visit.<br/><strong>This is how a homestead becomes yours.</strong></p></div><ol className="farm-quest-list">{[{title:'Make yourself at home',body:'Start your local game and explore the clearing.',done:state.walletConnected},{title:'Put down roots',body:'Plant an active NFT in an empty garden bed.',done:state.farmMilestones?.planted||state.positions.length>0||state.activity.some(item=>item.title.includes('harvested'))},{title:'Your first harvest',body:'Tend a crop until it matures, then gather it.',done:state.farmMilestones?.harvested||state.activity.some(item=>item.title.includes('harvested'))},{title:'From garden to market',body:'Deliver harvested inventory to a daily order.',done:state.farmMilestones?.delivered||Object.values(state.orderFills).some(value=>value>0)},{title:'Room for something new',body:'Buy an additional plot at the land office.',done:state.farmMilestones?.expanded||state.plots.filter(item=>item.owned).length>2}].map((quest,index)=><li key={quest.title} className={quest.done?'done':''}><span>{quest.done?<Check size={17}/>:index+1}</span><div><strong>{quest.title}</strong><p>{quest.body}</p></div></li>)}</ol><h3 className="farm-section-title">Recently on the farm</h3><div className="farm-journal-log">{state.activity.slice(0,8).map(item=><div key={item.id}><small>{new Date(item.at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small><span><strong>{item.title}</strong><p>{item.detail}</p></span></div>)}</div></>}
        {panel==='help' && <><p>Welcome to Cedar Hollow. Your game saves automatically in this browser, and crops keep growing while you're away.</p><div className="farm-help-grid"><div><kbd>W A S D</kbd><h3>Take a walk</h3><p>Use the arrow keys, WASD, touch arrows, or click a clear spot on the ground.</p></div><div><kbd>E</kbd><h3>Say hello</h3><p>Interact near a bed or building. Clicking its label walks you there. The toolbar opens it directly.</p></div><div><Sprout size={25}/><h3>Plant your collection</h3><p>Select an active, available farmer NFT. Each farmer grows their specialty and earns XP at maturity. Irrigation can handle watering for you.</p></div><div><ShoppingBasket size={25}/><h3>Gather and trade</h3><p>Harvest a mature crop, then deliver matching inventory to an order. Spend game credits activating more farmers.</p></div></div><p className="farm-muted">{FAST_TIME_ENABLED?'This playtest compresses each six-hour checkpoint to six seconds.':'Each production checkpoint takes six hours.'} Escape closes a panel. All balances, purchases and discoveries are local simulations.</p></>}
      </div>
    </section></div>}
  </main>;
}
