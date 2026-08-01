// ============================================================================
// DONNÉES — Gabarits de bases secrètes (passe 37 : FORMES GBA OFFICIELLES)
// ----------------------------------------------------------------------------
// 12 gabarits = 3 thèmes (grotte, arbre, buisson) × 4 salles CANON de Pokémon
// Émeraude (RSE), extraites par `tools/bake-emerald-bgs.py` des vrais layouts
// du désassemblage `pret/pokeemerald` (bits de collision + métatiles) :
//   cave_1 = SecretBase_BrownCave1 (11×9)   cave_2 = BrownCave2 (14×9)
//   cave_3 = BrownCave3 (15×11)             cave_4 = BrownCave4 (14×12)
//   tree_1 = Tree1  (11×9)                  tree_2 = Tree2  (7×16, couloir)
//   tree_3 = Tree3  (17×8)                  tree_4 = Tree4  (14×14, deux ailes)
//   bush_1 = Shrub1 (11×9)                  bush_2 = Shrub2 (15×7)
//   bush_3 = Shrub3 (13×11, croix)          bush_4 = Shrub4 (14×11, dédalé)
// Les thèmes ne changent que l'habillage (murs/sol) ; la topologie est canon.
// RSE n'a ni plateforme ni deuxième niveau : les 24 gabarits CANON (4
// couleurs de grottes × 4, arbres, buissons) ont elev 0 partout et aucune
// ancre. 12 gabarits PERSO (5-6 de chaque thème) ont une mezzanine ('^'),
// une falaise sud ('=') et des ancres d'escalier ('a') — l'objet « stairs »
// y est posable. Passe 43 : architecture UNIFORME façon ORAS — plateau
// pleine largeur sur 2 rangées + bande de falaise + escalier(s) ouest
// (/est pour les variantes 6), dénivelé visible de tout angle.
//
// Légende des grilles ASCII :
//   '#' mur/vide       '.' sol           'o' rocher/trou (comblable : planche)
//   'E' tapis de sortie (métatile 524 — non décorable)
//   'S' point d'arrivée (métatile 544 — spawn du joueur, non décorable).
//       Passe 43 (demande utilisateur) : 'S' est TOUJOURS la case devant la
//       porte — le joueur apparaît juste en entrant, jamais ailleurs.
//
// Compatibilité : les anciens ids (<thème>_square_a|wide_b|twolevel_a,
// passe 33-36) sont convertis vers 1/2/3 (voir baseLayoutIdLegacy).
// ============================================================================

