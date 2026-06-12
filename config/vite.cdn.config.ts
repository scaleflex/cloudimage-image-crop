import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * CDN build — a single self-contained IIFE that registers `<sfx-crop>`.
 *
 * Unlike the npm bundle (`vite.config.ts`), `lit` is **bundled in** (not
 * external) so the file works standalone via `<script src=".../image-crop.min.js">`
 * with no import map or peer install. React is irrelevant here — the CDN
 * entry is the framework-agnostic custom element only.
 *
 * Output: dist-cdn/image-crop.min.js
 */
export default defineConfig({
  build: {
    outDir: resolve(__dirname, '../dist-cdn'),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, '../src/define.ts'),
      formats: ['iife'],
      name: 'SfxCrop',
      fileName: () => 'image-crop.min.js',
    },
    cssCodeSplit: false,
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});
