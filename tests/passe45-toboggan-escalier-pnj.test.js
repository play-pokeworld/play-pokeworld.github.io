import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';
import crypto from 'node:crypto';

// ── Pass 45: user feedback ─────────────────────────────────────────
//  A. STAIRS: v8 sprite consistent with the Emerald art direction (flight in
//     perspective with the palette of the tileset's only canonical stairs, 0x263)
//     — plus the repeating display-stand pattern.
//  B. SLIDE: ground footprint = 6 tiles (2×3), the TOP row becomes a
//     purely visual overhang → you walk BEHIND it and can place objects on it.
//  C. Multi-floor LAYOUTS: redrawn FRLG-style (terraces/bays/atria), plus
//     a full rectangular plateau.
//  D. NPC: full editor (create/edit/delete, 1-6 team, preset import as a
//     FROZEN snapshot).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));

const SANDBOX_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/application/game-state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/application/base/base-core.js',
  'src/ui/game/base/base-visit.js',
  'src/ui/game/base/base-exchange.js',
  'src/ui/game/base/base-editor.js',
  'src/ui/game/base/base-debug.js',
];

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      head: { dataset: {} },
      documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, children: [], appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, addEventListener() {}, click() {}, remove() {} }),
      addEventListener() {}, removeEventListener() {},
    },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() },
    navigator: { language: 'fr' },
    location: { href: 'http://localhost/', reload() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    setInterval: () => 1, clearInterval() {}, setTimeout: (cb) => setTimeout(cb, 0), clearTimeout() {},
    PokeWorldGameStarted: false,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // T2-D: same files, SAME order — bundled IIFE keeps vm parity AND tolerates ESM converts
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe45-base [iife]' });
  return sandbox;
}

const BASE_NPC_FALLBACK = 'trainer-0';

const CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6',
  'cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6',
  'cave_yellow_5', 'cave_yellow_6'];

// ——— A — v9 stairs: wood, constant width ————————————————————————————
test('phase 46 A: v9 stairs — board wood, CONSTANT width', () => {
  const bake = R('tools/bake-emerald-bgs.py');
  const fn = bake.slice(bake.indexOf('def bake_stairs_sprite'), bake.indexOf('def bake_canon'));
  // neither the display-stand pattern collage (v7), nor the perspective trapezoid (v8)
  assert.ok(!/im\.paste\(SL/.test(fn), 'no more pasting the display-stand pattern (v7)');
  assert.ok(!fn.includes('top_half'), 'no more variable half-widths (v8)');
  for (const cue of ['v9', 'CONSTANT WIDTH', 'solid_board', '2 COLUMNS']) {
    assert.ok(fn.includes(cue), `baker : ${cue}`);
  }
  // wood palette — exactly the one of the solid_board plank
  for (const c of ['0xb4, 0xa4, 0x62', '0x94, 0x83, 0x41', '0x7b, 0x62, 0x20']) {
    assert.ok(fn.includes(c), `wood palette ${c}`);
  }
  const b = fs.readFileSync(new URL('../src/assets/images/secret-base/emerald/stairs.png', import.meta.url));
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20), b[25]], [32, 32, 6], 'stairs.png 32×32 RGBA');
});

// ——— B — slide: 6 ground tiles, visual overhang —————————————————————
test('phase 45 B: slide — 2×3 footprint (6 tiles) + visual overhang', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const def = baseItemGet('slide');
    r.shape = [def.w, def.d];        // canon DRAWN shape: unchanged (2×4)
    r.over = def.over | 0;
    const fp = baseItemFootprint(def, 0);
    r.fp = [fp.w, fp.d];             // GROUND footprint: 2×3 = 6 tiles
    r.cells = fp.w * fp.d;
    r.draw = baseItemDrawOffset(def); // the sprite starts 1 tile higher
    // the display stand, on the other hand, has no overhang
    const sfp = baseItemFootprint(baseItemGet('stand'), 0);
    r.standFp = [sfp.w, sfp.d];
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.shape, [2, 4], 'canon drawn shape kept (2×4)');
  assert.equal(out.over, 1, 'one overhang row');
  assert.deepEqual(out.fp, [2, 3], '2×3 ground footprint');
  assert.equal(out.cells, 6, 'SIX ground tiles (user feedback), not eight');
  assert.deepEqual(out.draw, { dx: 0, dy: -1 }, 'sprite shifted up one tile');
  assert.deepEqual(out.standFp, [4, 2], 'display stand unchanged (no overhang)');
});

test('phase 45 B2: you walk BEHIND the slide and can place an object on it', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    const r = {};
    const put = basePlace(st, 'slide', 3, 2, 0);   // footprint y2..y4
    r.placed = put.ok === true;
    const g = baseBuildGrid(st);
    // the two tiles under the cover (y=1) are NOT occupied
    r.behind = [baseCellWalkable(st, g, 3, 1, null), baseCellWalkable(st, g, 4, 1, null)];
    // …and an item can be PLACED there (the height effect, user request)
    r.canPut = baseCanPlace(st, 'small_chair', 3, 1, 0).ok === true;
    // the slide indeed takes the 6 footprint tiles
    let owned = 0;
    for (let y = 2; y <= 4; y++) for (let x = 3; x <= 4; x++) if (g.occ[y][x] === put.uid) owned++;
    r.owned = owned;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.placed, true, 'slide placed');
  assert.deepEqual(out.behind, [true, true], 'the 2 tiles behind stay walkable');
  assert.equal(out.canPut, true, 'an object can be placed BEHIND the slide');
  assert.equal(out.owned, 6, 'the slide occupies exactly 6 tiles');
});

