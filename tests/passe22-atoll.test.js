import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 22 / Étape 6 : refonte de l'Atoll ─────────────────────────────
//  · rotation 12 h à graine déterministe datée (partagée avec les roamers)
//  · 6 équipes par mode et par rang en cycle de 3 jours
//  · descriptions de modes en haut de page (clés i18n FR/EN)
//  · Usine = équipe prêtée : victoire → soin + réorganisation (ordre + attaques)
//  · légendaires JAMAIS bannis de tous les modes à la fois
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const LOADER = R('src/loader.js');

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
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/game/world/team.js', 'src/game/core/pokemon-factory.js',
    'src/data/atoll-sets-data.js', 'src/game/world/atoll-core.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}
const sb = makeSandbox();
const HALF = 12 * 3600 * 1000;
const MODES = ['tower_e','tower_d','tower_c','tower_b','tower_a','tower_s','tower_free','factory_c','factory_a','arena_three','arena_no_item','arena_type','dome_quarter','dome_final'];
const join = (arr) => Array.from(arr).join(',');

test('loader : atoll-sets-data après official-teams-data, atoll-core avant world.js', () => {
  const iOff = LOADER.indexOf('official-teams-data.js');
  const iSets = LOADER.indexOf('atoll-sets-data.js');
  const iCore = LOADER.indexOf('world/atoll-core.js');
  const iWorld = LOADER.indexOf('world/world.js');
  assert.ok(iSets > iOff && iSets > 0, 'atoll-sets-data.js chargé après official-teams-data.js');
  assert.ok(iCore > 0 && iCore < iWorld, 'atoll-core.js chargé avant world.js (roamers partagent la fenêtre)');
});

test('rotation 12 h : fenêtres, temps restant, format du minuteur', () => {
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
  assert.deepEqual([c2.team, c2.day], [6, 3]); // 6e fenêtre = jour 3 du cycle
  const c3 = sb.getAtollCycleInfo(6);
  assert.deepEqual([c3.team, c3.day], [1, 1]); // nouveau cycle après 3 jours
  assert.ok(R('src/game/world/world.js').includes('getRotationWindow'), 'roamers sur la fenêtre partagée');
});

test('determinisme : même fenêtre → même équipe ; équipe n = fenêtre % 6', () => {
  for (const mk of MODES) {
    const a = join(sb.getAtollSpeciesList(mk, 40, 'enemy'));
    const b = join(sb.getAtollSpeciesList(mk, 40, 'enemy'));
    assert.equal(a, b, `${mk} : équipe reproductible à fenêtre fixe`);
    assert.ok(a.length > 0, `${mk} : équipe non vide`);
  }
  // 6 équipes distinctes dans un cycle, graine réamorcée au cycle suivant
  for (const mk of ['tower_c', 'tower_a', 'tower_s', 'factory_a', 'dome_final']) {
    const cyc = sb.getAtollRotationTeams(mk, 40, 'enemy').map(join);
    assert.equal(cyc.length, 6, `${mk} : 6 équipes par cycle`);
    assert.equal(new Set(cyc).size, 6, `${mk} : 6 équipes distinctes dans le cycle`);
    const base = 36; // début de cycle (36 % 6 = 0)
    assert.equal(join(sb.getAtollSpeciesList(mk, base + 6, 'enemy')), join(sb.getAtollSpeciesList(mk, base + 6, 'enemy')));
    assert.notEqual(join(sb.getAtollSpeciesList(mk, base, 'enemy')), join(sb.getAtollSpeciesList(mk, base + 6, 'enemy')), `${mk} : graine datée réamorcée au nouveau cycle`);
  }
});

test('équipes : taille du mode, espèces du pool, pas de doublon', () => {
  for (const mk of MODES) {
    const mode = sb.ATOLL_MODES[mk];
    for (let w = 36; w < 36 + 6; w++) {
      const ids = Array.from(sb.getAtollSpeciesList(mk, w, 'enemy'));
      assert.equal(ids.length, Math.min(mode.size, mode.pool.length), `${mk}@${w} : taille ${mode.size}`);
      assert.equal(new Set(ids).size, ids.length, `${mk}@${w} : doublon interdit`);
      for (const id of ids) assert.ok(mode.pool.includes(id), `${mk}@${w} : espèce ${id} hors pool`);
    }
  }
});

