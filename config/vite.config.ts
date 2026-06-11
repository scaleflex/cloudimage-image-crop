import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

/**
 * Main library bundle — produces:
 *   dist/index.js        (ESM, tree-shakeable, no side-effects)
 *   dist/index.cjs       (CJS)
 *   dist/index.d.ts      (types)
 *   dist/define.js       (ESM, side-effect: registers custom elements)
 *   dist/define.cjs      (CJS)
 *   dist/define.d.ts     (types)
 *
 * Scaleflex convention (matches @scaleflex/asset-picker, @scaleflex/uploader):
 *   - ESM + CJS, no UMD
 *   - `lit` kept external so consumers dedupe across packages
 *   - two entries: `.` pure, `./define` side-effectful
 */
export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/react/**/*', 'tests/**/*'],
      rollupTypes: false,
      tsconfigPath: resolve(__dirname, '../tsconfig.build.json'),
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, '../src/index.ts'),
        define: resolve(__dirname, '../src/define.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'lit',
        'lit/decorators.js',
        /^lit\//,
      ],
      output: [
        {
          format: 'es',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          exports: 'named',
        },
        {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name]-[hash].cjs',
          exports: 'named',
        },
      ],
    },
    sourcemap: true,
    minify: 'esbuild',
    outDir: resolve(__dirname, '../dist'),
    // Runs first in `npm run build`, so it's safe to wipe the whole dist/.
    // build:react afterwards only clears its own dist/react/ subdir.
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});
