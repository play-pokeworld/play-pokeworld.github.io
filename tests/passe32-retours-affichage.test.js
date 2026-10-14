// ════════════════════════════════════════════════════════════════════════════
// PASSE 32 — les 10 retours d'affichage du joueur
// ════════════════════════════════════════════════════════════════════════════
// Chaque test cite la consigne à laquelle il répond. Ces garde-fous existent
// pour qu'une passe ultérieure ne défasse pas silencieusement ces réglages.
//
// NB : ce fichier est distinct de `passe32-bounded-battles.test.js`, qui vient
// du dump d'origine et traite d'un tout autre sujet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const MAIN = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const MORPH = readFileSync(new URL('../src/ui/game/dom-morph.js', import.meta.url), 'utf8');
const DAYTIME = readFileSync(new URL('../src/ui/game/daytime.js', import.meta.url), 'utf8');
const CARD = readFileSync(new URL('../src/ui/components/poke-full-card.js', import.meta.url), 'utf8');
const TEAMUI = readFileSync(new URL('../src/ui/game/battle-team-ui.js', import.meta.url), 'utf8');

/**
 * Règles `:hover` capables d'atteindre une CARTE DE COMBAT.
 *
 * Une règle est inoffensive dans trois cas :
 *  - elle exclut explicitement la rangée (`:not(#battle-team-row)`) ;
 *  - elle est cantonnée à un autre conteneur (fenêtre équipe, boîte, base…),
 *    où le survol reste légitime et souhaité ;
 *  - elle liste AUSSI le sélecteur sans `:hover` dans la même règle : le
 *    survol reçoit alors exactement la même mise en page que l'état de repos,
 *    donc il ne change rien (c'est le cas de la grille de `#battle-team-row`).
 */
