import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    element: 'src/element.ts',
    dom: 'src/dom/index.ts',
    react: 'src/react.tsx',
    holidays: 'src/holidays/index.ts',
    formats: 'src/formats.ts'
  },
  format: ['esm'],
  dts: true,
  splitting: true,
  treeshake: true,
  minify: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
  // keep Blobatar's licence comment (/*! ... */) in the bundled code
  esbuildOptions(o) { o.legalComments = 'inline'; }
});
