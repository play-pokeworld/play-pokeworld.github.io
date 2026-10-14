/**
 * PASSE 31 — retours joueur sur l'affichage (combat, équipe, fond, carte).
 *
 * Chaque test note la CAUSE du défaut constaté, parce que la plupart des
 * régressions de cette passe venaient d'un même piège CSS : une déclaration
 * `transform: … !important` l'emporte TOUJOURS sur la valeur produite par une
 * animation. Tout ce qui doit bouger (Poké Ball décorative, sprites qui
 * flottent, promeneurs du fond) doit donc recevoir son échelle DANS les
 * keyframes, via une variable, jamais par un `transform` figé à côté.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const css = read('src/assets/styles/design-system.css');
const P31 = css.slice(css.indexOf('PASSE 31'));
const battleAdapter = read('src/ui/game/battle-team-ui.js');
const bgPoke = read('src/ui/game/bg-pokemon.js');
const mapRender = read('src/ui/game/map-render.js');
const catchJs = read('src/application/combat/catch.js');
const feedback = read('src/ui/game/feedback-fx.js');

/** Retire les commentaires CSS : ils citent souvent la règle fautive. */
function stripComments(text) {
  // une tranche « 31.x — … » commence à l'intérieur du commentaire de titre :
  // sa fermeture `*/` traîne donc sans `/*` correspondant, on la retire d'abord
  const head = text.indexOf('*/');
  const open = text.indexOf('/*');
  const body = (head !== -1 && (open === -1 || head < open)) ? text.slice(head + 2) : text;
  return body.replace(/\/\*[\s\S]*?\*\//g, '');
}

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

/** Extrait une sous-section « 31.x — … » du bloc de la passe. */
function section(n) {
  const start = P31.indexOf(`31.${n} —`);
  assert.notStrictEqual(start, -1, `section 31.${n} introuvable`);
  const next = P31.indexOf(`31.${n + 1} —`, start);
  return P31.slice(start, next === -1 ? undefined : next);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. La Poké Ball décorative tourne pour de bon
// ─────────────────────────────────────────────────────────────────────────────
test('31.1 — la Poké Ball décorative tourne (aucun transform figé ne la bloque)', () => {
  const s = section(1);
  assert.match(s, /animation-name:\s*pw28-flair-spin\s*!important/);
  assert.match(s, /animation-iteration-count:\s*infinite\s*!important/);
  assert.match(s, /animation-play-state:\s*running\s*!important/);
  // le piège : un `transform:none!important` gelait l'animation. On ne teste
  // que les DÉCLARATIONS — le commentaire de la section cite justement la
  // règle fautive pour expliquer pourquoi elle a été retirée.
  assert.ok(!/transform:\s*none\s*!important/.test(stripComments(s)),
    'aucun transform figé ne doit neutraliser les keyframes de rotation');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Les deux combattants sont plus grands que le banc
// ─────────────────────────────────────────────────────────────────────────────
test('31.2 — le combattant actif et l\'ennemi dominent le banc', () => {
  const s = section(2);
  assert.match(s, /--pc-battle-sprite:\s*168px/);
  // PASSE 34 — le banc est passé de 62 px à 104 px sur retour joueur (« les
  // sprites du banc sont trop petits »). 62 px bridait un sprite natif de
  // 96 px via `object-fit: contain`. L'écart avec les combattants (168 px)
  // reste net, et la colonne du banc est un track de grille indépendant :
  // rien n'est décalé. On vérifie donc le rapport, pas une valeur figée.
  assert.match(s, /--pc-bench-sprite:\s*104px/);
  const grand = Number(s.match(/--pc-battle-sprite:\s*(\d+)px/)[1]);
  const banc  = Number(s.match(/--pc-bench-sprite:\s*(\d+)px/)[1]);
  assert.ok(grand >= banc * 1.5,
    `les combattants doivent dominer le banc (${grand}px vs ${banc}px)`);
  // la première carte (le sauvage) et la carte active reçoivent la grande taille
  assert.match(s, /#battle-team-row\s*>\s*\.poke-card:first-child/);
  assert.match(s, /\.poke-card\.active/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Plus aucun survol sur les cartes de combat
// ─────────────────────────────────────────────────────────────────────────────
test('31.3 — les cartes de combat ne réagissent plus au survol', () => {
  // PASSE 34 — CHANGEMENT DE STRATÉGIE, le test suit le code.
  // Empiler des blocs neutralisants scopés `#battle-team-row` ne marchait pas :
  // les règles fautives (l.576 et le fourre-tout l.7320) frappaient TOUTES les
  // cartes avec une spécificité au moins égale. Les 4 blocs de neutralisation
  // (§30/§31/§32.3/§33.3) ont donc été SUPPRIMÉS et remplacés par une exclusion
  // à la source : `:not(#battle-team-row) > .poke-card:hover`. On vérifie
  // désormais l'absence de survol plutôt que la présence d'un contre-poison.
  const s = section(3);
  assert.match(s, /SUPPRIMÉ/,
    'le bloc neutralisant de la §31 doit avoir cédé la place à la §34.1');

  // Aucune règle `:hover` du fichier ne doit plus pouvoir toucher une carte de
  // combat : toute règle visant `.poke-card:hover` est soit exclue de la
  // rangée, soit cantonnée à un autre conteneur.
  assert.deepEqual(survolsAtteignantLeCombat(css).map((r) => r.sel), [],
    'toute règle de survol visant une carte doit exclure #battle-team-row');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Badges de buffs et d'états : palette des TYPES
// ─────────────────────────────────────────────────────────────────────────────
test('31.4 — buffs et états reprennent la palette des types', () => {
  const s = section(4);
  // chaque stat est adossée à un type, et le debuff est la même teinte assombrie
  for (const v of ['--type-fighting', '--type-steel', '--type-electric',
                   '--type-psychic', '--type-water']) {
    assert.ok(s.includes(v), `${v} doit servir de teinte de buff`);
  }
  assert.match(stripComments(s), /color-mix\(in srgb, var\(--type-[a-z]+\) 62%, #000000\)/,
    'les debuffs sont la version assombrie du buff, pas une teinte délavée');
  // les états collent au type qui les évoque
  assert.match(s, /\.status-badge\.burn[\s\S]{0,120}--type-fire/);
  assert.match(s, /\.status-badge\.freeze[\s\S]{0,120}--type-ice/);
  // les couleurs codées en dur de l'ancienne version ont disparu des RÈGLES
  // DE BADGES — on ne scanne pas toute la feuille : `#1976d2` sert encore
  // légitimement au dégradé de `.poke-protect-btn.is-locked`, hors sujet ici.
  const badgeRules = stripComments(css)
    .split('\n')
    .filter((line) => /\.(buff|status)-badge/.test(line))
    .join('\n');
  for (const dead of ['#d32f2f', '#1976d2', '#f57c00', '#777']) {
    assert.ok(!badgeRules.includes(dead),
      `${dead} ne doit plus être codé en dur sur un badge`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. L'objet tenu au format Pokéchill
// ─────────────────────────────────────────────────────────────────────────────
test('31.5 — l\'objet tenu est un médaillon rond, visible, dimensionné par rôle', () => {
  const s = section(5);
  assert.match(s, /border-radius:\s*50%\s*!important/);
  assert.match(s, /#team-window-body \.poke-item-badge\s*\{[\s\S]{0,120}width:\s*44px/);
  // en combat : grand sur le combattant, réduit sur le banc (sprite de 62 px)
  assert.match(s, /:first-child \.poke-item-badge[\s\S]{0,200}width:\s*40px/);
  assert.match(s, /:not\(:first-child\):not\(\.active\) \.poke-item-badge[\s\S]{0,200}width:\s*24px/);
  assert.match(s, /\.poke-item-badge\.empty/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. L'étoile chromatique quitte le combat
// ─────────────────────────────────────────────────────────────────────────────
test('31.6 — l\'étoile chromatique est coupée côté modèle, pas en CSS', () => {
  assert.match(battleAdapter, /shinyStar:\s*false/);
  assert.ok(!/shinyStar:\s*!!p\.shinyActive/.test(battleAdapter));
  // la Poké Ball d'état reste, elle : c'est elle qui porte l'information
  assert.match(battleAdapter, /caughtStatusBallHtml\(p\.id,\s*16\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. L'éclat de capture se voit, et vise le bon Pokémon
// ─────────────────────────────────────────────────────────────────────────────
test('31.7 — l\'éclat de capture frappe le Pokémon SAUVAGE', () => {
  // la carte adverse porte un repère explicite, pas un index de position
  // PASSE 33 : la classe adverse peut désormais être suffixée par le repère du
  // gardien de donjon (`pw-dungeon-boss-card`) — le repère explicite demeure.
  assert.match(battleAdapter, /extraClass:\s*isEnemy\s*\?\s*\(?'pw-enemy-card'/);
  assert.match(catchJs, /querySelector\('\.pw-enemy-card'\)/);
});

test('31.7 — l\'éclat dure aussi longtemps que ses keyframes', () => {
  const s = section(7);
  assert.match(s, /animation:\s*pw31-capture 700ms[\s\S]{0,40}!important/);
  assert.match(s, /@keyframes pw31-capture\b/);
  // un flash blanc + un halo doré : la simple montée de luminosité se noyait
  // dans le décor de la carte du sauvage
  assert.match(s, /box-shadow[\s\S]{0,120}rgba\(255, 225, 94/);
  assert.match(s, /overflow:\s*visible\s*!important/);
  // JS et CSS doivent rester synchronisés, sinon la fin de l'éclat est coupée
  assert.match(feedback, /'pw-fx-capture',\s*700/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Les sprites de combat flottent réellement
// ─────────────────────────────────────────────────────────────────────────────
test('31.8 — le balancement passe par les keyframes, pas par un scale figé', () => {
  const s = section(8);
  assert.match(s, /animation:\s*pw31-bob[\s\S]{0,60}!important/);
  // l'échelle est INJECTÉE dans les keyframes : c'est tout l'enjeu
  assert.match(s, /@keyframes pw31-bob[\s\S]*?scale\(var\(--pw-bob-scale/);
  assert.match(s, /translateY\(var\(--pw-bob-lift/);
  assert.match(s, /--pw-bob-scale:\s*1\.34/);
  assert.match(s, /--pw-bob-scale:\s*1\.16/);
});

test('31.8 — plus aucun transform figé ne gèle les sprites de combat', () => {
  // c'était la cause du « ils ne bougent pas » : ces règles battaient l'animation
  const offenders = css
    .split('\n')
    .filter((l) => /#battle-team-row[^{]*\.poke-sprite img/.test(l)
      && /transform:\s*scale\([^)]*\)\s*!important/.test(l)
      && !/var\(--pw-bob-scale/.test(l));
  assert.deepStrictEqual(offenders, [],
    'un transform !important sur le sprite empêcherait tout balancement');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Les promeneurs du fond
// ─────────────────────────────────────────────────────────────────────────────
// PASSE 32 — règle remplacée sur consigne : « minimum 5 pokémon avec 1 de plus
// tous les 10 pokémon et sans limite de nombre ». Le plafond de 14 disparaît.
test('31.9 → 32 — règle de peuplement : minimum 5, +1 par 10 captures, sans limite', async () => {
  const { bgPokemonCount, BG_POKEMON_RULE } = await import('../src/ui/game/bg-pokemon.js');
  assert.deepStrictEqual({ ...BG_POKEMON_RULE }, { min: 5, perCatches: 10, max: Infinity });
  assert.strictEqual(bgPokemonCount(1), 5);
  assert.strictEqual(bgPokemonCount(10), 6);
  assert.strictEqual(bgPokemonCount(25), 7);
  assert.strictEqual(bgPokemonCount(1000), 105);
});

test('31.9 — sprite seul, traversée de coin à coin, taille doublée', () => {
  // aucun cadre derrière le sprite
  const s = section(9);
  assert.ok(!/\.pw-bg-poke\s*\{[^}]*background:\s*(?!none)[^};]*(?:#|rgb|var\()/.test(s),
    'le promeneur ne doit porter aucun fond');
  // tailles ×2–×3 par rapport aux ~48 px de la passe 30
  assert.match(bgPoke, /PW_BG_MIN_SIZE\s*=\s*96/);
  assert.match(bgPoke, /PW_BG_MAX_SIZE\s*=\s*150/);
  // il traverse puis disparaît : plus de re-ciblage permanent
  assert.ok(!/_pwBgRetarget/.test(bgPoke), 'le rebond aléatoire a été retiré');
  assert.match(bgPoke, /_pwBgRecycle/);
  // et il respire comme en combat
  assert.match(s, /pw31-bg-bob/);
});

test('31.9 — les Pokémon normaux se promènent aussi, pas seulement les chromatiques', () => {
  assert.ok(!/sort\(\(a, b\) => \(b\.shiny \? 1 : 0\) - \(a\.shiny \? 1 : 0\)\)/.test(bgPoke),
    'le tri chromatiques-en-tête excluait de fait tous les Pokémon normaux');
});

// ─────────────────────────────────────────────────────────────────────────────
// 10 & 11. La carte
// ─────────────────────────────────────────────────────────────────────────────
test('31.10 — la carte occupe toute la largeur de son panneau', () => {
  const s = section(10);
  assert.match(s, /#map-panel[\s\S]{0,160}aspect-ratio:\s*1600\s*\/\s*960/);
  assert.match(s, /#win-map svg|#map-svg|#win-map/);
  // le SVG ne doit plus être bridé en hauteur fixe, sinon il se retrouve
  // encadré de bandes vides sur les grands écrans
  assert.match(s, /height:\s*auto/);
});

test('31.11 — le marqueur « vous êtes ici » est centré sur son nœud', () => {
  // le sprite est posé en cx,cy moins la demi-taille : donc centré
  assert.match(mapRender, /px\s*=\s*cx\s*-\s*size\s*\/\s*2/);
  assert.match(mapRender, /py\s*=\s*cy\s*-\s*size\s*\/\s*2/);
  // le halo est concentrique au nœud, et le CSS l'anime bien sous ce nom
  assert.match(mapRender, /class="pw-map-player-ring"[^>]*cx="\$\{cx\}"[^>]*cy="\$\{cy\}"/);
  assert.match(section(11), /\.pw-map-player-ring[\s\S]{0,300}animation:\s*pw31-map-ring/);
  // et la carte n'est plus déformée
  assert.match(mapRender, /xMidYMid meet/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Accessibilité
// ─────────────────────────────────────────────────────────────────────────────
test('31.12 — tout le mouvement de la passe s\'efface en « mouvement réduit »', () => {
  const s = section(12);
  assert.match(s, /prefers-reduced-motion:\s*reduce/);
  assert.match(s, /animation:\s*none\s*!important/);
  // la règle éteint les animations en visant leurs PORTEURS (sélecteurs), ce
  // qui couvre d'un coup pw31-bob, pw31-capture, pw31-bg-bob et pw31-map-ring
  for (const sel of ['.poke-sprite img', '.pw-bg-poke', '.pw-fx-capture',
                     '.pw-map-player-ring', '.pw-relative::before']) {
    assert.ok(s.includes(sel), `${sel} doit être neutralisé en mouvement réduit`);
  }
});

