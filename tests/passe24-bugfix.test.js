import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 24 : correctifs des 8 bugs remontés en jeu ────────────────────
//  #1 talents absents des fiches (casse camelCase vs moteur minuscules)
//  #3 atelier talent/caché jamais débloqué (badge 'elite4' jamais inscrit)
//  #4 slots d'entraînement asymétriques + auto « tout faire » sur sessions verrouillées
//  #5 clic droit du sac en mode « équiper » sans fiche objet
//  #6 Usine : pas d'écran pré-combat pour réorganiser l'équipe prêtée
//  #7 ajout d'équipe pas toujours en fin (index de swap résiduel)
//  #8 i18n : descs attaques/talents, types, couleurs de statuts, immunités tronquées
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const notifications = [];
  const sandbox = {
    console, window: {},
    document: { getElementById: () => null, querySelectorAll: () => [] },
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {},
      unlockedTalents: {}, lang: 'fr', badges: [], defeatedChamps: {},
    },
    rand: (a, b) => a, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (msg, color) => notifications.push(String(msg)),
    saveGame: () => {}, setMsg: () => {}, addBattleLog: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {}, renderTrainingBattlePanel: () => {}, renderTrainingWindow: () => {},
    addStaffXp: () => {},
    _notifications: notifications,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js',
    'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/game/core/pokemon-factory.js',
    'src/data/atoll-sets-data.js', 'src/game/world/atoll-core.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js',
    'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js',
    'src/engine/data/badge-helper.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/game/combat/training.js',
    'src/game/display/team-manage.js',
    'src/game/display/fullscreen-panel.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}
const sb = makeSandbox();
const join = (a) => Array.from(a).join(',');

