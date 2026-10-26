import { defineConfig } from 'tsdown'

/** Package id baked into the module-loader registration banner. */
const PACKAGE_ID = 'dsh-markitdown'

/**
 * Browser half of the plugin: a CJS closure factory the dsh module loader
 * registers through `window.__ModuleLoader__.load`. The banner/footer/intro
 * mirror the harness's shared client preset exactly; `@deepseek-ai/*`
 * imports stay external (the platform module table answers them), everything
 * else — including React — inlines.
 */
const clientBundle = defineConfig({
  name: `${PACKAGE_ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: false,
  clean: false,
  deps: {
    // React comes from the platform module table: bundling our own copy would
    // hand the renderer a second React whose hook dispatcher is null, so
    // every hook in the page would throw. Only plain libraries stay inline.
    neverBundle: (specifier: string) =>
      specifier.startsWith('@deepseek-ai/') || specifier === 'react' || specifier === 'react-dom'
      || specifier.startsWith('react/') || specifier.startsWith('react-dom/'),
    alwaysBundle: (specifier: string) =>
      !specifier.startsWith('@deepseek-ai/') && specifier !== 'react' && specifier !== 'react-dom'
      && !specifier.startsWith('react/') && !specifier.startsWith('react-dom/'),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    chunkFileNames: 'client.[name].js',
    banner: chunk =>
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, ${chunk.isEntry ? '' : `chunk: ${JSON.stringify(chunk.fileName)}, `}factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})

/** Host half: the cordis plugin (tools, skills, config schema). */
const hostBundle = defineConfig({
  entry: ['src/index.ts', 'src/runner.ts', 'src/tools.ts', 'src/skills.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})

export default [hostBundle, clientBundle]
