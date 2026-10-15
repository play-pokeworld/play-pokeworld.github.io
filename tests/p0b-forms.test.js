import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

// ── V7 · P0b — FORM-01 (formes = Pokémon à part), FORM-02 (migration v3→v4),
//    FORM-03 (dex / boîte), FORM-04 (outillage) ─────────────────────────────

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (o) => JSON.parse(JSON.stringify(o));

// Pure data/domain modules (ESM) — classic `window` surface required by pd-data.
globalThis.window = globalThis;
const { FORMS, FORM_KINDS, FORM_SHOPS, LEGACY_FORM_IDS } = await import('../src/data/forms-data.js');
const { parseSpeciesKey, speciesKey, sameSpecies, getFormDef, formsOf, getSpeciesData } = await import('../src/domain/pokemon/species-key.js');
const { migrateSaveData, migrateV3toV4, CURRENT_SAVE_SCHEMA } = await import('../src/application/save/migrations/index.js');
const { computeSpeciesSources, reachableSpecies } = await import('../src/domain/world/species-sources.js');

function gameSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], collection: {}, inventory: {}, pokedex: {}, money: 0, region: 'hoenn', badges: [], lang: 'fr', hatchery: [], training: [] },
    battle: { active: false },
    t: (k) => k, tr: (k, o) => k + (o ? ' ' + JSON.stringify(o) : ''), notify: () => {}, saveGame: () => {}, updateHeader: () => {},
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: {},
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/game-config.js', 'src/data/moves.js', 'src/data/pd-data.js', 'src/data/forms-data.js',
    'src/domain/pokemon/species-key.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/locations-hoenn.js',
    'src/data/sprites.js', 'src/localization/fr/pokemon-names.js', 'src/localization/en/pokemon-names.js',
    'src/localization/data.js', 'src/localization/i18n.js', 'src/data/game-helpers.js', 'src/application/pokemon-factory.js',
    'src/application/world/collection.js', 'src/ui/game/sprite-helpers.js',
  ]) {
    vm.runInContext(harnessBundleSource([f]), sandbox, { filename: f });
  }
  return sandbox;
}

// ── FORM-01 · données ────────────────────────────────────────────────────────

test('FORM-01 — PD stops at #386: no fake dex numbers for forms, every id inside REGION_POKE_RANGES', () => {
  const sb = gameSandbox();
  const ids = Object.keys(sb.PD).map(Number).filter((n) => Number.isFinite(n) && sb.PD[n]);
  assert.equal(Math.max(...ids), 386, 'no PD id above 386');
  assert.equal(ids.length, 386);
  const ranges = ['kanto', 'johto', 'hoenn'].map((r) => J(sb.getRegionMeta(r)));
  for (const id of ids) {
    assert.ok(ranges.some((r) => id >= r.start && id <= r.end), `#${id} belongs to a region range`);
  }
  // The localized name arrays stop at Deoxys too.
  assert.equal(sb.L_pokemon_names_fr.length, 387);
  assert.equal(sb.L_pokemon_names_en.length, 387);
  assert.equal(sb.L_pokemon_names_fr[386], 'Deoxys');
});

