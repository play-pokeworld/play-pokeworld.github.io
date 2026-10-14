// PASSE 35 — verrous sur les 4 retours du joueur :
//  1. paysage : plus de transition douce sol/ciel, végétation POSÉE au sol
//  2. donjons : pas de cycle quitter → reprendre ; « Quitter » ≠ encaisser
//  3. la chaîne de combats ne s'arrête plus à chaque Pokémon vaincu
//  4. le gardien final est un VRAI boss
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const css = read('src/assets/styles/design-system.css');
const run = read('src/application/world/dungeon-run.js');
const flow = read('src/application/combat/battle-flow.js');
const status = read('src/application/combat/battle-status.js');
const enc = read('src/application/encounter-system.js');
const tick = read('src/domain/battle/tick.js');
const fr = read('src/localization/fr/economy.js');
const en = read('src/localization/en/economy.js');

/**
 * Corps EXACT d'une fonction nommée, accolades équilibrées, commentaires ôtés.
 * Un simple `slice(i, i + n)` déborde sur la fonction suivante et produit des
 * verdicts faux (piège rencontré en passe 35 : `dungeonQuitFromBattle` semblait
 * contenir `dungeonAscend`, qui appartenait en fait à la fonction d'après).
 */
function corps(src, nom) {
  const i = src.indexOf('function ' + nom);
  assert.ok(i > -1, `${nom} doit exister`);
  const debut = src.indexOf('{', i);
  let profondeur = 0, fin = debut;
  for (let k = debut; k < src.length; k++) {
    if (src[k] === '{') profondeur++;
    else if (src[k] === '}') { profondeur--; if (profondeur === 0) { fin = k + 1; break; } }
  }
  return src.slice(i, fin).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

// ── 1. PAYSAGE ─────────────────────────────────────────────────────────────
test('35.1 — le sol et le ciel sont des aplats francs, sans dégradé de raccord', () => {
  // Attention : « body::after » apparaît d'abord dans un COMMENTAIRE de
  // schéma des couches. On vise la vraie règle, en début de ligne.
  const i = css.search(/^body::after\s*\{/m);
  assert.ok(i > -1, 'la couche de paysage doit exister');
  const bloc = css.slice(i, css.indexOf('}', i) + 1);
  // Une ligne de pose franche : chaque niveau s'arrête et le suivant démarre
  // à la MÊME hauteur (pas de stop intermédiaire qui fondrait les deux).
  assert.match(bloc, /--pw-land-h-horizon/, 'la hauteur d\'horizon doit piloter la couche');
  assert.match(bloc, /--pw-land-h-grass/, 'la hauteur d\'herbe doit piloter la couche');
  assert.match(bloc, /--pw-land-h-ground/, 'la hauteur de sol doit piloter la couche');
});

test('35.1 — passe 36 : plus d\'arête de coupure, le dégradé d\'origine revient', () => {
  // Retour joueur : « enlève les traits bizarres de coupure nette et remets le
  // dégradé d\'origine ». Les trois arêtes --pw-land-edge de la passe 35 sont
  // parties : la règle body::after ne doit plus en consommer AUCUNE.
  const i = css.search(/^body::after\s*\{/m);
  const bloc = css.slice(i, css.indexOf('}', i) + 1);
  assert.ok(!/var\(--pw-land-edge/.test(bloc),
    'aucune ligne de coupure nette dans le paysage');
  // … et le raccord entre les bandes est bien un DÉGRADÉ (stops calc intermédiaires)
  assert.match(bloc, /calc\(var\(--pw-land-h-horizon\)\s*[-+]\s*\d+vh\)/,
    'la transition ciel → horizon s\'étale sur plusieurs vh');
  // PASSE 37 — la transition herbe → sol est désormais NETTE, pile sur la
  // ligne où se posent les frises (retour joueur) ; le doux reste au-dessus.
  assert.match(bloc, /var\(--pw-land-ground\)\s+var\(--pw-land-h-ground\)/,
    'la bascule sol se fait exactement à la ligne de pose des frises');
});

// ── 2. DONJONS : pas de cycle quitter → reprendre ───────────────────────────
test('35.2 — « Quitter » en combat abandonne, il n\'encaisse PAS', () => {
  const body = corps(flow, 'doLeaveBattle');
  assert.match(body, /dungeonQuitFromBattle/, 'Quitter doit router vers l\'abandon en donjon');
  assert.ok(!/dungeonAscend/.test(body), 'Quitter ne doit JAMAIS remonter et encaisser');
});

test('35.2 — l\'abandon depuis le combat ne crédite pas le sac', () => {
  const body = corps(run, 'dungeonQuitFromBattle');
  assert.match(body, /dungeonAbandon\(/, 'il doit passer par l\'abandon');
  assert.match(body, /_dgSuppressAutoResume\(\)/, 'il doit couper la relance automatique');
  assert.ok(!/dungeonAscend|creditWallet|addMoney/.test(body),
    'aucun encaissement ne doit avoir lieu');
});

test('35.2 — le bouton « Reprendre le combat » a disparu du bandeau', () => {
  const body = corps(run, 'renderBattleDungeonBar');
  // Il ne subsiste que pour le TOUT PREMIER engagement (aucune victoire).
  if (/dungeon_bar_fight/.test(body)) {
    assert.match(body, /totalWins\s*===\s*0/,
      'un bouton d\'engagement ne peut subsister qu\'avant la 1re victoire');
  }
});

test('35.2 — la relance automatique existe et se laisse museler', () => {
  assert.match(run, /function _dgAutoResume/, 'la relance automatique doit exister');
  assert.match(run, /function _dgSuppressAutoResume/, 'on doit pouvoir la museler');
  const body = corps(run, '_dgAutoResume');
  assert.match(body, /aliveCount\(\)/, 'elle ne doit pas relancer une équipe K.O.');
  assert.match(body, /dungeonFight\(\)/, 'elle doit relancer le combat');
  // Toutes les sorties doivent la museler, sinon un combat repart derrière.
  for (const fn of ['dungeonAscend', 'dungeonAbandon', 'dungeonDescend', 'dungeonOnWipe']) {
    assert.match(corps(run, fn), /_dgSuppressAutoResume\(\)/,
      `${fn} doit couper la relance automatique`);
  }
});

// ── 3. LA CHAÎNE NE S'ARRÊTE PLUS À CHAQUE K.O. ────────────────────────────
test('35.3 — l\'arrêt est conditionné au QUOTA, pas à chaque victoire', () => {
  const i = status.indexOf('PASSE 33');
  const bloc = status.slice(i, i + 2400).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const idxStop = bloc.indexOf('_dgStop = true');
  assert.ok(idxStop > -1, 'un arrêt doit exister pour le changement de palier');
  // L'arrêt doit être gardé par une condition de quota/palier franchi.
  const avant = bloc.slice(Math.max(0, idxStop - 600), idxStop);
  assert.match(avant, /dungeonFloorCleared|quota|wins\s*>=/,
    'l\'arrêt ne doit survenir qu\'au franchissement de palier');
});

test('35.3 — la fin de combat relance la chaîne quand le run est actif', () => {
  const body = corps(flow, 'endBattle');
  assert.match(body, /_dgAutoResume/, 'la fin de combat doit rappeler la relance automatique');
});

// ── 4. LE GARDIEN EST UN VRAI BOSS ─────────────────────────────────────────
test('35.4 — le gardien prend l\'espèce la plus forte du lieu, évoluée à fond', () => {
  assert.match(enc, /function _dgBossSpecies/, 'le choix d\'espèce d\'élite doit exister');
  assert.match(enc, /function _dgFinalEvolution/, 'l\'évolution finale doit être suivie');
  const sp = corps(enc, '_dgBossSpecies');
  // Les tables de faune sont des TUPLES [id, min, max, rareté] : lire w.id
  // seulement renverrait NaN et l'élite retomberait silencieusement.
  assert.match(sp, /Array\.isArray\(w\)\s*\?\s*w\[0\]/,
    'le format tuple des tables de faune doit être géré');
  assert.match(sp, /_dgBaseStatTotal|bestScore/, 'la sélection doit comparer les stats de base');
  const evo = corps(enc, '_dgFinalEvolution');
  assert.match(evo, /LEVEL_EVO_MAP/, 'la vraie table d\'évolutions du projet doit être utilisée');
});

test('35.4 — le gardien surclasse nettement un sauvage du même palier', () => {
  const body = corps(enc, 'applyDungeonBossBuff');
  assert.match(body, /maxHP\s*=\s*Math\.round\([\s\S]*?\*\s*4\.5\)/, 'les PV du gardien doivent être massifs');
  assert.match(body, /isDungeonBoss\s*=\s*true/, 'il doit être marqué comme gardien');
  assert.match(body, /_dgBossMods/, 'ses modificateurs de camp doivent être préparés');
  // Le niveau ne doit être calculé qu'UNE fois (le double comptage était un bug).
  assert.match(body, /const bossLevel/, 'le niveau doit être calculé une seule fois');
  const occurrences = (body.match(/\+\s*8\s*\+\s*depth\s*\*\s*2/g) || []).length;
  assert.equal(occurrences, 1, 'le bonus de niveau ne doit pas être compté deux fois');
});

test('35.4 — les modificateurs survivent au reset d\'initialisation du combat', () => {
  // `startBattle`/`spawnNextWild` réinitialisent battle.enemyMods APRÈS le
  // buff : les poser directement serait silencieusement effacé.
  const body = corps(enc, 'applyDungeonBossBuff');
  assert.ok(!/battle\.enemyMods\.atk\s*=/.test(body),
    'les mods ne doivent pas être posés dans le buff (ils seraient écrasés)');
  assert.match(enc, /function dungeonBossTick/, 'un hook de tick doit les installer');
  const hook = corps(enc, 'dungeonBossTick');
  assert.match(hook, /_dgBossModsApplied/, 'l\'installation ne doit avoir lieu qu\'une fois');
  assert.match(hook, /enemyMods/, 'le hook doit poser les modificateurs');
});

test('35.4 — la furie se déclenche sous 50 % de PV, une seule fois', () => {
  const hook = corps(enc, 'dungeonBossTick');
  assert.match(hook, /_dgEnraged/, 'la furie doit être mémorisée');
  assert.match(hook, /0\.5/, 'le seuil doit être la moitié des PV');
  assert.match(hook, /dungeon_boss_enrage/, 'la furie doit être annoncée au joueur');
  // Le hook doit être réellement branché sur la boucle de combat.
  assert.match(tick, /dungeonBossTick/, 'la boucle de combat doit appeler le hook');
});

test('35.4 — les annonces du gardien sont traduites FR et EN', () => {
  for (const [nom, src] of [['fr', fr], ['en', en]]) {
    for (const cle of ['dungeon_quit_battle', 'dungeon_boss_appears', 'dungeon_boss_enrage']) {
      assert.match(src, new RegExp('"' + cle + '"'), `${cle} doit exister en ${nom}`);
    }
  }
  // Le nom porte déjà le préfixe « Gardien » : pas de doublon dans l'annonce.
  assert.ok(!/GARDIEN \{name\}/.test(fr), 'l\'annonce ne doit pas redoubler le préfixe');
});

