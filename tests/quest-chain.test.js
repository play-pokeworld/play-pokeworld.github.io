import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passes 18, 20 & 21 — Validateurs de la chaîne de quêtes (étapes 2, 4 & 5) ──
// • Quêtes principales : Kanto 1-60 (Tour Rocket 26 ; densification passe 21 :
//   Bill, Fan Club, Capitaine S.S. Anne, Évoli/Porygon, Piste Cyclable, Dentiers
//   d'or, Lokhlass Sylphe, Dojo → Tyrogue, M. Psyché, labo Ptéra, Mémoires du
//   Manoir…) ; Johto 101-140 (passe 20). Ids uniques, badges canoniques.
// • Quêtes secondaires regroupées (Kanto s1-s30, Johto s31-s55), chaque
//   quête a un donneur PNJ, chaque objet de récompense existe dans ITEMS.
// • Combats de dresseurs : battleId → OFFICIAL_TEAMS avec prime > 0,
//   sprite mapping, dialogues i18n (nom/intro/victoire) FR+EN présents.
// • Textes de quêtes FR+EN complets, rewardDesc synchronisés avec les defs.
// • PNJ : données et localisations strictement parallèles (régression passe 19).
// • Migrations V2 (réordonnancement), V3 (Johto → 140) et V4 (Kanto → 60 +
//   sides Johto s14-s38 → s31-s55).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr', region: 'kanto', badges: [], activeQuests: [], repeatables: [], questTrainerWins: {}, mainStep: { kanto: 0, johto: 0 }, mainProgress: { kanto: 0, johto: 0 }, wildWinsByLoc: {}, visitedMaps: {}, completedQuests: {}, money: 0 },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k) => k, getPokeName: (id) => 'P' + id,
    notify: () => {}, saveGame: () => {}, autoSave: () => {}, setMsg: () => {}, updateHeader: () => {},
    addToInventory: () => {}, grantRewardItems: () => {},
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: { WILD_DEFEATED: 'a', POKEMON_CAUGHT: 'b', MINE_SELL: 'c', BADGE_EARNED: 'd', LEAGUE_WON: 'e' },
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/game/world/team.js', 'src/game/core/pokemon-factory.js',
    'src/data/champions-data.js', 'src/data/official-teams-data.js',
    'src/data/story-quests.js', 'src/data/side-quests-data.js', 'src/data/npc-data.js',
    'src/data/repeatable-quests-data.js',
    'src/data/trainer-sprites-data.js', 'src/game/quests/quest-core.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}

function loadLocale() {
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['src/localization/fr/quests.js', 'src/localization/en/quests.js', 'src/localization/fr/ui.js', 'src/localization/en/ui.js']) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return { fr: { quests: sandbox.window.L_fr_quests, ui: sandbox.window.L_fr_ui }, en: { quests: sandbox.window.L_en_quests, ui: sandbox.window.L_en_ui } };
}

const sb = makeSandbox();
const L = loadLocale();
const STORY = sb.STORY_QUESTS;
const kanto = STORY.filter((q) => q.region === 'kanto');
const johto = STORY.filter((q) => q.region === 'johto');
const TRAINER_QUESTS = STORY.filter((q) => q.type === 'trainer_battle');

test('chaîne principale : ids uniques, Kanto 1-60 ordonné, Johto 101-140, Tour Rocket en 26', () => {
  assert.equal(STORY.length, 100, '100 quêtes principales (60 Kanto + 40 Johto, étapes 4 & 5)');
  const ids = new Set(STORY.map((q) => q.id));
  assert.equal(ids.size, 100, 'aucun id en double (getMainQuestDef ne filtre pas par région !)');
  kanto.forEach((q, i) => assert.equal(q.id, i + 1, `Kanto #${i} → id ${i + 1}`));
  johto.forEach((q, i) => assert.equal(q.id, 101 + i, `Johto #${i} → id ${101 + i}`));
  assert.equal(kanto[25].type, 'trainer_battle', 'position 26 = combat de dresseur');
  assert.equal(kanto[25].battleId, 'kanto_rocket_tower', 'Team Rocket à la Tour Pokémon (décalée en 26 passe 21)');
  assert.equal(kanto[25].loc, 'pokemontower', 'Tour Rocket située à la Tour Pokémon de Lavanville');
  // La flûte de M. Fuji (id 27) précède toujours Ronflex-route 12 (id 27=quête item)
  const fluteSource = kanto.find((q) => q.rewardItems && q.rewardItems.pokeflute);
  const snorlax = kanto.find((q) => q.rewardPoke === 143);
  assert.ok(fluteSource && snorlax, 'donneur de Pokéflûte + quête Ronflex présents');
  assert.ok(fluteSource.id < snorlax.id, 'la Pokéflûte est offerte AVANT la quête Ronflex qui la requiert');
  assert.equal(snorlax.requiredItem, 'pokeflute', 'Ronflex requiert la Pokéflûte');
});

