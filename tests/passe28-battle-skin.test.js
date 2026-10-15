// PASSE 28 — garde-fous des retours utilisateur :
//  1. les monnaies et l'énergie de mine ne reviennent JAMAIS dans la barre de titre ;
//  2. l'animation de gain ne joue que dans la fenêtre « Monnaies » ;
//  3. la scène de combat ne se fige plus après « Quitter » ;
//  4. les décors sont ceux de Pokéchill (img/bg), pas ceux de PokéClicker ;
//  5. le Pokémon actif a bien son fond dédié ;
//  6. les sprites sont nettement plus grands qu'à la passe 27.
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src/assets/styles/design-system.css'), 'utf8');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const headerJs = readFileSync(join(ROOT, 'src/ui/game/header-window.js'), 'utf8');
const curJs = readFileSync(join(ROOT, 'src/ui/game/currency-window.js'), 'utf8');

// ── 1. barre de titre nettoyée ────────────────────────────────────────────
test('PASSE 28 — aucune monnaie ni énergie de mine dans #header', () => {
  assert.ok(!/id="h-currency-hud"/.test(html), 'le HUD de monnaies doit avoir quitté l\'entête');
  for (const id of ['h-tokens-chip', 'h-frag-chip', 'h-energy-chip', 'h-energy-fill', 'h-money-fx']) {
    assert.ok(!html.includes('id="' + id + '"'), id + ' ne doit plus exister dans index.html');
  }
  assert.ok(!/id="h-energy"/.test(html), 'l\'énergie de mine ne doit plus être affichée dans la barre de titre');
});

test('PASSE 28 — l\'entête garde les badges (markup d\'origine)', () => {
  assert.match(html, /<div class="hinfo[^"]*">/);
  assert.match(html, /id="h-badges"/);
});

test('PASSE 28 — #h-money survit, masqué, car du code historique l\'écrit encore', () => {
  assert.match(html, /id="h-money"[^>]*hidden/);
  assert.match(headerJs, /getElementById\('h-money'\)/);
});

test('PASSE 28 — les helpers de chips de monnaie sont démontés', () => {
  assert.ok(!/_pwSetCurrencyChip/.test(headerJs), 'la fabrique de chips doit être supprimée');
  assert.ok(!/h-energy-fill/.test(headerJs), 'plus de jauge d\'énergie pilotée depuis l\'entête');
});

