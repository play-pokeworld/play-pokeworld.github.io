import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ── V7 · DEX-01 (+ HLP-01 fusionné) — provenances structurées des espèces ───
// Source unique : src/domain/world/species-sources.js, consommée par la
// fiche Pokédex (pokedex.js) ET par tools/audit-unobtainable.mjs.
// Garantie testée : chaque espèce #1–#386 et chaque forme a une provenance
// directe ou est atteignable par évolution depuis une espèce qui en a une.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

globalThis.window = globalThis;
const fakeWindow = {};
new Function('window', R('src/data/pd-data.js'))(fakeWindow);
const PD = fakeWindow.PD;

const { LOCS } = await import('../src/data/locations-data.js');
const { LOCS_JOHTO } = await import('../src/data/locations-johto.js');
const { LOCS_HOENN } = await import('../src/data/locations-hoenn.js');
const { ITEMS } = await import('../src/data/items-data.js');
const { STORY_QUESTS } = await import('../src/data/story-quests.js');
const { STORY_QUESTS_HOENN } = await import('../src/data/story-quests-hoenn.js');
const { SIDE_QUESTS } = await import('../src/data/side-quests-data.js');
const { MARKET_STOCK } = await import('../src/domain/economy/market.js');
const { LEVEL_EVO_MAP, EVO_LEVELS, STONE_EVO } = await import('../src/application/combat/progression.js');
const { FORMS, FORM_SHOPS } = await import('../src/data/forms-data.js');
const { GAME } = await import('../src/data/game-config.js');
const { LEGENDARY_QUESTS } = await import('../src/data/legendary-quests.js').catch(() => ({ LEGENDARY_QUESTS: [] }));
// game-helpers.js re-peuple les tables sauvages de Johto au chargement (populateJohtoWild) :
// même surface que le jeu et que tools/audit-unobtainable.mjs.
globalThis.LOCS = LOCS; globalThis.LOCS_JOHTO = LOCS_JOHTO; globalThis.LOCS_HOENN = LOCS_HOENN; globalThis.ITEMS = ITEMS; globalThis.PD = PD;
await import('../src/data/game-helpers.js');
const SS = await import('../src/domain/world/species-sources.js');
const { computeSpeciesSources, hasDirectSource, reachableSpecies, wildOdds, defaultSourcesContext, ROAMING_SPECIES, BABY_PARENTS } = SS;

const questList = (qs) => (Array.isArray(qs) ? qs : Object.values(qs || {}));
const legendaryList = (Array.isArray(LEGENDARY_QUESTS) ? LEGENDARY_QUESTS : Object.values(LEGENDARY_QUESTS || {}));
const ctx = {
  locTables: { kanto: LOCS, johto: LOCS_JOHTO, hoenn: LOCS_HOENN },
  starters: { kanto: GAME.KANTO_STARTERS || [1, 4, 7], johto: GAME.JOHTO_STARTERS || [152, 155, 158], hoenn: GAME.HOENN_STARTERS || [252, 255, 258] },
  marketStock: MARKET_STOCK,
  fossilMap: Object.fromEntries(Object.keys(ITEMS).filter((k) => ITEMS[k] && ITEMS[k].revive).map((k) => [k, Number(ITEMS[k].revive)])),
  quests: [
    ...questList(STORY_QUESTS).map((q) => ({ id: q.id, label: 'main', rewardPoke: Number(q.rewardPoke) })),
    ...questList(STORY_QUESTS_HOENN).map((q) => ({ id: q.id, label: 'main', rewardPoke: Number(q.rewardPoke) })),
    ...questList(SIDE_QUESTS).map((q) => ({ id: q.id, label: 'side', rewardPoke: Number(q.rewardPoke) })),
    ...legendaryList.filter((q) => q && q.poke).map((q) => ({ id: q.id, label: 'legendary', rewardPoke: Number(q.poke) })),
  ].filter((q) => q.rewardPoke > 0),
  babyParents: BABY_PARENTS,
  levelEvoMap: LEVEL_EVO_MAP, evoLevels: EVO_LEVELS, stoneEvo: STONE_EVO,
  forms: FORMS, formShops: FORM_SHOPS,
  roaming: ROAMING_SPECIES,
};
const ALL_IDS = Object.keys(PD).map(Number).filter((n) => Number.isFinite(n) && PD[n]);

