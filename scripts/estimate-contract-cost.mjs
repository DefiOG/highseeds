import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ContractFactory, formatEther, parseUnits } from 'ethers';
import { network } from 'hardhat';

const connection = await network.create('hardhatRobinhood');
const [signer] = await connection.ethers.getSigners();
const artifactRoot = path.join(process.cwd(), 'contracts', 'artifacts');

function artifact(name) {
  return JSON.parse(fs.readFileSync(path.join(artifactRoot, `${name}.json`), 'utf8'));
}

async function deploy(name, args) {
  const compiled = artifact(name);
  const factory = new ContractFactory(compiled.abi, compiled.bytecode, signer);
  const contract = await factory.deploy(...args);
  const receipt = await contract.deploymentTransaction().wait();
  return {
    contract,
    gasUsed: receipt.gasUsed,
    creationBytes: (compiled.bytecode.length - 2) / 2,
    runtimeBytes: (compiled.deployedBytecode.length - 2) / 2,
  };
}

const admin = await signer.getAddress();
const access = await deploy('LoudAccess', [admin, '']);
const plot = await deploy('LoudPlot', [admin, '']);
const positions = await deploy('LoudPositions', [
  admin,
  await access.contract.getAddress(),
  await plot.contract.getAddress(),
]);
const bindingReceipt = await (
  await plot.contract.setPositionManager(await positions.contract.getAddress())
).wait();

const gasPriceGwei = process.env.GAS_PRICE_GWEI || '0.034924';
const gasPrice = parseUnits(gasPriceGwei, 'gwei');
const totalGas = access.gasUsed + plot.gasUsed + positions.gasUsed + bindingReceipt.gasUsed;

console.table([
  { contract: 'LoudAccess', creationBytes: access.creationBytes, runtimeBytes: access.runtimeBytes, gasUsed: access.gasUsed.toString() },
  { contract: 'LoudPlot', creationBytes: plot.creationBytes, runtimeBytes: plot.runtimeBytes, gasUsed: plot.gasUsed.toString() },
  { contract: 'LoudPositions', creationBytes: positions.creationBytes, runtimeBytes: positions.runtimeBytes, gasUsed: positions.gasUsed.toString() },
  { contract: 'Manager binding', creationBytes: '-', runtimeBytes: '-', gasUsed: bindingReceipt.gasUsed.toString() },
]);
console.log(`Total local-EVM gas: ${totalGas}`);
console.log(`Execution-cost estimate at ${gasPriceGwei} gwei: ${formatEther(totalGas * gasPrice)} ETH`);
console.log('Robinhood Chain also includes variable L1 data cost; obtain eth_estimateGas immediately before deployment.');

await connection.close();
