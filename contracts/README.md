# Loud Ledger contracts

This directory contains the deliberately small EVM core for Robinhood Chain:

- `LoudAccess.sol`: role-minted ERC-721 farmer collectibles with a permanent 420-token Genesis cap, catalog-committed rarity, activation, and token-bound XP capped at 12,250 (level 50). The contract exposes minted and remaining supply directly.
- `LoudPlot.sol`: role-minted ERC-721 plots with fixed Pot/Room/House/Farm capacities of 1/4/8/36. Occupied plots cannot transfer.
- `LoudPositions.sol`: Farmer escrow, per-worker authorization, 420 immutable strain specialties, contract-fixed 65/35 worker terms, six-hour lazy checkpoints, permissionless mature settlement, exact player open/close protocol fees, pause, fee-free player emergency withdrawal, and pull-based treasury withdrawals.

Mature positions award 50 farmer XP and 25 non-transferable HC per six-hour checkpoint. HC belongs to the original position player; XP stays with the farmer NFT across transfers. HC can activate an owned inactive farmer for 4,200 credits. Grams, demand, Crew progress and market data remain local simulation features. The browser prototype currently remains a separate local simulation; it does not call deployed contracts.

## Local verification

```powershell
npm.cmd run contracts:compile
npm.cmd test
npm.cmd run contracts:estimate
```

Generated full artifacts are written to `contracts/artifacts/` and excluded from Git. ABI-only files used by the frontend are written to `src/chain/generated/`.

## Robinhood Chain testnet

The deployment script accepts only chain ID `46630` (testnet) or `4663` (mainnet). Mainnet also requires an explicit confirmation variable.

```powershell
$env:ROBINHOOD_RPC_URL = 'https://rpc.testnet.chain.robinhood.com'
$env:DEPLOYER_PRIVATE_KEY = '<dedicated testnet deployer key>'
npm.cmd run contracts:deploy:robinhood
Remove-Item Env:DEPLOYER_PRIVATE_KEY
```

Use a dedicated deployer wallet with only the ETH required for deployment. Never use a personal wallet seed phrase, never place a private key in a `VITE_*` variable, and never commit a funded key. The public RPC is rate-limited; use a managed endpoint for production.

The script writes public addresses and transaction hashes to `deployments/robinhood-testnet.json`. Copy those addresses into local `VITE_ROBINHOOD_TESTNET_*` variables when the frontend wallet provider is enabled.

## Mainnet gates

Do not deploy mainnet until all of these are true:

1. The exact bytecode has completed a sustained testnet run.
2. An independent Solidity security review or audit has cleared the release.
3. Admin, pauser, and treasury roles have a documented multisig/timelock plan.
4. Emergency withdrawal has been rehearsed with the deployed contracts.
5. Metadata is hosted and its mutability policy is decided.
6. The mainnet deployer contains only the measured deployment amount.

For mainnet, the deployment command additionally requires `CONFIRM_MAINNET=ROBINHOOD_MAINNET`. That guard is not an audit or approval; it only prevents accidental execution against chain ID 4663.


## Rewards protocol v3

- A farmer's entire selected term (1, 2, 4, 12 or 28 six-hour checkpoints) must finish before any XP or maturity HC is awarded.
- Rewards do not accrue from idle wallet ownership. Longer terms produce the same XP/HC per unit time, not an extra emissions multiplier.
- A completed term awards `50 * steps` XP (capped at 12,250 total) and `25 * steps` HC. HC has no transfer, redemption, ETH payout or ERC-20 interface. Rates are immutable in this version.
- Early exit and paused emergency withdrawal return the NFT without maturity rewards. The local crop simulation still supports its existing reduced early inventory payout.
- Anyone may call `settleMaturePosition`. The caller cannot redirect either the NFT or rewards. The transaction consumes gas; the protocol does not charge an additional settlement fee on this path.
- Closing marks the position settled before external calls. Repeated settlement reverts. XP can only be written by the one-time bound position manager, not directly by the admin's GAME_ROLE.
- Bind BOTH the plot and farmer contracts to the positions contract after deployment. The deployment and cost scripts include both bindings.
- The farmer's strain mapping is supplied from the validated 420-row catalog at deployment, recorded as `catalogHash`, and cannot subsequently be rewritten by an admin. Verify the deployment catalog hash and all bindings before minting to users.

## Automation without an XP database

The chain stores position timestamps, XP, credits, ownership and active farmer IDs. A keeper only reads these values and submits permissionless mature-settlement transactions; it never decides who earned a reward. No cloud database or keeper admin role is needed for this core.

`npm.cmd run rewards:keeper -- --help` describes the runner. Dry-run is the default. Set `ROBINHOOD_RPC_URL` and supply the verified `deployments/robinhood-testnet.json` to inspect eligible positions. The runner refuses other chain IDs or protocol versions.

After a dedicated executor has been funded and the deployment verified, execution requires `--execute`, `KEEPER_PRIVATE_KEY`, `KEEPER_MAX_FEE_GWEI`, and `KEEPER_MAX_TOTAL_GAS_WEI`. Set secrets in the operator environment, never in frontend variables. `--watch` checks every 30 seconds for up to 60 passes. A process submits at most 20 transactions, reserves its execution gas budget before each send, and stops on uncertain receipts. Chain data fees must also be considered when funding an executor.

This runner is intentionally a bounded testnet tool. A production supervisor/schedule, monitored gas funding, provider reliability, metadata hosting, and independent security review remain deployment work. No keeper service is provisioned or running from this repository alone. Manual permissionless settlement remains available if the keeper stops.

The local browser separately simulates automatic harvest while open and on return. Its save file and clock are editable and are not evidence for on-chain rewards. Do not import browser XP or balances as trusted chain state.
