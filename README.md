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

The Pages workflow runs the test suite, builds the accelerated `peer-demo`, and publishes it whenever `main` is updated. A persistent Test Mode banner identifies the public prototype, where six-hour checkpoints take six seconds. Navigation uses hash routes so direct links work under a GitHub repository subpath.

In the repository settings, select **GitHub Actions** as the Pages source. No blockchain key, seed phrase, private key, or funded deployer wallet belongs in this repository or its Pages build.

`dist-file/index.html` is a single offline file. Routing automatically switches to URL hashes under `file://`.

`peer-demo/index.html` is the shareable accelerated prototype. It is also a single offline file, visibly labeled Test Mode, with each six-hour checkpoint compressed to six seconds so peers can complete Plant/Work → Harvest → Demand during one session.

## Economy v2

- Plant and Work run 24/7 through position-relative six-hour checkpoints.
- Plots simulate 1/4/8/36 position slots through first-class position records. The 36-slot Farm is a capacity preview in the peer build.
- Work uses a transparent 65% worker / 35% owner test split because the worker funds upkeep and simulated fees.
- Long-term maturity multipliers are flattened to 1.00×–1.25×.
- Strains trade production volume against customer value instead of sharing one output rate.
- Three finite daily contracts replace unlimited repeated NPC sales.
- Auto-water is the safe default; reserves are prepaid and unused HC is refunded.
- Pre-maturity claim-clicks were removed. Harvest settles lazily at completion or at the universal 80% early-exit rate.
- Operator Reputation and season XP are account-bound prototype scores. Access rarity and XP provide the displayed grow multipliers.
- The Genesis Access collection is permanently capped at 420 tokens. Token IDs map one-to-one to catalog specialties, pixel farmer art, and a contract-enforced rarity; each farmer selects their assigned strain in local Plant and Work flows. All 420 identities are playable, including 93 numbered phenotype variants. Generated profiles use bounded yield (0.86-1.18x) and price inputs; retained legacy profiles preserve existing saves. Daily orders use the active owned collection roster with stable per-customer daily caps. These values are simulation estimates awaiting playtesting, not a production economy certification.
- Crew Operations use three bounded weekly crop bays, a 20% personal cap, labeled simulated members, and deterministic cosmetic progression without creating another HC faucet.
- Market Pulse remains read-only and has no game-economy linkage.

## Routes

- `/` — operation dashboard and live positions
- `/practice` — accelerated wallet-free tutorial
- `/plant` — owner-operated position configuration
- `/work` — landless worker contracts
- `/contracts` — finite rotating demand board
- `/crew` — bounded weekly Crew Operation with requested crops, milestones, roster, and cosmetic reward
- `/mint` — zero-cost local mint/reveal simulation with explicit undeployed-contract status
- `/gallery` — searchable, paginated registry of all 420 identities with rarity distribution and utility disclosures
- `/access` — 420-token Genesis seed vault, functional activation, rarity, and XP
- `/land` — four visual land tiers, capped by the 36-slot commercial Farm
- `/positions/:id` — live checkpoint, care, and settlement view
- `/market-lab` — dated, read-only market fixture

## Architecture

- `src/data/economy.ts` owns the v2 economy configuration, strain profiles, contracts, and seasons.
- `src/data/accessCatalog.ts` validates and exposes the 420 one-to-one Genesis identity catalog; its generated estimates are kept outside economy calculations.
- `src/components/AccessSeedArt.tsx` renders deterministic catalog-trait seed art for each Access token.
- `src/data/crew.ts` owns the Monday-UTC Crew Operation lifecycle, simulated demo progress, crop bays, caps, and reward eligibility.
- `src/lib/engine.ts` contains pure position, water, share, maturity, and early-exit calculations.
- `src/state/game.ts` persists the local `v2` state separately from the legacy simulation.
- `src/data/market.ts` remains an isolated display-only provider contract.
- `src/assets/pixel-grow-room-ui.png` and `src/assets/land-*-ui.png` are optimized derivatives of the generated pixel-art scenes.
- `src/assets/crew-operation-*-ui.webp` contains the optimized Crew warehouse hero and non-transferable Operation Seal artwork.
- `src/assets/demand-dispatch-hero-ui.webp` provides the Daily Demand dispatch scene; `src/assets/growth-progression-ui.webp` is the shared Plant and Position stage strip.
- `src/App.tsx` contains route views and simulated transaction orchestration.
- `contracts/src/` contains the Robinhood Chain EVM ownership and position-escrow core; see `contracts/README.md` for its deliberately limited scope and deployment gates.
- `scripts/deploy-robinhood.mjs` refuses non-Robinhood chain IDs and requires an additional explicit confirmation for mainnet.

