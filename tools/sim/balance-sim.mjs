/**
 * @file balance-sim.mjs
 * @brief Headless balance simulation: runs REAL battles through BattleSystem, location by location,
 *        to measure time per region, resource income and difficulty.
 *
 * Every number in the report comes from the engine itself (damage, XP curve, rewards, encounter
 * tables). The only modelled decisions are the player's: which location to grind, and when to move
 * on. Those assumptions are printed in the report so they can be challenged.
 *
 * Usage:
 *   node tools/sim/balance-sim.mjs                 # full run, writes docs/SIMULATION.md + JSON
 *   node tools/sim/balance-sim.mjs --quick         # 1 seeded pass per region (~30 s)
 *   node tools/sim/balance-sim.mjs --json out.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { installFakeDom } from '../../tests/FakeDom.js';

installFakeDom();
for (const level of ['log', 'info', 'warn', 'debug']) console[level] = () => {};
const say = (line) => process.stdout.write(`${line}\n`);

const { SaveSystem } = await import('../../src/systems/SaveSystem.js');
const { BattleSystem } = await import('../../src/systems/BattleSystem.js');
const { LocationDB } = await import('../../src/data/world/LocationDB.js');
const { PokemonRules } = await import('../../src/config/PokemonRules.js');
const { REGIONS } = await import('../../src/config/Regions.js');

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const JSON_OUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const MD_OUT = args.includes('--no-md') ? null : args[args.indexOf('--md') + 1] || 'docs/SIMULATION_v1.16.11.md';

/** Player model — stated assumptions, not engine facts. */
const MODEL = Object.freeze({
  starterPerRegion: { kanto: 'charmander', johto: 'cyndaquil', hoenn: 'torchic' },
  /** A regional starter is created at PlayerDefaults.STARTER_LEVEL: every region opens at level 5. */
  freshStartLevel: 5,
  /** Move on when the active Pokémon is this many levels above the strongest local encounter. */
  levelLead: 3,
  /** Hard cap so a broken spawn cannot loop forever. */
  maxBattlesPerLocation: QUICK ? 24 : 90,
  /** A player does not walk into content this many levels above their own. */
  entryTolerance: 5,
  /** Companions kept at the starter's level (a player never fights with one Pokémon). */
  teamSize: 3,
  /** XP a real player never wastes: sessions stop at this many wins. */
  winsPerSession: QUICK ? 6 : 12,
  /** A player leaves a route after this many lost sessions in a row. */
  defeatTolerance: 3,
  /** Real-world seconds a player spends per simulated battle second is 1:1 (the engine clock is real). */
  step: 0.1,
});

const db = LocationDB.getInstance();

/** Locations that can be fought, in story order, per region. */
function ladder(regionId) {
  const minLevel = (location) => Math.min(...location.encounters.map((slot) => slot.level ?? slot.maxLevel ?? 1));
  const maxLevel = (location) => Math.max(...location.encounters.map((slot) => slot.level ?? slot.maxLevel ?? 1));
  return db.getByRegion(regionId)
    .filter((location) => location.encounters.length > 0)
    // Progression order = the order the database declares (routes, caves, cities in game order),
    // restricted to locations that actually have encounters.
    .sort((a, b) => (a.badgesRequired - b.badgesRequired) || (order(a) - order(b)));
}

/** Position of a location in its region, i.e. the intended progression order. */
function order(location) {
  const siblings = db.getByRegion(location.region);
  return siblings.indexOf(location);
}

function levelBounds(location) {
  const levels = location.encounters.map((slot) => slot.level ?? slot.maxLevel ?? 1);
  return { min: Math.min(...levels), max: Math.max(...levels) };
}

/** Experience needed to reach `level`; used to convert XP into "how far a region carries you". */
function totalXpForLevel(level) {
  return Math.floor(Math.pow(level, 3) * PokemonRules.EXP_CURVE_FACTOR);
}

function runSession(save, locationId) {
  const battle = BattleSystem.getInstance();
  const wildWins = () => save.statistics.wildWins[locationId] ?? 0;
  const winsBefore = wildWins();
  const moneyBefore = save.currencies.get('money');
  const mon = save.team[0];
  const xpBefore = mon.exp;
  const levelBefore = mon.level;
  let seconds = 0;
  let wins = 0;

  // A real player heals for free at a Pokémon Center between two sessions: no HP bleed.
  const menu = save.team;
  if (Array.isArray(menu)) for (const member of menu) member.healFull?.();
  if (!battle.startBattle(locationId)) return { started: false };

  while (battle.isActive() && seconds < 600) {
    battle.update(MODEL.step);
    seconds += MODEL.step;
    wins = wildWins() - winsBefore;
    if (wins >= MODEL.winsPerSession) break;
  }

  const summary = battle.getBattleSummary();
  battle.endBattle(false);
  return {
    started: true,
    seconds: Number(seconds.toFixed(1)),
    wins,
    defeats: wins === 0 ? 1 : 0,
    money: save.currencies.get('money') - moneyBefore,
    // exp is stored per level, so a level up resets it: measure the real progress
    xp: (totalXpForLevel(mon.level) + mon.exp) - (totalXpForLevel(levelBefore) + xpBefore),
    levels: mon.level - levelBefore,
    level: mon.level,
    items: (summary.run?.itemsGained ?? []).length,
  };
}

