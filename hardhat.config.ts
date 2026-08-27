import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import { defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatEthers],
  solidity: {
    profiles: {
      default: {
        version: '0.8.30',
        settings: {
          evmVersion: 'shanghai',
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: {
    hardhatRobinhood: {
      type: 'edr-simulated',
      chainType: 'generic',
      chainId: 46630,
    },
  },
  paths: {
    sources: './contracts/src',
  },
});
