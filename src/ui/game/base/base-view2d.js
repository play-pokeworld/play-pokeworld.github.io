// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// SECRET BASE — "Pokemon Emerald" 2D renderer (canvas, GBA sprites)
// ----------------------------------------------------------------------------
// Draw a base (layout + items + NPCs) in GBA-style top view.
// Phase 36: the BACKGROUND is the true Emerald background baked from the GBA
// tilesets (tools/bake-emerald-bgs.py → src/assets/images/secret-base/bg/emerald/
// <layoutId>.png — authentic walls/floor/holes/entrance/platform, 16 px/tile).
// Items use the true Emerald sprites (manifest.render2d.json,
// GBA sprite, else 2D ORAS icon). Procedural fallback kept when a file
// is missing (tests/exports without assets).
// Pure render: no interaction — this is a TEST window.
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseItemFootprint(...args) { const f = __pwV43Link('baseItemFootprint'); return f ? f(...args) : undefined; }
function baseItemGet(...args) { const f = __pwV43Link('baseItemGet'); return f ? f(...args) : undefined; }
function baseLayoutGet(...args) { const f = __pwV43Link('baseLayoutGet'); return f ? f(...args) : undefined; }
function baseNpcSpriteUrl(...args) { const f = __pwV43Link('baseNpcSpriteUrl'); return f ? f(...args) : undefined; }
function baseZoneTopAt(...args) { const f = __pwV43Link('baseZoneTopAt'); return f ? f(...args) : undefined; }

const BASE2D_CELL = 32;           // px per tile (2× the native 16 px GBA)
const _BASE2D_ELEV = 0;            // phase 36: the elevation is IN the background

 // Secret base 2D canvas fallback renderer
const BASE2D_THEMES = {
  cave: { floor: '#8a7d66', floorHi: '#9d9179', wall: '#4d463a', cliff: '#3a342c', hole: '#191713', entrance: '#caa64b' },
  tree: { floor: '#83a35f', floorHi: '#97b875', wall: '#39512f', cliff: '#2d4023', hole: '#141a10', entrance: '#caa64b' },
  bush: { floor: '#5f8f4a', floorHi: '#75a55e', wall: '#2c4527', cliff: '#22371e', hole: '#10160c', entrance: '#caa64b' },
};

let _base2dManifestP = null;
// src/assets/images/secret-base/manifest.render2d.json → { slug: { emerald, icon? } }
// NB: the canvas only consumes the `emerald` key — EMERALD ONLY art direction:
// the 2.5D serebii shop icon is reserved for the stock buttons (base-window.js).
function baseView2dManifest() {
  if (!_base2dManifestP) {
    if (typeof fetch !== 'function') { _base2dManifestP = Promise.resolve({ items: {} }); return _base2dManifestP; }
    // Phase 40: under file:// fetch() is blocked (CORS) — the manifest is
    // also shipped as a script (base-manifest-2d-data.js), read first.
    if (typeof window !== 'undefined' && window.PokeWorldBaseManifest2D) {
      _base2dManifestP = Promise.resolve(window.PokeWorldBaseManifest2D);
      return _base2dManifestP;
    }
    if (typeof fetch !== 'function') {
      _base2dManifestP = Promise.resolve({ items: {} });
      return _base2dManifestP;
    }
    _base2dManifestP = fetch('src/assets/images/secret-base/manifest.render2d.json')
      .then((r) => (r.ok ? r.json() : { items: {} }))
      .catch(() => ({ items: {} }));
  }
  return _base2dManifestP;
}

// Loaded all the images necessaires (cache global by URL).
const _base2dImgCache = new Map();
function baseView2dImage(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  if (_base2dImgCache.has(url)) return _base2dImgCache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  _base2dImgCache.set(url, p);
  return p;
}

// → { slug: HTMLImageElement|null } — Emerald sprite only, never a 2.5D icon
// (phase 37, EMERALD ONLY art direction).
async function baseView2dLoadSprites() {
  const mf = await baseView2dManifest();
  const out = {};
  const jobs = [];
  for (const slug of Object.keys(mf.items || {})) {
    const e = mf.items[slug];
    // Phase 37 (art direction): EMERALD ONLY sprites — the GBA background
    // cannot be mixed with 2.5D serebii shop icons (style clash reported by
    // the user). No serebii fallback here: items without a GBA sprite are
    // drawn as a token.
    jobs.push(baseView2dImage(e.emerald).then((img) => { out[slug] = img; }));
  }
  await Promise.all(jobs);
  return out;
}

