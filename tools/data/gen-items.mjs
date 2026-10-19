/**
 * @file gen-items.mjs
 * @brief Generates src/data/raw/items-data.js from the original src/data/items-data.js.
 *  - `kind` replaces the original `type` (ct -> tm, cs -> hm, untyped "ct_*" entries -> tm);
 *  - held items get a declarative `effect: { kind: <original category>, ...params }`;
 *  - the `powerFormula` strings ("A+B*level", "A+B*(level-1)", "1+level/5") become
 *    `power: { base, perLevel }` (value = base + perLevel * level);
 *  - names / descriptions / emoji icons leave the table (localization/<lang>/items.js);
 *  - `image` is the file under assets/images/items/ (null = generic icon).
 *
 * Usage: node tools/data/gen-items.mjs <original repository root>
 */

import fs from 'fs';
import path from 'path';
import { OriginalSource } from './OriginalSource.mjs';
import { writeTable, PROJECT_ROOT } from './TableWriter.mjs';
import { syncLocaleTable } from './LocaleSync.mjs';
import { speciesSlug } from './gen-species.mjs';

const GENERATOR = 'tools/data/gen-items.mjs';
const KIND_BY_TYPE = { ct: 'tm', cs: 'hm' };
const WEATHER_IDS = { rainy: 'rain', rain: 'rain', sunny: 'sun', sun: 'sun', sandstorm: 'sand', sand: 'sand', hail: 'hail', snow: 'hail' };
const TERRAIN_BY_SEED = { electric: 'electric', grass: 'grassy', misty: 'misty', fog: 'psychic' };
const PLACEHOLDERS = ['Objet tenu avec un effet spécial.', 'Held item with a special effect.'];
const round = (value) => Math.round(value * 10000) / 10000;

/**
 * @param {string} formula
 * @returns {{base: number, perLevel: number}}
 */
/**
 * The oldest TMs of the original use move ids without underscores ('icebeam' for 'ice_beam'):
 * the original never resolved them. Maps them to the real move id.
 * @param {string|undefined} moveId
 * @param {Object} moves - Original MOVES table
 * @returns {string|null}
 */
function resolveMoveId(moveId, moves) {
  if (!moveId) return null;
  if (moves[moveId]) return moveId;
  const compact = String(moveId).replace(/_/g, '');
  return Object.keys(moves).find((id) => id.replace(/_/g, '') === compact) || moveId;
}

export function parsePowerFormula(formula) {
  const text = String(formula).replace(/\s+/g, '');
  let match = text.match(/^([\d.]+)\+([\d.]+)\*\(level-1\)$/);
  if (match) return { base: round(Number(match[1]) - Number(match[2])), perLevel: Number(match[2]) };
  match = text.match(/^([\d.]+)\+([\d.]+)\*level$/);
  if (match) return { base: Number(match[1]), perLevel: Number(match[2]) };
  match = text.match(/^([\d.]+)\+level\/([\d.]+)$/);
  if (match) return { base: Number(match[1]), perLevel: round(1 / Number(match[2])) };
  throw new Error(`unknown powerFormula: ${formula}`);
}

const lower = (value) => (value == null ? value : String(value).toLowerCase());

function heldEffect(item) {
  const effect = { kind: item.category };
  if (item.typeBoost) effect.type = lower(item.typeBoost);
  if (item.gemType) effect.type = lower(item.gemType);
  if (item.zType) effect.type = lower(item.zType);
  if (item.resistType) { effect.type = lower(item.resistType); effect.percent = Number(item.resistPercent) || 30; }
  if (item.seedType) effect.terrain = TERRAIN_BY_SEED[lower(item.seedType)];
  if (item.statusEffect) effect.status = item.statusEffect;
  if (item.immunity) effect.status = item.immunity;
  if (item.stat) effect.stat = item.stat;
  if (item.mult) effect.mult = item.mult;
  if (item.weather) effect.weather = WEATHER_IDS[item.weather] || item.weather;
  if (item.nature) effect.nature = item.nature;
  if (item.powerFormula) effect.power = parsePowerFormula(item.powerFormula);
  return effect;
}

/**
 * Ball part of an item: the catch data comes from the original BALL_DEFS (pokeballs.js), the
 * single source the original catch code reads. timer / quick compute their bonus from the battle
 * (their table `bonus` is the upper bound of the original data); `order` is the position in BALL_CYCLE (picker
 * order, 'none' excluded).
 * @param {string} id
 * @param {Object} item - Original items-data.js entry
 * @param {Object|undefined} def - Original BALL_DEFS entry
 * @param {string[]} cycle - Original BALL_CYCLE
 * @param {string} sprite - File stem in assets/images/pokeball/
 * @returns {Object}
 */
