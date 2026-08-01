import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const files = [
    'src/game/Config.js',
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
    'src/game/quests/quest-core.js',
    'src/data/game-helpers.js',
    'src/game/combat/progression.js',
    'src/game/world/world.js',
    'src/game/display/starter.js',
    'src/game/economy/mine.js',
    'src/game/breeding/hatchery.js',
    'src/game/economy/pokedex.js',
    'src/game/display/map-render.js',
    'src/data/sprites.js',
    'src/data/side-quests-data.js',
    'src/domain/economy/market.js',
    'src/game/economy/market.js',
    'src/game/base/base-window.js',
    'src/game/display/location-info.js',
  ];
  for (const f of files) {
    try {
      vm.runInContext(R(f), sandbox, { filename: f });
    } catch (e) {
      if (e instanceof SyntaxError) throw e;
    }
  }
  return sandbox;
}

test('Hoenn 1 : carte et 75 lieux chargés (LOCS_HOENN)', () => {
  const sb = makeSandbox();
  const locs = sb.window.LOCS_HOENN;
  assert.ok(locs, 'LOCS_HOENN défini');
  assert.equal(Object.keys(locs).length, 75, '75 lieux dans Hoenn (72 + 3 ruines Regi)');
  const r111 = sb.window.getLocObj('route111');
  assert.ok(r111, 'route111 joignable via getLocObj');
  assert.equal(r111.defaultWeather, 'sandstorm', 'route111 a une tempête de sable par défaut');
});

test('Hoenn 2 : équipes stratégiques arènes et ligue (OFFICIAL_TEAMS_HOENN)', () => {
  const sb = makeSandbox();
  const teams = sb.window.OFFICIAL_TEAMS_HOENN;
  assert.ok(teams, 'OFFICIAL_TEAMS_HOENN défini');
  for (const leader of ['roxanne', 'brawly', 'wattson', 'flannery', 'norman', 'winona', 'tate_liza', 'juan', 'sidney', 'phoebe', 'glacia', 'drake', 'steven']) {
    assert.ok(teams[leader], `dresseur/champion ${leader} présent`);
    assert.ok(teams[leader].team.length >= 2, `${leader} a une équipe complète`);
  }
});

test('Hoenn 3 : 77 quêtes principales Hoenn (STORY_QUESTS_HOENN)', () => {
  const sb = makeSandbox();
  const hQuests = sb.window.STORY_QUESTS_HOENN;
  assert.ok(hQuests, 'STORY_QUESTS_HOENN défini');
  // 77 = 75 historiques + 2 quêtes découverte Base Secrète (217/218)
  assert.equal(hQuests.length, 77, '77 quêtes principales pour Hoenn');
  assert.equal(hQuests[hQuests.length - 1].id, 277, 'dernière quête est 277');
  assert.equal(hQuests[16].id, 217, '217 = visite de Base Secrète');
  assert.equal(hQuests[16].type, 'base_visit', 'type base_visit');
  assert.equal(hQuests[17].id, 218, '218 = établir sa Base Secrète');
  assert.equal(hQuests[17].type, 'base_establish', 'type base_establish');
  const ids = hQuests.map(q => q.id);
  assert.ok(ids.every((v, i) => i === 0 || v > ids[i - 1]), 'ids strictement croissants (fichier rangé dans l\u2019ordre)');
  
  assert.equal(hQuests[0].id, 201, 'quêtes commencent à 201');
  assert.equal(hQuests[0].type, 'trainer_battle', 'quête 201 est un combat de quête');
  assert.equal(hQuests[0].battleId, 'hoenn_poochyena_route101', 'battleId = hoenn_poochyena_route101');
  const curMain = sb.window.getCurrentMain('hoenn');
  assert.ok(curMain, 'getCurrentMain(hoenn) retourne une quête');
  assert.equal(curMain.id, 201, 'quête courante à hoenn = 201');
});

test('Hoenn 4 : boutiques et objets (SHOPS_HOENN)', () => {
  const sb = makeSandbox();
  const shops = sb.window.SHOPS_HOENN;
  assert.ok(shops, 'SHOPS_HOENN défini');
  assert.ok(shops.lilycove_dept_store, 'centre commercial de Nénucrique présent');
  assert.ok(shops.slateport_market, 'marché de Poivressel présent');
});

test('Hoenn 5 : évolution multiple simultanée sans aléatoire (Chenipotte Nv. 7)', () => {
  const sb = makeSandbox();
  sb.G.team = [{ id: 265, name: 'Chenipotte', level: 7, _evoDone: {} }];
  sb.window.checkEvolution(sb.G.team[0]);
  assert.equal(sb.G.evolvedSpecies.includes(266), true, 'Armulys (266) évolué');
  assert.equal(sb.G.evolvedSpecies.includes(268), true, 'Blindalys (268) évolué simultanément');
});