// ——— C — multi-floor layouts redrawn FRLG-style ———————————————————————
test('phase 51 C: two rooms joined by a corridor, shouldered door, looping tiles', () => {
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  assert.deepEqual(Object.keys(grids).sort(), CUSTOM.slice().sort(), 'the 12 custom layouts');
  for (const [lid, rows] of Object.entries(grids)) {
    const h = rows.length, w = rows[0].length;
    const at = (x, y) => (rows[y] && rows[y][x]) || '#';
    // (1) ONE single entrance, on the south edge
    assert.equal((rows.join('').match(/E/g) || []).length, 1, `${lid}: a single entrance`);
    assert.ok(rows[h - 1].includes('E'), `${lid}: door to the south`);
    // (2) Pass 53: NO MORE strangled shoulder. The canon (cave_1) keeps its
    // last three rows STRAIGHT and the door is a simple hole in the
    // bottom wall. Simultaneous steps on both sides created facing
    // concave corners that the autotiling cannot join.
    const sy = h - 2;
    let lw = 0; while (lw < w && rows[sy][lw] === '#') lw++;
    let rw = 0; while (rw < w && rows[sy][w - 1 - rw] === '#') rw++;
    assert.equal(lw, rw, `${lid}: symmetric edges (${lw} vs ${rw})`);
    const spawnW = [...rows[sy]].filter((c) => c !== '#').length;
    assert.ok(spawnW >= 5, `${lid}: wide spawn row (${spawnW})`);
    const prof = [h - 4, h - 3, h - 2].map((y) => {
      const xs = [...rows[y]].map((c, i) => (c === '#' ? -1 : i)).filter((i) => i >= 0);
      return xs[0] + ':' + xs[xs.length - 1];
    });
    assert.equal(new Set(prof).size, 1, `${lid}: 3 straight rows before the door (${prof})`);
    // (3) the room is NOT a rectangle: at least 3 distinct widths
    const widths = new Set();
    for (let y = 1; y < h - 1; y++) {
      const n = [...rows[y]].filter((c) => c !== '#').length;
      if (n) widths.add(n);
    }
    assert.ok(widths.size >= 3, `${lid}: real shapes (widths ${[...widths].sort((a, b) => a - b)})`);
    // (4) a narrow CORRIDOR connects the two rooms
    const maxW = Math.max(...widths), minW = Math.min(...widths);
    assert.ok(minW <= maxW - 3, `${lid}: corridor clearly narrower than the rooms`);
    // (5) the cliff is bordered by the upper room walls (it "loops")
    let cliffRow = -1;
    for (let y = 0; y < h; y++) if (rows[y].includes('=')) { cliffRow = y; break; }
    assert.ok(cliffRow > 0, `${lid}: cliff present`);
    // (6) clean joins: no isolated wall, no orphan diagonal
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (rows[y][x] !== '#') continue;
      const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => at(x + dx, y + dy) === '#').length;
      assert.ok(n4 > 0, `${lid}: isolated wall at (${x},${y})`);
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const orphan = at(x + dx, y + dy) === '#' && at(x + dx, y) !== '#' && at(x, y + dy) !== '#';
        assert.ok(!orphan, `${lid} : diagonale orpheline en (${x},${y})`);
      }
    }
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${lid}.png`), `fond ${lid}`);
  }
});

// ——— D — NPC editor ————————————————————————————————————————————————————
test('phase 47 D: NPC — create, edit, delete, cap', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    r.max = BASE_NPC_MAX;
    r.spriteCount = BASE_NPC_SPRITES.length;
    r.allTrainers = BASE_NPC_SPRITES.every((s) => /^trainer-\\d+$/.test(s));
    const c = baseNpcCreate(st, { name: 'Rival Léo', sprite: 'trainer-12',
      team: [{ id: 25, level: 30 }, { id: 6, level: 32 }],
      msgs: { pre: 'En garde !', win: 'Gagné !', lose: 'Perdu…' } });
    r.created = c.ok === true;
    const npc = baseNpcFind(st, c.id);
    r.name = npc.name; r.sprite = npc.sprite; r.team = npc.team.length;
    // pass 47: a brand-new NPC can be placed WITHOUT a team (decoration until
    // configured) — this is the stock's "NPC item" path.
    r.empty = baseNpcCreate(st, { name: 'Vide', sprite: 'trainer-0', team: [] });
    // edition
    const u = baseNpcUpdate(st, c.id, { name: 'Rival Théo', team: [{ id: 9, level: 40 }] });
    r.updated = u.ok === true;
    const npc2 = baseNpcFind(st, c.id);
    r.newName = npc2.name; r.newTeam = npc2.team.map((p) => p.id + '@' + p.level);
    baseNpcUpdate(st, c.id, { team: [{ id: 25, level: 999 }] });
    r.clamped = baseNpcFind(st, c.id).team[0].level;
    // cap - we place on dynamically found free tiles
    let guard = 0;
    const tryPlace = () => {
      for (let y=1; y<9; y++) for (let x=1; x<9; x++) {
        const res = baseNpcPlaceNew(st, x, y, { name: 'P', sprite: 'trainer-0', team: [] });
        if (res.ok) return true;
      }
      return false;
    };
    while (tryPlace() && guard++ < 50) {}
    r.capped = baseNpcCount(st);
    r.overflow = baseNpcPlaceNew(st, 5, 5, { name: 'trop', sprite: 'trainer-0', team: [] });
    // Delete a placed NPC (not the stock one) to test the decrement
    const toDel = (st.npcs[0] && st.npcs[0].id) || c.id;
    r.deleted = baseNpcDelete(st, toDel);
    r.after = baseNpcCount(st);
    return JSON.stringify(r);
  })()`, sb));
  assert.ok(out.spriteCount >= 30, `many looks available (${out.spriteCount})`);
  assert.equal(out.allTrainers, true, 'the looks are images/trainers/profile sprites');
  assert.equal(out.created, true, 'NPC created');
  assert.equal(out.name, 'Rival Léo', 'name kept');
  assert.equal(out.sprite, 'trainer-12', 'look kept');
  assert.equal(out.team, 2, 'team of 2');
  assert.equal(out.empty.ok, true, 'NPC placeable without a team (configured afterwards)');
  assert.equal(out.updated, true, 'edit accepted');
  assert.equal(out.newName, 'Rival Théo', 'name changed');
  assert.deepEqual(out.newTeam, ['9@40'], 'team replaced');
  assert.equal(out.clamped, 100, 'level capped at 100');
  assert.equal(out.capped, out.max, `cap of ${out.max} NPCs reached`);
  assert.equal(out.overflow.ok, false, 'creation refused beyond the cap');
  assert.equal(out.overflow.reason, 'base.err.npc_max', 'cap reason');
  assert.equal(out.deleted, true, 'effective deletion');
  assert.equal(out.after, out.max - 1, 'counter decremented');
});

test('phase 45 D2: importing a preset = FROZEN snapshot (self-sufficient export)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    // the player's active team
    G.team = [{ id: 25, level: 40, moves: [{ id: 'thunderbolt' }], shinyActive: true },
              { id: 3, level: 42, moves: [] }];
    const t1 = baseNpcTeamFromPreset('active');
    r.fromActive = t1.map((p) => p.id + '@' + p.level);
    r.moves = t1[0].moves;
    r.shiny = t1[0].shiny;
    const c = baseNpcCreate(st, { name: 'Garde', sprite: 'boy', team: t1 });
    r.ok = c.ok === true;
    // ► the NPC must NOT follow later team changes
    G.team[0].level = 99;
    G.team.length = 1;
    const npc = baseNpcFind(st, c.id);
    r.frozen = npc.team.map((p) => p.id + '@' + p.level);
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.fromActive, ['25@40', '3@42'], 'active team imported');
  assert.deepEqual(out.moves, ['thunderbolt'], 'moves copied');
  assert.equal(out.shiny, true, 'shiny copied');
  assert.equal(out.ok, true, 'buddy created from the preset');
  assert.deepEqual(out.frozen, ['25@40', '3@42'],
    'FROZEN SNAPSHOT: editing your team does not change the buddy');
});

test('phase 47 D3: wired editor — NPC object, Edit button, "NPC" i18n', () => {
  assert.ok(E('src/ui/game/base/base-npc-editor.js'), 'module present');
  // wave 22: the building bricks moved to the ECS view — needles read
  // adapter + view (same intention: the bricks are still used).
  const mod = R('src/ui/game/base/base-npc-editor.js') + '\n' + R('src/ui/views/BaseViews.js');
  for (const fn of ['openBaseNpcEditor', 'baseNpcEditorSave', 'baseNpcEditorDelete',
    'baseNpcEditorPick', 'baseNpcEditorPickChoose', 'baseNpcEditorPickItem',
    'baseNpcEditorEquipItem', 'baseNpcEditorClearItem', 'baseNpcEditorSetSprite']) {
    assert.ok(mod.includes(`PokeActions.register('${fn}', ${fn}`), `exposed: ${fn} (engine action registry)`);
  }
  assert.ok(R('src/main.js').includes('./ui/game/base/base-npc-editor.js'), 'loaded by the loader');
  // the NPC is an ITEM of the stock, and "Edit" only exists once selected
  assert.ok(R('index.html').includes('data-action="base-ed-npc-edit"'), 'Edit button');
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes("'base-ed-npc-edit'"), 'Edit action wired');
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes("'base-ed-select-npc-new'"), 'stock NPC item wired');
  assert.ok(R('src/ui/game/base/base-editor.js').includes('baseEditorSelectNpcNew'), 'picking up the NPC item');
  assert.ok(R('src/application/base/base-core.js').includes('baseNpcPlaceNew'), 'direct NPC placement');
  // no more "pool" / roster
  assert.ok(!E('src/data/base-npcs-data.js'), 'roster file deleted');
  assert.ok(!R('src/main.js').includes('base-npcs-data'), 'roster removed from the loader');
  assert.ok(!R('src/ui/game/base/base-debug.js').includes('baseDebugAddNpcRoster'), 'debug roster removed');
  // the team editor reuses EXACTLY the preset building blocks
  for (const cue of ['generatePokeCardHTML', 'preset-pick-row', 'preset-pick-list',
    'dict-search', 'pw-drop-zone preset-slot-empty', 'onLeftClickItem']) {
    assert.ok(mod.includes(cue), `reused preset brick: ${cue}`);
  }
  // terminology: "PNJ" / "NPC", never "copain" / "pal"
  const fr = R('src/localization/fr/base.js');
  const en = R('src/localization/en/base.js');
  assert.ok(!/[Cc]opain/.test(fr), 'no "copain" in FR');
  assert.ok(!/\bpals?\b|\bPal\b/.test(en.replace(/"pals":/g, '')), 'no "pal" in EN');
  // labels are stored escaped (\u00c9diteur…): read the decoded value
  const loadLoc = (p2) => {
    const sbx = { window: {} }; sbx.globalThis = sbx;
    vm.createContext(sbx);
    // T2-D (vague 38) : fragment devenu module ESM — bundle tolérant ; le shim
    // pose la globale sur le contexte (window OU globalThis), lecture générique.
    const __text = R(p2);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([p2]) : __text, sbx, { filename: p2 });
    const frag = Object.assign({}, sbx.window, sbx);
    return frag[Object.keys(frag).find((k) => /^L_(fr|en)_/.test(k))];
  };
  assert.equal(loadLoc('src/localization/fr/base.js').npced.title, 'Éditeur de PNJ', 'FR title');
  assert.equal(loadLoc('src/localization/en/base.js').npced.title, 'NPC editor', 'titre EN');
  const keys = (p2) => {
    const s2 = R(p2);
    const k = s2.indexOf('"npced":{');
    return [...s2.slice(k, s2.indexOf('\n},', k)).matchAll(/^"(\w+)":/gm)].map((m) => m[1]).sort();
  };
  assert.deepEqual(keys('src/localization/fr/base.js'), keys('src/localization/en/base.js'),
    'FR and EN have exactly the same keys');
});

