import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phase 22 / Step 6: Atoll overhaul ─────────────────────────────────────
//  · 12 h rotation on a dated deterministic seed (shared with the roamers)
//  · 6 teams per mode and per rank on a 3-day cycle
//  · mode descriptions at the top of the page (FR/EN i18n keys)
//  · Factory = borrowed team: victory → heal + reorganization (order + moves)
//  · legendaries NEVER banned from all modes at once
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const LOADER = R('src/main.js');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr' },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k, o) => k, getPokeName: (id) => 'P' + id, getMoveName: (id) => id,
    notify: () => {}, saveGame: () => {}, setMsg: () => {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/application/world/team.js', 'src/application/pokemon-factory.js',
    'src/data/atoll-sets-data.js', 'src/application/world/atoll-core.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}
const sb = makeSandbox();
const HALF = 12 * 3600 * 1000;
const MODES = ['tower_e','tower_d','tower_c','tower_b','tower_a','tower_s','tower_free','factory_c','factory_a','arena_three','arena_no_item','arena_type','dome_quarter','dome_final'];
const join = (arr) => Array.from(arr).join(',');

test('loader: atoll-sets-data after official-teams-data, atoll-core before world.js', () => {
  const iOff = LOADER.indexOf('official-teams-data.js');
  const iSets = LOADER.indexOf('atoll-sets-data.js');
  const iCore = LOADER.indexOf('world/atoll-core.js');
  const iWorld = LOADER.indexOf('world/roaming.js'); // world.js split → application/world/roaming.js (wave 33)
  assert.ok(iSets > iOff && iSets > 0, 'atoll-sets-data.js loaded after official-teams-data.js');
  assert.ok(iCore > 0 && iCore < iWorld, 'atoll-core.js loaded before world.js (roamers share the window)');
});

test('12 h rotation: windows, remaining time, timer format', () => {
  assert.equal(sb.getRotationWindow(0), 0);
  assert.equal(sb.getRotationWindow(HALF - 1), 0);
  assert.equal(sb.getRotationWindow(HALF), 1);
  assert.equal(sb.getRotationWindow(123 * HALF + 7), 123);
  assert.equal(sb.getRotationTimeLeftMs(5 * HALF), HALF);
  assert.equal(sb.getRotationTimeLeftMs(5 * HALF + 3600_000), HALF - 3600_000);
  assert.equal(sb.formatRotationCountdown(HALF), '12:00:00');
  assert.equal(sb.formatRotationCountdown(3 * 3600_000 + 5 * 60_000 + 7000), '03:05:07');
  const c1 = sb.getAtollCycleInfo(0);
  assert.deepEqual([c1.team, c1.day], [1, 1]);
  const c2 = sb.getAtollCycleInfo(5);
  assert.deepEqual([c2.team, c2.day], [6, 3]); // 6th window = day 3 of the cycle
  const c3 = sb.getAtollCycleInfo(6);
  assert.deepEqual([c3.team, c3.day], [1, 1]); // new cycle after 3 days
  // roaming rule moved to the application layer (wave 33)
  assert.ok(R('src/application/world/roaming.js').includes('getRotationWindow'), 'roamers on the shared window');
});

test('determinism: same window → same team; team n = window % 6', () => {
  for (const mk of MODES) {
    const a = join(sb.getAtollSpeciesList(mk, 40, 'enemy'));
    const b = join(sb.getAtollSpeciesList(mk, 40, 'enemy'));
    assert.equal(a, b, `${mk}: reproducible team at fixed window`);
    assert.ok(a.length > 0, `${mk}: non-empty team`);
  }
  // 6 distinct teams in a cycle, seed re-primed on the next cycle
  for (const mk of ['tower_c', 'tower_a', 'tower_s', 'factory_a', 'dome_final']) {
    const cyc = sb.getAtollRotationTeams(mk, 40, 'enemy').map(join);
    assert.equal(cyc.length, 6, `${mk}: 6 teams per cycle`);
    assert.equal(new Set(cyc).size, 6, `${mk}: 6 distinct teams in the cycle`);
    const base = 36; // cycle start (36 % 6 = 0)
    assert.equal(join(sb.getAtollSpeciesList(mk, base + 6, 'enemy')), join(sb.getAtollSpeciesList(mk, base + 6, 'enemy')));
    assert.notEqual(join(sb.getAtollSpeciesList(mk, base, 'enemy')), join(sb.getAtollSpeciesList(mk, base + 6, 'enemy')), `${mk}: dated seed re-armed on the new cycle`);
  }
});

test('teams: mode size, pool species, no duplicates', () => {
  for (const mk of MODES) {
    const mode = sb.ATOLL_MODES[mk];
    for (let w = 36; w < 36 + 6; w++) {
      const ids = Array.from(sb.getAtollSpeciesList(mk, w, 'enemy'));
      assert.equal(ids.length, Math.min(mode.size, mode.pool.length), `${mk}@${w} : taille ${mode.size}`);
      assert.equal(new Set(ids).size, ids.length, `${mk}@${w}: duplicates forbidden`);
      for (const id of ids) assert.ok(mode.pool.includes(id), `${mk}@${w}: species ${id} outside pool`);
    }
  }
});

test('legendary bans: never banned from all modes at once', () => {
  const LEGS = Array.from(sb.ATOLL_LEGENDARIES);
  assert.ok(LEGS.length >= 11, 'legendary list known');
  let seen = new Set();
  for (let w = 36; w < 36 + 48; w++) { // 48 windows = 24 days
    const ts = Array.from(sb.getAtollBannedLegendaries('tower_s', w));
    const df = Array.from(sb.getAtollBannedLegendaries('dome_final', w));
    const tf = Array.from(sb.getAtollBannedLegendaries('tower_free', w));
    assert.equal(tf.length, 0, 'tower_free: never a ban (refuge)');
    assert.equal(ts.length, 4, `tower_s@${w} : 4 bans`);
    assert.equal(df.length, 3, `dome_final@${w} : 3 bans`);
    for (const l of ts.concat(df)) assert.ok(LEGS.includes(l), `ban ${l} ∈ legendaries`);
    // Absolute rule: no legendary banned in ALL modes at once
    for (const l of LEGS) {
      const everywhere = ts.includes(l) && df.includes(l) && tf.includes(l);
      assert.ok(!everywhere, `window ${w}: ${l} banned everywhere!`);
    }
    // The opposing team never contains a banned legendary
    const enemyS = Array.from(sb.getAtollSpeciesList('tower_s', w, 'enemy'));
    for (const l of ts) assert.ok(!enemyS.includes(l), `tower_s@${w} opponent without ${l}`);
    seen.add(join(ts));
  }
  assert.ok(seen.size >= 20, `varied bans over 24 days (${seen.size}/48 distinct games)`);
});

test('curated sets: full legitimacy (move pool, ability, item, budgets)', () => {
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const keys = Object.keys(sb.ATOLL_SETS).map(Number);
  // Exact coverage: every non-E/D species has a curated set
  const lowOnly = new Set(sb.ATOLL_MODES.tower_e.pool.concat(sb.ATOLL_MODES.tower_d.pool));
  const allPools = new Set();
  for (const mk of MODES) sb.ATOLL_MODES[mk].pool.forEach((id) => allPools.add(id));
  for (const id of allPools) {
    if (lowOnly.has(id)) continue;
    assert.ok(sb.ATOLL_SETS[id], `species ${id} (rank C+) must have a curated set`);
  }
  assert.equal(keys.length, allPools.size - lowOnly.size, '1:1 coverage (64 species outside E/D ranks)');
  for (const id of keys) assert.ok(allPools.has(id), `set ${id} present in a pool`);
  for (const [idStr, cur] of Object.entries(sb.ATOLL_SETS)) {
    const id = Number(idStr);
    const [talent, item, moves, prof] = cur;
    const label = `atoll#${id}`;
    // moves: existing + legal pool (natural ∪ TM/HM)
    assert.ok(Array.isArray(moves) && moves.length >= 1 && moves.length <= 4, `${label}: 1-4 moves`);
    const natural = new Set(sb.getSpeciesFullLearnablePool(id) || []);
    const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(id) || {}));
    for (const mv of moves) {
      assert.ok(sb.MOVES[mv], `${label}: move ${mv} exists`);
      assert.ok(natural.has(mv) || ctcs.has(mv), `${label}: move ${mv} legal`);
    }
    const talents = new Set((sb.getSpeciesTalents(id) || []).map((x) => (x && x.id) || x));
    assert.ok(talents.has(talent), `${label}: ability ${talent} obtainable`);
    if (item) {
      const it = sb.ITEMS[item];
      assert.ok(it && it.type === 'held', `${label}: held item ${item} valid`);
      assert.ok(['type_boost', 'choice'].includes(it.category), `${label}: item ${item} type_boost/choice (economy rule)`);
    }
    const p = sb.ATOLL_STAT_PROFILES[prof];
    assert.ok(p, `${label} : profil ${prof} connu`);
    // ENDGAME EXCEPTION (phase 23, validated by simulations): the Atoll = top of
    // the game → 36/36 budgets (player legal max: training 36 EV + hatchery 36 IV).
    assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36, `${label} : budgets IV/EV ≤ 36 (exception endgame atoll)`);
  }
});

