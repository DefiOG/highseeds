# Loud Ledger

A pre-launch, entertainment-first simulation of a 24/7 grow-management economy. No token, NFT, plot, or staking contracts are deployed. Wallet balances, positions, customer orders, and transactions are local browser data with no redemption or promised return.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

For QA, where one six-hour checkpoint becomes six seconds:

```powershell
npm.cmd run dev:fast
```

Build and test:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:file
npm.cmd run build:peer
```

## GitHub Pages

The Pages workflow runs the test suite, builds `dist`, and publishes it whenever `main` is updated. Production navigation uses hash routes so direct links work under a GitHub repository subpath.

In the repository settings, select **GitHub Actions** as the Pages source. No blockchain key, seed phrase, private key, or funded deployer wallet belongs in this repository or its Pages build.

`dist-file/index.html` is a single offline file. Routing automatically switches to URL hashes under `file://`.

`peer-demo/index.html` is the shareable accelerated prototype. It is also a single offline file, visibly labeled Test Mode, with each six-hour checkpoint compressed to six seconds so peers can complete Plant/Work → Harvest → Demand during one session.

## Economy v2

- Plant and Work run 24/7 through position-relative six-hour checkpoints.
- Plots enforce their real 1–32 position capacity through first-class position records.
- Work uses a transparent 50% worker / 50% owner test split; both sides are accounted.
- Long-term maturity multipliers are flattened to 1.00×–1.25×.
- Strains trade production volume against customer value instead of sharing one output rate.
- Three finite daily contracts replace unlimited repeated NPC sales.
- Auto-water is the safe default; reserves are prepaid and unused HC is refunded.
- Pre-maturity claim-clicks were removed. Harvest settles lazily at completion or at the universal 80% early-exit rate.
- Operator Reputation and season XP are account-bound progression.
- Crew Operations use three bounded weekly crop bays, a 20% personal cap, labeled simulated members, and deterministic cosmetic progression without creating another HC faucet.
- Market Pulse remains read-only and has no game-economy linkage.

## Routes

- `/` — operation dashboard and live positions
- `/practice` — accelerated wallet-free tutorial
- `/plant` — owner-operated position configuration
- `/work` — landless worker contracts
- `/contracts` — finite rotating demand board
- `/crew` — bounded weekly Crew Operation with requested crops, milestones, roster, and cosmetic reward
- `/access` — functional Access activation and XP
- `/land` — four visual land tiers, capped by the 36-slot commercial Farm
- `/positions/:id` — live checkpoint, care, and settlement view
- `/market-lab` — dated, read-only market fixture

## Architecture

- `src/data/economy.ts` owns the v2 economy configuration, strain profiles, contracts, and seasons.
- `src/data/crew.ts` owns the Monday-UTC Crew Operation lifecycle, simulated demo progress, crop bays, caps, and reward eligibility.
- `src/lib/engine.ts` contains pure position, water, share, maturity, and early-exit calculations.
- `src/state/game.ts` persists the local `v2` state separately from the legacy simulation.
- `src/data/market.ts` remains an isolated display-only provider contract.
- `src/assets/pixel-grow-room-ui.png` and `src/assets/land-*-ui.png` are optimized derivatives of the generated pixel-art scenes.
- `src/assets/crew-operation-*-ui.webp` contains the optimized Crew warehouse hero and non-transferable Operation Seal artwork.
- `src/assets/demand-dispatch-hero-ui.webp` provides the Daily Demand dispatch scene; `src/assets/growth-progression-ui.webp` is the shared Plant and Position stage strip.
- `src/App.tsx` contains route views and simulated transaction orchestration.

Strain THC, genetics, and history inputs are from the project’s High Times source roster. HC prices, yields, contract demand, and progression are game-design values—not real cannabis, securities, or investment data.
