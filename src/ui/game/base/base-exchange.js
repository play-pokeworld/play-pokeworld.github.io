// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// BASE SECRETE — swap export/import (JSON versionne)
// ----------------------------------------------------------------------------
// Export = self-contained snapshot of the base (placed items, NPCs, spawn, record).
// Import = VISIT only: strict validation, nothing is ever credited
// to the player (anti-duplication by construction — the file never touches G).
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseBuildGrid(...args) { const f = __pwV43Link('baseBuildGrid'); return f ? f(...args) : undefined; }
function baseCanPlace(...args) { const f = __pwV43Link('baseCanPlace'); return f ? f(...args) : undefined; }
function baseCellAt(...args) { const f = __pwV43Link('baseCellAt'); return f ? f(...args) : undefined; }
function baseCreateDefault(...args) { const f = __pwV43Link('baseCreateDefault'); return f ? f(...args) : undefined; }
function baseItemGet(...args) { const f = __pwV43Link('baseItemGet'); return f ? f(...args) : undefined; }
function baseItemMigrate(...args) { const f = __pwV43Link('baseItemMigrate'); return f ? f(...args) : undefined; }
function baseLayoutGet(...args) { const f = __pwV43Link('baseLayoutGet'); return f ? f(...args) : undefined; }
function basePlacedFind(...args) { const f = __pwV43Link('basePlacedFind'); return f ? f(...args) : undefined; }
function baseVisitCreate(...args) { const f = __pwV43Link('baseVisitCreate'); return f ? f(...args) : undefined; }

const BASE_EXPORT_KIND = 'pw-secret-base';
const BASE_EXPORT_VERSION = 1;
const BASE_EXPORT_MAX_BYTES = 96 * 1024;

function baseExportBuild(st, ownerName) {
  const items = st.items
    .filter((it) => baseItemGet(it.s))
    .map((it) => ({ s: it.s, x: it.x, y: it.y, rot: it.rot }));
  const npcs = st.npcs.map((n) => ({
    name: n.name, sprite: n.sprite, team: n.team.map((p) => ({ ...p })),
    msgs: { ...n.msgs }, x: n.x, y: n.y,
  }));
  // Unique ID tied to the player account (saveMeta.id) + timestamp + random —
  // prevents visiting one's own base and guarantees uniqueness even when the
  // same save is exported several times.
  let ownerId = null;
  try { ownerId = (typeof G !== 'undefined' && G && G.saveMeta && G.saveMeta.id) ? String(G.saveMeta.id) : null; } catch(_){}
  const baseUid = (ownerId || 'guest') + '_' + (st.layoutId || 'unknown') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
  return {
    kind: BASE_EXPORT_KIND,
    v: BASE_EXPORT_VERSION,
    id: baseUid,
    ownerId: ownerId,
    name: String(ownerName || 'Dresseur').slice(0, 18),
    exportedAt: new Date().toISOString(),
    layoutId: st.layoutId,
    spawn: st.spawn ? { x: st.spawn.x, y: st.spawn.y } : null,
    items,
    npcs,
    record: { w: st.record.w | 0, l: st.record.l | 0, visits: st.record.visits | 0 },
  };
}

 // Secret base export/import JSON formatting
function baseExportString(st, ownerName) {
  if (!st || !st.layoutId) return null;
  return JSON.stringify(baseExportBuild(st, ownerName), null, 1);
}

// Cote navigateur : declenche the telechargement of the fichier.
function baseExportDownload(st, ownerName) {
  const txt = baseExportString(st, ownerName);
  if (!txt) { if (typeof notify === 'function') notify(t('base.err.no_base'), 'var(--red)'); return false; }
  try {
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base-secrete-${String(ownerName || 'moi').toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'moi'}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    if (typeof notify === 'function') notify(t('base.export_done'), 'var(--green)');
    return true;
  } catch (e) { console.error('[BASE EXPORT]', e); if (typeof notify === 'function') notify(t('base.err.export'), 'var(--red)'); return false; }
}