// Phase 42: character sheets (hero + NPCs) — 64×128:
// columns = frames [standing, step A, standing, step B], rows = down/up/left/right.
const _base2dPeopleCache = { map: null };
// NPC portrait: trainer-N.png (images/trainers/profil), cached.
const _base2dNpcPortraits = {};
async function base2dNpcPortrait(n) {
  const url = (typeof __pwV43Link('baseNpcSpriteUrl') === 'function')
    ? baseNpcSpriteUrl(n && n.sprite)
    : ('src/assets/images/trainers/profil/' + ((n && n.sprite) || 'trainer-0') + '.png');
  if (_base2dNpcPortraits[url] !== undefined) return _base2dNpcPortraits[url];
  let img = null;
  try { img = await baseView2dImage(url); } catch (_e) { img = null; }
  _base2dNpcPortraits[url] = img;
  return img;
}

async function baseView2dPeople() {
  if (_base2dPeopleCache.map) return _base2dPeopleCache.map;
  const out = {};
  try {
    const mf = await baseView2dManifest();
    const people = (mf && mf.people) || {};
    await Promise.all(Object.keys(people).map((pid) =>
      baseView2dImage(people[pid]).then((img) => { if (img) out[pid] = img; })));
  } catch (_e) { /* token fallback */ }
  _base2dPeopleCache.map = out;
  return out;
}

// Phase 44: known people ids by sprite name; deterministic hash fallback
// for old saves / exotic imports.
const BASE2D_NPC_PEOPLE = ['boy', 'girl', 'sailor', 'scholar'];
function base2dNpcPersonId(n) {
  const s = String((n && n.sprite) || '');
  if (BASE2D_NPC_PEOPLE.indexOf(s) >= 0) return s;
  const f = String((n && n.name) || 'npc');
  let h = 0;
  for (let i = 0; i < f.length; i++) h = (h + f.charCodeAt(i)) & 0xff;
  return BASE2D_NPC_PEOPLE[h % BASE2D_NPC_PEOPLE.length];
}

// Draws one character frame (64×128 sheet, 16×32 frame) anchored to the
// tile bottom and overflowing half a tile upward (32-tall sprite on a
// 32 tile). dir: 'down'|'up'|'left'|'right'; frame: 0 standing, 1/3 step.
const BASE2D_DIR_ROW = { down: 0, up: 1, left: 2, right: 3 };
function base2dPerson(ctx, img, px, py, C, dir, frame) {
  const row = BASE2D_DIR_ROW[dir] || 0;
  const col = frame | 0;
  const k = C / 16;
  ctx.drawImage(img, col * 16, row * 32, 16, 32,
    Math.round(px + (C - 16 * k) / 2), Math.round(py + C - 32 * k), 16 * k, 32 * k);
}

// Phase 43 (user request): the CONTROLLED character is no longer a
// procedural walking sheet but the true static trainer-54 sprite
// (people.player) — drawn whole, tile-bottom anchored, centered, slightly
// taller than a tile like GBA characters (head above the tile).
function base2dPlayerStatic(ctx, img, px, py, C) {
  const h = Math.round(C * 1.3);
  const w = Math.round(img.width * (h / img.height));
  ctx.drawImage(img, Math.round(px + (C - w) / 2), Math.round(py + C - h), w, h);
}

function base2dRect(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

// Simple procedural NPC token (trainer silhouette).
// Phase 41: full mini-sprite (replacing the old blue "dot"), with a scale
// coherent with the furniture (~1 tile).
function base2dNpcToken(ctx, px, py, cell) {
  const cx = px + cell / 2, u = cell / 16; // unit ~2 px
  const ink = '#1c2733', shirt = '#3e668c', shirtHi = '#5d87ad', skin = '#e8c39e', hair = '#33261c';
  const round = (x, y, w, h) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 2 * u); else ctx.rect(x, y, w, h);
    ctx.fill();
  };
  // legs
  ctx.fillStyle = ink; round(cx - 5 * u, py + cell - 6 * u, 4 * u, 5 * u); round(cx + 1 * u, py + cell - 6 * u, 4 * u, 5 * u);
  // body (outlined)
  ctx.fillStyle = ink; round(cx - 6.5 * u, py + cell - 13 * u, 13 * u, 8.5 * u);
  ctx.fillStyle = shirt; round(cx - 5.5 * u, py + cell - 12 * u, 11 * u, 7 * u);
  ctx.fillStyle = shirtHi; round(cx - 5.5 * u, py + cell - 12 * u, 11 * u, 2 * u);
  // head (outlined) + face
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx, py + cell - 15.5 * u, 6 * u, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx, py + cell - 15 * u, 5 * u, 0, Math.PI * 2); ctx.fill();
  // hair/cap
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(cx, py + cell - 17 * u, 4.6 * u, Math.PI, Math.PI * 2); ctx.fill();
  // eyes
  ctx.fillStyle = ink;
  ctx.fillRect(cx - 2.6 * u, py + cell - 15.5 * u, 1.4 * u, 2 * u);
  ctx.fillRect(cx + 1.2 * u, py + cell - 15.5 * u, 1.4 * u, 2 * u);
}