// ── 2. l'animation vit dans la fenêtre Monnaies ───────────────────────────
test('PASSE 28 — les hôtes d\'animation sont DANS la fenêtre Monnaies', () => {
  assert.match(curJs, /pw-cur-fx-/, 'chaque colonne doit porter son hôte de delta');
  assert.match(curJs, /reportCurrency\(/, 'la fenêtre Monnaies doit déclarer ses deltas');
  assert.match(curJs, /\.pw-cur-fx\{[^}]*position:absolute/);
});

test('PASSE 28 — l\'entête ne déclenche plus aucun delta flottant', () => {
  assert.ok(!/reportCurrency/.test(headerJs), 'reportCurrency ne doit plus être appelé depuis l\'entête');
});

// ── 3. plus de scène figée ────────────────────────────────────────────────
test('PASSE 28 — #battle-active-scene n\'est plus affiché de force', () => {
  const forced = /#battle-active-scene\s*\{[^}]*display:\s*flex\s*!important/.test(css);
  assert.ok(!forced, 'un display:flex!important inconditionnel gèlerait la scène après « Quitter »');
  assert.match(css, /#battle-active-scene\.is-live\s*\{[^}]*display:\s*flex\s*!important/);
  assert.match(css, /#battle-active-scene\[style\*=['"]display:\s?none['"]\]/);
});

// ── 4. décors Pokéchill ───────────────────────────────────────────────────
test('PASSE 28 — les décors de combat viennent de Pokéchill, pas de PokéClicker', () => {
  const p28 = css.slice(css.indexOf('PASSE 28'));
  assert.ok(!/battleBackground/.test(p28), 'les fonds PokéClicker sont abandonnés dans la passe 28');
  assert.match(p28, /url\('\.\.\/images\/bg\/route\.png'\)/);
  assert.match(p28, /url\('\.\.\/images\/bg\/forest\.png'\)/);
});

test('PASSE 28 — le pixel-art n\'est jamais interpolé', () => {
  const wild = css.slice(css.indexOf('28.2 — LE SAUVAGE'));
  assert.match(wild.slice(0, 1400), /image-rendering:\s*pixelated/);
});

// ── 5. fond dédié du combattant ───────────────────────────────────────────
test('PASSE 28 — le Pokémon actif a son fond dédié (Poké Ball tournante)', () => {
  assert.match(css, /#battle-team-row > \.poke-card\.active[^{]*::before/);
  assert.match(css, /url\('\.\.\/images\/resources\/pokeball\.svg'\)/);
  assert.match(css, /@keyframes pw28-flair-spin/);
});

test('PASSE 28 — l\'ombre au sol Pokéchill est présente sous le combattant', () => {
  assert.match(css, /url\('\.\.\/images\/resources\/pkmn-shadow\.png'\)/);
});

test('PASSE 28 — l\'animation décorative respecte prefers-reduced-motion', () => {
  const rm = css.slice(css.lastIndexOf('prefers-reduced-motion'));
  assert.match(rm, /animation:\s*none/);
});

// ── 6. sprites agrandis ───────────────────────────────────────────────────
test('PASSE 28 — les jetons de sprite ont grandi par rapport à la passe 27', () => {
  const grab = (name) => {
    const hits = [...css.matchAll(new RegExp(name + ':\\s*(\\d+)px', 'g'))].map((m) => Number(m[1]));
    return hits.length ? hits[hits.length - 1] : null;
  };
  // la dernière déclaration gagne : c'est celle de la passe 28 (hors media query).
  // V7 · DBT-06 — un seul bloc :root en tête de fichier (les anciens blocs y sont
  // fusionnés dans l'ordre) : on lit la DERNIÈRE valeur du bloc unique.
  const rootStart = css.indexOf(':root {');
  const rootEnd = css.indexOf('\n}', rootStart);
  const p28 = css.slice(rootStart, rootEnd);
  const lastIn = (name) => { const hits = [...p28.matchAll(new RegExp(name + ':\\s*(\\d+)px', 'g'))]; return Number(hits[hits.length - 1][1]); };
  const battle = lastIn('--pc-battle-sprite');
  const bench = lastIn('--pc-bench-sprite');
  assert.ok(battle >= 120, 'le sprite de combat doit dépasser largement les 84px de la passe 27, vu ' + battle);
  assert.ok(bench >= 70, 'le remplaçant doit dépasser les 46px de la passe 27, vu ' + bench);
  assert.ok(grab('--pc-scene-h') >= 210);
});

test('PASSE 28 — les sprites sont mis à l\'échelle comme chez Pokéchill', () => {
  // Pokéchill : .explore-sprite img { scale: 2; transform-origin: center bottom }
  const p28 = css.slice(css.indexOf('28.5 —'));
  const bloc = p28.slice(0, 1600);
  // PASSE 31 — l'échelle n'est PLUS un `transform: scale(…) !important` posé à
  // côté : une telle déclaration bat les keyframes et gelait le balancement des
  // sprites de combat. Le facteur transite désormais par `--pw-bob-scale`, que
  // l'animation `pw31-bob` applique elle-même. L'exigence de fond (sprite
  // agrandi, ancré sur son bas) est donc vérifiée sur ce nouveau mécanisme.
  assert.ok(!/transform:\s*scale\([^)]*\)\s*!important/.test(bloc),
    'aucune échelle figée ne doit neutraliser le balancement de la passe 31');
  assert.match(bloc, /transform-origin:\s*center bottom/);
  assert.match(bloc, /--pw-bob-scale:\s*1\.[0-9]+/);
  // et le facteur reste bien un agrandissement, comme le scale:2 de Pokéchill
  const scales = [...css.matchAll(/--pw-bob-scale:\s*(1\.[0-9]+)/g)].map((m) => Number(m[1]));
  assert.ok(scales.length >= 2, 'actif et banc ont chacun leur facteur');
  for (const sc of scales) assert.ok(sc > 1, `facteur d'agrandissement, vu ${sc}`);
});

test('PASSE 28 — un sprite agrandi ne peut pas déborder sur la rangée voisine', () => {
  assert.match(css, /#battle-team-row > \.poke-card,\s*\n#team-window-body \.poke-card \{ overflow: hidden !important; \}/);
});

test('PASSE 28 — les cases d\'attaque vides restent dans le DOM (ancres du ticker)', () => {
  const rule = /#battle-team-row > \.poke-card:first-child \.poke-move\.empty \{[^}]*\}/.exec(css);
  assert.ok(rule, 'la règle de repli doit exister');
  assert.ok(!/display:\s*none/.test(rule[0]), 'display:none décalerait les index du ticker 60 fps');
  assert.match(rule[0], /visibility:\s*hidden/);
});