function baseCleanText(v, max) { return String(v == null ? '' : v).replace(/[<>`"\\]/g, '').slice(0, max || 80); }

// Validation stricte of has JSON of ami → {ok, visit} (state reconstruit and
// re-validated in full by the placed-item engine) or {ok:false, reason}.
function baseImportValidate(txt) {
  if (typeof txt !== 'string' || !txt.length) return { ok: false, reason: 'base.err.import_empty' };
  if (txt.length > BASE_EXPORT_MAX_BYTES) return { ok: false, reason: 'base.err.import_too_big' };
  let data;
  try { data = JSON.parse(txt); } catch { return { ok: false, reason: 'base.err.import_json' }; }
  if (!data || data.kind !== BASE_EXPORT_KIND) return { ok: false, reason: 'base.err.import_kind' };
  if (data.v !== BASE_EXPORT_VERSION) return { ok: false, reason: 'base.err.import_version' };
  if (!baseLayoutGet(data.layoutId)) return { ok: false, reason: 'base.err.import_layout' };
  if (!Array.isArray(data.items) || data.items.length > BASE_ITEM_MAX_PLACED + 1) return { ok: false, reason: 'base.err.import_items' };
  if (!Array.isArray(data.npcs) || data.npcs.length > 8) return { ok: false, reason: 'base.err.import_npcs' };

  // Reconstruction in has state NEUF + re-validation of each placed by the
   // Secret base export/import JSON formatting
  const st = baseCreateDefault();
  st.layoutId = data.layoutId;
  let dropped42 = 0;
  for (const it of data.items) {
     // Secret base export/import JSON formatting
    const ms = it && typeof it.s === 'string' && typeof __pwV43Link('baseItemMigrate') === 'function'
      ? baseItemMigrate(it.s) : (it && baseItemGet(it.s) ? it.s : null);
    if (!ms) { if (it) dropped42++; continue; }
    const chk = baseCanPlace(st, ms, it.x | 0, it.y | 0, 0, { free: true });
    if (chk.ok) st.items.push({ uid: st.uidSeq++, s: ms, x: chk.x, y: chk.y, rot: 0 });
    else dropped42++;
  }
  if (dropped42) st.importDropped = dropped42; // info (non-blocking): the visitor only inherits canonical items
  // NPCs: bounded teams, cleaned texts, placement re-verified.
  for (const n of data.npcs) {
    if (!n || !Array.isArray(n.team) || !n.team.length || n.team.length > 6) continue;
    const team = n.team.slice(0, 6).map((p) => ({
      id: Math.min(1025, Math.max(1, Number(p && p.id) || 1)),
      level: Math.min(100, Math.max(1, Number(p && p.level) || 5)),
      moves: (Array.isArray(p && p.moves) ? p.moves : []).slice(0, 4).map((m) => String(m).slice(0, 32)),
      talent: typeof (p && p.talent) === 'string' ? p.talent.slice(0, 32) : null,
      shiny: !!(p && p.shiny),
    }));
    const npc = {
      id: 'imp_' + Math.random().toString(36).slice(2, 10),
      name: baseCleanText(n.name, 18) || 'Copain',
      sprite: baseCleanText(n.sprite, 24) || 'youngster',
      team,
      msgs: { pre: baseCleanText(n.msgs && n.msgs.pre, 80), win: baseCleanText(n.msgs && n.msgs.win, 80), lose: baseCleanText(n.msgs && n.msgs.lose, 80) },
      x: null, y: null,
    };
    const grid = baseBuildGrid(st);
    const x = n.x | 0, y = n.y | 0;
    const cell = baseCellAt(grid, x, y);
    let free = false;
    if (cell && cell.t === 'floor') {
      const cur = grid.occ[y][x];
      if (cur == null) free = true;
      else if (typeof cur === 'number') {
        const occIt = basePlacedFind(st, cur);
        free = !!(occIt && baseItemGet(occIt.s).walk); // PNJ admis on rug
      }
    }
    if (free) { npc.x = x; npc.y = y; st.npcs.push(npc); }
    else st.npcStock.push(npc);
  }
  // Phase 43: the spawn field of an import is ignored — the player always
  // appears in front of the door (layout 'S' marker).
  const meta = {
    id: data.id ? String(data.id).slice(0, 64) : null,
    ownerId: data.ownerId ? String(data.ownerId).slice(0, 64) : null,
    name: baseCleanText(data.name, 18) || 'Dresseur',
    record: {
      w: Math.min(99999, Math.max(0, data.record && data.record.w | 0)),
      l: Math.min(99999, Math.max(0, data.record && data.record.l | 0)),
      visits: Math.min(999999, Math.max(0, data.record && data.record.visits | 0)),
    },
  };
  return { ok: true, visit: st, meta };
}

function baseVisitFromJson(txt) {
  const chk = baseImportValidate(txt);
  if (!chk.ok) return chk;
  const sess = baseVisitCreate(chk.visit);
  if (!sess) return { ok: false, reason: 'base.err.import_layout' };
  return { ok: true, sess, meta: chk.meta };
}

// Browser side: opens a .json file selector and calls cb(res).
function baseImportPickFile(cb) {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) { cb({ ok: false, reason: 'base.err.import_empty' }); return; }
      const rd = new FileReader();
      rd.onload = () => cb(baseVisitFromJson(String(rd.result || '')));
      rd.onerror = () => cb({ ok: false, reason: 'base.err.import_json' });
      rd.readAsText(f);
    });
    input.click();
    return true;
  } catch (e) { console.error('[BASE IMPORT]', e); return false; }
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseExportBuild', baseExportBuild); } else if (typeof globalThis !== 'undefined') { globalThis.baseExportBuild = baseExportBuild; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseExportString', baseExportString); } else if (typeof globalThis !== 'undefined') { globalThis.baseExportString = baseExportString; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseExportDownload', baseExportDownload); } else if (typeof globalThis !== 'undefined') { globalThis.baseExportDownload = baseExportDownload; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseImportValidate', baseImportValidate); } else if (typeof globalThis !== 'undefined') { globalThis.baseImportValidate = baseImportValidate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitFromJson', baseVisitFromJson); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitFromJson = baseVisitFromJson; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseImportPickFile', baseImportPickFile); } else if (typeof globalThis !== 'undefined') { globalThis.baseImportPickFile = baseImportPickFile; }


// --- Exported globals ---
if (typeof baseCleanText !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCleanText', baseCleanText); } else if (typeof globalThis !== 'undefined') { globalThis.baseCleanText = baseCleanText; } }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseExportBuild,
  baseExportString,
  baseExportDownload,
  baseImportValidate,
  baseVisitFromJson,
  baseImportPickFile,
  baseCleanText,
};
