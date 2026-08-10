import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Big "Official Trainers" project — Step 1: foundation + validator ───
// Every OFFICIAL_TEAMS team must be LEGITIMATE: species/level/moves
// (legal pool = natural learnset ∪ TM/HM), ability obtainable by the
// player, existing held item, IV/EV budgets ≤ 18 total each (half
// of max 36, rule validated with the user).
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const LOADER = R('src/main.js');
const OFFICIAL = R('src/data/official-teams-data.js');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr' },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k) => k, getPokeName: (id) => 'P' + id,
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
    'src/application/world/team.js', 'src/application/pokemon-factory.js', 'src/data/official-teams-data.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}

const sb = makeSandbox();
const teams = sb.OFFICIAL_TEAMS;
const MAX_IV_EV_TOTAL = 18; // half of 36, user rule

test('base: file loaded by the loader after champions-data', () => {
  const iChamp = LOADER.indexOf('champions-data.js');
  const iOff = LOADER.indexOf('official-teams-data.js');
  assert.ok(iChamp > 0 && iOff > iChamp, 'official-teams-data.js loaded after champions-data.js');
  assert.ok(teams && typeof teams === 'object', 'OFFICIAL_TEAMS exposed');
  assert.ok(teams.brock && teams.misty, 'Brock & Misty pilots present');
});

test('structure: each entry has a valid id/kind/region/team', () => {
  for (const [key, entry] of Object.entries(teams)) {
    assert.equal(entry.id, key, `${key}: coherent id`);
    assert.ok(['gym', 'rival', 'team_enemy', 'league', 'atoll', 'quest', 'boss'].includes(entry.kind), `${key} : kind connu`);
    assert.ok(['kanto', 'johto'].includes(entry.region), `${key}: known region`);
    if (entry.variantsByStarter) {
      // Rival variant according to the player's starter (FRLG/GSC canon)
      const ks = Object.keys(entry.variantsByStarter);
      assert.ok(ks.length >= 2, `${key} : ≥ 2 variantes de starter`);
      for (const v of ks) assert.ok(Array.isArray(entry.variantsByStarter[v]) && entry.variantsByStarter[v].length >= 1 && entry.variantsByStarter[v].length <= 6, `${key}#${v}: team size 1-6`);
    } else {
      assert.ok(Array.isArray(entry.team) && entry.team.length >= 1 && entry.team.length <= 6, `${key}: team size 1-6`);
    }
  }
});

// Iterates every spec of every entry, including every starter variant.
function eachSpec(cb) {
  for (const [key, entry] of Object.entries(teams)) {
    if (entry.variantsByStarter) {
      for (const [starterId, list] of Object.entries(entry.variantsByStarter)) {
        for (const spec of list) cb(key, spec, `vs starter #${starterId}`);
      }
    } else {
      for (const spec of entry.team) cb(key, spec, '');
    }
  }
}

test('legitimacy: species, levels, moves, abilities, items, IV/EV budgets', () => {
  eachSpec((key, spec, variant) => {
      const label = `${key}${variant ? '[' + variant + ']' : ''}#${spec.id}N${spec.level}`;
      // Species + level
      assert.ok(sb.PD[spec.id], `${label}: known species`);
      assert.ok(spec.level >= 1 && spec.level <= 100, `${label}: level 1-100`);
      // Moves: ≤ 4, valid ids AND legal pool (natural ∪ TM/HM)
      assert.ok(Array.isArray(spec.moves) && spec.moves.length >= 1 && spec.moves.length <= 4, `${label}: 1-4 moves`);
      const natural = new Set(sb.getSpeciesFullLearnablePool(spec.id) || []);
      const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(spec.id) || {}));
      for (const mv of spec.moves) {
        assert.ok(sb.MOVES[mv], `${label}: move ${mv} exists in MOVES`);
        assert.ok(natural.has(mv) || ctcs.has(mv), `${label}: move ${mv} legal (natural/TM/HM)`);
      }
      // Ability obtainable by the player (game's real pool)
      const allowedTalents = new Set((sb.getSpeciesTalents(spec.id) || []).map((x) => x.id || x));
      assert.ok(allowedTalents.has(spec.talent), `${label}: ability ${spec.talent} obtainable by the player`);
      // Held item: existing and equipable (equipItemOn rule)
      if (spec.item != null) {
        const it = sb.ITEMS[spec.item];
        assert.ok(it, `${label}: item ${spec.item} exists`);
        assert.ok(it.type === 'held' || it.buff, `${label}: item ${spec.item} equippable`);
      }
      // IV/EV budgets: total ≤ 18 EACH (half-max rule), values 0..18
      const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
      assert.ok(sum(spec.ivs) <= MAX_IV_EV_TOTAL, `${label} : total IV ${sum(spec.ivs)} ≤ ${MAX_IV_EV_TOTAL}`);
      assert.ok(sum(spec.evs) <= MAX_IV_EV_TOTAL, `${label} : total EV ${sum(spec.evs)} ≤ ${MAX_IV_EV_TOTAL}`);
      for (const v of Object.values(spec.ivs || {})) assert.ok(v >= 0 && v <= MAX_IV_EV_TOTAL, `${label}: IV per stat 0..${MAX_IV_EV_TOTAL}`);
      for (const v of Object.values(spec.evs || {})) assert.ok(v >= 0 && v <= MAX_IV_EV_TOTAL, `${label}: EV per stat 0..${MAX_IV_EV_TOTAL}`);
  });
});

