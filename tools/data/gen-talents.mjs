/**
 * @file gen-talents.mjs
 * @brief Generates src/data/raw/talents-data.js: every talent of the original game
 * (src/data/talents-full.js) with its rarity, type affinity and declarative battle effects
 * (port table talent-effects.mjs). Names and descriptions go to localization/<lang>/talents.js.
 *
 * Usage: node tools/data/gen-talents.mjs <original repository root>
 */

import { OriginalSource } from './OriginalSource.mjs';
import { writeTable } from './TableWriter.mjs';
import { syncLocaleTable } from './LocaleSync.mjs';
import { talentEffects } from './talent-effects.mjs';

const GENERATOR = 'tools/data/gen-talents.mjs';

export async function generateTalents(source) {
  const { TALENTS_FULL } = await source.module('src/data/talents-full.js');
  const { TALENTS } = await source.module('src/data/talents-data.js');
  const frenchById = {};
  for (const entry of Object.values(TALENTS)) frenchById[String(entry.id).toLowerCase()] = entry;

  const talents = {};
  const notPorted = [];
  for (const id of Object.keys(TALENTS_FULL).sort()) {
    const entry = TALENTS_FULL[id];
    const effects = talentEffects(id);
    if (!effects) notPorted.push(id);
    talents[id] = {
      rarity: Number(entry.rarity) || 1,
      affinity: (entry.types || []).map((type) => String(type).toLowerCase()),
      effects: effects || []
    };
  }

  const count = writeTable({
    file: 'src/data/raw/talents-data.js',
    name: 'TALENTS_TABLE',
    brief: 'Talents (abilities): rarity, type affinity and declarative battle effects.',
    notes: [
      'Entry: { rarity (1 common, 2 rare, 3 very rare), affinity[types], effects[] }',
      'Effects are transcribed from the original combat code (tools/data/talent-effects.mjs);',
      'an empty list means "not ported yet" (see docs/DATA_COVERAGE.md). Vocabulary: docs/BATTLE_EFFECTS.md.'
    ],
    data: talents,
    generator: GENERATOR
  });

  const defaults = (lang) => Object.fromEntries(Object.keys(talents).map((id) => {
    const french = frenchById[id] || {};
    return [id, lang === 'fr'
      ? { name: french.name_fr || TALENTS_FULL[id].name, desc: french.desc || TALENTS_FULL[id].info }
      : { name: TALENTS_FULL[id].name, desc: TALENTS_FULL[id].info }];
  }));
  const locales = {};
  for (const lang of ['en', 'fr']) {
    locales[lang] = await syncLocaleTable({
      file: `src/localization/${lang}/talents.js`,
      name: `L_${lang}_talents`,
      title: `${lang.toUpperCase()} — Talent names and descriptions (key = talent id)`,
      defaults: defaults(lang)
    });
  }
  return { count, notPorted, locales };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateTalents(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`talents=${result.count} notPorted=${result.notPorted.length} (${result.notPorted.join(' ')})`);
  console.log(`locale+ en=${result.locales.en.added} fr=${result.locales.fr.added} unknown=${result.locales.fr.unknown.length}`);
}
