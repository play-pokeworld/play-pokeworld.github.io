// ════════════════════════════════════════════════════════════════════════════
// PASSE 30 (P3) — NOS POKÉMON SE PROMÈNENT SUR LE FOND
// ════════════════════════════════════════════════════════════════════════════
// Demande : « affichage de nos pokémons sur le fond en déplacement aléatoire,
// avec un nombre exponentiel en fonction du nombre de captures et des shiny,
// pour voir sa progression sur le fond ».
//
// Principes de mise en œuvre :
//  • une seule couche `#pw-bg-pokemon-layer`, en `position:fixed`, `z-index:-1`,
//    `pointer-events:none` : elle vit DERRIÈRE toute l'interface et ne peut
//    jamais intercepter un clic ni décaler une fenêtre ;
//  • le nombre d'occupants suit une courbe LOGARITHMIQUE du nombre d'espèces
//    capturées — c'est le nombre de captures nécessaires pour gagner un
//    promeneur qui est exponentiel (1, 2, 4, 8, 16, 32…), ce qui est bien la
//    progression demandée : au début chaque capture se voit, ensuite il faut
//    doubler sa collection pour peupler davantage le fond ;
//  • les chromatiques capturés sont TOUJOURS représentés en priorité (c'est le
//    « et des shiny » de la demande) et se distinguent par un halo doré ;
//  • une seule boucle `requestAnimationFrame` pilote tous les promeneurs, en
//    n'écrivant que des variables CSS de `transform` (pas de layout, pas de
//    reflow) ; elle s'arrête toute seule quand l'onglet passe en arrière-plan
//    ou quand la couche est vide.
//
// Lien avec ANI-01 : l'interrupteur `G.settings.uiAnimations` et la préférence
// système « réduire les animations » coupent la couche entièrement.

// PASSE 32 — « met plutôt un minimum à 5 avec +1 par tranche de 10 pokemons et
// aucune limite de nombre ». Le plafond dur est SUPPRIMÉ : `Infinity` conserve
// la forme du calcul (un `Math.min` inoffensif) sans jamais écrêter le résultat.
const PW_BG_MAX = Infinity;    // aucune limite (consigne joueur, passe 32)
// PASSE 31 — « ils sont beaucoup trop petits, il faut les multiplier par 2
// voire 3 ». Les tailles passent donc de 34–58 px à 96–150 px (≈ ×2,8).
const PW_BG_MIN_SIZE = 96;     // px
const PW_BG_MAX_SIZE = 150;    // px
// PASSE 31 — la traversée se fait maintenant d'un coin à l'autre : la vitesse
// est exprimée en « durée de traversée » (s) plutôt qu'en px/s, sinon un grand
// écran mettrait des minutes à être franchi.
const PW_BG_CROSS_MIN = 26;    // s pour traverser l'écran
const PW_BG_CROSS_MAX = 52;    // s
// nombre minimum de promeneurs dès la première capture (passe 32 : 3 → 5)
const PW_BG_MIN_COUNT = 5;
// une capture sur N ajoute un promeneur supplémentaire (passe 32 : 12 → 10)
const PW_BG_PER_CATCH = 10;

let _pwBgWalkers = [];
// réservoir d'espèces dans lequel _pwBgRecycle() pioche le remplaçant quand un
// promeneur a fini sa traversée (PASSE 31)
let _pwBgPool = [];
let _pwBgRaf = 0;
let _pwBgLast = 0;
let _pwBgSig = '';

function _pwBgLayer(create) {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('pw-bg-pokemon-layer');
  if (!el && create) {
    el = document.createElement('div');
    el.id = 'pw-bg-pokemon-layer';
    el.setAttribute('aria-hidden', 'true');
    // tout en bas du body : la couche est de toute façon en z-index -1
    document.body.appendChild(el);
  }
  return el;
}