test('instantiation: buildOfficialTeamPoke produces conforming playable Pokémon', () => {
  const team = sb.getOfficialTeam('brock');
  assert.ok(Array.isArray(team) && team.length === 2, 'Brock team instantiated (2 Pokémon)');
  const [geo, onix] = team;
  assert.equal(geo.level, 12, 'Racaillou niveau officiel');
  assert.equal(onix.level, 14, 'Onix niveau officiel');
  // Filtered move = spec (all valid → 1:1)
  assert.equal(geo.moves.length, 3, 'Geodude < 4 moves accepted (adventure start)');
  assert.deepEqual([...onix.moves.map((m) => m.id)], ['tackle', 'rock_throw', 'rock_tomb', 'dig'], 'moveset Onix conforme');
  assert.equal(onix.heldItem, 'hard_stone', 'held item applied');
  // Stat recalc applied: Onix lvl 14 + EV def 18 > Geodude lvl 12, no surprise
  assert.ok(onix.maxHP > 0 && onix.def > 0, 'stats recomputed');
  assert.equal(sb.getOfficialTeam('unknown'), null, 'unknown key → null');
  // Misty: Mystic Water held item
  const starmie = sb.getOfficialTeam('misty')[1];
  assert.equal(starmie.heldItem, 'mystic_water', 'Starmie held item');
});

test('engine audit (phase 17 audit): enemy items and abilities are neutral on the side', () => {
  // getHeldBuff works for a Pokémon OUTSIDE the team (enemy case)
  const misty = sb.getOfficialTeam('misty');
  const starmie = misty[1];
  const buff = sb.getHeldBuff(starmie);
  assert.ok(buff.atk > 0 && buff.spa > 0, 'Mystic Water → buffs active for an enemy Pokémon');
  const geo = sb.getOfficialTeam('brock')[0];
  assert.equal(sb.getHeldBuff(geo).atk, 0, 'no item → no buff');
});

test('quest teams (step 2): rival variants resolved via getOfficialTeam', () => {
  // Kanto rival: each player starter yields a complete team, and
  // whose last Pokémon is indeed the starter STRONG against the player.
  const STRONG_AGAINST = { '1': [4, 5, 6], '4': [7, 8, 9], '7': [1, 2, 3] };
  for (const starterId of ['1', '4', '7']) {
    const team = sb.getOfficialTeam('kanto_rival_silph', Number(starterId));
    assert.equal(team.length, 5, `silph vs ${starterId} : 5 Pokémon`);
    const ace = team[team.length - 1];
    assert.ok(STRONG_AGAINST[starterId].includes(ace.id), `silph vs ${starterId}: ace = strong starter (#${ace.id})`);
    assert.ok(ace.heldItem, `silph vs ${starterId}: the ace holds an item (${ace.heldItem})`);
    assert.ok(ace.moves.length >= 3, 'ace has ≥ 3 moves at the end of the arc');
  }
  // Johto rival: the first duel opposes ONLY the stolen starter.
  const first = sb.getOfficialTeam('johto_rival_cherrygrove', 155);
  assert.equal(first.length, 1, 'first Silver duel = starter only');
  assert.equal(first[0].id, 158, 'vs Cyndaquil → Silver has Totodile');
});

test('documented non-regression: no compact legacy move id (step 2)', () => {
  // Done in step 2 (phase 18): neither the official base nor the quest
  // teams use compact ids — everything is snake_case, validated above.
  eachSpec((key, spec) => {
    for (const mv of spec.moves) assert.ok(sb.MOVES[mv], `${key}: move ${mv} valid (no compact legacy id)`);
  });
});

