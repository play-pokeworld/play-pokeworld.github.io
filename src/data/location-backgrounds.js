// PASSE 29 — items 1 & 2 : le décor doit changer SELON LE LIEU, en combat
// comme hors combat, exactement comme Pokéchill.
//
// Pokéchill peint `#explore-header` avec une image de `img/bg/*.png` choisie
// d'après la zone courante. On reproduit ce comportement ici : une table
// unique lieu → décor, consommée par le CSS via un attribut `data-bg` posé
// sur `<body>` (hors combat) et sur la carte du sauvage (combat).
//
// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.

// Les 23 décors Pokéchill réellement présents dans `src/assets/images/bg/`.
const BG_SCENES = [
  'beach', 'cave', 'desert', 'forest', 'gym', 'iceCave', 'lab', 'lake',
  'mall', 'mountain', 'night', 'plant', 'route', 'sea', 'snow', 'space',
  'tower', 'town', 'trench', 'volcano', 'dimension1', 'main-bg', 'missing',
];

// Décor par TYPE de lieu : c'est le repli, il garantit qu'aucune zone ne
// reste sans paysage même si elle n'est pas nommée ci-dessous.
const BG_BY_TYPE = {
  town: 'town',
  route: 'route',
  dungeon: 'cave',
  sea: 'sea',
};

// Décor explicite par lieu, quand le type ne suffit pas à décrire l'endroit
// (une forêt n'est pas une grotte, une centrale n'est pas une caverne…).
const BG_BY_LOCATION = {
  // ── Kanto ────────────────────────────────────────────────────────────
  viridianforest: 'forest',
  mtmoon: 'mountain',
  ceruleancave: 'cave',
  diglettscave: 'cave',
  diglettscave_2: 'cave',
  rocktunnel: 'cave',
  powerplant: 'plant',
  pokemontower: 'tower',
  safarizone: 'forest',
  seafoamislands: 'iceCave',
  pokemonmansion: 'mall',
  victoryroad: 'mountain',
  cinnabar: 'volcano',
  indigo: 'mountain',
  billshouse: 'lab',
  route19: 'sea',
  route20: 'sea',
  route21: 'sea',
  route4: 'beach',
  route25: 'beach',
  route17: 'route',
  route18: 'route',
  // ── Johto ────────────────────────────────────────────────────────────
  newbark: 'town',
  sprouttower: 'tower',
  ruinsofalph: 'cave',
  unioncave: 'cave',
  ilexforest: 'forest',
  nationalpark: 'plant',
  burnedtower: 'tower',
  tintower: 'tower',
  mtmortar: 'mountain',
  icepath: 'iceCave',
  darkcave: 'cave',
  slowpokewell: 'cave',
  whirlislands: 'sea',
  victoryroad_jo: 'mountain',
  mtsilver: 'snow',
  tohjofalls: 'cave',
  lakerage: 'lake',
  jroute40: 'sea',
  jroute41: 'sea',
  jroute44: 'forest',
  jroute45: 'mountain',
  jroute46: 'mountain',
  jroute47: 'beach',
  jroute48: 'desert',
  olivine: 'beach',
  cianwood: 'beach',
  blackthorn: 'mountain',
  indigo_jo: 'mountain',
  goldenrod: 'mall',
  ecruteak: 'town',
  // ── Hoenn ────────────────────────────────────────────────────────────
  littleroot: 'town',
  lavaridge: 'volcano',
  mtchimney: 'volcano',
  meteorfalls: 'cave',
  granitecave: 'cave',
  shoalcave: 'iceCave',
  seafloorcavern: 'trench',
  caveoforigin: 'cave',
  skypillar: 'tower',
  desertunderpass: 'desert',
  sootopolis: 'lake',
  pacifidlog: 'sea',
  slateport: 'beach',
  dewford: 'beach',
  lilycove: 'mall',
  mossdeep: 'space',
  fortree: 'forest',
  petalburgwoods: 'forest',
  safarizone_hoenn: 'plant',
  weather_institute: 'lab',
  mirage_island: 'dimension1',
  victoryroad_ho: 'mountain',
  evergrande: 'mountain',
  magmahideout: 'volcano',
  aquahideout: 'sea',
  newmauville: 'plant',
  scorchedslab: 'desert',
  route111: 'desert',
  route112: 'volcano',
  route113: 'desert',
  route124: 'sea',
  route125: 'sea',
  route126: 'sea',
  route127: 'sea',
  route128: 'sea',
  route129: 'sea',
  route130: 'sea',
  route131: 'sea',
  route132: 'sea',
  route133: 'sea',
  route134: 'sea',
};

