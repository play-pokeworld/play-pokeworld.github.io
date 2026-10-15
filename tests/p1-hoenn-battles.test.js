import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── V7 · P1 — HOE-01 · 12 combats scénarisés de Hoenn ───────────────────────
//  • rosters inspirés des jeux officiels / de l'animé (règle utilisateur),
//    chaque attaque dans le pool apprenable, chaque talent légitime, budgets
//    IV/EV de l'Atoll respectés ;
//  • 12 quêtes principales (278–289) insérées dans la chaîne Hoenn (89 étapes)
//    avec textes FR/EN (quête + nom/intro/victoire du dresseur) ;
//  • migration V7 : une sauvegarde indexée sur l'ancienne chaîne (77 étapes)
//    retombe sur la MÊME quête.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const NEW_BATTLES = [
  'hoenn_rival_route103', 'hoenn_aqua_rusturf', 'hoenn_aqua_museum', 'hoenn_rival_route110', 'hoenn_wally_mauville',
  'hoenn_magma_chimney', 'hoenn_aqua_weather', 'hoenn_rival_route119', 'hoenn_rival_lilycove', 'hoenn_magma_hideout',
  'hoenn_aqua_seafloor', 'hoenn_wally_victoryroad',
];
const NEW_QUESTS = [278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289];

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr', region: 'hoenn',
      activeQuests: [], repeatables: [], questTrainerWins: {}, mainStep: { kanto: 0, johto: 0, hoenn: 0 }, mainProgress: { kanto: 0, johto: 0, hoenn: 0 },
      wildWinsByLoc: {}, visitedMaps: {}, completedQuests: {}, money: 0, pokedex: {} },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k) => k, getPokeName: (id) => 'P' + id, notify: () => {}, saveGame: () => {}, autoSave: () => {}, setMsg: () => {},
    updateHeader: () => {}, addToInventory: () => {}, grantRewardItems: () => {},
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: {},
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/game-config.js', 'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js', 'src/data/poke-talents.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/locations-hoenn.js', 'src/data/game-helpers.js',
    'src/application/world/team.js', 'src/application/pokemon-factory.js',
    'src/data/champions-data.js', 'src/data/official-teams-data.js', 'src/data/official-teams-hoenn.js',
    'src/data/story-quests.js', 'src/data/story-quests-hoenn.js', 'src/data/side-quests-data.js', 'src/data/legendary-quests.js',
    'src/data/npc-data.js', 'src/data/repeatable-quests-data.js', 'src/data/trainer-sprites-data.js', 'src/application/quests/quest-core.js',
  ]) vm.runInContext(harnessBundleSource([f]), sandbox, { filename: f });
  return sandbox;
}