// Combien de Pokémon se promènent pour N espèces capturées ?
//
// PASSE 31 — la courbe logarithmique de la passe 30 était illisible : avec 40
// espèces capturées on n'obtenait que 6 promeneurs, et le joueur « n'avait pas
// le compte ». La règle est désormais explicite et vérifiable à la main :
//
//     nombre affiché = MINIMUM (5) + 1 promeneur par tranche de 10 captures
//
// soit 5 dès la première capture, 6 à 10 captures, 7 à 20, 8 à 30… SANS AUCUN
// PLAFOND (passe 32). 0 capture = 0 promeneur.
function bgPokemonCount(caught) {
  const n = Math.max(0, Number(caught) || 0);
  if (n <= 0) return 0;
  return Math.min(PW_BG_MAX, PW_BG_MIN_COUNT + Math.floor(n / PW_BG_PER_CATCH));
}

// Liste des espèces réellement possédées (équipe + boîte + pokédex « caught »),
// chromatiques d'abord. Renvoie [{id, shiny}].
function bgPokemonRoster() {
  const out = [];
  const seen = new Set();
  const G = (typeof globalThis !== 'undefined') ? globalThis.G : null;
  if (!G) return out;
  const push = (id, shiny) => {
    const nid = Number(id);
    if (!nid || seen.has(nid)) return;
    seen.add(nid);
    out.push({ id: nid, shiny: !!shiny });
  };
  const isShiny = (id) => {
    try {
      if (typeof isSpeciesShiny === 'function') return !!isSpeciesShiny(id);
    } catch (_) {}
    return false;
  };
  try {
    if (Array.isArray(G.team)) for (const p of G.team) if (p) push(p.id, p.shinyActive || p.shinyUnlocked || p.shiny);
    if (G.collection) for (const k in G.collection) {
      const p = G.collection[k];
      if (p) push(p.id, p.shinyActive || p.shinyUnlocked || p.shiny);
    }
    if (G.pokedex) for (const k in G.pokedex) {
      const d = G.pokedex[k];
      if (d && d.caught) push(k, d.shiny);
    }
  } catch (_) {}
  // PASSE 31 — on NE trie PLUS les chromatiques en tête. Le tri de la passe 30
  // combiné à un effectif réduit faisait que la sélection était entièrement
  // consommée par les shinies : le joueur « ne voyait que des shiny ». Tout
  // Pokémon capturé doit pouvoir se promener ; les chromatiques ne sont qu'un
  // cas particulier du roster, tiré au même rang que les autres.
  for (const e of out) if (!e.shiny && isShiny(e.id)) e.shiny = true;
  return out;
}

function _pwBgEnabled() {
  if (typeof document === 'undefined') return false;
  try {
    if (typeof uiAnimationsOn === 'function' && !uiAnimationsOn()) return false;
  } catch (_) {}
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch (_) {}
  return true;
}

function _pwBgRand(a, b) { return a + Math.random() * (b - a); }

// PASSE 31 — TRAJECTOIRE « D'UN COIN À L'AUTRE ».
// La flânerie à rebonds de la passe 30 donnait des mouvements erratiques,
// jugés « pas naturels » : les sprites zigzaguaient au milieu de l'écran et ne
// sortaient jamais. Désormais chaque promeneur entre par un coin, traverse
// l'écran en ligne droite jusqu'au coin OPPOSÉ, puis disparaît et cède la
// place à un autre Pokémon du roster (cf. _pwBgRecycle).
const PW_BG_CORNERS = [
  { x: 0, y: 0 },   // haut-gauche
  { x: 1, y: 0 },   // haut-droite
  { x: 1, y: 1 },   // bas-droite
  { x: 0, y: 1 },   // bas-gauche
];

function _pwBgViewport() {
  return {
    w: (typeof innerWidth === 'number' ? innerWidth : 1200),
    h: (typeof innerHeight === 'number' ? innerHeight : 800),
  };
}

