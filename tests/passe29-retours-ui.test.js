// PASSE 29 — garde-fous des 11 retours utilisateur de cette manche :
//   1-2. les décors changent avec le lieu (combat ET hors combat) ;
//   3.   plus de Poké Ball décorative ni d'ombre au sol ;
//   4.   aucune couleur en dur sur les cadres de cartes de combat ;
//   5.   quatre emplacements d'attaque toujours rendus, jamais display:none ;
//   6.   le bloc nom + attaques de l'ennemi ne forme qu'un seul cadre ;
//   7.   sprites plus grands et centrés verticalement ;
//   8.   l'animation de gain survit au rafraîchissement de la fenêtre Monnaies ;
//   9.   la vue Équipe affiche le gabarit complet : objet tenu + bonus ;
//  10.   les assets déclarés « introuvables » sont désormais téléchargés ;
//  11.   la recherche dans la boîte trouve un Pokémon quelle que soit la langue.
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const css = read('src/assets/styles/design-system.css');
const helpers = read('src/data/game-helpers.js');
const bgJs = read('src/data/location-backgrounds.js');
const curJs = read('src/ui/game/currency-window.js');
const cardJs = read('src/ui/components/poke-full-card.js');
const teamAdapter = read('src/ui/game/battle-team-ui.js');
const teamUi = read('src/ui/game/team-ui.js');
const dl = read('tools/download_assets.py');

// ── 11. recherche insensible à la langue ─────────────────────────────────
test('PASSE 29 — la recherche de boîte s\'appuie sur le nom LIVE, pas sur p.name figé', () => {
  assert.match(helpers, /function pokemonSearchHaystack/);
  assert.match(helpers, /function pokemonMatchesSearch/);
  // le haystack doit interroger getPokeName (nom traduit à l'instant t)
  const hay = helpers.slice(helpers.indexOf('function pokemonSearchHaystack'), helpers.indexOf('function pokemonSearchHaystack') + 600);
  assert.match(hay, /getPokeName/, 'le nom localisé courant doit entrer dans la recherche');
});

test('PASSE 29 — les trois sélecteurs de recherche passent par le helper partagé', () => {
  for (const f of ['src/ui/game/box-selector.js', 'src/ui/views/UnifiedPokemonSelectorView.js', 'src/ui/game/preset-manager.js']) {
    assert.match(read(f), /pokemonMatchesSearch/, f + ' doit utiliser le matcher partagé');
  }
});

// ── 1-2. décors par lieu ─────────────────────────────────────────────────
test('PASSE 29 — un décor est résolu pour chaque type de lieu', () => {
  assert.match(bgJs, /BG_BY_TYPE/);
  assert.match(bgJs, /function getLocationBackground/);
  assert.match(bgJs, /function applyLocationBackground/);
  assert.match(bgJs, /data-bg/, 'le décor est publié via body[data-bg]');
});

test('PASSE 29 — le décor est appliqué sur la carte ET à l\'entrée en combat', () => {
  assert.match(read('src/ui/game/map-render.js'), /applyLocationBackground/);
  assert.match(read('src/application/combat/battle-init.js'), /applyLocationBackground/);
});