// Mots-clés testés sur l'identifiant puis sur le nom affiché : rattrape les
// zones ajoutées plus tard sans toucher à la table.
const BG_KEYWORDS = [
  [/(icepath|glaci|ice|banquise)/i, 'iceCave'],
  [/(cave|cavern|grotte|caverne|tunnel|underpass|puits|well)/i, 'cave'],
  [/(forest|foret|forêt|woods|bois|jade)/i, 'forest'],
  [/(volcan|magma|lava|cramois)/i, 'volcano'],
  [/(tower|tour|pillar|pilier)/i, 'tower'],
  [/(desert|sable|dune)/i, 'desert'],
  [/(mountain|mt|mont|silver|summit)/i, 'mountain'],
  [/(lake|lac|rage)/i, 'lake'],
  [/(beach|plage|shore|port|harbor)/i, 'beach'],
  [/(sea|ocean|océan|chenal|water|aqua|marin)/i, 'sea'],
  [/(plant|centrale|power|park|parc)/i, 'plant'],
  [/(lab|institut|research)/i, 'lab'],
  [/(mall|centre|casino|manoir|mansion|depot)/i, 'mall'],
  [/(snow|neige|blizzard)/i, 'snow'],
  [/(space|spatial|meteo|space ?center)/i, 'space'],
  [/(trench|abysse|seafloor)/i, 'trench'],
  [/(gym|arene|arène)/i, 'gym'],
];

// Décor du LIEU courant (ou du lieu passé en argument).
function getLocationBackground(locId) {
  const id = locId || (typeof G !== 'undefined' && G ? G.location : null);
  if (!id) return 'route';
  if (BG_BY_LOCATION[id]) return BG_BY_LOCATION[id];

  let loc = null;
  try {
    if (typeof getLocObj === 'function') loc = getLocObj(id);
  } catch (_) { loc = null; }
  if (!loc) {
    const tables = [
      (typeof LOCS !== 'undefined' && LOCS) || null,
      (typeof LOCS_JOHTO !== 'undefined' && LOCS_JOHTO) || null,
      (typeof LOCS_HOENN !== 'undefined' && LOCS_HOENN) || null,
    ];
    for (const tb of tables) { if (tb && tb[id]) { loc = tb[id]; break; } }
  }

  const hay = String(id) + ' ' + String((loc && loc.name) || '');
  for (const [re, scene] of BG_KEYWORDS) { if (re.test(hay)) return scene; }

  const type = loc && loc.type;
  if (type && BG_BY_TYPE[type]) return BG_BY_TYPE[type];
  return 'route';
}

// Pose le décor courant sur le DOM. Le CSS fait le reste : il lit
// `body[data-bg="…"]` et `#battle-team-row > .poke-card:first-child` hérite du
// même paysage pendant le combat. Un seul point d'écriture = zéro divergence
// entre l'écran de repos et l'écran de combat.
function applyLocationBackground(locId) {
  if (typeof document === 'undefined' || !document.body) return null;
  const scene = getLocationBackground(locId);
  if (document.body.getAttribute('data-bg') !== scene) {
    document.body.setAttribute('data-bg', scene);
  }
  return scene;
}

if (typeof BG_SCENES !== 'undefined') { if (typeof window !== 'undefined') window.BG_SCENES = BG_SCENES; if (typeof globalThis !== 'undefined') globalThis.BG_SCENES = BG_SCENES; }
if (typeof BG_BY_TYPE !== 'undefined') { if (typeof window !== 'undefined') window.BG_BY_TYPE = BG_BY_TYPE; if (typeof globalThis !== 'undefined') globalThis.BG_BY_TYPE = BG_BY_TYPE; }
if (typeof BG_BY_LOCATION !== 'undefined') { if (typeof window !== 'undefined') window.BG_BY_LOCATION = BG_BY_LOCATION; if (typeof globalThis !== 'undefined') globalThis.BG_BY_LOCATION = BG_BY_LOCATION; }
if (typeof getLocationBackground !== 'undefined') { if (typeof window !== 'undefined') window.getLocationBackground = getLocationBackground; if (typeof globalThis !== 'undefined') globalThis.getLocationBackground = getLocationBackground; }
if (typeof applyLocationBackground !== 'undefined') { if (typeof window !== 'undefined') window.applyLocationBackground = applyLocationBackground; if (typeof globalThis !== 'undefined') globalThis.applyLocationBackground = applyLocationBackground; }

// Wave 40 — native ESM module: grouped export of the same names as the
// classic surface kept above/here (bodies unchanged).
export {
  BG_SCENES,
  BG_BY_TYPE,
  BG_BY_LOCATION,
  getLocationBackground,
  applyLocationBackground,
};