test('phase 47 E: looks = REAL images/trainers/profile portraits', () => {
  const sb = makeSandbox();
  const sprites = JSON.parse(vm.runInContext('JSON.stringify(BASE_NPC_SPRITES)', sb));
  assert.ok(sprites.length >= 30, `at least 30 looks (${sprites.length})`);
  for (const s of sprites) {
    assert.match(s, /^trainer-\d+$/, `look ${s} = trainer sprite`);
    assert.ok(E(`src/assets/images/trainers/profil/${s}.png`), `file ${s}.png present`);
  }
  // no more procedural "people" sheet for NPCs
  const core = R('src/application/base/base-core.js');
  assert.ok(core.includes('baseNpcSpriteUrl'), 'portrait URL helper');
  assert.ok(core.includes('images/trainers/profil'), 'path of the real portraits');
  assert.ok(!/'boy', 'girl', 'sailor', 'scholar'/.test(core), 'old sheets removed');
  const v2 = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2.includes('base2dNpcPortrait'), 'the renderer loads the portraits');
});

test('phase 46 F: NPC team = REAL Pokémon, level inherited (no input)', () => {
  // wave 22: the building bricks moved to the ECS view — needles read
  // adapter + view (same intention: the bricks are still used).
  const mod = R('src/ui/game/base/base-npc-editor.js') + '\n' + R('src/ui/views/BaseViews.js');
  // no more level / species input field
  assert.ok(!/data-change-args="\$\{i\}, 'level'/.test(mod), 'plus de champ de niveau');
  assert.ok(!/data-change-args="\$\{i\}, 'id'/.test(mod), 'no more species field');
  assert.ok(!mod.includes('baseNpcEditorSetMon'), 'level setter removed');
  // the UI reuses EXACTLY the preset / Atoll building blocks
  for (const cue of ['generatePokeCardHTML', 'preset-pick-row', 'preset-pick-list',
    'dict-search', 'pw-drop-zone preset-slot-empty', 'preset-pick-tag']) {
    assert.ok(mod.includes(cue), `reuses the preset brick: ${cue}`);
  }
  // the level comes from the chosen Pokémon
  assert.ok(/level:\s*Math\.min\(100, Math\.max\(1, p\.level/.test(mod), 'level copied from the real Pokémon');
  assert.ok(mod.includes('_bnCandidates'), 'candidates = team + PC box');
});

test('phase 46 G: NPCs placeable like objects + clickable to approach', () => {
  const ed = R('src/ui/game/base/base-editor.js');
  // ONE-click place/move, like furniture
  assert.ok(ed.includes('moveNpc'), 'buddy held at the mouse');
  assert.ok(ed.includes("type: 'move_npc_start'"), 'prise en main directe');
  assert.ok(ed.includes("type: 'move_npc'"), 'put down on the clicked tile');
  assert.ok(ed.includes('_baseEd.npcId || _baseEd.moveNpc'), 'shared placement ghost');
  // remote click: walk up to the buddy then interact
  assert.ok(ed.includes('visitPending'), 'interaction deferred to arrival');
  assert.ok(ed.includes("approach: 'npc'"), 'approaching a buddy');
  assert.ok(R('src/ui/game/base/base-window.js').includes('r.interact'), 'the window shows the interaction');
  // approach from the shortest side (front / back / beside)
  assert.ok(/s\.length < best\.length/.test(ed), 'shortest approach among the 4 sides');
});

test('phase 47 H: unknown look → safe fallback, valid look kept', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    const c = baseNpcCreate(st, { name: 'Test', sprite: 'trainer-24', team: [{ id: 25, level: 30 }] });
    r.ok = c.ok === true;
    r.sprite = baseNpcFind(st, c.id).sprite;
    const c2 = baseNpcCreate(st, { name: 'T2', sprite: 'pikachu_costume', team: [] });
    r.fallback = baseNpcFind(st, c2.id).sprite;
    baseNpcUpdate(st, c.id, { sprite: 'trainer-45' });
    r.updated = baseNpcFind(st, c.id).sprite;
    r.url = baseNpcSpriteUrl('trainer-45');
    r.urlBad = baseNpcSpriteUrl('nawak');
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.ok, true, 'NPC created with a trainer look');
  assert.equal(out.sprite, 'trainer-24', 'look kept');
  assert.equal(out.fallback, BASE_NPC_FALLBACK, 'unknown look → safe fallback');
  assert.equal(out.updated, 'trainer-45', 'look change applied');
  assert.equal(out.url, 'src/assets/images/trainers/profil/trainer-45.png', 'portrait URL');
  assert.equal(out.urlBad, `src/assets/images/trainers/profil/${BASE_NPC_FALLBACK}.png`, 'URL de repli');
});

// ——— I — ELEVATION-aware click resolution (phase 47 user feedback) ———————
test('phase 51 I: the slide\'s TOP tiles are clickable and selectable', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    // footprint (3,3)-(4,5); the DRAWN cover occupies (3,2)-(4,2)
    const put = basePlace(st, 'slide', 3, 3, 0);
    const C = 32;
    const r = { uid: put.uid, cells: [], sels: [] };
    // one click at the center of each SCREEN tile of column 3
    for (let y = 2; y <= 5; y++) {
      const cell = baseEditorCellResolve(st, 3 * C + C / 2, y * C + C / 2);
      r.cells.push(cell.x + ',' + cell.y);
      const sel = baseEditorSelAt(st, cell.x, cell.y);
      r.sels.push(sel ? sel.kind + ':' + sel.uid : null);
    }
    // a plain floor tile stays itself
    r.floor = baseEditorCellResolve(st, 8 * C + C / 2, 1 * C + C / 2);
    return JSON.stringify(r);
  })()`, sb));
  // User feedback: "the two top tiles must be clickable WITHOUT having a
  // ground footprint". The click therefore targets the top tile
  // itself (3,2), plus the first row of the footprint.
  assert.deepEqual(out.cells, ['3,2', '3,3', '3,4', '3,5'],
    'every screen tile targets its own cell, overhang included');
  assert.deepEqual(out.sels, Array(4).fill('item:' + out.uid),
    'the 4 tiles — overhang included — indeed select the slide');
  assert.deepEqual(out.floor, { x: 8, y: 1 }, 'a floor tile stays itself');
});

test('phase 50 I2: you climb ONTO the slide\'s 2 top tiles (outside the footprint)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    // footprint (3,3)-(4,5); the DRAWN cover occupies (3,2)-(4,2)
    basePlace(st, 'slide', 3, 3, 0);
    const r = {};
    // 1) the two high tiles are the slide's PERCHED tiles
    r.topZone = [!!baseZoneTopAt(st, 3, 2), !!baseZoneTopAt(st, 4, 2)];
    // 2) they are actually reachable from the spawn
    const s1 = baseVisitCreate(st);
    r.toLeft = baseVisitSetDestination(s1, 3, 2) ? 1 : 0;
    while (s1.path.length) baseVisitStepAlong(s1);
    r.posLeft = s1.pos; r.elevLeft = s1.subElev;
    // 3) the top can be crossed from one edge to the other
    r.cross = baseVisitSetDestination(s1, 4, 2) ? 1 : 0;
    while (s1.path.length) baseVisitStepAlong(s1);
    r.posRight = s1.pos;
    // 4) from there, the ramp takes you back to the mat
    r.toRamp = baseVisitSetDestination(s1, 4, 3) ? 1 : 0;
    while (s1.path.length) baseVisitStepAlong(s1);
    r.after = s1.pos;
    r.slides = s1.log.filter((e) => e.fx === 'slide').length;
    // 5) no dead tile anywhere in the drawn shape
    r.blocked = [];
    for (let y = 2; y <= 5; y++) for (let x = 3; x <= 4; x++) {
      if (baseZoneBlockedAt(st, x, y)) r.blocked.push(x + ',' + y);
    }
    // 6) never back up: from the mat (4,5), the ramp (4,4) and the
    //    slide top (4,2) stay unreachable on foot.
    r.upRamp = baseVisitSetDestination(s1, 4, 4);
    r.upTop = baseVisitSetDestination(s1, 3, 2) ? 1 : 0;   // via the stairs
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.topZone, [true, true], 'the 2 top tiles are perched on the slide');
  assert.equal(out.toLeft, 1, 'the top-left tile is REACHABLE');
  assert.deepEqual(out.posLeft, { x: 3, y: 2 }, 'you climb onto it');
  assert.equal(out.elevLeft, 1, 'perched (subElev 1)');
  assert.equal(out.cross, 1, 'you cross the slide top');
  assert.deepEqual(out.posRight, { x: 4, y: 2 }, 'top-right tile reached');
  assert.equal(out.toRamp, 1, 'the slide is approached from the top');
  assert.deepEqual(out.after, { x: 4, y: 5 }, 'the slide lands on the mat');
  assert.equal(out.slides, 1, 'a single slide event');
  assert.deepEqual(out.blocked, [], 'no dead tile');
  // From the mat, you exit through the floor, take the stairs again and
  // go back DOWN the slide: the path passes through the landing (4,3) BEFORE
  // (4,4) — never the reverse. That is the expected one-way flow.
  const path = out.upRamp || [];
  const iLanding = path.findIndex((s2) => s2.x === 4 && s2.y === 3);
  const iRamp = path.findIndex((s2) => s2.x === 4 && s2.y === 4);
  assert.ok(iRamp < 0 || (iLanding >= 0 && iLanding < iRamp),
    'the slide is only taken TOP to bottom');
  // (the top STAYS accessible — via the built-in stairs: that is exactly
  //  what the user asked for; only the slide is one-way)
  assert.ok(out.upTop, 'the slide top stays reachable via the stairs');
});

// ——— J — Z-buffer: depth between objects, NPCs and player ————————————————
test('phase 47 J: depth-sorted rendering (NPC behind/in front of objects)', () => {
  const v2 = R('src/ui/game/base/base-view2d.js');
  // a SINGLE merged pass: objects + NPCs + visitor
  assert.ok(v2.includes('depthOf'), 'depth key');
  assert.ok(v2.includes('draws.sort((a, b) => a.z - b.z)'), 'depth sort');
  assert.ok(v2.includes("kind: 'npc'") && v2.includes("kind: 'visitor'") && v2.includes("kind: 'item'"),
    'objects, NPC and visitor in the same list');
  // the visitor is no longer drawn afterwards in the overlay: the
  // base2dOverlay function no longer paints the player (it only keeps ghost/path/
  // hover/selection) — it is painted in the sorted pass, above.
  const ovStart = v2.indexOf('function base2dOverlay');
  const ov = v2.slice(ovStart, v2.indexOf('\nif (typeof PokeActions', ovStart));
  assert.ok(!ov.includes('base2dPlayerStatic'), 'the visitor is no longer painted over everything');
  assert.ok(/(passe|phase) 47/i.test(v2), 'explicit comment present');
  // an object's depth = its BOTTOM row (the feet), not its origin.
  // Phase 52: a doll/cushion ("surface" layer) takes its CARRIER's feet —
  // otherwise it slid BEHIND a large 3×3 rug (user feedback:
  // "dolls end up behind rugs").
  assert.ok(v2.includes('(it.y + fp.d - 1)'), 'depth = the object feet row');
  assert.ok(v2.includes('carrierFootRow'), 'a doll is painted after its carrier');
});

// ——— K — pass 48 feedback ————————————————————————————————————————————————
test('phase 48 K: tents — you pass ONLY through the middle column', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    const L = baseLayoutGet('cave_5');
    let at = null;
    for (let y = 0; y < L.h && !at; y++) for (let x = 0; x < L.w; x++) {
      if (baseCanPlace(st, 'red_tent', x, y, 0).ok) { at = { x, y }; break; }
    }
    basePlace(st, 'red_tent', at.x, at.y, 0);
    const g = baseBuildGrid(st);
    const rows = [];
    for (let dy = 0; dy < 3; dy++) {
      let r = '';
      for (let dx = 0; dx < 3; dx++) r += baseCellWalkable(st, g, at.x + dx, at.y + dy, null) ? '.' : '#';
      rows.push(r);
    }
    return JSON.stringify({ rows });
  })()`, sb));
  // RSE canon: left/right columns = canvas, center column = the door
  assert.deepEqual(out.rows, ['#.#', '#.#', '#.#'],
    'only the tent\'s middle column is walkable');
});