// Donne à `st` une nouvelle traversée : coin de départ au hasard, coin opposé
// en arrivée. On part et on arrive HORS de l'écran (marge = une taille de
// sprite) pour que l'entrée et la sortie soient franches, jamais un « pop ».
function _pwBgRoute(st) {
  const { w, h } = _pwBgViewport();
  const ci = Math.floor(Math.random() * 4);
  const from = PW_BG_CORNERS[ci];
  const to = PW_BG_CORNERS[(ci + 2) % 4];   // le coin diagonalement opposé
  const m = st.size * 1.15;                 // marge de hors-champ
  // on décale un peu le point d'arrivée pour que deux traversées ne se
  // superposent jamais exactement
  const jx = _pwBgRand(-0.12, 0.12) * w;
  const jy = _pwBgRand(-0.12, 0.12) * h;
  st.x0 = from.x ? w + m : -m;
  st.y0 = (from.y ? h + m : -m) + jy * 0.5;
  st.x1 = to.x ? w + m : -m;
  st.y1 = (to.y ? h + m : -m) + jy;
  st.x0 += jx * 0.25;
  st.x1 += jx * 0.25;
  st.dur = _pwBgRand(PW_BG_CROSS_MIN, PW_BG_CROSS_MAX);
  st.t = 0;
  // le sprite regarde là où il va (les sprites de face sont symétriques, mais
  // le retournement casse la répétition visuelle)
  st.face = st.x1 >= st.x0 ? 1 : -1;
  st.x = st.x0;
  st.y = st.y0;
}

function _pwBgApplySpecies(st, entry) {
  let src = '';
  try {
    if (typeof getPokemonSpriteUrl === 'function') src = getPokemonSpriteUrl(entry.id, entry.shiny) || '';
  } catch (_) {}
  if (!src) return false;
  st.id = entry.id;
  st.shiny = !!entry.shiny;
  st.el.src = src;
  // PASSE 31 — la classe `is-shiny` ne sert plus qu'au léger scintillement ;
  // elle ne change plus l'opacité, tous les promeneurs se valent.
  st.el.className = 'pw-bg-poke' + (entry.shiny ? ' is-shiny' : '');
  return true;
}

function _pwBgSpawn(entry) {
  const size = Math.round(_pwBgRand(PW_BG_MIN_SIZE, PW_BG_MAX_SIZE));
  const img = document.createElement('img');
  img.className = 'pw-bg-poke';
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  const st = { el: img, id: 0, shiny: false, size, x: 0, y: 0, face: 1, t: 0, dur: 1 };
  if (!_pwBgApplySpecies(st, entry)) return null;
  img.style.setProperty('--pw-bg-size', size + 'px');
  _pwBgRoute(st);
  // décalage de départ aléatoire : à l'ouverture du jeu, les promeneurs sont
  // déjà répartis sur leurs trajets au lieu de surgir tous ensemble d'un coin
  st.t = Math.random() * st.dur;
  return st;
}

// Fin de traversée : le Pokémon disparaît et un AUTRE prend le relais.
function _pwBgRecycle(st) {
  const pool = _pwBgPool;
  if (pool && pool.length) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    if (entry) {
      st.size = Math.round(_pwBgRand(PW_BG_MIN_SIZE, PW_BG_MAX_SIZE));
      st.el.style.setProperty('--pw-bg-size', st.size + 'px');
      _pwBgApplySpecies(st, entry);
    }
  }
  _pwBgRoute(st);
}

function _pwBgStep(ts) {
  _pwBgRaf = 0;
  if (!_pwBgWalkers.length) return;
  const dt = Math.min(0.1, _pwBgLast ? (ts - _pwBgLast) / 1000 : 0.016);
  _pwBgLast = ts;
  for (const st of _pwBgWalkers) {
    st.t += dt;
    if (st.t >= st.dur) _pwBgRecycle(st);   // arrivé au coin opposé → relève
    const k = st.dur > 0 ? Math.min(1, st.t / st.dur) : 1;
    st.x = st.x0 + (st.x1 - st.x0) * k;
    st.y = st.y0 + (st.y1 - st.y0) * k;
    // fondu d'entrée et de sortie : le promeneur ne se coupe jamais net
    let fade = 1;
    if (k < 0.08) fade = k / 0.08;
    else if (k > 0.92) fade = (1 - k) / 0.08;
    st.el.style.setProperty('--pw-bg-x', st.x.toFixed(1) + 'px');
    st.el.style.setProperty('--pw-bg-y', st.y.toFixed(1) + 'px');
    st.el.style.setProperty('--pw-bg-face', String(st.face));
    st.el.style.setProperty('--pw-bg-fade', fade.toFixed(3));
  }
  _pwBgRaf = requestAnimationFrame(_pwBgStep);
}

