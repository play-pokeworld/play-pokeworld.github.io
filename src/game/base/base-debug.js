// ============================================================================
// BASE SECRÈTE — Outils debug (bouton provisoire d'acquisition)
// ----------------------------------------------------------------------------
// Tant que Hoenn n'est pas là, le debug est l'UNIQUE source de décorations
// (décision produit) : « 1 ex. de chaque » catalogue + création instantanée.
// ============================================================================

function baseDebugGrantAll() {
  const st = baseGetState();
  if (!st) return 0;
  let n = 0;
  for (const it of BASE_ITEMS) {
    if (it.acq === 'auto') continue; // le tapis de bienvenue est automatique
    baseStockAdd(st, it.s, 1);
    n++;
  }
  if (typeof notify === 'function') notify(tr('base.debug.granted', { n }), 'var(--green)');
  if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
  return n;
}

function baseDebugGrantCategory(cat, n) {
  const st = baseGetState();
  if (!st) return 0;
  let c = 0;
  for (const it of baseItemList(cat)) {
    if (it.acq === 'auto') continue;
    baseStockAdd(st, it.s, n || 1);
    c++;
  }
  return c;
}

// Crée instantanément une base sur le gabarit demandé (debug/test).
function baseDebugCreate(layoutId) {
  const st = baseGetState();
  if (!st) return { ok: false, reason: 'base.err.no_base' };
  return baseCreate(st, layoutId || BASE_DEFAULT_LAYOUT);
}

// Copain debug : instantané des 3 premiers Pokémon de l'équipe (passe 38 —
// permet de tester la visite + le combat borné avant l'éditeur de copains
// de Hoenn). Jamais de référence vivante : baseNpcAdd copie tout.
function baseDebugAddNpc() {
  const st = baseGetState();
  if (!st || typeof G === 'undefined' || !G || !Array.isArray(G.team) || !G.team.length) return { ok: false, reason: 'base.err.npc_team' };
  const name = (typeof t === 'function') ? t('base.debug.npc_name') : 'Copain';
  const res = baseNpcAdd(st, {
    name,
    sprite: 'youngster',
    team: G.team.slice(0, 3).map((p) => ({
      id: p.id, level: p.level,
      moves: (Array.isArray(p.moves) ? p.moves : []).map((m) => m && m.id).filter(Boolean),
      talent: p.talent || null, shiny: !!(p.shiny || p.shinyActive),
    })),
    msgs: { pre: '', win: '', lose: '' },
  });
  if (res.ok && typeof notify === 'function') {
    notify(tr('base.debug.npc_added', { name }), 'var(--green)');
    if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
  }
  return res;
}

window.baseDebugGrantAll = baseDebugGrantAll;
window.baseDebugGrantCategory = baseDebugGrantCategory;
window.baseDebugCreate = baseDebugCreate;
window.baseDebugAddNpc = baseDebugAddNpc;

