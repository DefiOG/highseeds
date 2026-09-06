import fs from 'node:fs';
import path from 'node:path';
import { Contract, JsonRpcProvider, Wallet, parseUnits } from 'ethers';

// Permissionless testnet executor. It has no GAME_ROLE and cannot redirect rewards.
// All transactions remain optional: dry-run is the default.
if (process.argv.includes('--help')) {
  console.log('Rewards keeper: npm run rewards:keeper [-- --watch] [-- --execute]');
  console.log('Requires ROBINHOOD_RPC_URL and deployments/robinhood-testnet.json.');
  console.log('Execution also requires KEEPER_PRIVATE_KEY, KEEPER_MAX_FEE_GWEI and KEEPER_MAX_TOTAL_GAS_WEI.');
  console.log('Defaults: dry-run, one pass; --watch runs up to 60 passes, every 30 seconds. Maximum 20 transactions per process.');
  process.exit(0);
}

const execute = process.argv.includes('--execute');
const watch = process.argv.includes('--watch');
const rpc = process.env.ROBINHOOD_RPC_URL;
if (!rpc) throw new Error('Set ROBINHOOD_RPC_URL. No RPC endpoint is configured.');
const manifestPath = path.resolve('deployments/robinhood-testnet.json');
if (!fs.existsSync(manifestPath)) throw new Error('Deploy and verify the v3 testnet suite first; its deployment manifest is missing.');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.chainId !== 46630 || manifest.configVersion !== 3) throw new Error('Only the v3 testnet deployment is supported by this runner.');
const provider = new JsonRpcProvider(rpc);
if ((await provider.getNetwork()).chainId !== 46630n) throw new Error('RPC chain mismatch. This runner is testnet-only.');
const abi = JSON.parse(fs.readFileSync('src/chain/generated/LoudPositions.json', 'utf8')).abi;
const read = new Contract(manifest.contracts.LoudPositions.address, abi, provider);
if ((await read.CONFIG_VERSION()) !== 3n) throw new Error('The deployed protocol is not v3.');
let signer, feeCeiling = 0n, remainingGasBudget = 0n;
if (execute) {
  if (!process.env.KEEPER_PRIVATE_KEY || !process.env.KEEPER_MAX_FEE_GWEI || !process.env.KEEPER_MAX_TOTAL_GAS_WEI) throw new Error('Execution requires a dedicated keeper key and explicit fee/budget limits.');
  signer = new Wallet(process.env.KEEPER_PRIVATE_KEY, provider);
  feeCeiling = parseUnits(process.env.KEEPER_MAX_FEE_GWEI, 'gwei');
  remainingGasBudget = BigInt(process.env.KEEPER_MAX_TOTAL_GAS_WEI);
  if (feeCeiling <= 0n || remainingGasBudget <= 0n) throw new Error('Fee and budget limits must be positive.');
}
let transactions = 0;
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  for (let pass = 0; pass < (watch ? 60 : 1) && !stopping; pass++) {
    if (await read.paused()) { console.log('Protocol paused; no settlements submitted.'); break; }
    const block = await provider.getBlock('latest');
    const candidates = [];
    // The collection is fixed at 420, so scanning active NFT IDs needs no database
    // or unbounded historical event scans. RPC batches are bounded to 20 reads.
    for (let start = 1; start <= 420 && !stopping; start += 20) {
      const ids = await Promise.all(Array.from({ length: Math.min(20, 421-start) }, (_, i) => read.activePositionForAccess(start+i)));
      for (const id of ids) {
        if (id === 0n) continue;
        const position = await read.positions(id);
        if (!position.closed && BigInt(block.timestamp) >= position.startedAt + BigInt(position.durationSteps) * 21600n) candidates.push(id);
      }
    }
    console.log(`${new Date().toISOString()}: ${candidates.length} mature positions; ${execute ? 'execution enabled' : 'dry-run'}.`);
    if (execute) {
      const writer = read.connect(signer);
      for (const id of candidates) {
        if (stopping || transactions >= 20) break;
        // Another keeper/player may win the race. Simulation must still succeed.
        try { await writer.settleMaturePosition.staticCall(id); }
        catch { console.log(`Position ${id} no longer eligible; skipped.`); continue; }
        const fees = await provider.getFeeData();
        const maxFee = fees.maxFeePerGas ?? fees.gasPrice;
        if (!maxFee || maxFee > feeCeiling) { console.log('Current gas price exceeds the configured ceiling.'); break; }
        const estimate = await writer.settleMaturePosition.estimateGas(id);
        const gasLimit = estimate * 120n / 100n;
        const worstCase = gasLimit * maxFee;
        if (gasLimit > 600000n || worstCase > remainingGasBudget) { console.log('Execution gas budget reached.'); stopping = true; break; }
        // Reserve before sending, including on uncertain receipts. Never replay an
        // uncertain transaction in a tight loop or reclaim its reserved budget.
        remainingGasBudget -= worstCase;
        const tx = await writer.settleMaturePosition(id, { gasLimit, maxFeePerGas: maxFee, maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? 0n });
        transactions++;
        console.log(`Position ${id}: submitted ${tx.hash}`);
        const receipt = await tx.wait(1, 120000);
        if (!receipt || receipt.status !== 1) throw new Error('Settlement receipt was not successful; stopping for inspection.');
      }
    }
    if (transactions >= 20) break;
    if (watch && pass < 59 && !stopping) await sleep(30000);
  }
} finally {
  provider.destroy();
}
