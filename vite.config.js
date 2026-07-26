import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
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
          if (id.includes('/src/legacy-es/data/')) {
            const file = id.split('/').pop();
            if (file === 'official-pokemon-data.js') return 'legacy-data-pokemon';
            if (/quest|story|lore|npc/.test(file)) return 'legacy-data-quests';
            if (/location|map|shop|champion|route/.test(file)) return 'legacy-data-world';
            return 'legacy-data-content';
          }
          if (id.includes('/src/legacy-es/gameplay/combat/')) return 'legacy-combat';
          if (id.includes('/src/legacy-es/gameplay/')) return 'legacy-gameplay';
          if (id.includes('/src/legacy-es/display/')) return 'legacy-display';
          if (id.includes('/src/localization/')) return 'localization';
        },
      },
    },
  },
});
