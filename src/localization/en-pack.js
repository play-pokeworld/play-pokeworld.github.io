// English language pack — see fr-pack.js (wave 32 lazy loading: only the
// active language is fetched on the startup path; the other one streams in
// the background after boot and on demand when switching language).
import './en/ui.js';
import './en/economy.js';
import './en/combat.js';
import './en/stats.js';
import './en/pokedex.js';
import './en/move-names.js';
import './en/locations.js';
import './en/items.js';
import './en/types.js';
import './en/talents.js';
import './en/pokemon-names.js';
import './en/shops.js';
import './en/base.js';
import './en/champions.js';
import './en/lore.js';
import './en/quests.js';
import './en/npc.js';
import './en/messages.js';

// Vague 41 — module ESM formel : ce pack était déjà un module latéral
// (agrégateur d'imports lazy vague 32) ; export {} explicite, rien d'autre.
export {};

