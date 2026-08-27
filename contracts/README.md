# Loud Ledger contracts

This directory contains the deliberately small EVM core for Robinhood Chain:

- `LoudAccess.sol`: role-minted ERC-721 Access collectibles with activation, rarity, and account-bound XP metadata.
- `LoudPlot.sol`: role-minted ERC-721 plots with fixed Pot/Room/House/Farm capacities of 1/4/8/36. Occupied plots cannot transfer.
- `LoudPositions.sol`: Access escrow, owner/worker authorization, six-hour lazy checkpoints, exact open/close protocol fees, pause, fee-free player emergency withdrawal, and pull-based treasury withdrawals.

HC, grams, demand, Crew progress, market data, and reward calculations are intentionally not tokens and are not written by these contracts.

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
