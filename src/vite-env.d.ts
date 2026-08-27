/// <reference types="vite/client" />

declare const __FAST_TIME__: boolean;

interface ImportMetaEnv {
  readonly VITE_ROBINHOOD_TESTNET_ACCESS_ADDRESS?: string;
  readonly VITE_ROBINHOOD_TESTNET_PLOT_ADDRESS?: string;
  readonly VITE_ROBINHOOD_TESTNET_POSITIONS_ADDRESS?: string;
  readonly VITE_ROBINHOOD_MAINNET_ACCESS_ADDRESS?: string;
  readonly VITE_ROBINHOOD_MAINNET_PLOT_ADDRESS?: string;
  readonly VITE_ROBINHOOD_MAINNET_POSITIONS_ADDRESS?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