test('bans de légendaires : jamais bannis de tous les modes à la fois', () => {
  const LEGS = Array.from(sb.ATOLL_LEGENDARIES);
  assert.ok(LEGS.length >= 11, 'liste des légendaires connue');
  let seen = new Set();
  for (let w = 36; w < 36 + 48; w++) { // 48 fenêtres = 24 jours
    const ts = Array.from(sb.getAtollBannedLegendaries('tower_s', w));
    const df = Array.from(sb.getAtollBannedLegendaries('dome_final', w));
    const tf = Array.from(sb.getAtollBannedLegendaries('tower_free', w));
    assert.equal(tf.length, 0, 'tower_free : jamais de ban (refuge)');
    assert.equal(ts.length, 4, `tower_s@${w} : 4 bans`);
    assert.equal(df.length, 3, `dome_final@${w} : 3 bans`);
    for (const l of ts.concat(df)) assert.ok(LEGS.includes(l), `ban ${l} ∈ légendaires`);
    // Règle absolue : aucun légendaire banni dans TOUS les modes à la fois
    for (const l of LEGS) {
      const everywhere = ts.includes(l) && df.includes(l) && tf.includes(l);
      assert.ok(!everywhere, `fenêtre ${w} : ${l} banni partout !`);
    }
    // L'équipe adverse ne contient jamais un légendaire banni
    const enemyS = Array.from(sb.getAtollSpeciesList('tower_s', w, 'enemy'));
    for (const l of ts) assert.ok(!enemyS.includes(l), `adversaire tower_s@${w} sans ${l}`);
    seen.add(join(ts));
  }
  assert.ok(seen.size >= 20, `bans variés sur 24 jours (${seen.size}/48 jeux distincts)`);
});

test('sets curated : légitimité totale (pool attaques, talent, objet, budgets)', () => {
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const keys = Object.keys(sb.ATOLL_SETS).map(Number);
  // Couverture exacte : toutes les espèces non E/D ont un set curated
  const lowOnly = new Set(sb.ATOLL_MODES.tower_e.pool.concat(sb.ATOLL_MODES.tower_d.pool));
  const allPools = new Set();
  for (const mk of MODES) sb.ATOLL_MODES[mk].pool.forEach((id) => allPools.add(id));
  for (const id of allPools) {
    if (lowOnly.has(id)) continue;
    assert.ok(sb.ATOLL_SETS[id], `espèce ${id} (rang C+) doit avoir un set curated`);
  }
  assert.equal(keys.length, allPools.size - lowOnly.size, 'couverture 1:1 (64 espèces hors rangs E/D)');
  for (const id of keys) assert.ok(allPools.has(id), `set ${id} présent dans un pool`);
  for (const [idStr, cur] of Object.entries(sb.ATOLL_SETS)) {
    const id = Number(idStr);
    const [talent, item, moves, prof] = cur;
    const label = `atoll#${id}`;
    // attaques : existantes + pool légal (naturel ∪ CT/CS)
    assert.ok(Array.isArray(moves) && moves.length >= 1 && moves.length <= 4, `${label} : 1-4 attaques`);
    const natural = new Set(sb.getSpeciesFullLearnablePool(id) || []);
    const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(id) || {}));
    for (const mv of moves) {
      assert.ok(sb.MOVES[mv], `${label} : attaque ${mv} existe`);
      assert.ok(natural.has(mv) || ctcs.has(mv), `${label} : attaque ${mv} légale`);
    }
    const talents = new Set((sb.getSpeciesTalents(id) || []).map((x) => (x && x.id) || x));
    assert.ok(talents.has(talent), `${label} : talent ${talent} obtenable`);
    if (item) {
      const it = sb.ITEMS[item];
      assert.ok(it && it.type === 'held', `${label} : objet ${item} tenu valide`);
      assert.ok(['type_boost', 'choice'].includes(it.category), `${label} : objet ${item} type_boost/choice (règle économie)`);
    }
    const p = sb.ATOLL_STAT_PROFILES[prof];
    assert.ok(p, `${label} : profil ${prof} connu`);
    // EXCEPTION ENDGAME (passe 23, validée par simulations) : l'Atoll = sommet du
    // jeu → budgets 36/36 (max légal joueur : training 36 EV + hatchery 36 IV).
    assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36, `${label} : budgets IV/EV ≤ 36 (exception endgame atoll)`);
  }
});

test('buildAtollTeam : instanciation conforme et déterministe', () => {
  const team = sb.buildAtollTeam('tower_a', 40);
  assert.equal(team.length, 6);
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  for (const p of team) {
    assert.equal(p.level, 100, 'niveau 100');
    assert.ok(p.moves.length >= 1 && p.moves.length <= 4);
    for (const m of p.moves) assert.ok(sb.MOVES[m.id], `attaque ${m.id} instanciée valide`);
    assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36, 'budgets IV/EV ≤ 36 (exception endgame atoll)');
    const cur = sb.ATOLL_SETS[p.id];
    if (cur && cur[1]) assert.equal(p.heldItem, cur[1], `objet tenu du set (${cur[1]})`);
    if (cur) assert.equal(p.talent, cur[0], 'talent du set');
    assert.equal(p.currentHP, p.maxHP, 'full PV au départ');
  }
  const again = sb.buildAtollTeam('tower_a', 40).map((p) => `${p.id}:${p.moves.map((m) => m.id)}`);
  assert.equal(join(team.map((p) => `${p.id}:${p.moves.map((m) => m.id)}`)), join(again), 'équipe datée reproductible à l\'identique');
});

