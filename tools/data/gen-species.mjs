/**
 * @file gen-species.mjs
 * @brief Generates src/data/raw/species-data.js and forms-data.js from the original game:
 * Pokédex rows (pd-data.js), alternate forms (forms-data.js), talent pools (poke-talents.js)
 * and evolution tables (application/combat/progression.js + the special cases of checkEvolution).
 *
 * The species id is the slug of the English name; it is also the sprite file stem
 * (assets/images/pokemon/<id>.png). Forms are keyed "<species>_<form>" (sprite stem).
 *
 * Usage: node tools/data/gen-species.mjs <original repository root>
 */

import fs from 'fs';
import path from 'path';
import { OriginalSource } from './OriginalSource.mjs';
import { writeTable, PROJECT_ROOT } from './TableWriter.mjs';
import { syncLocaleTable } from './LocaleSync.mjs';

const GENERATOR = 'tools/data/gen-species.mjs';

/** Pokédex ranges of the regions (original src/data/region.js). */
const REGION_RANGES = [
  ['kanto', 1, 151], ['johto', 152, 251], ['hoenn', 252, 386], ['sinnoh', 387, 493]
];

/** Stone evolutions whose target needs level 50 instead of 25 (original tryStoneEvo). */
const STONE_LEVEL_50_TARGETS = [350, 367, 368, 208, 212, 186, 192, 182, 134, 135, 136, 196, 197, 26, 62, 91, 121, 230, 233];
const STONE_MIN_LEVEL = 25;
const STONE_MIN_LEVEL_HIGH = 50;

/**
 * Same rule as the runtime slug of v1.0-v1.3 (sprite file names were produced with it).
 * @param {string} name - English name
 * @returns {string}
 */
