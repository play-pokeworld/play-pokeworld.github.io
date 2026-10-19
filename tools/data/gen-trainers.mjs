/**
 * @file gen-trainers.mjs
 * @brief Generates the trainer tables from the original official teams:
 *   src/data/raw/trainers-data.js  TRAINERS_TABLE  (src/data/official-teams-data.js + official-teams-hoenn.js)
 *   src/data/raw/leagues-data.js   LEAGUES_TABLE   (src/data/champions-data.js LEAGUE_META + OFFICIAL_LEAGUE_ORDER)
 *   src/localization/<lang>/trainers.js            (champions.js + trainer_battle_* keys of ui.js)
 *
 * Trainer entry:
 *   { kind, region, badge?, badgesRequired, reward, sprite,
 *     teams: { default?: Member[], byStarter?: { <starter species>: Member[] }, rematch?: Member[] } }
 * Member: { species, level, moves?, talent?, item?, ivs?, evs? }
 * The original has no rematch team (a rematch replays the same team without money): `rematch` is
 * never generated, it is a content field (src/data/content/trainers-content.js).
 *
 * Usage: node tools/data/gen-trainers.mjs <original repository root>
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { OriginalSource } from './OriginalSource.mjs';
import { writeTable, PROJECT_ROOT } from './TableWriter.mjs';
import { syncLocaleTable } from './LocaleSync.mjs';
import { speciesSlug } from './gen-species.mjs';

const GENERATOR = 'tools/data/gen-trainers.mjs';
const TRAINER_SPRITE_DIR = 'assets/images/trainers';
const FALLBACK_SPRITE = 'Ace Trainer (male)';

/**
 * Sprites the original resolves to the generic trainer although a dedicated picture exists
 * in assets/images/trainers (curated by hand, file name without extension).
 */
const SPRITE_OVERRIDES = Object.freeze({
  koga_e4: 'Koga2',
  bruno_johto: 'Bruno2',
  lance_johto: 'Lance2',
  hoenn_rival_route103: 'Ace Trainer (female)',
  hoenn_rival_route110: 'Ace Trainer (female)',
  hoenn_rival_route119: 'Ace Trainer (female)',
  hoenn_rival_lilycove: 'Ace Trainer (female)',
  hoenn_wally_mauville: 'School Kid (male)',
  hoenn_wally_victoryroad: 'Cooltrainer (male)',
  hoenn_aqua_rusturf: 'Team Aqua Grunt (male)',
  hoenn_aqua_museum: 'Team Aqua Grunt (female)',
  hoenn_magma_chimney: 'Magma Admin (courtney)',
  hoenn_aqua_weather: 'Aqua Admin (matt)',
  hoenn_magma_hideout: 'Magma Leader',
  hoenn_aqua_seafloor: 'Aqua Leader',
  sidney: 'Sidney',
  phoebe: 'Phoebe',
  glacia: 'Glacia',
  drake: 'Drake',
  steven: 'Steven',
  hoenn_elite4: 'Steven',
  johto_elite4: 'Lance2'
});

/** Original league champion ids (LEAGUE_META keys) -> OFFICIAL_LEAGUE_ORDER region. */
/** Picture of every league title (original getLeagueTrophyHtml). */
const CHAMPION_BADGE_IMAGE = 'Champion_Stamp';

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

/** @returns {Object|null} Stat spread without zero entries */
function spread(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const key of STAT_KEYS) if (Number(raw[key]) > 0) out[key] = Number(raw[key]);
  return Object.keys(out).length ? out : null;
}

