/**
 * @file gen-world.mjs
 * @brief Generates the world tables from the original location files (locations-data.js,
 * locations-johto.js, locations-hoenn.js). The original mixed three concerns in one object;
 * they are split by purpose:
 *  - src/data/raw/locations-data.js  : rules (region, kind, connections, shop, champion, unlocks)
 *  - src/data/raw/map-layout-data.js : rectangle of each location on its region map
 *  - src/data/raw/encounters-data.js : wild Pokémon tables (species ids, not Pokédex numbers)
 * Display names go to localization/<lang>/locations.js (the original names were French).
 *
 * Usage: node tools/data/gen-world.mjs <original repository root>
 */

import { OriginalSource } from './OriginalSource.mjs';
import { writeTable } from './TableWriter.mjs';
import { syncLocaleTable } from './LocaleSync.mjs';
import { speciesSlug } from './gen-species.mjs';

const GENERATOR = 'tools/data/gen-world.mjs';
const WEATHER_IDS = { rainy: 'rain', rain: 'rain', sunny: 'sun', sun: 'sun', sandstorm: 'sand', sand: 'sand', hail: 'hail', snow: 'hail', fog: 'fog' };

export async function generateWorld(source) {
  await source.module('src/data/locations-data.js');
  const kanto = globalThis.LOCS;
  const { LOCS_JOHTO: johto } = await source.module('src/data/locations-johto.js');
  const { LOCS_HOENN: hoenn } = await source.module('src/data/locations-hoenn.js');
  const rows = await source.pokedexRows();

  const locations = {};
  const layout = {};
  const encounters = {};
  const frenchNames = {};
  const unknownSpecies = [];
  for (const [region, table] of Object.entries({ kanto, johto, hoenn })) {
    for (const [id, loc] of Object.entries(table)) {
      const entry = { region, kind: loc.type, connections: loc.conn || [] };
      if (loc.group) entry.group = loc.group;
      if (loc.shopId) entry.shop = loc.shopId;
      if (loc.champ) entry.champion = loc.champ;
      if (loc.badgeReq) entry.badgesRequired = loc.badgeReq;
      if (loc.minWins) entry.winsToClear = loc.minWins;
      if (loc.defaultWeather) entry.weather = WEATHER_IDS[loc.defaultWeather] || loc.defaultWeather;
      locations[id] = entry;
      layout[id] = { x: loc.x, y: loc.y, w: loc.w, h: loc.h };
      const wild = (loc.wild || []).map(([dex, minLevel, maxLevel, rarity]) => {
        if (!rows[dex]) unknownSpecies.push(`${id}:#${dex}`);
        return { species: rows[dex] ? speciesSlug(rows[dex][0]) : null, minLevel, maxLevel, rarity: rarity || 'common' };
      }).filter((slot) => slot.species);
      if (wild.length) encounters[id] = wild;
      frenchNames[id] = loc.name;
    }
  }

  const counts = {
    locations: writeTable({
      file: 'src/data/raw/locations-data.js',
      name: 'LOCATIONS_TABLE',
      brief: 'World locations: gameplay rules (layout and encounters live in their own tables).',
      notes: [
        'Entry: { region, kind (town | route | sea | dungeon), connections[ids], group?, shop?, champion?,',
        '         badgesRequired? (to enter), winsToClear? (wild wins before the location counts as cleared),',
        '         weather? (default weather of the battles) }'
      ],
      data: locations,
      generator: GENERATOR
    }),
    layout: writeTable({
      file: 'src/data/raw/map-layout-data.js',
      name: 'MAP_LAYOUT_TABLE',
      brief: 'Rectangle of every location on its region map (canvas = Regions.MAP_CANVAS).',
      notes: ['Entry: { x, y, w, h } in map pixels.'],
      data: layout,
      generator: GENERATOR
    }),
    encounters: writeTable({
      file: 'src/data/raw/encounters-data.js',
      name: 'ENCOUNTERS_TABLE',
      brief: 'Wild encounter tables (key = location id).',
      notes: ['Slot: { species (species id), minLevel, maxLevel, rarity (common | uncommon | rare | …) }'],
      data: encounters,
      generator: GENERATOR
    })
  };

  const locales = {};
  for (const lang of ['en', 'fr']) {
    locales[lang] = await syncLocaleTable({
      file: `src/localization/${lang}/locations.js`,
      name: `L_location_names_${lang}`,
      title: `${lang.toUpperCase()} — Location names (key = location id)`,
      defaults: lang === 'fr' ? frenchNames : Object.fromEntries(Object.keys(frenchNames).map((id) => [id, null]))
    });
  }
  return { counts, unknownSpecies, locales };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateWorld(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`world=${JSON.stringify(result.counts)} unknownSpecies=${result.unknownSpecies.length} locale+ fr=${result.locales.fr.added} en=${result.locales.en.added}`);
}