The 10 playable strains use the project’s High Times source roster. The separate 420-entry Access catalog is explicitly labeled generated collectible lore: its THC windows, popularity, yield bands, and value tiers are not lab-verified or live market data. HC prices, yields, contract demand, and progression are game-design values—not real cannabis, securities, or investment data.


## Cedar Hollow playable farm

The home screen is now a walkable pixel-art homestead. Use WASD/arrow keys or click the ground; E interacts nearby. Building labels walk to a destination, while the toolbar opens the same panels directly. Touch arrows support mobile play.

- Plant an active NFT in a specific bed. Each NFT grows its catalog strain, one crop at a time.
- Choose manual care or funded irrigation, watch four growth stages, and harvest into the shared inventory.
- The market requests active collection strains with finite daily caps; deliver available inventory for local HC.
- Search all 420 farmers in the lodge, recruit local demo farmers, and activate owned farmers.
- Buy capacity at the land office. Additional beds appear across pages of 12, preserving existing crop locations.
- The journal tracks planting, harvesting, delivery and expansion. Game state and character location persist in this browser.

Run `npm run dev:fast` for six-second checkpoints, or `npm run dev` for the existing six-hour production cadence. `npm run build:peer` creates a standalone fast-playtest HTML in `peer-demo/index.html`. The management screens remain available through the farm sidebar.

This is a local single-player prototype. Blockchain deployment, multiplayer, trading between accounts and production economy certification are not included. World art is drawn locally in canvas and does not require downloading art from Tickerfarm.


## Farmer NFTs and automated maturity rewards

The 420 NFT identities are now pixel farmers, each retaining the original strain as a specialty. Every farmer has a distinct deterministic outfit/skin/hat combination. The farmer lodge shows XP and level, lets you select your walking avatar, and retains collection search and rarity filters.

The local game automatically harvests at maturity (and catches up when reopened). Toggle this in Journal to collect manually. Mature cycles award 50 XP and 25 HC per checkpoint; early exits award neither. XP stays with the farmer, levels cap at 50, and the gameplay XP bonus caps at 20%. Cosmetic accents unlock at levels 5, 10, 20, 35 and 50. Initial numerical balance is a playtest design, not a validated production economy.

Smart contracts implement the same maturity reward rules and a non-transferable credit ledger. The bounded testnet automation runner is prepared but is not deployed or running. See `contracts/README.md` for binding, keeper and deployment requirements. No cloud XP database is needed; browser simulation and blockchain accounting remain separate.


### Player interface and collection integration

The farm is the player interface, including old `/overview` bookmarks. Old planting, collection, market and land links open their corresponding farm panels. The legacy dashboard is available only on the development server with `?developer=1`; production builds do not expose it. The farm reuses the original grow-room and hemp growth artwork.

Minting is outside this app's current scope. The user plans to manage the collection through OpenSea. The prepared LoudAccess-based gameplay contracts are not yet an integration with an external collection: confirm its chain, contract address, token standard and token IDs before adapting ownership checks and token-bound XP storage. Existing local demo recruitment does not mint an NFT. Live settlement requires deployed compatible contracts and a funded executor; browser auto-collection remains a local simulation.


### Crop neglect (local game)
Manual crops become thirsty below 50% water, wilt at zero water (24 production hours), and fail after 48 hours since the last care while still growing. Watering before failure rescues them; later watering cannot erase historical failure. Irrigation prevents failure. Mature crops do not spoil. Failed crops yield zero inventory, XP, maturity HC, reputation or season XP; clearing releases the farmer with existing XP intact. Automatic collection also clears failed crops. The six-second playtest uses the same rules on a compressed clock. These neglect mechanics are local gameplay and are not implemented in the prepared on-chain contracts yet.