test('FORM-01 — FORMS table: 6 forms keyed "base-slot", kind ∈ FORM_KINDS, shop source, sprites present', () => {
  const keys = Object.keys(FORMS);
  assert.equal(keys.length, 6);
  const sprites = R('src/data/sprites.js');
  for (const k of keys) {
    const f = FORMS[k];
    assert.equal(k, `${f.base}-${f.slot}`, `${k}: key = base-slot`);
    assert.equal(typeof f.key, 'string', `${k}: slug present`);
    assert.equal(f.sprite, k, `${k}: sprite key = form key`);
    assert.ok(f.slot >= 1, `${k}: slot ≥ 1`);
    assert.ok(FORM_KINDS.includes(f.kind), `${k}: kind ${f.kind} known`);
    assert.ok(f.name_fr && f.name_en, `${k}: FR/EN names`);
    assert.equal(f.stats.length, 6, `${k}: 6 base stats`);
    assert.ok(f.types.length >= 1, `${k}: at least one type`);
    assert.ok(f.source && FORM_SHOPS[f.source.shop], `${k}: a shop source exists`);
    assert.ok(f.source.price > 0, `${k}: priced`);
    assert.equal(FORM_SHOPS[f.source.shop].baseId, f.base, `${k}: shop belongs to the base species`);
    assert.ok(FORM_SHOPS[f.source.shop].location && FORM_SHOPS[f.source.shop].titleKey, `${k}: shop has a location and an i18n title`);
    assert.match(sprites, new RegExp(`"${k}":"src/assets/images/pokemon/front/[^"]+"`), `${k}: front sprite key`);
    assert.match(sprites, new RegExp(`"${k}":"src/assets/images/pokemon/frontShiny/[^"]+"`), `${k}: shiny sprite key`);
  }
  assert.doesNotMatch(sprites, /"38[7-9]":|"39[0-2]":/, 'no 387–392 sprite keys left');
  // Legacy ids map one-to-one onto the 6 forms (FORM-02).
  assert.deepEqual(Object.values(LEGACY_FORM_IDS).sort(), keys.sort());
  // Castform forms are typed by weather, Deoxys forms keep the Psychic type.
  assert.equal(FORMS['351-1'].types[0], 'Fire');
  assert.equal(FORMS['351-2'].types[0], 'Water');
  assert.equal(FORMS['351-3'].types[0], 'Ice');
  assert.deepEqual(FORMS['386-1'].stats, [50, 180, 20, 180, 20, 150]);
});

test('FORM-01 — species-key domain: parse / key / sameSpecies / getSpeciesData inherit catch rate & XP', () => {
  assert.deepEqual(parseSpeciesKey('351-1'), { id: 351, form: 1 });
  assert.deepEqual(parseSpeciesKey(25), { id: 25, form: 0 });
  assert.deepEqual(parseSpeciesKey({ id: 386, form: 3 }), { id: 386, form: 3 });
  assert.equal(speciesKey({ id: 351, form: 2 }), '351-2');
  assert.equal(speciesKey({ id: 351 }), '351');
  assert.equal(speciesKey(386, 1), '386-1');
  assert.ok(sameSpecies({ id: 351, form: 1 }, '351-1'));
  assert.ok(!sameSpecies({ id: 351 }, '351-1'), 'base ≠ form');
  assert.equal(getFormDef(351, 1).name_fr, 'Morphéo Solaire');
  assert.equal(getFormDef(351, 0), null);
  assert.deepEqual(formsOf(351).map((f) => `${f.base}-${f.slot}`), ['351-1', '351-2', '351-3']);
  assert.deepEqual(formsOf(25), []);
  const sb = gameSandbox();
  const base = J(sb.PD[386]);
  const def = getSpeciesData('386-2');
  assert.equal(def[0], 'Deoxys Defense', 'PD-like row carries the EN name (like PD)');
  assert.equal(def[5], 160, 'form DEF stat');
  assert.equal(def[10], base[10], 'catch rate inherited from the base');
  assert.equal(def[11], base[11], 'xp yield inherited from the base');
});

test('FORM-01 — createPoke builds a form as its own Pokémon (stats, types, name, sprite key)', () => {
  const sb = gameSandbox();
  const sunny = sb.createPoke('351-1', 20, false);
  assert.equal(sunny.id, 351);
  assert.equal(sunny.form, 1);
  assert.equal(sunny.name, 'Morphéo Solaire');
  assert.equal(sunny.type1, 'Fire');
  const base = sb.createPoke(351, 20, false);
  assert.equal(base.form, undefined, 'a base Pokémon carries no form field');
  assert.equal(base.type1, 'Normal');
  const atk = sb.createPoke(386, 50, false, { form: 1 });
  const def = sb.createPoke(386, 50, false, { form: 2 });
  assert.ok(atk.atk > def.atk, 'Deoxys Attack hits harder than Deoxys Defense');
  assert.ok(def.def > atk.def, 'Deoxys Defense is sturdier');
  // Names follow the language, sprites follow the form key.
  assert.equal(sb.getPokeName(351, 1), 'Morphéo Solaire');
  assert.equal(sb.getPokeName('386-3'), 'Deoxys Vitesse');
  assert.equal(sb.getPokeName(sunny), 'Morphéo Solaire');
  sb.G.lang = 'en';
  assert.equal(sb.getPokeName('351-2'), 'Castform Rainy');
  sb.G.lang = 'fr';
  assert.match(sb.getPokemonSpriteUrl(sunny, false), /castform-sunny\.png$/);
  assert.match(sb.spriteImg(sunny, '', { size: 72 }), /castform-sunny\.png/);
  assert.match(sb.spriteImg('386-1', '', { size: 72, shiny: true }), /frontShiny\/deoxys-attack\.png/);
  // recalcPokeStats keeps the FORM stats (not the base ones).
  const before = def.def;
  sb.recalcPokeStats(def);
  assert.equal(def.def, before);
});