test('repli rangs E/D : sets générés légaux, déterministes, sans objet', () => {
  for (const mk of ['tower_e', 'tower_d']) {
    const team = sb.buildAtollTeam(mk, 41);
    assert.ok(team.length >= 4, `${mk} : équipe complète`);
    const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
    for (const p of team) {
      const legal = new Set(sb.getSpeciesFullLearnablePool(p.id) || []);
      Object.keys(sb.getCtCsMoveIds(p.id) || {}).forEach((m) => legal.add(m));
      for (const m of p.moves) assert.ok(legal.has(m.id), `${mk} #${p.id} : ${m.id} légal`);
      assert.ok(p.moves.length >= 1, 'au moins une attaque');
      assert.ok(!p.heldItem, 'pas d\'objet en rang faible');
      assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36); // exception endgame atoll (≤ 36, pas 18)
    }
    assert.equal(join(team.map((p) => p.id)), join(sb.buildAtollTeam(mk, 41).map((p) => p.id)), `${mk} : reproductible`);
  }
});

test('usine : cycle de vie de la série prêtée (création, palier, abandon)', () => {
  sb.G.atoll = null;
  const run = sb.createAtollFactoryRun('factory_c', 40);
  assert.equal(run.modeKey, 'factory_c');
  assert.equal(run.streak, 0);
  assert.equal(run.team.length, sb.ATOLL_MODES.factory_c.size, 'équipe prêtée complète');
  assert.equal(run.team.map((p) => p.id).join(','), sb.buildAtollTeam('factory_c', 40, 'rental').map((p) => p.id).join(','), 'prêt = table de rotation « rental »');
  assert.equal(sb.getAtollFactoryRun(), run, 'série persistée dans G.atoll');
  assert.equal(sb.getAtollFactoryOpponentWindow(run, 40), 40, 'palier 0 : rotation courante');
  run.streak = 3;
  assert.equal(sb.getAtollFactoryOpponentWindow(run, 40), 43, 'palier 3 : 4e équipe de rotation');
  sb.abandonAtollFactoryRun();
  assert.equal(sb.getAtollFactoryRun(), null, 'abandon : série effacée');
});

test('usine : victoire → soin complet + réorganisation imposée (ordre ET attaques)', () => {
  sb.G.atoll = null;
  const run = sb.createAtollFactoryRun('factory_a', 40);
  const rental = run.team.map((p) => JSON.parse(JSON.stringify(p)));
  rental[0].currentHP = 1;
  rental[1].status = 'brn';
  const snapshot = JSON.stringify(rental.map((p) => [p.id, p.moves.map((m) => m.id)]));
  const out = sb.applyAtollFactoryVictory(rental);
  assert.ok(out, 'série retrouvée');
  assert.equal(out.streak, 1);
  assert.equal(out.team.length, 5);
  // Soin complet
  for (const p of out.team) { assert.equal(p.currentHP, p.maxHP, 'PV restaurés'); assert.equal(p.status, null, 'statut soigné'); }
  // Réorganisation GARANTIE visible : ordre des Pokémon ou des attaques a changé
  assert.notEqual(JSON.stringify(out.team.map((p) => [p.id, p.moves.map((m) => m.id)])), snapshot, 'réorganisation effective');
  // Multis ensembles préservés (permutation pure)
  const beforeIds = rental.map((p) => p.id).sort((a, b) => a - b).join(',');
  assert.equal(out.team.map((p) => p.id).sort((a, b) => a - b).join(','), beforeIds, 'espèces préservées');
  for (const p of out.team) {
    const src = rental.find((q) => q.id === p.id);
    assert.equal((p.moves || []).map((m) => m.id).sort().join(','), (src.moves || []).map((m) => m.id).sort().join(','), `attaques de #${p.id} préservées`);
  }
  // Déterminisme de la réorganisation : même fenêtre de départ + même palier
  // → même réorganisation (nouvelle série fraîche identique par construction)
  sb.G.atoll = null;
  const fresh = sb.createAtollFactoryRun('factory_a', 40);
  const out2 = sb.applyAtollFactoryVictory(fresh.team.map((p) => JSON.parse(JSON.stringify(p))));
  const sigOf = (t2) => JSON.stringify(t2.map((p) => [p.id, (p.moves || []).map((m) => m.id)]));
  assert.equal(sigOf(out2.team), sigOf(out.team), 'réorg reproductible (graine datée × série)');
});

