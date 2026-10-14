// ════════════════════════════════════════════════════════════════════════════
// PASSE 38g — 3 retours joueur :
//   B. donjon : la FAUNE du lieu est respectée — les rares de la zone sont
//      les BOSS, les peu communs les combats CORsés, les communs les combats
//      ordinaires (ex. Forêt de Jade : boss = Pikachu, plus Raichu) ;
//   R. les légendaires ERRANTS ne peuvent pas tomber sur une zone donjon ;
//   H. barres de PV : la barre affiche 100 % quand le texte lit « plein »
//      (les PV du moteur sont flottants : 45,9999/46 → texte 46/46, barre
//      pleine, plus d'oscillation avec la transition 0,3 s).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickWildFromTable, ROAMING_CHANCE } from '../src/domain/world/encounter-rules.js';
import { hpDisplay, hpBarPct } from '../src/ui/game/battle-ui.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ─── B. FAUNE DU LIEU : RARE → BOSS, PEU COMMUN → ÉLITE, COMMUN → COMBAT ───
test('38g-B1 — la Forêt de Jade : Pikachu (25) est le RARE, donc le boss', () => {
  const forest = [[10, 3, 5, 'common'], [13, 3, 5, 'common'], [11, 4, 6, 'uncommon'], [14, 4, 6, 'uncommon'], [25, 3, 5, 'rare']];
  // seau rare → Pikachu (le seul rare), JAMAIS Raichu (26, absent du lieu)
  const boss = pickWildFromTable(forest, { bucketHint: 'rare', rng: () => 0.5 });
  assert.equal(boss.speciesId, 25, 'le boss de la Forêt de Jade est Pikachu');
  assert.notEqual(boss.speciesId, 26, 'Raichu n\'est pas disponible dans le lieu');
  // peu commun → Metapod (11) ou Kakuna (14) : les combats corsés
  const elite = pickWildFromTable(forest, { bucketHint: 'uncommon', rng: () => 0.5 });
  assert.ok([11, 14].includes(elite.speciesId), 'élite = peu commun de la zone');
  // commun → Caterpie (10) ou Weedle (13) : les combats ordinaires
  const combat = pickWildFromTable(forest, { bucketHint: 'common', rng: () => 0.5 });
  assert.ok([10, 13].includes(combat.speciesId), 'combat = commun de la zone');
});

test('38g-B2 — _dgBossSpecies cible le seau RARE du lieu, sans évolution finale', () => {
  const src = read('src/application/encounter-system.js');
  const bloc = src.slice(src.indexOf('function _dgBossSpecies'), src.indexOf('function applyDungeonBossBuff'));
  assert.match(bloc, /for \(const bucket of \['rare', 'uncommon', 'common'\]\)/, 'repli par palier rare → peu commun → commun');
  assert.match(bloc, /t\.bucket === bucket/, 'l\'espèce est choisie dans le seau étiqueté');
  assert.match(bloc, /hasLabels/, 'les tables étiquetées ne passent pas par l\'évolution');
  // chemin RARE : AUCUNE évolution finale — l'espèce du lieu est prise telle quelle
  const rarePath = bloc.slice(bloc.indexOf('const hasLabels'), bloc.indexOf('// Table sans étiquette'));
  assert.doesNotMatch(rarePath, /_dgFinalEvolution/, 'pas d\'évolution pour une zone étiquetée (Pikachu, pas Raichu)');
  // repli des tables sans étiquette : l'évolution reste (l'ancien gardien)
  const fallback = bloc.slice(bloc.indexOf('// Table sans étiquette'));
  assert.match(fallback, /_dgFinalEvolution/, 'l\'évolution reste pour les tables sans rareté');
});

test('38g-B3 — l\'ECS force le seau selon la case engagée (combat → common, élite → uncommon)', () => {
  const src = read('src/application/ecs-gameplay-systems.js');
  const bloc = src.slice(src.indexOf('let bucketHint = null;'), src.indexOf('const pick = pickWildFromTable'));
  assert.match(bloc, /pn\.type === 'elite'\) \? 'uncommon'/, 'élite → seau peu commun');
  assert.match(bloc, /pn\.type === 'combat' \? 'common'/, 'combat → seau commun');
  assert.match(bloc, /currentDungeonRun/, 'le seau ne s\'applique qu\'en expédition');
});

