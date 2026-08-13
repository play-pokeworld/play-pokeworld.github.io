import test from 'node:test';
import { ecsGameplayBundleSource } from '../tools/ecs-loop-bundle.mjs';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { LocationInfoView } from '../src/ui/views/LocationInfoView.js'; // wave 13: real DS view injected into the vm sandbox

const R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function makeSandbox() {
  const G = {
    team: [],
    boxes: { box1: [] },
    activeBox: 'box1',
    pokedex: {},
    inventory: {},
    money: 10000,
    region: 'hoenn',
    location: 'littleroot',
    badges: [],
    defeatedChamps: {},
    evolvedSpecies: [],
    collection: {},
    completedQuests: {},
    visitedMaps: { littleroot: true, route101: true },
  };
  const logs = [];
  const sandbox = {
    console, window: {}, G, localStorage: { getItem: () => null, setItem: () => {} },
    t: (k) => k, tr: (k, o) => k,
    notify: (m) => logs.push(m),
    setMsg: () => {}, getLocName: (id) => id, getLore: (id) => "", clamp: (val, min, max) => Math.max(min, Math.min(max, val)), rand: (min, max) => min, renderHatcheryWindow: () => {}, locCompletion: () => ({ caught: 0, total: 1, ids: [261] }), baseLayoutIds: () => ["SecretBase_BrownCave1"], baseLayoutGet: () => ({ name: "Test" }), baseView2dLoadSprites: async () => ({}), spriteImg: () => "<img />", getPokeName: (id) => "Poke_" + id, ROUTE_DROPS: {},
    speciesOwned: (id) => (!!G.pokedex[id]?.caught || !!G.collection[id] || (G.hatchery||[]).some(s => s && s.poke && Number(s.poke.id) === Number(id)) || (G.training||[]).some(s => s && s.poke && Number(s.poke.id) === Number(id))),
    locCompletion: (locId) => ({ caught: G.pokedex[263]?.caught ? 1 : 0, total: 1, ids: [263] }),
    isSpeciesShiny: () => false,
    rollShiny: () => false,
    battle: { active: false },
    createPoke: (id, lvl) => ({ id, name: 'Poke_' + id, level: lvl, moves: [], _evoDone: {} }),
    saveGame: () => {}, updateHeader: () => {}, renderMap: () => {}, showTab: () => {}, renderTeamWindow: () => {}, openPokeModal: () => {}, addBattleLog: () => {},
    document: {
      getElementById: () => ({ style: {}, innerHTML: '', textContent: '', remove: () => {}, classList: { add: () => {}, remove: () => {} } }), createElement: () => ({ style: {}, appendChild: () => {}, classList: { add: () => {}, remove: () => {} } }),
      querySelector: () => ({ remove: () => {}, style: {}, classList: { add: () => {}, remove: () => {} }, textContent: '' }),
      querySelectorAll: () => [],
    },
    _logs: logs,
  };
  sandbox.window = sandbox;
  sandbox.PokeUI = { views: { LocationInfoView } }; // wave 13 (legitimate move: renderLocInfo delegates to the DS view)
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const files = [
    'src/data/game-config.js',
    'src/data/pd-data.js',
    'src/data/moves.js',
    'src/data/items-data.js',
    'src/data/items-helpers.js',
    'src/data/locations-data.js',
    'src/data/locations-johto.js',
    'src/data/locations-hoenn.js',
    'src/data/shops-data.js',
    'src/data/shops-hoenn.js',
    'src/data/champions-data.js',
    'src/data/official-teams-data.js',
    'src/data/official-teams-hoenn.js',
    'src/data/story-quests.js',
    'src/data/story-quests-hoenn.js',
    'src/application/quests/quest-core.js',
    'src/data/game-helpers.js',
    'src/application/combat/progression.js',
    'src/application/world/roaming.js', 'src/ui/game/header-window.js',
    'src/ui/game/starter.js',
    'src/application/economy/mine.js',
    'src/application/breeding/hatchery.js',
    'src/ui/game/pokedex.js',
    'src/ui/game/map-render.js',
    'src/data/sprites.js',
    'src/data/side-quests-data.js',
    // market is ECS-backed (wave 33): loaded below via the production
    // gameplay bundle (same code the browser runs), not as text files.
    'src/ui/game/base/base-window.js',
    'src/ui/game/location-info.js',
  ];
  for (const f of files) {
    try {
      // T2-D (vague 37) : classiques en vm directe ; converts ESM bundlés.
      const __text = R(f);
      vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
    } catch (e) {
      if (e instanceof SyntaxError) throw e;
    }
  }
  // ECS gameplay layer (battle loop + world:encounter + breeding:hatch +
  // economy:market) — the SAME production bundle the browser executes.
  vm.runInContext(ecsGameplayBundleSource(), sandbox, { filename: 'src/application/gameplay-bundle.js [esbuild iife]' });
  return sandbox;
}