test('phase 48 K2: a character STANDING on an object is painted AFTER it', () => {
  const v2 = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2.includes('charDepth'), 'dedicated character depth');
  // the depth of a carried character bubbles up to the CARRIER object's feet
  assert.ok(v2.includes('row = Math.max(row, it.y + fp.d - 1)'),
    'personnage sur un objet marchable → profondeur du porteur');
  assert.ok(v2.includes('charDepth(n.x, n.y)'), 'applied to NPCs');
  assert.ok(v2.includes('charDepth(vis.x, vis.y)'), 'applied to the visitor');
});

test('phase 48 K3: Pokémon selector = the REAL PC box (presets AND NPC)', () => {
  const sel = R('src/ui/game/box-selector.js');
  assert.ok(sel.includes("startsWith('preset_slot_')"), 'preset mode in the unified selector');
  assert.ok(sel.includes("startsWith('basenpc_slot_')"), 'NPC mode in the unified selector');
  const pm = R('src/ui/game/preset-manager.js');
  assert.ok(pm.includes("openUnifiedSelectorModal('preset_slot_'"),
    'presets open the PC box');
  const ne = R('src/ui/game/base/base-npc-editor.js');
  assert.ok(ne.includes("openUnifiedSelectorModal('basenpc_slot_'"),
    'NPCs open the PC box');
  assert.ok(ne.includes("PokeActions.register('baseNpcEditorAcceptPick'"), 'selector return wired (engine action registry)');
});

