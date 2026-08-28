import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Coins,
  Database,
  Droplets,
  ExternalLink,
  FlaskConical,
  Grid2X2,
  Hexagon,
  LandPlot,
  Leaf,
  LockKeyhole,
  Menu,
  PackageOpen,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  TimerReset,
  Trophy,
  UserRoundCheck,
  UsersRound,
  Wallet,
  Warehouse,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import landFarm from './assets/land-farm-ui.png';
import landHouse from './assets/land-house-ui.png';
import landPot from './assets/land-pot-ui.png';
import landRoom from './assets/land-room-ui.png';
import crewOperationHero from './assets/crew-operation-hero-ui.webp';
import crewOperationSeal from './assets/crew-operation-seal-ui.webp';
import demandDispatchHero from './assets/demand-dispatch-hero-ui.webp';
import growthProgression from './assets/growth-progression-ui.webp';
import pixelGrowRoom from './assets/pixel-grow-room-ui.png';
import {
  activeCrewOperation,
  CREW_COMPLETION_REPUTATION,
  CREW_COMPLETION_SXP,
  CREW_DEMO_MEMBERS,
  CREW_MILESTONES,
  CREW_PERSONAL_CAP_GRAMS,
  CREW_QUALIFIER_GRAMS,
  CREW_SEAL_ID,
  CREW_TARGET_GRAMS,
  crewAcceptedGrams,
  crewBinProgress,
  crewRewardEligible,
  crewTotalProgress,
  crewWeekWindow,
} from './data/crew';
import {
  ACTIVATION_COST,
  acceptedDeliveryAmount,
  ALPHA_PLOT_TIERS,
  currentSeason,
  CUSTOMERS,
  DURATION_PRESETS,
  getDailyContracts,
  PLOT_TIERS,
  PROTOCOL_FEE_ETH,
  RARITIES,
  STRAINS,
  WATER_COST_PER_STEP,
  WORKER_SHARE,
  type DemandContract,
  type Strain,
} from './data/economy';
import {
  AUGUST_26_FIXTURE,
  averageSessionMove,
  getIndicativeRegularSession,
  marketBreadth,
  rangePosition,
  sessionMove,
} from './data/market';
import { FAST_TIME_ENABLED, formatCountdown } from './lib/clock';
import {
  autoWaterReserve,
  elapsedSteps,
  formatNumber,
  getPositionMetrics,
  gramsPerStep,
  projectedMatureYield,
  xpBonus,
} from './lib/engine';
import { resetSimulation, useGameState } from './state/game';
import type { AccessNft, DurationKey, GameState, Plot, PlotTierKey, Position, ToastState } from './types';

type ConfirmState = {
  eyebrow: string;
  title: string;
  body: string;
  lines: Array<{ label: string; value: string; tone?: 'danger' | 'accent' }>;
  confirmLabel: string;
  onConfirm: () => void;
};

const navItems = [
  { path: '/', label: 'Overview', icon: Grid2X2 },
  { path: '/practice', label: 'Practice run', icon: Sparkles },
  { path: '/plant', label: 'Plant', icon: Sprout },
  { path: '/work', label: 'Go to work', icon: BriefcaseBusiness },
  { path: '/contracts', label: 'Demand board', icon: Store },
  { path: '/crew', label: 'Crew', icon: UsersRound },
  { path: '/access', label: 'Access NFTs', icon: Hexagon },
  { path: '/land', label: 'Land', icon: LandPlot },
  { path: '/market-lab', label: 'Market pulse', icon: BarChart3, lab: true },
];

const externalPlots: Plot[] = [
  { id: 8014, tier: 'closet', owned: false, owner: '0x92f1…4a6c', reliability: 97 },
  { id: 9132, tier: 'house', owned: false, owner: '0xa81e…72d0', reliability: 92 },
  { id: 7277, tier: 'farm', owned: false, owner: '0x18d3…0f95', reliability: 99 },
];

const LAND_ART: Partial<Record<PlotTierKey, string>> = {
  pot: landPot,
  closet: landRoom,
  room: landRoom,
  house: landHouse,
  farm: landFarm,
};

const LAND_DESCRIPTIONS: Partial<Record<PlotTierKey, string>> = {
  pot: 'A focused one-position start with no unused overhead.',
  room: 'Four positions for an active solo operator testing several contracts.',
  house: 'Eight positions for a mature operation or a small worker network.',
  farm: 'Capacity preview for a future large operation, hard-capped at 36 simultaneous positions.',
};

function createActivity(title: string, detail: string, kind: ToastState['kind'] = 'success') {
  return { id: `${Date.now()}-${Math.random()}`, at: Date.now(), title, detail, kind };
}

