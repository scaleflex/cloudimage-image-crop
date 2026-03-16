import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/react/**/*', 'tests/**/*'],
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, '../tsconfig.build.json'),
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, '../src/index.ts'),
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          entryFileNames: 'js-cloudimage-crop.esm.js',
          chunkFileNames: 'chunks/[name].js',
          exports: 'named',
        },
        {
          format: 'cjs',
          entryFileNames: 'js-cloudimage-crop.cjs.js',
          inlineDynamicImports: true,
          exports: 'named',
        },
        {
          format: 'umd',
          entryFileNames: 'js-cloudimage-crop.min.js',
          inlineDynamicImports: true,
          name: 'CICropView',
          exports: 'named',
        },
      ],
    },
    sourcemap: true,
    minify: 'esbuild',
    outDir: resolve(__dirname, '../dist'),
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});