// ————————————————————————— #1 —————————————————————————
test('passe 24 #1 : pools de talents 100 % minuscules et couverts par TALENTS_FULL', () => {
  let bad = 0, pools = 0;
  for (const [id, list] of Object.entries(sb.POKE_TALENTS)) {
    pools++;
    for (const tal of list) {
      if (tal !== tal.toLowerCase() || !sb.TALENTS_FULL[tal]) bad++;
    }
  }
  assert.equal(pools, 251, 'un pool de talents par espèce (Kanto+Johto)');
  assert.equal(bad, 0, 'aucun id camelCase ni hors TALENTS_FULL dans les pools');
  let badHidden = 0, hiddenCount = 0;
  for (const [id, rec] of Object.entries(sb.POKEMON_TALENTS)) {
    if (!rec || !rec.hiddenAbility) continue;
    hiddenCount++;
    if (rec.hiddenAbility !== rec.hiddenAbility.toLowerCase() || !sb.TALENTS_FULL[rec.hiddenAbility]) badHidden++;
  }
  assert.ok(hiddenCount > 200, 'talents cachés définis par espèce');
  assert.equal(badHidden, 0, 'talents cachés normalisés et résolubles');
  // Sets curés : plus aucun talent camelCase épinglé (source)
  assert.ok(!/talent:\s*'[a-z]+[A-Z][A-Za-z]*'/.test(R('src/data/official-teams-data.js')), 'official teams : talents normalisés');
  assert.ok(!/\[\s*'[a-z]+[A-Z][A-Za-z]*',/.test(R('src/data/atoll-sets-data.js')), 'sets atoll : talents normalisés');
});

test('passe 24 #1 : résolution tolérante à la casse (vieilles sauvegardes)', () => {
  assert.ok(sb.getTalentRecord('waterAbsorb'), 'getTalentRecord résout un id camelCase hérité');
  assert.equal(sb.getTalentRecord('waterabsorb'), sb.TALENTS_FULL.waterabsorb);
  assert.equal(sb.getTalentName('waterAbsorb'), sb.getTalentName('waterabsorb'), 'nom identique quelle que soit la casse');
  assert.ok(sb.getTalentDesc('insomnia').includes('sommeil'), 'desc FR complète (insomnia → sommeil)');
  assert.equal(sb.getTalentDesc('immunity'), 'Immunisé contre le poison.');
  for (const [k, rec] of Object.entries(sb.TALENTS_FULL)) {
    assert.ok(!/immunity to$|on  weather|inflict  |from  /.test(rec.info || ''), `info réparée : ${k}`);
  }
});

test('passe 24 #1 : createPoke attribue toujours un talent valide', () => {
  for (const id of [1, 4, 7, 25, 94, 130, 131, 143, 149, 150, 212, 248]) {
    const p = sb.createPoke(id, 5);
    assert.ok(p && p.talent, `espèce ${id} : talent attribué`);
    assert.ok(sb.getSpeciesTalents(id).includes(p.talent), `espèce ${id} : talent issu du pool (${p.talent})`);
    assert.ok(sb.getTalentRecord(p.talent), `espèce ${id} : talent résoluble dans TALENTS_FULL (${p.talent})`);
  }
});

// ————————————————————————— #3 —————————————————————————
test('passe 24 #3 : l\'atelier talent/caché se débloque avec la Ligue', () => {
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = {};
  sb.G.badges = [];
  assert.equal(sb.isTrainingModeUnlocked('talent'), false, 'verrouillé avant la Ligue');
  assert.equal(sb.isTrainingModeUnlocked('hidden'), false, 'talent caché verrouillé avant la Ligue');
  sb.G.championTitle = true; // ce que markRegionLeagueWon inscrit à la victoire
  assert.equal(sb.isTrainingModeUnlocked('talent'), true, 'débloqué après victoire Ligue (sans badge elite4)');
  assert.equal(sb.isTrainingModeUnlocked('hidden'), true, 'talent caché débloqué après la Ligue');
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = { johto: true };
  assert.equal(sb.isTrainingModeUnlocked('talent'), true, 'débloqué via la Ligue Johto aussi');
  sb.G.regionLeagueWon = {};
});

// ————————————————————————— #4 —————————————————————————
test('passe 24 #4 : le mode auto « tout faire » saute les sessions verrouillées', () => {
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = {};
  sb.G.badges = ['blaine', 'giovanni']; // level + ev débloqués, talents NON
  const p = sb.createPoke(7, 5); // Carapuce : talents entraînables + EV + niveaux
  const autoAll = { mode: 'all', enabled: true, queue: [] };
  const resolved = sb.resolveTrainingAutoMode(p, autoAll);
  assert.ok(resolved !== 'talent' && resolved !== 'hidden', `sans la Ligue, « tout faire » ne lance pas l'atelier (reçu: ${resolved})`);
  assert.ok(['move', 'ev', 'level'].includes(resolved), 'il passe à l\'entraînement suivant débloqué');
  sb.G.championTitle = true;
  if (sb.getTrainableTalents(p).length > 0) {
    assert.equal(sb.resolveTrainingAutoMode(p, autoAll), 'talent', 'avec la Ligue, « tout faire » commence par les talents');
  }
  // Lancement d'une session verrouillée : refus propre
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = {}; // NB : la Ligue gagnée pendant le test a persisté l'état (sémantique voulue)
  sb.G.trainingSlots = [{ uid: null, loc: null, idStr: null, active: false }];
  sb.setTrainingSlotPokemon(0, 'box', 'sq1', (sb.G.collection.sq1 = p));
  const before = sb._notifications.length;
  assert.equal(sb.startTrainingBattle('talent', 0), false, 'startTrainingBattle verrouillé → refus');
  assert.ok(sb._notifications.length > before, 'notification explicative affichée');
  assert.equal(sb.startTrainingBattle(null, 0), false, 'mode null = « terminé » ne lance rien');
});

test('passe 24 #4 : la file manuelle avance quand le Pokémon du slot est terminé', () => {
  const a = sb.ensureTrainingAutomation();
  a.slots[0].enabled = false;
  a.slots[0].queue = [];
  const trainee = sb.createPoke(25, 100);
  const next = sb.createPoke(4, 5);
  sb.G.collection.wait1 = next;
  a.slots[0].queue.push(next.uid);
  // Fixture « terminé » : seul le trainee n'a plus rien à faire (le Pokémon
  // de la file, lui, garde ses entraînements réels — sinon il serait filtré).
  const origAvail = sb.trainingModeAvailability;
  sb.trainingModeAvailability = (p) => (p && p.uid === trainee.uid)
    ? { move: false, talent: false, ev: false, level: false, hidden: false, totalEvs: 36 }
    : origAvail(p);
  sb.G.trainingSlots = [{ uid: null, loc: null, idStr: null, active: false }];
  sb.setTrainingSlotPokemon(0, 'box', 'cur1', (sb.G.collection.cur1 = trainee));
  assert.equal(sb.hasAnyUnlockedTrainingAvailable(trainee), false, 'Pokémon vraiment terminé');
  // Intégration : fin d'un entraînement sans automatisation → le slot se libère
  // PUIS le prochain Pokémon de la file le reprend (sans lancer de combat).
  const slot0 = sb.G.trainingSlots[0];
  slot0.active = true;
  slot0.battle = { mode: 'ev', enemy: { name: 'dummy' }, enemies: [{ name: 'dummy' }], enemyIndex: 0 };
  const before = sb._notifications.length;
  const done = sb.completeTrainingSlot(0, true);
  assert.equal(done, true, 'complétion du slot');
  assert.equal(sb.G.trainingSlots[0].uid, next.uid, 'le suivant de la file a pris le slot');
  assert.equal(sb.G.trainingSlots[0].active, false, 'aucun combat auto sans automatisation');
  assert.equal(a.slots[0].queue.length, 0, 'file vidée');
  assert.ok(sb._notifications.length > before, 'le joueur est notifié du passage au suivant');
  sb.trainingModeAvailability = origAvail; // restauration
});

// ————————————————————————— #5 —————————————————————————
test('passe 24 #5 : le clic droit rouvre la fiche objet dans le sac « équiper »', () => {
  const src = R('src/game/display/team-ui.js');
  // Passe 25 : le handler passe par le wrapper openItemInfoFromEquip, qui
  // mémorise le sélecteur d'équipement comme source de retour (le bouton
  // retour de la fiche rouvre le choix d'objet, pas le sac global).
  assert.ok(src.includes('data-context-call="openItemInfoFromEquip" data-context-args="\'${key}\', ${teamIdx}"'),
    'les lignes du sélecteur d\'équipement portent le handler de clic droit contextuel');
  assert.ok(src.includes('function openItemInfoFromEquip'), 'wrapper dédié présent dans team-ui.js');
});

// ————————————————————————— #6 —————————————————————————
test('passe 24 #6 : Usine — écran pré-combat avec réorganisation de l\'équipe prêtée', () => {
  sb.G.championTitle = true; // atoll accessible
  sb.G.atoll = null;
  sb.prepareAtollFactoryBattle('factory_c');
  const run = sb.getAtollFactoryRun();
  assert.ok(run && Array.isArray(run.team) && run.team.length > 0, 'la série Usine est créée sans lancer de combat');
  const orderBefore = join(run.team.map((p) => p.id));
  // Passe 25 : le réordonnancement passe par les swaps issus du glisser-déposer
  // du nouveau panneau de préparation (clone de l'Équipe Active).
  sb.atollFactorySwapPoke(0, 1);
  const orderAfter = join(run.team.map((p) => p.id));
  assert.notEqual(orderAfter, orderBefore, 'swap : ordre des Pokémon modifié');
  sb.atollFactorySwapPoke(1, 0);
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'swap inverse : retour à l\'ordre initial');
  sb.atollFactorySwapPoke(0, -1); // hors limites : no-op
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'pas de swap hors limites');
  const p0 = run.team[0];
  if ((p0.moves || []).length >= 2) {
    const movesBefore = join(p0.moves.map((m) => m.id));
    sb.atollFactorySwapMoves(0, 0, 1);
    assert.notEqual(join(p0.moves.map((m) => m.id)), movesBefore, 'swap : ordre des attaques modifié');
    sb.atollFactorySwapMoves(0, 1, 0);
    assert.equal(join(p0.moves.map((m) => m.id)), movesBefore, 'swap inverse : attaques revenues');
  }
  // Pas de série : run null au départ d\'un nouvel état
  sb.G.atoll = null;
  assert.equal(sb.getAtollFactoryRun(), null);
});

