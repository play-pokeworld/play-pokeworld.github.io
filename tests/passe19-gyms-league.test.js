import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phase 19 — Big project step 3: gyms & leagues on the official base ─────
// Verifies the champions-data.js compatibility layer (getChampDef,
// getLeagueTrainersForRegion), the gauntlet order, Champion Blue's variant
// according to the player's starter, canonical species/levels, league-step
// i18n and save compatibility (unchanged ids).
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr' },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => '', tr: (k) => '', getPokeName: (id) => 'P' + id,
    notify: () => {}, saveGame: () => {}, setMsg: () => {},
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/application/world/team.js', 'src/application/pokemon-factory.js',
    'src/data/champions-data.js', 'src/data/official-teams-data.js', // order of the real loader
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}

const sb = makeSandbox();
const KANTO_GYMS = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
const JOHTO_GYMS = ['falkner', 'bugsy', 'whitney', 'morty', 'chuck', 'jasmine', 'pryce', 'clair'];

test('save compat: the 16 gym ids + 2 league ids exist via getChampDef', () => {
  for (const id of [...KANTO_GYMS, ...JOHTO_GYMS, 'elite4', 'johto_elite4']) {
    const def = sb.getChampDef(id);
    assert.ok(def, `${id}: definition present`);
    assert.ok(typeof def.badgeReq === 'number', `${id}: numeric badgeReq`);
  }
  assert.equal(sb.getChampDef('atoll'), null, 'atoll: separate pipeline, no def here');
  assert.equal(sb.getChampDef('inconnu'), null, 'id inconnu → null');
});

test('gyms: coherent metadata (region, progressive badgeReq 0→7, capped rewards)', () => {
  KANTO_GYMS.forEach((id, i) => {
    const def = sb.getChampDef(id);
    assert.equal(def.region, 'kanto', `${id}: kanto region`);
    assert.equal(def.badgeReq, i, `${id} : badgeReq ${i} (ordre canon)`);
    assert.ok(def.reward >= 1400 && def.reward <= 5200, `${id}: reward ${def.reward} in [1400..5200]`);
    assert.ok(Array.isArray(def.strategy) && def.strategy.length >= 1, `${id}: styles shown`);
  });
  JOHTO_GYMS.forEach((id, i) => {
    const def = sb.getChampDef(id);
    assert.equal(def.region, 'johto', `${id}: johto region`);
    assert.equal(def.badgeReq, i, `${id} : badgeReq ${i} (ordre canon)`);
    assert.ok(def.reward >= 1400 && def.reward <= 5200, `${id}: reward ${def.reward} in [1400..5200]`);
  });
  // Leagues: first-victory rewards lowered (phase 18 ethos)
  assert.equal(sb.getChampDef('elite4').reward, 12000, 'Kanto league: 12000₽ (was 15000)');
  assert.equal(sb.getChampDef('johto_elite4').reward, 14000, 'Johto league: 14000₽ (was 18000)');
  assert.equal(sb.getChampDef('elite4').badgeReq, 8, 'ligue Kanto : 8 badges requis');
});

test('gyms: real instantiated teams (movesets, abilities, items — no more random Pokémon)', () => {
  for (const id of [...KANTO_GYMS, ...JOHTO_GYMS]) {
    const team = sb.getChampDef(id).team;
    assert.ok(team.length >= 2, `${id} : ≥ 2 Pokémon (canon)`);
    for (const p of team) {
      assert.ok(p.moves.length >= 1 && p.moves.length <= 4, `${id}#${p.id}: 1-4 instantiated moves`);
      assert.ok(p.moves.every((m) => sb.MOVES[m.id]), `${id}#${p.id}: valid move ids`);
      assert.ok(p.talent, `${id}#${p.id}: applied ability`);
    }
    // From the region's 2nd badge, the ace holds an item (engine-active
    // type_boost, phase 17 audit) — gym 1 canon: no held item.
    const def = sb.getChampDef(id);
    if (def.badgeReq >= 2) {
      const ace = team[team.length - 1];
      assert.ok(ace.heldItem, `${id}: the ace holds an item (${ace.heldItem})`);
    }
  }
});

test('canonical species & levels (FRLG Kanto / GSC Johto) — legacy non-regressions', () => {
  const lvl = (id, idx) => sb.getChampDef(id).team[idx].level;
  const pid = (id, idx) => sb.getChampDef(id).team[idx].id;
  // Kanto RFVF
  assert.deepEqual([lvl('surge', 0), lvl('surge', 2)], [21, 24], 'Major Bob : Voltorbe 21 / Raichu 24');
  assert.deepEqual([lvl('erika', 0), lvl('erika', 1), lvl('erika', 2)], [29, 24, 29], 'Erika : 29/24/29');
  assert.equal(lvl('koga', 3), 43, 'Koga : Smogogo 43');
  assert.equal(lvl('sabrina', 3), 43, 'Morgane : Alakazam 43');
  assert.equal(lvl('blaine', 3), 47, 'Auguste : Arcanin 47');
  assert.equal(lvl('giovanni', 4), 50, 'Giovanni: Rhydon 50');
  assert.equal(sb.getChampDef('giovanni').team.length, 5, 'Giovanni : 5 Pokémon (canon RFVF)');
  // Johto GSC — legacy had fanciful teams (e.g. Jigglypuff 20 on Whitney)
  assert.deepEqual([pid('whitney', 0), pid('whitney', 1)], [35, 241], 'Whitney: Clefairy 18 / Miltank 20 (canon)');
  assert.equal(lvl('whitney', 1), 20, 'Miltank level 20 canon');
  assert.deepEqual([lvl('falkner', 0), lvl('falkner', 1)], [9, 13], 'Albert : Roucool 9 / Roucoups 13');
  assert.equal(pid('bugsy', 2), 123, 'Bugsy: Scyther 16 (canon)');
  assert.equal(lvl('morty', 3), 25, 'Mortimer : Ectoplasma 25');
  assert.equal(pid('jasmine', 2), 208, 'Jasmine : Steelix 35');
  assert.equal(pid('pryce', 2), 221, 'Pryce: Piloswine 31');
  assert.equal(pid('clair', 3), 230, 'Sandra : Hyporoi (canon)');
  assert.equal(lvl('clair', 3), 40, 'Sandra : Hyporoi 40');
});