function ballEntry(id, item, def, cycle, sprite) {
  const ball = { rate: Number(def?.rate ?? item.rate) || 10, sprite };
  // The original adds `bonus` only when the ball has a condition (ballEffectiveRate).
  if (def?.condition) {
    ball.condition = def.condition;
    if (Number(def.bonus) > 0) ball.bonus = Number(def.bonus);
  }
  const order = cycle.filter((key) => key !== 'none').indexOf(id);
  if (order >= 0) ball.order = order;
  return ball;
}

export async function generateItems(source) {
  const { ITEMS } = await source.module('src/data/items-data.js');
  const { MOVES } = await source.module('src/data/moves.js');
  const { BALL_DEFS, BALL_CYCLE } = await source.module('src/application/economy/pokeballs.js');
  const rows = await source.pokedexRows();
  const itemImages = new Set(fs.readdirSync(path.join(PROJECT_ROOT, 'assets/images/items')));
  const ballImages = new Set(fs.readdirSync(path.join(PROJECT_ROOT, 'assets/images/pokeball')));

  const items = {};
  const missingImages = [];
  for (const [id, item] of Object.entries(ITEMS)) {
    const kind = KIND_BY_TYPE[item.type] || item.type || (item.moveId ? 'tm' : 'misc');
    const entry = { kind, price: Number(item.price) || 0 };
    if (item.category && kind !== 'held') entry.category = item.category;
    if (item.notForSale || !entry.price) entry.buyable = false;
    if (item.hidden) entry.hidden = true;
    if (kind === 'held') entry.effect = heldEffect(item);
    const moveId = resolveMoveId(item.moveId, MOVES);
    if (moveId) entry.move = moveId;
    if (kind === 'ball') {
      const stem = item.sprite ? path.basename(item.sprite, '.svg') : id.charAt(0).toUpperCase() + id.slice(1);
      entry.ball = ballEntry(id, item, BALL_DEFS[id], BALL_CYCLE, ballImages.has(`${stem}.svg`) ? stem : 'Pokeball');
    }
    if (kind === 'fossil') {
      entry.revives = rows[item.revive] ? speciesSlug(rows[item.revive][0]) : null;
      if (item.futureOnly) entry.futureOnly = true;
    }
    if (kind === 'treasure') { entry.value = item.value; entry.diamondValue = item.diamondValue; }

    let image = itemImages.has(`${id}.png`) ? `${id}.png` : null;
    if (!image && moveId && MOVES[moveId]) image = `tm_${String(MOVES[moveId].type).toLowerCase()}.png`;
    if (image && !itemImages.has(image)) image = null;
    if (kind !== 'ball') entry.image = image;
    if (!image && kind !== 'ball') missingImages.push(id);
    items[id] = entry;
  }

  const count = writeTable({
    file: 'src/data/raw/items-data.js',
    name: 'ITEMS_TABLE',
    brief: 'Items: kind, price and declarative effects (key = item id = localization key).',
    notes: [
      'Entry: { kind, price, buyable?, hidden?, category?, effect? (held items), move? (tm / hm),',
      '         ball? { rate, sprite, bonus?, condition?, order? }, revives? (fossils: species id), value? / diamondValue? (treasures),',
      '         image (file in assets/images/items/, null = generic icon) }',
      'kind: held | tm | hm | ball | stone | evolution | fossil | key | consumable | candy | treasure | keystone | memory',
      'Held effect: { kind: <category>, type?, percent?, terrain?, status?, stat?, mult?, weather?, power? { base, perLevel } }',
      'Power of a held item at level L (stack level) = base + perLevel * L.'
    ],
    data: items,
    generator: GENERATOR
  });

  const defaults = (lang) => Object.fromEntries(Object.entries(ITEMS).map(([id, item]) => [id, {
    name: item[`name_${lang}`] || item.name_en || item.name_fr || id,
    desc: item[`desc_${lang}`] || (lang === 'en' ? item.desc : null) || null
  }]));
  const locales = {};
  for (const lang of ['en', 'fr']) {
    locales[lang] = await syncLocaleTable({
      file: `src/localization/${lang}/items.js`,
      name: `L_${lang}_items`,
      title: `${lang.toUpperCase()} — Item names and descriptions (key = item id)`,
      defaults: defaults(lang),
      isPlaceholder: (text) => PLACEHOLDERS.includes(text)
    });
  }
  return { count, missingImages, locales };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateItems(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`items=${result.count} missingImages=${result.missingImages.length} locale+ en=${result.locales.en.added} fr=${result.locales.fr.added}`);
}
