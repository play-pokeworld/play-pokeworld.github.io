/**
 * @file audit-keys.mjs
 * @brief Data-driven localization coverage: every id referenced by game data must have a key in
 *        every supported language (developer tool, not shipped).
 *
 * Usage: node tools/i18n/audit-keys.mjs [--verbose]
 *
 * The static test only checks the keys written literally in the code. This tool resolves the keys
 * built at runtime from the repositories (`t('item.' + id + '.name')`, `t(definition.labelKey)`…)
 * and reports every id whose text is missing in FR or EN.
 */

import { installFakeDom } from '../../tests/FakeDom.js';

installFakeDom();

const { LocalizationManager } = await import('../../src/localization/LocalizationManager.js');
const { ItemDB } = await import('../../src/data/items/ItemDB.js');
const { MoveDB } = await import('../../src/data/battle/MoveDB.js');
const { PokemonDB } = await import('../../src/data/pokemon/PokemonDB.js');
const { TalentDB } = await import('../../src/data/pokemon/TalentDB.js');
const { LocationDB } = await import('../../src/data/world/LocationDB.js');
const { TrainerDB } = await import('../../src/data/trainers/TrainerDB.js');
const { LeagueDB } = await import('../../src/data/trainers/LeagueDB.js');
const { ShopDB } = await import('../../src/data/shops/ShopDB.js');
const { QuestDB } = await import('../../src/data/quests/QuestDB.js');

const manager = LocalizationManager.getInstance();
const tables = manager._tables;
const LANGS = Object.keys(tables);
const VERBOSE = process.argv.includes('--verbose');

const missing = new Map();
const add = (category, key) => {
  const lack = LANGS.filter((lang) => !(key in tables[lang]));
  if (!lack.length) return;
  if (!missing.has(category)) missing.set(category, []);
  missing.get(category).push(`${key} → missing ${lack.join(', ')}`);
};

const check = (category, key) => add(category, key);

/** @param {string} prefix @param {string[]} ids @param {string[]} suffixes */
const checkIds = (category, prefix, ids, suffixes) => {
  for (const id of ids) for (const suffix of suffixes) check(category, `${prefix}${id}${suffix}`);
};

// --- repositories -----------------------------------------------------------
const items = ItemDB.getInstance();
checkIds('items', 'item.', items.getIds(), ['.name', '.desc']);

const moves = MoveDB.getInstance();
checkIds('moves', 'move.', moves.getIds(), ['']);
checkIds('move-descriptions', 'move_desc.', moves.getIds(), ['']);

const species = PokemonDB.getInstance();
checkIds('pokemon-names', 'pokemon.', species.getIds(), ['']);
for (const form of species.getAllForms()) check('pokemon-names', `pokemon.${form.id}`);
for (const talent of TalentDB.getInstance().getAll()) {
  check('talents', `talent.${talent.id}.name`);
  check('talents', `talent.${talent.id}.desc`);
}

const locations = LocationDB.getInstance();
checkIds('locations', 'location.', locations.getIds(), ['']);

// `.name` is displayed for every trainer; `.badge` only exists for the gym leaders (badge list, log).
const trainers = TrainerDB.getInstance();
checkIds('trainers', 'trainer.', trainers.getIds(), ['.name']);
for (const region of ['kanto', 'johto', 'hoenn']) {
  for (const gym of trainers.getGyms(region)) check('trainer-badges', `trainer.${gym.id}.badge`);
}
for (const league of LeagueDB.getInstance().getAll()) {
  checkIds('leagues', 'trainer.', [league.id], ['.name']);
}

const shops = ShopDB.getInstance();
for (const shop of shops.getAll()) {
  check('shops', `shop.${shop.id}.name`);
  if (shop.descKey) check('shops', shop.descKey);
}

const quests = QuestDB.getInstance();
for (const quest of quests.getAll()) {
  check('quests', `quests.${quest.category}.${quest.id}.title`);
  check('quests', `quests.${quest.category}.${quest.id}.desc`);
}

// --- fixed namespaces from the Rules ---------------------------------------
const { CURRENCIES } = await import('../../src/data/save/CurrencyDefinitions.js');
for (const currency of CURRENCIES) {
  if (currency.labelKey) check('currencies', currency.labelKey);
  if (currency.gainKey) check('currencies', currency.gainKey);
}
const { BALL_IDS } = await import('../../src/data/items/BallCatalog.js').catch(() => ({ BALL_IDS: [] }));
for (const id of BALL_IDS || []) check('balls', `ball_${id}`);

// --- report ----------------------------------------------------------------
let total = 0;
const lines = [];
for (const [category, entries] of [...missing.entries()].sort()) {
  total += entries.length;
  lines.push(`\n${category}: ${entries.length}`);
  for (const entry of VERBOSE ? entries : entries.slice(0, 10)) lines.push(`  - ${entry}`);
  if (!VERBOSE && entries.length > 10) lines.push(`  … ${entries.length - 10} more (--verbose)`);
}
console.log(lines.join('\n') || 'no missing key');
console.log(`\ntotal missing keys: ${total}`);