test('buildAtollTeam: compliant and deterministic instantiation', () => {
  const team = sb.buildAtollTeam('tower_a', 40);
  assert.equal(team.length, 6);
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  for (const p of team) {
    assert.equal(p.level, 100, 'niveau 100');
    assert.ok(p.moves.length >= 1 && p.moves.length <= 4);
    for (const m of p.moves) assert.ok(sb.MOVES[m.id], `move ${m.id} instantiated valid`);
    assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36, 'budgets IV/EV ≤ 36 (exception endgame atoll)');
    const cur = sb.ATOLL_SETS[p.id];
    if (cur && cur[1]) assert.equal(p.heldItem, cur[1], `set's held item (${cur[1]})`);
    if (cur) assert.equal(p.talent, cur[0], 'set ability');
    assert.equal(p.currentHP, p.maxHP, 'full HP at start');
  }
  const again = sb.buildAtollTeam('tower_a', 40).map((p) => `${p.id}:${p.moves.map((m) => m.id)}`);
  assert.equal(join(team.map((p) => `${p.id}:${p.moves.map((m) => m.id)}`)), join(again), 'dated team reproducible identically');
});

test('E/D rank fallback: legal generated sets, deterministic, no item', () => {
  for (const mk of ['tower_e', 'tower_d']) {
    const team = sb.buildAtollTeam(mk, 41);
    assert.ok(team.length >= 4, `${mk}: complete team`);
    const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
    for (const p of team) {
      const legal = new Set(sb.getSpeciesFullLearnablePool(p.id) || []);
      Object.keys(sb.getCtCsMoveIds(p.id) || {}).forEach((m) => legal.add(m));
      for (const m of p.moves) assert.ok(legal.has(m.id), `${mk} #${p.id}: ${m.id} legal`);
      assert.ok(p.moves.length >= 1, 'at least one move');
      assert.ok(!p.heldItem, 'no item in low rank');
      assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36); // atoll endgame exception (≤ 36, not 18)
    }
    assert.equal(join(team.map((p) => p.id)), join(sb.buildAtollTeam(mk, 41).map((p) => p.id)), `${mk}: reproducible`);
  }
});