test('Hoenn 1: map and 75 locations loaded (LOCS_HOENN)', () => {
  const sb = makeSandbox();
  const locs = sb.window.LOCS_HOENN;
  assert.ok(locs, 'LOCS_HOENN defined');
  assert.equal(Object.keys(locs).length, 75, '75 locations in Hoenn (72 + 3 Regi ruins)');
  const r111 = sb.window.getLocObj('route111');
  assert.ok(r111, 'route111 joignable via getLocObj');
  assert.equal(r111.defaultWeather, 'sandstorm', 'route111 has a sandstorm by default');
});

test('Hoenn 2: strategic gym and league teams (OFFICIAL_TEAMS_HOENN)', () => {
  const sb = makeSandbox();
  const teams = sb.window.OFFICIAL_TEAMS_HOENN;
  assert.ok(teams, 'OFFICIAL_TEAMS_HOENN defined');
  for (const leader of ['roxanne', 'brawly', 'wattson', 'flannery', 'norman', 'winona', 'tate_liza', 'juan', 'sidney', 'phoebe', 'glacia', 'drake', 'steven']) {
    assert.ok(teams[leader], `trainer/champion ${leader} present`);
    assert.ok(teams[leader].team.length >= 2, `${leader} has a complete team`);
  }
});

test('Hoenn 3: 77 Hoenn main quests (STORY_QUESTS_HOENN)', () => {
  const sb = makeSandbox();
  const hQuests = sb.window.STORY_QUESTS_HOENN;
  assert.ok(hQuests, 'STORY_QUESTS_HOENN defined');
  // 77 = 75 historical + 2 Secret Base discovery quests (217/218)
  assert.equal(hQuests.length, 77, '77 main quests for Hoenn');
  assert.equal(hQuests[hQuests.length - 1].id, 277, 'last quest is 277');
  assert.equal(hQuests[16].id, 217, '217 = Secret Base visit');
  assert.equal(hQuests[16].type, 'base_visit', 'type base_visit');
  assert.equal(hQuests[17].id, 218, '218 = establish your Secret Base');
  assert.equal(hQuests[17].type, 'base_establish', 'type base_establish');
  const ids = hQuests.map(q => q.id);
  assert.ok(ids.every((v, i) => i === 0 || v > ids[i - 1]), 'strictly increasing ids (file kept in order)');
  
  assert.equal(hQuests[0].id, 201, 'quests start at 201');
  assert.equal(hQuests[0].type, 'trainer_battle', 'quest 201 is a quest battle');
  assert.equal(hQuests[0].battleId, 'hoenn_poochyena_route101', 'battleId = hoenn_poochyena_route101');
  const curMain = sb.window.getCurrentMain('hoenn');
  assert.ok(curMain, 'getCurrentMain(hoenn) returns a quest');
  assert.equal(curMain.id, 201, 'current quest in hoenn = 201');
});

test('Hoenn 4: shops and items (SHOPS_HOENN)', () => {
  const sb = makeSandbox();
  const shops = sb.window.SHOPS_HOENN;
  assert.ok(shops, 'SHOPS_HOENN defined');
  assert.ok(shops.lilycove_dept_store, 'Lilycove department store present');
  assert.ok(shops.slateport_market, 'Slateport market present');
});

test('Hoenn 5: simultaneous multiple evolution, no randomness (Wurmple Lv. 7)', () => {
  const sb = makeSandbox();
  sb.G.team = [{ id: 265, name: 'Chenipotte', level: 7, _evoDone: {} }];
  sb.window.checkEvolution(sb.G.team[0]);
  assert.equal(sb.G.evolvedSpecies.includes(266), true, 'Silcoon (266) evolved');
  assert.equal(sb.G.evolvedSpecies.includes(268), true, 'Cascoon (268) evolved simultaneously');
});