const BASE_LAYOUT_SHAPES = {
  cave_1: {
    canon: 'SecretBase_BrownCave1',
    rows: [
      '###########',
      '###.......#',
      '#....o....#',
      '#.........#',
      '#.........#',
      '#........##',
      '##.......##',
      '##...S...##',
      '#####E#####',
    ],
  },
  cave_2: {
    canon: 'SecretBase_BrownCave2',
    rows: [
      '##############',
      '#.........####',
      '#.###......o.#',
      '#.###........#',
      '#.###........#',
      '#.###........#',
      '#.###.......##',
      '#S######....##',
      '#E############',
    ],
  },
  cave_3: {
    canon: 'SecretBase_BrownCave3',
    rows: [
      '###############',
      '#............##',
      '#....#####...##',
      '##...#####....#',
      '##...#####....#',
      '##...#####....#',
      '##...#####....#',
      '#o...#####....#',
      '#....#####....#',
      '#....#####.S..#',
      '###########E###',
    ],
  },
  cave_4: {
    canon: 'SecretBase_BrownCave4',
    rows: [
      '##############',
      '#.o.......o..#',
      '#.........o..#',
      '#...########.#',
      '#...########.#',
      '#...########.#',
      '#...###......#',
      '#...###......#',
      '#.S.###......#',
      '##E####......#',
      '#######......#',
      '##############',
    ],
  },

  cave_red_1: {
    canon: 'SecretBase_RedCave1',
    rows: [
      '###########',
      '##.......##',
      '#........##',
      '#........##',
      '#......o.##',
      '#........##',
      '#........##',
      '###..S...##',
      '#####E#####',
    ],
  },
  cave_red_2: {
    canon: 'SecretBase_RedCave2',
    rows: [
      '#######',
      '##.o.##',
      '##...##',
      '##...##',
      '##...##',
      '#....##',
      '#....##',
      '#....##',
      '#.....#',
      '#.....#',
      '#.....#',
      '##...##',
      '###.###',
      '###.###',
      '###S###',
      '###E###',
    ],
  },
  cave_red_3: {
    canon: 'SecretBase_RedCave3',
    rows: [
      '###############',
      '##########..o.#',
      '#.....####....#',
      '#.....####....#',
      '#.............#',
      '#.....####....#',
      '#..S..#####...#',
      '###E###########',
    ],
  },
  cave_red_4: {
    canon: 'SecretBase_RedCave4',
    rows: [
      '#########',
      '##......#',
      '##......#',
      '##......#',
      '##......#',
      '######o##',
      '######o##',
      '######.##',
      '#....o.##',
      '#......##',
      '#......##',
      '#......##',
      '#.S.....#',
      '##E##...#',
      '#########',
    ],
  },
  cave_blue_1: {
    canon: 'SecretBase_BlueCave1',
    rows: [
      '###########',
      '#####.....#',
      '#...o.....#',
      '#........##',
      '#........##',
      '#........##',
      '#........##',
      '###..S...##',
      '#####E#####',
    ],
  },
  cave_blue_2: {
    canon: 'SecretBase_BlueCave2',
    rows: [
      '###############',
      '#.o...........#',
      '#.............#',
      '##............#',
      '##............#',
      '##.....S...####',
      '#######E#######',
    ],
  },
  cave_blue_3: {
    canon: 'SecretBase_BlueCave3',
    rows: [
      '##########',
      '#....o...#',
      '#........#',
      '#........#',
      '#..#######',
      '#..#######',
      '#..#######',
      '#........#',
      '########.#',
      '########.#',
      '########.#',
      '####.....#',
      '####.#####',
      '####.#####',
      '##.....###',
      '##..S..###',
      '####E#####',
    ],
  },
  cave_blue_4: {
    canon: 'SecretBase_BlueCave4',
    rows: [
      '#########',
      '#......##',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '###..####',
      '####o####',
      '####o####',
      '####.####',
      '####.####',
      '###..o###',
      '###...###',
      '###.S.###',
      '####E####',
    ],
  },
  cave_yellow_1: {
    canon: 'SecretBase_YellowCave1',
    rows: [
      '###########',
      '#..o.....##',
      '#.........#',
      '#.........#',
      '#.........#',
      '#.........#',
      '#.........#',
      '##...S..###',
      '#####E#####',
    ],
  },
  cave_yellow_2: {
    canon: 'SecretBase_YellowCave2',
    rows: [
      '##############',
      '#o...........#',
      '#.......####.#',
      '#.......####.#',
      '##......####.#',
      '##......####.#',
      '##.......###.#',
      '##.......###S#',
      '############E#',
    ],
  },
  cave_yellow_3: {
    canon: 'SecretBase_YellowCave3',
    rows: [
      '############',
      '########...#',
      '#..#####...#',
      '#..#####...#',
      '#..#####...#',
      '#......o...#',
      '#..........#',
      '#..........#',
      '#.........##',
      '##...S....##',
      '#####E######',
    ],
  },
  cave_yellow_4: {
    canon: 'SecretBase_YellowCave4',
    rows: [
      '#############',
      '#........o..#',
      '#........o..#',
      '#......###..#',
      '#......###..#',
      '##########..#',
      '##########..#',
      '##########..#',
      '###......o..#',
      '###.........#',
      '###........##',
      '###.......###',
      '###...S...###',
      '######E######',
    ],
  },
  tree_1: {
    canon: 'SecretBase_Tree1',
    rows: [
      '###########',
      '###..o....#',
      '#.........#',
      '#.........#',
      '#.........#',
      '#.........#',
      '#........##',
      '##...S...##',
      '#####E#####',
    ],
  },
  tree_2: {
    canon: 'SecretBase_Tree2',
    rows: [
      '#######',
      '#..o.##',
      '#....##',
      '#....##',
      '#....##',
      '#.....#',
      '#.....#',
      '#.....#',
      '#.....#',
      '##....#',
      '##....#',
      '##...##',
      '###.###',
      '###.###',
      '###S###',
      '###E###',
    ],
  },
  tree_3: {
    canon: 'SecretBase_Tree3',
    rows: [
      '#################',
      '#..............##',
      '#o....##.##.....#',
      '#.....##.##.....#',
      '#.....##.##.....#',
      '##....##.##.....#',
      '###...##S###....#',
      '########E########',
    ],
  },
  tree_4: {
    canon: 'SecretBase_Tree4',
    rows: [
      '##############',
      '########.....#',
      '#.....##.....#',
      '#.....##.....#',
      '#.....##.....#',
      '##..####.....#',
      '###o####....##',
      '###o#######o##',
      '###.#######o##',
      '###.......o.##',
      '###.........##',
      '###.........##',
      '###....S..####',
      '#######E######',
    ],
  },
  bush_1: {
    canon: 'SecretBase_Shrub1',
    rows: [
      '###########',
      '#..###....#',
      '#....o....#',
      '#.........#',
      '#.........#',
      '#........##',
      '##.......##',
      '##...S...##',
      '#####E#####',
    ],
  },
  bush_2: {
    canon: 'SecretBase_Shrub2',
    rows: [
      '###############',
      '#............##',
      '#............o#',
      '#.............#',
      '#.............#',
      '#####..S.....##',
      '#######E#######',
    ],
  },
  bush_3: {
    canon: 'SecretBase_Shrub3',
    rows: [
      '#############',
      '#...........#',
      '#...........#',
      '##..........#',
      '######.######',
      '######.######',
      '######.######',
      '#....o.....##',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  bush_4: {
    canon: 'SecretBase_Shrub4',
    rows: [
      '##############',
      '#..o.........#',
      '#..o.........#',
      '#..#######...#',
      '#..#######...#',
      '#.....###....#',
      '#.....###....#',
      '#.....###o...#',
      '#.....####.S.#',
      '#.....#####E##',
      '##############',
    ],
  },
  cave_5: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '#############',
      '###^^^^^^^###',
      '###^^^^^^^###',
      '###^==^^^^###',
      '###=aa====###',
      '####.....####',
      '#####...#####',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##.........##',
      '#.o.........#',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  cave_6: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '##############',
      '###^^^^^^^^###',
      '###^^^^^^^^###',
      '###^^==^^^^###',
      '###==aa====###',
      '####......####',
      '#####....#####',
      '#####....#####',
      '#####....#####',
      '####......####',
      '###........###',
      '##..........##',
      '#.o..........#',
      '#............#',
      '#......S.....#',
      '#######E######',
    ],
  },
  tree_5: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '############',
      '###^^^^^^###',
      '###^^^^^^###',
      '###^^^==^###',
      '###===aa=###',
      '###.....####',
      '####...#####',
      '####...#####',
      '###.....####',
      '##.......###',
      '#.........##',
      '#.o........#',
      '#..........#',
      '#.....S....#',
      '######E#####',
    ],
  },
  tree_6: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '#############',
      '###^^^^^^^###',
      '###^^^^^^^###',
      '###^==^^^^###',
      '###=aa====###',
      '####.....####',
      '#####...#####',
      '#####...#####',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##.........##',
      '#.o.........#',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  bush_5: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '#############',
      '###^^^^^^^###',
      '###^^^^^^^###',
      '###^^==^^^###',
      '###==aa===###',
      '####.....####',
      '#####...#####',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##.........##',
      '#.o.........#',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  bush_6: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '##############',
      '###^^^^^^^^###',
      '###^^^^^^^^###',
      '###^^^^^==^###',
      '###=====aa=###',
      '####......####',
      '#####....#####',
      '#####....#####',
      '####......####',
      '###........###',
      '##..........##',
      '#.o..........#',
      '#............#',
      '#......S.....#',
      '#######E######',
    ],
  },

  // ——— Passe 42 : les grottes COLORÉES aussi à deux niveaux (demande utilisateur) —
  cave_red_5: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '############',
      '###^^^^^^###',
      '###^^^^^^###',
      '###^==^^^###',
      '###=aa===###',
      '###.....####',
      '####...#####',
      '####...#####',
      '###.....####',
      '##.......###',
      '#.........##',
      '#.o........#',
      '#..........#',
      '#.....S....#',
      '######E#####',
    ],
  },
  cave_red_6: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '#############',
      '###^^^^^^^###',
      '###^^^^^^^###',
      '###^^==^^^###',
      '###==aa===###',
      '####.....####',
      '#####...#####',
      '#####...#####',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##.........##',
      '#.o.........#',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  cave_blue_5: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '#############',
      '###^^^^^^^###',
      '###^^^^^^^###',
      '###^^^^==^###',
      '###====aa=###',
      '####.....####',
      '#####...#####',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##.........##',
      '#.o.........#',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  cave_blue_6: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '############',
      '###^^^^^^###',
      '###^^^^^^###',
      '###^==^^^###',
      '###=aa===###',
      '###.....####',
      '####...#####',
      '####...#####',
      '####...#####',
      '###.....####',
      '##.......###',
      '#.........##',
      '#.o........#',
      '#..........#',
      '#.....S....#',
      '######E#####',
    ],
  },
  cave_yellow_5: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '#############',
      '###^^^^^^^###',
      '###^^^^^^^###',
      '###^^==^^^###',
      '###==aa===###',
      '####.....####',
      '#####...#####',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##.........##',
      '#.o.........#',
      '#...........#',
      '#.....S.....#',
      '######E######',
    ],
  },
  cave_yellow_6: {
    canon: null, // perso passe 44 (architecture ROSA organique : plateau dessiné
    // non rectangulaire, escalier 2 colonnes ENCASTRÉ entre deux hauteurs
    // (alcôve — une seule position possible), montée en petit détour,
    // spawn devant la porte),
    rows: [
      '##############',
      '###^^^^^^^^###',
      '###^^^^^^^^###',
      '###^^^^^==^###',
      '###=====aa=###',
      '####......####',
      '#####....#####',
      '#####....#####',
      '####......####',
      '###........###',
      '##..........##',
      '#.o..........#',
      '#............#',
      '#......S.....#',
      '#######E######',
    ],
  },

};