// ── FORM-01 · boîte / unicité / dex ───────────────────────────────────────────

test('FORM-01 — a form and its base coexist in the PC; the same form never duplicates', () => {
  const sb = gameSandbox();
  const base = sb.createPoke(351, 10, false);
  const sunny = sb.createPoke('351-1', 10, false);
  const rainy = sb.createPoke('351-2', 10, false);
  assert.equal(sb.addPokemonRespectingUniqueness(base).added, true);
  assert.equal(sb.addPokemonRespectingUniqueness(sunny).added, true, 'form added next to its base');
  assert.equal(sb.addPokemonRespectingUniqueness(rainy).added, true);
  assert.equal(sb.addPokemonRespectingUniqueness(sb.createPoke('351-1', 12, false)).added, false, 'same form = duplicate');
  assert.equal(sb.addPokemonRespectingUniqueness(sb.createPoke(351, 12, false)).added, false, 'same base = duplicate');
  const all = [...sb.G.team, ...Object.values(sb.G.collection)].map((p) => sb.speciesKey(p)).sort();
  assert.deepEqual(all, ['351', '351-1', '351-2']);
  assert.ok(sb.speciesOwned('351-1'));
  assert.ok(sb.speciesOwnedInstance('351-2'));
  assert.ok(!sb.speciesOwned('351-3'));
  assert.ok(sb.findExistingPokemonBySpecies('351-2') === rainy);
  // Dedupe pass keeps one of each species key.
  sb.G.collection['box_dupe'] = sb.createPoke('351-1', 30, false);
  const removed = sb.deduplicateCollectionAndFixBox();
  assert.ok(removed >= 1, 'duplicate form removed');
  assert.deepEqual([...sb.G.team, ...Object.values(sb.G.collection)].map((p) => sb.speciesKey(p)).sort(), ['351', '351-1', '351-2']);
  // Box ids are species keys.
  assert.equal(sb.generateUniqueBoxId('386-1'), '386-1');
  assert.equal(sb.generateUniqueBoxId({ id: 386, form: 2 }), '386-2');
});

test('FORM-01 — dex: forms live under G.pokedex[base].forms[slot]; base OR form counts for the 100 % (D12)', () => {
  const sb = gameSandbox();
  sb.G.pokedex = {};
  sb.markDexCaught('351-1', false);
  assert.deepEqual(J(sb.G.pokedex[351]), { forms: { 1: { seen: true, caught: true } } });
  assert.ok(sb.isDexCaught('351-1'));
  assert.ok(!sb.isDexCaught(351), 'the base itself is NOT marked caught');
  assert.ok(sb.isSpeciesCaughtAnyForm(351), 'but the species counts for the regional dex');
  // Hoenn: 135 species; everything caught except Castform, only Sunny Form caught → 135/135.
  for (let id = 252; id <= 386; id++) if (id !== 351) sb.G.pokedex[id] = { seen: true, caught: true };
  assert.equal(sb.getRegionPokedexTotal('hoenn'), 135, 'forms never inflate the regional total');
  assert.equal(sb.countCaughtInRegion('hoenn'), 135);
  assert.ok(sb.isRegionDexComplete('hoenn'));
  // Separate « Formes » counter (achievements family O).
  assert.deepEqual(J(sb.countCaughtForms('hoenn')), { caught: 1, total: 6 });
  sb.markDexCaught({ id: 386, form: 3 }, true);
  assert.deepEqual(J(sb.countCaughtForms()), { caught: 2, total: 6 });
  assert.ok(sb.G.pokedex[386].forms[3].shiny);
  // Shiny unlock is per species key: a shiny form does not turn the base shiny.
  assert.ok(sb.isSpeciesShiny('386-3'));
  assert.ok(!sb.isSpeciesShiny(386));
  sb.unlockShinyForSpecies('351-1');
  assert.ok(sb.isSpeciesShiny('351-1') && !sb.isSpeciesShiny(351) && !sb.isSpeciesShiny('351-2'));
});