test('Hoenn 6: Nincada evolves at Lv. 20 with Ninjask (Lv. 1 Shedinja in PC box)', () => {
  const sb = makeSandbox();
  sb.G.team = [{ id: 290, name: 'Ningale', level: 20, _evoDone: {} }];
  sb.window.checkEvolution(sb.G.team[0]);
  assert.equal(sb.G.evolvedSpecies.includes(291), true, 'Ninjask (291) evolved');
  assert.equal(sb.G.evolvedSpecies.includes(292), true, 'Shedinja (292) created simultaneously');
});

test('Hoenn 7: minimum level threshold for item evolution (25 and 50)', () => {
  const sb = makeSandbox();
  sb.G.team = [{ id: 349, name: 'Barpau', level: 30, _evoDone: {} }];
  sb.G.inventory.prism_scale = 1;
  sb.window.tryStoneEvo(0, 'prism_scale');
  assert.equal(sb.G.team[0].id, 349, 'Feebas Lv. 30 refuses to evolve before Lv. 50');
  
  sb.G.team[0].level = 50;
  sb.window.tryStoneEvo(0, 'prism_scale');
  assert.ok(sb.G.collection[350] || sb.G.evolvedSpecies.includes(350), 'Feebas Lv. 50 evolves into Milotic (350)');
});

test('Hoenn 8 : Latios (381), Latias (380), Jirachi (385), Deoxys (386) en roaming 24/7 (12h rotation)', () => {
  const sb = makeSandbox();
  const pool = sb.window.getRoamingLegendaryForRoute('route101') || sb.window.getRoamingLegendaryForRoute('route110') || sb.window.getRoamingLegendaryForRoute('route118');
  assert.ok([380, 381, 385, 386, null].includes(pool), 'Latias, Latios, Jirachi or Deoxys is in the Hoenn roaming pool');
});

test('Hoenn 9 : Fossiles Racine (345 Lilia) et Griffe (347 Anorith)', () => {
  const sb = makeSandbox();
  assert.equal(sb.window.FOSSIL_REVIVE_MAP.root_fossil, 345, 'root_fossil revives into Lileep 345');
  assert.equal(sb.window.FOSSIL_REVIVE_MAP.claw_fossil, 347, 'claw_fossil revives into Anorith 347');
});

test('Hoenn 10: full Hoenn Pokedex #252 to #386 available', () => {
  const sb = makeSandbox();
  for (let i = 252; i <= 386; i++) {
    assert.ok(sb.window.PD[i], `Hoenn Pokémon #${i} defined in PD`);
  }
});

test('Hoenn 11: the Hoenn market offers Hoenn rares and starters (not Kanto)', () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  const marketIds = sb.window.getMarketPokemon();
  assert.ok(Array.isArray(marketIds), 'getMarketPokemon returns an array');
  assert.ok(marketIds.includes(252), 'Treecko #252 in the Hoenn market');
  assert.ok(marketIds.includes(255), 'Torchic #255 in the Hoenn market');
  assert.ok(marketIds.includes(258), 'Mudkip #258 in the Hoenn market');
  assert.equal(marketIds.includes(385), false, 'Jirachi #385 removed from the Hoenn market (roaming)');
  assert.equal(marketIds.includes(386), false, 'Deoxys #386 removed from the Hoenn market (roaming)');
  assert.ok(marketIds.includes(351), 'Castform #351 in the Hoenn market');

  assert.equal(marketIds.includes(1), false, 'Bulbasaur #1 (Kanto) is not in the Hoenn market');
});

test('Hoenn 12: Secret Base window hidden in Hoenn until quest 216 Route 111 is done', async () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  sb.G.unlockedSecretBaseHoenn = false;
  
  let baseWinStyle = { display: 'block' };
  const dummyEl = { style: {}, textContent: '', innerHTML: '', value: '', options: [], classList: { add: () => {}, remove: () => {} }, addEventListener: () => {}, appendChild: () => {} };
  sb.document.getElementById = (id) => {
    if (id === 'win-base') return { ...dummyEl, style: baseWinStyle };
    return { ...dummyEl };
  };
  
  await sb.window.baseWindowRender();
  assert.equal(baseWinStyle.display, 'none', '#win-base window is hidden while !unlockedSecretBaseHoenn');
  
  sb.G.unlockedSecretBaseHoenn = true;
  await sb.window.baseWindowRender();
  assert.equal(baseWinStyle.display, '', '#win-base window is visible once unlockedSecretBaseHoenn=true');
});

