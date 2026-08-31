import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ContractFactory, keccak256, parseEther, toBeHex, toUtf8Bytes, zeroPadValue } from 'ethers';
import { network } from 'hardhat';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const FEE = parseEther('0.000001');
const SIX_HOURS = 6 * 60 * 60;
const ACCESS_CATALOG = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'catalog_420_v2.json'), 'utf8'),
);
const RARITY_INDEX = new Map(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((rarity, index) => [rarity, index]));
const STRAINS = [
  'og-kush',
  'sour-diesel',
  'blueberry',
  'granddaddy-purple',
  'durban-poison',
  'strawberry-cough',
  'northern-lights-5',
  'super-lemon-haze',
].map((strain) => keccak256(toUtf8Bytes(strain)));

function artifact(name) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'contracts', 'artifacts', `${name}.json`), 'utf8'),
  );
}

async function deploy(name, signer, args = []) {
  const compiled = artifact(name);
  const contract = await new ContractFactory(compiled.abi, compiled.bytecode, signer).deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

describe('Robinhood Chain contract core', () => {
  let connection;
  let provider;
  let admin;
  let owner;
  let worker;
  let recipient;
  let access;
  let plot;
  let positions;

  beforeEach(async () => {
    connection = await network.create('hardhatRobinhood');
    provider = connection.ethers.provider;
    [admin, owner, worker, recipient] = await connection.ethers.getSigners();

    access = await deploy('LoudAccess', admin, [await admin.getAddress(), 'ipfs://access/']);
    plot = await deploy('LoudPlot', admin, [await admin.getAddress(), 'ipfs://plots/']);
    positions = await deploy('LoudPositions', admin, [
      await admin.getAddress(),
      await access.getAddress(),
      await plot.getAddress(),
      STRAINS,
    ]);
    await (await plot.connect(admin).setPositionManager(await positions.getAddress())).wait();
  }, 30_000);

  afterEach(async () => {
    await connection.close();
  });

  async function mintOwnerPair(tier = 0, activated = true) {
    await mintAccess(await owner.getAddress(), activated);
    await (await plot.connect(admin).mint(await owner.getAddress(), tier)).wait();
    await (await access.connect(owner).approve(await positions.getAddress(), 1)).wait();
  }

  async function mintAccess(to, activated = true) {
    const tokenId = await access.nextTokenId();
    const rarity = await access.genesisRarity(tokenId);
    await (await access.connect(admin).mint(to, rarity, activated)).wait();
    return tokenId;
  }

  it('commits every catalog token to its canonical on-chain rarity', async () => {
    const encodedRarities = await Promise.all(
      ACCESS_CATALOG.map((entry) => access.genesisRarity(entry.id)),
    );
    for (let index = 0; index < ACCESS_CATALOG.length; index += 1) {
      expect(encodedRarities[index]).toBe(BigInt(RARITY_INDEX.get(ACCESS_CATALOG[index].rarity)));
    }

    await expect(access.genesisRarity(0)).rejects.toThrow();
    await expect(access.genesisRarity(421)).rejects.toThrow();
    await expect(access.connect(admin).mint(await owner.getAddress(), 0, false)).rejects.toThrow();
    expect(await access.totalSupply()).toBe(0n);
    expect(await access.remainingSupply()).toBe(420n);
  });

  it('enforces the permanent 420-token Genesis Access cap', async () => {
    expect(await access.MAX_SUPPLY()).toBe(420n);
    const nextTokenIdLayout = artifact('LoudAccess').storageLayout.storage.find((entry) => entry.label === 'nextTokenId');
    expect(nextTokenIdLayout).toBeDefined();
    const nextTokenIdSlot = toBeHex(BigInt(nextTokenIdLayout.slot));
    const finalTokenId = zeroPadValue(toBeHex(420), 32);
    await connection.provider.request({
      method: 'hardhat_setStorageAt',
      params: [await access.getAddress(), nextTokenIdSlot, finalTokenId],
    });
    await connection.provider.request({ method: 'evm_mine', params: [] });
    expect(await access.nextTokenId()).toBe(420n);
    await (await access.connect(admin).mint(await owner.getAddress(), 0, false)).wait();
    expect(await access.nextTokenId()).toBe(421n);
    expect(await access.totalSupply()).toBe(420n);
    expect(await access.remainingSupply()).toBe(0n);
    await expect(access.connect(admin).mint(await owner.getAddress(), 0, false)).rejects.toThrow();
  });

  it('encodes the four promised plot capacities, including the 36-slot Farm', async () => {
    expect(await plot.capacityForTier(0)).toBe(1n);
    expect(await plot.capacityForTier(1)).toBe(4n);
    expect(await plot.capacityForTier(2)).toBe(8n);
    expect(await plot.capacityForTier(3)).toBe(36n);
  });

  it('escrows Access, settles checkpoints lazily, and releases it on close', async () => {
    await mintOwnerPair();
    const strain = keccak256(toUtf8Bytes('og-kush'));

    await (await positions.connect(owner).openPosition(1, 1, strain, 1, false, { value: FEE })).wait();
    expect(await access.ownerOf(1)).toBe(await positions.getAddress());
    expect(await positions.activePositionCountByPlot(1)).toBe(1n);

    await connection.provider.request({ method: 'evm_increaseTime', params: [SIX_HOURS] });
    await connection.provider.request({ method: 'evm_mine', params: [] });
    expect(await positions.completedSteps(1)).toBe(1n);

    await (await positions.connect(owner).closePosition(1, { value: FEE })).wait();
    expect(await access.ownerOf(1)).toBe(await owner.getAddress());
    expect(await positions.activePositionCountByPlot(1)).toBe(0n);
    expect(await positions.accruedFees()).toBe(FEE * 2n);

    await connection.provider.request({ method: 'evm_increaseTime', params: [SIX_HOURS * 5] });
    await connection.provider.request({ method: 'evm_mine', params: [] });
    expect(await positions.completedSteps(1)).toBe(1n);
  });

  it('requires the exact flat protocol fee and activated Access', async () => {
    await mintOwnerPair(0, false);
    const strain = keccak256(toUtf8Bytes('blueberry'));

    await expect(positions.connect(owner).openPosition(1, 1, strain, 1, false)).rejects.toThrow();
    await expect(
      positions.connect(owner).openPosition(1, 1, strain, 1, false, { value: FEE }),
    ).rejects.toThrow();
  });

  it('rejects empty strain identifiers and unauthorized closure attempts', async () => {
    await mintOwnerPair();
    await expect(
      positions.connect(owner).openPosition(1, 1, `0x${'00'.repeat(32)}`, 1, false, { value: FEE }),
    ).rejects.toThrow();

    const strain = keccak256(toUtf8Bytes('granddaddy-purple'));
    await (
      await positions.connect(owner).openPosition(1, 1, strain, 1, false, { value: FEE, gasLimit: 3_000_000 })
    ).wait();
    await expect(positions.connect(worker).closePosition(1, { value: FEE })).rejects.toThrow();
    expect(await access.ownerOf(1)).toBe(await positions.getAddress());
  });

  it('blocks plot transfers while occupied and allows them after release', async () => {
    await mintOwnerPair();
    const strain = keccak256(toUtf8Bytes('durban-poison'));
    await (await positions.connect(owner).openPosition(1, 1, strain, 4, false, { value: FEE })).wait();

    await expect(
      plot.connect(owner).transferFrom(await owner.getAddress(), await recipient.getAddress(), 1),
    ).rejects.toThrow();

    await (await positions.connect(owner).closePosition(1, { value: FEE })).wait();
    await (await plot.connect(owner).transferFrom(await owner.getAddress(), await recipient.getAddress(), 1)).wait();
    expect(await plot.ownerOf(1)).toBe(await recipient.getAddress());
  });

  it('enforces plot capacity on-chain', async () => {
    await mintAccess(await owner.getAddress());
    await mintAccess(await owner.getAddress());
    await (await plot.connect(admin).mint(await owner.getAddress(), 0)).wait();
    await (await access.connect(owner).setApprovalForAll(await positions.getAddress(), true)).wait();
    const strain = keccak256(toUtf8Bytes('sour-diesel'));

    await (await positions.connect(owner).openPosition(1, 1, strain, 28, false, { value: FEE })).wait();
    await expect(
      positions.connect(owner).openPosition(2, 1, strain, 28, false, { value: FEE }),
    ).rejects.toThrow();
    expect(await access.ownerOf(2)).toBe(await owner.getAddress());
  });

  it('requires current plot-owner opt-in for worker positions', async () => {
    await mintAccess(await worker.getAddress());
    await (await plot.connect(admin).mint(await owner.getAddress(), 1)).wait();
    await (await access.connect(worker).approve(await positions.getAddress(), 1)).wait();
    const strain = keccak256(toUtf8Bytes('strawberry-cough'));

    await expect(
      positions.connect(worker).openPosition(1, 1, strain, 2, true, { value: FEE }),
    ).rejects.toThrow();

    await (await positions.connect(owner).setWorkerAccess(1, await worker.getAddress(), true)).wait();
    expect(await positions.workerAccessOpen(1, await worker.getAddress())).toBe(true);
    // Explicit gas limit bypasses Ganache's stale estimate cache after the intentionally reverted call above.
    await (
      await positions.connect(worker).openPosition(1, 1, strain, 2, true, { value: FEE, gasLimit: 3_000_000 })
    ).wait();
    const position = await positions.positions(1);
    expect(position.player).toBe(await worker.getAddress());
    expect(position.plotOwner).toBe(await owner.getAddress());
    expect(position.worker).toBe(true);
    expect(position.playerShareBps).toBe(6500n);
    expect(position.plotOwnerShareBps).toBe(3500n);
  });

  it('uses per-worker approval rather than opening a plot to every Access holder', async () => {
    await mintAccess(await worker.getAddress());
    await mintAccess(await recipient.getAddress());
    await (await plot.connect(admin).mint(await owner.getAddress(), 1)).wait();
    await (await access.connect(worker).approve(await positions.getAddress(), 1)).wait();
    await (await access.connect(recipient).approve(await positions.getAddress(), 2)).wait();
    await (await positions.connect(owner).setWorkerAccess(1, await worker.getAddress(), true)).wait();

    expect(await positions.workerAccessOpen(1, await worker.getAddress())).toBe(true);
    expect(await positions.workerAccessOpen(1, await recipient.getAddress())).toBe(false);
    await expect(
      positions.connect(recipient).openPosition(2, 1, STRAINS[0], 1, true, { value: FEE }),
    ).rejects.toThrow();
  });

  it('lets anyone settle a mature worker position and releases the plot without taking the worker Access', async () => {
    await mintAccess(await worker.getAddress());
    await (await plot.connect(admin).mint(await owner.getAddress(), 1)).wait();
    await (await access.connect(worker).approve(await positions.getAddress(), 1)).wait();
    await (await positions.connect(owner).setWorkerAccess(1, await worker.getAddress(), true)).wait();
    await (await positions.connect(worker).openPosition(1, 1, STRAINS[0], 1, true, { value: FEE })).wait();

    await expect(positions.connect(owner).settleMaturePosition(1)).rejects.toThrow();
    await connection.provider.request({ method: 'evm_increaseTime', params: [SIX_HOURS] });
    await connection.provider.request({ method: 'evm_mine', params: [] });
    await (await positions.connect(recipient).settleMaturePosition(1)).wait();

    expect(await access.ownerOf(1)).toBe(await worker.getAddress());
    expect(await positions.activePositionCountByPlot(1)).toBe(0n);
    await (await plot.connect(owner).transferFrom(await owner.getAddress(), await recipient.getAddress(), 1)).wait();
  });

  it('rejects unknown strains and permits an admin to extend the registry', async () => {
    await mintOwnerPair();
    const newStrain = keccak256(toUtf8Bytes('future-strain'));
    await expect(
      positions.connect(owner).openPosition(1, 1, newStrain, 1, false, { value: FEE }),
    ).rejects.toThrow();
    await (await positions.connect(admin).setStrainAllowed(newStrain, true)).wait();
    await (await positions.connect(owner).openPosition(1, 1, newStrain, 1, false, { value: FEE })).wait();
    expect(await positions.allowedStrain(newStrain)).toBe(true);
  });

  it('always lets the player recover escrowed Access for free during a pause', async () => {
    await mintOwnerPair();
    const strain = keccak256(toUtf8Bytes('northern-lights-5'));
    await (await positions.connect(owner).openPosition(1, 1, strain, 28, false, { value: FEE })).wait();

    await (await positions.connect(admin).pause()).wait();
    await (await positions.connect(owner).emergencyWithdraw(1)).wait();
    expect(await access.ownerOf(1)).toBe(await owner.getAddress());
    expect((await positions.positions(1)).closed).toBe(true);
  });

  it('rejects accidental safe transfers and can recover untracked raw transfers only while paused', async () => {
    await mintAccess(await owner.getAddress());

    await expect(
      access
        .connect(owner)
        ['safeTransferFrom(address,address,uint256)'](await owner.getAddress(), await positions.getAddress(), 1),
    ).rejects.toThrow();
    expect(await access.ownerOf(1)).toBe(await owner.getAddress());

    await (
      await access.connect(owner).transferFrom(await owner.getAddress(), await positions.getAddress(), 1)
    ).wait();
    await expect(positions.connect(admin).recoverUntrackedAccess(1, await owner.getAddress())).rejects.toThrow();
    await (await positions.connect(admin).pause()).wait();
    await (
      await positions
        .connect(admin)
        .recoverUntrackedAccess(1, await owner.getAddress(), { gasLimit: 1_000_000 })
    ).wait();
    expect(await access.ownerOf(1)).toBe(await owner.getAddress());
  });

  it('uses pull-based fee withdrawal and rejects unauthorized callers', async () => {
    await mintOwnerPair();
    const strain = keccak256(toUtf8Bytes('super-lemon-haze'));
    await (await positions.connect(owner).openPosition(1, 1, strain, 1, false, { value: FEE })).wait();

    await expect(
      positions.connect(worker).withdrawFees(await recipient.getAddress(), FEE),
    ).rejects.toThrow();
    await (await positions.connect(admin).withdrawFees(await recipient.getAddress(), FEE)).wait();
    expect(await positions.accruedFees()).toBe(0n);
  });
});