test('factory: lifecycle of the loaned streak (creation, tier, forfeit)', () => {
  sb.G.atoll = null;
  const run = sb.createAtollFactoryRun('factory_c', 40);
  assert.equal(run.modeKey, 'factory_c');
  assert.equal(run.streak, 0);
  assert.equal(run.team.length, sb.ATOLL_MODES.factory_c.size, 'complete loaned team');
  assert.equal(run.team.map((p) => p.id).join(','), sb.buildAtollTeam('factory_c', 40, 'rental').map((p) => p.id).join(','), 'rental = "rental" rotation table');
  assert.equal(sb.getAtollFactoryRun(), run, 'streak persisted in G.atoll');
  assert.equal(sb.getAtollFactoryOpponentWindow(run, 40), 40, 'palier 0 : rotation courante');
  run.streak = 3;
  assert.equal(sb.getAtollFactoryOpponentWindow(run, 40), 43, 'tier 3: 4th rotation team');
  sb.abandonAtollFactoryRun();
  assert.equal(sb.getAtollFactoryRun(), null, 'forfeit: streak erased');
});

test('factory: victory → full heal + forced reorganization (order AND moves)', () => {
  sb.G.atoll = null;
  const run = sb.createAtollFactoryRun('factory_a', 40);
  const rental = run.team.map((p) => JSON.parse(JSON.stringify(p)));
  rental[0].currentHP = 1;
  rental[1].status = 'brn';
  const snapshot = JSON.stringify(rental.map((p) => [p.id, p.moves.map((m) => m.id)]));
  const out = sb.applyAtollFactoryVictory(rental);
  assert.ok(out, 'streak found');
  assert.equal(out.streak, 1);
  assert.equal(out.team.length, 5);
  // Soin complet
  for (const p of out.team) { assert.equal(p.currentHP, p.maxHP, 'HP restored'); assert.equal(p.status, null, 'status healed'); }
  // Reorganization GUARANTEED visible: Pokémon or move order changed
  assert.notEqual(JSON.stringify(out.team.map((p) => [p.id, p.moves.map((m) => m.id)])), snapshot, 'effective reorganization');
  // Multisets preserved (pure permutation)
  const beforeIds = rental.map((p) => p.id).sort((a, b) => a - b).join(',');
  assert.equal(out.team.map((p) => p.id).sort((a, b) => a - b).join(','), beforeIds, 'species preserved');
  for (const p of out.team) {
    const src = rental.find((q) => q.id === p.id);
    assert.equal((p.moves || []).map((m) => m.id).sort().join(','), (src.moves || []).map((m) => m.id).sort().join(','), `#${p.id}'s moves preserved`);
  }
  // Reorganization determinism: same starting window + same tier
  // → same reorganization (new fresh streak identical by construction)
  sb.G.atoll = null;
  const fresh = sb.createAtollFactoryRun('factory_a', 40);
  const out2 = sb.applyAtollFactoryVictory(fresh.team.map((p) => JSON.parse(JSON.stringify(p))));
  const sigOf = (t2) => JSON.stringify(t2.map((p) => [p.id, (p.moves || []).map((m) => m.id)]));
  assert.equal(sigOf(out2.team), sigOf(out.team), 'reproducible reorg (dated seed × streak)');
});

