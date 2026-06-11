import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/image-crop/',
  root: resolve(__dirname, '../demo'),
  build: {
    outDir: resolve(__dirname, '../dist-demo'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});