test('chaîne principale : badges dans l\'ordre canonique (RFVF / OAC)', () => {
  // Array.from : rebascule les tableaux issus du vm en prototypes node
  // (deepEqual strict compare les prototypes d'Array).
  const kBadges = Array.from(kanto.filter((q) => q.type === 'badge'), (q) => q.targetBadge);
  assert.deepEqual(kBadges, ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni', 'elite4'], 'ordre badges Kanto');
  const jBadges = Array.from(johto.filter((q) => q.type === 'badge'), (q) => q.targetBadge);
  assert.deepEqual(jBadges, ['falkner', 'bugsy', 'whitney', 'morty', 'chuck', 'jasmine', 'pryce', 'clair', 'johto_elite4'], 'ordre badges Johto');
  // Arc Rocket Kanto : Mont Sélénite → Tour → Repaire/Giovanni → Sylphe/Giovanni
  // (+ passe 21 : le Dojo de Safrania, entre la Sylphe libérée et la Route Victoire)
  const kBattles = Array.from(kanto.filter((q) => q.type === 'trainer_battle'), (q) => q.battleId);
  assert.deepEqual(kBattles, ['kanto_rival_route22', 'kanto_rocket_mtmoon', 'kanto_super_nerd_fossil', 'kanto_rival_cerulean', 'kanto_rival_ssanne', 'kanto_rocket_tower', 'kanto_rocket_hideout', 'kanto_giovanni_hideout', 'kanto_rival_silph', 'kanto_giovanni_silph', 'kanto_dojo_master', 'kanto_rival_victory'], 'arc rival + Rocket + Dojo Kanto');
  const jBattles = Array.from(johto.filter((q) => q.type === 'trainer_battle'), (q) => q.battleId);
  // Passe 20 : le boss du film 3 (Zarbi/Entei aux Ruines d'Alpha) s'intercale
  // entre le rival du Bois aux Chênes et celui de la Tour Cendrée.
  assert.deepEqual(jBattles, ['johto_rival_cherrygrove', 'johto_sprout_elder', 'johto_rocket_slowpoke', 'johto_rival_ilex', 'johto_film3_entei', 'johto_rival_burned', 'johto_rocket_lake', 'johto_rocket_radio', 'johto_rival_victory'], 'arc rival + Rocket + film 3 Johto');
});

test('récompenses : objets existants, Pokémon de récompense valides, économie plafonnée (règle utilisateur)', () => {
  let moneyK = 0, moneyJ = 0, moneyTrainers = 0;
  for (const q of STORY) {
    if (q.rewardMoney) { if (q.region === 'kanto') moneyK += q.rewardMoney; else moneyJ += q.rewardMoney; }
    for (const k of Object.keys(q.rewardItems || {})) assert.ok(sb.ITEMS[k], `quête ${q.id} : objet ${k} existe dans ITEMS`);
    if (q.requiredItem) assert.ok(sb.ITEMS[q.requiredItem], `quête ${q.id} : objet requis ${q.requiredItem} existe`);
    if (q.rewardPoke) assert.ok(sb.PD[q.rewardPoke], `quête ${q.id} : Pokémon ${q.rewardPoke} existe`);
    if (q.type === 'trainer_battle') {
      assert.ok(sb.OFFICIAL_TEAMS[q.battleId], `quête ${q.id} : équipe ${q.battleId} définie`);
      const tm = sb.OFFICIAL_TEAMS[q.battleId];
      assert.ok(tm.rewardMoney > 0, `${q.battleId} : prime de victoire > 0`);
      moneyTrainers += tm.rewardMoney;
      // La quête elle-même ne double pas la prime (le claim ne donne rien).
      assert.ok(!q.rewardMoney, `quête ${q.id} : pas de double récompense d'argent`);
    }
  }
  // Plafonds documentés (rééquilibrage passe 18 ; bornes révisées passes 20 & 21
  // : Johto 40 quêtes au lieu de 26, Kanto 60 au lieu de 44, +33 800₽ nets) :
  // pas d'enrichissement excessif.
  assert.ok(moneyK >= 255000 && moneyK <= 290000, `Kanto quêtes ${moneyK}₽ ∈ [255k, 290k] (était 358k avant passe 18)`);
  assert.ok(moneyJ >= 230000 && moneyJ <= 275000, `Johto quêtes ${moneyJ}₽ ∈ [230k, 275k] (était 302k avant passe 18)`);
  assert.ok(moneyTrainers >= 80000 && moneyTrainers <= 120000, `primes dresseurs ${moneyTrainers}₽ ∈ [80k, 120k]`);
  // La Baie Prine (absente d'ITEMS avant passe 18) est désormais réelle.
  assert.ok(sb.ITEMS.prine_berry && sb.ITEMS.prine_berry.buff, 'prine_berry définie (legacy buff def)');
});

test('quêtes secondaires : s1-s55, Kanto puis Johto, donneur PNJ obligatoire, mainTalk valides', () => {
  const SQ = sb.SIDE_QUESTS;
  const keys = Object.keys(SQ);
  assert.equal(keys.length, 55, '55 quêtes secondaires (30 Kanto + 25 Johto, passes 20 & 21)');
  for (let i = 1; i <= 30; i++) assert.ok(SQ['s' + i] && SQ['s' + i].region === 'kanto', `s${i} Kanto`);
  for (let i = 31; i <= 55; i++) assert.ok(SQ['s' + i] && SQ['s' + i].region === 'johto', `s${i} Johto`);
  const npcQuests = [];
  for (const [loc, list] of Object.entries(sb.NPCS)) for (const npc of list) if (npc.quest) npcQuests.push(npc.quest);
  for (const sid of keys) assert.ok(npcQuests.includes(sid), `quête ${sid} a un donneur PNJ`);
  for (const nq of npcQuests) assert.ok(SQ[nq], `PNJ donne la quête existante ${nq}`);
  // Talk quests : les PNJ Prof. renvoient vers des quêtes talk existantes.
  const talkIds = STORY.filter((q) => q.type === 'talk').map((q) => q.id);
  for (const [, list] of Object.entries(sb.NPCS)) for (const npc of list) {
    if (npc.mainTalk != null) assert.ok(talkIds.includes(npc.mainTalk), `mainTalk ${npc.mainTalk} → quête talk existante`);
  }
});

test('combats de dresseurs : sprites mappés et dialogues i18n FR+EN (nom, intro, victoire)', () => {
  for (const q of TRAINER_QUESTS) {
    assert.ok(sb.TRAINER_BATTLE_SPRITES[q.battleId], `${q.battleId} : sprite de dresseur mappé`);
    for (const lang of ['fr', 'en']) {
      const ui = L[lang].ui;
      assert.ok(ui['trainer_battle_name_' + q.battleId], `${lang} ${q.battleId} : nom`);
      assert.ok(ui['trainer_battle_intro_' + q.battleId], `${lang} ${q.battleId} : intro scénarisée`);
      assert.ok(ui['trainer_battle_win_' + q.battleId], `${lang} ${q.battleId} : réplique de défaite`);
    }
  }
});

test('textes de quêtes : FR+EN complets, rewardDesc synchronisés avec les définitions', () => {
  // On ne garde que les chiffres du libellé (« Victoire : 1 000₽ » → « 1000 »)
  const strip = (s) => String(s).replace(/[^0-9]/g, '');
  for (const q of STORY) {
    for (const lang of ['fr', 'en']) {
      const node = L[lang].quests.main[String(q.id)];
      assert.ok(node && node.title && node.desc && node.rewardDesc, `${lang} quête ${q.id} : titre+desc+récompense`);
      const expectedMoney = q.rewardMoney || (q.battleId ? (sb.OFFICIAL_TEAMS[q.battleId] || {}).rewardMoney : 0);
      if (expectedMoney) assert.ok(strip(node.rewardDesc).startsWith(String(expectedMoney)), `${lang} quête ${q.id} : montant ${expectedMoney} dans « ${node.rewardDesc} »`);
      if (q.rewardPoke) assert.ok(/\(Nv\.|\(Lv\./.test(node.rewardDesc), `${lang} quête ${q.id} : légendaire mentionné (${node.rewardDesc})`);
    }
  }
  for (const [sid, def] of Object.entries(sb.SIDE_QUESTS)) {
    for (const lang of ['fr', 'en']) {
      const node = L[lang].quests.side[sid];
      assert.ok(node && node.title && node.desc && node.rewardDesc, `${lang} quête ${sid} : texte complet`);
      if (def.rewardMoney) assert.ok(strip(node.rewardDesc).startsWith(String(def.rewardMoney)), `${lang} quête ${sid} : montant ${def.rewardMoney} dans « ${node.rewardDesc} »`);
    }
  }
});

test('rival : équipe générée selon le starter du joueur (variantes OFFICIAL_TEAMS)', () => {
  sb.G.starterSpecies = { kanto: 4, johto: 152 };
  const silph = sb.createTrainerBattleTeam('kanto_rival_silph');
  assert.equal(silph.length, 5, 'Blue Sylphe : 5 Pokémon');
  const ace = silph[silph.length - 1];
  assert.ok([7, 8, 9].includes(ace.id), 'vs Salamèche → la lignée Carapuce chez Blue');
  assert.equal(ace.heldItem, 'mystic_water', 'objet type_boost tenu (effet actif via getHeldBuff)');
  const cherry = sb.createTrainerBattleTeam('johto_rival_cherrygrove');
  assert.equal(cherry.length, 1, 'premier duel Silver : starter seul');
  assert.equal(cherry[0].id, 155, 'vs Germignon → Silver a Héricendre (volé)');
  // Robustesse : starter inconnu → repli première variante, jamais vide.
  delete sb.G.starterSpecies;
  assert.ok(sb.createTrainerBattleTeam('kanto_rival_victory').length === 6, 'repli sans starter → équipe complète');
});

test('migration sauvegarde V2 : mainStep décalé, completedQuests/baselines remappés, sides regroupés', () => {
  const g = {
    mainStep: { kanto: 25, johto: 20 }, // 25 = ancien index (badge Erika, id 8)
    completedQuests: { '1001': true, '8': true, '60': true, side_s11: true, side_s30: true },
    questBaselines: { kanto: { '7': 12, '46': 30 }, johto: { '60': 5 } },
    activeQuests: [{ qid: 's11', cat: 'side', progress: 3 }, { qid: 's30', cat: 'side', progress: 2 }],
  };
  sb.G = g;
  sb.migrateQuestSaveV2();
  assert.equal(g.mainStep.kanto, 26, 'Kanto : index ≥ 21 décalé de +1 (insertion Tour Rocket)');
  assert.equal(g.mainStep.johto, 20, 'Johto : index inchangé (ordre identique)');
  assert.equal(g.completedQuests['5'], true, 'ancien 1001 → nouveau 5 (rival route 22)');
  assert.equal(g.completedQuests['27'], true, 'ancien 8 → nouveau 27 (badge Erika)');
  assert.equal(g.completedQuests['120'], true, 'ancien 60 → nouveau 120 (Tour Cendrée 60)');
  assert.equal(g.completedQuests.side_s3, true, 'ancien s11 → nouveau s3 (Gardien de Jadielle)');
  assert.equal(g.completedQuests.side_s24, true, 'ancien s30 → nouveau s24 (Team Rocket à Acajou)');
  assert.equal(g.questBaselines.kanto['21'], 12, 'ancien 7 → nouveau 21 (Tour Pokémon grind)');
  assert.equal(g.questBaselines.kanto['19'], 30, 'ancien 46 → nouveau 19 (route 10)');
  assert.equal(g.questBaselines.johto['120'], 5, 'baseline Johto remappée');
  assert.equal(g.activeQuests[0].qid, 's3', 'instance side active remappée');
  assert.equal(g.activeQuests[1].qid, 's24', 'instance side active remappée (Johto)');
  assert.equal(g._questIdMigrationV2, 2, 'marqueur posé');
  // Idempotente
  sb.migrateQuestSaveV2();
  assert.equal(g.mainStep.kanto, 26, 'migration idempotente');
});

test('migration V2 : fin de jeu préservée (toutes quêtes faites)', () => {
  const g = { mainStep: { kanto: 43, johto: 26 }, completedQuests: {}, questBaselines: {}, activeQuests: [] };
  sb.G = g;
  sb.migrateQuestSaveV2();
  assert.equal(g.mainStep.kanto, 44, 'Kanto 43/43 (ancienne fin) → 44 (nouvelle chaîne complète)');
});

test('passe 20 — récompenses spéciales Johto : Léviator rouge, Minidraco, boss film 3', () => {
  const byId = {}; for (const q of STORY) byId[q.id] = q;
  assert.equal(byId[124].rewardPoke, 130, 'quête 124 : Léviator offert au Lac Colère');
  assert.equal(byId[124].rewardShiny, true, 'quête 124 : chromatique forcé (le Léviator rouge !)');
  assert.equal(byId[124].rewardLevel, 30, 'quête 124 : Nv.30 (canon Lac Colère)');
  assert.equal(byId[130].rewardPoke, 147, 'quête 130 : Minidraco de l\'épreuve dragon');
  assert.equal(byId[130].rewardLevel, 15, 'quête 130 : Nv.15 (canon Antre du Dragon OAC)');
  assert.equal(byId[114].type, 'trainer_battle', 'quête 114 : boss scénarisé');
  assert.equal(byId[114].battleId, 'johto_film3_entei', 'quête 114 : Entei/Zarbi — Le Sort des Zarbi');
});

test('migration sauvegarde V3 : Johto 101-126 → 101-140 (passe 20), idempotente', () => {
  const g = {
    mainStep: { kanto: 30, johto: 20 }, // 20 = ancien index (id 121) → doit re-pointer sur la même quête (id 135)
    completedQuests: { '110': true, '121': true, '8': true, side_s3: true },
    questBaselines: { kanto: { '21': 12 }, johto: { '121': 9, '60': 5 } },
    activeQuests: [{ qid: 121, cat: 'main', progress: 3 }, { qid: 's3', cat: 'side', progress: 2 }],
  };
  sb.G = g;
  sb.migrateQuestSaveV3();
  assert.equal(g.mainStep.kanto, 30, 'Kanto : inchangé (V3 ne touche que Johto)');
  assert.equal(g.mainStep.johto, 34, 'ancien index 20 (id 121) → index 34 (même quête, id 135)');
  assert.equal(g.completedQuests['116'], true, 'ancien 110 → nouveau 116');
  assert.equal(g.completedQuests['135'], true, 'ancien 121 → nouveau 135');
  assert.equal(g.completedQuests['110'], undefined, 'ancienne clé supprimée');
  assert.equal(g.completedQuests['8'], true, 'clé Kanto passthrough');
  assert.equal(g.completedQuests.side_s3, true, 'clé secondaire passthrough');
  assert.equal(g.questBaselines.johto['135'], 9, 'baseline Johto remappée');
  assert.equal(g.questBaselines.johto['60'], 5, 'clé hors 101-126 inchangée');
  assert.equal(g.questBaselines.kanto['21'], 12, 'baselines Kanto intactes');
  assert.equal(g.activeQuests[0].qid, 135, 'instance principale active remappée');
  assert.equal(g.activeQuests[1].qid, 's3', 'instance secondaire inchangée');
  assert.equal(g._questIdMigrationV3, 3, 'marqueur posé');
  sb.migrateQuestSaveV3();
  assert.equal(g.mainStep.johto, 34, 'migration idempotente');
});

test('migration V3 : fin de jeu Johto préservée (26/26 anciens → chaîne complète)', () => {
  const g = { mainStep: { kanto: 44, johto: 26 }, completedQuests: {}, questBaselines: {}, activeQuests: [] };
  sb.G = g;
  sb.migrateQuestSaveV3();
  assert.equal(g.mainStep.johto, 40, '26/26 anciennes quêtes → 40 (nouvelle chaîne complète)');
});

test('PNJ : données et localisations strictement parallèles (chaque entrée a nom + lignes FR/EN)', () => {
  // Régression passe 20 : getNpc(loc, idx) renvoie {name:'', lines:[]} si
  // l'indice n'existe pas → un PNJ fantôme « NPC n » sans dialogue (boutons
  // de location-info.js, nœud quête de map-render.js). Bug latent passé
  // inaperçu à Oliville (passe 19) : on verrouille maintenant par un test.
  const locSb = { window: {}, console };
  locSb.window = locSb;
  vm.createContext(locSb);
  for (const f of ['src/localization/fr/npc.js', 'src/localization/en/npc.js']) {
    vm.runInContext(R(f), locSb, { filename: f });
  }
  const fr = locSb.window.L_fr_npc, en = locSb.window.L_en_npc;
  assert.ok(fr && en, 'dictionnaires PNJ FR/EN chargés');
  for (const [loc, list] of Object.entries(sb.NPCS)) {
    assert.ok(fr[loc], `FR : lieu '${loc}' présent dans fr/npc.js`);
    assert.ok(en[loc], `EN : lieu '${loc}' présent dans en/npc.js`);
    assert.equal(fr[loc].length, list.length, `FR '${loc}' : ${list.length} entrée(s) comme npc-data`);
    assert.equal(en[loc].length, list.length, `EN '${loc}' : ${list.length} entrée(s) comme npc-data`);
    list.forEach((npc, i) => {
      assert.ok(fr[loc][i].name && Array.isArray(fr[loc][i].lines) && fr[loc][i].lines.length, `FR '${loc}'[${i}] : nom + lignes`);
      assert.ok(en[loc][i].name && Array.isArray(en[loc][i].lines) && en[loc][i].lines.length, `EN '${loc}'[${i}] : nom + lignes`);
    });
  }
  for (const loc of Object.keys(fr)) assert.ok(sb.NPCS[loc], `FR lieu '${loc}' existe côté données`);
  for (const loc of Object.keys(en)) assert.ok(sb.NPCS[loc], `EN lieu '${loc}' existe côté données`);
});

test('passe 21 — récompenses spéciales Kanto : Évoli, Porygon, Lokhlass, Tyrogue (Dojo), Ptéra', () => {
  const byId = {}; for (const q of kanto) byId[q.id] = q;
  assert.equal(byId[31].rewardPoke, 133, 'quête 31 : Évoli du Manoir Céladon');
  assert.equal(byId[31].rewardLevel, 25, 'quête 31 : Nv.25 (canon RFVF)');
  assert.equal(byId[32].rewardPoke, 137, 'quête 32 : Porygon du Game Corner');
  assert.equal(byId[32].rewardLevel, 20, 'quête 32 : Nv.20');
  assert.equal(byId[39].rewardPoke, 131, 'quête 39 : Lokhlass de la Sylphe');
  assert.equal(byId[39].rewardLevel, 25, 'quête 39 : Nv.25 (canon RFVF : employé Sylphe)');
  assert.equal(byId[40].type, 'trainer_battle', 'quête 40 : le Dojo est un combat scénarisé');
  assert.equal(byId[40].battleId, 'kanto_dojo_master', 'quête 40 : Roi du Karaté (Koichi, RFVF)');
  assert.equal(byId[40].rewardPoke, 236, 'quête 40 : cadeau = Tyrogue (voie pied OU poing)');
  assert.equal(byId[40].rewardLevel, 25, 'quête 40 : Nv.25 (canon cadeau RFVF)');
  assert.equal(byId[47].rewardPoke, 142, 'quête 47 : Ptéra du labo de Cramois\'île');
  assert.equal(byId[47].rewardLevel, 30, 'quête 47 : Nv.30');
  const dojo = sb.OFFICIAL_TEAMS.kanto_dojo_master;
  assert.ok(dojo, 'équipe kanto_dojo_master définie');
  assert.equal(dojo.team.length, 2, 'Dojo : 2 Pokémon (canon Koichi)');
  const species = Array.from(dojo.team, (p) => p.id);
  assert.deepEqual(species, [106, 107], 'Kicklee puis Tygnon (canon FRLG)');
  assert.ok(dojo.team.every((p) => p.level === 37), 'niveaux 37 (canon FRLG)');
  assert.ok(dojo.team.every((p) => p.item === 'black_belt'), 'Ceinture Noire tenue par les deux (canon FRLG)');
});

test('migration sauvegarde V4 : Kanto 1-44 → 1-60 + sides Johto s14-s38 → s31-s55, idempotente', () => {
  const g = {
    mainStep: { kanto: 20, johto: 10 }, // index 20 (0-based) = 21e quête (id 21, Tour Pokémon) → id 25, index 24
    completedQuests: { '20': true, '21': true, '44': true, '104': true, side_s3: true, side_s20: true },
    questBaselines: { kanto: { '21': 45, '32': 3 }, johto: { '121': 9 } },
    activeQuests: [{ qid: 21, cat: 'main', progress: 12 }, { qid: 's20', cat: 'side', progress: 4 }, { qid: 's3', cat: 'side', progress: 1 }],
  };
  sb.G = g;
  sb.migrateQuestSaveV4();
  assert.equal(g.mainStep.kanto, 24, 'ancien index 20 (id 21) → index 24 (même quête, id 25)');
  assert.equal(g.mainStep.johto, 10, 'Johto : inchangé (V4 ne touche que Kanto)');
  assert.equal(g.completedQuests['23'], true, 'ancien 20 → nouveau 23 (Grotte Rocheuse décalée)');
  assert.equal(g.completedQuests['25'], true, 'ancien 21 → nouveau 25 (Tour Pokémon grind)');
  assert.equal(g.completedQuests['60'], true, 'ancien 44 → nouveau 60 (Mew au Parc Safari)');
  assert.equal(g.completedQuests['104'], true, 'id Johto passthrough');
  assert.equal(g.completedQuests.side_s3, true, 'side Kanto (s1-s13) inchangée');
  assert.equal(g.completedQuests.side_s37, true, 'ancien side_s20 (Johto) → nouveau side_s37');
  assert.equal(g.completedQuests.side_s20, undefined, 'ancienne clé side Johto supprimée');
  assert.equal(g.questBaselines.kanto['25'], 45, 'baseline Kanto remappée (21 → 25)');
  assert.equal(g.questBaselines.kanto['43'], 3, 'baseline Kanto remappée (32 → 43)');
  assert.equal(g.questBaselines.johto['121'], 9, 'baselines Johto inchangées');
  assert.equal(g.activeQuests[0].qid, 25, 'instance principale Kanto active remappée (21 → 25)');
  assert.equal(g.activeQuests[1].qid, 's37', 'instance secondaire Johto active remappée (s20 → s37)');
  assert.equal(g.activeQuests[2].qid, 's3', 'instance secondaire Kanto inchangée');
  assert.equal(g._questIdMigrationV4, 4, 'marqueur posé');
  sb.migrateQuestSaveV4();
  assert.equal(g.mainStep.kanto, 24, 'migration idempotente');
  assert.equal(g.completedQuests['60'], true, 'complétions stables (pas de double remap)');
});

test('migration V4 : fin de jeu Kanto préservée (44/44 anciens → chaîne complète)', () => {
  const g = { mainStep: { kanto: 44, johto: 40 }, completedQuests: {}, questBaselines: {}, activeQuests: [] };
  sb.G = g;
  sb.migrateQuestSaveV4();
  assert.equal(g.mainStep.kanto, 60, '44/44 anciennes quêtes → 60 (nouvelle chaîne complète)');
});

test('répétables : pass 21 ajoute des ciblées Kanto, filtrées par région, textes FR/EN synchronisés', () => {
  const RQ = sb.REPEATABLE_QUESTS;
  const byId = {}; for (const q of RQ) byId[q.id] = q;
  for (let i = 7; i <= 14; i++) assert.ok(byId['r' + i], `répétable r${i} existe`);
  assert.equal(byId.r7.loc, 'viridianforest', 'r7 : Forêt de Jade (Kanto)');
  assert.equal(byId.r14.loc, 'victoryroad', 'r14 : Route Victoire (Kanto)');
  assert.equal(byId.r9.type, 'catch', 'r9 : type capture');
  assert.equal(byId.r13.type, 'mine_sell', 'r13 : type vente de trésors');
  // Chaque répétable a ses textes FR/EN avec le bon montant.
  const loc2 = { window: {}, console };
  loc2.window = loc2;
  vm.createContext(loc2);
  for (const f of ['src/localization/fr/quests.js', 'src/localization/en/quests.js']) {
    vm.runInContext(R(f), loc2, { filename: f });
  }
  const strip = (s) => String(s).replace(/[^0-9]/g, '');
  for (const q of RQ) {
    for (const [lang, dict] of [['fr', loc2.window.L_fr_quests], ['en', loc2.window.L_en_quests]]) {
      const node = dict.repeatable[q.id];
      assert.ok(node && node.title && node.desc && node.rewardDesc, `${lang} répétable ${q.id} : texte complet`);
      assert.ok(strip(node.rewardDesc).startsWith(String(q.rewardMoney)), `${lang} répétable ${q.id} : montant ${q.rewardMoney} dans « ${node.rewardDesc} »`);
    }
  }
});
