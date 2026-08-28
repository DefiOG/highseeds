export const ROBINHOOD_CHAIN_TESTNET = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  explorerUrl: 'https://explorer.testnet.chain.robinhood.com',
} as const;

export const ROBINHOOD_CHAIN_MAINNET = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  explorerUrl: 'https://robinhoodchain.blockscout.com',
} as const;

export const LOUD_LEDGER_PROTOCOL_FEE_WEI = 1_000_000_000_000n;

export function getContractAddresses(chainId: number) {
  if (chainId !== ROBINHOOD_CHAIN_MAINNET.id && chainId !== ROBINHOOD_CHAIN_TESTNET.id) {
    throw new Error(`Unsupported chain ${chainId}; select Robinhood Chain mainnet or testnet.`);
  }
  const prefix = chainId === ROBINHOOD_CHAIN_MAINNET.id ? 'VITE_ROBINHOOD_MAINNET' : 'VITE_ROBINHOOD_TESTNET';
  return {
    access: import.meta.env[`${prefix}_ACCESS_ADDRESS`] as `0x${string}` | undefined,
    plot: import.meta.env[`${prefix}_PLOT_ADDRESS`] as `0x${string}` | undefined,
    positions: import.meta.env[`${prefix}_POSITIONS_ADDRESS`] as `0x${string}` | undefined,
  };
}