// ——— L — pass 49 feedback ————————————————————————————————————————————————
test('phase 49 L: every catalog object has a sprite (no more 404s)', () => {
  // we EVALUATE the catalog (the file has no reliably regex-able format)
  const sbx = { window: {}, console, document: { createElement: () => ({}), getElementById: () => null } };
  sbx.globalThis = sbx; vm.createContext(sbx);
  // Vague 40 — hybride individuelle : classiques = texte vm direct ; converts
  // ESM = bundle isolé. Le try/catch d'origine est CONSERVÉ (deps UI absentes).
  for (const f of ['src/data/items-data.js', 'src/data/items-helpers.js']) {
    const src = R(f);
    try { vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, sbx, { filename: f }); } catch (_) { /* deps UI absentes */ }
  }
  const keys = Object.keys(sbx.window.ITEMS || sbx.ITEMS || {});
  assert.ok(keys.length > 200, `substantial catalog (${keys.length})`);
  // TMs/HMs (`ct_*`, `cs_*`, `ct01…`) are served by a PER-TYPE floppy disk
  // (tm_<type>.png) — getItemSpriteUrl routes them explicitly, so they
  // have no PNG of their own. Everything ELSE must exist on disk.
  const isTm = (k) => /^(ct|cs)(\d|_)/.test(k);
  const missing = keys.filter((k) => !isTm(k) && !E(`src/assets/images/items/${k}.png`));
  assert.deepEqual(missing, [], 'no item without PNG (getItemSpriteUrl builds the URL)');
  // and the 18 type floppies are indeed there
  for (const ty of ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
    'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon',
    'dark', 'steel', 'fairy']) {
    assert.ok(E(`src/assets/images/items/tm_${ty}.png`), `disquette tm_${ty}`);
  }
  assert.ok(E('tools/fetch-item-sprites.py'), '(re)download tool present');
});

test('phase 49 L2: held-item selector = the BAG, everywhere', () => {
  const tu = R('src/ui/game/team-ui.js');
  assert.ok(tu.includes('function openHeldItemPickerFor'), 'generic selector');
  assert.ok(tu.includes('window._equipCallback'), 'reuses the bag flow');
  assert.ok(R('src/ui/game/preset-manager.js').includes('openHeldItemPickerFor'),
    'presets : objet via le sac');
  assert.ok(R('src/ui/game/base/base-npc-editor.js').includes('openHeldItemPickerFor'),
    'NPC: item via the bag');
});

test('phase 49 L3: preset cards — BOX Pokémon are no longer greyed out', () => {
  const pm = R('src/ui/game/preset-manager.js');
  assert.ok(pm.includes('isFainted: inTeam && found.p.currentHP <= 0'),
    'only active team members can be marked K.O.');
});

test('phase 50 L4: UNIFIED drag & drop (team, presets and NPC)', () => {
  const tu = R('src/ui/game/team-ui.js');
  // a SINGLE mechanism: the team's delegated handler, with a context
  assert.ok(tu.includes('function installMoveDragDrop'), 'handler unique');
  assert.ok(tu.includes('function pwSetMoveDragContext'), 'contexte pluggable');
  assert.ok(tu.includes('_pwDragSwapMoves'), 'move swap via the context');
  assert.ok(tu.includes('_pwDragSwapPokes'), 'Pokémon swap via the context');
  // NPCs reimplement NOTHING: they just declare the context
  const ne = R('src/ui/game/base/base-npc-editor.js');
  assert.ok(ne.includes('pwSetMoveDragContext('), 'NPC: declared context');
  assert.ok(ne.includes('installMoveDragDrop('), 'NPC: single handler installed');
  assert.ok(!ne.includes('moveDragAttr'), 'NPC: no more home-made drag attribute');
  assert.ok(ne.includes('pwClearMoveDragContext'), 'NPC: context released on close');
  // same for presets
  const pm = R('src/ui/game/preset-manager.js');
  assert.ok(pm.includes('pwSetMoveDragContext('), 'presets: declared context');
  assert.ok(pm.includes('installMoveDragDrop('), 'presets: single handler installed');
  assert.ok(pm.includes('presetEditorSwapMove'), 'presets: move swap');
});

test('phase 49 L5: you pass UNDER the tent, you climb ONTO the slide', () => {
  const v2 = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2.includes('WALK_UNDER'), 'items you can walk under');
  assert.ok(v2.includes('CLIMB_ON'), 'objects you climb onto');
  assert.ok(/WALK_UNDER = \{ red_tent: 1, blue_tent: 1 \}/.test(v2), 'tents are crossed underneath');
  // Phase 52: solid_board joins the list — standing on the TOP tile of a
  // 1×2 plank, the character slid BEHIND it (user feedback).
  assert.ok(/CLIMB_ON = \{ slide: 1, stand: 1, stairs: 1, solid_board: 1 \}/.test(v2),
    'slide/stand/stairs/board are climbable');
  // …and the overlap test targets the DRAWN shape (overhang included),
  // otherwise the slide body — where you walk — fell out of the computation.
  assert.ok(v2.includes('const top = it.y - over;'), 'the "over" overhang counts as top');
});

test('phase 49 L6: elevation resolution no longer hinders PLACEMENT', () => {
  const ed = R('src/ui/game/base/base-editor.js');
  assert.ok(ed.includes('const placing ='), 'placement-mode detection');
  assert.ok(ed.includes('if (placing) return { x: base.x, y: base.y };'),
    'when placing, the click targets the actually hovered tile (no more "wall" refusal)');
});

test('phase 49 L7: an NPC moves in ONE click, like furniture', () => {
  const ed = R('src/ui/game/base/base-editor.js');
  const seg = ed.slice(ed.indexOf("if (sel.kind === 'npc')"), ed.indexOf("if (sel.kind === 'npc')") + 900);
  assert.ok(seg.includes('baseNpcPickup'), 'immediate pickup');
  assert.ok(!seg.includes('_baseEd.selNpc === sel.id'), 'no more double click required');
  assert.ok(seg.includes('_baseEd.selNpc = sel.id'), '"Edit" stays accessible');
});

// ——— M — pass 50 feedback ————————————————————————————————————————————————
test('phase 50 M: TM/HM floppies = real PokeChill sprites (no more discs)', () => {
  const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
    'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon',
    'dark', 'steel', 'fairy'];
  for (const ty of TYPES) {
    const p = `src/assets/images/items/tm_${ty}.png`;
    assert.ok(E(p), `floppy ${ty} present`);
    const b = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    // generated placeholders were 40×40; real floppies are 32×32
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.deepEqual([w, h], [32, 32], `${ty}: real PokeChill sprite (32×32), not a 40×40 disc`);
  }
  assert.ok(E('tools/repair-tm-sprites.py'), 'floppy repair tool');
  // Phase 55: placeholder safety REMOVED per user request — no more generated discs
  // Real PokeChill sprites are required, no fallback
  const dl = R('tools/download_assets.py');
  assert.ok(dl.includes('download_item_overrides()'), 'floppy download present');
  // The old code generated a 40×40 disc when the download failed — now removed
  assert.ok(!dl.includes("make_placeholder(out, 'TM'"), 'no more TM disc generation (safety removed)');
  assert.ok(dl.includes('[SANS PLACEHOLDER]'), 'placeholder-free log present');
});

test('phase 50 M2: asset sources are all declared and verifiable', () => {
  assert.ok(E('tools/check-asset-sources.py'), 'source-checking tool');
  const chk = R('tools/check-asset-sources.py');
  for (const src of ['PokeChill', 'PokeAPI', 'Pokéclicker', 'Poképédia', 'pret/pokeemerald']) {
    assert.ok(chk.includes(src), `declared source: ${src}`);
  }
  // the TM floppy is indeed part of the checks (that was the missing one)
  assert.ok(chk.includes('img/items/tmNormal.png'), 'TM floppies check');
});

