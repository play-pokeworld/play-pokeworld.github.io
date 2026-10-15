/**
 * PokeGame — Game Configuration & Constants
 *
 * Central file: ALL game constants in one place.
 * No hardcoded values anywhere else in the game code.
 * Use STYLES for visual, GAME for gameplay, DATA for thresholds.
 */
'use strict';

export const GAME = {
  // V7 · DBT-02 — ne reste ici que ce qui est LU quelque part (grep `GAME.` /
  // `cfg.` dans src, tests, tools). Les ~35 constantes jamais lues (tailles de
  // boîte, EVOLUTION, BATTLE, HATCHERY, EXP, MAX_*, REGIONS, AFK_TIMEOUT…) ont
  // été supprimées : leurs vraies valeurs vivent dans les modules qui les
  // appliquent (progression.js, hatchery.js, game-helpers.js…).

  // ─── Mining ───
  MINE: {
    // FIX (2026-08): was 1 and read by nobody, while the real recharge ticker
    // (bootstrap-timers.js, every 1000 ms) grants +2. Aligned on the actual
    // behaviour and published below so the UI hint quotes it instead of
    // hardcoding a number that silently rots.
    ENERGY_REGEN: 2, // per second
    // FIX (2026-08): mine energy granted by a won battle / a capture.
    // Was 15, which refilled the whole bar far too fast and made the
    // energy budget meaningless; rebalanced to 5.
    ENERGY_PER_BATTLE: 5,
  },

  // ─── Starters (lus par species-sources.js / DEX-01) ───
  KANTO_STARTERS: [1, 4, 7], // Bulbasaur, Charmander, Squirtle
  JOHTO_STARTERS: [152, 155, 158], // Chikorita, Cyndaquil, Totodile
  HOENN_STARTERS: [252, 255, 258], // Treecko, Torchic, Mudkip

  // ─── Sauvegarde ───
  // V7 · DBT-03/05 — source UNIQUE du schéma de sauvegarde ; save.js et
  // classic-bridge.js l'importent (plus de copie locale).
  SAVE_VERSION: 4, // V7 · FORM-02 (v3 → v4 : formes = Pokémon à part)
  OLDEST_LOADABLE_SAVE_VERSION: 3, // migrée à la lecture (migrations/index.js)

  // ─── Capture (V7-R1 · retours joueurs #7 — le guide cite CES valeurs) ───
  // Lues par combat/catch.js et world/collection.js (jet d'IV à la capture,
  // doublon compris) et par le guide « Capture » (ui/game/guide-sections.js).
  CAPTURE: {
    IV_CHANCE_PCT: 10, // chance (en %) qu'une capture offre +1 IV
    IV_CAP: 12, // IV maximal par statistique
  },

  // ─── Statistiques (V7-R3c · le guide « Stats, IV & EV » cite CES valeurs) ───
  // Lues par data/game-helpers.js (calcStat), combat/training.js (stage EV)
  // et save/save-extras.js (vitamines / capsules).
  STATS: {
    IV_STEP_PCT: 5, // chaque point d'IV = +5 % sur la statistique
    EV_STEP_PCT: 5, // chaque point d'EV = +5 % sur la statistique
    SHINY_BONUS_PCT: 20, // un chromatique a toutes ses stats ×1,2
    EV_CAP: 18, // EV maximal par statistique
    EV_TOTAL_CAP: 36, // total d'EV maximal par Pokémon
  },

  // ─── Communauté (V7-R1 · retours joueurs #4) ───
  COMMUNITY: {
    DISCORD_URL: 'https://discord.gg/DXC48vtGV',
  },
};

export const SAVE_VERSION = GAME.SAVE_VERSION;
export const OLDEST_LOADABLE_SAVE_VERSION = GAME.OLDEST_LOADABLE_SAVE_VERSION;

// T2 (wave 38): ESM module — native export; the classic surface is
// kept on the global object for the registries (data.js) and the VM harnesses.
if (typeof globalThis !== 'undefined') globalThis.GAME = GAME;

// Mine energy granted per won battle / per capture. Surfaced as a standalone
// constant because the combat modules (battle-status.js, catch.js) and the
// offline engine read it as a free identifier — application/economy/mine.js is
// lazy-loaded, so it cannot own this value.
export const MINE_ENERGY_PER_BATTLE = GAME.MINE.ENERGY_PER_BATTLE;
if (typeof globalThis !== 'undefined') globalThis.MINE_ENERGY_PER_BATTLE = MINE_ENERGY_PER_BATTLE;
if (typeof window !== 'undefined') window.MINE_ENERGY_PER_BATTLE = MINE_ENERGY_PER_BATTLE;

// Same deal for the per-second recharge: the mine UI hint interpolates it.
export const MINE_ENERGY_REGEN = GAME.MINE.ENERGY_REGEN;
if (typeof globalThis !== 'undefined') globalThis.MINE_ENERGY_REGEN = MINE_ENERGY_REGEN;
if (typeof window !== 'undefined') window.MINE_ENERGY_REGEN = MINE_ENERGY_REGEN;

// V7-R1 — capture : chance d'IV et plafond, publiés comme identifiants libres
// (catch.js / collection.js tournent aussi dans les harnais VM sans import).
export const CAPTURE_IV_CHANCE_PCT = GAME.CAPTURE.IV_CHANCE_PCT;
export const CAPTURE_IV_CAP = GAME.CAPTURE.IV_CAP;
if (typeof globalThis !== 'undefined') {
  globalThis.CAPTURE_IV_CHANCE_PCT = CAPTURE_IV_CHANCE_PCT;
  globalThis.CAPTURE_IV_CAP = CAPTURE_IV_CAP;
}

// V7-R3c — plafonds d'EV, publiés comme identifiants libres (training.js et
// save-extras.js tournent aussi dans les harnais VM sans import).
export const STAT_EV_CAP = GAME.STATS.EV_CAP;
export const STAT_EV_TOTAL_CAP = GAME.STATS.EV_TOTAL_CAP;
if (typeof globalThis !== 'undefined') {
  globalThis.STAT_EV_CAP = STAT_EV_CAP;
  globalThis.STAT_EV_TOTAL_CAP = STAT_EV_TOTAL_CAP;
}

// V7-R1 — lien communautaire (bouton « Rejoindre le Discord » : réglages + menu principal).
export const DISCORD_URL = GAME.COMMUNITY.DISCORD_URL;
if (typeof globalThis !== 'undefined') globalThis.DISCORD_URL = DISCORD_URL;