async function simulateRegion(regionId, entryLevel, scenario = 'fresh') {
  const save = SaveSystem.getInstance().createNewSave(`Sim ${regionId}`, MODEL.starterPerRegion[regionId]);
  save.tutorial.enabled = false;
  save.player.region = regionId;
  const mon = save.team[0];
  mon.setLevel(entryLevel);

  // A real player does not fight alone: two companions from the local pool are kept at the
  // starter's level (the XP of the active Pokémon is not shared, so they are re-synced).
  const { PokemonFactory } = await import('../../src/data/pokemon/PokemonFactory.js');
  const { TeamSystem } = await import('../../src/systems/TeamSystem.js');
  const companions = (await availableSpecies(regionId, 0, MODEL.starterPerRegion[regionId])).slice(1, MODEL.teamSize);
  for (const species of companions) {
    const member = PokemonFactory.create(species, entryLevel);
    if (member) TeamSystem.getInstance().addPokemon(member, { deferSave: true });
  }

  const rows = [];
  let defeatStreak = 0;

  for (const location of ladder(regionId)) {
    const bounds = levelBounds(location);
    const target = Math.min(100, bounds.max + MODEL.levelLead);
    if (bounds.min > mon.level + MODEL.entryTolerance) {
      rows.push({
        id: location.id, badges: location.badgesRequired, winsToClear: location.winsToClear,
        encounterLevels: `${bounds.min}-${bounds.max}`, entryLevel: mon.level, exitLevel: mon.level,
        battles: 0, wins: 0, defeats: 0, seconds: 0, money: 0, xp: 0, sessions: 0, skipped: true,
      });
      continue;
    }
    const row = {
      id: location.id, badges: location.badgesRequired, winsToClear: location.winsToClear,
      encounterLevels: `${bounds.min}-${bounds.max}`, entryLevel: mon.level,
      battles: 0, wins: 0, defeats: 0, seconds: 0, money: 0, xp: 0, sessions: 0,
    };
    while (mon.level < target && row.battles < MODEL.maxBattlesPerLocation) {
      for (const member of save.team.slice(1)) member.setLevel?.(mon.level);
      const session = runSession(save, location.id);
      if (!session.started) break;
      row.sessions += 1;
      row.battles += session.wins || 1;
      row.wins += session.wins;
      row.defeats += session.defeats;
      row.seconds += session.seconds;
      row.money += session.money;
      row.xp += session.xp;
      if (session.defeats) defeatStreak += 1; else defeatStreak = 0;
      if (session.levels > 0) row.levelUps = (row.levelUps ?? 0) + session.levels;
      if (defeatStreak >= MODEL.defeatTolerance) { row.blocked = true; break; }
    }
    row.exitLevel = mon.level;
    row.seconds = Number(row.seconds.toFixed(1));
    rows.push(row);
    if (row.blocked) {
      // A wall: the player cannot pass with this model. Keep the region honest and stop.
      break;
    }
  }

  const totals = rows.reduce((acc, row) => ({
    battles: acc.battles + row.battles,
    wins: acc.wins + row.wins,
    defeats: acc.defeats + row.defeats,
    seconds: acc.seconds + row.seconds,
    money: acc.money + row.money,
    xp: acc.xp + row.xp,
    locations: acc.locations + 1,
  }), { battles: 0, wins: 0, defeats: 0, seconds: 0, money: 0, xp: 0, locations: 0 });

  const hours = totals.seconds / 3600;
  return {
    region: regionId,
    scenario,
    entryLevel,
    exitLevel: mon.level,
    levelsGained: mon.level - entryLevel,
    blocked: rows.some((row) => row.blocked),
    blockedAt: rows.find((row) => row.blocked)?.id ?? null,
    totals,
    hours: Number(hours.toFixed(2)),
    secondsPerWin: totals.wins ? Number((totals.seconds / totals.wins).toFixed(1)) : null,
    moneyPerHour: hours > 0 ? Math.round(totals.money / hours) : null,
    xpPerHour: hours > 0 ? Math.round(totals.xp / hours) : null,
    defeatsPer100: totals.battles ? Number(((totals.defeats / totals.battles) * 100).toFixed(1)) : 0,
    rows,
  };
}