function _pwBgStart() {
  if (_pwBgRaf || !_pwBgWalkers.length) return;
  if (typeof requestAnimationFrame !== 'function') return;
  _pwBgLast = 0;
  _pwBgRaf = requestAnimationFrame(_pwBgStep);
}

function _pwBgStop() {
  if (_pwBgRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_pwBgRaf);
  _pwBgRaf = 0;
}

// Reconstruit la population du fond. Appelée après une capture, un chargement
// de partie, un changement de réglage. Idempotente : si la population voulue
// n'a pas changé, elle ne touche pas au DOM (la promenade en cours continue).
function renderBgPokemon() {
  if (typeof document === 'undefined') return;
  if (!_pwBgEnabled()) {
    const el = _pwBgLayer(false);
    if (el) el.remove();
    _pwBgWalkers = [];
    _pwBgSig = '';
    _pwBgStop();
    return;
  }
  const roster = bgPokemonRoster();
  const want = bgPokemonCount(roster.length);
  if (!want) {
    const el = _pwBgLayer(false);
    if (el) el.remove();
    _pwBgWalkers = [];
    _pwBgSig = '';
    _pwBgStop();
    return;
  }
  // PASSE 31 — tirage AU HASARD dans tout le roster, chromatiques compris mais
  // sans privilège : la passe 30 mettait les shinies en tête de liste, si bien
  // qu'avec un effectif réduit le fond n'affichait QUE des chromatiques. Le
  // roster complet sert aussi de réservoir de relève entre deux traversées.
  _pwBgPool = roster.slice();
  const bag = roster.slice();
  const pick = [];
  while (pick.length < want && bag.length) {
    pick.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  }
  // si le roster est plus court que l'effectif voulu, on autorise les doublons
  while (pick.length < want && roster.length) {
    pick.push(roster[Math.floor(Math.random() * roster.length)]);
  }
  const sig = String(want) + '|' + pick.map(e => e.id + (e.shiny ? 's' : '')).join(',');
  const layer = _pwBgLayer(true);
  if (!layer) return;
  if (sig === _pwBgSig && layer.childElementCount === pick.length) { _pwBgStart(); return; }
  _pwBgSig = sig;
  _pwBgStop();
  _pwBgWalkers = [];
  layer.textContent = '';
  for (const entry of pick) {
    const st = _pwBgSpawn(entry);
    if (!st) continue;
    layer.appendChild(st.el);
    _pwBgWalkers.push(st);
  }
  _pwBgStart();
}

// Économie de batterie : onglet caché → on gèle la promenade.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _pwBgStop();
    else _pwBgStart();
  });
}

// --- Migrated to ES module, globals exposed ---
if (typeof renderBgPokemon !== 'undefined') { if (typeof window !== 'undefined') window.renderBgPokemon = renderBgPokemon; if (typeof globalThis !== 'undefined') globalThis.renderBgPokemon = renderBgPokemon; }
if (typeof bgPokemonCount !== 'undefined') { if (typeof window !== 'undefined') window.bgPokemonCount = bgPokemonCount; if (typeof globalThis !== 'undefined') globalThis.bgPokemonCount = bgPokemonCount; }
if (typeof bgPokemonRoster !== 'undefined') { if (typeof window !== 'undefined') window.bgPokemonRoster = bgPokemonRoster; if (typeof globalThis !== 'undefined') globalThis.bgPokemonRoster = bgPokemonRoster; }

// PASSE 32 — la règle de peuplement, exposée pour l'affichage et les tests :
// « minimum 5 promeneurs, +1 par tranche de 10 espèces capturées, sans plafond ».
const BG_POKEMON_RULE = Object.freeze({
  min: PW_BG_MIN_COUNT,
  perCatches: PW_BG_PER_CATCH,
  max: PW_BG_MAX,
});
if (typeof window !== 'undefined') window.BG_POKEMON_RULE = BG_POKEMON_RULE;
if (typeof globalThis !== 'undefined') globalThis.BG_POKEMON_RULE = BG_POKEMON_RULE;

export {
  renderBgPokemon,
  bgPokemonCount,
  bgPokemonRoster,
  BG_POKEMON_RULE,
};

if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('renderBgPokemon', renderBgPokemon); } catch (_) {} }