// ——— N — pass 51 feedback ————————————————————————————————————————————————
test('phase 51 N: Prine Berry, Upgrade and the 18 Z-crystals have a REAL sprite', () => {
  const KEYS = ['prine_berry', 'upgrade',
    'normalium_z', 'firium_z', 'waterium_z', 'grassium_z', 'electrium_z', 'icium_z',
    'fightinium_z', 'poisonium_z', 'groundium_z', 'flyinium_z', 'psychium_z',
    'buginium_z', 'rockium_z', 'ghostium_z', 'dragonium_z', 'darkinium_z',
    'steelium_z', 'fairium_z'];
  const sig = new Map();
  for (const k of KEYS) {
    const p = `src/assets/images/items/${k}.png`;
    assert.ok(E(p), `${k}: sprite present`);
    const b = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    // the baked placeholders were 40×40 (disc + initials)
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.ok(!(w === 40 && h === 40), `${k}: real sprite, not a 40×40 disc`);
    // CONTENT fingerprint (file sizes may coincide)
    sig.set(k, crypto.createHash('md5').update(b).digest('hex'));
  }
  // the 18 Z-crystals must be DISTINCT (before: 18 times the same gem)
  const zs = KEYS.filter((k) => k.endsWith('_z')).map((k) => sig.get(k));
  assert.equal(new Set(zs).size, 18, 'the 18 Z-crystals are all DIFFERENT (before: 18 identical gems)');
  // the PokeAPI aliases are declared in the tool
  const fetcher = R('tools/fetch-item-sprites.py');
  assert.ok(fetcher.includes("'prine_berry': 'lum-berry'"), 'prine_berry alias → lum-berry');
  assert.ok(fetcher.includes("'upgrade': 'up-grade'"), 'Up-Grade alias → up-grade');
  assert.ok(fetcher.includes("-z--held"), 'Z-crystal aliases (--held suffix)');
});

test('phase 51 N2: NPC dialogue (meeting line + choices) and PC panel', () => {
  assert.ok(E('src/ui/game/base/base-dialog.js'), 'module de dialogues');
  const dlg = R('src/ui/game/base/base-dialog.js');
  for (const fn of ['baseDialogNpc', 'baseDialogNpcFight', 'baseDialogPc', 'closeBaseDialog']) {
    assert.ok(dlg.includes(`PokeActions.register('${fn}', ${fn}`), `exposed: ${fn} (engine action registry)`);
  }
  // the greeting line is ALWAYS shown, and the battle is a CHOICE
  assert.ok(dlg.includes('npc.msgs && npc.msgs.pre'), 'meeting line shown');
  assert.ok(dlg.includes('base.dlg.fight') && dlg.includes('base.dlg.decline'),
    'Battle / Walk away buttons');
  // the PC opens a dedicated panel
  assert.ok(dlg.includes('base-pc-panel'), 'PC panel (empty for now)');
  assert.ok(R('src/main.js').includes('./ui/game/base/base-dialog.js'), 'loaded by the loader');
  const win = R('src/ui/game/base/base-window.js');
  assert.ok(win.includes('baseDialogNpc(res)'), 'the visit opens the NPC dialogue');
  assert.ok(win.includes('baseDialogPc(res)'), 'the visit opens the PC panel');
  // complete i18n at parity
  const keys = (p2) => {
    const s2 = R(p2);
    const i = s2.indexOf('"dlg":{');
    return [...s2.slice(i, s2.indexOf('\n},', i)).matchAll(/^"(\w+)":/gm)].map((m) => m[1]).sort();
  };
  assert.deepEqual(keys('src/localization/fr/base.js'), keys('src/localization/en/base.js'),
    'identical FR/EN dlg keys');
});

test('phase 51 N3: CARD drag & drop is the team\'s one, everywhere', () => {
  const tu = R('src/ui/game/team-ui.js');
  // the team installer is extracted and reusable
  assert.ok(tu.includes('function installCardDragAndDrop'), 'shared card installer');
  assert.ok(tu.includes('window.installCardDragAndDrop'), 'exported');
  assert.ok(tu.includes('addTeamDragAndDrop() {\n  installCardDragAndDrop('),
    'the team uses the same installer');
  // the final swap goes through the context (presets / NPC / Atoll)
  assert.ok(tu.includes('_pwMoveDragCtx.swapPokes(sourceIdx, targetIdx)'),
    'teamDrop delegates outside the active team');
  // presets and NPCs no longer have ANY home-grown drag listener
  for (const f of ['src/ui/game/preset-manager.js', 'src/ui/game/base/base-npc-editor.js']) {
    const src = R(f);
    assert.ok(src.includes('installCardDragAndDrop('), `${f}: reuses the installer`);
    assert.ok(!src.includes("addEventListener('dragstart'"), `${f} : plus de drag maison`);
  }
});

// ——— O — pass 52 feedback ————————————————————————————————————————————————
// Five user reports, five distinct root causes:
//  1. "On top of the slide you walk behind when you should be
//     on it" → charDepth() tested the FOOTPRINT, not the drawn shape.
//  2. "The upper part of the plank treats us as behind" →
//     solid_board (1×2, walkable) missing from CLIMB_ON.
//  3. "Dolls end up behind rugs" → a doll took its own
//     row, a 3×3 rug took the feet of its footprint: on the rug's two
//     upper rows, the doll slid under.
//  4. "We must be able to battle it as much as we want" + "opening its
//     panel treats us as if we had already battled it".
//  5. "There should be an end-of-battle panel to see its message."

test('phase 52 O1: Z-buffer — slide, board and dolls', () => {
  const v2 = R('src/ui/game/base/base-view2d.js');
  // 1+2: the overlap test covers the overhang, the plank climbs
  assert.ok(v2.includes('const over = def.over | 0;') && v2.includes('const top = it.y - over;'),
    'charDepth tests the DRAWN shape (overhang included)');
  assert.ok(/CLIMB_ON = \{ slide: 1, stand: 1, stairs: 1, solid_board: 1 \}/.test(v2),
    'the board is climbed like the slide');
  // 3: the doll is anchored to its carrier's feet
  assert.ok(v2.includes('function carrierFootRow') || v2.includes('const carrierFootRow'),
    'helper de rattachement au porteur');
  assert.ok(v2.includes("(def.layer === 'surface')\n      ? carrierFootRow(it.x, it.y)"),
    'a doll takes the depth of its carrier\'s feet');
});

test('phase 52 O2: the NPC is battleable without limit', () => {
  const vis = R('src/ui/game/base/base-visit.js');
  // the lock is lifted: no more early 'npc_talked' return
  assert.ok(!vis.includes("if (sess.talkedToday[npc.id]) return { type: 'npc_talked', npc };"),
    'no more "one battle per visit" lock');
  assert.ok(!/sess\.talkedToday\[npc\.id\] = true;/.test(vis),
    'opening the dialogue no longer consumes the battle');
  // the counter is now set when the duel is ACCEPTED
  const ed = R('src/ui/game/base/base-editor.js');
  assert.ok(ed.includes("_baseEd.visit.talkedToday[npc.id] = (_baseEd.visit.talkedToday[npc.id] | 0) + 1"),
    'the duel is counted only once actually started');
  // approaching an already-battled NPC does reopen the dialogue
  assert.ok(ed.includes('_baseEd.visitPending = { x, y };'),
    'the approach is still recorded (rematch possible)');
});