// ── FORM-02 · migration v3 → v4 ───────────────────────────────────────────────

function v3Fixture() {
  return {
    version: 3,
    timestamp: 1,
    G: {
      lang: 'fr',
      team: [
        { id: 25, name: 'Pikachu', level: 30, maxHP: 80, moves: [] },
        { id: 387, name: 'Morphéo Solaire', level: 40, maxHP: 100, moves: [], type1: 'Feu', type2: '' },
      ],
      collection: {
        'box_390_1': { id: 390, name: 'Deoxys Attaque', level: 50, maxHP: 120, moves: [] },
        '388': { id: 388, name: 'Morphéo Eau de Pluie', level: 12, maxHP: 40, moves: [] },
        'form_391_7': { id: 391, name: 'Deoxys Défense', level: 50, maxHP: 120, moves: [] },
        '351': { id: 351, name: 'Morphéo', level: 12, maxHP: 40, moves: [] },
        '386-1': { id: 1, name: 'collision', level: 1, maxHP: 10, moves: [] }, // key already taken by an unrelated entry
      },
      hatchery: [{ poke: { id: 389, name: 'Morphéo Blizzard', level: 5, maxHP: 20, moves: [] }, steps: 1 }],
      training: [{ poke: { id: 392, name: 'Deoxys Vitesse', level: 5, maxHP: 20, moves: [] } }],
      inventory: { pokeball: 3 },
      pokedex: { 25: { seen: true, caught: true }, 388: { seen: true, caught: true, shiny: true, captured: 2 }, 392: { seen: true } },
      unlockedTalents: { 387: ['levitate'], 351: ['forecast'] },
      dupeCatches: { 390: 2, 386: 1 },
      saveMeta: { id: 'slot1', version: 3 },
    },
  };
}

test('FORM-02 — migration v3 → v4 rewrites every legacy form id into {id: base, form: slot} (team, box, hatchery, training, dex, talents, dupes)', () => {
  const save = v3Fixture();
  const r = migrateSaveData(save);
  assert.equal(r.migrated, true);
  assert.equal(r.from, 3);
  assert.equal(r.to, 4);
  assert.equal(save.version, CURRENT_SAVE_SCHEMA);
  assert.equal(save.G.saveMeta.version, 4);
  const G = save.G;
  // Team
  assert.deepEqual(J(G.team[0]), { id: 25, name: 'Pikachu', level: 30, maxHP: 80, moves: [] }, 'untouched Pokémon');
  assert.equal(G.team[1].id, 351);
  assert.equal(G.team[1].form, 1);
  assert.equal(G.team[1].name, 'Morphéo Solaire');
  // Box: canonical keys, collision-safe, base kept
  assert.ok(G.collection['386-1'] && G.collection['386-1'].id === 1, 'pre-existing unrelated key is not overwritten');
  const deoxysAtk = Object.entries(G.collection).find(([, p]) => p.id === 386 && p.form === 1);
  assert.ok(deoxysAtk, 'Deoxys Attack re-keyed');
  assert.match(deoxysAtk[0], /^box_386-1_\d+$/, 'collision → derived key');
  assert.ok(G.collection['351-2'] && G.collection['351-2'].form === 2, '"388" → "351-2"');
  assert.ok(G.collection['386-2'] && G.collection['386-2'].form === 2, '"form_391_7" → "386-2"');
  assert.ok(G.collection['351'] && G.collection['351'].id === 351 && !G.collection['351'].form, 'base Castform untouched');
  assert.ok(!G.collection['box_390_1'] && !G.collection['388'] && !G.collection['form_391_7'], 'legacy keys removed');
  // Machines
  assert.deepEqual([G.hatchery[0].poke.id, G.hatchery[0].poke.form], [351, 3]);
  assert.deepEqual([G.training[0].poke.id, G.training[0].poke.form], [386, 3]);
  // Dex
  assert.equal(G.pokedex[388], undefined);
  assert.equal(G.pokedex[392], undefined);
  assert.deepEqual(J(G.pokedex[351].forms[2]), { seen: true, caught: true, shiny: true, captured: 2 });
  assert.deepEqual(J(G.pokedex[386].forms[3]), { seen: true });
  assert.deepEqual(J(G.pokedex[25]), { seen: true, caught: true });
  // Talents / dupes merged on the base
  assert.deepEqual(J(G.unlockedTalents), { 351: ['forecast', 'levitate'] });
  assert.deepEqual(J(G.dupeCatches), { 386: 3 });
  // Idempotent
  const again = migrateSaveData(save);
  assert.equal(again.migrated, false);
  assert.equal(save.version, 4);
  // A fresh v4 save is left alone; an unknown future version too.
  assert.equal(migrateSaveData({ version: 4, G: {} }).migrated, false);
  assert.equal(migrateSaveData({ version: 9, G: {} }).to, 9);
  // Direct report of the v3→v4 step
  const rep = migrateV3toV4(v3Fixture().G);
  assert.equal(rep.pokemon, 6);
  assert.equal(rep.dex, 2);
});

