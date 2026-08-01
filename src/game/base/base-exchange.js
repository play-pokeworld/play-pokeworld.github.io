// ============================================================================
// BASE SECRÈTE — Échange export/import (JSON versionné)
// ----------------------------------------------------------------------------
// Export = instantané autonome de la base (objets posés, PNJ, spawn, record).
// Import = VISITE UNIQUEMENT : validation stricte, jamais rien n'est crédité
// au joueur (anti-duplication par construction — le fichier ne touche pas G).
// ============================================================================

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
  // ID unique lié au compte joueur (saveMeta.id) + timestamp + random — évite de visiter sa propre base et garantit l'unicité même si on exporte plusieurs fois la même save
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

// Texte JSON prêt à télécharger / copier.
function baseExportString(st, ownerName) {
  if (!st || !st.layoutId) return null;
  return JSON.stringify(baseExportBuild(st, ownerName), null, 1);
}

// Côté navigateur : déclenche le téléchargement du fichier.
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

// Validation stricte d'un JSON d'ami → {ok, visit} (état reconstruit et
// re-validé intégralement par le moteur de pose) ou {ok:false, reason}.
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

  // Reconstruction dans un état NEUF + re-validation de CHAQUE pose par le
  // moteur (les objets inconnus/mal placés sont simplement écartés).
  const st = baseCreateDefault();
  st.layoutId = data.layoutId;
  let dropped42 = 0;
  for (const it of data.items) {
    // passe 42 : migration canon (renommages mappés, ORAS-only écartés)
    const ms = it && typeof it.s === 'string' && typeof baseItemMigrate === 'function'
      ? baseItemMigrate(it.s) : (it && baseItemGet(it.s) ? it.s : null);
    if (!ms) { if (it) dropped42++; continue; }
    const chk = baseCanPlace(st, ms, it.x | 0, it.y | 0, 0, { free: true });
    if (chk.ok) st.items.push({ uid: st.uidSeq++, s: ms, x: chk.x, y: chk.y, rot: 0 });
    else dropped42++;
  }
  if (dropped42) st.importDropped = dropped42; // info (non bloquant) : la visite n'hérite que du canon
  // PNJ : équipes bornées, textes nettoyés, placement re-vérifié.
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
        free = !!(occIt && baseItemGet(occIt.s).walk); // PNJ admis sur tapis
      }
    }
    if (free) { npc.x = x; npc.y = y; st.npcs.push(npc); }
    else st.npcStock.push(npc);
  }
  // passe 43 : le champ spawn d'un import est ignoré — le joueur apparaît
  // TOUJOURS devant la porte (marqueur 'S' du gabarit).
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

// Côté navigateur : ouvre un sélecteur de fichier .json et appelle cb(res).
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

window.baseExportBuild = baseExportBuild;
window.baseExportString = baseExportString;
window.baseExportDownload = baseExportDownload;
window.baseImportValidate = baseImportValidate;
window.baseVisitFromJson = baseVisitFromJson;
window.baseImportPickFile = baseImportPickFile;