test('PASSE 29 — les décors consommés sont ceux de Pokéchill (img/bg)', () => {
  assert.match(css, /--pc-scene-url/);
  const scenes = css.split('\n').filter((l) => /--pc-scene-url:/.test(l));
  assert.ok(scenes.length >= 20, 'au moins une vingtaine de scènes doivent être déclarées');
  for (const l of scenes) {
    assert.match(l, /url\('\.\.\/images\/bg\//, 'chaque scène doit venir de src/assets/images/bg (Pokéchill)');
  }
  assert.ok(!/--pc-scene-url:[^;]*battleBackground/.test(css), 'aucun décor PokéClicker ne doit servir de scène');
});

// ── 3. plus de flair ni d'ombre ──────────────────────────────────────────
test('PASSE 29 — la Poké Ball décorative et l\'ombre au sol sont retirées', () => {
  const p29 = css.slice(css.indexOf('PASSE 29'));
  assert.match(p29, /content:\s*none/, 'les pseudo-éléments décoratifs doivent être neutralisés');
  assert.ok(!/#battle-team-row[^{]*\.poke-sprite-container[^{]*\{[^}]*pkmn-shadow/.test(p29),
    'aucune ombre pkmn-shadow ne doit subsister sous les sprites de combat');
});

// ── 4. aucune couleur en dur sur les cadres ──────────────────────────────
test('PASSE 29 — les cadres de cartes de combat suivent les jetons du thème', () => {
  const p29 = css.slice(css.indexOf('PASSE 29'));
  const frames = p29.split('\n').filter((l) => /#battle-team-row .poke-card\b/.test(l));
  assert.ok(frames.length > 0, 'le bloc doit bien restyler les cadres');
  assert.match(p29, /color-mix\(in srgb, var\(--dark1\)/, 'les fonds doivent dériver des jetons de thème');
});

// ── 5. quatre emplacements d'attaque ─────────────────────────────────────
test('PASSE 29 — 4 cellules d\'attaque sont toujours produites', () => {
  assert.match(teamAdapter, /for \(let mi = 0; mi < 4; mi\+\+\)/);
  assert.match(cardJs, /poke-move empty/);
});

test('PASSE 29 — .poke-move.empty n\'est JAMAIS masqué (ancres du ticker 60 fps)', () => {
  const bad = css.split('\n').filter((l) => /\.poke-move\.empty/.test(l) && /display:\s*none/.test(l));
  assert.deepStrictEqual(bad, [], 'display:none sur .poke-move.empty casserait l\'indexation des attaques');
});

// ── 6. cadre unique pour l'ennemi ────────────────────────────────────────
test('PASSE 29 — le bloc nom + attaques de l\'ennemi ne fait qu\'un cadre', () => {
  const p29 = css.slice(css.indexOf('PASSE 29'));
  assert.match(p29, /row-gap:\s*0/, 'aucun interstice entre le bandeau nom et les attaques');
});

// ── 7. sprites plus grands et centrés ────────────────────────────────────
test('PASSE 29 — les sprites sont centrés dans leur boîte', () => {
  const p29 = css.slice(css.indexOf('PASSE 29'));
  assert.match(p29, /object-position:\s*center center/);
  assert.match(p29, /transform-origin:\s*center center/);
});

// ── 8. l'animation de gain survit au rafraîchissement ────────────────────
test('PASSE 29 — la fenêtre Monnaies ne se reconstruit plus à chaque rendu', () => {
  assert.match(curJs, /pwSig/, 'une signature doit éviter la reconstruction inutile du squelette');
  // le chemin incrémental met à jour le texte sans toucher aux hôtes FX
  assert.match(curJs, /\.pw-cur-amount/);
  assert.match(curJs, /textContent\s*!==/, 'seuls les montants changés sont réécrits');
});

test('PASSE 29 — les gains s\'annoncent toujours dans #win-currency, nulle part ailleurs', () => {
  assert.match(curJs, /reportCurrency/);
  assert.match(curJs, /pw-cur-fx-/);
  for (const f of ['src/ui/game/header-window.js']) {
    assert.ok(!/floatNumber\(/.test(read(f)), f + ' ne doit pas jouer d\'animation de monnaie');
  }
});

// ── 9. objet tenu : PASSE 30 a REMPLACÉ le bandeau de la 29.8 ────────────
// L'utilisateur a rejeté le bandeau « objet tenu + bonus » ajouté en 29.8 : il
// voulait l'objet tenu REPOSITIONNÉ et REDIMENSIONNÉ à la manière de Pokéchill
// (pastille en haut-gauche du sprite), et des badges de buff/statut lisibles.
// Ces tests verrouillent la suppression ET le remplacement.
test('PASSE 30 — le bandeau perks de la 29.8 a bien disparu partout', () => {
  for (const [nom, src] of [['poke-full-card.js', cardJs], ['battle-team-ui.js', teamAdapter], ['team-ui.js', teamUi], ['design-system.css', css]]) {
    assert.ok(!/poke-perks|team-buff-list|buff-tag|showPerks|bonusTags/.test(src), `bandeau 29.8 résiduel dans ${nom}`);
  }
  assert.ok(!/"no_held_item"/.test(read('src/localization/fr/ui.js')));
  assert.ok(!/"no_held_item"/.test(read('src/localization/en/ui.js')));
});

test('PASSE 30 — l\'objet tenu est une pastille ancrée en haut-gauche', () => {
  // socle : la pastille est bien positionnée en absolu sur la vignette
  assert.match(css, /\.poke-item-badge\s*\{[^}]*position:\s*absolute/);
  // passe 30 : elle bascule du coin bas-droite au coin haut-gauche (Pokéchill)
  const p30 = css.slice(css.indexOf("30.4 — L'OBJET TENU"));
  assert.match(p30, /left:\s*0\s*!important/);
  assert.match(p30, /top:\s*0\s*!important/);
  assert.match(p30, /right:\s*auto\s*!important/);
  assert.match(p30, /bottom:\s*auto\s*!important/);
  // Pokéchill détache l'objet du sprite par une ombre portée : on la reprend
  assert.match(p30, /drop-shadow/);
});

test('PASSE 30 — la pastille est plus grande en Équipe qu\'en combat', () => {
  const p30 = css.slice(css.indexOf("30.4 — L'OBJET TENU"), css.indexOf('30.5 —'));
  const size = (scope) => {
    const re = new RegExp(scope + '\\s+\\.poke-item-badge\\s*\\{[^}]*width:\\s*(\\d+)px');
    const m = re.exec(p30);
    return m ? Number(m[1]) : null;
  };
  const team = size('#team-window-body');
  const battle = size('#battle-team-row');
  assert.ok(team && battle, 'les deux surcharges de taille doivent exister');
  assert.ok(team > battle, `la vue Équipe (${team}px) a plus de place que la rangée de combat (${battle}px)`);
  assert.ok(battle >= 24, 'en combat la pastille reste lisible (>= 24px, contre 20px avant)');
});

test('PASSE 30 — buffs et effets partagent une silhouette et sont éclaircis', () => {
  const p30 = css.slice(css.indexOf('30.5 —'), css.indexOf('30.6 —'));
  // un seul bloc groupé pour les deux familles = même forme garantie
  const shared = /(\.status-badge[\s\S]{0,400}?\.buff-badge|\.buff-badge[\s\S]{0,400}?\.status-badge)\s*\{/.exec(p30);
  assert.ok(shared, 'buffs et statuts doivent être stylés par un sélecteur commun');
  assert.match(p30, /border-radius:[^;]+!important/);
  // éclaircissement : mélange vers le blanc plutôt que les aplats sombres 29.x
  assert.ok((p30.match(/color-mix\(in srgb[\s\S]{0,60}?#FFFFFF/g) || []).length >= 5,
    'chaque famille de badge doit être éclaircie par color-mix vers le blanc');
  // et les aplats sombres codés en dur de la 29.x ont disparu du fichier
  assert.ok(!/\.buff-badge\.atk-up\s*\{\s*background:\s*#1976d2/.test(css));
});

// ── 10. assets prétendument introuvables ─────────────────────────────────
test('PASSE 29 — les 3 favicons référencés par index.html existent bien', () => {
  for (const f of ['src/assets/images/Icon.png', 'src/assets/images/icon-192.png', 'src/assets/images/icon-180.png']) {
    assert.ok(existsSync(join(ROOT, f)), f + ' doit être téléchargé');
  }
  assert.match(dl, /APP_ICONS/, 'le téléchargeur doit gérer les icônes d\'application');
});

test('PASSE 29 — les Poké Balls spéciales sont bien récupérables (alias PokeAPI)', () => {
  for (const k of ['lureball', 'moonball', 'fastball', 'diveball', 'luxuryball', 'nestball',
    'repeatball', 'timerball', 'duskball', 'quickball', 'beastball', 'masterball']) {
    assert.match(dl, new RegExp("'" + k + "':"), k + ' doit avoir son alias de téléchargement');
    assert.ok(existsSync(join(ROOT, 'src/assets/images/items/' + k + '.png')), k + '.png doit exister');
  }
});

test('PASSE 29 — berry / prine_berry / upgrade ont un vrai sprite', () => {
  for (const k of ['berry', 'prine_berry', 'upgrade']) {
    assert.ok(existsSync(join(ROOT, 'src/assets/images/items/' + k + '.png')), k + '.png doit exister');
    assert.match(dl, new RegExp("'" + k + "':"), k + ' doit avoir son alias de téléchargement');
  }
});