test('FORM-02 — save.js loads v3 by migrating (never deletes): SAVE_VERSION 4 everywhere, readSlot migrates, isCompatible accepts v3', () => {
  const save = R('src/application/save/save.js');
  // V7 · DBT-05 — plus de copie locale : save.js et le pont importent le schéma unique (game-config.js).
  assert.match(save, /import \{ SAVE_VERSION, OLDEST_LOADABLE_SAVE_VERSION \} from '\.\.\/\.\.\/data\/game-config\.js'/);
  assert.ok(wsMatch(save, /function readSlot\(id\)\{[\s\S]{0,200}?migrateLoadedSaveData\(JSON\.parse\(raw\)\)/), 'slots are migrated at read time'); // V7 · DBT-01
  assert.ok(wsMatch(save, /function isCompatibleSaveData\(saveData\) \{ if\(saveData && Number\(saveData\.version\) >= OLDEST_LOADABLE_SAVE_VERSION/), 'compat check migrates first'); // V7 · DBT-01
  assert.match(R('src/data/game-config.js'), /SAVE_VERSION: 4,/);
  assert.match(R('src/data/game-config.js'), /OLDEST_LOADABLE_SAVE_VERSION: 3,/);
  const bridge = R('src/engine/runtime/classic-bridge.js');
  // V7 · DBT-01 — imports multi-lignes et guillemets simples (Prettier) : comparaison sans blancs.
  assert.ok(wsMatch(bridge, /import \{ SAVE_VERSION as CURRENT_SAVE_VERSION, OLDEST_LOADABLE_SAVE_VERSION,? \} from '\.\.\/\.\.\/data\/game-config\.js'/));
  assert.ok(wsMatch(bridge, /Number\(data\.version\) >= OLDEST_LOADABLE_SAVE_VERSION && Number\(data\.version\) <= CURRENT_SAVE_VERSION/), 'bridge never quarantines a v3 save');
  assert.match(R('src/main.js'), /import ['"]\.\/application\/save\/migrations\/index\.js['"];/);
});

// ── FORM-03 · UI ──────────────────────────────────────────────────────────────

test('FORM-03 — dex sheet lists the forms (cards + source), box has a « Formes » filter and badge, texts are i18n keys', () => {
  const dexView = R('src/ui/views/DexDetailView.js');
  assert.match(dexView, /pw-dex-forms-grid/);
  assert.match(dexView, /pw-dex-form-card/);
  const pokedex = R('src/ui/game/pokedex.js');
  assert.match(pokedex, /function _dexFormsModel\(id\)/);
  assert.match(pokedex, /forms: _dexFormsModel\(id\),/);
  assert.match(pokedex, /dex_form_source_shop/);
  const helpers = R('src/data/box-filters.js'); // V7 · DBT-09 — filtres de boîte extraits de game-helpers.js
  assert.match(helpers, /forms:'all'/, 'box filter default');
  assert.match(helpers, /filters\.forms === 'forms' && !\(Number\(p\.form\) > 0\)/, 'forms-only filter rule');
  assert.match(helpers, /box_filter_forms_only/);
  assert.match(R('src/ui/components/poke-card.js'), /pw-box-form-badge/);
  assert.match(R('src/ui/game/box-ui.js'), /formBadge: Number\(poke\.form\) > 0 \? t\('box_form_badge'\) : ''/); // V7 · DBT-01 — parenthèses redondantes retirées
  for (const lang of ['fr', 'en']) {
    const ui = R(`src/localization/${lang}/ui.js`);
    for (const key of ['forms_shop_castform_title', 'forms_shop_deoxys_title', 'forms_shop_locked', 'forms_shop_bought', 'dex_forms_label', 'dex_form_obtained', 'dex_form_missing', 'dex_form_source_shop', 'box_filter_forms_only', 'box_form_badge']) {
      assert.match(ui, new RegExp(`"${key}":`), `${lang}: ${key}`);
    }
  }
});

test('FORM-03 — the shops are data-driven (FORMS / FORM_SHOPS): no price or label literal, legacy form changers deleted', () => {
  const li = R('src/ui/game/location-info.js');
  assert.match(li, /function buySpecialFormPokemon\(baseId, slot, price\)/);
  assert.match(li, /price = Number\(def\.source && def\.source\.price\) \|\| price;/, 'the data price always wins over the button');
  assert.doesNotMatch(li, /20000|50000/, 'no hard-coded form price (TXT-01)');
  assert.doesNotMatch(li, /Morphéo Solaire|Deoxys Attaque|Labo Météo|Weather Lab|Météorites — Formes/, 'no hard-coded form label');
  assert.match(li, /shop\.location !== G\.location/, 'shop buttons placed from FORM_SHOPS.location');
  assert.doesNotMatch(li, /function changeCastformForm|function changeDeoxysForm/, 'dead string-form changers removed');
  assert.match(li, /createPoke\(baseId, 1, isShiny, \{ form: slot \}\)/);
  assert.match(li, /markDexCaught\(p, isShiny\)/);
});

// ── FORM-04 · outillage ───────────────────────────────────────────────────────

test('FORM-04 — species-sources (DEX-01) gives each of the 6 forms a shop source; 386 species + forms all obtainable; catch flow is form-aware', () => {
  const sb = gameSandbox();
  const ctx = {
    locTables: { kanto: J(sb.LOCS), johto: J(sb.LOCS_JOHTO), hoenn: J(sb.LOCS_HOENN) },
    starters: { kanto: [1, 4, 7], johto: [152, 155, 158], hoenn: [252, 255, 258] },
    marketStock: null, fossilMap: null, quests: [], babyParents: {}, levelEvoMap: {}, evoLevels: {}, stoneEvo: {},
    forms: FORMS, formShops: FORM_SHOPS, roaming: { kanto: [144], johto: [], hoenn: [386] },
  };
  for (const k of Object.keys(FORMS)) {
    const srcs = computeSpeciesSources(k, ctx);
    const shop = srcs.find((s) => s.kind === 'form_shop');
    assert.ok(shop, `${k} has a shop source`);
    assert.equal(shop.price, FORMS[k].source.price);
    assert.equal(shop.location, FORM_SHOPS[FORMS[k].source.shop].location);
  }
  const castform = computeSpeciesSources(351, ctx);
  assert.deepEqual(castform.find((s) => s.kind === 'has_forms').keys, ['351-1', '351-2', '351-3']);
  const deoxys = computeSpeciesSources(386, ctx);
  assert.ok(deoxys.some((s) => s.kind === 'roaming' && s.chance === 0.01 && s.level === 75));
  const wild = computeSpeciesSources(16, ctx).filter((s) => s.kind === 'wild');
  assert.ok(wild.length > 0 && wild.every((s) => s.chance > 0 && s.chance <= 1 && s.bucket));
  assert.ok(reachableSpecies([16, 17], { ...ctx, levelEvoMap: { 16: 17 } }).has(17));
  // Tooling: download map + audit tool consume form keys.
  const dl = R('tools/download_assets.py');
  assert.match(dl, /'351-1': 10013/);
  assert.match(dl, /'386-3': 10003/);
  assert.match(dl, /"\(\[\\d-\]\+\)"/, 'sprite table regex accepts "351-1" keys');
  const audit = R('tools/audit-unobtainable.mjs');
  assert.match(audit, /computeSpeciesSources/);
  assert.doesNotMatch(audit, /\[\[387, 351\]/, 'no hard-coded legacy form list');
  // Catch flow: uniqueness and dex marks compare species AND form.
  const catchSrc = R('src/application/combat/catch.js');
  assert.match(catchSrc, /const isDuplicate = isSpeciesOwnedReal\(e\);/);
  assert.match(catchSrc, /markDexCaught\(e, false\)/);
  assert.match(catchSrc, /createPoke\(e\.id, 1, wasShiny \|\| isSpeciesShiny\(sKey\), \{ form: e\.form \|\| 0 \}\)/);
});
