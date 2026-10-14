// ─────────────────────────────────────────────────────────────────────────────
// PASSE 33 — retours joueur sur les DONJONS
//
// Les six reproches, tels qu'ils ont été formulés :
//   7.  « Le combat ne doit plus continuer une fois le quota atteint. »
//   8.  « Remonter et encaisser doit arrêter le combat. »
//   9.  « À la fin, le combat doit s'arrêter et le boss doit apparaître. »
//   10. « La difficulté doit monter visiblement à chaque palier. »
//   11. « L'affichage doit être dans la fenêtre de combat, pas la fenêtre lieu ;
//        il serait mieux qu'à chaque palier le combat s'arrête. »
//
// Ces tests lisent la SOURCE : ils verrouillent le câblage. Le comportement en
// jeu, lui, a été vérifié au navigateur (`.devshots/d33-dungeon.mjs`,
// `d33-boss2.mjs`, `d33-ascend.mjs`) — un test de source ne prouve pas le rendu.
// ─────────────────────────────────────────────────────────────────────────────
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const status = read('src/application/combat/battle-status.js');
const encounter = read('src/application/encounter-system.js');
const run = read('src/application/world/dungeon-run.js');
const flow = read('src/application/combat/battle-flow.js');
const init = read('src/application/combat/battle-init.js');
const html = read('index.html');
const css = read('src/assets/styles/design-system.css');

