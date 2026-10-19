/**
 * @file gen-moves.mjs
 * @brief Generates src/data/raw/moves-data.js from the original src/data/moves.js.
 * Replaces tools/gen_moves_data.mjs (v1.3): the behaviour the original engine derived from the
 * English description at runtime is now explicit data (effects, cooldown, tags), see
 * tools/data/move-effects.mjs. Names and descriptions stay in localization (move., move_desc.).
 *
 * Usage: node tools/data/gen-moves.mjs <original repository root>
 */

import { OriginalSource } from './OriginalSource.mjs';
import { writeTable } from './TableWriter.mjs';
import { moveBehaviour } from './move-effects.mjs';

const GENERATOR = 'tools/data/gen-moves.mjs';
const CATEGORY_BY_SPLIT = { physical: 'physical', special: 'special', stat: 'status' };

export async function generateMoves(source) {
  const { MOVES } = await source.module('src/data/moves.js');
  const moves = {};
  const notPorted = [];
  for (const id of Object.keys(MOVES).sort()) {
    const move = MOVES[id];
    const behaviour = moveBehaviour(id, move);
    const entry = {
      type: String(move.type).toLowerCase(),
      category: CATEGORY_BY_SPLIT[move.split] || 'status',
      power: Number(move.power) || 0,
      accuracy: Number(move.acc) || 0,
      priority: Number(move.priority) || 0,
      rarity: Number(move.rarity) || 1
    };
    if (Array.isArray(move.multihit)) entry.hits = move.multihit;
    if (behaviour.cooldown !== 1) entry.cooldown = behaviour.cooldown;
    if (behaviour.tags.length) entry.tags = behaviour.tags;
    if (behaviour.bypassDefenseBoosts) entry.bypassDefenseBoosts = true;
    if (behaviour.neverMiss) entry.neverMiss = true;
    if (behaviour.effects.length) entry.effects = behaviour.effects;
    if (Array.isArray(move.moveset) && move.moveset.length) entry.learnTypes = move.moveset.map((type) => String(type).toLowerCase());
    moves[id] = entry;
    if (!behaviour.ported) notPorted.push(id);
  }
  const count = writeTable({
    file: 'src/data/raw/moves-data.js',
    name: 'MOVES_DATA',
    brief: 'Moves: gameplay values and declarative effects (key = move id = localization key).',
    notes: [
      'Entry: { type, category (physical | special | status), power, accuracy (%), priority, rarity,',
      '         hits? [min, max], cooldown? (multiplier of the attack delay, < 1 = faster),',
      '         tags? (punch, fang, claw, pulse, sharp, head, sound, dance, wind), bypassDefenseBoosts?, neverMiss?,',
      '         effects? [], learnTypes? (types of the Pokémon that can draw the move) }',
      'Effects vocabulary: docs/BATTLE_EFFECTS.md ("secondary: true" = removed by Sheer Force).'
    ],
    data: moves,
    generator: GENERATOR
  });
  return { count, notPorted: notPorted.map((id) => ({ id, desc: MOVES[id].desc })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateMoves(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`moves=${result.count} notPorted=${result.notPorted.length}`);
}