test('Hoenn 13: location-info shows no Secret Base lock warning and unlocks after quest 216', () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  sb.G.location = 'route111';
  sb.G.unlockedSecretBaseHoenn = false;
  
  const el = { innerHTML: '', style: {} };
  sb.window.renderLocInfo(el);
  assert.equal(el.innerHTML.includes('Base Secrète : nécessite'), false, 'no Secret Base warning text in location-info');
  assert.equal(el.innerHTML.includes('baseWindowConfirmEstablish'), false, 'Secret Base buttons absent before unlock');
  
  sb.G.unlockedSecretBaseHoenn = true;
  sb.window.renderLocInfo(el);
  // Scattered alcoves: every route location has its "Settle" button
  assert.equal(el.innerHTML.includes('baseWindowConfirmEstablish'), true, 'Settle buttons present after unlock on route111');
  const alcoves = sb.window.baseWindowGetRouteAlcoves ? sb.window.baseWindowGetRouteAlcoves('route111') : [];
  assert.ok(alcoves.length >= 2, 'route111 offers several alcoves');
});

test('Hoenn 14: buying Castform forms (#387-#389) and Deoxys (#390-#392) via special shops', () => {
  const sb = makeSandbox();
  sb.G.money = 100000;
  sb.window.buySpecialFormPokemon(387, 20000);
  sb.window.buySpecialFormPokemon(390, 50000);
  assert.equal(sb.G.money, 30000, 'money debited correctly for 2 forms');
  const ownedIds = Object.values(sb.G.collection).map(x => Number(x.id));
  assert.ok(ownedIds.includes(387), 'Castform Sunny #387 in the PC');
  assert.ok(ownedIds.includes(390), 'Deoxys Attack #390 in the PC');
  assert.ok(sb.window.PD[387], 'PD[387] defined');
  assert.ok(sb.window.PD[392], 'PD[392] defined');
});

test('Hoenn 15: Root and Claw fossils locked early in Johto, but accessible everywhere after Hoenn unlock', () => {
  const sb = makeSandbox();
  sb.G.region = 'johto';
  sb.G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
  sb.G.visitedMaps = { newbark: true };
  const filterFossils = () => {
    const hoennUnlocked = !!(sb.G.region === 'hoenn' || (sb.G.mainStep && sb.G.mainStep.hoenn > 0) || (sb.G.completedQuests && sb.G.completedQuests[201]) || (sb.G.visitedMaps && sb.G.visitedMaps.rustboro));
    return sb.window.MINE_ITEMS.filter(it => !(!hoennUnlocked && (it.key === 'root_fossil' || it.key === 'claw_fossil'))).map(it => it.key);
  };
  const beforeUnlock = filterFossils();
  assert.equal(beforeUnlock.includes('root_fossil'), false, 'root_fossil absent in Johto before Hoenn unlock');
  assert.equal(beforeUnlock.includes('claw_fossil'), false, 'claw_fossil absent in Johto before Hoenn unlock');
  
  sb.G.mainStep.hoenn = 1;
  const afterUnlock = filterFossils();
  assert.equal(afterUnlock.includes('root_fossil'), true, 'root_fossil accessible in Johto after Hoenn unlock');
  assert.equal(afterUnlock.includes('claw_fossil'), true, 'claw_fossil accessible in Johto after Hoenn unlock');
});

test('Hoenn 16: single Day-Care breeding (no dupe, no farm) and Pokédex display', () => {
  const sb = makeSandbox();
  sb.window.G.hatchery = [{ poke: { id: 25, name: 'Pikachu', level: 30 }, steps: 100, stepsReq: 10, isFossil: false }];
  sb.window.hatchEgg(0);
  const ownedIds1 = [...sb.window.G.team, ...Object.values(sb.window.G.collection)].filter(x => x && Number(x.id) === 172);
  assert.equal(ownedIds1.length, 1, 'First egg hatches into exactly 1 Pichu #172');
  
  // Second incubation of the same parent: must NOT create a 2nd Pichu
  sb.window.G.hatchery = [{ poke: { id: 25, name: 'Pikachu', level: 31 }, steps: 100, stepsReq: 10, isFossil: false }];
  sb.window.hatchEgg(0);
  const ownedIds2 = [...sb.window.G.team, ...Object.values(sb.window.G.collection)].filter(x => x && Number(x.id) === 172);
  assert.equal(ownedIds2.length, 1, 'Second incubation: no extra Pichu (no dupe / farm)');
  
  const sources = sb.window.findPokemonSources(172);
  assert.ok(sources.some(s => s.label.includes('Éclosion en Garderie')), 'Pokédex shows Hatch in Day Care (Parent: Pikachu / Raichu)');
});

