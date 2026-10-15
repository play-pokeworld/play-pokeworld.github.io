import { build } from 'vite';
import base from '../../vite.config.js';
const cfg = typeof base === 'function' ? await base({ command: 'build', mode: 'production' }) : base;
const plugin = { name: 'dbg-chunks', generateBundle(_, bundle) {
  for (const [name, chunk] of Object.entries(bundle)) {
    if (chunk.type !== 'chunk') continue;
    if (/screen-atoll|main\./.test(name)) {
      console.log('==', name, 'imports:', chunk.imports, 'dyn:', chunk.dynamicImports);
      if (/screen-atoll/.test(name)) console.log('   modules:', Object.keys(chunk.modules).map((m) => m.replace(/.*\/src\//, 'src/')));
    }
  }
} };
await build({ ...cfg, configFile: false, logLevel: 'error', plugins: [...(cfg.plugins || []), plugin], build: { ...(cfg.build || {}), outDir: '/tmp/distdbg', emptyOutDir: true, write: false } });