test('leagues: 5-step gauntlet, Champion last, localized previews, flattened team', () => {
  // Array.from: rebase the prototype (objects created in the vm otherwise
  // fail strict deepEqual — known harness pitfall).
  assert.deepEqual(Array.from(sb.getOfficialLeagueKeys('kanto')), ['lorelei', 'bruno', 'agatha', 'lance', 'blue'], 'ordre ligue Kanto');
  assert.deepEqual(Array.from(sb.getOfficialLeagueKeys('johto')), ['will', 'koga_e4', 'bruno_johto', 'karen', 'lance_johto'], 'ordre ligue Johto');
  for (const region of ['kanto', 'johto']) {
    const trainers = sb.getLeagueTrainersForRegion(region);
    assert.equal(trainers.length, 5, `${region}: 5 steps`);
    for (const tr of trainers) {
      assert.ok(tr.name && tr.title, `${region}/${tr.id}: localized name + title (FR fallback)`);
      assert.ok(tr.team.length >= 5 && tr.team.every(([id, lv]) => sb.PD[id] && lv >= 1 && lv <= 100), `${region}/${tr.id}: valid [id, level] pairs`);
    }
    const flat = sb.getLeagueFlattenedTeam(region);
    assert.equal(flat.length, trainers.reduce((s, tr) => s + tr.team.length, 0), `${region}: flattened = sum of steps`);
    assert.ok(flat.every((p) => p.maxHP > 0), `${region} : instances jouables (xpYield/maxHP)`);
  }
  // Niveaux canon ligues
  const kanto = sb.getLeagueTrainersForRegion('kanto');
  assert.equal(kanto[3].team[4][1], 60, 'Peter : Dracolosse 60 (RFVF)');
  assert.equal(kanto[2].team[4][1], 58, 'Agatha : Ectoplasma 58 (RFVF)');
  const johto = sb.getLeagueTrainersForRegion('johto');
  assert.equal(johto[4].team[5][1], 50, 'Peter Johto : Dracolosse 50 (OAC)');
  assert.equal(johto[4].team.length, 6, 'Johto Champion: 6 Pokémon');
});

test('Champion Blue: team varies with the player\'s starter (FRLG canon)', () => {
  const cases = [
    { starter: 1, expectedBlueStarter: 6, duo: [103, 130] },   // Bulbasaur player → Charizard
    { starter: 4, expectedBlueStarter: 9, duo: [59, 103] },    // Charmander player → Blastoise
    { starter: 7, expectedBlueStarter: 3, duo: [130, 59] },    // Squirtle player → Venusaur
  ];
  for (const c of cases) {
    const team = sb.getOfficialLeagueTeam('kanto', 4, c.starter);
    assert.equal(team.length, 6, `vs starter ${c.starter} : 6 Pokémon`);
    assert.equal(team[0].id, 18, 'Pidgeot at the head (59)');
    assert.equal(team[0].level, 59, 'Roucarnage niveau 59');
    assert.equal(team[1].id, 65, 'Alakazam 2e (57)');
    assert.equal(team[2].id, 112, 'Rhydon 3rd (59)');
    const ace = team[5];
    assert.equal(ace.id, c.expectedBlueStarter, `Blue's starter = ${c.expectedBlueStarter} (strong against the player)`);
    assert.equal(ace.level, 63, 'starter de Blue niveau 63');
    assert.ok(ace.heldItem, 'starter de Blue porte un type_boost');
    const duoIds = [team[3].id, team[4].id];
    assert.deepEqual(duoIds, c.duo, `duo variable ${c.duo} (59/61)`);
    assert.equal(team[4].level, 61, 'the 5th member is level 61');
  }
  // Without a known starter (old save) → 1st-variant fallback, never empty
  const fallback = sb.getOfficialLeagueTeam('kanto', 4, null);
  assert.equal(fallback.length, 6, 'starterless fallback: complete team');
});

test('i18n: the 10 league steps have name + title in FR and EN', () => {
  const SLOTS = ['lorelei', 'bruno', 'agatha', 'lance', 'blue', 'will', 'koga_e4', 'bruno_johto', 'karen', 'lance_johto'];
  for (const [file, globalName, expected] of [
    ['src/localization/fr/champions.js', 'L_fr_champions', 'Olga'],
    ['src/localization/en/champions.js', 'L_en_champions', 'Lorelei'],
  ]) {
    const box = { window: {} };
    box.window = box;
    vm.createContext(box);
    // T2-D (vague 38) : champions fr/en devenus modules ESM — bundle tolérant.
    const __text = R(file);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([file]) : __text, box, { filename: file });
    const frag = box[globalName];
    assert.ok(frag, `${file}: fragment loaded`);
    for (const slot of SLOTS) {
      assert.ok(frag[slot] && frag[slot].name && frag[slot].title, `${file} : ${slot} nom + titre`);
    }
    assert.equal(frag.lorelei.name, expected, `${file}: translation check Olga/${expected}`);
  }
});

