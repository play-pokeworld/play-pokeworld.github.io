// ============================================================================
// DATA — Secret base layouts (phase 37: OFFICIAL GBA SHAPES)
// ----------------------------------------------------------------------------
// 12 layouts = 3 themes (cave, tree, bush) × 4 CANON rooms of Pokemon
// Emerald (RSE), extracted by `tools/bake-emerald-bgs.py` from the real
// layouts of the `pret/pokeemerald` decompilation (collision bits + metatiles):
//   cave_1 = SecretBase_BrownCave1 (11×9)   cave_2 = BrownCave2 (14×9)
//   cave_3 = BrownCave3 (15×11)             cave_4 = BrownCave4 (14×12)
//   tree_1 = Tree1  (11×9)                  tree_2 = Tree2  (7×16, couloir)
//   tree_3 = Tree3  (17×8)                  tree_4 = Tree4  (14×14, deux ailes)
//   bush_1 = Shrub1 (11×9)                  bush_2 = Shrub2 (15×7)
// bush_3 = Shrub3 (13×11, cross)          bush_4 = Shrub4 (14×11, maze)
// Themes only change the skin (walls/floor); the topology is canon.
// RSE has neither platform nor second floor: the 24 CANON layouts (4
// cave colors × 4, trees, bushes) have elev 0 everywhere and no anchor.
// 12 CUSTOM layouts (5-6 of each theme) have a mezzanine ('^'), a south
// cliff ('=') and stair anchors ('a') — the "stairs" object can be placed
// there. Phase 43: UNIFORM ORAS-style architecture — full-width plateau
// on 2 rows + cliff band + west stair(s) (/east for variants 6), height
// difference visible from any angle.
//
// ASCII grid legend:
//   '#' wall/void      '.' floor         'o' rock/hole (fillable: board)
//   'E' exit mat (metatile 524 — not decorable)
//   'S' arrival point (metatile 544 — player spawn, not decorable).
//       Phase 43 (user request): 'S' is ALWAYS the tile in front of the
//       door — the player appears right when entering, never elsewhere.
//
// Compatibility: old ids (<theme>_square_a|wide_b|twolevel_a,
// passe 33-36) are converted to 1/2/3 (see baseLayoutIdLegacy).
// ============================================================================

export const BASE_LAYOUT_SHAPES = {
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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

// ——— Phase 42: the COLORED caves get two levels too (user request) —
  cave_red_5: {
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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
    canon: null, // custom passe 44 (organic ORAS architecture: plateau drawn
    // non-rectangular, 2-column stair EMBEDDED between two heights
    // (alcove — only one possible position), short winding climb,
    // spawn in front of the door),
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

export const BASE_LAYOUT_THEMES = ['cave', 'tree', 'bush'];

export function baseLayoutId(theme, shape) { return theme + '_' + shape; }

// Old id (passe 33-36) → new: square_a → 1, wide_b → 2, twolevel_a → 3.
export function baseLayoutIdLegacy(id) {
  const m = /^([a-z]+)_(square_a|wide_b|twolevel_a)$/.exec(id || '');
  if (!m) return null;
  const map = { square_a: '1', wide_b: '2', twolevel_a: '3' };
  const theme = m[1];
  if (BASE_LAYOUT_THEMES.indexOf(theme) < 0) return null;
  return theme + '_' + map[m[2]];
}

// Returns the COMPLETE layout (theme + shape + parsed cells).
export function baseLayoutGet(id) {
  // (cave[/_{red,blue,yellow}]|tree|bush)_<shape>; the colored caves of
  // phase 40 share the 'cave' render theme (variant = color).
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
        // Passe 40 — two-level layouts (stairs):
        case '^': cell = { t: 'floor', elev: 1 }; break;      // mezzanine
        case '=': cell = { t: 'cliff', elev: 0 }; break;      // south cliff
        case 'a': cell = { t: 'floor', elev: 0, stairAnchor: true }; stairAnchors.push({ x, y }); break;
        default: cell = { t: 'void', elev: 0 };
      }
      rowArr.push(cell);
    }
    // incomplete rows: the rest is outside the layout (void)
    while (rowArr.length < w) rowArr.push({ t: 'void', elev: 0 });
    cells.push(rowArr);
  }
  return { id: key, theme, variant: m[2] || null, shape: m[3], canon: shape.canon, w, h, cells, spawn, exit, stairAnchors };
}

// Ids of the 9 layouts available at launch.
export function baseLayoutIds() {
  return Object.keys(BASE_LAYOUT_SHAPES);
}

// Wave 36 (T2 slice): real ES module — the canonical guarded globalThis
// exposure below is the transitional shim (phase 1 of the documented 3-phase
// plan); cross-chunk classic readers keep resolving the same names until the
// window.Pokeworld namespace wave lands (T2-C).
if (typeof globalThis !== 'undefined') {
  globalThis.BASE_LAYOUT_SHAPES = BASE_LAYOUT_SHAPES;
  globalThis.BASE_LAYOUT_THEMES = BASE_LAYOUT_THEMES;
  globalThis.baseLayoutGet = baseLayoutGet;
  globalThis.baseLayoutIds = baseLayoutIds;
  globalThis.baseLayoutIdLegacy = baseLayoutIdLegacy;
}


// --- Exported globals ---
if (typeof baseLayoutId !== 'undefined') { if (typeof window !== 'undefined') window.baseLayoutId = baseLayoutId; if (typeof globalThis !== 'undefined') globalThis.baseLayoutId = baseLayoutId; }