test('factory: tier bonus capped (+25%, rounded, no ₽ impact)', () => {
  assert.equal(sb.computeAtollFactoryReward(22, 0), 22);
  assert.equal(sb.computeAtollFactoryReward(22, 1), 28); // 27.5 → 28
  assert.equal(sb.computeAtollFactoryReward(22, 2), 33);
  assert.equal(sb.computeAtollFactoryReward(42, 4), 84); // ×2 au palier 4
});

test('anti-identity: the reorganization is never a non-event', () => {
  // Minimal case: 2 Pokémon × 2 moves — the worst case for a shuffle
  for (let streak = 1; streak <= 40; streak++) {
    const mk = (i) => ({ id: 65 + i, level: 100, moves: [{ id: 'psychic' }, { id: 'calm_mind' }], currentHP: 50, maxHP: 100 });
    const team = [mk(0), mk(1)];
    const before = JSON.stringify(team.map((p) => [p.id, p.moves.map((m) => m.id)]));
    const out = sb.reorganizeAtollFactoryTeam(team, 7, streak);
    assert.notEqual(JSON.stringify(out.map((p) => [p.id, p.moves.map((m) => m.id)])), before, `streak ${streak}: guaranteed change`);
  }
});

test('ensureAtollState: default state + streak preservation', () => {
  sb.G.atoll = null;
  const st = sb.ensureAtollState();
  assert.equal(sb.G.atoll, st);
  assert.deepEqual([st.tokens, st.streak, st.bestStreak], [0, 0, 0]);
  assert.ok(st.winsByMode && typeof st.winsByMode === 'object');
  st.factoryRun = { modeKey: 'factory_c', seedWindow: 40, streak: 2, team: [] };
  const st2 = sb.ensureAtollState();
  assert.equal(st2.factoryRun.streak, 2, 'Factory streak kept');
});

