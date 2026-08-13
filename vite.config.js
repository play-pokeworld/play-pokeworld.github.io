import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // The game is also previewed/played from various hosts (local network,
  // sandboxed previews, LAN devices): accept any host for the dev and
  // preview servers. This only affects local serving, not the build.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  build: {
    // es2020: widest browser support (no top-level await needed — the
    // language gating lives in index.html's async IIFE, pure runtime code).
    target: 'es2020',
    sourcemap: false,
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks(id) {
          // Deferred secondary screens first (wave 32/33): dynamically imported
          // after the first paint, they must NOT be re-merged into the eager
          // startup chunks below.
          if (id.includes('/src/ui/game/base/') || id.includes('/src/application/base/')) return 'screen-base';
          if (id.includes('/src/application/breeding/') || id.includes('/src/ui/game/hatchery-ui.js')) return 'screen-hatchery';
          if (id.includes('/src/application/combat/training.js')) return 'screen-training';
          if (id.includes('/src/application/economy/mine') || id.includes('/src/ui/game/mine-ui.js')) return 'screen-mine';
          if (id.includes('/src/ui/game/pokedex.js')) return 'screen-pokedex';
          if (id.includes('/src/application/world/atoll-core.js') || id.includes('/src/application/world/puzzle-explorations.js')) return 'screen-atoll';
          // One chunk per language: the fr/en fragments are NOT manually
          // assigned — each is exclusive to its pack (fr-pack.js / en-pack.js)
          // and is therefore naturally bundled into that DYNAMIC chunk, which
          // is only fetched when that language activates (wave 32).
          if (id.includes('/src/localization/fr/') || id.includes('/src/localization/en/')) return undefined;
          if (id.includes('/src/data/')) {
            const file = id.split('/').pop();
            if (file === 'official-teams-data.js' || file === 'poke-talents-data.js') return 'data-pokemon';
            if (/quest|story|lore|npc/.test(file)) return 'data-quests';
            if (/location|map|shop|champion|route/.test(file)) return 'data-world';
            if (file === 'atoll-sets-data.js') return 'screen-atoll';
            return 'data-content';
          }
          // Wave 34 (T1 cost): the wave-T1 globalThis-backed service idiom
          // pushed 'gameplay' over the 500 kB budget (490.6 → 501.2 kB).
          // quests/automation are carved out into their own eager chunk: a
          // two-way static scan proves ZERO bare cross-module call relies on
          // same-chunk scope hoisting for these two modules — every consumer
          // (bootstrap-timers, hatchery, battle-*, map-*, quest-ui, base-*,
          // StoryWindowView…) reaches them through the canonical guarded
          // window/globalThis expositions at the files' tail.
          if (id.includes('/src/application/quests/')
              || id.includes('/src/application/automation/')) return 'qa-systems';
          // Wave 33 layout (src/game deleted): ONE eager gameplay chunk for
          // every moved classic module. They are window-wired classic modules
          // that rely on Vite/rolldown intra-chunk scope hoisting for bare
          // cross-module calls (e.g. bootstrap-timers init → applySavedTheme)
          // — splitting them further breaks boot. Same content as the former
          // 437 kB 'gameplay' chunk, still under the 500 kB budget.
          if (id.includes('/src/application/combat/')
              || id.includes('/src/application/world/')
              || id.includes('/src/application/economy/')
              || id.includes('/src/application/save/')
              || id.includes('/src/ui/game/')
              || /application\/(bootstrap-timers|game-state|pokemon-factory)\.js$/.test(id)) return 'gameplay';
          if (id.includes('/src/domain/') || id.includes('/src/application/') || id.includes('/src/core/') || id.includes('/src/ui/')) {
            return 'architecture-core';
          }
          if (id.includes('/src/engine/')) return 'engine';
          // The language PACK entries must stay pure dynamic entries: manually
          // chunking them (the rule above) would drag their whole dependency
          // tree — the entire language folder — into the eager chunk.
          if (id.endsWith('/src/localization/fr-pack.js') || id.endsWith('/src/localization/en-pack.js')) return undefined;
          if (id.includes('/src/localization/')) return 'localization';
        },
      },
    },
  },
});