// ── 7 — la chaîne de combats est BORNÉE par le quota du palier ──────────────
test('33.7 — le quota du palier arrête la chaîne de combats', () => {
  // `spawnNextWild()` relançait un adversaire sans condition : le quota
  // n'arrêtait rien et le farm redevenait infini.
  const i = status.indexOf('PASSE 33');
  assert.ok(i > -1, 'le garde-fou de chaîne doit être présent');
  const block = status.slice(i, i + 2400);
  assert.match(block, /dungeonFloorCleared\(\)/, 'le palier purgé doit être testé');
  assert.match(block, /currentDungeonRun\(\)/, 'le garde-fou ne vaut qu\'en expédition');
  // L'arrêt doit précéder la relance : sinon il ne sert à rien.
  // On compare du CODE, pas des commentaires — le commentaire du bloc cite
  // lui-même `spawnNextWild()` et fausserait la comparaison d'index.
  const code = block.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const idxStop = code.indexOf('_dgStop = true');
  const idxSpawn = code.indexOf('spawnNextWild()');
  assert.ok(idxStop > -1 && idxSpawn > -1 && idxStop < idxSpawn,
    'l\'arrêt doit être décidé avant la relance');
  assert.match(code, /if\(_dgStop && battle\.active\)\{\s*\n?\s*endBattle\(\)/,
    'le combat doit réellement se terminer');
});

test('33.7 — le garde-fou épargne arènes et entraînement', () => {
  const block = status.slice(status.indexOf('PASSE 33'), status.indexOf('PASSE 33') + 2400);
  assert.match(block, /!battle\.isChamp/, 'les arènes ne sont pas des donjons');
  assert.match(block, /!battle\.isTraining/, 'l\'entraînement non plus');
});

// ── 8 / 11 — sortir d'un palier coupe TOUJOURS le combat ────────────────────
test('33.8 — encaisser, abandonner et descendre arrêtent le combat', () => {
  assert.match(run, /function _dgStopBattle/, 'un arrêt commun doit exister');
  const helper = run.slice(run.indexOf('function _dgStopBattle'), run.indexOf('function _dgStopBattle') + 700);
  assert.match(helper, /chill\s*=\s*false/, 'la chaîne doit être désarmée');
  assert.match(helper, /endBattle/, 'le combat doit être clos');

  // Les trois sorties doivent l'appeler, sans quoi le combat continue derrière.
  for (const fn of ['dungeonAscend', 'dungeonDescend', 'dungeonAbandon']) {
    const i = run.indexOf('function ' + fn);
    assert.ok(i > -1, `${fn} doit exister`);
    const body = run.slice(i, i + 500);
    assert.match(body, /_dgStopBattle\(\)/, `${fn} doit arrêter le combat`);
  }
});

// ── 9 — le gardien s'ANNONCE et ENCHAÎNE (spec révisée en passe 35) ─────────
// PASSE 35 — RÉVISION DE SPEC. La passe 33 imposait un arrêt du combat AVANT
// le gardien, avec un bouton « Défier le gardien ». Le joueur a refusé ce
// fonctionnement : « le combat ne doit pas s'arrêter à chaque Pokémon battu »
// et « Reprendre le combat ne doit pas exister ». Le gardien enchaîne donc
// désormais sans interruption ni clic. L'assertion inverse est conservée pour
// verrouiller la nouvelle règle.
test('33.9/35 — le palier final arme le gardien SANS arrêter le combat', () => {
  const block = status.slice(status.indexOf('PASSE 33'), status.indexOf('PASSE 33') + 2400);
  assert.match(block, /pendingDungeonBoss\s*=\s*true/, 'le gardien doit être armé');
  const code = block.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const idxBoss = code.indexOf('pendingDungeonBoss = true');
  assert.ok(idxBoss > -1, 'le drapeau du gardien doit être posé');
  // Sur le palier final non encore purgé, aucun `_dgStop = true` ne doit
  // précéder l'armement : le gardien doit surgir dans la foulée du K.O.
  const avant = code.slice(0, idxBoss);
  const dernierStop = avant.lastIndexOf('_dgStop = true');
  if (dernierStop > -1) {
    // Un arrêt subsiste pour les paliers NORMAUX : il doit être gardé par une
    // condition excluant le palier final (bossDone / dungeonIsBossFloor).
    const entre = avant.slice(dernierStop);
    assert.match(entre, /bossDone|dungeonIsBossFloor|isBoss/,
      'un arrêt ne peut précéder le gardien que s\'il exclut le palier final');
  }
});

test('33.9 — le bandeau propose de défier le gardien', () => {
  assert.match(run, /function dungeonFight/, 'la reprise doit être une fonction dédiée');
  const start = run.indexOf('function dungeonFight');
  // PASSE 39g — la fonction a grossi (marche vers l'engagement le plus
  // proche) : la fenêtre d'analyse suit, le contrat 38e est inchangé.
  const body = run.slice(start, start + 3200);
  // PASSE 38e — le gardien ne s'engage plus QUE par un clic sur sa case :
  // dungeonFight ne réarme le drapeau que dans la chaîne historique SANS
  // carte (run.map absent) ; avec la carte, il ne doit JAMAIS armer le boss
  // (retour joueur : « lancer un combat normal lance celui du boss »).
  assert.match(body, /!run\.map\s*&&\s*dungeonIsBossFloor\(\)\s*&&\s*dungeonFloorCleared\(\)/,
    'le gardien n\'est armé que sans carte (l\'ancienne chaîne)');
  assert.match(body, /pendingDungeonBoss\s*=\s*true/, 'le drapeau est réarmé (chaîne sans carte)');
  assert.match(body, /exploreArea/, 'le combat doit être relancé');
  assert.match(run, /dungeonFight,/, 'la fonction doit être exportée');
});

test('33.9 — le gardien est identifiable sur sa carte de combat', () => {
  const card = read('src/ui/game/battle-team-ui.js');
  assert.match(card, /pw-dungeon-boss-card/, 'la carte du gardien doit porter un repère');
  assert.match(css, /\.pw-dungeon-boss-card\s*\{/, 'le repère doit être habillé');
});

// ── 10 — la difficulté monte VISIBLEMENT à chaque palier ────────────────────
test('33.10 — chaque palier renforce les adversaires', () => {
  assert.match(encounter, /function applyDungeonFloorScaling/, 'la montée doit exister');
  const body = encounter.slice(encounter.indexOf('function applyDungeonFloorScaling'),
    encounter.indexOf('function applyDungeonFloorScaling') + 1200);
  assert.match(body, /floor\s*-\s*1/, 'la montée doit dépendre du palier');
  assert.match(body, /recalcPokeStats/, 'les stats doivent être recalculées');
  assert.match(body, /maxHP/, 'les PV doivent suivre');
  assert.match(body, /Math\.min\(100/, 'le niveau doit rester borné à 100');
});

test('33.10 — exploration et chaîne partagent le MÊME réglage', () => {
  // La divergence entre les deux voies était la cause du gardien manquant :
  // une seule d'elles l'appliquait.
  assert.match(encounter, /function applyDungeonEncounterTuning/,
    'le réglage doit être centralisé');
  const calls = encounter.match(/applyDungeonEncounterTuning\(/g) || [];
  assert.ok(calls.length >= 3,
    `les deux voies doivent appeler le réglage commun (vu ${calls.length} occurrences)`);
});

// ── 11 — l'UI vit dans la fenêtre de COMBAT ─────────────────────────────────
test('33.11 — le bandeau est hors de la scène active, donc survit à endBattle', () => {
  const idxBar = html.indexOf('id="battle-dungeon-bar"');
  const idxScene = html.indexOf('id="battle-active-scene"');
  assert.ok(idxBar > -1, 'le bandeau doit exister');
  assert.ok(idxBar < idxScene,
    'le bandeau doit précéder la scène active : endBattle() masque celle-ci à chaque palier');
  assert.match(html, /id="battle-dungeon-bar"[^>]*hidden/, 'il doit être masqué hors expédition');
});

test('33.11 — le bandeau se rafraîchit à l\'ouverture ET à la fin du combat', () => {
  assert.match(init, /renderBattleDungeonBar/, 'il doit apparaître quand le combat s\'ouvre');
  assert.match(flow, /renderBattleDungeonBar/, 'il doit se mettre à jour quand le combat se clôt');
});

test('33.11 — le bandeau rend l\'état complet de l\'expédition', () => {
  const body = run.slice(run.indexOf('function renderBattleDungeonBar'));
  // PASSE 38c — le « sac d\'expédition » (dungeon_bag_label) a été retiré au
  // profit du BUTIN sous la carte. PASSE 39e — plus de panneau parallèle
  // (pw-bdg-loot supprimé) : la réglette COMMUNE #battle-loot-inline est
  // rafraîchie par le bandeau (renderBattleLoot) et vit sous la carte.
  // PASSE 39 — « Victoires : X / Y » et « Encore X victoires avant de
  // descendre » sont retirés (le quota ne sert plus à rien avec la carte).
  for (const key of ['dungeon_floor_label', 'dungeon_ascend_btn']) {
    assert.match(body, new RegExp(key), `le bandeau doit afficher ${key}`);
  }
  assert.doesNotMatch(body, /pw-bdg-loot/, 'le panneau de butin parallèle a été supprimé (PASSE 39e)');
  assert.match(body, /renderBattleLoot/, 'le bandeau rafraîchit la réglette de butin commune sous la carte');
  assert.doesNotMatch(body, /dungeon_bag_label/, 'la section « sac d\'expédition » a été retirée');
  assert.doesNotMatch(body, /dungeon_quota_label/, '« Victoires : X / Y » a été retiré (retour joueur 39)');
  assert.doesNotMatch(body, /dungeon_descend_locked/, '« Encore X victoires avant de descendre » a été retiré (retour joueur 39)');
  // Motif de boutons du projet : `legacy-call` + `data-call`.
  assert.match(body, /data-action="legacy-call"/, 'les boutons doivent suivre le motif du projet');
  // Pas d'affectation brute d'innerHTML : le projet impose le puits sûr.
  assert.equal(/host\.innerHTML\s*=/.test(body), false,
    'le HTML doit passer par _pwSetHtmlSafe');
  assert.match(body, /_pwSetHtmlSafe/, 'le puits sûr doit être utilisé');
});

test('33.11 — les libellés du bandeau sont localisés FR et EN', () => {
  const fr = read('src/localization/fr/economy.js');
  const en = read('src/localization/en/economy.js');
  for (const key of ['dungeon_log_floor_done', 'dungeon_bar_title',
    'dungeon_bar_boss_next', 'dungeon_bar_fight', 'dungeon_bar_boss_fight']) {
    assert.match(fr, new RegExp(`"${key}"`), `clé FR manquante : ${key}`);
    assert.match(en, new RegExp(`"${key}"`), `clé EN manquante : ${key}`);
  }
});

