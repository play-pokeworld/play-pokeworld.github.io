/**
 * @file gen-quests.mjs
 * @brief Generates src/data/raw/quests-data.js from the original quest tables
 * (story-quests.js, side-quests-data.js, repeatable-quests-data.js).
 * Every quest becomes { category, id, region, location?, objective: { type, count, ... }, rewards }.
 * The original `type` strings are mapped to the objective types of the remake
 * (src/data/quests/objectives/*): defeat_wild -> kill, trainer_battle -> boss, … .
 * Texts stay in localization/<lang>/quests.js (quests.<category>.<id>.{title, desc});
 * the reward line is derived from `rewards` at runtime (the hand-written rewardDesc is removed).
 *
 * Usage: node tools/data/gen-quests.mjs <original repository root>
 */

import { OriginalSource } from './OriginalSource.mjs';
import { writeTable } from './TableWriter.mjs';
import { readLocaleTable } from './LocaleSync.mjs';
import { speciesSlug } from './gen-species.mjs';
import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from './TableWriter.mjs';

const GENERATOR = 'tools/data/gen-quests.mjs';

/**
 * The original data stores a `rewardMoney`, but every quest pays QUEST POINTS since the
 * original P0 economy update: claimQuest() and computeRewardText() convert it with pqForMoney()
 * (application/economy/currency.js). The conversion is applied once, here.
 * @param {number} money
 * @returns {number}
 */
function questPointsForMoney(money) {
  if (money >= 27000) return 2500;
  if (money >= 21000) return 1000;
  if (money >= 16000) return 500;
  if (money >= 9000) return 250;
  return 100;
}

/** Original quest type -> objective type of the remake. */
export const OBJECTIVE_BY_TYPE = {
  talk: 'talk',
  defeat_wild: 'kill',
  catch: 'catch',
  trainer_battle: 'boss',
  badge: 'badge',
  item: 'item',
  mine_items: 'mine_dig',
  mine_sell: 'mine_sell',
  egg_hatch: 'hatch',
  hatchery_level: 'hatchery_level',
  training_session: 'training',
  fossil_revive: 'fossil',
  puzzle: 'puzzle',
  base_visit: 'base_visit',
  base_establish: 'base_establish',
  // World-state steps of the legendary chains (original V7 LEG-01).
  region_wins: 'region_wins',
  dex_region: 'dex_region',
  own_species: 'own_species'
};

/**
 * @param {Array} rows - Original Pokédex rows (index = dex number)
 * @param {number} dex
 * @returns {string} Species id of the remake
 */
const slugOf = (rows, dex) => speciesSlug(rows[dex][0]);

/**
 * Reward items unknown to the original ITEMS table were silently skipped by the original
 * grantRewardItem() (data/rewards.js): they are dropped here and listed in DATA_COVERAGE.md.
 * Filled by generateQuests() before the conversion.
 * @type {{ items: Object|null, dropped: Array<{quest: string, item: string}> }}
 */
const rewardItems = { items: null, dropped: [] };

function convert(category, quest, rows, unknownTypes) {
  const type = OBJECTIVE_BY_TYPE[quest.type];
  if (!type) unknownTypes.add(quest.type);
  const objective = { type: type || quest.type, count: Number(quest.target) || 1 };
  if (quest.battleId) objective.trainer = quest.battleId;
  if (quest.targetBadge) objective.badge = quest.targetBadge;
  if (quest.requiredItem) objective.item = quest.requiredItem;
  if (quest.targetPuzzleId) objective.puzzle = quest.targetPuzzleId;
  // Location-bound counters (kill / catch count only at that location group, like the original).
  if (quest.loc && (type === 'kill' || type === 'catch')) objective.location = quest.loc;
  if (quest.targetRegion) objective.region = quest.targetRegion;
  if (quest.targetSpecies) objective.species = slugOf(rows, quest.targetSpecies);

  const rewards = {};
  if (quest.rewardMoney) rewards.questPoints = questPointsForMoney(quest.rewardMoney);
  const items = {};
  for (const [itemId, quantity] of Object.entries(quest.rewardItems || {})) {
    if (rewardItems.items[itemId]) items[itemId] = quantity;
    else rewardItems.dropped.push({ quest: `${category}.${quest.id}`, item: itemId });
  }
  if (Object.keys(items).length) rewards.items = items;
  if (quest.rewardPoke) {
    rewards.pokemon = { species: slugOf(rows, quest.rewardPoke), level: quest.rewardLevel || 5 };
    if (quest.rewardShiny) rewards.pokemon.shiny = true;
  }
  const entry = { category, id: String(quest.id), region: quest.region || null };
  if (quest.loc) entry.location = quest.loc;
  entry.objective = objective;
  entry.rewards = rewards;
  if (quest.lockMsg) entry.locked = 'kalos_adventure';
  return entry;
}

/**
 * Legendary quests (original data/legendary-quests.js, V7 LEG-01 / LEG-02):
 *  - Kanto / Johto: an existing main quest whose reward Pokémon is met in an ENCOUNTER at a
 *    location (catch rate x2) instead of being given -> `encounter` is added to that main quest;
 *  - Hoenn: a CHAIN of side quests `<legendary>_<n>`; the first step carries the chain
 *    `requires` (caught species, league won), the last one the reward encounter.
 * @param {Object[]} quests - Converted quests (mutated: main quests get `encounter`)
 * @param {Object[]} legendaries - Original LEGENDARY_QUESTS
 * @param {Array} rows
 * @param {Set<string>} unknownTypes
 * @returns {Object[]} Side quests of the Hoenn chains
 */
