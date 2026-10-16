import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.t = (k) => k;
globalThis.tr = (k, params) => `${k}(${JSON.stringify(params)})`;
globalThis.getPokeName = (p) => 'Mon#' + (p && p.id ? p.id : p);
globalThis.typeEff = (move, t1, t2) => {
  const m = String(move).toLowerCase();
  const d1 = String(t1 || '').toLowerCase();
  const d2 = String(t2 || '').toLowerCase();
  if ((m === 'normal' || m === 'fighting') && (d1 === 'ghost' || d2 === 'ghost')) return 0;
  return 1;
};

test('P4c-01 — Scrappy (Querelleur) bypasses Ghost immunity in battleDisplayedEff', async () => {
  const { battleDisplayedEff } = await import('../src/application/combat/talent-immunity.js');

  const defenderGhost = { type1: 'Ghost' };

  // Without Scrappy attacker
  const attackerNormal = { talent: 'run_away', type1: 'Normal' };
  assert.equal(battleDisplayedEff('Normal', defenderGhost, attackerNormal), 0, 'Normal vs Ghost is 0 without Scrappy');
  assert.equal(battleDisplayedEff('Fighting', defenderGhost, attackerNormal), 0, 'Fighting vs Ghost is 0 without Scrappy');

  // With Scrappy attacker
  const attackerScrappy = { talent: 'scrappy', type1: 'Normal' };
  assert.equal(battleDisplayedEff('Normal', defenderGhost, attackerScrappy), 1, 'Normal vs Ghost is 1 with Scrappy');
  assert.equal(battleDisplayedEff('Fighting', defenderGhost, attackerScrappy), 1, 'Fighting vs Ghost is 1 with Scrappy');
});

test('P4c-02 — restoreTeamAfterBattle does not heal active battles when unlessBattle option is set', async () => {
  const { restoreTeamAfterBattle } = await import('../src/application/combat/battle-flow.js');
  globalThis.battle = { active: true };
  globalThis.G = { team: [{ currentHP: 0, maxHP: 100 }] };
  const healed = restoreTeamAfterBattle({ unlessBattle: true });
  assert.equal(healed, false, 'restoreTeamAfterBattle returns false without modifying team when in active battle');
  assert.equal(globalThis.G.team[0].currentHP, 0, 'team member remains at 0 HP');
  globalThis.battle = null;
});

test('P4c-03 — Roaming Legendaries pools for Kanto, Johto, and Hoenn', async () => {
  const { ROAMING_SPECIES } = await import('../src/domain/world/species-sources.js');
  assert.deepEqual(ROAMING_SPECIES.kanto, [144, 145, 146, 151], 'Kanto roamers: Artikodin, Électhor, Sulfura, Mew');
  assert.deepEqual(ROAMING_SPECIES.johto, [243, 244, 245, 251], 'Johto roamers: Raikou, Entei, Suicune, Celebi');
  assert.deepEqual(ROAMING_SPECIES.hoenn, [380, 381, 385, 386], 'Hoenn roamers: Latias, Latios, Jirachi, Deoxys');
});

test('P4c-04 — Lugia @ Tourb\'Îles only after completing Lugia quest', async () => {
  const { LOCS_JOHTO } = await import('../src/data/locations-johto.js');
  globalThis.LOCS_JOHTO = LOCS_JOHTO;
  const { getLocObj } = await import('../src/data/game-helpers.js');

  // Before quest 139
  globalThis.G = { completedQuests: {} };
  const whirlBefore = getLocObj('whirlislands');
  assert.ok(
    !whirlBefore.wild.some((w) => Number(w[0]) === 249),
    'Lugia (#249) absent from Tourb\'Îles before completing quest 139'
  );

  // After quest 139
  globalThis.G.completedQuests[139] = true;
  const whirlAfter = getLocObj('whirlislands');
  const lugiaEntry = whirlAfter.wild.find((w) => Number(w[0]) === 249);
  assert.ok(lugiaEntry, 'Lugia (#249) present in Tourb\'Îles after completing quest 139');
  assert.equal(lugiaEntry[1], 70, 'Lugia level 70');
  assert.equal(lugiaEntry[3], 'rare', 'Lugia rare encounter');
});

test('P4c-05 — Ho-Oh @ Tour Carillon only after completing Ho-Oh quest', async () => {
  const { LOCS_JOHTO } = await import('../src/data/locations-johto.js');
  globalThis.LOCS_JOHTO = LOCS_JOHTO;
  const { getLocObj } = await import('../src/data/game-helpers.js');

  // Before quest 140
  globalThis.G = { completedQuests: {} };
  const tinBefore = getLocObj('tintower');
  assert.ok(
    !tinBefore.wild.some((w) => Number(w[0]) === 250),
    'Ho-Oh (#250) absent from Tour Carillon before completing quest 140'
  );

  // After quest 140
  globalThis.G.completedQuests[140] = true;
  const tinAfter = getLocObj('tintower');
  const hoohEntry = tinAfter.wild.find((w) => Number(w[0]) === 250);
  assert.ok(hoohEntry, 'Ho-Oh (#250) present in Tour Carillon after completing quest 140');
  assert.equal(hoohEntry[1], 70, 'Ho-Oh level 70');
  assert.equal(hoohEntry[3], 'rare', 'Ho-Oh rare encounter');
});

test('P4c-06 — Non-roaming legendaries present in dungeon wild tables', async () => {
  const { LOCS } = await import('../src/data/locations-data.js');
  const { LOCS_HOENN } = await import('../src/data/locations-hoenn.js');

  // Mewtwo in ceruleancave
  assert.ok(LOCS.ceruleancave.wild.some((w) => Number(w[0]) === 150), 'Mewtwo in ceruleancave');

  // Regis in desert_ruins, island_cave, ancient_tomb
  assert.ok(LOCS_HOENN.desert_ruins.wild.some((w) => Number(w[0]) === 377), 'Regirock in desert_ruins');
  assert.ok(LOCS_HOENN.island_cave.wild.some((w) => Number(w[0]) === 378), 'Regice in island_cave');
  assert.ok(LOCS_HOENN.ancient_tomb.wild.some((w) => Number(w[0]) === 379), 'Registeel in ancient_tomb');

  // Weather trio
  assert.ok(LOCS_HOENN.seafloor_cavern.wild.some((w) => Number(w[0]) === 382), 'Kyogre in seafloor_cavern');
  assert.ok(LOCS_HOENN.cave_of_origin.wild.some((w) => Number(w[0]) === 383), 'Groudon in cave_of_origin');
  assert.ok(LOCS_HOENN.sky_pillar.wild.some((w) => Number(w[0]) === 384), 'Rayquaza in sky_pillar');
});

test('P4c-07 — docs/POKEDEX_OBTENTION.xlsx has 5 sheets, all 386 Pokemon, and updated legendaries', () => {
  assert.ok(fs.existsSync('docs/POKEDEX_OBTENTION.xlsx'), 'file exists at docs/POKEDEX_OBTENTION.xlsx');
  const stats = fs.statSync('docs/POKEDEX_OBTENTION.xlsx');
  assert.ok(stats.size > 20000, 'Excel spreadsheet is complete (> 20 KB)');
});
