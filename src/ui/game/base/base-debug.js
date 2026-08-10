// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// SECRET BASE — Debug tools (temporary acquisition button)
// ----------------------------------------------------------------------------
// Until Hoenn is fully built, the debug is the UNIQUE source of decorations
// (product decision): "1 of each" catalogue + instant creation.
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseCreate(...args) { const f = __pwV43Link('baseCreate'); return f ? f(...args) : undefined; }
function baseGetState(...args) { const f = __pwV43Link('baseGetState'); return f ? f(...args) : undefined; }
function baseItemList(...args) { const f = __pwV43Link('baseItemList'); return f ? f(...args) : undefined; }
function baseNpcAdd(...args) { const f = __pwV43Link('baseNpcAdd'); return f ? f(...args) : undefined; }
function baseStockAdd(...args) { const f = __pwV43Link('baseStockAdd'); return f ? f(...args) : undefined; }
function baseWindowInvalidate(...args) { const f = __pwV43Link('baseWindowInvalidate'); return f ? f(...args) : undefined; }

function baseDebugGrantAll() {
  const st = baseGetState();
  if (!st) return 0;
  let n = 0;
  for (const it of BASE_ITEMS) {
    if (it.acq === 'auto') continue; // the welcome mat is automatic
    baseStockAdd(st, it.s, 1);
    n++;
  }
  if (typeof notify === 'function') notify(tr('base.debug.granted', { n }), 'var(--green)');
  if (typeof __pwV43Link('baseWindowInvalidate') === 'function') baseWindowInvalidate();
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

// Instantly creates a base on the requested layout (debug/test).
function baseDebugCreate(layoutId) {
  const st = baseGetState();
  if (!st) return { ok: false, reason: 'base.err.no_base' };
  return baseCreate(st, layoutId || _BASE_DEFAULT_LAYOUT);
}

// Phase 38: add a debug buddy (copied roster) so visits + bounded battles
// can be tested before the Hoenn buddy editor ships.
// No live references: baseNpcAdd copies everything.
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
    if (typeof __pwV43Link('baseWindowInvalidate') === 'function') baseWindowInvalidate();
  }
  return res;
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDebugGrantAll', baseDebugGrantAll); } else if (typeof globalThis !== 'undefined') { globalThis.baseDebugGrantAll = baseDebugGrantAll; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDebugGrantCategory', baseDebugGrantCategory); } else if (typeof globalThis !== 'undefined') { globalThis.baseDebugGrantCategory = baseDebugGrantCategory; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDebugCreate', baseDebugCreate); } else if (typeof globalThis !== 'undefined') { globalThis.baseDebugCreate = baseDebugCreate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDebugAddNpc', baseDebugAddNpc); } else if (typeof globalThis !== 'undefined') { globalThis.baseDebugAddNpc = baseDebugAddNpc; }


// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseDebugGrantAll,
  baseDebugGrantCategory,
  baseDebugCreate,
  baseDebugAddNpc,
};