const BASE_LAYOUT_THEMES = ['cave', 'tree', 'bush'];

function baseLayoutId(theme, shape) { return theme + '_' + shape; }

// Ancien id (passe 33-36) → nouveau : square_a → 1, wide_b → 2, twolevel_a → 3.
function baseLayoutIdLegacy(id) {
  const m = /^([a-z]+)_(square_a|wide_b|twolevel_a)$/.exec(id || '');
  if (!m) return null;
  const map = { square_a: '1', wide_b: '2', twolevel_a: '3' };
  const theme = m[1];
  if (BASE_LAYOUT_THEMES.indexOf(theme) < 0) return null;
  return theme + '_' + map[m[2]];
}

// Retourne le gabarit COMPLET (thème + forme + cellules parsées).
function baseLayoutGet(id) {
  // (cave[/_{red,blue,yellow}]|tree|bush)_<forme> ; les grottes colorées de
  // la passe 40 partagent le thème de rendu 'cave' (variant = couleur).
  let m = /^(cave|tree|bush)(?:_(red|blue|yellow))?_(\d)$/.exec(id || '');
  if (!m) {
    const aliased = baseLayoutIdLegacy(id);
    if (!aliased) return null;
    m = /^(cave|tree|bush)(?:_(red|blue|yellow))?_(\d)$/.exec(aliased);
  }
  const theme = m[1], key = theme + (m[2] ? '_' + m[2] : '') + '_' + m[3];
  const shape = BASE_LAYOUT_SHAPES[key];
  if (BASE_LAYOUT_THEMES.indexOf(theme) < 0 || !shape) return null;
  const rows = shape.rows;
  const w = rows[0].length, h = rows.length;
  const cells = [];
  let spawn = null, exit = null;
  const stairAnchors = [];
  for (let y = 0; y < h; y++) {
    const rowArr = [];
    for (let x = 0; x < Math.min(rows[y].length, w); x++) {
      const ch = rows[y][x];
      let cell;
      switch (ch) {
        case '#': cell = { t: 'wall', elev: 0 }; break;
        case '.': cell = { t: 'floor', elev: 0 }; break;
        case 'E': cell = { t: 'floor', elev: 0, entrance: true }; exit = { x, y }; break;
        case 'S': cell = { t: 'floor', elev: 0, spawnPt: true }; spawn = { x, y }; break;
        case 'o': cell = { t: 'hole', elev: 0 }; break;
        // Passe 40 — gabarits à deux niveaux (escalier) :
        case '^': cell = { t: 'floor', elev: 1 }; break;      // mezzanine
        case '=': cell = { t: 'cliff', elev: 0 }; break;      // falaise sud
        case 'a': cell = { t: 'floor', elev: 0, stairAnchor: true }; stairAnchors.push({ x, y }); break;
        default: cell = { t: 'void', elev: 0 };
      }
      rowArr.push(cell);
    }
    // lignes incomplètes : le reste = hors gabarit (void)
    while (rowArr.length < w) rowArr.push({ t: 'void', elev: 0 });
    cells.push(rowArr);
  }
  return { id: key, theme, variant: m[2] || null, shape: m[3], canon: shape.canon, w, h, cells, spawn, exit, stairAnchors };
}

// Ids des 9 gabarits disponibles au lancement.
function baseLayoutIds() {
  return Object.keys(BASE_LAYOUT_SHAPES);
}

window.BASE_LAYOUT_SHAPES = BASE_LAYOUT_SHAPES;
window.BASE_LAYOUT_THEMES = BASE_LAYOUT_THEMES;
window.baseLayoutGet = baseLayoutGet;
window.baseLayoutIds = baseLayoutIds;
window.baseLayoutIdLegacy = baseLayoutIdLegacy;

