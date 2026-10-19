/**
 * @file gen-balls.mjs
 * @brief Generates src/data/raw/ball-filter-presets-data.js from the original
 * src/application/economy/pokeballs.js (PRESET_FILTERS).
 *  - one entry per base filter, in the original priority order: { id, options };
 *  - the label is not stored: it is the localization key `ball_filter_<id>`;
 *  - the original preset ball is always 'none' (nothing thrown until the player picks a ball),
 *    every preset is locked and enabled: those constants live in BallFilterData.
 * The catch data of the balls themselves is generated with the items (gen-items.mjs).
 *
 * Usage: node tools/data/gen-balls.mjs <original repository root>
 */

import { OriginalSource } from './OriginalSource.mjs';
import { writeTable } from './TableWriter.mjs';

const GENERATOR = 'tools/data/gen-balls.mjs';

export async function generateBalls(source) {
  const { PRESET_FILTERS } = await source.module('src/application/economy/pokeballs.js');
  const presets = PRESET_FILTERS.map((preset) => ({ id: preset.id, options: { ...preset.options } }));
  const count = writeTable({
    file: 'src/data/raw/ball-filter-presets-data.js',
    name: 'BALL_FILTER_PRESETS_TABLE',
    brief: 'Base Poké Ball filters, in priority order (label key = ball_filter_<id>).',
    notes: [
      'Entry: { id, options { caught?, shiny?, caughtShiny?, type?, encounter? } }',
      'caught = species owned (any colour), shiny = the encounter is shiny,',
      'caughtShiny = species already owned as a shiny, encounter = route | dungeon | dungeon_boss | roaming.'
    ],
    data: presets,
    generator: GENERATOR
  });
  return { count };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateBalls(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`ball filter presets=${result.count}`);
}
