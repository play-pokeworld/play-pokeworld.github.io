// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
/**
 * Map help ("?" button) — classic adapter (model builders ONLY, rebuilt
 * from zero)
 *
 * The modal CONTENT comes from the ECS design system
 * (ui/views/MapOverlaysView.js); this adapter owns the shell element
 * (#map-help-modal), the .open toggling and the header button creation.
 * Click-outside closes (user rule).
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function ensureMapHelpButton(){
 if(document.getElementById('map-help-btn')) return;
 const header = document.querySelector('#win-map .win-header, #win-map .pw-win-hdr');
 if(!header) return;
 const btn = document.createElement('button');
 btn.id = 'map-help-btn';
 btn.className = 'pw-win-tool-btn';
 btn.textContent = '?';
 btn.title = t('map_help_title_attr');
 btn.dataset.action = 'toggle-map-help';
 header.appendChild(btn);
}

/**
 * Help-modal model — legend rows of the map node colours (labels
 * localized HERE, in the classic adapter).
 *
 * Wave 15 (user feedback): locale values carry "<b>Colour</b> — text".
 * The DS view must render REAL bold, so the adapter SPLITS each row into
 * { title, desc } — the component never receives raw markup to escape.
 */
function _mapHelpRowPair(key){
 const str = (typeof t === 'function') ? t(key) : '';
 const m = /^<b>(.*?)<\/b>\s*—\s*(.*)$/.exec(str);
 if(m) return { title: m[1], desc: m[2] };
 return { title: '', desc: str.replace(/<[^>]+>/g, '') };
}
function mapHelpModel(){
 return {
  title: t('map_help_title'),
  closeLabel: (typeof t==='function' && t('modal_close_btn') !== 'modal_close_btn') ? t('modal_close_btn') : '✕',
  rows: [
   { swatchCls: 'is-green',       ..._mapHelpRowPair('map_help_green') },
   { swatchCls: 'is-purple',      ..._mapHelpRowPair('map_help_purple') },
   { swatchCls: 'is-blue',        ..._mapHelpRowPair('map_help_blue') },
   { swatchCls: 'is-yellow',      ..._mapHelpRowPair('map_help_yellow') },
   { swatchCls: 'is-gray',        ..._mapHelpRowPair('map_help_gray') },
   { swatchCls: 'is-transparent', ..._mapHelpRowPair('map_help_transparent') },
  ],
 };
}

function toggleMapHelp(){
 let m = document.getElementById('map-help-modal');
 if(!m){
  // Rebuilt display: the ECS design system owns the card tree.
  const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if(!views || !views.MapOverlaysView) throw new Error('[ui] PokeUI views not loaded (MapOverlaysView)');
  m = document.createElement('div');
  m.id = 'map-help-modal';
  m.className = 'pw-map-help-modal';
  _pwSetHtmlSafe(m, views.MapOverlaysView.helpHTML(mapHelpModel()));
  document.body.appendChild(m);
  // NOTE: NO local backdrop listener — the universal click-outside closer
  // (bootstrap.js) closes open modals via their .modal-close button.
  // A local toggler would double-toggle (close, then re-open).
 }
 m.classList.toggle('open');
}


// --- Migrated to ES module, globals exposed ---
if (typeof ensureMapHelpButton !== 'undefined') { if (typeof window !== 'undefined') window.ensureMapHelpButton = ensureMapHelpButton; if (typeof globalThis !== 'undefined') globalThis.ensureMapHelpButton = ensureMapHelpButton; }
if (typeof toggleMapHelp !== 'undefined') { if (typeof window !== 'undefined') window.toggleMapHelp = toggleMapHelp; if (typeof globalThis !== 'undefined') globalThis.toggleMapHelp = toggleMapHelp; }
if (typeof mapHelpModel !== 'undefined') { if (typeof window !== 'undefined') window.mapHelpModel = mapHelpModel; if (typeof globalThis !== 'undefined') globalThis.mapHelpModel = mapHelpModel; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  ensureMapHelpButton,
  toggleMapHelp,
  mapHelpModel,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('toggleMapHelp', toggleMapHelp); } catch (_) {} }

