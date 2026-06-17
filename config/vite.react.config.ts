import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

/**
 * React wrapper bundle — thin layer on top of the main `<cloudimage-crop>` element.
 *
 * Produces:
 *   dist/react/index.js    (ESM)
 *   dist/react/index.cjs   (CJS)
 *   dist/react/index.d.ts  (types, scoped via tsconfig.react.json)
 *
 * `react`, `react-dom`, `react/jsx-runtime`, `lit`, and the main package
 * itself are all external so consumers dedupe them.
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/react/**/*.ts', 'src/react/**/*.tsx'],
      tsconfigPath: resolve(__dirname, '../tsconfig.react.json'),
      outDir: resolve(__dirname, '../dist/react'),
      entryRoot: resolve(__dirname, '../src/react'),
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, '../src/react/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^@scaleflex\/crop/,
        'lit',
        /^lit\//,
      ],
    },
    sourcemap: true,
    outDir: resolve(__dirname, '../dist/react'),
    // Runs after build:bundle; clears only its own dist/react/ subdir.
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});