function convertLegendaries(quests, legendaries, rows, unknownTypes) {
  const chainQuests = [];
  for (const legendary of legendaries) {
    const encounter = { location: legendary.encounter.loc, level: legendary.encounter.level };
    if (legendary.mainQuestId != null) {
      const main = quests.find((quest) => quest.category === 'main' && quest.id === String(legendary.mainQuestId));
      if (main) main.encounter = encounter;
      continue;
    }
    legendary.steps.forEach((step, index) => {
      const last = index === legendary.steps.length - 1;
      const raw = { ...step, id: `${legendary.id}_${index + 1}`, region: legendary.region };
      if (last) Object.assign(raw, { rewardPoke: legendary.poke, rewardLevel: encounter.level });
      const entry = convert('side', raw, rows, unknownTypes);
      entry.chain = { id: legendary.id, step: index + 1, steps: legendary.steps.length };
      if (index === 0 && legendary.requires) {
        entry.requires = {};
        if (legendary.requires.caught) entry.requires.caught = legendary.requires.caught.map((dex) => slugOf(rows, dex));
        if (legendary.requires.league) entry.requires.league = legendary.requires.league;
      }
      if (last) entry.encounter = encounter;
      chainQuests.push(entry);
    });
  }
  return chainQuests;
}

export async function generateQuests(source) {
  const { STORY_QUESTS } = await source.module('src/data/story-quests.js');
  // Hoenn main quests live in their own file: loading it appends them to the global STORY_QUESTS
  // (original behaviour), so the merged chain is deduplicated by id, keeping the first occurrence.
  const { STORY_QUESTS_HOENN } = await source.module('src/data/story-quests-hoenn.js');
  const mainChain = [...new Map([...STORY_QUESTS, ...STORY_QUESTS_HOENN].map((quest) => [quest.id, quest])).values()];
  const { SIDE_QUESTS } = await source.module('src/data/side-quests-data.js');
  const { REPEATABLE_QUESTS } = await source.module('src/data/repeatable-quests-data.js');
  const { LEGENDARY_QUESTS } = await source.module('src/data/legendary-quests.js');
  const { ITEMS } = await source.module('src/data/items-data.js');
  rewardItems.items = ITEMS;
  rewardItems.dropped = [];
  const rows = await source.pokedexRows();
  const unknownTypes = new Set();
  const quests = [
    ...mainChain.map((quest) => convert('main', quest, rows, unknownTypes)),
    // Loading legendary-quests.js merges its chain steps into the global SIDE_QUESTS (original
    // behaviour): they are skipped here and converted by convertLegendaries().
    ...Object.values(SIDE_QUESTS).filter((quest) => !quest.legendaryId).map((quest) => convert('side', quest, rows, unknownTypes)),
    ...REPEATABLE_QUESTS.map((quest) => convert('repeatable', quest, rows, unknownTypes))
  ];
  const chainQuests = convertLegendaries(quests, LEGENDARY_QUESTS, rows, unknownTypes);
  const firstRepeatable = quests.findIndex((quest) => quest.category === 'repeatable');
  quests.splice(firstRepeatable, 0, ...chainQuests);
  const count = writeTable({
    file: 'src/data/raw/quests-data.js',
    name: 'QUESTS_TABLE',
    brief: 'Quest definitions (main story in order, side quests, repeatable quests).',
    notes: [
      'Entry: { category (main | side | repeatable), id, region, location?, objective, rewards, locked?,',
      '         chain? { id, step, steps } (legendary chain), requires? { caught[species], league },',
      '         encounter? { location, level } (the reward Pokémon is met there, catch rate x2) }',
      'objective: { type, count, location? (kill / catch), trainer? (boss), badge?, item?, puzzle?,',
      '             region? (region_wins / dex_region), species? (own_species) }',
      'type: talk | kill | catch | boss | badge | item | mine_dig | mine_sell | hatch | hatchery_level |',
      '      training | fossil | puzzle | base_visit | base_establish | region_wins | dex_region |',
      '      own_species (see src/data/quests/objectives/)',
      'rewards: { questPoints?, items? { itemId: quantity }, pokemon? { species, level, shiny? } }',
      'Texts: localization quests.<category>.<id>.{title, desc}.'
    ],
    data: quests,
    generator: GENERATOR
  });

  // Localization: drop the hand-written reward lines (derived from `rewards` at runtime).
  let removed = 0;
  for (const lang of ['en', 'fr']) {
    const file = `src/localization/${lang}/quests.js`;
    const table = await readLocaleTable(file);
    for (const byId of Object.values(table)) {
      for (const texts of Object.values(byId)) {
        if (texts && 'rewardDesc' in texts) { delete texts.rewardDesc; removed++; }
      }
    }
    const text = `// ===== ${lang.toUpperCase()} — Quest texts =====\n// quests.<category>.<id>.{title, desc}; rewards are formatted from src/data/raw/quests-data.js.\nexport const L_${lang}_quests = ${JSON.stringify(table, null, 2)};\n`;
    fs.writeFileSync(path.join(PROJECT_ROOT, file), text);
  }
  return { count, unknownTypes: [...unknownTypes], removedRewardTexts: removed, droppedRewardItems: rewardItems.dropped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateQuests(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`quests=${result.count} unknownTypes=${result.unknownTypes.join(',') || 'none'} rewardDesc removed=${result.removedRewardTexts}`);
}
