import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(['file', 'peer'].includes(mode) ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
  define: {
    __FAST_TIME__: JSON.stringify(mode === 'qa' || mode === 'peer'),
  },
  build: {
    sourcemap: mode === 'qa',
  },
}));