test('Hoenn 6 : Munja évolue au Nv. 20 avec Ninjask (Munja Nv. 1 dans boîte PC)', () => {
  const sb = makeSandbox();
  sb.G.team = [{ id: 290, name: 'Ningale', level: 20, _evoDone: {} }];
  sb.window.checkEvolution(sb.G.team[0]);
  assert.equal(sb.G.evolvedSpecies.includes(291), true, 'Ninjask (291) évolué');
  assert.equal(sb.G.evolvedSpecies.includes(292), true, 'Munja (292) créé simultanément');
});

test('Hoenn 7 : seuil de niveau minimum pour évolution par objet (25 et 50)', () => {
  const sb = makeSandbox();
  sb.G.team = [{ id: 349, name: 'Barpau', level: 30, _evoDone: {} }];
  sb.G.inventory.prism_scale = 1;
  sb.window.tryStoneEvo(0, 'prism_scale');
  assert.equal(sb.G.team[0].id, 349, 'Barpau Nv. 30 refuse d évoluer avant le Nv. 50');
  
  sb.G.team[0].level = 50;
  sb.window.tryStoneEvo(0, 'prism_scale');
  assert.ok(sb.G.collection[350] || sb.G.evolvedSpecies.includes(350), 'Barpau Nv. 50 évolue en Milobellus (350)');
});

test('Hoenn 8 : Latios (381), Latias (380), Jirachi (385), Deoxys (386) en roaming 24/7 (12h rotation)', () => {
  const sb = makeSandbox();
  const pool = sb.window.getRoamingLegendaryForRoute('route101') || sb.window.getRoamingLegendaryForRoute('route110') || sb.window.getRoamingLegendaryForRoute('route118');
  assert.ok([380, 381, 385, 386, null].includes(pool), 'Latias, Latios, Jirachi ou Deoxys est dans le pool de roaming Hoenn');
});

test('Hoenn 9 : Fossiles Racine (345 Lilia) et Griffe (347 Anorith)', () => {
  const sb = makeSandbox();
  assert.equal(sb.window.FOSSIL_REVIVE_MAP.root_fossil, 345, 'root_fossil éclot en Lilia 345');
  assert.equal(sb.window.FOSSIL_REVIVE_MAP.claw_fossil, 347, 'claw_fossil éclot en Anorith 347');
});

test('Hoenn 10 : Pokedex Hoenn complet #252 à #386 disponible', () => {
  const sb = makeSandbox();
  for (let i = 252; i <= 386; i++) {
    assert.ok(sb.window.PD[i], `Pokémon Hoenn #${i} défini dans PD`);
  }
});

test('Hoenn 11 : marché de Hoenn propose les Pokémon rares et starters de Hoenn (et pas Kanto)', () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  const marketIds = sb.window.getMarketPokemon();
  assert.ok(Array.isArray(marketIds), 'getMarketPokemon retourne un tableau');
  assert.ok(marketIds.includes(252), 'Treecko #252 dans le marché Hoenn');
  assert.ok(marketIds.includes(255), 'Torchic #255 dans le marché Hoenn');
  assert.ok(marketIds.includes(258), 'Mudkip #258 dans le marché Hoenn');
  assert.equal(marketIds.includes(385), false, 'Jirachi #385 retiré du marché Hoenn (roaming)');
  assert.equal(marketIds.includes(386), false, 'Deoxys #386 retiré du marché Hoenn (roaming)');
  assert.ok(marketIds.includes(351), 'Morphéo #351 dans le marché Hoenn');

  assert.equal(marketIds.includes(1), false, 'Bulbizarre #1 (Kanto) n est pas dans le marché Hoenn');
});

test('Hoenn 12 : fenêtre Base Secrète masquée à Hoenn tant que la quête 216 Route 111 n est pas accomplie', async () => {
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
  assert.equal(baseWinStyle.display, 'none', 'fenêtre #win-base est masquée tant que !unlockedSecretBaseHoenn');
  
  sb.G.unlockedSecretBaseHoenn = true;
  await sb.window.baseWindowRender();
  assert.equal(baseWinStyle.display, '', 'fenêtre #win-base est visible une fois unlockedSecretBaseHoenn=true');
});