export function speciesSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\u2640/g, '-f')
    .replace(/\u2642/g, '-m')
    .replace(/[.\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const lowerType = (type) => String(type || '').trim().toLowerCase();
const regionOf = (dex) => (REGION_RANGES.find(([, start, end]) => dex >= start && dex <= end) || ['unknown'])[0];

export async function generateSpecies(source) {
  const rows = await source.pokedexRows();
  const talents = await source.module('src/data/poke-talents.js');
  const formsModule = await source.module('src/data/forms-data.js');
  const levelEvo = source.objectLiteral('src/application/combat/progression.js', 'LEVEL_EVO_MAP');
  const evoLevels = source.objectLiteral('src/application/combat/progression.js', 'EVO_LEVELS');
  const stoneEvo = source.objectLiteral('src/application/combat/progression.js', 'STONE_EVO');

  const slugByDex = {};
  rows.forEach((row, dex) => { if (row) slugByDex[dex] = speciesSlug(row[0]); });
  const slug = (dex) => {
    if (!slugByDex[dex]) throw new Error(`unknown evolution target #${dex}`);
    return slugByDex[dex];
  };

  /** @type {Object<string, Object[]>} */
  const evolutions = {};
  const addEvolution = (dex, entry) => { (evolutions[dex] = evolutions[dex] || []).push(entry); };
  for (const [from, to] of Object.entries(levelEvo)) {
    if (evoLevels[from]) addEvolution(from, { to: slug(to), level: evoLevels[from] });
  }
  for (const [from, byItem] of Object.entries(stoneEvo)) {
    for (const [item, to] of Object.entries(byItem)) {
      const minLevel = STONE_LEVEL_50_TARGETS.includes(Number(to)) ? STONE_MIN_LEVEL_HIGH : STONE_MIN_LEVEL;
      addEvolution(from, { to: slug(to), item, minLevel });
    }
  }
  // Hard-coded cases of the original checkEvolution() (they return before the generic maps).
  for (const dex of [265, 290, 236]) evolutions[dex] = [];
  addEvolution(265, { to: slug(266), level: 7, split: true });
  addEvolution(265, { to: slug(268), level: 7, split: true });
  addEvolution(290, { to: slug(291), level: 20, split: true });
  addEvolution(290, { to: slug(292), level: 20, split: true });
  addEvolution(236, { to: slug(106), level: 20, condition: 'attack_above_defense' });
  addEvolution(236, { to: slug(107), level: 20, condition: 'defense_above_attack' });
  addEvolution(236, { to: slug(237), level: 20, condition: 'attack_equals_defense' });

  const species = {};
  const missingSprites = [];
  rows.forEach((row, dex) => {
    if (!row) return;
    const [, type1, type2, hp, atk, def, spa, spd, spe, , catchRate, xpYield] = row;
    const id = slugByDex[dex];
    const hidden = talents.POKEMON_TALENTS[dex] ? talents.POKEMON_TALENTS[dex].hiddenAbility : null;
    species[id] = {
      dex,
      region: regionOf(dex),
      types: [lowerType(type1), lowerType(type2)].filter(Boolean),
      stats: [hp, atk, def, spa, spd, spe],
      catchRate,
      xpYield,
      talents: (talents.POKE_TALENTS[dex] || []).map((talent) => String(talent).toLowerCase()),
      hiddenTalent: hidden ? String(hidden).toLowerCase() : null,
      evolutions: evolutions[dex] || []
    };
    if (!fs.existsSync(path.join(PROJECT_ROOT, 'assets/images/pokemon', `${id}.png`))) missingSprites.push(id);
  });

  const forms = {};
  for (const form of Object.values(formsModule.FORMS)) {
    const base = slug(form.base);
    forms[`${base}_${form.key}`] = {
      species: base,
      form: form.key,
      types: form.types.map(lowerType).filter(Boolean),
      stats: form.stats,
      kind: form.kind,
      shop: form.source && form.source.shop ? form.source.shop : null,
      price: form.source && form.source.price ? form.source.price : 0
    };
  }

  const speciesCount = writeTable({
    file: 'src/data/raw/species-data.js',
    name: 'SPECIES_TABLE',
    brief: 'Pokémon species (id = English-name slug = sprite file stem).',
    notes: [
      'Entry: { dex, region, types[lowercase], stats[hp, atk, def, spa, spd, spe], catchRate, xpYield,',
      '         talents[ids of the talent pool], hiddenTalent, evolutions[] }',
      'Evolution: { to, level } | { to, item, minLevel } | { to, level, split: true } (all split',
      '           branches are obtained together) | { to, level, condition } (Tyrogue).',
      'catchRate and xpYield keep the original values (45 / 60 placeholders for most species).'
    ],
    data: species,
    generator: GENERATOR
  });
  const formCount = writeTable({
    file: 'src/data/raw/forms-data.js',
    name: 'FORMS_TABLE',
    brief: 'Alternate forms (id = "<species>_<form>" = sprite file stem).',
    notes: ['Entry: { species, form, types, stats[6], kind, shop, price }'],
    data: forms,
    generator: GENERATOR
  });
  // Names: localization tables keyed by species / form id (legacy tables were arrays by dex).
  const byDexToById = (table) => {
    if (!Array.isArray(table)) return table;
    return Object.fromEntries(table.map((text, dex) => [slugByDex[dex], text]).filter(([id, text]) => id && text));
  };
  const formNames = (lang) => Object.fromEntries(Object.values(formsModule.FORMS)
    .map((form) => [`${slug(form.base)}_${form.key}`, form[`name_${lang}`]]));
  const englishNames = Object.fromEntries(rows.map((row, dex) => [slugByDex[dex], row && row[0]]).filter(([id]) => id));
  const locales = {};
  for (const lang of ['en', 'fr']) {
    locales[lang] = await syncLocaleTable({
      file: `src/localization/${lang}/pokemon-names.js`,
      name: `L_pokemon_names_${lang}`,
      title: `${lang.toUpperCase()} — Pokémon species and form names (key = species id)`,
      defaults: { ...(lang === 'en' ? englishNames : {}), ...Object.fromEntries(Object.keys(species).map((id) => [id, null])), ...formNames(lang) },
      convert: byDexToById
    });
  }
  return { speciesCount, formCount, missingSprites, slugByDex, locales };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateSpecies(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`species=${result.speciesCount} forms=${result.formCount} missingSprites=${result.missingSprites.length} names+=${result.locales.en.added}/${result.locales.fr.added}`);
}