test('phase 52 O3: end-of-battle panel against an NPC', () => {
  const dlg = R('src/ui/game/base/base-dialog.js');
  assert.ok(dlg.includes('function baseDialogNpcResult'), 'end-of-battle box');
  assert.ok(dlg.includes("PokeActions.register('baseDialogNpcResult'"), 'exported (engine action registry)');
  assert.ok(dlg.includes("_bdT('base.dlg.rematch')"), 'Rematch button');
  // wired to all THREE battle outcomes: victory, blackout, forfeit
  for (const f of ['src/application/combat/battle-switch.js', 'src/application/combat/battle-encounter.js',
    'src/application/combat/battle-flow.js']) {
    const src = R(f);
    assert.ok(src.includes('baseDialogNpcResult('), `${f}: opens the end panel`);
    assert.ok(src.includes('battle.baseNpcRef'), `${f}: keeps the NPC reference`);
  }
  // the NPC is recorded when the duel starts
  assert.ok(R('src/ui/game/base/base-editor.js').includes('battle.baseNpcRef = npc;'),
    'reference set at launch');
  // i18n at parity
  const keys = (p2) => {
    const s2 = R(p2);
    const i = s2.indexOf('"dlg":{');
    return [...s2.slice(i, s2.indexOf('\n},', i)).matchAll(/^"(\w+)":/gm)].map((m) => m[1]).sort();
  };
  const fr = keys('src/localization/fr/base.js');
  assert.deepEqual(fr, keys('src/localization/en/base.js'), 'identical FR/EN dlg keys');
  for (const k of ['rematch', 'res_won', 'res_lost']) assert.ok(fr.includes(k), `key ${k}`);
});

test('phase 52 O4: multi-floor rooms — door joins to canon', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const ids = ['cave_5','cave_6','tree_5','tree_6','bush_5','bush_6',
                 'cave_red_5','cave_red_6','cave_blue_5','cave_blue_6',
                 'cave_yellow_5','cave_yellow_6'];
    const bad = [];
    for (const id of ids) {
      const L = baseLayoutGet(id);
      if (!L) { bad.push([id, 'gabarit absent']); continue; }
      const solid = (x, y) => {
        if (!(y >= 0 && y < L.h && x >= 0 && x < L.w)) return true;
        const t = L.cells[y][x].t;
        return t === 'wall' || t === 'void';
      };
      // inner edges row by row: never more than ONE tile of
      // offset (the only pattern canon autotiling can join)
      let prev = null;
      for (let y = 0; y < L.h; y++) {
        const xs = [];
        for (let x = 0; x < L.w; x++) if (!solid(x, y)) xs.push(x);
        if (!xs.length) { prev = null; continue; }
        const cur = [xs[0], xs[xs.length - 1]];
        if (prev && y !== L.h - 1) {
          if (Math.abs(cur[0] - prev[0]) > 1) bad.push([id, 'left offset y=' + y]);
          if (Math.abs(cur[1] - prev[1]) > 1) bad.push([id, 'right offset y=' + y]);
        }
        prev = cur;
      }
      // the door leads to the spawn, framed by a bottom wall
      const ex = L.exit, sp = L.spawn;
      if (!ex || !sp) { bad.push([id, 'missing door/spawn']); continue; }
      if (ex.x !== sp.x || ex.y !== sp.y + 1) bad.push([id, 'door not above the spawn']);
      if (!solid(ex.x - 1, ex.y) || !solid(ex.x + 1, ex.y)) bad.push([id, 'door not framed']);
      // WIDE spawn row (no strangled shoulder — cave_1 canon)
      let n = 0;
      for (let x = 0; x < L.w; x++) if (!solid(x, sp.y)) n++;
      if (n < 5) bad.push([id, 'strangled spawn row (' + n + ')']);
    }
    return JSON.stringify({ bad });
  })()`, sb));
  assert.deepEqual(out.bad, [], 'no bastard door join');
});

// ——— P — pass 53 feedback ————————————————————————————————————————————————
test('phase 53 P1: you climb onto the slide even against a wall', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    // We sweep ALL legal slide placements across several layouts.
    // Original bug: the cover (overhang) occupies no floor tile; we
    // therefore tested the terrain UNDER it. Backed against the back wall —
    // the most natural placement — this terrain is a wall, and the top
    // became unreachable (40 placements out of 214).
    const bad = []; let tested = 0;
    for (const lid of ['cave_1','cave_2','cave_3','cave_4','cave_5','tree_5']) {
      const L0 = baseLayoutGet(lid); if (!L0) continue;
      for (let y = 0; y < L0.h; y++) for (let x = 0; x < L0.w; x++) {
        const st = baseGetState(); baseDebugCreate(lid); baseDebugGrantAll();
        st.items = st.items.filter((i) => i.s !== 'pc');
        if (!basePlace(st, 'slide', x, y, 0).ok) continue;
        const it = st.items.find((i) => i.s === 'slide');
        const sess = baseVisitCreate(st);
        const seen = new Set(); const q = [{ x: sess.pos.x, y: sess.pos.y, elev: sess.elev }];
        seen.add(q[0].x + ',' + q[0].y);
        while (q.length) { const c = q.shift();
          for (const n of baseVisitNeighbors(sess, c.x, c.y, c.elev)) {
            const k = n.x + ',' + n.y; if (seen.has(k)) continue; seen.add(k); q.push(n); } }
        // only analyze slides whose built-in stairs are reachable
        if (!seen.has(it.x + ',' + (it.y + 1))) continue;
        tested++;
        const carter = it.y - 1;
        const ok = seen.has(it.x + ',' + carter) && seen.has((it.x + 1) + ',' + carter)
          && seen.has(it.x + ',' + it.y);
        if (!ok) bad.push([lid, it.x, it.y]);
      }
    }
    return JSON.stringify({ tested, bad: bad.slice(0, 8), nbBad: bad.length });
  })()`, sb));
  assert.ok(out.tested > 100, `significant sample (${out.tested} placements)`);
  assert.equal(out.nbBad, 0, `slide top always reachable (${JSON.stringify(out.bad)})`);
});

test('phase 53 P2: a perched object\'s top ignores the ground below', () => {
  const core = R('src/application/base/base-core.js');
  const i = core.indexOf('function baseCellWalkable');
  const seg = core.slice(i, i + 1600);
  assert.ok(seg.includes('baseZoneTopAt(st, x, y)'), '"I am on a roof" short-circuit');
  assert.ok(seg.indexOf('baseZoneTopAt') < seg.indexOf("cell.t === 'floor'"),
    'the perch test precedes the terrain one');
  assert.ok(seg.includes('baseZoneBlockedAt'), 'the object\'s dead cells stay blocked');
});

test('phase 53 P3: the upper floor is no longer offset — the cliff is one tile', () => {
  const v2 = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2.includes('const ELEV_PX = 0;'), 'mezzanine aligned with its tiles');
  assert.ok(v2.includes('const PERCH_PX = Math.round(C * 0.45);'), 'perch on furniture kept');
  assert.ok(!/py -= ELEV_PX/.test(v2), 'no more residual mezzanine offset');
  // the editor follows the renderer, otherwise clicks target the wrong tile
  const ed = R('src/ui/game/base/base-editor.js');
  assert.ok(ed.includes('const ELEV_PX = 0;'), 'aligned click resolution');
  // the background's drop shadow no longer spills over one extra tile
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('for yy in range(4):'), 'short cliff shadow (4 px)');
  assert.ok(!bake.includes('for yy in range(13):'), 'no more 13 px shadow');
});

test('phase 53 P4: autotiling — no wall on the fallback tile', () => {
  // The real criterion: a neighborhood missing from the table makes the baker
  // fall back to its solid rock, and the wall "does not loop" on screen.
  const at = JSON.parse(R('tools/emerald-ref/autotile-walls.json'));
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  const bad = [];
  for (const [lid, rows] of Object.entries(grids)) {
    const h = rows.length, w = rows[0].length;
    const ch = (x, y) => ((y >= 0 && y < h && x >= 0 && x < w) ? rows[y][x] : '#');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (rows[y][x] !== '#') continue;
      let mask = 0;
      N8.forEach(([dx, dy], i) => { if (ch(x + dx, y + dy) === '#') mask |= (1 << i); });
      if (at[String(mask)] == null) bad.push(`${lid}(${x},${y})`);
    }
  }
  assert.deepEqual(bad, [], 'all walls have a canon pattern');
  assert.ok(E('tools/extend-autotile-mirror.py'), 'symmetry completion tool');
});