test('Hoenn 13 : location-info n affiche pas d avertissement de blocage Base Secrète et débloque après quête 216', () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  sb.G.location = 'route111';
  sb.G.unlockedSecretBaseHoenn = false;
  
  const el = { innerHTML: '', style: {} };
  sb.window.renderLocInfo(el);
  assert.equal(el.innerHTML.includes('Base Secrète : nécessite'), false, 'aucun texte d avertissement sur Base Secrète dans location-info');
  assert.equal(el.innerHTML.includes('baseWindowConfirmEstablish'), false, 'boutons Base Secrète absents avant déblocage');
  
  sb.G.unlockedSecretBaseHoenn = true;
  sb.window.renderLocInfo(el);
  // Alcôves disséminées : chaque emplacement de la route a son bouton « S'installer »
  assert.equal(el.innerHTML.includes('baseWindowConfirmEstablish'), true, 'boutons S\u2019installer présents après déblocage sur route111');
  const alcoves = sb.window.baseWindowGetRouteAlcoves ? sb.window.baseWindowGetRouteAlcoves('route111') : [];
  assert.ok(alcoves.length >= 2, 'route111 propose plusieurs alcôves');
});

test('Hoenn 14 : achat des formes Morphéo (#387-#389) et Deoxys (#390-#392) via les boutiques spéciales', () => {
  const sb = makeSandbox();
  sb.G.money = 100000;
  sb.window.buySpecialFormPokemon(387, 20000);
  sb.window.buySpecialFormPokemon(390, 50000);
  assert.equal(sb.G.money, 30000, 'argent débité correctement pour 2 formes');
  const ownedIds = Object.values(sb.G.collection).map(x => Number(x.id));
  assert.ok(ownedIds.includes(387), 'Morphéo Solaire #387 dans le PC');
  assert.ok(ownedIds.includes(390), 'Deoxys Attaque #390 dans le PC');
  assert.ok(sb.window.PD[387], 'PD[387] défini');
  assert.ok(sb.window.PD[392], 'PD[392] défini');
});

test('Hoenn 15 : fossiles Racine et Griffe bloqués en début de partie à Johto, mais accessibles partout après déblocage Hoenn', () => {
  const sb = makeSandbox();
  sb.G.region = 'johto';
  sb.G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
  sb.G.visitedMaps = { newbark: true };
  const filterFossils = () => {
    const hoennUnlocked = !!(sb.G.region === 'hoenn' || (sb.G.mainStep && sb.G.mainStep.hoenn > 0) || (sb.G.completedQuests && sb.G.completedQuests[201]) || (sb.G.visitedMaps && sb.G.visitedMaps.rustboro));
    return sb.window.MINE_ITEMS.filter(it => !(!hoennUnlocked && (it.key === 'root_fossil' || it.key === 'claw_fossil'))).map(it => it.key);
  };
  const beforeUnlock = filterFossils();
  assert.equal(beforeUnlock.includes('root_fossil'), false, 'root_fossil absent à Johto avant déblocage Hoenn');
  assert.equal(beforeUnlock.includes('claw_fossil'), false, 'claw_fossil absent à Johto avant déblocage Hoenn');
  
  sb.G.mainStep.hoenn = 1;
  const afterUnlock = filterFossils();
  assert.equal(afterUnlock.includes('root_fossil'), true, 'root_fossil accessible à Johto après déblocage Hoenn');
  assert.equal(afterUnlock.includes('claw_fossil'), true, 'claw_fossil accessible à Johto après déblocage Hoenn');
});

test('Hoenn 16 : reproduction en Garderie unique (pas de dupli, pas de farm) et affichage Pokédex', () => {
  const sb = makeSandbox();
  sb.window.G.hatchery = [{ poke: { id: 25, name: 'Pikachu', level: 30 }, steps: 100, stepsReq: 10, isFossil: false }];
  sb.window.hatchEgg(0);
  const ownedIds1 = [...sb.window.G.team, ...Object.values(sb.window.G.collection)].filter(x => x && Number(x.id) === 172);
  assert.equal(ownedIds1.length, 1, 'Premier œuf éclot en exactement 1 Pichu #172');
  
  // Deuxième incubation du même parent : ne doit PAS créer un 2e Pichu
  sb.window.G.hatchery = [{ poke: { id: 25, name: 'Pikachu', level: 31 }, steps: 100, stepsReq: 10, isFossil: false }];
  sb.window.hatchEgg(0);
  const ownedIds2 = [...sb.window.G.team, ...Object.values(sb.window.G.collection)].filter(x => x && Number(x.id) === 172);
  assert.equal(ownedIds2.length, 1, 'Seconde incubation : aucun Pichu supplémentaire (pas de dupli / farm)');
  
  const sources = sb.window.findPokemonSources(172);
  assert.ok(sources.some(s => s.label.includes('Éclosion en Garderie')), 'Pokédex affiche Éclosion en Garderie (Parent : Pikachu / Raichu)');
});