// ————————————————————————— #7 —————————————————————————
test('passe 24 #7 : l\'ajout d\'équipe se fait toujours en fin (index de swap purgé)', () => {
  sandboxSpyReset();
  sb.window._swapFromTeamIdx = 3; // résidu d\'un clic sur une carte équipe
  sb.openAddToTeamSelector();
  assert.equal(sb.window._swapFromTeamIdx, null, 'index de swap purgé à l\'ouverture « + »');
  assert.equal(sb._usmSpy.length, 1, 'sélecteur ouvert');
  assert.equal(sb._usmSpy[0], 'team', 'mode « team » conservé');
  // Les deux cartes « + » (team-ui + team-manage) passent par le point d\'entrée dédié
  assert.ok(R('src/game/display/team-ui.js').includes('data-call="openAddToTeamSelector"'), 'team-ui : carte + dédiée');
  assert.ok(R('src/game/display/team-manage.js').includes('data-call="openAddToTeamSelector"'), 'team-manage : carte + dédiée');
});
function sandboxSpyReset() {
  if (!sb._usmSpy) {
    sb._usmSpy = [];
    sb.openUnifiedSelectorModal = (action) => sb._usmSpy.push(action);
  } else sb._usmSpy.length = 0;
}

// ————————————————————————— #8 —————————————————————————
test('passe 24 #8 : types localisés partout via getTypeName', () => {
  sb.G.lang = 'fr';
  assert.equal(sb.getTypeName('Fire'), 'Feu');
  assert.equal(sb.getTypeName('electric'), 'Électrik');
  assert.equal(sb.getTypeName('Dark'), 'Ténèbres');
  // Les badges réutilisent le helper
  assert.ok(R('src/game/core/util.js').includes('getTypeName(type)'), 'typeSpan localisé');
  assert.ok(R('src/engine/item-engine.js').includes('getTypeName(typeName)'), 'badges d\'objets localisés');
  sb.G.lang = 'en';
  assert.equal(sb.getTypeName('Fire'), 'Fire');
  sb.G.lang = 'fr';
});

