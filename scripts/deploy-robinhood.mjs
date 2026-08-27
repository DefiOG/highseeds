import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers';

const CHAINS = {
  46630: { name: 'Robinhood Chain Testnet', manifest: 'robinhood-testnet.json' },
  4663: { name: 'Robinhood Chain Mainnet', manifest: 'robinhood-mainnet.json' },
};

const rpcUrl = process.env.ROBINHOOD_RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!rpcUrl || !privateKey) {
  throw new Error('Set ROBINHOOD_RPC_URL and DEPLOYER_PRIVATE_KEY in your shell. Never commit either value.');
}

const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
const chainId = Number(network.chainId);
const chain = CHAINS[chainId];
if (!chain) throw new Error(`Refusing deployment to chain ${chainId}; expected Robinhood Chain 46630 or 4663.`);
if (chainId === 4663 && process.env.CONFIRM_MAINNET !== 'ROBINHOOD_MAINNET') {
  throw new Error('Mainnet is locked. Set CONFIRM_MAINNET=ROBINHOOD_MAINNET only after testnet verification and audit.');
}

const wallet = new Wallet(privateKey, provider);
const admin = process.env.ADMIN_ADDRESS || wallet.address;
if (admin.toLowerCase() !== wallet.address.toLowerCase()) {
  throw new Error('For this deployment script ADMIN_ADDRESS must equal the deployer; transfer roles after binding the suite.');
}
const accessBaseUri = process.env.ACCESS_BASE_URI || '';
const plotBaseUri = process.env.PLOT_BASE_URI || '';
const artifactRoot = path.join(process.cwd(), 'contracts', 'artifacts');

function artifact(name) {
  return JSON.parse(fs.readFileSync(path.join(artifactRoot, `${name}.json`), 'utf8'));
}

async function deploy(name, args) {
  const compiled = artifact(name);
  const factory = new ContractFactory(compiled.abi, compiled.bytecode, wallet);
  const contract = await factory.deploy(...args);
  const deployment = contract.deploymentTransaction();
  console.log(`${name}: submitted ${deployment.hash}`);
  await contract.waitForDeployment();
  const receipt = await deployment.wait();
  return {
    contract,
    address: await contract.getAddress(),
    transactionHash: deployment.hash,
    gasUsed: receipt.gasUsed.toString(),
  };
}

console.log(`Deploying to ${chain.name} (${chainId}) from ${wallet.address}`);
const access = await deploy('LoudAccess', [admin, accessBaseUri]);
const plot = await deploy('LoudPlot', [admin, plotBaseUri]);
const positions = await deploy('LoudPositions', [admin, access.address, plot.address]);

const plotContract = plot.contract.connect(wallet);
const binding = await plotContract.setPositionManager(positions.address);
const bindingReceipt = await binding.wait();

const manifest = {
  chainId,
  network: chain.name,
  deployedAt: new Date().toISOString(),
  deployer: wallet.address,
  admin,
  protocolFeeWei: '1000000000000',
  checkpointSeconds: 21600,
  contracts: {
    LoudAccess: { address: access.address, transactionHash: access.transactionHash, gasUsed: access.gasUsed },
    LoudPlot: { address: plot.address, transactionHash: plot.transactionHash, gasUsed: plot.gasUsed },
    LoudPositions: { address: positions.address, transactionHash: positions.transactionHash, gasUsed: positions.gasUsed },
  },
  positionManagerBinding: { transactionHash: binding.hash, gasUsed: bindingReceipt.gasUsed.toString() },
};

const deploymentRoot = path.join(process.cwd(), 'deployments');
fs.mkdirSync(deploymentRoot, { recursive: true });
const outputPath = path.join(deploymentRoot, chain.manifest);
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Deployment manifest written to ${outputPath}`);