test('HOE-01 — the 12 scripted battles exist, 1–6 Pokémon each, legitimate moves / talents / items, Atoll IV-EV budgets', () => {
  const sb = makeSandbox();
  const problems = [];
  for (const key of NEW_BATTLES) {
    const e = sb.OFFICIAL_TEAMS_HOENN[key];
    assert.ok(e, `${key} exists in OFFICIAL_TEAMS_HOENN`);
    assert.equal(e.region, 'hoenn');
    assert.ok(e.kind && e.kind !== 'gym' && e.kind !== 'league', `${key}: scripted trainer kind (${e.kind})`);
    const variants = e.variantsByStarter ? Object.entries(e.variantsByStarter) : [['-', e.team]];
    for (const [v, specs] of variants) {
      assert.ok(Array.isArray(specs) && specs.length >= 1 && specs.length <= 6, `${key}[${v}]: 1–6 Pokémon`);
      for (const spec of specs) {
        const label = `${key}[${v}]#${spec.id}`;
        if (!sb.PD[spec.id]) { problems.push(`${label}: unknown species`); continue; }
        assert.ok(spec.level >= 5 && spec.level <= 100, `${label}: level`);
        const natural = new Set(sb.getSpeciesFullLearnablePool(spec.id) || []);
        const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(spec.id) || {}));
        assert.ok(spec.moves.length >= 1 && spec.moves.length <= 4, `${label}: 1–4 moves`);
        for (const mv of spec.moves) {
          if (!sb.MOVES[mv]) problems.push(`${label}: missing move ${mv}`);
          else if (!natural.has(mv) && !ctcs.has(mv)) problems.push(`${label}: illegal move ${mv}`);
        }
        const talents = new Set((sb.getSpeciesTalents(spec.id) || []).map((x) => x.id || x));
        if (!talents.has(spec.talent)) problems.push(`${label}: illegal talent ${spec.talent}`);
        if (spec.item != null) {
          const it = sb.ITEMS[spec.item];
          if (!it) problems.push(`${label}: unknown item ${spec.item}`);
          else if (!(it.type === 'held' || it.buff)) problems.push(`${label}: item ${spec.item} is not holdable`);
        }
        const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
        if (sum(spec.ivs) > 36 || sum(spec.evs) > 36) problems.push(`${label}: IV/EV budget`);
        for (const x of Object.values(spec.ivs || {})) if (x > 12) problems.push(`${label}: iv > 12`);
        for (const x of Object.values(spec.evs || {})) if (x > 18) problems.push(`${label}: ev > 18`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('HOE-01 — rival battles adapt to the player starter (3 variants), villain teams have a leader-worthy ace', () => {
  const sb = makeSandbox();
  for (const key of NEW_BATTLES.filter((k) => k.includes('rival'))) {
    const e = sb.OFFICIAL_TEAMS_HOENN[key];
    assert.ok(e.variantsByStarter, `${key}: starter variants`);
    assert.deepEqual(Object.keys(e.variantsByStarter).map(Number).sort((a, b) => a - b), [252, 255, 258]);
  }
  for (const key of ['hoenn_magma_hideout', 'hoenn_aqua_seafloor']) {
    const specs = sb.OFFICIAL_TEAMS_HOENN[key].team;
    assert.ok(specs.length >= 3, `${key}: leader fields ≥ 3 Pokémon`);
    assert.ok(specs.some((s) => s.level >= 37), `${key}: leader ace ≥ Lv. 37 (Maxie 37–39, Archie 41–43 in the official games)`);
  }
});

test('HOE-01 — 12 main quests (278–289) inserted in order: Hoenn chain = 89 steps, each battle reachable from its quest location', () => {
  const sb = makeSandbox();
  sb.ensureQuestState();
  const chain = sb.getRegionChain('hoenn');
  assert.equal(chain.length, 89);
  const ids = chain.map((q) => q.id);
  for (const qid of NEW_QUESTS) {
    const def = sb.getMainQuestDef(qid);
    assert.ok(def && def.region === 'hoenn' && def.type === 'trainer_battle', `quest #${qid} is a Hoenn trainer battle`);
    assert.ok(NEW_BATTLES.includes(def.battleId), `quest #${qid} → ${def.battleId}`);
    assert.ok(sb.LOCS_HOENN[def.loc], `quest #${qid}: loc ${def.loc}`);
    assert.ok(ids.includes(qid), `quest #${qid} in chain`);
  }
  // Narrative order: rival 103 (first) before Wally Mauville before Magma Chimney … before Wally Victory Road (last).
  const pos = (qid) => ids.indexOf(qid);
  assert.ok(pos(278) < pos(279) && pos(279) < pos(280) && pos(280) < pos(281) && pos(281) < pos(282) && pos(282) < pos(283)
    && pos(283) < pos(284) && pos(284) < pos(285) && pos(285) < pos(286) && pos(286) < pos(287) && pos(287) < pos(288) && pos(288) < pos(289));
  // Every chain id is unique.
  assert.equal(new Set(ids).size, ids.length);
});

test('HOE-01 — FR/EN texts: quest title/desc/reward + trainer name/intro/win for every new battle', async () => {
  const fr = (await import('../src/localization/fr/quests.js')).L_fr_quests;
  const en = (await import('../src/localization/en/quests.js')).L_en_quests;
  for (const qid of NEW_QUESTS) {
    for (const [lang, L] of [['fr', fr], ['en', en]]) {
      const n = L.main[qid];
      assert.ok(n && n.title && n.desc, `${lang} quest text #${qid}`);
    }
  }
  const uiFr = R('src/localization/fr/ui.js'), uiEn = R('src/localization/en/ui.js');
  for (const b of NEW_BATTLES) {
    for (const k of ['trainer_battle_name_', 'trainer_battle_intro_', 'trainer_battle_win_']) {
      assert.ok(uiFr.includes(`"${k}${b}"`), `FR ${k}${b}`);
      assert.ok(uiEn.includes(`"${k}${b}"`), `EN ${k}${b}`);
    }
  }
});

test('HOE-01 — save migration V7: an old Hoenn mainStep (77-step chain) lands on the same quest id, idempotent', () => {
  // Reference: the chain without the 12 insertions.
  const sb = makeSandbox();
  sb.ensureQuestState();
  const chain = sb.getRegionChain('hoenn');
  const oldChain = chain.filter((q) => !NEW_QUESTS.includes(q.id));
  assert.equal(oldChain.length, 77);
  for (const oldIdx of [0, 1, 2, 7, 8, 12, 20, 30, 40, 55, 76]) {
    const sb2 = makeSandbox();
    // A V6-era save: every earlier quest migration already applied, V7 pending.
    Object.assign(sb2.G, { _questIdMigration: 2, _questIdMigrationV3: 3, _questIdMigrationV4: 4, _questIdMigrationV5: 5, _questIdMigrationV6: 6 });
    sb2.G.mainStep.hoenn = oldIdx;
    delete sb2.G._questIdMigrationV7;
    sb2.ensureQuestState();
    const landed = chain[sb2.G.mainStep.hoenn];
    assert.ok(landed, `old index ${oldIdx} → valid new index ${sb2.G.mainStep.hoenn}`);
    assert.equal(landed.id, oldChain[oldIdx].id, `old index ${oldIdx} keeps quest #${oldChain[oldIdx].id}`);
    assert.equal(sb2.G._questIdMigrationV7, 7);
    const after = sb2.G.mainStep.hoenn;
    sb2.ensureQuestState();
    assert.equal(sb2.G.mainStep.hoenn, after, 'idempotent');
  }
  // A completed old chain (index 77 = past the end) lands past the new end (89).
  const sb3 = makeSandbox();
  Object.assign(sb3.G, { _questIdMigration: 2, _questIdMigrationV3: 3, _questIdMigrationV4: 4, _questIdMigrationV5: 5, _questIdMigrationV6: 6 });
  sb3.G.mainStep.hoenn = 77; delete sb3.G._questIdMigrationV7; sb3.ensureQuestState();
  assert.equal(sb3.G.mainStep.hoenn, 89);
});

test('HOE-01 — winning a scripted battle validates its quest (questTrainerWins) and the legendary chains reuse two of them', () => {
  const sb = makeSandbox();
  sb.ensureQuestState();
  const def = sb.getMainQuestDef(288); // Aqua — Seafloor Cavern
  assert.equal(sb.questDone({ progress: 0 }, def), false);
  sb.completeQuestTrainerBattle('hoenn_aqua_seafloor');
  assert.equal(sb.G.questTrainerWins.hoenn_aqua_seafloor, true);
  assert.equal(sb.questDone({ progress: 0 }, def), true);
  // LEG-02 chains reference HOE-01 battles (Kyogre → Aqua Seafloor, Groudon → Magma Chimney).
  assert.equal(sb.SIDE_QUESTS.leg_kyogre_2.battleId, 'hoenn_aqua_seafloor');
  assert.equal(sb.SIDE_QUESTS.leg_groudon_2.battleId, 'hoenn_magma_chimney');
  assert.equal(sb.questDone({ progress: 0 }, sb.SIDE_QUESTS.leg_kyogre_2), true, 'already won → the chain step is validated too');
});