test('passe 24 #8 : descriptions d\'attaques en français (400/400) et lues en priorité', () => {
  const src = R('src/localization/fr/move-descs.js');
  const entries = [...src.matchAll(/^  "(\w+)": "/gm)].map((m) => m[1]);
  assert.equal(entries.length, 400, 'chaque attaque a une description FR');
  sb.G.lang = 'fr';
  assert.ok(sb.t('move_descs.thunderbolt').includes('paralyser'), 't() résout les descriptions FR');
  assert.ok(sb.t('move_descs.tackle').length > 0);
  const modal = R('src/game/display/poke-modal.js');
  const iLoc = modal.indexOf("t('move_descs.' + moveId)");
  const iEn = modal.indexOf('moveDesc = mv.desc');
  assert.ok(iLoc > 0 && iEn > iLoc, 'openMoveInfo lit la locale AVANT le texte anglais mv.desc');
});

test('passe 24 #8 : statuts colorés comme la météo dans les descriptions', () => {
  assert.equal(typeof sb.replaceStatusTerms, 'function', 'replaceStatusTerms exposé');
  const out = sb.replaceStatusTerms('10% de chance de brûler. Peut paralyser la cible et l\'empoisonner.');
  const badges = out.match(/move-desc-badge/g) || [];
  assert.ok(badges.length >= 3, `brûlure + paralysie + poison colorés (${badges.length} badges)`);
  assert.ok(out.includes('background'), 'badges colorés');
  const w = sb.replaceWeatherTerms('Invoque le soleil.');
  assert.ok(w.includes('move-desc-badge'), 'météo toujours colorée');
  assert.ok(R('src/game/display/poke-modal.js').includes('replaceStatusTerms(moveDesc)'), 'descriptions d\'attaques traitées');
});

test('passe 24 #8 : descriptions de talents 100 % françaises et complètes', () => {
  const fr = R('src/localization/fr/talents.js');
  assert.ok(!/immunity to|on  weather|inflict  /.test(fr), 'plus aucune description tronquée en FR');
  const en = R('src/localization/en/talents.js');
  assert.ok(!/immunity to"|on  weather|inflict  /.test(en), 'plus aucune description tronquée en EN');
  sb.G.lang = 'fr';
  for (const id of [1, 25, 130, 149, 248]) {
    for (const tal of sb.getSpeciesTalents(id).slice(0, 6)) {
      const name = sb.getTalentName(tal);
      const desc = sb.getTalentDesc(tal);
      assert.ok(name && name !== `talents.${tal}.name`, `${tal} : nom localisé`);
      assert.ok(desc && desc !== `talents.${tal}.desc`, `${tal} : description localisée`);
    }
  }
  assert.ok(sb.getTalentName('sandveil').includes('Voile Sable'));
  assert.ok(sb.getTalentDesc('waterveil').includes('brûlure'), 'waterveil immunise contre la brûlure');
  assert.ok(sb.getTalentDesc('magmaarmor').includes('gel'), 'magmaarmor immunise contre le gel');
});