// ─── R. AUCUN LÉGENDARRE ERRANT EN ZONE DONJON ──────────────────────────────
test('38g-R1 — pickWildFromTable : un seau forcé (donjon) désactive le roaming', () => {
  const wild = [[10, 3, 6, 'common']];
  // sans seau : rng 0.001 < 0.003 → roaming forcé
  const roam = pickWildFromTable(wild, { roamingId: 144, rng: () => 0.001 });
  assert.equal(roam.isRoaming, true);
  // avec un seau forcé (case de donjon) : le roaming est impossible
  const noRoam = pickWildFromTable(wild, { roamingId: 144, rng: () => 0.001, bucketHint: 'common' });
  assert.equal(noRoam.isRoaming, false, 'pas de roaming sur une case de donjon');
  assert.equal(noRoam.speciesId, 10);
});

test('38g-R2 — getRoamingLegendaryForRoute renvoie null pour une zone donjon', () => {
  const src = read('src/application/world/roaming.js');
  assert.match(src, /loc\.type === 'dungeon'\) return null;/, 'un donjon n\'accueille aucun errant');
  assert.match(src, /getLocObj/, 'la vérification s\'appuie sur le type du lieu');
});

// ─── H. BARRES DE PV : PLEINES QUAND LE TEXTE LIT « PLEIN » ─────────────────
test('38g-H1 — hpBarPct : 100 % dès que le texte affiche « full » (PV flottants)', () => {
  // le moteur stocke des PV flottants : 45,9999/46 → texte 46/46 → barre 100 %
  assert.equal(hpDisplay(45.9999), '46', 'le texte arrondit au-dessus');
  assert.equal(hpBarPct(45.9999, 46), 1, 'barre pleine à full hp (avant : 99,99 %)');
  assert.equal(hpBarPct(46, 46), 1, 'plein exact → 100 %');
  assert.equal(hpBarPct(0, 46), 0, 'à terre → 0 %');
  // cohérence texte/barre : 41/46 → ~89 % (le ratio brut 40,2/46 donnait 87 %)
  const pct = hpBarPct(40.2, 46);
  const disp = Number(hpDisplay(40.2)) / Number(hpDisplay(46));
  assert.ok(Math.abs(pct - disp) < 1e-9, 'la barre suit EXACTEMENT les PV affichés');
  assert.ok(pct > 0.85 && pct < 0.95, '41/46 → entre 85 % et 95 %');
});

test('38g-H2 — les trois rendus de barre utilisent les PV affichés', () => {
  const bui = read('src/ui/game/battle-ui.js');
  assert.match(bui, /const pct = pokemon\.maxHP \? hpBarPct\(pokemon\.currentHP, pokemon\.maxHP\) : 0;/, 'combat : barre = hpBarPct');
  const card = read('src/ui/components/pokemon-card-element.js');
  assert.match(card, /_hpDisp\(poke\.currentHP\) \/ _dm/, 'cartes/PC : barre sur les PV affichés');
  const team = read('src/ui/game/battle-team-ui.js');
  assert.match(team, /_dc \/ _dm/, 'rangée d\'équipe : barre sur les PV affichés');
  assert.match(team, /globalThis\.hpDisplay/, 'le rendu partage le helper affiché');
});

test('38g-H3 — hpDisplay reste l\'arrondi d\'affichage (jamais de virgule flottante)', () => {
  assert.equal(hpDisplay(6.899999999999999), '7', '6,8999… → « 7 »');
  assert.equal(hpDisplay(0.0001), '1', 'debout → au moins 1 PV affiché');
  assert.equal(hpDisplay(0), '0', 'à terre → 0');
  assert.equal(hpDisplay(Number.NaN), '?', 'indéfini → ?');
});