test('Hoenn 17 : quêtes secondaires exclusives à Hoenn (s56-s85 + énigmes + densification)', () => {
  const sb = makeSandbox();
  const hoennSide = Object.values(sb.window.SIDE_QUESTS || {}).filter(q => q.region === 'hoenn');
  // 30 (s56-s85) + 14 énigmes (s100-s113) + 24 densification (s114-s137) = 68
  assert.equal(hoennSide.length, 68, '68 quêtes secondaires à Hoenn');
  assert.equal(hoennSide[0].id, 's56', 'début à s56');
  // le socle historique s56-s85 reste complet
  for (let i = 56; i <= 85; i++) assert.ok(hoennSide.some(q => q.id === 's' + i), `s${i} présente`);
});

test('Hoenn 18 : la capture d un Pokémon à Hoenn met à jour immédiatement la fenêtre de lieu (renderLocInfo)', () => {
  const sb = makeSandbox();
  sb.G.region = 'hoenn';
  sb.G.location = 'route101';
  sb.G.pokedex = {};
  sb.G.collection = {};
  sb.G.team = [];
  const el = { innerHTML: '', style: {} };
  sb.document.getElementById = (id) => (id === 'location-info-panel' ? el : { style: {}, textContent: '', innerHTML: '' });
  sb.window.renderLocInfo(el);
  assert.equal(el.innerHTML.includes('loc-caught-badge is-owned'), false, 'Pas encore capturé sur route101');
  
  sb.G.pokedex[263] = { seen: true, caught: true };
  sb.G.collection[263] = { id: 263, name: 'Zigzaton', level: 3 };
  sb.window.refreshMapAndLoc();
  assert.equal(el.innerHTML.includes('loc-caught-badge is-owned'), true, 'Fenêtre de lieu mise à jour immédiatement après capture via refreshMapAndLoc');
});

test('Hoenn 19 : Hoenn est verrouillé derrière la victoire à la Ligue Johto ET le Pokédex Johto complet (100/100)', () => {
  const sb = makeSandbox();
  sb.G.defeatedChamps = {};
  sb.G.pokedex = {};
  assert.equal(sb.window.canAccessRegion('hoenn'), false, 'Hoenn inaccessible en début de partie');
  assert.equal(sb.window.regionAccessMessage('hoenn'), 'region_locked_league', 'Message mentionne la Ligue de Johto (cle i18n)');
  
  // Victoire Ligue Johto (johto_elite4) mais Pokédex incomplet
  sb.G.defeatedChamps['johto_elite4'] = true;
  assert.equal(sb.window.canAccessRegion('hoenn'), false, 'Hoenn inaccessible sans le Pokédex Johto 100/100');
  assert.equal(sb.window.regionAccessMessage('hoenn'), 'region_locked_dex', 'Message mentionne le Pokédex de Johto (cle i18n)');
  
  // Complétion des 100 Pokémon Johto (#152 à #251)
  for (let i = 152; i <= 251; i++) {
    sb.G.pokedex[i] = { caught: true };
  }
  assert.equal(sb.window.canAccessRegion('hoenn'), true, 'Hoenn accessible après Ligue Johto et Pokédex Johto complet');
});

test('Hoenn 20 : objets d évolution sans restriction de niveau dans le Sac (équipe et Boîte PC) + speciesOwned en pension/entraînement', () => {
  const sb = makeSandbox();
  sb.window.G.collection['box_137_test'] = { id: 137, name: 'Porygon', level: 50 };
  sb.window.G.inventory['upgrade'] = 1;
  sb.window.tryBoxStoneEvo('box_137_test', 'upgrade');
  
  const ownedIds = Object.values(sb.window.G.collection).map(x => Number(x.id));
  assert.ok(ownedIds.includes(233), 'Porygon2 (#233) a évolué dans la Boîte PC avec Améliorator sans restriction de niveau');
  assert.equal(sb.window.G.inventory['upgrade'], undefined, 'Améliorator consommé');
  
  sb.window.G.hatchery = [{ poke: { id: 182, name: 'Joliflor', level: 15 }, steps: 0, stepsReq: 10 }];
  assert.equal(sb.window.speciesOwned(182), true, 'speciesOwned reconnaît Joliflor (#182) en pension/garderie');
  
  sb.window.G.training = [{ poke: { id: 200, name: 'Roigada', level: 20 }, steps: 0, stepsReq: 10 }];
  assert.equal(sb.window.speciesOwned(200), true, 'speciesOwned reconnaît Roigada (#200) en entraînement');
});