export async function generateTrainers(source) {
  const rows = await source.pokedexRows();
  const { OFFICIAL_TEAMS, OFFICIAL_LEAGUE_ORDER } = await source.module('src/data/official-teams-data.js');
  const { OFFICIAL_TEAMS_HOENN } = await source.module('src/data/official-teams-hoenn.js');
  const { LEAGUE_META } = await source.module('src/data/champions-data.js');
  const sprites = await source.module('src/data/trainer-sprites-data.js');
  const { BADGE_DEFINITIONS, LEAGUE_DEFINITIONS } = await source.module('src/ui/game/badges-panel.js');
  const badgeLook = new Map(BADGE_DEFINITIONS.map((badge) => [badge.id, badge]));
  const leagueLook = new Map(LEAGUE_DEFINITIONS.map((league) => [league.champKey, league]));
  const all = { ...OFFICIAL_TEAMS, ...OFFICIAL_TEAMS_HOENN };
  const problems = [];
  // Items unknown to the generated item table are dropped (the original ignores them too).
  const itemsModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/data/raw/items-data.js')).href);
  const knownItems = Object.values(itemsModule)[0] || {};

  const spriteFiles = new Set(fs.readdirSync(path.join(PROJECT_ROOT, TRAINER_SPRITE_DIR)).map((file) => file.replace(/\.png$/, '')));
  const spriteOf = (id) => {
    let file = SPRITE_OVERRIDES[id];
    if (!file) {
      const key = sprites.getTrainerSpriteKey(id);
      file = (sprites.TRAINER_SPRITES[key] || '').replace(/\.png$/, '');
    }
    if (!file || !spriteFiles.has(file)) {
      problems.push(`${id}: sprite "${file}" not found`);
      return FALLBACK_SPRITE;
    }
    return file;
  };

  const member = (raw, trainerId) => {
    const row = rows[raw.id];
    if (!row) {
      problems.push(`${trainerId}: unknown dex number ${raw.id}`);
      return null;
    }
    const out = { species: speciesSlug(row[0]), level: Number(raw.level) || 5 };
    if (Array.isArray(raw.moves) && raw.moves.length) out.moves = [...raw.moves];
    if (raw.talent) out.talent = raw.talent;
    if (raw.item && knownItems[raw.item]) out.item = raw.item;
    else if (raw.item) problems.push(`${trainerId}: unknown held item ${raw.item} dropped`);
    const ivs = spread(raw.ivs);
    if (ivs) out.ivs = ivs;
    const evs = spread(raw.evs);
    if (evs) out.evs = evs;
    return out;
  };
  const teamOf = (list, trainerId) => (list || []).map((raw) => member(raw, trainerId)).filter(Boolean);

  const trainers = {};
  for (const [id, raw] of Object.entries(all)) {
    const teams = {};
    if (Array.isArray(raw.team) && raw.team.length) teams.default = teamOf(raw.team, id);
    if (raw.variantsByStarter) {
      teams.byStarter = {};
      for (const [dex, list] of Object.entries(raw.variantsByStarter)) {
        const row = rows[Number(dex)];
        if (row) teams.byStarter[speciesSlug(row[0])] = teamOf(list, id);
      }
    }
    const entry = { kind: raw.kind, region: raw.region || 'kanto' };
    if (raw.badge && raw.kind === 'gym') {
      entry.badge = raw.badge;
      const look = badgeLook.get(id) || BADGE_DEFINITIONS.find((badge) => badge.file.toLowerCase() === raw.badge);
      if (look) {
        entry.badgeImage = look.file;
        entry.badgeColor = look.color;
      } else problems.push(`${id}: no badge picture`);
    }
    entry.badgesRequired = Number(raw.badgeReq) || 0;
    entry.reward = Number(raw.rewardMoney) || 0;
    entry.sprite = spriteOf(id);
    entry.teams = teams;
    trainers[id] = entry;
  }

  const leagues = {};
  for (const [id, meta] of Object.entries(LEAGUE_META)) {
    leagues[id] = {
      region: meta.region,
      badge: meta.badge,
      badgeImage: CHAMPION_BADGE_IMAGE,
      badgeColor: leagueLook.get(id)?.color || null,
      badgesRequired: Number(meta.badgeReq) || 0,
      reward: Number(meta.reward) || 0,
      sprite: spriteOf(id),
      trainers: [...(OFFICIAL_LEAGUE_ORDER[meta.region] || [])]
    };
  }

  const trainerCount = writeTable({
    file: 'src/data/raw/trainers-data.js',
    name: 'TRAINERS_TABLE',
    brief: 'Trainers with a fixed team: gym leaders, league members, rivals, villains, quest trainers.',
    notes: [
      'Entry: { kind gym|league|rival|team_enemy|quest|boss, region, badge?, badgeImage?, badgeColor? (gyms:',
      '  badge id, assets/images/badges file, glow colour), badgesRequired (badges of the region), reward (money of the first win), sprite (assets/images/trainers),',
      '  teams { default?, byStarter? { <player starter species>: team }, rematch? } }',
      'Member: { species, level, moves?, talent?, item?, ivs?, evs? }.',
      'Texts: localization trainer.<id>.name / title / badge / intro / win.',
      'Hand-made trainers and rematch teams: src/data/content/trainers-content.js.'
    ],
    data: trainers,
    generator: GENERATOR
  });
  const leagueCount = writeTable({
    file: 'src/data/raw/leagues-data.js',
    name: 'LEAGUES_TABLE',
    brief: 'Pokémon Leagues: the trainers fought in a row, the title badge and the first-win reward.',
    notes: [
      'Entry: { region, badge (title id), badgeImage, badgeColor, badgesRequired, reward, sprite,',
      '  trainers [trainer ids, in order] }',
      'Texts: localization trainer.<league id>.name / title / badge.'
    ],
    data: leagues,
    generator: GENERATOR
  });

  // Localization: name / title / badge from champions.js, intro / win / name from ui.js.
  const locales = {};
  for (const lang of ['fr', 'en']) {
    const champions = Object.values(await source.module(`src/localization/${lang}/champions.js`))[0] || {};
    const ui = Object.values(await source.module(`src/localization/${lang}/ui.js`))[0] || {};
    const defaults = {};
    for (const id of [...Object.keys(trainers), ...Object.keys(leagues)]) {
      const champion = champions[id] || {};
      const text = {};
      const name = champion.name || ui[`trainer_battle_name_${id}`];
      if (name) text.name = name;
      if (champion.title) text.title = champion.title;
      if (champion.badgeName) text.badge = champion.badgeName;
      if (ui[`trainer_battle_intro_${id}`]) text.intro = ui[`trainer_battle_intro_${id}`];
      if (ui[`trainer_battle_win_${id}`]) text.win = ui[`trainer_battle_win_${id}`];
      if (!text.name) problems.push(`${id}: no ${lang} name`);
      defaults[id] = text;
    }
    locales[lang] = await syncLocaleTable({
      file: `src/localization/${lang}/trainers.js`,
      name: `L_${lang}_trainers`,
      title: `${lang.toUpperCase()} — Trainer and league texts (key = trainer id)`,
      defaults
    });
  }
  return { trainers: trainerCount, leagues: leagueCount, problems, locales };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateTrainers(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`trainers=${result.trainers} leagues=${result.leagues}`);
  for (const problem of result.problems) console.log(`  ! ${problem}`);
}