/**
 * Minimum level at which a SOLO starter (no item, no switch, no second Pokémon) wins the fight.
 * This is the difficulty floor of a gym: below it the player cannot pass at all.
 */
/** The six species a player actually has before that gym: the local encounter pool, best first. */
async function availableSpecies(regionId, badgesRequired, starter) {
  const { PokemonDB } = await import('../../src/data/pokemon/PokemonDB.js');
  const pool = [];
  for (const location of db.getByRegion(regionId)) {
    if (location.badgesRequired > badgesRequired) continue;
    for (const slot of location.encounters) if (slot.species && !pool.includes(slot.species)) pool.push(slot.species);
  }
  // A real player keeps the best of what they caught, not the first thing they met:
  // rank the pool by base stat total and take the strongest five next to the starter.
  const strength = (species) => {
    const entry = PokemonDB?.getById?.(species);
    const stats = entry?.baseStats;
    if (!stats) return 0;
    return Object.values(stats).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
  };
  const ranked = pool.filter((species) => species !== starter).sort((a, b) => strength(b) - strength(a));
  return [starter, ...ranked].slice(0, 6);
}

async function minimalWinningLevel(championId, locationId, speciesId, regionId, badgesRequired) {
  const { TrainerSystem } = await import('../../src/systems/TrainerSystem.js');
  const { TrainerDB } = await import('../../src/data/trainers/TrainerDB.js');
  const { PokemonFactory } = await import('../../src/data/pokemon/PokemonFactory.js');
  const { TeamSystem } = await import('../../src/systems/TeamSystem.js');
  const species = await availableSpecies(regionId, badgesRequired, speciesId);
  const attempt = (level) => {
    const save = SaveSystem.getInstance().createNewSave(`Gym ${championId}`, speciesId);
    save.tutorial.enabled = false;
    save.player.region = regionId;
    // A gym requires badges: give the simulated player the badges they would already own
    // (badge ids are gym trainer ids, so the region count is computed from real data).
    // The lock is enforced from TrainerDB (owner.badgesRequired), not LocationDB.
    const required = TrainerDB.getInstance().getById(championId)?.badgesRequired ?? badgesRequired;
    save.player.badges = TrainerDB.getInstance().getGyms(regionId)
      .slice(0, required)
      .map((gym) => gym.id);
    save.team[0].setLevel(level);
    for (const extra of species.slice(1)) {
      const pokemon = PokemonFactory.create(extra, level);
      if (pokemon) TeamSystem.getInstance().addPokemon(pokemon, { deferSave: true });
    }
    const trainer = TrainerSystem.getInstance();
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const started = trainer.challenge(championId, { locationId });
    if (!started) return 'locked';
    for (let i = 0; i < 30000 && battle.isActive(); i += 1) battle.update(0.1);
    const summary = battle.getBattleSummary();
    if (battle.isActive()) battle.endBattle(false);
    return summary.victory === true;
  };
  const low = attempt(5);
  if (low === 'locked') return { locked: true };
  if (low) return { level: 5 };
  const high = attempt(100);
  if (high === 'locked') return { locked: true };
  if (!high) return { level: null };
  let lo = 5; let hi = 100;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (attempt(mid)) hi = mid; else lo = mid;
  }
  return { level: hi };
}

async function analyseBadges(regionId) {
  const champions = db.getByRegion(regionId)
    .filter((location) => location.champion)
    .sort((a, b) => (a.badgesRequired - b.badgesRequired) || (a.id < b.id ? -1 : 1));
  const species = MODEL.starterPerRegion[regionId];
  const { TrainerDB } = await import('../../src/data/trainers/TrainerDB.js');
  const rows = [];
  for (const location of champions) {
    // The badge gate that actually locks the fight lives in TrainerDB, not LocationDB.
    const required = TrainerDB.getInstance().getById(location.champion)?.badgesRequired ?? location.badgesRequired;
    const result = await minimalWinningLevel(location.champion, location.id, species, regionId, required);
    const available = db.getByRegion(regionId)
      .filter((candidate) => candidate.encounters.length && candidate.badgesRequired <= required)
      .map((candidate) => Math.max(...candidate.encounters.map((slot) => slot.level ?? slot.maxLevel ?? 1)));
    rows.push({
      id: location.id,
      champion: location.champion,
      team: (await availableSpecies(regionId, required, species)).join(','),
      badgesRequired: required,
      minLevel: result.level,
      locked: result.locked ?? false,
      bestWildLevel: available.length ? Math.max(...available) : null,
    });
  }
  return { region: regionId, species, rows };
}