// Baked Emerald background (true GBA tileset) — cached per layout.
const _base2dBgCache = new Map();
function baseView2dBg(layoutId) {
  if (_base2dBgCache.has(layoutId)) return _base2dBgCache.get(layoutId);
  const p = baseView2dImage(`src/assets/images/secret-base/bg/emerald/${layoutId}.png`);
  _base2dBgCache.set(layoutId, p);
  return p;
}

// Full draw. st = engine state (G.base); sprites = result of baseView2dLoadSprites.
// Phase 38: the placement editor ghost and the interactive visit are drawn
// on top by base2dOverlay.
async function baseView2dDraw(canvas, st, sprites, overlay) {
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return false;
  const C = BASE2D_CELL;
  const pal = BASE2D_THEMES[layout.theme] || BASE2D_THEMES.cave;
  canvas.width = layout.w * C + 8;
  canvas.height = layout.h * C + 8;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ox = 4, oy = 4;
  const cy = (x, y) => ({ px: ox + x * C, py: oy + y * C });
  // Phase 53 (user feedback: "there is an offset on the floor, the
  // assets were no longer placed in the right spot; the wall (height) must land
  // exactly on the top tile").
  // Phase 43 — legacy feature update
  // MEZZANINE was raised by 14 px (0.45 × 32) on screen. But the background is
  // BAKED tile by tile, without any offset: the cliff occupies exactly
  // one tile there and the plateau cell (x,y) is painted at y×32, not y×32−14.
  // Furniture and characters therefore floated 14 px above their
  // tile — a half-square gap with the collision grid.
  // The height effect already comes entirely from the background cliff: the
  // offset was a duplicate. We cancel it → the floor is aligned again
  // to the pixel with its tiles.
  const ELEV_PX = 0; // marker: residual mezzanine offset intentionally cancelled (phase 43)
  void ELEV_PX;
  const elevOff = () => 0;
  // On the other hand, STANDING on a FURNITURE (display, slide landing)
  // stays a true perch: it is not part of the background, so it keeps its offset.
  const PERCH_PX = Math.round(C * 0.45);
  const cyElev = (x, y) => ({ px: ox + x * C, py: oy + y * C - elevOff(x, y) });

  // —────────────────────────────────────────────────────────────────────────
  const bg = await baseView2dBg(st.layoutId);
  if (bg) {
    ctx.drawImage(bg, ox, oy, layout.w * C, layout.h * C);
  } else {
    // Procedural fallback (missing assets — minimal tests/exports)
    for (let y = 0; y < layout.h; y++) {
      for (let x = 0; x < layout.w; x++) {
        const cell = layout.cells[y][x];
        const { px, py } = cy(x, y);
        switch (cell.t) {
          case 'wall': base2dRect(ctx, px, py, C, C, pal.wall, '#00000030'); break;
          case 'floor': base2dRect(ctx, px, py, C, C, cell.elev ? pal.floorHi : pal.floor, '#00000022'); break;
          case 'cliff': base2dRect(ctx, px, py, C, C, pal.cliff, '#00000044'); break;
          case 'hole':
            base2dRect(ctx, px, py, C, C, pal.hole, '#00000066');
            ctx.fillStyle = '#ffffff18'; ctx.fillRect(px + 3, py + 3, C - 6, 2);
            break;
          default: break;
        }
        if (cell.entrance) {
          ctx.fillStyle = pal.entrance;
          ctx.beginPath();
          ctx.moveTo(px + C / 2, py + C - 6);
          ctx.lineTo(px + C / 2 - 6, py + C - 14);
          ctx.lineTo(px + C / 2 + 6, py + C - 14);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  // Depth sort (user feedback: "the NPC must pass behind some blocks and
  // you must see the depth effect when it is in front of or behind an
  // item"). Before, NPCs were drawn after all the items: they always ended
  // up on top. We now merge items and characters into a single list sorted
  // by "depth" = LOWEST occupied row on screen: whatever is furthest south
  // is drawn last, hence in front.
  const people = await baseView2dPeople();

  const depthOf = (y, kind) => y * 10 + kind;   // kind: 0 carrier, 1 surface, 2 character

  // Phase 48 (user feedback "I go THROUGH the slide / the stairs instead
  // of climbing on top"): a character STANDING on a walkable item
  // (slide, stairs, display, rug…) must be painted after it, otherwise
  // the item covers them. Their depth is therefore raised to the FOOT of
  // the item that carries them — they end up visually "on top".
  // Phase 49: distinguish CLIMBING ON an item (slide, display, stairs…)
  // from WALKING UNDER an item (tent: you enter the central corridor, the
  // canvas must stay IN FRONT).
  // Phase 52: `solid_board` joins CLIMB_ON. The board is walkable
  // (fx:'board', it covers a hole) hence 1×2: standing on its HIGH tile,
  // the character took the depth of that tile (it.y) while
  // the board is painted at the foot of its footprint (it.y+1) — it
  // therefore ended up on TOP of it ("the upper part of the board sees us
  // as behind instead of on top").
  const CLIMB_ON = { slide: 1, stand: 1, stairs: 1, solid_board: 1 };
  const WALK_UNDER = { red_tent: 1, blue_tent: 1 };
  const charDepth = (x, y) => {
    let row = y;
    for (const it of st.items) {
      if (it.uid === st._moveUid) continue;
      const def = baseItemGet(it.s);
      if (!def || def.layer === 'wall' || !def.walk) continue;
      const fp = baseItemFootprint(def, it.rot);
      // Phase 52: test the DRAWN shape, not just the footprint. An
      // "over" item (slide) is stored at the origin of its LOWER
      // footprint; its overhang rows (the housing, where you actually walk)
      // are ABOVE it.y and thus escaped the test — the character
      // kept the depth of its tile and the slide, painted at the foot of its
      // footprint, covered it ("on top of the slide, you pass
      // behind when you should be on top").
      const over = def.over | 0;
      const top = it.y - over;
      if (x < it.x || x >= it.x + fp.w || y < top || y >= it.y + fp.d) continue;
      // Under a tent: depth UNCHANGED (the canvas, drawn at the foot of
      // the tent, must stay in front of the character).
      if (WALK_UNDER[it.s]) continue;
      if (CLIMB_ON[it.s]) row = Math.max(row, it.y + fp.d - 1); // perched: on top
    }
    return depthOf(row, 2);
  };

  // Phase 52 — DOLLS / CUSHIONS ("surface" layer) placed on a holder.
  // User feedback: "the dolls end up behind the mat when
  // they should be on top". A doll gets z = its row ×10 + 1,
  // a rug z = its FOOT row ×10 + 0. On a 3×3 rug, a doll placed on the top
  // or middle row therefore has a LOWER depth than the rug, which repaints over it.
  // a rug gets z = its FOOT row ×10 + 0. We attach the doll to the FOOT of
  // its holder: it is painted right after it, whichever tile is occupied.
  const carrierFootRow = (x, y) => {
    let row = y;
    for (const it of st.items) {
      if (it.uid === st._moveUid) continue;
      const def = baseItemGet(it.s);
      if (!def || def.layer !== 'floor') continue;
      if (!def.surf && !def.walk) continue;   // only "carrier" items
      const fp = baseItemFootprint(def, it.rot);
      const over = def.over | 0;
      if (x < it.x || x >= it.x + fp.w || y < it.y - over || y >= it.y + fp.d) continue;
      row = Math.max(row, it.y + fp.d - 1);
    }
    return row;
  };
  const draws = [];
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue; // phase 40: held by the mouse (ghost only)
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    // a wall-mounted item is stuck on the face: it stays at the BACK, before everything else.
    if (def.layer === 'wall') { draws.push({ z: -1, it, def, fp, kind: 'wall' }); continue; }
    // Depth = last row of the FOOTPRINT (the foot of the item);
    // for a doll/cushion ("surface" layer), the foot of its HOLDER
    // counts instead (phase 52).
    const foot = (def.layer === 'surface')
      ? carrierFootRow(it.x, it.y)
      : (it.y + fp.d - 1);
    draws.push({ z: depthOf(foot, def.layer === 'surface' ? 1 : 0), it, def, fp, kind: 'item' });
  }
  for (const n of st.npcs) {
    if (n.x == null) continue;
    draws.push({ z: charDepth(n.x, n.y), npc: n, kind: 'npc' });
  }
  // The visitor joins the same depth sort: BEHIND whatever is further
  // south and in front of whatever is further north.
  const vis = overlay && overlay.visitor;
  if (vis) draws.push({ z: charDepth(vis.x, vis.y), kind: 'visitor', vis });
  draws.sort((a, b) => a.z - b.z);

  for (const d of draws) {
    if (d.kind === 'visitor') {
      const { px, py } = cyElev(d.vis.x, d.vis.y);
      const vpy = py - (d.vis.subElev ? PERCH_PX : 0);
      const img = people && people.player;
      if (img) base2dPlayerStatic(ctx, img, px, vpy, C);
      else base2dVisitorToken(ctx, px, vpy, C);
      continue;
    }
    if (d.kind === 'npc') {
      const n = d.npc;
      const { px, py: perchBase } = cyElev(n.x, n.y);
      const py = (typeof __pwV43Link('baseZoneTopAt') === 'function' && baseZoneTopAt(st, n.x, n.y)) ? perchBase - PERCH_PX : perchBase;
      // Phase 47: NPCs use the TRUE trainer portraits
      // (images/trainers/profil), like the player — no more procedural
      // sheets. Same render as the visitor: static, floor-anchored.
      const img = await base2dNpcPortrait(n);
      if (img) base2dPlayerStatic(ctx, img, px, py, C);
      else base2dNpcToken(ctx, px, py, C);
      continue;
    }
    const { it, def, fp } = d;
    const img = sprites && sprites[it.s];
    if (d.kind === 'wall') {
      const { px, py } = cy(it.x, it.y);
      // Phase 42: wall item = stuck on the FACE (north wall or cliff), native
      // GBA scale (1 tile 16 px = C px), centered on the footprint (2×1 ok).
      if (img) {
        const k = C / 16;
        const dw = img.width * k, dh = img.height * k;
        ctx.drawImage(img, Math.round(px + (fp.w * C - dw) / 2), Math.round(py + (C - dh) / 2), dw, dh);
      } else base2dRect(ctx, px + 6, py - 2, C - 12, C - 6, '#7a5230', '#3f2a14');
      continue;
    }
    const { px, py } = cyElev(it.x, it.y); // mezzanine: vertical offset
    const h = fp.d * C;
    if (img) {
      // Phase 41: real bitmap rotation + tall visual (1-tile overflow max)
      base2dDrawSprite(ctx, img, px, py, def, fp, C, it.rot | 0);
    } else {
      // Phase 35: minimal token fallback (no name lookup here —
      // a missing baseItemNameKey reference broke the whole 2D render!)
      base2dRect(ctx, px + 4, py + h - (C - 8) - 4, C - 8, C - 8, '#8a5fbf', '#52357d');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(((it.s && it.s[0]) || '?').toUpperCase(), px + C / 2, py + h - 9);
    }
  }

  // Phase 38: interactive overlay drawn last (ghost, hover, selection, path).
  if (overlay) base2dOverlay(ctx, cyElev, C, overlay, sprites, people);
  return true;
}

// Phase 41 — real bitmap rotation, reflowed footprint; and a
// TALL visual possible: canon gives two high tiles to some items
// (plants, trophies, machine, doors…) with collision on the LOWER tile
// only → the sprite OVERFLOWS one tile upward when it is taller
// than the footprint (collision unchanged).
function base2dSpriteBox(def, fp, img, C) {
  const w = fp.w * C, h = fp.d * C;
  let maxH = h;
  // Canonical: some items take 2 HIGH tiles but only block the base
  // tile (plants/shields BEHIND, big 1×2 dolls) → visual overflow.
  // Fix: all items >1 tile (w>1 or d>1) must be able to overflow 1 tile upward to take their true size
  if (def.behind) maxH = h + Math.max(1, ((def.d || 1))) * C;
  else if (def.over) maxH = h + def.over * C;
  else if ((def.w && def.w > 1) || (def.d && def.d > 1)) maxH = h + C;
  else if (def.layer === 'surface' && ((def.d || 1) > 1)) maxH = h + ((def.d || 1) - 1) * C;
  return { w, h, maxH };
}

// Phase 42 — GBA-faithful sprite blit (native pixels, as requested by the
// user). Native GBA scale: 1 tile 16 px = exactly C px
// on screen (×2), so nothing is ever stretched or shrunk; bottom anchoring at
// the bottom of the footprint and horizontal centering — a big doll (32×32)
// naturally overflows by half on the left/right, and a "behind" item
// overflows upward behind the player. "rotIdx" ignored (caller compat).
// Phase 43: floor contact shadow — the items "simulate a real
// height" (user request): a dark ellipse at the foot of the furniture
// placed on the FLOOR grounds it in the scenery. No rug/boards (flat), no
// dolls/cushions (often carried by a desk), no stairs (shadow
// already baked in its sprite).
const BASE2D_SHADOW_CATS = { objects: 1, desks: 1, chairs: 1, plants: 1 };
const BASE2D_SHADOW_SKIP = { solid_board: 1, stairs: 1 };
function base2dHasContactShadow(def) {
  return !!(def && def.layer !== 'wall' && BASE2D_SHADOW_CATS[def.cat] && !BASE2D_SHADOW_SKIP[def.s]);
}
function base2dContactShadow(ctx, x, y, w, h, C) {
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - Math.max(2, C * 0.10), Math.min(w * 0.46, C * 0.9), Math.max(2.5, C * 0.13), 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20,12,6,.30)';
  ctx.fill();
}

function base2dDrawSprite(ctx, img, x, y, def, fp, C, _rotIdx) {
  const { w, h } = base2dSpriteBox(def, fp, img, C);
  if (base2dHasContactShadow(def)) base2dContactShadow(ctx, x, y, w, h, C);
  const k = C / 16;
  const dw = img.width * k;
  const dh = img.height * k;
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;
  ctx.drawImage(img, Math.round(dx), Math.round(dy), dw, dh);
}

// VISITOR token (red cap — distinct from the buddies' blue).
function base2dVisitorToken(ctx, px, py, cell) {
  ctx.fillStyle = '#b71c1c';
  ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2 - 4, cell / 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2 - 3, cell / 6.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(px + cell / 2 - cell / 4, py + cell / 2 + 2, cell / 2, cell / 3.4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + cell / 2 - 2, py + 3, 4, 3); // cap logo
}

// Draws the interactive overlay: placement ghost (green/red), hovered
// tile, selected furniture, visitor path, visitor token.
// Phase 42: characters are animated GBA frames (dir + walk phase), with a
// cap token as fallback.
function base2dOverlay(ctx, cy, C, overlay, sprites, _people) {
  // Placement ghost — under the rest so it does not hide the selection
  const gh = overlay.ghost;
  if (gh) {
    const { px, py } = cy(gh.x, gh.y);
    const w = gh.w * C, h = gh.d * C;
    ctx.fillStyle = gh.ok ? 'rgba(105,220,120,.30)' : 'rgba(244,67,54,.32)';
    ctx.fillRect(px, py, w, h);
    ctx.strokeStyle = gh.ok ? '#69dc78' : '#f44336';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);
    const img = gh.slug && sprites ? sprites[gh.slug] : null;
    if (img) {
      // ghost = same render as the placed item (rotation + height), faded
      const gd = (typeof __pwV43Link('baseItemGet') === 'function') ? baseItemGet(gh.slug) : null;
      ctx.globalAlpha = 0.62;
      if (gd) base2dDrawSprite(ctx, img, px, py, gd, { w: gh.w, d: gh.d }, C, gh.rot | 0);
      else {
        const k = C / 16;
        const dw = img.width * k, dh = img.height * k;
        ctx.drawImage(img, px + (w - dw) / 2, py + h - dh, dw, dh);
      }
      ctx.globalAlpha = 1;
    }
  }
  // Visitor path (pale yellow dots, like tap-to-move)
  if (overlay.path && overlay.path.length) {
    ctx.fillStyle = 'rgba(255,238,140,.9)';
    for (const st2 of overlay.path) {
      const { px, py } = cy(st2.x, st2.y);
      ctx.beginPath();
      ctx.arc(px + C / 2, py + C / 2 + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Phase 47: the visitor is drawn in the main pass and joins the depth
  // sorting with the items and NPCs (base2dDrawSprite), otherwise
  // it would always end up on top of the furniture placed in front of it.
  // Hovered tile (edit mode, nothing in hand): thin white outline
  if (overlay.hover) {
    const { px, py } = cy(overlay.hover.x, overlay.hover.y);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, C - 1, C - 1);
  }
  // Selected furniture / buddy: solid yellow frame
  if (overlay.select) {
    const { px, py } = cy(overlay.select.x, overlay.select.y);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, overlay.select.w * C - 2, overlay.select.d * C - 2);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(px - 1, py - 1, 5, 5);
  }
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseView2dLoadSprites', baseView2dLoadSprites); } else if (typeof globalThis !== 'undefined') { globalThis.baseView2dLoadSprites = baseView2dLoadSprites; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseView2dDraw', baseView2dDraw); } else if (typeof globalThis !== 'undefined') { globalThis.baseView2dDraw = baseView2dDraw; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseView2dBg', baseView2dBg); } else if (typeof globalThis !== 'undefined') { globalThis.baseView2dBg = baseView2dBg; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dOverlay', base2dOverlay); } else if (typeof globalThis !== 'undefined') { globalThis.base2dOverlay = base2dOverlay; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseView2dPeople', baseView2dPeople); } else if (typeof globalThis !== 'undefined') { globalThis.baseView2dPeople = baseView2dPeople; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dPerson', base2dPerson); } else if (typeof globalThis !== 'undefined') { globalThis.base2dPerson = base2dPerson; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dPlayerStatic', base2dPlayerStatic); } else if (typeof globalThis !== 'undefined') { globalThis.base2dPlayerStatic = base2dPlayerStatic; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dNpcPersonId', base2dNpcPersonId); } else if (typeof globalThis !== 'undefined') { globalThis.base2dNpcPersonId = base2dNpcPersonId; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dNpcPortrait', base2dNpcPortrait); } else if (typeof globalThis !== 'undefined') { globalThis.base2dNpcPortrait = base2dNpcPortrait; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dSpriteBox', base2dSpriteBox); } else if (typeof globalThis !== 'undefined') { globalThis.base2dSpriteBox = base2dSpriteBox; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dDrawSprite', base2dDrawSprite); } else if (typeof globalThis !== 'undefined') { globalThis.base2dDrawSprite = base2dDrawSprite; }


// --- Exported globals ---
if (typeof base2dContactShadow !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dContactShadow', base2dContactShadow); } else if (typeof globalThis !== 'undefined') { globalThis.base2dContactShadow = base2dContactShadow; } }
if (typeof base2dHasContactShadow !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dHasContactShadow', base2dHasContactShadow); } else if (typeof globalThis !== 'undefined') { globalThis.base2dHasContactShadow = base2dHasContactShadow; } }
if (typeof base2dNpcToken !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dNpcToken', base2dNpcToken); } else if (typeof globalThis !== 'undefined') { globalThis.base2dNpcToken = base2dNpcToken; } }
if (typeof base2dRect !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dRect', base2dRect); } else if (typeof globalThis !== 'undefined') { globalThis.base2dRect = base2dRect; } }
if (typeof base2dVisitorToken !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('base2dVisitorToken', base2dVisitorToken); } else if (typeof globalThis !== 'undefined') { globalThis.base2dVisitorToken = base2dVisitorToken; } }
if (typeof baseView2dImage !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseView2dImage', baseView2dImage); } else if (typeof globalThis !== 'undefined') { globalThis.baseView2dImage = baseView2dImage; } }
if (typeof baseView2dManifest !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseView2dManifest', baseView2dManifest); } else if (typeof globalThis !== 'undefined') { globalThis.baseView2dManifest = baseView2dManifest; } }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseView2dLoadSprites,
  baseView2dDraw,
  baseView2dBg,
  base2dOverlay,
  baseView2dPeople,
  base2dPerson,
  base2dPlayerStatic,
  base2dNpcPersonId,
  base2dNpcPortrait,
  base2dSpriteBox,
  base2dDrawSprite,
  base2dContactShadow,
  base2dHasContactShadow,
  base2dNpcToken,
  base2dRect,
  base2dVisitorToken,
  baseView2dImage,
  baseView2dManifest,
};