test('usine : prime par palier plafonnée (+25 %, arrondie, sans impact ₽)', () => {
  assert.equal(sb.computeAtollFactoryReward(22, 0), 22);
  assert.equal(sb.computeAtollFactoryReward(22, 1), 28); // 27.5 → 28
  assert.equal(sb.computeAtollFactoryReward(22, 2), 33);
  assert.equal(sb.computeAtollFactoryReward(42, 4), 84); // ×2 au palier 4
});

test('anti-identité : la réorganisation n\'est jamais un non-événement', () => {
  // Cas minimal : 2 Pokémon × 2 attaques — le pire cas pour un mélange
  for (let streak = 1; streak <= 40; streak++) {
    const mk = (i) => ({ id: 65 + i, level: 100, moves: [{ id: 'psychic' }, { id: 'calm_mind' }], currentHP: 50, maxHP: 100 });
    const team = [mk(0), mk(1)];
    const before = JSON.stringify(team.map((p) => [p.id, p.moves.map((m) => m.id)]));
    const out = sb.reorganizeAtollFactoryTeam(team, 7, streak);
    assert.notEqual(JSON.stringify(out.map((p) => [p.id, p.moves.map((m) => m.id)])), before, `série ${streak} : changement garanti`);
  }
});

test('ensureAtollState : état par défaut + préservation de la série', () => {
  sb.G.atoll = null;
  const st = sb.ensureAtollState();
  assert.equal(sb.G.atoll, st);
  assert.deepEqual([st.tokens, st.streak, st.bestStreak], [0, 0, 0]);
  assert.ok(st.winsByMode && typeof st.winsByMode === 'object');
  st.factoryRun = { modeKey: 'factory_c', seedWindow: 40, streak: 2, team: [] };
  const st2 = sb.ensureAtollState();
  assert.equal(st2.factoryRun.streak, 2, 'série Usine conservée');
});

test('i18n : clés passe 22 présentes en FR et EN avec placeholders cohérents', () => {
  const fr = R('src/localization/fr/ui.js');
  const en = R('src/localization/en/ui.js');
  const keys = ['atoll_rotation_timer', 'atoll_cycle_info', 'atoll_banned_row', 'atoll_banned_blocked',
    'atoll_ban_free_note', 'atoll_enemy_preview', 'atoll_rental_preview', 'atoll_mode_rule_factory',
    'atoll_factory_continue', 'atoll_factory_run_title', 'atoll_factory_run_streak', 'atoll_factory_reorg_hint',
    'atoll_factory_abandon', 'atoll_factory_reorg_notice', 'atoll_factory_wrong_mode', 'atoll_factory_broken',
    'atoll_factory_run_ended', 'roaming_rotation_timer'];
  for (const k of keys) {
    assert.ok(fr.includes(`"${k}":`), `FR : clé ${k}`);
    assert.ok(en.includes(`"${k}":`), `EN : clé ${k}`);
  }
  for (const k of ['atoll_rotation_timer', 'roaming_rotation_timer']) { assert.ok(fr.includes(`"${k}":"`) && fr.match(new RegExp(`"${k}":"[^"]*\\{time\\}`)), `FR ${k} : {time}`); assert.ok(en.match(new RegExp(`"${k}":"[^"]*\\{time\\}`)), `EN ${k} : {time}`); }
  assert.ok(fr.match(/"atoll_cycle_info":"[^"]*\{n\}[^"]*\{total\}[^"]*\{day\}[^"]*\{days\}/), 'FR cycle : {n}{total}{day}{days}');
  assert.ok(en.match(/"atoll_cycle_info":"[^"]*\{n\}[^"]*\{total\}[^"]*\{day\}[^"]*\{days\}/), 'EN cycle : placeholders');
  for (const lang of [fr, en]) { assert.ok(lang.match(/"atoll_factory_run_streak":"[^"]*\{streak\}[^"]*\{mode\}/), 'streak : {streak}{mode}'); assert.ok(lang.match(/"atoll_banned_blocked":"[^"]*\{pokemon\}/), 'ban : {pokemon}'); }
});

test('UI : descriptions de modes en haut de page + minuteur atoll & roamers', () => {
  const panel = R('src/game/display/fullscreen-panel.js');
  assert.ok(panel.includes('atoll_group') || panel.includes("atoll_'+group+'_desc"), 'descriptions de groupe rendues en haut d\'onglet');
  assert.ok(panel.includes('data-rotation-timer="atoll"'), 'minuteur dans le menu atoll');
  assert.ok(panel.includes('getRotationTimeLeftMs'), 'minuteur alimenté par la rotation');
  const loc = R('src/game/display/location-info.js');
  assert.ok(loc.includes('data-rotation-timer="roam"'), 'minuteur sur les routes roamers');
  assert.ok(loc.includes('startRotationTicker'), 'ticker démarré depuis les routes');
});