test('i18n: phase 22 keys present in FR and EN with coherent placeholders', () => {
  const fr = R('src/localization/fr/ui.js');
  const en = R('src/localization/en/ui.js');
  const keys = ['atoll_rotation_timer', 'atoll_cycle_info', 'atoll_banned_row', 'atoll_banned_blocked',
    'atoll_ban_free_note', 'atoll_enemy_preview', 'atoll_rental_preview', 'atoll_mode_rule_factory',
    'atoll_factory_continue', 'atoll_factory_run_title', 'atoll_factory_run_streak', 'atoll_factory_reorg_hint',
    'atoll_factory_abandon', 'atoll_factory_reorg_notice', 'atoll_factory_wrong_mode', 'atoll_factory_broken',
    'atoll_factory_run_ended', 'roaming_rotation_timer'];
  for (const k of keys) {
    assert.ok(fr.includes(`"${k}":`), `FR: key ${k}`);
    assert.ok(en.includes(`"${k}":`), `EN: key ${k}`);
  }
  for (const k of ['atoll_rotation_timer', 'roaming_rotation_timer']) { assert.ok(fr.includes(`"${k}":"`) && fr.match(new RegExp(`"${k}":"[^"]*\\{time\\}`)), `FR ${k} : {time}`); assert.ok(en.match(new RegExp(`"${k}":"[^"]*\\{time\\}`)), `EN ${k} : {time}`); }
  assert.ok(fr.match(/"atoll_cycle_info":"[^"]*\{n\}[^"]*\{total\}[^"]*\{day\}[^"]*\{days\}/), 'FR cycle : {n}{total}{day}{days}');
  assert.ok(en.match(/"atoll_cycle_info":"[^"]*\{n\}[^"]*\{total\}[^"]*\{day\}[^"]*\{days\}/), 'EN cycle : placeholders');
  for (const lang of [fr, en]) { assert.ok(lang.match(/"atoll_factory_run_streak":"[^"]*\{streak\}[^"]*\{mode\}/), 'streak : {streak}{mode}'); assert.ok(lang.match(/"atoll_banned_blocked":"[^"]*\{pokemon\}/), 'ban : {pokemon}'); }
});

test('UI: mode descriptions at the top of the page + atoll & roamer timers', () => {
  const panel = R('src/ui/game/fullscreen-panel.js');
  // Wave 13 (legitimate move): the Atoll tree is rebuilt by the ECS DS —
  // the adapter still localizes the per-tab group description…
  assert.ok(panel.includes("model.tab + '_desc'"), 'group descriptions rendered at the top of the tab');
  // …and the timer span contract is now emitted by the DS component
  // (rendered attribute asserted by the Atoll probe).
  const atollComp = R('src/ui/components/atoll.js');
  assert.ok(atollComp.includes("rotationTimer: 'atoll'"), 'timer in the atoll menu');
  assert.ok(panel.includes('getRotationTimeLeftMs'), 'timer fed by the rotation');
  const loc = R('src/ui/game/location-info.js');
  assert.ok(loc.includes("timerKind: 'roam'"), 'timer on the roamer routes');
  assert.ok(loc.includes('startRotationTicker'), 'ticker started from the routes');
});