function routePath() {
  if (window.location.protocol === 'file:' || import.meta.env.PROD) return window.location.hash.slice(1) || '/';
  return window.location.pathname === '/index.html' ? '/' : window.location.pathname;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function plotPositions(state: GameState, plotId: number) {
  return state.positions.filter((position) => position.plotId === plotId);
}

function availableNfts(state: GameState) {
  const assigned = new Set(state.positions.map((position) => position.nftId));
  return state.nfts.filter((nft) => nft.activated && !assigned.has(nft.tokenId));
}

export default function App() {
  const { state, setState } = useGameState();
  const [path, setPath] = useState(routePath);
  const [now, setNow] = useState(Date.now());
  const [mobileNav, setMobileNav] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    const syncRoute = () => setPath(routePath());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const go = (next: string) => {
    if (window.location.protocol === 'file:' || import.meta.env.PROD) window.location.hash = next;
    else window.history.pushState({}, '', next);
    setPath(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notify = (title: string, body: string, kind: ToastState['kind'] = 'success') => setToast({ id: Date.now(), title, body, kind });
  const requireWallet = () => {
    if (state.walletConnected) return true;
    notify('Connect the simulation wallet', 'Practice is wallet-free; economic actions use the local demo provider.', 'warning');
    return false;
  };

  const connectWallet = () => {
    setState((current) => ({
      ...current,
      walletConnected: true,
      activity: [createActivity('Wallet connected', 'Local simulation provider connected. No real account was accessed.', 'info'), ...current.activity],
    }));
    notify('Simulation wallet connected', 'No network request or real account access occurred.', 'info');
  };

  const activateNft = (nft: AccessNft) => {
    if (!requireWallet() || state.hcBalance < ACTIVATION_COST) return;
    setConfirm({
      eyebrow: 'Permanent game utility',
      title: `Activate Access #${nft.tokenId}`,
      body: 'Activation unlocks Plant and Work utility. It is not an investment or yield promise.',
      lines: [
        { label: 'Activation', value: `${formatNumber(ACTIVATION_COST, 0)} HC`, tone: 'danger' },
        { label: 'Balance after', value: `${formatNumber(state.hcBalance - ACTIVATION_COST, 0)} HC` },
      ],
      confirmLabel: 'Confirm simulated activation',
      onConfirm: () => {
        setState((current) => ({
          ...current,
          hcBalance: current.hcBalance - ACTIVATION_COST,
          nfts: current.nfts.map((item) => item.tokenId === nft.tokenId ? { ...item, activated: true } : item),
          activity: [createActivity(`Access #${nft.tokenId} activated`, `${ACTIVATION_COST.toLocaleString()} HC removed from the local ledger.`), ...current.activity],
        }));
        setConfirm(null);
        notify('Access activated', 'It can now Plant or Go to Work.');
      },
    });
  };

  const buyPlot = (tierKey: PlotTierKey) => {
    if (!requireWallet()) return;
    const tier = PLOT_TIERS[tierKey];
    if (state.ethBalance < tier.priceEth) return;
    setConfirm({
      eyebrow: 'Simulated plot license',
      title: `Acquire ${tier.label}`,
      body: 'This adds functional grow capacity to the local simulation. No financial return is promised.',
      lines: [
        { label: 'Capacity', value: `${tier.slots} positions` },
        { label: 'Price', value: `${tier.priceEth.toFixed(3)} ETH`, tone: 'danger' },
      ],
      confirmLabel: 'Confirm simulated purchase',
      onConfirm: () => {
        const id = 6_000 + Math.floor(Math.random() * 3_000);
        setState((current) => ({
          ...current,
          ethBalance: current.ethBalance - tier.priceEth,
          plots: [...current.plots, { id, tier: tierKey, owned: true, owner: 'You', reliability: 100 }],
          activity: [createActivity(`Plot #${id} acquired`, `${tier.label} · ${tier.slots} simulated position slots.`), ...current.activity],
        }));
        setConfirm(null);
        notify('Plot added', 'New capacity is ready for planting.');
      },
    });
  };

  const openPosition = (plot: Plot, nft: AccessNft, strain: Strain, duration: DurationKey, mode: Position['mode'], autoWater: boolean) => {
    if (!requireWallet()) return;
    const positions = plotPositions(state, plot.id);
    if (positions.length >= PLOT_TIERS[plot.tier].slots) return notify('Plot is full', 'Choose another listing or release a position.', 'warning');
    const reserve = autoWater ? autoWaterReserve(duration) : 0;
    if (state.ethBalance < PROTOCOL_FEE_ETH || state.hcBalance < reserve) return notify('Insufficient simulated balance', 'Fund the protocol fee and selected water reserve first.', 'warning');
    const share = mode === 'worker' ? `${Math.round(WORKER_SHARE * 100)}% worker / ${Math.round((1 - WORKER_SHARE) * 100)}% owner` : '100% operator';
    setConfirm({
      eyebrow: mode === 'worker' ? 'Work contract' : 'Plant contract',
      title: `${mode === 'worker' ? 'Work' : 'Plant'} ${strain.name}`,
      body: 'Production runs continuously in six-hour checkpoints. No daily relock or market-hours gate applies.',
      lines: [
        { label: 'Position', value: `${PLOT_TIERS[plot.tier].label} #${plot.id}` },
        { label: 'Term', value: `${DURATION_PRESETS[duration].label} · ${DURATION_PRESETS[duration].maturityMultiplier.toFixed(2)}× completion` },
        { label: 'Split', value: share },
        { label: 'Auto-water reserve', value: `${reserve} HC`, tone: reserve ? 'danger' : undefined },
        { label: 'Open fee', value: `${PROTOCOL_FEE_ETH.toFixed(6)} ETH`, tone: 'danger' },
      ],
      confirmLabel: 'Open simulated position',
      onConfirm: () => {
        const position: Position = {
          id: `pos-${Date.now()}-${nft.tokenId}`,
          plotId: plot.id,
          nftId: nft.tokenId,
          strainId: strain.id,
          duration,
          mode,
          startedAt: Date.now(),
          snapshotXp: nft.xp,
          waterLevel: 100,
          waterStep: 0,
          careSteps: [0],
          autoWater,
          autoWaterReserveHC: reserve,
        };
        setState((current) => ({
          ...current,
          ethBalance: current.ethBalance - PROTOCOL_FEE_ETH,
          hcBalance: current.hcBalance - reserve,
          plots: current.plots.some((item) => item.id === plot.id) ? current.plots : [...current.plots, plot],
          positions: [...current.positions, position],
          activity: [createActivity(`${strain.name} ${mode === 'worker' ? 'work' : 'grow'} opened`, `${DURATION_PRESETS[duration].label} · plot #${plot.id} · ${share}.`), ...current.activity],
        }));
        setConfirm(null);
        notify('Position opened', 'The first production checkpoint settles after six hours.');
        go(`/positions/${position.id}`);
      },
    });
  };

  const careForPosition = (position: Position) => {
    const plot = state.plots.find((item) => item.id === position.plotId);
    if (!plot || position.autoWater || state.hcBalance < 40) return;
    const steps = elapsedSteps(position, now);
    setState((current) => ({
      ...current,
      hcBalance: current.hcBalance - 40,
      positions: current.positions.map((item) => item.id === position.id ? { ...item, waterLevel: 100, waterStep: steps, careSteps: [...item.careSteps, steps] } : item),
      activity: [createActivity('Manual care completed', `${position.id} restored to full water · 40 HC.`), ...current.activity],
    }));
    notify('Care complete', 'The current water taper has been reset.');
  };

  const closePosition = (position: Position) => {
    const plot = state.plots.find((item) => item.id === position.plotId);
    const nft = state.nfts.find((item) => item.tokenId === position.nftId);
    const strain = STRAINS.find((item) => item.id === position.strainId);
    if (!plot || !nft || !strain || state.ethBalance < PROTOCOL_FEE_ETH) return;
    const metrics = getPositionMetrics(position, nft, plot, now);
    const payout = metrics.mature ? metrics.playerMatured : metrics.earlyExitPayout;
    const ownerPayout = metrics.mature ? metrics.ownerMatured : metrics.ownerBase;
    const usedWater = position.autoWater ? metrics.completedSteps * WATER_COST_PER_STEP : 0;
    const refund = Math.max(0, position.autoWaterReserveHC - usedWater);
    setConfirm({
      eyebrow: metrics.mature ? 'Completed position' : 'Early exit settlement',
      title: metrics.mature ? `Harvest ${strain.name}` : `Exit ${strain.name} early`,
      body: metrics.mature ? 'The completion bonus is vested.' : 'Only current accrued base is affected; previously settled inventory is never touched.',
      lines: [
        { label: 'Player payout', value: `${formatNumber(payout)}g`, tone: 'accent' },
        ...(position.mode === 'worker' ? [{ label: 'Demo owner allocation', value: `${formatNumber(ownerPayout)}g` }] : []),
        ...(!metrics.mature ? [{ label: 'Early-exit share', value: '80% of player base', tone: 'danger' as const }] : []),
        { label: 'Unused water refund', value: `${refund} HC` },
        { label: 'Release fee', value: `${PROTOCOL_FEE_ETH.toFixed(6)} ETH`, tone: 'danger' },
      ],
      confirmLabel: metrics.mature ? 'Harvest and release' : 'Confirm early exit',
      onConfirm: () => {
        setState((current) => ({
          ...current,
          ethBalance: current.ethBalance - PROTOCOL_FEE_ETH,
          hcBalance: current.hcBalance + refund,
          grams: { ...current.grams, [strain.id]: (current.grams[strain.id] ?? 0) + payout },
          reputation: current.reputation + (metrics.mature ? 3 : 0),
          seasonXp: current.seasonXp + (metrics.mature ? 25 : 0),
          networkOwnerGrams: current.networkOwnerGrams + ownerPayout,
          nfts: current.nfts.map((item) => item.tokenId === nft.tokenId ? { ...item, xp: item.xp + metrics.xpEarned } : item),
          positions: current.positions.filter((item) => item.id !== position.id),
          activity: [createActivity(metrics.mature ? `${formatNumber(payout)}g harvested` : `${formatNumber(payout)}g early settlement`, `${strain.name} · +${metrics.xpEarned} Access XP${ownerPayout ? ` · ${formatNumber(ownerPayout)}g demo owner allocation` : ''}.`), ...current.activity],
        }));
        setConfirm(null);
        notify(metrics.mature ? 'Harvest complete' : 'Early exit settled', `${formatNumber(payout)}g moved to inventory.`);
        go('/');
      },
    });
  };

  const fulfillOrder = (order: DemandContract, amount: number) => {
    if (!requireWallet()) return;
    const filled = state.orderFills[order.id] ?? 0;
    const remaining = Math.max(0, order.targetGrams - filled);
    const available = state.grams[order.strainId] ?? 0;
    const accepted = acceptedDeliveryAmount(amount, remaining, available);
    if (accepted <= 0) return notify('Delivery unavailable', 'Enter a valid amount within both your inventory and the displayed remaining demand.', 'warning');
    const completed = filled + accepted >= order.targetGrams;
    const strain = STRAINS.find((item) => item.id === order.strainId)!;
    setConfirm({
      eyebrow: 'Finite demand settlement',
      title: `Fill ${order.title}`,
      body: 'This order has a hard daily capacity. Once filled, it cannot be repeated for unlimited HC.',
      lines: [
        { label: 'Delivery', value: `${formatNumber(accepted)}g ${strain.name}` },
        { label: 'Settlement', value: `+${formatNumber(accepted * order.unitPrice)} HC`, tone: 'accent' },
        { label: 'Order remaining', value: `${formatNumber(remaining - accepted)}g` },
        ...(completed ? [{ label: 'Completion', value: `+${order.reputationReward} reputation · +${order.seasonXpReward} season XP`, tone: 'accent' as const }] : []),
      ],
      confirmLabel: 'Confirm delivery',
      onConfirm: () => {
        setState((current) => {
          const liveOrder = getDailyContracts(Date.now()).find((item) => item.id === order.id);
          if (!liveOrder) return current;
          const currentFilled = current.orderFills[order.id] ?? 0;
          const currentRemaining = Math.max(0, liveOrder.targetGrams - currentFilled);
          const currentAvailable = current.grams[liveOrder.strainId] ?? 0;
          const finalAccepted = acceptedDeliveryAmount(accepted, currentRemaining, currentAvailable);
          if (finalAccepted <= 0) return current;
          const completesNow = currentFilled + finalAccepted >= liveOrder.targetGrams;
          return {
            ...current,
            hcBalance: current.hcBalance + finalAccepted * liveOrder.unitPrice,
            grams: { ...current.grams, [liveOrder.strainId]: Math.max(0, currentAvailable - finalAccepted) },
            orderFills: { ...current.orderFills, [liveOrder.id]: currentFilled + finalAccepted },
            reputation: current.reputation + (completesNow ? liveOrder.reputationReward : 0),
            seasonXp: current.seasonXp + (completesNow ? liveOrder.seasonXpReward : 0),
            activity: [createActivity(completesNow ? 'Contract completed' : 'Partial delivery recorded', `${liveOrder.title} · ${formatNumber(finalAccepted)}g · +${formatNumber(finalAccepted * liveOrder.unitPrice)} HC.`), ...current.activity],
          };
        });
        setConfirm(null);
        notify(completed ? 'Contract complete' : 'Delivery recorded', completed ? 'Reputation and season XP awarded.' : 'The remaining demand stays available today.');
      },
    });
  };

  const contributeCrew = (strain: Strain, requested: number) => {
    const operation = activeCrewOperation(state.crewOperation, now);
    const accepted = crewAcceptedGrams(operation, now, strain.id, requested, state.grams[strain.id] ?? 0);
    if (accepted <= 0) return notify('Contribution unavailable', 'Use a requested crop, enter a valid amount, and stay within the weekly personal and crew caps.', 'warning');
    const bin = crewBinProgress(operation, now).find((item) => item.strainId === strain.id)!;
    setConfirm({
      eyebrow: 'Local crew operation',
      title: `Contribute ${formatNumber(accepted)}g ${strain.name}`,
      body: 'This removes inventory and adds bounded local crew progress. It does not create HC, tokens, yield, or on-chain activity.',
      lines: [
        { label: 'Accepted contribution', value: `${formatNumber(accepted)}g` },
        { label: 'Crop bay remaining', value: `${formatNumber(Math.max(0, bin.remaining - accepted))}g` },
        { label: 'Personal cap remaining', value: `${formatNumber(Math.max(0, CREW_PERSONAL_CAP_GRAMS - operation.playerGrams - accepted))}g` },
      ],
      confirmLabel: 'Confirm contribution',
      onConfirm: () => {
        setState((current) => {
          const currentOperation = activeCrewOperation(current.crewOperation, now);
          const finalAccepted = crewAcceptedGrams(currentOperation, now, strain.id, accepted, current.grams[strain.id] ?? 0);
          if (finalAccepted <= 0) return current;
          return {
            ...current,
            grams: { ...current.grams, [strain.id]: Math.max(0, (current.grams[strain.id] ?? 0) - finalAccepted) },
            crewOperation: {
              ...currentOperation,
              playerGrams: currentOperation.playerGrams + finalAccepted,
              playerGramsByStrain: { ...currentOperation.playerGramsByStrain, [strain.id]: (currentOperation.playerGramsByStrain[strain.id] ?? 0) + finalAccepted },
              contributions: [{ id: `${now}-${strain.id}`, strainId: strain.id, grams: finalAccepted, createdAt: now }, ...currentOperation.contributions].slice(0, 20),
            },
            crewLifetimeContribution: current.crewLifetimeContribution + finalAccepted,
            activity: [createActivity('Crew operation contribution', `${formatNumber(finalAccepted)}g ${strain.name} · bounded local progress.`), ...current.activity],
          };
        });
        setConfirm(null);
        notify('Crew progress recorded', `${formatNumber(accepted)}g accepted. Account rewards remain locked until the weekly objective succeeds.`);
      },
    });
  };

  const claimCrewReward = () => {
    const operation = activeCrewOperation(state.crewOperation, now);
    if (!crewRewardEligible(operation, now)) return notify('Crew reward locked', 'Complete the weekly objective and contribute at least 10g to qualify.', 'warning');
    setConfirm({
      eyebrow: 'Weekly objective complete',
      title: 'Claim the Operation Seal',
      body: 'This is an account-bound simulation reward. It has no marketplace, yield, rarity, or monetary advantage.',
      lines: [
        { label: 'Season XP', value: `+${CREW_COMPLETION_SXP}`, tone: 'accent' },
        { label: 'Reputation', value: `+${CREW_COMPLETION_REPUTATION}`, tone: 'accent' },
        { label: 'Cosmetic', value: 'Operation Seal · non-transferable' },
      ],
      confirmLabel: 'Claim cosmetic reward',
      onConfirm: () => {
        setState((current) => {
          const currentOperation = activeCrewOperation(current.crewOperation, now);
          if (!crewRewardEligible(currentOperation, now)) return current;
          return {
            ...current,
            reputation: current.reputation + CREW_COMPLETION_REPUTATION,
            seasonXp: current.seasonXp + CREW_COMPLETION_SXP,
            crewOperation: { ...currentOperation, rewardClaimed: true },
            crewCosmetics: current.crewCosmetics.includes(CREW_SEAL_ID) ? current.crewCosmetics : [...current.crewCosmetics, CREW_SEAL_ID],
            crewStreak: current.crewStreak + 1,
            activity: [createActivity('Crew reward claimed', 'Operation Seal · +100 SXP · +10 reputation.'), ...current.activity],
          };
        });
        setConfirm(null);
        notify('Operation Seal unlocked', '+100 season XP and +10 reputation. Cosmetic only.');
      },
    });
  };

  const completePractice = () => {
    setState((current) => ({
      ...current,
      tutorialComplete: true,
      reputation: current.reputation + (current.tutorialComplete ? 0 : 10),
      seasonXp: current.seasonXp + (current.tutorialComplete ? 0 : 50),
      activity: [createActivity('Practice run completed', 'The full Plant, care, harvest, and contract loop is now unlocked.', 'info'), ...current.activity],
    }));
    notify('Practice complete', '+10 reputation · +50 season XP.');
    go('/plant');
  };

  const positionMatch = path.match(/^\/positions\/(.+)$/);
  const plantMatch = path.match(/^\/plant(?:\/(\d+))?$/);
  const context = { state, now, go, activateNft, buyPlot, openPosition, careForPosition, closePosition, fulfillOrder, contributeCrew, claimCrewReward, completePractice };
  let page: ReactNode;
  if (positionMatch) {
    const position = state.positions.find((item) => item.id === positionMatch[1]);
    page = position ? <PositionView {...context} position={position} /> : <NotFound go={go} />;
  } else if (path === '/practice') page = <PracticeView completePractice={completePractice} />;
  else if (plantMatch) page = <PlantView {...context} initialPlotId={plantMatch[1] ? Number(plantMatch[1]) : undefined} />;
  else if (path === '/work') page = <WorkView {...context} />;
  else if (path === '/contracts') page = <ContractsView {...context} />;
  else if (path === '/crew') page = <CrewView {...context} />;
  else if (path === '/access') page = <AccessView state={state} activateNft={activateNft} />;
  else if (path === '/land') page = <LandView {...context} />;
  else if (path === '/market-lab') page = <MarketLabView now={now} />;
  else page = <Dashboard {...context} />;

  const totalGrams = Object.values(state.grams).reduce((sum, value) => sum + value, 0);
  const season = currentSeason(now);

  return (
    <div className="app-shell">
      {FAST_TIME_ENABLED && <div className="qa-banner"><TimerReset size={15} /> TEST MODE — SIX-HOUR CHECKPOINTS COMPRESSED TO SIX SECONDS</div>}
      <div className="simulation-banner"><div><span className="status-dot" /> Local simulation — not connected to Robinhood Chain <span className="banner-divider" /> No deployed contracts · No real funds · No promised returns</div><div className="network-label"><ShieldCheck size={14} /> Economy v2</div></div>
      <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
        <button className="brand" onClick={() => go('/')}><span className="brand-mark"><Leaf size={20} /></span><span><strong>LOUD LEDGER</strong><small>GROWTH PROTOCOL</small></span></button>
        <nav><span className="nav-section">24/7 operation</span>{navItems.map((item) => {
          const active = item.path === '/' ? path === '/' : path.startsWith(item.path);
          return <button key={item.path} className={active ? 'nav-item active' : 'nav-item'} onClick={() => go(item.path)}><item.icon size={17} /><span>{item.label}</span>{item.lab && <small className="nav-lab-badge">LAB</small>}{active && <span className="active-pip" />}</button>;
        })}</nav>
        <div className="protocol-card"><div className="protocol-card-top"><Trophy size={15} /><span>{season.id} · Day {season.day}/{season.totalDays}</span></div><strong>{formatNumber(state.seasonXp, 0)} season XP</strong><p>Daily demand resets at 00:00 UTC. Ownership and Access XP do not.</p><div className="protocol-progress"><span style={{ width: `${(season.day / season.totalDays) * 100}%` }} /></div></div>
        <button className="reset-button" onClick={resetSimulation}><RotateCcw size={15} /> Reset economy v2</button>
      </aside>
      <main className="main-shell">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="topbar-metrics"><TopMetric label="Reputation" value={formatNumber(state.reputation, 0)} tone="positive" /><TopMetric label="Active positions" value={String(state.positions.length)} /><TopMetric label="Inventory" value={`${formatNumber(totalGrams)}g`} /></div>{state.walletConnected ? <button className="wallet-connected"><span className="network-dot" /><span><small>SIMULATED WALLET</small>{truncateAddress(state.address)}</span><ChevronRight size={16} /></button> : <button className="button primary compact" onClick={connectWallet}><Wallet size={16} /> Connect wallet</button>}</header>
        <div className="page-wrap">{page}</div>
      </main>
      {confirm && <ConfirmationDialog details={confirm} close={() => setConfirm(null)} />}
      {toast && <Toast toast={toast} close={() => setToast(null)} />}
      {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    </div>
  );
}

type ViewContext = {
  state: GameState;
  now: number;
  go: (path: string) => void;
  activateNft: (nft: AccessNft) => void;
  buyPlot: (tier: PlotTierKey) => void;
  openPosition: (plot: Plot, nft: AccessNft, strain: Strain, duration: DurationKey, mode: Position['mode'], autoWater: boolean) => void;
  careForPosition: (position: Position) => void;
  closePosition: (position: Position) => void;
  fulfillOrder: (order: DemandContract, amount: number) => void;
  contributeCrew: (strain: Strain, amount: number) => void;
  claimCrewReward: () => void;
  completePractice: () => void;
};

function TopMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="top-metric"><span>{label}</span><strong className={tone}>{value}</strong></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p></div>{action}</div>;
}

function Dashboard({ state, now, go }: ViewContext) {
  const contracts = getDailyContracts(now);
  const totalGrams = Object.values(state.grams).reduce((sum, value) => sum + value, 0);
  return <>
    {!state.tutorialComplete && <section className="onboarding-banner"><div><p className="eyebrow">Start here · no wallet required</p><h2>Learn the complete loop in three minutes.</h2><p>Practice Plant → Care → Harvest → Deliver before using any simulated balance.</p><button className="button primary" onClick={() => go('/practice')}><Sparkles size={16} /> Start practice run</button></div><img src={pixelGrowRoom} alt="Pixel-art indoor grow room with irrigation and control equipment" /></section>}
    <PageHeading eyebrow="24/7 operation" title="Run the grow, not the clock." description="Plant or work at any time. Six-hour checkpoints settle lazily, and Daily Demand refreshes at 00:00 UTC." action={<button className="button primary" onClick={() => go('/plant')}><Sprout size={16} /> Plant a position</button>} />
    <section className="hero-grid"><div className="balance-card"><div className="card-label"><Coins size={16} /> Treasury</div><div className="hero-number">{formatNumber(state.hcBalance, 0)} <small>HC</small></div><div className="balance-subrow"><span>Simulated ETH</span><strong>{state.ethBalance.toFixed(5)} ETH</strong></div><div className="balance-subrow"><span>Ready inventory</span><strong>{formatNumber(totalGrams)}g</strong></div><div className="balance-subrow"><span>Demo owner allocation</span><strong>{formatNumber(state.networkOwnerGrams)}g</strong></div><div className="micro-disclaimer">Closed-loop game credits. No redemption or financial return.</div></div><div className="pixel-hero-card"><img src={pixelGrowRoom} alt="Pixel-art automated grow room" /><div><span>ALWAYS-ON FARM</span><strong>Care is optional optimization.</strong><small>Auto-water protects players who sleep, work, or live outside ET.</small></div></div></section>
    <div className="section-heading"><div><h2>Active positions</h2><p>Each plot can now hold its actual configured slot capacity.</p></div><span className="count-chip">{state.positions.length} live</span></div>
    <section className="plot-grid">{state.positions.map((position) => <PositionCard key={position.id} position={position} state={state} now={now} onClick={() => go(`/positions/${position.id}`)} />)}{!state.positions.length && <button className="add-plot-card" onClick={() => go('/plant')}><span><Plus size={22} /></span><strong>Open your first position</strong><small>Plant on land or go to work</small></button>}</section>
    <section className="lower-grid"><div className="panel"><div className="panel-head"><div><p className="eyebrow">Finite daily demand</p><h2>Today’s contracts</h2></div><Store size={18} /></div><div className="compact-contracts">{contracts.map((order) => { const strain = STRAINS.find((item) => item.id === order.strainId)!; const remaining = order.targetGrams - (state.orderFills[order.id] ?? 0); return <button key={order.id} onClick={() => go('/contracts')}><span className="contract-risk">{order.risk}</span><strong>{strain.name}</strong><small>{formatNumber(Math.max(0, remaining))}g remaining · {formatNumber(order.unitPrice)} HC/g</small></button>; })}</div></div><div className="panel pacing-panel"><div className="panel-head"><div><p className="eyebrow">Prototype score</p><h2>Operator reputation</h2></div><Trophy size={18} /></div><p>Complete exact orders and contribute to crew objectives. Reputation is an account-bound score in this prototype; Access rarity and XP affect grow output.</p><div className="pacing-stat"><span>Current reputation</span><strong>{formatNumber(state.reputation, 0)}</strong></div><div className="pacing-stat"><span>Current crew week</span><strong>{formatNumber(activeCrewOperation(state.crewOperation, now).playerGrams)}g</strong></div><button className="text-link" onClick={() => go('/crew')}>Open crew operation <ArrowRight size={15} /></button></div></section>
  </>;
}

function PositionCard({ position, state, now, onClick }: { position: Position; state: GameState; now: number; onClick: () => void }) {
  const plot = state.plots.find((item) => item.id === position.plotId)!;
  const nft = state.nfts.find((item) => item.tokenId === position.nftId)!;
  const strain = STRAINS.find((item) => item.id === position.strainId)!;
  const metrics = getPositionMetrics(position, nft, plot, now);
  return <button className="plot-card" onClick={onClick}><div className="plot-card-top"><span className="tier-icon"><Sprout size={20} /></span><span className={`status-pill ${metrics.mature ? 'ready' : 'growing'}`}>{metrics.mature ? 'Ready' : 'Growing'}</span></div><div className="plot-id">{position.mode.toUpperCase()} · PLOT #{plot.id}</div><h3>{strain.name}</h3><p>{DURATION_PRESETS[position.duration].label} · Access #{nft.tokenId} · {position.autoWater ? 'Auto-water' : 'Manual care'}</p><div className="thin-progress"><span style={{ width: `${metrics.progress * 100}%` }} /></div><div className="plot-card-foot"><span>{metrics.completedSteps}/{metrics.totalSteps} checkpoints</span><ChevronRight size={17} /></div></button>;
}

function PracticeView({ completePractice }: { completePractice: () => void }) {
  const [step, setStep] = useState(0);
  const choices = [STRAINS[0], STRAINS[4], STRAINS[9]];
  const [strainId, setStrainId] = useState(choices[1].id);
  const strain = STRAINS.find((item) => item.id === strainId)!;
  return <><PageHeading eyebrow="Wallet-free tutorial" title="Practice the full grow loop." description="This accelerated run changes no balances and creates no transferable rewards." /><section className="practice-layout panel"><div className="practice-art"><img src={pixelGrowRoom} alt="Pixel-art grow room used for the practice simulation" /><span>SIMULATED PRACTICE BAY</span></div><div className="practice-flow"><div className="practice-steps"><span className={step >= 0 ? 'done' : ''}>1</span><i /><span className={step >= 1 ? 'done' : ''}>2</span><i /><span className={step >= 2 ? 'done' : ''}>3</span></div>{step === 0 && <><p className="eyebrow">01 · Choose</p><h2>Select a crop for visible demand</h2><p>Each strain now trades production volume against contract price.</p><div className="practice-choice-grid">{choices.map((item) => <button key={item.id} className={strainId === item.id ? 'selected' : ''} onClick={() => setStrainId(item.id)}><strong>{item.name}</strong><small>{item.playstyle}</small></button>)}</div><button className="button primary" onClick={() => setStep(1)}>Plant practice crop <ArrowRight size={15} /></button></>}{step === 1 && <><p className="eyebrow">02 · Care</p><h2>Fund auto-water or optimize manually</h2><p>The safe default protects the position. Manual care can save HC but never requires an alarm-clock check-in.</p><div className="practice-result"><Droplets size={26} /><div><strong>Auto-water selected</strong><span>10 HC per completed checkpoint · unused reserve refunded</span></div></div><button className="button primary" onClick={() => setStep(2)}>Advance checkpoint <ArrowRight size={15} /></button></>}{step === 2 && <><p className="eyebrow">03 · Deliver</p><h2>Finite contract completed</h2><p>{strain.name} was harvested and matched to one bounded customer order. Unlimited repeat-selling is disabled.</p><div className="practice-result success"><Check size={26} /><div><strong>Practice harvest settled</strong><span>Reputation rewards mastery; HC remains a bounded game credit.</span></div></div><button className="button primary" onClick={completePractice}>Finish and open Plant <ArrowRight size={15} /></button></>}</div></section></>;
}

function PlantView({ state, openPosition, initialPlotId }: ViewContext & { initialPlotId?: number }) {
  const plots = state.plots.filter((plot) => plot.owned && plotPositions(state, plot.id).length < PLOT_TIERS[plot.tier].slots);
  const nfts = availableNfts(state);
  const [plotId, setPlotId] = useState(plots.some((plot) => plot.id === initialPlotId) ? initialPlotId! : plots[0]?.id ?? 0);
  const [nftId, setNftId] = useState(nfts[0]?.tokenId ?? 0);
  const [strainId, setStrainId] = useState(STRAINS[0].id);
  const [duration, setDuration] = useState<DurationKey>('24h');
  const [autoWater, setAutoWater] = useState(true);
  const plot = plots.find((item) => item.id === plotId) ?? plots[0];
  const nft = nfts.find((item) => item.tokenId === nftId) ?? nfts[0];
  const strain = STRAINS.find((item) => item.id === strainId)!;
  return <><PageHeading eyebrow="Owner path · 100% share" title="Plant a 24/7 position." description="Choose an open simulated plot slot, a crop with a distinct production profile, and a restrained commitment bonus." />{(!plots.length || !nfts.length) && <div className="notice-line warning"><LockKeyhole size={17} /><div><strong>{!nfts.length ? 'No active available Access NFT.' : 'No open owned plot slots.'}</strong><span>Activate or release Access, or acquire additional functional capacity.</span></div></div>}<section className="configure-grid"><div className="panel config-panel"><ConfigSelect index="01" title="Plot slot" description="Capacity is enforced across first-class positions."><div className="selection-grid">{plots.map((item) => { const used = plotPositions(state, item.id).length; return <button key={item.id} className={plotId === item.id ? 'selected' : ''} onClick={() => setPlotId(item.id)}><strong>{PLOT_TIERS[item.tier].label} #{item.id}</strong><small>{used}/{PLOT_TIERS[item.tier].slots} occupied</small></button>; })}</div></ConfigSelect><ConfigSelect index="02" title="Access credential" description="Rarity and Access XP provide the displayed output multipliers."><div className="selection-grid">{nfts.map((item) => <button key={item.tokenId} className={nftId === item.tokenId ? 'selected' : ''} onClick={() => setNftId(item.tokenId)}><strong>Access #{item.tokenId}</strong><small>{item.rarity} · {RARITIES[item.rarity].multiplier.toFixed(2)}× · {formatNumber(item.xp, 0)} XP</small></button>)}</div></ConfigSelect><ConfigSelect index="03" title="Legacy strain" description="Yield and price now trade off; demand rotates daily."><div className="strain-grid">{STRAINS.map((item) => <button key={item.id} className={strainId === item.id ? 'strain-option selected' : 'strain-option'} onClick={() => setStrainId(item.id)}><div><strong>{item.name}</strong><span>{item.growModifier.toFixed(2)}× crop</span></div><small>{item.playstyle}</small></button>)}</div></ConfigSelect><ConfigSelect index="04" title="Commitment" description="Long terms favor convenience and a modest bonus, not doubled daily output."><div className="duration-grid">{(Object.entries(DURATION_PRESETS) as [DurationKey, typeof DURATION_PRESETS[DurationKey]][]).map(([key, item]) => <button key={key} className={duration === key ? 'duration-option selected' : 'duration-option'} onClick={() => setDuration(key)}><strong>{key}</strong><span>{item.steps} steps</span><b>{item.maturityMultiplier.toFixed(2)}×</b></button>)}</div></ConfigSelect></div><aside className="panel review-panel"><p className="eyebrow">Position preview</p><h2>{strain.name}</h2><div className="growth-preview"><img src={growthProgression} alt="Four pixel-art growth stages from seedling to harvest" /><span>Four visible growth stages · settles by checkpoints</span></div><div className="review-strain"><span>{strain.playstyle}</span><strong>{strain.thc.toFixed(2)}% THC</strong><small>{strain.genetics}</small></div><label className="auto-water-toggle"><input type="checkbox" checked={autoWater} onChange={(event) => setAutoWater(event.target.checked)} /><span><strong>Auto-water reserve</strong><small>{autoWaterReserve(duration)} HC prepaid · unused reserve refunded</small></span></label><div className="review-lines"><div><span>Base / checkpoint</span><strong>{plot && nft ? formatNumber(gramsPerStep(nft, plot, strain.id)) : '—'}g</strong></div><div><span>Maturity estimate</span><strong className="positive">{plot && nft ? formatNumber(projectedMatureYield(nft, plot, strain.id, duration)) : '—'}g</strong></div><div><span>Open fee</span><strong>{PROTOCOL_FEE_ETH.toFixed(6)} ETH</strong></div></div><button className="button primary full large" disabled={!plot || !nft} onClick={() => plot && nft && openPosition(plot, nft, strain, duration, 'owner', autoWater)}><Sprout size={16} /> Review and plant</button></aside></section></>;
}

function ConfigSelect({ index, title, description, children }: { index: string; title: string; description: string; children: ReactNode }) {
  return <div className="config-section"><div className="config-number">{index}</div><div className="config-content"><h2>{title}</h2><p>{description}</p>{children}</div></div>;
}

function OwnedLandOverview({ state, go, placement }: { state: GameState; go: (path: string) => void; placement: 'work' | 'land' }) {
  const owned = state.plots.filter((plot) => plot.owned);
  return <section className="owned-land-panel panel"><div className="owned-land-head"><div><p className="eyebrow">Your capacity · local profile</p><h2>{placement === 'work' ? 'Owned land is operated through Plant.' : 'Your land portfolio'}</h2><p>{placement === 'work' ? 'The job board below is the worker path for plots owned by other operators. Your purchases stay visible here so the relationship is never hidden.' : 'Every simulated purchase appears here immediately. Open positions consume these simulated slot limits.'}</p></div><button className="button secondary" onClick={() => go('/plant')}><Sprout size={15} /> Plant on owned land</button></div><div className="owned-land-grid">{owned.map((plot) => { const tier = PLOT_TIERS[plot.tier]; const used = plotPositions(state, plot.id).length; return <article key={plot.id}><img src={LAND_ART[plot.tier] ?? landRoom} alt={`${tier.label} operation`} /><div><small>{tier.label.toUpperCase()} · #{plot.id}</small><strong>{Math.max(0, tier.slots - used)} of {tier.slots} slots open</strong><span>{used ? `${used} active position${used === 1 ? '' : 's'}` : 'Ready to plant'}</span></div><button className="text-link" onClick={() => go(`/plant/${plot.id}`)}>Use <ArrowRight size={13} /></button></article>; })}</div></section>;
}

function WorkView({ state, openPosition, go }: ViewContext) {
  const nfts = availableNfts(state);
  const [plotId, setPlotId] = useState(externalPlots[0].id);
  const [nftId, setNftId] = useState(nfts[0]?.tokenId ?? 0);
  const [strainId, setStrainId] = useState(STRAINS[4].id);
  const [duration, setDuration] = useState<DurationKey>('24h');
  const plot = externalPlots.find((item) => item.id === plotId)!;
  const nft = nfts.find((item) => item.tokenId === nftId);
  const strain = STRAINS.find((item) => item.id === strainId)!;
  return <><PageHeading eyebrow="Landless path · worker-favoring split" title="Go to work." description="Use an open plot without buying land. The test split is 65% worker / 35% owner because the worker funds upkeep and simulated fees." /><OwnedLandOverview state={state} go={go} placement="work" /><div className="section-heading work-board-heading"><div><h2>Available work contracts</h2><p>Demo listings from other operators. Selecting one never consumes your owned land.</p></div><span className="count-chip">{externalPlots.length} listings</span></div><section className="work-grid"><div className="panel work-list">{externalPlots.map((item) => { const tier = PLOT_TIERS[item.tier]; const used = plotPositions(state, item.id).length; return <button key={item.id} className={plotId === item.id ? 'work-listing selected' : 'work-listing'} onClick={() => setPlotId(item.id)}><span className="work-land-thumb"><img src={LAND_ART[item.tier]} alt="" /></span><span><strong>{tier.label} #{item.id}</strong><small>{item.owner} · simulated listing</small></span><span><strong>{Math.max(0, tier.slots - used)} open</strong><small>{Math.round(WORKER_SHARE * 100)}% worker share</small></span></button>; })}</div><aside className="panel work-config"><p className="eyebrow">Work contract preview</p><h2>{PLOT_TIERS[plot.tier].label} #{plot.id}</h2><div className="work-selected-art"><img src={LAND_ART[plot.tier]} alt={`${PLOT_TIERS[plot.tier].label} operation`} /><span><strong>SIMULATED LISTING</strong><small>Select another operation to inspect its layout.</small></span></div><label>Access<select value={nftId} onChange={(event) => setNftId(Number(event.target.value))}>{nfts.map((item) => <option key={item.tokenId} value={item.tokenId}>#{item.tokenId} · {item.rarity}</option>)}</select></label><label>Strain<select value={strainId} onChange={(event) => setStrainId(event.target.value)}>{STRAINS.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.playstyle}</option>)}</select></label><label>Term<select value={duration} onChange={(event) => setDuration(event.target.value as DurationKey)}>{Object.entries(DURATION_PRESETS).map(([key, item]) => <option key={key} value={key}>{item.label} · {item.maturityMultiplier.toFixed(2)}×</option>)}</select></label><div className="work-estimate"><span>Estimated worker maturity</span><strong>{nft ? formatNumber(projectedMatureYield(nft, plot, strain.id, duration, 'worker')) : '—'}g</strong><small>Owner receives 35% in the non-spendable demo owner allocation; the worker receives 65% and funds upkeep.</small></div><button className="button primary full" disabled={!nft} onClick={() => nft && openPosition(plot, nft, strain, duration, 'worker', true)}><UserRoundCheck size={16} /> Review work contract</button></aside></section></>;
}

function PositionView({ state, now, position, careForPosition, closePosition, go }: ViewContext & { position: Position }) {
  const plot = state.plots.find((item) => item.id === position.plotId)!;
  const nft = state.nfts.find((item) => item.tokenId === position.nftId)!;
  const strain = STRAINS.find((item) => item.id === position.strainId)!;
  const metrics = getPositionMetrics(position, nft, plot, now);
  const growthStageIndex = metrics.mature ? 3 : metrics.progress >= .67 ? 2 : metrics.progress >= .34 ? 1 : 0;
  const growthStageLabel = ['Seedling', 'Vegetative', 'Flowering', 'Harvest-ready'][growthStageIndex];
  return <><button className="back-link" onClick={() => go('/')}><ArrowRight size={15} /> Back to overview</button><PageHeading eyebrow={`${position.mode === 'worker' ? 'Work contract' : 'Owner grow'} · Plot #${plot.id}`} title={strain.name} description={`Access #${nft.tokenId} · ${DURATION_PRESETS[position.duration].label} · ${position.autoWater ? 'automatic care funded' : 'manual care selected'}`} action={<span className={`large-status ${metrics.mature ? 'ready' : 'growing'}`}><span />{metrics.mature ? 'Ready' : 'Growing'}</span>} /><section className="position-grid"><div className="panel position-main"><div className="position-progress-head"><div><span>24/7 CHECKPOINT PROGRESS</span><strong>Step {metrics.completedSteps} of {metrics.totalSteps}</strong></div><strong>{Math.round(metrics.progress * 100)}%</strong></div><div className="term-track"><span style={{ width: `${metrics.progress * 100}%` }} /></div><div className="position-growth-visual"><img src={growthProgression} alt="Four pixel-art crop growth stages" /><div className="growth-stage-zones" aria-hidden="true">{[0, 1, 2, 3].map((stage) => <span key={stage} className={stage === growthStageIndex ? 'active' : stage < growthStageIndex ? 'past' : ''} />)}</div><span className="growth-marker" style={{ left: `${Math.min(96, Math.max(4, metrics.progress * 100))}%` }}><i /></span><small>{growthStageLabel} stage · updates with elapsed time</small></div><div className="grow-spec"><div className="strain-monogram">{strain.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><span className="token-label">CURRENT CROP</span><h2>{strain.name}</h2><p>{strain.playstyle}</p></div><div className="potency-readout"><span>WORKER SHARE</span><strong>{position.mode === 'worker' ? Math.round(WORKER_SHARE * 100) + '%' : '100%'}</strong><small>Displayed before entry</small></div></div><div className="metric-quad"><MetricBox label="Player base" value={`${formatNumber(metrics.playerBase)}g`} sub="Completed checkpoints" /><MetricBox label="Completion payout" value={`${formatNumber(metrics.playerMatured)}g`} sub={`${DURATION_PRESETS[position.duration].maturityMultiplier.toFixed(2)}× restrained bonus`} accent /><MetricBox label="Access XP" value={`+${metrics.xpEarned}`} sub="Applies to next position" /><MetricBox label="Next checkpoint" value={metrics.mature ? 'Ready' : formatCountdown(metrics.nextStepAt - now)} sub="Lazy settlement; no cron needed" /></div></div><aside className="position-side"><div className="panel water-panel"><div className="panel-head compact-head"><div><p className="eyebrow">Upkeep</p><h2>{position.autoWater ? 'Auto-water funded' : 'Manual care'}</h2></div><Droplets size={19} /></div><div className="water-value"><strong>{Math.round(metrics.waterLevel)}%</strong><span>{position.autoWater ? `${position.autoWaterReserveHC} HC reserved` : 'Optional optimization'}</span></div><div className="water-track"><span style={{ width: `${metrics.waterLevel}%` }} /></div><button className="button secondary full" onClick={() => careForPosition(position)} disabled={position.autoWater || metrics.waterLevel >= 100 || state.hcBalance < 40}><Droplets size={16} /> Manual care · 40 HC</button></div><div className="panel slot-panel"><p className="eyebrow">Value conservation</p><h2>{position.mode === 'worker' ? '65 / 35 settlement' : 'Owner-operated'}</h2><p className="panel-copy">{position.mode === 'worker' ? `${formatNumber(metrics.ownerBase)}g is tracked separately for the plot owner. Worker output is no longer the only recorded side.` : 'The operator receives the full crop output while using owned capacity.'}</p></div></aside></section><section className="exit-panel panel"><div><p className="eyebrow">Position settlement</p><h2>{metrics.mature ? 'Harvest and release' : 'Need to leave early?'}</h2><p>{metrics.mature ? 'Completion bonus, Access XP, and unused water refund settle together.' : 'Early exit pays 80% of current player base. Previously harvested inventory is untouched.'}</p></div><button className={metrics.mature ? 'button primary' : 'button danger'} onClick={() => closePosition(position)} ><PackageOpen size={16} /> {metrics.mature ? 'Harvest position' : 'Review early exit'}</button></section></>;
}

function MetricBox({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return <div className={accent ? 'metric-box accent' : 'metric-box'}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function ContractsView({ state, now, fulfillOrder, go }: ViewContext) {
  const orders = getDailyContracts(now);
  const refreshAt = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1);
  const tomorrow = getDailyContracts(refreshAt + 1_000);
  const remaining = orders.map((order) => Math.max(0, order.targetGrams - (state.orderFills[order.id] ?? 0)));
  const readyMatches = orders.filter((order, index) => remaining[index] > 0 && (state.grams[order.strainId] ?? 0) >= remaining[index]).length;
  const openGrams = remaining.reduce((sum, value) => sum + value, 0);
  const stocked = STRAINS.filter((strain) => (state.grams[strain.id] ?? 0) > 0);
  return <><PageHeading eyebrow="Bounded HC issuance" title="Daily demand board" description="Route inventory into quick liquidity, exact mastery orders, or high-volume allocation. Every displayed quantity is finite." action={<span className="lab-state"><Clock3 size={14} /> {formatCountdown(refreshAt - now)} TO REFRESH</span>} /><section className="demand-dispatch-hero panel"><img src={demandDispatchHero} alt="Pixel-art dispatch center with three fulfillment lanes" /><div className="demand-hero-shade" /><div className="demand-hero-copy"><p className="eyebrow">Today’s dispatch window</p><h2>Route inventory with intent.</h2><p>Sell what is ready, preserve what is scarce, or plant toward the next deterministic board.</p><div className="demand-hero-stats"><span><small>Ready matches</small><strong>{readyMatches} / {orders.length}</strong></span><span><small>Open demand</small><strong>{formatNumber(openGrams)}g</strong></span><span><small>Issuance rule</small><strong>Hard capped</strong></span></div></div></section><section className="contract-grid">{orders.map((order) => <ContractCard key={order.id} order={order} state={state} fulfillOrder={fulfillOrder} go={go} />)}</section><section className="tomorrow-board panel"><div><p className="eyebrow">Plan the next position</p><h2>Tomorrow’s board</h2><p>Previewed from the same deterministic rotation. Quotes settle only when the next board opens.</p></div><div className="tomorrow-orders">{tomorrow.map((order) => { const strain = STRAINS.find((item) => item.id === order.strainId)!; return <span key={order.id}><small>{order.risk} · {CUSTOMERS[order.customer].label}</small><strong>{strain.name}</strong><b>{order.targetGrams}g target</b></span>; })}</div></section><section className="inventory-panel panel"><div className="panel-head"><div><p className="eyebrow">Warehouse</p><h2>Ready inventory</h2></div><PackageOpen size={18} /></div>{stocked.length ? <div className="inventory-table">{stocked.map((strain) => <div className="inventory-row" key={strain.id}><div><strong>{strain.name}</strong><small>{strain.playstyle}</small></div><strong>{formatNumber(state.grams[strain.id] ?? 0)}g</strong><span>{strain.growModifier.toFixed(2)}× crop</span><strong>{orders.some((order) => order.strainId === strain.id) ? 'Requested today' : 'Hold or crew'}</strong></div>)}</div> : <div className="inventory-empty"><PackageOpen size={22} /><strong>No ready inventory</strong><span>Harvest a position or plan one of tomorrow’s requested crops.</span></div>}</section></>;
}

function ContractCard({ order, state, fulfillOrder, go }: { order: DemandContract; state: GameState; fulfillOrder: (order: DemandContract, amount: number) => void; go: (path: string) => void }) {
  const strain = STRAINS.find((item) => item.id === order.strainId)!;
  const filled = state.orderFills[order.id] ?? 0;
  const remaining = Math.max(0, order.targetGrams - filled);
  const available = state.grams[order.strainId] ?? 0;
  const [amount, setAmount] = useState(Math.min(remaining, available));
  const complete = remaining <= 0;
  const valid = !complete && acceptedDeliveryAmount(amount, remaining, available) > 0;
  const RouteIcon = order.customer === 'street' ? Store : order.customer === 'regular' ? ClipboardCheck : Warehouse;
  const actionState = complete ? 'Closed for today' : available >= remaining ? 'Ready now' : available > 0 ? `${formatNumber(remaining - available)}g short` : 'Plant required';
  return <article className={`contract-card panel route-${order.customer} ${complete ? 'complete' : ''}`}><div className="contract-route-band"><span><RouteIcon size={17} /></span><small>{order.risk} route</small><strong>{actionState}</strong></div><div className="contract-card-top"><span className="contract-risk">{order.risk}</span><span className="availability open"><span />{complete ? 'Filled' : CUSTOMERS[order.customer].label}</span></div><h2>{order.title}</h2><p>{strain.name} · {strain.playstyle}</p><div className="contract-target"><span>Finite demand</span><strong>{formatNumber(filled)} / {formatNumber(order.targetGrams)}g</strong></div><div className="thin-progress"><span style={{ width: `${Math.min(100, (filled / order.targetGrams) * 100)}%` }} /></div><div className="contract-price"><span>Settlement quote</span><strong>{formatNumber(order.unitPrice)} HC/g</strong></div><div className="contract-price"><span>Remaining settlement</span><strong>{formatNumber(remaining * order.unitPrice)} HC</strong></div><div className="contract-rewards"><span>Completion</span><strong>+{order.reputationReward} rep · +{order.seasonXpReward} SXP</strong></div>{complete ? <button className="button activated full" disabled><Check size={15} /> Daily demand filled</button> : available > 0 ? <><label className="market-select">Delivery amount<input type="number" min="0" max={Math.min(remaining, available)} step="0.1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><button className="button primary full" disabled={!valid} onClick={() => fulfillOrder(order, amount)}><ShoppingBag size={15} /> Deliver {valid ? `${formatNumber(amount)}g` : ''}</button><small className="contract-available">You hold {formatNumber(available)}g · {formatNumber(remaining)}g remains</small></> : <><button className="button secondary full contract-plant-action" onClick={() => go('/plant')}><Sprout size={15} /> Plant {strain.name}</button><small className="contract-available">No matching inventory. Tomorrow’s preview can guide the next position.</small></>}</article>;
}

function CrewView({ state, now, contributeCrew, claimCrewReward }: ViewContext) {
  const week = crewWeekWindow(now);
  const operation = activeCrewOperation(state.crewOperation, now);
  const bins = crewBinProgress(operation, now);
  const total = crewTotalProgress(operation, now);
  const progress = Math.min(100, (total / CREW_TARGET_GRAMS) * 100);
  const simulatedTotal = bins.reduce((sum, bin) => sum + bin.simulated, 0);
  const capRemaining = Math.max(0, CREW_PERSONAL_CAP_GRAMS - operation.playerGrams);
  const mostNeeded = [...bins].sort((a, b) => b.remaining - a.remaining)[0];
  const selectableBins = bins.filter((bin) => bin.remaining > 0 && (state.grams[bin.strainId] ?? 0) > 0);
  const [strainId, setStrainId] = useState<string>(selectableBins[0]?.strainId ?? bins[0].strainId);
  const selectedBin = bins.find((bin) => bin.strainId === strainId) ?? bins[0];
  const strain = STRAINS.find((item) => item.id === selectedBin.strainId)!;
  const inventory = state.grams[strain.id] ?? 0;
  const maximum = Math.max(0, Math.min(inventory, selectedBin.remaining, capRemaining));
  const [amount, setAmount] = useState(Math.min(10, maximum));
  const accepted = crewAcceptedGrams(operation, now, strain.id, amount, inventory);
  const qualified = operation.playerGrams >= CREW_QUALIFIER_GRAMS;
  const rewardReady = crewRewardEligible(operation, now);
  const sealUnlocked = state.crewCosmetics.includes(CREW_SEAL_ID);
  const mostNeededStrain = STRAINS.find((item) => item.id === mostNeeded.strainId)!;

  return <>
    <PageHeading eyebrow="Weekly cooperative objective" title="Crew Operation" description="Coordinate three requested crops, qualify with 10g, and complete one bounded weekly objective. Progress is local demo data—not a live multiplayer claim." action={<span className="lab-state"><Clock3 size={14} /> {formatCountdown(week.end - now)} LEFT</span>} />
    <div className="crew-disclosure"><ShieldCheck size={16} /><span><strong>Local crew simulation.</strong> Profiles and progress are demo data stored in this browser. No live players, chat, pooled funds, token rewards, or on-chain activity.</span></div>

    <section className="crew-operation-hero panel">
      <img src={crewOperationHero} alt="Pixel-art cooperative warehouse with a central illuminated operation crate" />
      <div className="crew-hero-shade" />
      <div className="crew-hero-copy">
        <span className="crew-local-chip"><span /> LOCAL SIMULATION</span>
        <p className="eyebrow">Operation {week.id}</p>
        <h2>Legacy Relay</h2>
        <p>Six operators. Three crop bays. One exact weekly objective.</p>
        <div className="crew-total"><strong>{formatNumber(total)}g</strong><span>/ {CREW_TARGET_GRAMS}g secured</span></div>
        <div className="crew-hero-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="crew-hero-stats"><span><small>Your week</small><strong>{formatNumber(operation.playerGrams)}g</strong></span><span><small>Demo roster</small><strong>{formatNumber(simulatedTotal)}g</strong></span><span><small>Personal cap</small><strong>{formatNumber(capRemaining)}g left</strong></span></div>
      </div>
      <div className={`crew-seal-preview${progress >= 75 || sealUnlocked ? ' revealed' : ''}`}><img src={crewOperationSeal} alt="Operation Seal cosmetic reward" /><span>{sealUnlocked ? 'UNLOCKED' : progress >= 75 ? 'REWARD REVEALED' : 'REVEALS AT 75%'}</span></div>
    </section>

    <div className="crew-needed"><Radio size={15} /><span><strong>Most needed now:</strong> {mostNeededStrain.name} · {formatNumber(mostNeeded.remaining)}g remains in its bay.</span></div>

    <section className="crew-control-grid">
      <div className="panel crew-bay-panel">
        <div className="panel-head"><div><p className="eyebrow">Exact weekly requirements</p><h2>Requested crop bays</h2></div><Warehouse size={20} /></div>
        <div className="crew-bays">{bins.map((bin) => { const binStrain = STRAINS.find((item) => item.id === bin.strainId)!; const binPercent = (bin.filled / bin.targetGrams) * 100; return <button className={strain.id === bin.strainId ? 'crew-bay selected' : 'crew-bay'} key={bin.strainId} onClick={() => { setStrainId(bin.strainId); setAmount(Math.min(10, state.grams[bin.strainId] ?? 0, bin.remaining, capRemaining)); }}><div className="crew-bay-head"><span>{binStrain.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{binStrain.name}</strong><small>{formatNumber(state.grams[bin.strainId] ?? 0)}g in your inventory</small></div><b>{bin.remaining <= 0 ? <Check size={14} /> : `${formatNumber(bin.remaining)}g`}</b></div><div className="thin-progress"><span style={{ width: `${Math.min(100, binPercent)}%` }} /></div><div className="crew-bay-meta"><span>{formatNumber(bin.filled)} / {bin.targetGrams}g</span><span>Your credit {formatNumber(bin.player)}g</span></div></button>; })}</div>
      </div>

      <aside className="panel crew-contribute-panel">
        <p className="eyebrow">Bounded contribution</p><h2>Add to {strain.name}</h2>
        <p>Only requested crops count. The operation accepts no progress beyond a filled bay or your 100g weekly cap.</p>
        <label>Requested crop<select value={strain.id} onChange={(event) => { const nextId = event.target.value; const nextBin = bins.find((bin) => bin.strainId === nextId)!; setStrainId(nextId); setAmount(Math.min(10, state.grams[nextId] ?? 0, nextBin.remaining, capRemaining)); }}>{bins.map((bin) => { const item = STRAINS.find((entry) => entry.id === bin.strainId)!; return <option key={bin.strainId} value={bin.strainId} disabled={bin.remaining <= 0}>{item.name} · {formatNumber(bin.remaining)}g needed</option>; })}</select></label>
        <label>Grams<input type="number" min="0" max={maximum} step="0.1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
        <div className="crew-contribution-preview"><span><small>Inventory</small><strong>{formatNumber(inventory)}g</strong></span><span><small>Accepted</small><strong>{formatNumber(accepted)}g</strong></span><span><small>Qualification</small><strong>{qualified ? 'Ready' : `${formatNumber(Math.max(0, CREW_QUALIFIER_GRAMS - operation.playerGrams))}g to go`}</strong></span></div>
        <button className="button primary full" disabled={accepted <= 0} onClick={() => contributeCrew(strain, amount)}><PackageOpen size={15} /> Review contribution</button>
        <small className="crew-control-disclosure">Fictional game activity only—no real cannabis, cultivation service, or commerce. Contributions remove simulated inventory and never create HC, tokens, yield, or marketplace value.</small>
      </aside>
    </section>

    <section className="crew-detail-grid">
      <div className="panel crew-milestones-panel">
        <div className="panel-head"><div><p className="eyebrow">Deterministic reward track</p><h2>Operation milestones</h2></div><BadgeCheck size={20} /></div>
        <div className="crew-milestones">{CREW_MILESTONES.map((milestone) => { const reached = progress >= milestone.percent; return <div className={reached ? 'crew-milestone reached' : 'crew-milestone'} key={milestone.percent}><span>{reached ? <Check size={13} /> : `${milestone.percent}%`}</span><div><strong>{milestone.label}</strong><small>{milestone.detail}</small></div></div>; })}</div>
        <div className="crew-reward-box"><img src={crewOperationSeal} alt="Non-transferable Operation Seal" /><div><span className="token-label">WEEKLY COMPLETION</span><strong>Operation Seal</strong><small>Cosmetic only · no yield, rarity, marketplace, or reward-rate advantage.</small></div></div>
        <button className={operation.rewardClaimed ? 'button activated full' : 'button secondary full'} disabled={!rewardReady} onClick={claimCrewReward}>{operation.rewardClaimed ? <><Check size={15} /> Reward claimed</> : <><Trophy size={15} /> {qualified ? 'Claim completed operation' : 'Contribute 10g to qualify'}</>}</button>
      </div>

      <div className="panel crew-roster-panel">
        <div className="panel-head"><div><p className="eyebrow">Prototype standings</p><h2>Demo roster</h2></div><UsersRound size={20} /></div>
        <div className="crew-roster"><div className="crew-member you"><span>YO</span><div><strong>You</strong><small>Operator · LOCAL PLAYER</small></div><b>{formatNumber(operation.playerGrams)}g</b><i>{qualified ? 'QUALIFIED' : 'NEEDS 10G'}</i></div>{CREW_DEMO_MEMBERS.map((member, index) => { const demoShare = Math.floor(simulatedTotal / CREW_DEMO_MEMBERS.length) + (index < simulatedTotal % CREW_DEMO_MEMBERS.length ? 1 : 0); return <div className="crew-member" key={member.id}><span>{member.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.role} · SIMULATED</small></div><b>{demoShare}g</b><i>QUALIFIED</i></div>; })}</div>
      </div>

      <div className="panel crew-activity-panel">
        <div className="panel-head"><div><p className="eyebrow">Local operation log</p><h2>Recent contributions</h2></div><Activity size={19} /></div>
        <div className="crew-activity-list">{operation.contributions.length ? operation.contributions.map((item) => { const itemStrain = STRAINS.find((entry) => entry.id === item.strainId)!; return <div key={item.id}><span className="activity-icon"><PackageOpen size={13} /></span><p><strong>You added {formatNumber(item.grams)}g</strong><small>{itemStrain.name} · local contribution</small></p></div>; }) : <div><span className="activity-icon"><UsersRound size={13} /></span><p><strong>Demo crew established the relay</strong><small>Your first 10g qualifies for the completion reward.</small></p></div>}<div><span className="activity-icon"><ShieldCheck size={13} /></span><p><strong>Weekly caps verified</strong><small>No member can contribute more than 20% of the objective.</small></p></div></div>
        <div className="crew-history"><span>Completion streak</span><strong>{state.crewStreak} weeks</strong><small>Multiplayer, invites, and chat remain disabled until account and backend integration.</small></div>
      </div>
    </section>
  </>;
}

function AccessView({ state, activateNft }: { state: GameState; activateNft: (nft: AccessNft) => void }) {
  return <><PageHeading eyebrow="Functional membership" title="Access credentials" description="Rarity differences are compressed. Reputation is a prototype score. Access rarity and XP provide the displayed grow multipliers." /><section className="nft-grid">{state.nfts.map((nft) => { const rarity = RARITIES[nft.rarity]; return <article className="nft-card" key={nft.tokenId}><div className="nft-visual" style={{ '--rarity': rarity.color } as React.CSSProperties}><div className="nft-grid-lines" /><Leaf size={42} /><span>ACCESS</span></div><div className="nft-body"><div className="nft-heading"><div><span className="token-label">LOUD ACCESS</span><h3>#{nft.tokenId}</h3></div><span className="rarity-dot" style={{ color: rarity.color }}><i />{nft.rarity}</span></div><div className="nft-stats"><div><span>Base rate</span><strong>{rarity.multiplier.toFixed(2)}×</strong></div><div><span>XP bonus</span><strong>{xpBonus(nft.xp).toFixed(2)}×</strong></div><div><span>Current XP</span><strong>{formatNumber(nft.xp, 0)}</strong></div></div>{nft.activated ? <button className="button activated" disabled><Check size={16} /> Functional access active</button> : <button className="button primary full" onClick={() => activateNft(nft)} disabled={state.hcBalance < ACTIVATION_COST}><LockKeyhole size={16} /> Activate · 4,200 HC</button>}</div></article>; })}</section></>;
}

function LandView({ state, buyPlot, go }: ViewContext) {
  return <><PageHeading eyebrow="Functional capacity" title="Four land tiers. Farm tops out at 36 slots." description="Start with one position or scale into a commercial operation. Every slot hosts one simulated position; no tier provides passive rewards." /><OwnedLandOverview state={state} go={go} placement="land" /><div className="section-heading land-market-heading"><div><h2>Acquire more capacity</h2><p>Purchases are simulated and added immediately to your portfolio above.</p></div></div><section className="land-card-grid">{ALPHA_PLOT_TIERS.map((key, index) => { const tier = PLOT_TIERS[key]; const artwork = LAND_ART[key]; const isFarm = key === 'farm'; return <article className={`panel land-tier-card${isFarm ? ' whale' : ''}`} key={key}><div className="land-art-frame">{artwork && <img src={artwork} alt={`${tier.label} pixel-art operation`} />}<span className={`land-tier-chip${isFarm ? ' whale' : ''}`}>{isFarm ? 'CAPACITY PREVIEW · 36 MAX' : `TIER 0${index + 1}`}</span></div><div className="land-tier-body"><div className="land-tier-title"><div><p className="eyebrow">{tier.shortLabel} CAPACITY</p><h2>{tier.label}</h2></div><strong>{tier.slots}<small> slots</small></strong></div><p>{LAND_DESCRIPTIONS[key]}</p><div className="land-stat-grid"><span><small>Output</small><strong className="positive">+{Math.round((tier.yieldBonus - 1) * 100)}%</strong></span><span><small>Checkpoint XP</small><strong>{Math.round(50 * tier.xpMultiplier)}</strong></span><span><small>Capacity</small><strong>{tier.slots} / {tier.slots}</strong></span></div><div className="land-purchase"><span><small>Simulated price</small><strong>{tier.priceEth.toFixed(3)} ETH</strong></span><button className="button secondary compact" disabled={state.ethBalance < tier.priceEth} onClick={() => buyPlot(key)}>Review purchase <ArrowRight size={14} /></button></div></div></article>; })}</section><p className="source-note"><ShieldCheck size={14} /> Simulated game capacity, not passive income, real estate, or an earnings promise.</p></>;
}

function MarketLabView({ now }: { now: number }) {
  const snapshot = AUGUST_26_FIXTURE;
  const [symbol, setSymbol] = useState('MSOS');
  const selected = snapshot.assets.find((asset) => asset.symbol === symbol) ?? snapshot.assets[0];
  const pulse = averageSessionMove(snapshot.assets);
  return <div className="market-lab"><PageHeading eyebrow="Research sandbox · display only" title="Market Pulse Lab" description="Market context remains isolated from HC, grams, XP, rarity, contracts, and position output." action={<span className="lab-state"><FlaskConical size={14} /> FIXTURE / LAB</span>} /><div className="market-lab-disclosure"><ShieldCheck size={18} /><div><strong>Market-inspired simulation.</strong><span>No stock ownership, brokerage affiliation, investment product, or trading functionality.</span></div></div><section className="market-pulse-grid"><PulseCard label="Equal-weight pulse" value={`${pulse >= 0 ? '+' : ''}${pulse.toFixed(2)}%`} note="Average fixture move from open" /><PulseCard label="Breadth" value={`${marketBreadth(snapshot.assets)} / ${snapshot.assets.length}`} note="References above open" /><PulseCard label="Feed" value="STATIC" note="Dated manual fixture" /><PulseCard label="ET window" value={getIndicativeRegularSession(new Date(now))} note="Holiday calendar not connected" /></section><section className="market-terminal-grid"><div className="panel market-watchlist"><div className="panel-head market-panel-head"><div><p className="eyebrow">Display-only universe</p><h2>Sector references</h2></div><span className="read-only-chip">READ ONLY</span></div><div className="market-table-row market-table-head"><span>Reference</span><span>Price</span><span>Open move</span><span>Day range</span><span>Volume</span></div>{snapshot.assets.map((asset) => <button key={asset.symbol} className={`market-table-row ${asset.symbol === selected.symbol ? 'selected' : ''}`} onClick={() => setSymbol(asset.symbol)}><span className="market-symbol"><strong>{asset.symbol}</strong><small>{asset.name}</small></span><strong>${asset.referencePrice.toFixed(2)}</strong><span className={sessionMove(asset) >= 0 ? 'positive' : 'negative'}>{sessionMove(asset) >= 0 ? '+' : ''}{sessionMove(asset).toFixed(2)}%</span><span className="range-meter"><i style={{ width: `${rangePosition(asset)}%` }} /><small>${asset.low.toFixed(2)} — ${asset.high.toFixed(2)}</small></span><span className="volume-cell"><strong>{compactVolume(asset.volume)}</strong><small>{Math.round((asset.volume / asset.averageVolume) * 100)}% avg</small></span></button>)}</div><aside className="market-detail-stack"><div className="panel market-detail"><div className="market-detail-top"><span className="market-symbol-block">{selected.symbol}</span><span className="category-chip">{selected.category}</span></div><h2>{selected.name}</h2><p>Reference detail only. It cannot create a position or entitlement.</p><div className="market-detail-price"><strong>${selected.referencePrice.toFixed(2)}</strong><span className={sessionMove(selected) >= 0 ? 'positive' : 'negative'}>{sessionMove(selected) >= 0 ? '+' : ''}{sessionMove(selected).toFixed(2)}%</span></div><DetailLine label="Open" value={`$${selected.open.toFixed(2)}`} /><DetailLine label="Day range" value={`$${selected.low.toFixed(2)} — $${selected.high.toFixed(2)}`} /><DetailLine label="52-week range" value={`$${selected.fiftyTwoWeekLow.toFixed(2)} — $${selected.fiftyTwoWeekHigh.toFixed(2)}`} /><a className="source-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Open public reference <ExternalLink size={13} /></a></div><div className="panel integration-gates"><p className="eyebrow">Economy firewall</p><h2>All value links disabled</h2><DetailLine label="Game multiplier" value="None" /><DetailLine label="Trading" value="None" /><DetailLine label="Data mode" value="Static fixture" /><DetailLine label="Legal/data clearance" value="Not cleared" /></div></aside></section><section className="panel data-lineage"><span className="data-lineage-icon"><Database size={18} /></span><div><strong>Data lineage</strong><span>{snapshot.sourceLabel}. Values are not live quotes.</span></div></section></div>;
}

function PulseCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="market-pulse-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="market-detail-line"><span>{label}</span><strong>{value}</strong></div>;
}

function compactVolume(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function ConfirmationDialog({ details, close }: { details: ConfirmState; close: () => void }) {
  return <div className="dialog-scrim" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && close()}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-label={details.title}><button className="dialog-close" onClick={close} aria-label="Close"><X size={19} /></button><span className="dialog-icon"><ShieldCheck size={22} /></span><p className="eyebrow">{details.eyebrow}</p><h2>{details.title}</h2><p>{details.body}</p><div className="confirm-lines">{details.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong className={line.tone}>{line.value}</strong></div>)}</div><div className="simulated-callout"><span className="status-dot" /><div><strong>Simulation only</strong><small>No real tokens, securities, or funds move.</small></div></div><button className="button primary full large" onClick={details.onConfirm}>{details.confirmLabel} <ArrowRight size={16} /></button><button className="button ghost full" onClick={close}>Cancel</button></div></div>;
}

function Toast({ toast, close }: { toast: ToastState; close: () => void }) {
  return <div className={`toast ${toast.kind}`}><span>{toast.kind === 'success' ? <Check size={17} /> : toast.kind === 'warning' ? <Clock3 size={17} /> : <Activity size={17} />}</span><div><strong>{toast.title}</strong><p>{toast.body}</p></div><button onClick={close}><X size={15} /></button></div>;
}

function NotFound({ go }: { go: (path: string) => void }) {
  return <div className="not-found"><LandPlot size={38} /><h1>Position not found</h1><p>This position does not exist in the economy v2 ledger.</p><button className="button primary" onClick={() => go('/')}>Return to overview</button></div>;
}