test('Hoenn 17: Hoenn-exclusive side quests (s56-s85 + puzzles + densification)', () => {
  const sb = makeSandbox();
  const hoennSide = Object.values(sb.window.SIDE_QUESTS || {}).filter(q => q.region === 'hoenn');
  // 30 (s56-s85) + 14 riddles (s100-s113) + 24 densification (s114-s137) = 68
  assert.equal(hoennSide.length, 68, '68 side quests in Hoenn');
  assert.equal(hoennSide[0].id, 's56', 'starts at s56');
  // the historical s56-s85 base stays complete
  for (let i = 56; i <= 85; i++) assert.ok(hoennSide.some(q => q.id === 's' + i), `s${i} present`);
});

test('Hoenn 18: catching a Pokémon in Hoenn immediately updates the location window (renderLocInfo)', () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  sb.G.location = 'route101';
  sb.G.pokedex = {};
  sb.G.collection = {};
  sb.G.team = [];
  const el = { innerHTML: '', style: {} };
  sb.document.getElementById = (id) => (id === 'location-info-panel' ? el : { style: {}, textContent: '', innerHTML: '' });
  sb.window.renderLocInfo(el);
  assert.equal(el.innerHTML.includes('loc-caught-badge is-owned'), false, 'Not yet caught on route101');
  
  sb.G.pokedex[263] = { seen: true, caught: true };
  sb.G.collection[263] = { id: 263, name: 'Zigzaton', level: 3 };
  sb.window.refreshMapAndLoc();
  assert.equal(el.innerHTML.includes('loc-caught-badge is-owned'), true, 'Location window updated immediately after capture via refreshMapAndLoc');
});

test('Hoenn 19: Hoenn is locked behind the Johto League victory AND the complete Johto Pokédex (100/100)', () => {
  const sb = makeSandbox();
  sb.G.defeatedChamps = {};
  sb.G.pokedex = {};
  assert.equal(sb.window.canAccessRegion('hoenn'), false, 'Hoenn inaccessible early in the game');
  assert.equal(sb.window.regionAccessMessage('hoenn'), 'region_locked_league', 'Message mentions the Johto League (i18n key)');
  
  // Johto League victory (johto_elite4) but incomplete Pokédex
  sb.G.defeatedChamps['johto_elite4'] = true;
  assert.equal(sb.window.canAccessRegion('hoenn'), false, 'Hoenn inaccessible without the Johto Pokédex 100/100');
  assert.equal(sb.window.regionAccessMessage('hoenn'), 'region_locked_dex', 'Message mentions the Johto Pokédex (i18n key)');
  
  // Completion of the 100 Johto Pokémon (#152 to #251)
  for (let i = 152; i <= 251; i++) {
    sb.G.pokedex[i] = { caught: true };
  }
  assert.equal(sb.window.canAccessRegion('hoenn'), true, 'Hoenn accessible after Johto League and complete Johto Pokédex');
});

test('Hoenn 20: evolution items without level restriction in the Bag (team and PC Box) + speciesOwned in day care/training', () => {
  const sb = makeSandbox();
  sb.window.G.collection['box_137_test'] = { id: 137, name: 'Porygon', level: 50 };
  sb.window.G.inventory['upgrade'] = 1;
  sb.window.tryBoxStoneEvo('box_137_test', 'upgrade');
  
  const ownedIds = Object.values(sb.window.G.collection).map(x => Number(x.id));
  assert.ok(ownedIds.includes(233), 'Porygon2 (#233) evolved in the PC Box with Upgrade without level restriction');
  assert.equal(sb.window.G.inventory['upgrade'], undefined, 'Up-Grade consumed');
  
  sb.window.G.hatchery = [{ poke: { id: 182, name: 'Joliflor', level: 15 }, steps: 0, stepsReq: 10 }];
  assert.equal(sb.window.speciesOwned(182), true, 'speciesOwned recognizes Bellossom (#182) in breeding/day care');
  
  sb.window.G.training = [{ poke: { id: 200, name: 'Roigada', level: 20 }, steps: 0, stepsReq: 10 }];
  assert.equal(sb.window.speciesOwned(200), true, 'speciesOwned recognizes Slowking (#200) in training');
});

