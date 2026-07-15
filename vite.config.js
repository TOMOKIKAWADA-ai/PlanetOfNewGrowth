import { defineConfig } from 'vite';
import { Config } from './src/config.js';

export default defineConfig({
  publicDir: Config.visuals.useAssetModels ? 'assets' : false,
  build: {
    target: 'esnext'
  },
  esbuild: {
    target: 'esnext'
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false
  }
});
