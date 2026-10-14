// ════════════════════════════════════════════════════════════════════════════
// PASSE 30 — 8 correctifs d'affichage + les 5 éléments P3 manquants
// ════════════════════════════════════════════════════════════════════════════
// Ces tests verrouillent les demandes explicites de l'utilisateur pour cette
// passe. Ils sont volontairement écrits sur les SOURCES (CSS / JS) : les
// comportements visuels sont vérifiés à part au navigateur (.devshots), mais
// les contrats structurels doivent rester vrais après toute refonte ultérieure.

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const css = read('src/assets/styles/design-system.css');
const battleAdapter = read('src/ui/game/battle-team-ui.js');
const battleUi = read('src/ui/game/battle-ui.js');
const mineJs = read('src/application/economy/mine.js');
const mineUi = read('src/ui/game/mine-ui.js');
const mineView = read('src/ui/views/MineWindowView.js');
const bgPoke = read('src/ui/game/bg-pokemon.js');
const mapRender = read('src/ui/game/map-render.js');
const catchJs = read('src/application/combat/catch.js');
const mainJs = read('src/main.js');

// section CSS de la passe 30 (tout ce qui suit le grand cartouche)
const P30 = css.slice(css.indexOf('PASSE 30'));

// ─────────────────────────────────────────────────────────────────────────────
// 1. L'écran de repos épouse son sprite de fond
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — l\'écran de repos est au format exact du décor (240×112)', () => {
  const s = P30.slice(P30.indexOf('30.1 — ÉCRAN'), P30.indexOf('30.2 — LA POKÉ BALL'));
  assert.match(s, /#battle-idle-screen/);
  assert.match(s, /aspect-ratio:\s*240\s*\/\s*112/);
  // pas de hauteur figée qui déformerait le décor
  assert.match(s, /--pc-scene-url/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. La Poké Ball décorative est de retour, en rotation, chez NOUS seulement
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — la Poké Ball décorative tourne derrière notre Pokémon actif', () => {
  const s = P30.slice(P30.indexOf('30.2 — LA POKÉ BALL'), P30.indexOf('30.3 —'));
  assert.match(s, /\.poke-card\.active/);
  assert.match(s, /pokeball\.svg/);
  assert.match(s, /pw28-flair-spin/);
  // elle doit rester DERRIÈRE le sprite
  assert.match(s, /z-index:\s*2/);
});

test('PASSE 30 — le sauvage n\'a aucun fond dédié (halo 29.5 supprimé)', () => {
  assert.ok(!/pw29-halo-breathe/.test(css), 'le halo ovale de la passe 29 doit avoir disparu');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Les attaques de l'ennemi sont empilées verticalement
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — les attaques du sauvage sont en colonne, comme les nôtres', () => {
  const s = P30.slice(P30.indexOf('30.3 —'), P30.indexOf('30.4 —'));
  assert.match(s, /#battle-team-row\s*>\s*\.poke-card:first-child/);
  assert.match(s, /flex-direction:\s*column/);
  // règle de survie du ticker 60 fps : jamais de display:none sur les vides
  assert.ok(!/\.poke-move\.empty[^{]*\{[^}]*display:\s*none/.test(P30));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Étoile shiny et Poké Ball de capture
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — la Poké Ball de capture est rendue pour TOUS, plus seulement l\'ennemi', () => {
  // le ternaire « isEnemy ? ball : '' » du modèle de carte a disparu
  assert.ok(!/caughtBallHtml:[^\n]*isEnemy\s*\?/.test(battleAdapter),
    'caughtBallHtml ne doit plus dépendre de isEnemy');
  assert.match(battleAdapter, /caughtBallHtml:[\s\S]{0,220}caughtStatusBallHtml\(p\.id,\s*16\)/);
});

// PASSE 31 — consigne explicite qui REMPLACE celle de la passe 30 : l'étoile
// chromatique ne doit plus apparaître du tout en combat. On coupe la source
// côté modèle (jamais en CSS : masquer en `display:none !important` laisse le
// JS produire l'élément pour rien). La Poké Ball d'état, elle, RESTE affichée
// sur nos Pokémon — c'est elle qui distingue « capturé » de « capturé shiny ».
test('PASSE 31 — l\'étoile shiny a disparu du combat, la Poké Ball d\'état reste', () => {
  assert.match(battleAdapter, /shinyStar:\s*false/);
  assert.ok(!/shinyStar:\s*!!p\.shinyActive/.test(battleAdapter),
    'le combat ne doit plus produire d\'étoile chromatique');
  // la Poké Ball capturé / capturé-chromatique reste rendue pour tout le monde
  assert.match(battleAdapter, /caughtBallHtml:[\s\S]{0,220}caughtStatusBallHtml\(p\.id,\s*16\)/);
  assert.match(P30, /\.caught-status-ball/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. L'animation de gain de monnaie part du montant
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — le nombre flottant décolle depuis la ligne du montant', () => {
  const s = P30.slice(P30.indexOf('30.6 —'), P30.indexOf('30.7 —'));
  assert.match(s, /--pw-cur-amount-top/);
  assert.match(s, /\.pw-cur-fx/);
  // et toujours dans la fenêtre Monnaies, nulle part ailleurs
  assert.ok(!/#header[^{]*\.pw-fx-float/.test(css));
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Fond global : main-bg.png défilant, pas le décor du lieu
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — le fond global de la page reste main-bg.png défilant', () => {
  const m = /body::before\s*\{[\s\S]*?\}/g;
  const blocks = css.match(m) || [];
  assert.ok(blocks.length >= 1, 'body::before doit exister');
  const withBg = blocks.filter(b => /background/.test(b));
  // aucune règle body::before ne doit peindre le décor du lieu
  for (const b of withBg) {
    assert.ok(!/--pc-scene-url/.test(b), 'le décor du lieu ne doit pas envahir le fond global');
  }
  assert.ok(withBg.some(b => /main-bg\.png/.test(b)), 'main-bg.png doit rester le fond global');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Fonds d'entraînement
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — l\'entraînement a gym.png derrière la paire ET par emplacement', () => {
  const s = P30.slice(P30.indexOf('30.8 —'));
  assert.match(s, /\.training-live-card/);
  assert.match(s, /\.training-live-duel/);
  assert.match(s, /\.training-live-poke/);
  assert.ok((s.match(/gym\.png/g) || []).length >= 2, 'gym.png doit habiller la paire et les emplacements');
});

// ═════════════════════════════════════════════════════════════════════════════
// P3 — les 5 éléments manquants
// ═════════════════════════════════════════════════════════════════════════════

// P3-a : animations de combat (barre d'XP fluide + pulsation de niveau)
test('P3 — la barre d\'XP est interpolée par smoothBar, plus peinte en dur', () => {
  assert.match(battleUi, /smoothBar\(/);
  assert.match(css, /\.pw-fx-smooth\s*\{\s*transition:\s*width/);
});

test('P3 — le passage de niveau déclenche la pulsation ANI-01', () => {
  assert.match(battleUi, /pulseElement\(/);
  assert.match(battleUi, /pwLvlSeen/);
});

test('P3 — secousse et éclat de capture restent branchés', () => {
  assert.match(read('src/application/combat/battle-attack.js'), /shakeElement\(/);
  assert.match(catchJs, /flashCapture\(/);
});

// P3-b : les sprites de combat respirent (haut-bas façon Pokéchill)
test('P3 — les sprites de combat ont un mouvement haut-bas continu', () => {
  assert.match(P30, /@keyframes pw30-bob/);
  assert.match(P30, /#battle-team-row \.poke-card \.poke-sprite img[\s\S]{0,160}animation:\s*pw30-bob/);
  // l'agrandissement des sprites ne doit pas être écrasé par l'animation
  assert.match(P30, /pw30-bob[\s\S]{0,400}scale\(var\(--pw-bob-scale/);
  // un Pokémon K.O. ne flotte pas
  assert.match(P30, /\.fainted[\s\S]{0,120}animation:\s*none/);
});

// P3-c : nos Pokémon capturés se promènent sur le fond
test('P3 — la couche de promeneurs existe et ne peut pas gêner l\'interface', () => {
  assert.match(P30, /#pw-bg-pokemon-layer/);
  assert.match(P30, /pointer-events:\s*none/);
  assert.match(P30, /z-index:\s*-1/);
  assert.match(mainJs, /bg-pokemon\.js/);
});

// PASSE 32 — la règle de peuplement change ENCORE, sur consigne explicite du
// joueur : « minimum 5 pokémon avec 1 de plus tous les 10 pokémon et sans
// limite de nombre ». Le plafond de 14 de la passe 31 est donc supprimé, le
// plancher passe de 3 à 5 et le palier de 12 à 10 captures.
// Formule exposée : n <= 0 ? 0 : 5 + floor(n / 10).
test('P3 — le nombre de promeneurs suit la règle « minimum 5, +1 par 10 captures, sans limite »', async () => {
  const { bgPokemonCount, BG_POKEMON_RULE } = await import('../src/ui/game/bg-pokemon.js');
  assert.deepStrictEqual({ ...BG_POKEMON_RULE }, { min: 5, perCatches: 10, max: Infinity },
    'la règle doit rester exposée telle quelle : le rapport joueur la cite');
  assert.strictEqual(bgPokemonCount(0), 0, 'collection vide : rien à faire promener');
  assert.strictEqual(bgPokemonCount(1), 5, 'dès le premier Pokémon, le plancher de 5 s\'applique');
  assert.strictEqual(bgPokemonCount(9), 5);
  assert.strictEqual(bgPokemonCount(10), 6, 'un promeneur de plus toutes les 10 captures');
  assert.strictEqual(bgPokemonCount(25), 7);
  assert.strictEqual(bgPokemonCount(100), 15);
  assert.strictEqual(bgPokemonCount(1000), 105, 'aucun plafond : la population continue de croître');
  // croissance monotone et SANS plafond (consigne : « sans limite de nombre »)
  let prev = 0;
  for (let n = 1; n < 4000; n += 7) {
    const v = bgPokemonCount(n);
    assert.ok(v >= prev, 'la population ne doit jamais régresser');
    assert.ok(v >= 5, 'plancher de 5 promeneurs');
    prev = v;
  }
  assert.ok(bgPokemonCount(4000) > 14, 'le plafond de 14 de la passe 31 a bien été retiré');
});

// PASSE 31 — le roster n'est PLUS trié par chromatique : ce tri, combiné à un
// effectif réduit, ne laissait passer QUE des chromatiques dans le fond. Les
// Pokémon normaux doivent apparaître eux aussi (consigne explicite).
test('P3 — le fond mélange chromatiques ET Pokémon normaux', () => {
  assert.match(bgPoke, /shiny/);
  assert.ok(!/sort\(\(a, b\) => \(b\.shiny \? 1 : 0\) - \(a\.shiny \? 1 : 0\)\)/.test(bgPoke),
    'le tri qui plaçait les chromatiques en tête doit avoir disparu');
  assert.match(P30, /\.pw-bg-poke\.is-shiny/);
});

test('P3 — la population du fond se recalcule après une capture', () => {
  assert.match(catchJs, /renderBgPokemon/);
});

test('P3 — la couche du fond obéit à l\'interrupteur d\'animations ANI-01', () => {
  assert.match(bgPoke, /uiAnimationsOn/);
  assert.match(bgPoke, /prefers-reduced-motion/);
  assert.match(read('src/ui/game/feedback-fx.js'), /renderBgPokemon/);
});

// P3-d : cassage des tuiles de la mine
test('P3 — creuser marque les tuiles touchées et celles qui cassent', () => {
  assert.match(mineJs, /_fxCells/);
  assert.match(mineJs, /broken/);
  assert.match(mineJs, /playMineDigFx/);
  assert.match(P30, /@keyframes pw30-mine-break/);
  assert.match(P30, /@keyframes pw30-mine-hit/);
});

test('P3 — l\'animation est posée APRÈS le re-rendu de la grille', () => {
  // on raisonne sur le CODE seul : les commentaires citent les deux appels.
  const dig = mineJs
    .slice(mineJs.indexOf('function digMineTile'))
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const iRender = dig.indexOf('renderMineWindow()');
  const iFx = dig.indexOf('playMineDigFx(');
  assert.ok(iRender > -1 && iFx > iRender,
    'renderMineWindow() reconstruit tout le DOM : les classes doivent être posées ensuite');
});

test('P3 — chaque tuile porte ses coordonnées pour être retrouvée après rendu', () => {
  assert.match(mineView, /mineX/);
  assert.match(mineView, /mineY/);
  assert.match(mineUi, /data-mine-x/);
});

// P3-e : sprite de personnage sur la carte (position + ennemis)
test('P3 — la carte plante un sprite de dresseur sur notre position', async () => {
  assert.match(mapRender, /function buildMapMarkers/);
  assert.match(mapRender, /trainers\/profil\//);
  assert.match(P30, /\.pw-map-player/);
  assert.match(P30, /@keyframes pw30-map-bob/);
});

test('P3 — les lieux hostiles portent une pastille d\'ennemis', async () => {
  const { locWildCount } = await import('../src/ui/game/map-render.js');
  assert.strictEqual(locWildCount(null), 0);
  assert.strictEqual(locWildCount({}), 0);
  assert.strictEqual(locWildCount({ wild: [] }), 0);
  assert.strictEqual(locWildCount({ wild: [[16, 2, 5, 'common'], [19, 2, 4, 'common']] }), 2);
  assert.match(P30, /\.pw-map-foe/);
});

test('P3 — la pastille d\'ennemis n\'avale pas le clic de déplacement', () => {
  // Elle se pose sur le coin du nœud : si elle n'était pas cliquable, elle
  // masquerait la zone de voyage. Elle relaie donc la même action que le nœud.
  const bloc = mapRender.slice(mapRender.indexOf('class="pw-map-foe"'));
  const ouverture = bloc.slice(0, bloc.indexOf('</g>'));
  assert.match(ouverture, /data-action="legacy-call"/);
  assert.match(ouverture, /data-call="clickLocation"/);
  assert.doesNotMatch(P30, /\.pw-map-foe\s*\{[^}]*pointer-events:\s*none/);
});

test('P3 — les marqueurs de carte sont traduits dans les deux langues', () => {
  for (const lang of ['fr', 'en']) {
    const ui = read(`src/localization/${lang}/ui.js`);
    assert.match(ui, /"map_you_are_here"/);
    assert.match(ui, /"map_foes_here"/);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Garde-fous transverses
// ─────────────────────────────────────────────────────────────────────────────
test('PASSE 30 — tout le bloc s\'efface si l\'utilisateur réduit les animations', () => {
  const s = P30.slice(P30.indexOf('30.13 —'));
  assert.match(s, /prefers-reduced-motion/);
  for (const sel of ['pw30-bob|poke-sprite img', 'pw-mine-hit', 'pw-bg-poke', 'pw-map-player-bob', 'pw-shiny-star']) {
    assert.ok(new RegExp(sel).test(s), `${sel} doit être neutralisé en mouvement réduit`);
  }
  assert.match(s, /#pw-bg-pokemon-layer\s*\{\s*display:\s*none/);
});

test('PASSE 30 — aucun sink HTML brut introduit par cette passe', () => {
  // le seul innerHTML toléré est le repli documenté du sink partagé
  // (_pwSetHtmlSafe), déjà présent avant cette passe.
  for (const [nom, src] of [['bg-pokemon.js', bgPoke], ['mine-ui.js', mineUi], ['map-render.js', mapRender]]) {
    const brut = (src.match(/\.innerHTML\s*=/g) || []).length;
    const shim = (src.match(/else el\.innerHTML = html;/g) || []).length;
    assert.strictEqual(brut - shim, 0, `${nom} ne doit pas écrire innerHTML directement`);
  }
  // la carte passe par le sink documenté
  assert.match(mapRender, /_pwSetHtmlSafe\(nodeG, rectsHTML \+ labelsHTML \+ markersHTML\)/);
});