test('phase 53 P5: quests — zero dust, a single berry, synced texts', () => {
  // dedicated sandbox: this file only loads the secret base, not the quests
  const qs = { window: {}, console };
  qs.globalThis = qs; vm.createContext(qs);
  // Vague 40 — hybride individuelle (story-quests/side-quests sont ESM) :
  // leurs globales (STORY_QUESTS, SIDE_QUESTS) arrivent par le shim gardé —
  // le IIFE inline ci-dessous les relit exactement comme avant.
  for (const f of ['src/data/story-quests.js', 'src/data/side-quests-data.js']) {
    const src = R(f);
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, qs, { filename: f });
  }
  const out = JSON.parse(vm.runInContext(`(() => {
    const all = [...STORY_QUESTS, ...Object.values(SIDE_QUESTS)];
    let dust = 0, withBerry = 0, moneyOnly = 0;
    const kinds = {}; const bad = [];
    for (const q of all) {
      const ri = q.rewardItems || {};
      const berries = Object.keys(ri).filter((k) => /_berry$/.test(k));
      if (ri.stardust) dust++;
      if (berries.length > 1) bad.push([q.id, 'plusieurs baies']);
      for (const b of berries) {
        if (ri[b] !== 1) bad.push([q.id, b, ri[b]]);
        kinds[b] = (kinds[b] || 0) + 1;
      }
      if (berries.length) withBerry++; else if (q.rewardMoney) moneyOnly++;
    }
    return JSON.stringify({ total: all.length, dust, withBerry, moneyOnly,
      distinct: Object.keys(kinds).length, bad });
  })()`, qs));
  assert.equal(out.dust, 0, 'no more Stardust as reward');
  assert.deepEqual(out.bad, [], 'a single berry, one copy only');
  assert.ok(out.withBerry > 20 && out.withBerry < out.total * 0.5,
    `some quests only (${out.withBerry}/${out.total})`);
  assert.ok(out.moneyOnly > 20, 'many quests remain money-only');
  assert.ok(out.distinct >= 15, `varied berries (${out.distinct} distinct species)`);
  // the texts announce the ACTUALLY given berry
  assert.ok(!R('src/localization/fr/quests.js').includes('Poussière'), 'FR: no more announced dust');
  assert.ok(!R('src/localization/en/quests.js').includes('Stardust'), 'EN: no more announced dust');
  assert.ok(E('tools/rework-quest-berries.py') && E('tools/sync-quest-reward-text.py'), 'traceable tools');
});

// ——— Q — pass 54 feedback ————————————————————————————————————————————————
test('phase 54 Q1: the door is a HOLE in a flat wall, not a notch', () => {
  // User feedback (screenshot attached): "the tiles around the doors
  // should be flat but they curve downwards".
  // Cause: the entrance was treated as VOID by the autotiling, so the
  // two walls framing it picked a concave corner (0x207/0x205).
  // Measured on the 24 canonical maps: "E = solid" yields the flat wall 0x212
  // in 38 cases out of 38; "E = void", 0 times.
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes("atc(R, xx, yy) in ('#', 'x', 'E')"),
    'the entrance counts as solid for its neighbors\' autotiling');

  // Data check: the door's neighbor mask must
  // yield the flat wall, not a corner.
  const at = JSON.parse(R('tools/emerald-ref/autotile-walls.json'));
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  const bad = [];
  for (const [lid, rows] of Object.entries(grids)) {
    const h = rows.length, w = rows[0].length;
    const solid = (x, y) => {
      if (!(y >= 0 && y < h && x >= 0 && x < w)) return true;
      const c = rows[y][x];
      return c === '#' || c === 'E';
    };
    const ey = h - 1, ex = rows[ey].indexOf('E');
    for (const dx of [-1, 1]) {
      const x = ex + dx;
      if (x < 0 || x >= w || rows[ey][x] !== '#') continue;
      let mask = 0;
      N8.forEach(([ddx, ddy], i) => { if (solid(x + ddx, ey + ddy)) mask |= (1 << i); });
      const mt = at[String(mask)];
      if (mt !== 0x212) bad.push(`${lid} dx=${dx} → ${mt ? '0x' + mt.toString(16) : 'repli'}`);
    }
  }
  assert.deepEqual(bad, [], 'flat walls (0x212) on both sides of each door');
});

test('phase 54 Q2: the tutorial never re-pays its rewards', () => {
  // User feedback: "the tutorial quests give way too many berries,
  // they gave me the max straight away". Cause: the anti-duplicate lock
  // lived in G.tutorial.rewards, recreated empty whenever G.tutorial was missing
  // (state absent from the initial state). The inventory, however, persisted → every
  // session re-paid already-validated steps up to the stack cap (25).
  const tut = R('src/ui/game/tutorial.js');
  assert.ok(tut.includes('function tutorialRewardAlreadyPaid'),
    'lock backed by the inventory, not the flag alone');
  assert.ok(/const give = Math\.max\(0, want - have\)/.test(tut),
    'never pay out more than the planned amount');
  // the root cause is removed: the tutorial state EXISTS from creation
  // (only files that carry the initial state — the dispatcher owns input only)
  for (const f of ['src/engine/runtime/classic-bridge.js', 'src/application/save/save.js']) {
    assert.ok(R(f).includes('tutorial:{ enabled:true'),
      `${f}: the tutorial state is part of the initial state (thus saved)`);
  }

  // simulation: 30 sessions where the tutorial state restarts empty
  const s = {
    console, setTimeout: () => 0, clearTimeout() {}, window: {},
    G: { inventory: {}, money: 0, tutorial: null, badges: ['brock'],
      wildWinsByLoc: { route1: 50 }, team: [] },
    notify() {}, updateHeader() {}, saveGame() {}, renderStoryWindow() {},
    t: (k) => k, tr: (k) => k, navigator: { maxTouchPoints: 0 },
    document: { getElementById: () => null, querySelector: () => null },
  };
  s.window = s; s.globalThis = s; vm.createContext(s);
  // Vague 40 — plus besoin du replace('const ITEMS','var ITEMS') : items-data
  // est ESM, son shim gardé pose globalThis.ITEMS (= fidélité du var d'alors).
  for (const f of ['src/data/items-data.js']) {
    const src = R(f);
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, s, { filename: f });
  }
  // Vague 41 — hybride individuelle : exploration-actions est ESM ; le retrait
  // du corps exploreArea (intention d'origine) est appliqué SUR le source lu,
  // puis le tout est bundlé — le slice historique devient inutile en mode bundle
  // (module isolé), on conserve le replace pour le mode classique (retour arrière).
  {
    const f = 'src/application/world/exploration-actions.js';
    const src = R(f);
    if (harnessIsEsm(src)) {
      // Mode bundle : module isolé réel — le conflit de redéfinition que visait
      // le retrait historique ne peut pas survenir ; exploreArea reste inerte
      // (action UI, jamais invoquée dans cette simulation).
      vm.runInContext(harnessBundleSource(['src/application/world/exploration-actions.js']), s, { filename: f });
    } else {
      vm.runInContext(src.replace(/function exploreArea[\s\S]*?\n}\n/, ''), s);
    }
  }
  // Vague 41 — hybride individuelle (tutorial ESM = bundle isolé, globales via shim).
  {
    const f = 'src/ui/game/tutorial.js';
    const src = R(f);
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, s, { filename: f });
  }
  for (let i = 0; i < 30; i++) vm.runInContext('G.tutorial=null; updateTutorialProgress();', s);
  const inv = s.G.inventory;
  for (const k of Object.keys(inv)) {
    assert.equal(inv[k], 1, `${k}: a single unit despite 30 resets (got ${inv[k]})`);
  }
});


