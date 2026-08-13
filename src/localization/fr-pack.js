// French language pack — aggregated so the boot path can dynamically
// import() ONLY the active language (wave 32 lazy loading). Every module
// registers its window.L_fr_<domain> fragments as a side effect; after the
// pack loads, src/localization/data.js re-merges the dictionary via
// window.__pwLocalizeRemerge().
import './fr/ui.js';
import './fr/economy.js';
import './fr/combat.js';
import './fr/stats.js';
import './fr/pokedex.js';
import './fr/pokemon-names.js';
import './fr/locations.js';
import './fr/items.js';
import './fr/move-descs.js';
import './fr/types.js';
import './fr/talents.js';
import './fr/shops.js';
import './fr/base.js';
import './fr/champions.js';
import './fr/lore.js';
import './fr/quests.js';
import './fr/npc.js';
import './fr/messages.js';

// Vague 41 — module ESM formel : ce pack était déjà un module latéral
// (agrégateur d'imports lazy vague 32) ; export {} explicite, rien d'autre.
export {};

