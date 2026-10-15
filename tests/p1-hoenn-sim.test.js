import test from 'node:test';
import assert from 'node:assert/strict';

// ── V7 · P1 — HOE-02 · simulateur étendu à Hoenn (+ acceptation LEG-02) ─────
// `tools/sim_battles.mjs` charge désormais locations-hoenn / official-teams-hoenn /
// story-quests-hoenn / legendary-quests : les groupes gyms/league/story couvrent
// les 3 régions et le groupe `legendary` rejoue les 10 rencontres de fin de
// chaîne (PV × 2,2 comme startLegendaryEncounter). RNG seedé → déterministe.
const SIM = await import('../tools/sim_battles.mjs');
const { sb, winRate, buildCasualTeam, buildTrainedTeam, buildLegendaryEnemy, HOENN_TRAINED_IDS, GYMS, LEAGUE, STORY, RIVALS, LEGENDARY_CHAINS } = SIM;

test('HOE-02 — the simulator covers the three regions (24 gyms, 15 league members, Hoenn scripted battles, 10 legendary chains)', () => {
  const byRegion = (list) => list.reduce((acc, [, e]) => { acc[e.region] = (acc[e.region] || 0) + 1; return acc; }, {});
  assert.deepEqual(byRegion(GYMS), { kanto: 8, johto: 8, hoenn: 8 });
  assert.equal(GYMS.length, 24);
  assert.deepEqual(byRegion(LEAGUE), { kanto: 5, johto: 5, hoenn: 5 });
  const storyKeys = STORY.concat(RIVALS).map(([k]) => k);
  for (const k of ['hoenn_rival_route103', 'hoenn_aqua_rusturf', 'hoenn_aqua_museum', 'hoenn_rival_route110', 'hoenn_wally_mauville', 'hoenn_magma_chimney',
    'hoenn_aqua_weather', 'hoenn_rival_route119', 'hoenn_rival_lilycove', 'hoenn_magma_hideout', 'hoenn_aqua_seafloor', 'hoenn_wally_victoryroad']) {
    assert.ok(storyKeys.includes(k), `${k} simulated`);
  }
  assert.equal(LEGENDARY_CHAINS.length, 10);
  assert.ok(sb.LOCS_HOENN && sb.LOCS_HOENN.birth_island, 'Hoenn locations loaded (incl. Birth Island)');
  // Casual Hoenn teams are drawn from Hoenn wild tables.
  const team = buildCasualTeam('hoenn', 30, 4);
  assert.ok(team.length >= 4);
});

test('HOE-02 — Hoenn gyms: prepared player ≥ 7/8 wins each (seeded)', { timeout: 300000 }, async () => {
  const hoennGyms = GYMS.filter(([, e]) => e.region === 'hoenn');
  const aceOf = (entry) => Math.max(...(entry.variantsByStarter ? entry.variantsByStarter[Object.keys(entry.variantsByStarter)[0]] : entry.team).map((p) => p.level));
  let gIdx = -1;
  for (const [key, entry] of hoennGyms) {
    gIdx++;
    const ace = aceOf(entry);
    const specs = entry.variantsByStarter ? entry.variantsByStarter[Object.keys(entry.variantsByStarter)[0]] : entry.team;
    const counterTypes = [...new Set(specs.map((p) => sb.PD[p.id] && sb.PD[p.id][1]).filter(Boolean))];
    const r = await winRate(`t-gym:${key}`, () => buildCasualTeam('hoenn', ace, gIdx, 6, counterTypes), () => sb.getOfficialTeam(key), { runs: 8, seedKey: 'gym:' + key });
    assert.ok(r.wins >= 7, `${key}: ${r.wins}/8 wins for a prepared player`);
  }
});

test('LEG-02 — every Hoenn legendary encounter is won ≥ 7/8 by a prepared Hoenn team at the encounter level (seeded)', { timeout: 300000 }, async () => {
  for (const q of LEGENDARY_CHAINS) {
    const lvl = q.encounter.level;
    const r = await winRate(`t-leg:${q.id}`, () => buildTrainedTeam(HOENN_TRAINED_IDS, lvl), () => buildLegendaryEnemy(q.poke, lvl), { runs: 8, seedKey: 'legendary:' + q.id });
    assert.ok(r.wins >= 7, `${q.id}: ${r.wins}/8 wins`);
  }
});