test('DEX-01 — every species #1–#386 has a direct source or is reachable by evolution (stone evolutions included)', () => {
  assert.equal(ALL_IDS.length, 386);
  const reach = reachableSpecies(ALL_IDS, ctx, () => true);
  const missing = ALL_IDS.filter((id) => !reach.has(id));
  assert.deepEqual(missing, [], `unreachable species: ${missing.map((id) => `#${id} ${PD[id][0]}`).join(', ')}`);
});

test('DEX-01 — every form has a form_shop source (price > 0, located shop) plus a form_of link to its base', () => {
  for (const key of Object.keys(FORMS)) {
    const srcs = computeSpeciesSources(key, ctx);
    const shop = srcs.find((s) => s.kind === 'form_shop');
    assert.ok(shop, `${key}: form_shop source`);
    assert.ok(shop.price > 0 && shop.location, `${key}: priced + located`);
    assert.equal(shop.base, FORMS[key].base);
    assert.ok(srcs.some((s) => s.kind === 'form_of' && s.base === FORMS[key].base), `${key}: form_of`);
    assert.ok(!srcs.some((s) => s.kind === 'wild'), `${key}: a form is never wild`);
    // The base lists its forms (has_forms) — and keeps its own direct sources.
    const base = computeSpeciesSources(FORMS[key].base, ctx);
    const hf = base.find((s) => s.kind === 'has_forms');
    assert.ok(hf && hf.keys.includes(key), `base #${FORMS[key].base} lists ${key}`);
  }
  // Castform is buyable at the Weather Institute, Deoxys in Fallarbor (roadmap FORM-01).
  assert.equal(computeSpeciesSources('351-1', ctx).find((s) => s.kind === 'form_shop').location, 'weather_institute');
  assert.equal(computeSpeciesSources('386-1', ctx).find((s) => s.kind === 'form_shop').location, 'fallarbor');
});

test('DEX-01 — wildOdds: bucket shares 4 / 20 / 76 % and the chances of a table sum to 1', () => {
  const tables = [...Object.values(LOCS), ...Object.values(LOCS_JOHTO), ...Object.values(LOCS_HOENN)].filter((l) => Array.isArray(l.wild) && l.wild.length);
  assert.ok(tables.length > 50, 'enough wild tables');
  for (const loc of tables) {
    const ids = [...new Set(loc.wild.map((w) => Number(w[0])))];
    const sum = ids.reduce((acc, id) => acc + wildOdds(loc.wild, id).chance, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `table sums to 1 (got ${sum})`);
    for (const id of ids) {
      const o = wildOdds(loc.wild, id);
      assert.ok(['common', 'uncommon', 'rare'].includes(o.bucket));
      assert.ok(o.chance > 0 && o.chance <= 1);
      assert.ok(o.minLv >= 1 && o.maxLv >= o.minLv, 'level range coherent');
    }
  }
  // A lone rare in a table gets the full 4 % share; the empty « uncommon » bucket falls back to common (76 + 20 = 96 % / 2).
  const fake = [[1, 2, 4, 'common'], [4, 2, 4, 'common'], [7, 5, 6, 'rare']];
  assert.ok(Math.abs(wildOdds(fake, 7).chance - 0.04) < 1e-12);
  assert.ok(Math.abs(wildOdds(fake, 1).chance - 0.48) < 1e-12);
  // No rare at all → its 4 % go to the uncommon bucket (24 %), as pickWildFromTable does.
  const noRare = [[1, 2, 4, 'common'], [4, 2, 4, 'uncommon']];
  assert.ok(Math.abs(wildOdds(noRare, 4).chance - 0.24) < 1e-12);
  assert.ok(Math.abs(wildOdds(noRare, 1).chance - 0.76) < 1e-12);
  assert.equal(wildOdds(fake, 150), null);
});

test('DEX-01 — roaming legendaries: 1 % at level 75 per region, and the kinds vocabulary is closed', () => {
  const KINDS = new Set(['wild', 'roaming', 'starter', 'market', 'fossil', 'quest', 'egg', 'evo_level', 'evo_stone', 'form_shop', 'form_of', 'has_forms']);
  for (const region of Object.keys(ROAMING_SPECIES)) {
    for (const id of ROAMING_SPECIES[region]) {
      const r = computeSpeciesSources(id, ctx).find((s) => s.kind === 'roaming' && s.region === region);
      assert.ok(r, `#${id} roams in ${region}`);
      assert.equal(r.chance, 0.01);
      assert.equal(r.level, 75);
    }
  }
  for (const key of [...ALL_IDS, ...Object.keys(FORMS)]) {
    for (const s of computeSpeciesSources(key, ctx)) assert.ok(KINDS.has(s.kind), `${key}: kind ${s.kind} known`);
  }
  // Starters, fossils, eggs, evolutions.
  assert.ok(computeSpeciesSources(1, ctx).some((s) => s.kind === 'starter' && s.region === 'kanto'));
  assert.ok(computeSpeciesSources(2, ctx).some((s) => s.kind === 'evo_level' && s.from === 1 && s.level === 16));
  assert.ok(computeSpeciesSources(26, ctx).some((s) => s.kind === 'evo_stone' && s.from === 25));
  assert.ok(computeSpeciesSources(172, ctx).some((s) => s.kind === 'egg' && s.parents.includes(25)));
  assert.ok(computeSpeciesSources(138, ctx).some((s) => s.kind === 'fossil'));
  assert.equal(hasDirectSource(2, ctx), false, 'Ivysaur only via evolution');
  assert.equal(hasDirectSource(1, ctx), true);
});

test('DEX-01 — defaultSourcesContext() reads the game globals (GAME, FORMS, FORM_SHOPS, LOCS…)', () => {
  globalThis.GAME = GAME; globalThis.FORMS = FORMS; globalThis.FORM_SHOPS = FORM_SHOPS;
  globalThis.LOCS = LOCS; globalThis.LOCS_JOHTO = LOCS_JOHTO; globalThis.LOCS_HOENN = LOCS_HOENN;
  globalThis.MARKET_STOCK = MARKET_STOCK; globalThis.LEVEL_EVO_MAP = LEVEL_EVO_MAP; globalThis.EVO_LEVELS = EVO_LEVELS; globalThis.STONE_EVO = STONE_EVO;
  globalThis.STORY_QUESTS = STORY_QUESTS; globalThis.STORY_QUESTS_HOENN = STORY_QUESTS_HOENN; globalThis.SIDE_QUESTS = SIDE_QUESTS;
  const d = defaultSourcesContext();
  assert.deepEqual(d.starters.hoenn, GAME.HOENN_STARTERS || [252, 255, 258]);
  assert.equal(d.forms, FORMS);
  assert.equal(d.formShops, FORM_SHOPS);
  assert.equal(d.locTables.hoenn, LOCS_HOENN);
  assert.ok(d.quests.length >= 1, 'quests with rewardPoke collected');
  const w = computeSpeciesSources(351, d).filter((s) => s.kind === 'wild');
  assert.ok(w.length >= 1, 'Castform appears somewhere in the wild via the default context');
});

test('DEX-01 — the Pokédex sheet and the audit tool both consume species-sources.js; the stats bar shows « Formes : n / total »', () => {
  const dex = R('src/ui/game/pokedex.js');
  assert.match(dex, /computeSpeciesSources/);
  assert.match(dex, /_dexFormsStat\(\)/);
  assert.match(dex, /tr\('dex_forms_count', \{ caught: String\(caught\), total: String\(total\) \}\)/);
  assert.match(R('tools/audit-unobtainable.mjs'), /species-sources\.js/);
  for (const lang of ['fr', 'en']) {
    const ui = R(`src/localization/${lang}/ui.js`);
    assert.match(ui, /"dex_forms_count":"[^"]*\{caught\}[^"]*\{total\}[^"]*"/);
    for (const k of ['dex_src_wild', 'dex_src_roaming', 'dex_src_starter', 'dex_src_market', 'dex_src_fossil', 'dex_src_quest_side', 'dex_src_quest_legendary', 'dex_src_egg', 'dex_src_form_shop', 'dex_src_has_forms', 'dex_bucket_common', 'dex_bucket_uncommon', 'dex_bucket_rare']) {
      assert.match(ui, new RegExp(`"${k}":"`), `${lang}: ${k}`);
    }
  }
});