const results = [];
let veteranLevel = MODEL.freshStartLevel;
for (const region of REGIONS.filter((entry) => entry.available)) {
  const fresh = await simulateRegion(region.id, MODEL.freshStartLevel, 'fresh');
  const veteran = await simulateRegion(region.id, veteranLevel, 'veteran');
  veteranLevel = Math.max(veteranLevel, fresh.exitLevel);
  results.push(fresh, veteran);
  for (const report of [fresh, veteran]) {
    say(`${region.id}/${report.scenario}: ${report.hours} h, ${report.totals.battles} combats, `
      + `niv ${report.entryLevel}→${report.exitLevel}, ${report.defeatsPer100}% défaites`
      + (report.blocked ? ` MUR à ${report.blockedAt}` : ''));
  }
}

const badges = [];
for (const region of REGIONS.filter((entry) => entry.available)) badges.push(await analyseBadges(region.id));

const summary = {
  generatedAt: new Date().toISOString(),
  version: '1.16.11',
  quick: QUICK,
  model: MODEL,
  regions: results,
  badges,
};
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(summary, null, 2));

if (MD_OUT) {
  const lines = [];
  lines.push('# Simulation d\'équilibrage — v1.16.11');
  lines.push('');
  lines.push('> Généré par `node tools/sim/balance-sim.mjs`. Chaque combat est **réellement exécuté**');
  lines.push('> par `BattleSystem` (dégâts, XP, récompenses, tables de rencontre du jeu). Seules les');
  lines.push('> décisions du joueur sont modélisées, et elles sont écrites ci-dessous.');
  lines.push('');
  lines.push('## Modèle de joueur');
  lines.push('');
  lines.push('| Hypothèse | Valeur |');
  lines.push('| --- | --- |');
  lines.push(`| Starter par région | ${Object.entries(MODEL.starterPerRegion).map(([k, v]) => `${k}: ${v}`).join(', ')} |`);
  lines.push(`| Niveau d\'entrée de région | ${MODEL.freshStartLevel} (starter régional) |`);
  lines.push(`| On quitte une route | quand le Pokémon a ${MODEL.levelLead} niveaux d\'avance sur le plus fort des rencontres |`);
  lines.push(`| Session de farm | ${MODEL.winsPerSession} victoires maximum, soin complet après une défaite (règle du jeu) |`);
  lines.push(`| Abandon d\'une route | après ${MODEL.defeatTolerance} sessions perdues d\'affilée (mur) |`);
  lines.push('');
  lines.push('## Temps par région');
  lines.push('');
  lines.push('| Région | Départ | Niveau entrée → sortie | Combats | Défaites | Temps | s / victoire | ₽ / heure | XP / heure |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const region of results) {
    lines.push(`| ${region.region} | ${region.scenario === 'fresh' ? 'starter neuf' : 'équipe vétérane'} | ${region.entryLevel} → ${region.exitLevel} | ${region.totals.battles} | ${region.totals.defeats} | ${region.hours} h | ${region.secondsPerWin ?? '—'} | ${region.moneyPerHour ?? '—'} | ${region.xpPerHour ?? '—'} |`);
  }
  lines.push('');
  for (const region of results) {
    lines.push(`## ${region.region} (${region.scenario}) — détail par lieu`);
    lines.push('');
    lines.push('| Lieu | Badges | Niv. rencontres | Niv. entrée → sortie | Combats | Défaites | Temps (s) | ₽ | XP |');
    lines.push('| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |');
    for (const row of region.rows) {
      lines.push(`| \`${row.id}\`${row.blocked ? ' ⛔' : ''} | ${row.badges} | ${row.encounterLevels} | ${row.entryLevel} → ${row.exitLevel} | ${row.battles} | ${row.defeats} | ${row.seconds} | ${row.money} | ${row.xp} |`);
    }
    lines.push('');
  }
  lines.push('## Difficulté des Arènes et des Ligues');
  lines.push('');
  lines.push('Niveau **minimal** auquel gagne une équipe de 6 (le starter + les 5 premières espèces');
  lines.push('capturables avant cette arène), **sans objet et sans soin** — c\'est le plancher de difficulté.');
  lines.push('');
  lines.push('| Région | Arène / Ligue | Badges requis | Niv. sauvage disponible | Niv. minimal pour gagner | Écart |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: |');
  for (const group of badges) {
    for (const row of group.rows) {
      const gap = (row.minLevel && row.bestWildLevel) ? row.minLevel - row.bestWildLevel : null;
      lines.push(`| ${group.region} | \`${row.champion}\` | ${row.badgesRequired} | ${row.bestWildLevel ?? '—'} | ${row.locked ? 'verrouillé' : (row.minLevel ?? '> 100')} | ${gap === null ? '—' : (gap > 0 ? `+${gap}` : gap)} |`);
    }
  }
  lines.push('');
  fs.writeFileSync(MD_OUT, lines.join('\n'));
  say(`report: ${MD_OUT}`);
}