function survolsAtteignantLeCombat(feuille) {
  const sansCommentaires = feuille.replace(/\/\*[\s\S]*?\*\//g, '');
  const trouves = [];
  for (const [, selecteurs, corps] of sansCommentaires.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const parts = selecteurs.split(',').map((x) => x.trim()).filter(Boolean);
    for (const part of parts) {
      if (!/:hover/.test(part)) continue;
      if (!/\.poke-card|\.pw-poke-card/.test(part)) continue;
      if (/:not\(#battle-team-row\)/.test(part)) continue;
      // cantonnée ailleurs que dans la rangée de combat ?
      const ancre = part.match(/#[\w-]+|\.box-card|\.box-tile/);
      if (ancre && ancre[0] !== '#battle-team-row') continue;
      // le même bloc applique-t-il déjà la règle hors survol ?
      if (parts.includes(part.replace(/:hover/g, ''))) continue;
      trouves.push({ sel: part, corps: corps.trim() });
    }
  }
  return trouves;
}

/** Tranche de la feuille de style couvrant une section « 32.x ». */
function section(n) {
  const start = CSS.indexOf(`── 32.${n} —`);
  assert.notStrictEqual(start, -1, `section 32.${n} introuvable`);
  const next = CSS.indexOf(`── 32.${n + 1} —`, start);
  return CSS.slice(start, next === -1 ? CSS.length : next);
}
/** Lignes de déclaration réelles (hors commentaires). */
const codeLines = (s) => s.split('\n').filter((l) => !l.trim().startsWith('/*') && !l.trim().startsWith('*') && !l.trim().startsWith('//'));

// ─── 1. Le re-render global du combat ───────────────────────────────────────
// « la poké ball qui tourne se remet à 0 à chaque pokémon adverse […] c'est
//   toute la page de combat qui se re-render, c'est ça qu'il faut corriger »
test('32.1 — la rangée de combat est réconciliée (morphing), pas réécrite', () => {
  assert.match(MORPH, /pwMorphHtml/, 'le module de morphing doit exposer pwMorphHtml');
  assert.match(MORPH, /morphKey/, 'la réconciliation doit s\'appuyer sur une clé d\'identité');
  assert.match(MAIN, /dom-morph\.js/, 'le module doit être chargé par main.js');
  // la rangée passe par le morphing et non plus par une écriture brute
  assert.match(TEAMUI, /pwMorphHtml/, 'renderBattleTeamRow doit morpher la rangée');
  // La carte émet bien une clé stable, sinon le morphing recrée les noeuds.
  // Attention : le vdom écrit `dataset: { pwKey }`, ce que le moteur sérialise
  // en attribut `data-pw-key` — chercher la forme tiretée dans le JS échoue.
  assert.match(CARD, /dataset:\s*morphKey\s*\?\s*\{\s*pwKey/,
    'la carte doit poser pwKey dans son dataset (rendu : data-pw-key)');
  assert.match(MORPH, /data-pw-key/, 'le morphing doit relire l\'attribut data-pw-key');
});

test('32.1 — la clé d\'identité repose sur l\'uid, stable d\'un rendu à l\'autre', () => {
  assert.ok(/uid/.test(TEAMUI) || /uid/.test(CARD), 'la clé doit dériver de l\'uid du Pokémon');
});

// ─── 2. La hauteur des sprites ──────────────────────────────────────────────
// « les sprites des pokémons en combat sont toujours trop petit en hauteur,
//   la largeur […] est bonne n'y touche pas »
test('32.2 — la HAUTEUR des sprites est pilotée par des tokens dédiés', () => {
  const s = section(1);
  for (const tok of ['--pc-battle-sprite-h', '--pc-bench-sprite-h']) {
    assert.ok(s.includes(tok), `${tok} doit exister : la hauteur est découplée de la largeur`);
  }
  // le sprite occupe toute la hauteur offerte, la largeur suit d'elle-même
  assert.match(s, /height:\s*100%/, 'le sprite doit remplir la hauteur');
  assert.match(s, /width:\s*auto/, 'la largeur doit rester automatique (non touchée)');
});

test('32.2 — les sprites sont ancrés au sol, comme chez Pokéchill', () => {
  assert.match(section(1), /center\s+bottom/, 'ancrage bas : le Pokémon repose sur le sol');
});

// ─── 3. Le survol ───────────────────────────────────────────────────────────
// « le survol est encore actif sur les pokémons en combat […] le survol ne
//   doit rien faire du tout »
test('32.3 — le survol ne repeint AUCUNE des propriétés concernées', () => {
  // PASSE 34 — le test suit le changement de stratégie (cf. 31.3).
  // On ne neutralise plus après coup : les blocs §30/§31/§32.3/§33.3 ont été
  // supprimés et les règles fautives excluent maintenant `#battle-team-row`.
  // Vérifier la présence d'un neutralisant n'a donc plus de sens ; on vérifie
  // le RÉSULTAT, propriété par propriété, sur l'ensemble de la feuille.
  const s = section(3);
  assert.match(s, /SUPPRIMÉ/, 'le neutralisant §32.3 doit avoir été retiré');

  // Reconstitution des règles `:hover` pouvant atteindre une carte de combat.
  const atteintes = [];
  for (const { sel, corps } of survolsAtteignantLeCombat(CSS)) {
    for (const prop of ['background', 'transform', 'border-color', 'box-shadow', 'filter']) {
      if (new RegExp(prop).test(corps)) atteintes.push(`${prop} ← ${sel.slice(0, 60)}`);
    }
  }
  assert.deepEqual(atteintes, [],
    'aucune propriété ne doit être repeinte au survol d\'une carte de combat');
});

// ─── 4. Le sautillement ─────────────────────────────────────────────────────
// « une téléportation haut bas régulière et assez rapide comme Pokéchill
//   (regarde comment fait Pokéchill) »
test('32.4 — le saut reproduit exactement la courbe de Pokéchill', () => {
  const s = section(4);
  assert.match(s, /@keyframes\s+pw32-hop/);
  // 0%/49% en bas, 50%/100% en haut : deux positions TENUES, aucun entre-deux
  assert.match(s, /0%\s*\{\s*transform:\s*translateY\(0\)/);
  assert.match(s, /49%\s*\{\s*transform:\s*translateY\(0\)/);
  assert.match(s, /50%\s*\{\s*transform:\s*translateY\(-5%\)/);
  assert.match(s, /100%\s*\{\s*transform:\s*translateY\(-5%\)/);
  // 0,5 s comme la source, et surtout des steps() : pas d'interpolation
  assert.match(s, /pw32-hop\s+\.5s\s+steps\(1,\s*end\)\s+infinite/);
});

test('32.4 — un Pokémon K.O. ne sautille pas', () => {
  assert.match(section(4), /\.fainted[^{]*\{[^}]*animation:\s*none/);
});

// ─── 5 & 6. Les promeneurs du fond ──────────────────────────────────────────
// « par-dessus le background pas dessous », « pas de halo lumineux sur les
//   shiny », « minimum 5 […] +1 tous les 10 […] sans limite »
test('32.5 — les promeneurs passent au-dessus du décor, sous les fenêtres', () => {
  assert.match(section(8), /#pw-bg-pokemon-layer\s*\{[^}]*z-index:\s*0/);
  // ordre des plans : paysage (-3) < texture (-2) < promeneurs (0) < UI (1)
  const s9 = section(9);
  assert.match(s9, /body::after[\s\S]*?z-index:\s*-3/, 'le paysage est le plan le plus profond');
  assert.match(s9, /body::before\s*\{\s*z-index:\s*-2/, 'la texture passe entre paysage et promeneurs');
  // PASSE 38 — le header est sticky (fixe au scroll), seul le dashboard est
  // relative ; l'interface reste devant le décor.
  assert.match(s9, /#main-dashboard\s*\{[^}]*z-index:\s*1/, 'l\'interface reste devant');
  assert.match(s9, /#header\s*\{\s*position:\s*sticky;\s*top:\s*0;\s*z-index:\s*950/, 'la barre de titre reste fixe');
});

test('32.5 — aucun halo lumineux sur les chromatiques', () => {
  assert.match(section(8), /\.pw-bg-poke\.is-shiny\s*\{[^}]*filter:\s*none/);
});

test('32.5 — les promeneurs sautent comme les Pokémon de combat', () => {
  const s = section(8);
  assert.match(s, /@keyframes\s+pw32-bg-hop/);
  assert.match(s, /pw32-bg-hop\s+\.5s\s+steps\(1,\s*end\)\s+infinite/);
  // RÈGLE D'OR : on n'écrit QUE la variable, jamais le transform complet,
  // sinon le saut écraserait le déplacement horizontal de la traversée.
  assert.ok(!/@keyframes\s+pw32-bg-hop\s*\{[^}]*transform:/.test(s),
    'le saut des promeneurs doit passer par --pw-bg-bob, pas par transform');
});

test('32.6 — peuplement : minimum 5, +1 par 10 captures, sans plafond', async () => {
  const { bgPokemonCount, BG_POKEMON_RULE } = await import('../src/ui/game/bg-pokemon.js');
  assert.deepStrictEqual({ ...BG_POKEMON_RULE }, { min: 5, perCatches: 10, max: Infinity });
  assert.strictEqual(bgPokemonCount(0), 0);
  assert.strictEqual(bgPokemonCount(1), 5);
  assert.strictEqual(bgPokemonCount(10), 6);
  assert.strictEqual(bgPokemonCount(100), 15);
  assert.ok(bgPokemonCount(5000) > 500, 'aucune limite de nombre');
});

// ─── 7. Les badges de l'adversaire ──────────────────────────────────────────
// « sur les pokémons adverses les effets et les buff on l'air plus sombre »
test('32.7 — le voile de la carte sauvage ne couvre plus le contenu', () => {
  const s = section(5);
  // il est restreint à la zone du sprite au lieu de s'étendre en inset:0
  assert.match(s, /right:\s*auto/);
  assert.match(s, /width:\s*var\(--pc-battle-sprite[^)]*\)/);
  // et les informations repassent au-dessus, sans filtre
  assert.match(s, /z-index:\s*3/);
  assert.match(s, /filter:\s*none/);
});

// ─── 8. Le fond en niveaux + cycle jour/nuit ────────────────────────────────
// « différents niveaux sol-herbes-dégradé vers le ciel mais en changeant les
//   couleurs à chaque thème […] cycle jour nuit […] avec un debug pour switch »
test('32.8 — le fond dessine sol → herbe → horizon → ciel', () => {
  const s = section(9);
  for (const tok of ['--pw-land-sky', '--pw-land-horizon', '--pw-land-grass', '--pw-land-ground']) {
    assert.ok(s.includes(tok), `la bande ${tok} doit exister`);
  }
  assert.match(s, /body::after/, 'le paysage est peint sur body::after');
  assert.match(s, /linear-gradient/, 'les niveaux forment un dégradé, plus un aplat uni');
  assert.match(s, /position:\s*fixed/, 'le décor ne défile pas avec le contenu');
  assert.match(s, /pointer-events:\s*none/, 'le décor ne doit jamais intercepter les clics');
});

test('32.8 — chaque thème redéfinit sa propre palette de paysage', () => {
  const s = section(9);
  const themes = ['light', 'gameboy', 'fire', 'ocean', 'forest', 'sakura', 'midnight', 'desert', 'contrast'];
  for (const t of themes) {
    const re = new RegExp(`\\[data-theme="${t}"\\][^{]*\\{[^}]*--pw-land-sky`);
    assert.match(s, re, `le thème ${t} doit décliner son ciel`);
  }
});

test('32.8 — les quatre phases du cycle existent et diffèrent', () => {
  const s = section(9);
  for (const ph of ['dawn', 'day', 'dusk', 'night']) {
    assert.match(s, new RegExp(`\\[data-daytime="${ph}"\\]`), `la phase ${ph} doit exister`);
  }
  // la nuit doit réellement assombrir par rapport au jour
  const night = s.slice(s.indexOf('[data-daytime="night"]'));
  assert.match(night, /--pw-land-bright:\s*\.(\d+)/, 'la nuit baisse la luminosité');
});

test('32.8 — les phases suivent l\'HEURE SYSTÈME du joueur', async () => {
  const { daytimePhaseForHour } = await import('../src/ui/game/daytime.js');
  assert.strictEqual(daytimePhaseForHour(7), 'dawn');
  assert.strictEqual(daytimePhaseForHour(12), 'day');
  assert.strictEqual(daytimePhaseForHour(19), 'dusk');
  assert.strictEqual(daytimePhaseForHour(23), 'night');
  assert.strictEqual(daytimePhaseForHour(3), 'night');
  // bornes exactes
  assert.strictEqual(daytimePhaseForHour(6), 'dawn');
  assert.strictEqual(daytimePhaseForHour(9), 'day');
  assert.strictEqual(daytimePhaseForHour(18), 'dusk');
  assert.strictEqual(daytimePhaseForHour(21), 'night');
  // robustesse : toute heure produit une phase connue
  for (let h = 0; h < 24; h++) {
    assert.ok(['dawn', 'day', 'dusk', 'night'].includes(daytimePhaseForHour(h)), `heure ${h}`);
  }
});

test('32.8 — le bouton de debug jour/nuit est présent et câblé', () => {
  assert.match(HTML, /id="debug-daytime-btn"/, 'le bouton doit vivre dans le tiroir Debug');
  assert.match(HTML, /data-call="debugCycleDaytime"/, 'il doit appeler le cycle');
  assert.match(HTML, /id="debug-daytime-state"/, 'il doit afficher son état');
  assert.match(DAYTIME, /function debugCycleDaytime/);
  assert.match(MAIN, /daytime\.js/, 'le module doit être chargé');
});

test('32.8 — le cycle de debug parcourt les 4 phases puis rend la main', async () => {
  const { PW_DAYTIME_PHASES } = await import('../src/ui/game/daytime.js');
  assert.deepStrictEqual([...PW_DAYTIME_PHASES], ['dawn', 'day', 'dusk', 'night']);
});

// ─── 9. Le PNJ de la carte ──────────────────────────────────────────────────
// « le pnj de la carte qui nous représente ne doit pas bouger »
test('32.9 — le marqueur du joueur sur la carte est immobile', () => {
  const s = section(7);
  assert.match(s, /\.pw-map-player-bob/);
  assert.match(s, /animation:\s*none/);
  const anims = codeLines(s).filter((l) => /animation:/.test(l));
  assert.ok(anims.length > 0 && anims.every((l) => /none/.test(l)),
    'aucune animation résiduelle sur le marqueur du joueur');
});

// ─── 10. L'écran de repos au démarrage ──────────────────────────────────────
// « quand on vient juste de démarrer le jeu ou refresh il est très mal placé
//   et il y a l'air d'avoir des éléments dessous »
test('32.10 — la scène de combat reste masquée tant qu\'aucun combat n\'a lieu', () => {
  const s = section(6);
  // la cause racine : `#battle-active-scene{display:flex}` posé par ID
  assert.match(s, /#battle-active-scene:not\(\.is-live\)/,
    'la scène ne doit s\'afficher qu\'une fois réellement allumée');
  assert.match(s, /display:\s*none/);
});

