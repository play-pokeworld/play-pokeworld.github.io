/**
 * PokeEngine — Legacy CSS Overrides
 * 
 * Forces legacy HTML to use engine visual constants.
 * Ensures visual consistency even before components are migrated.
 * Load this AFTER all other CSS files.
 */
(function() {
'use strict';

function injectLegacyOverrides() {
  if (document.getElementById('poke-legacy-overrides')) return;
  
  const css = `
  /* ─── Buttons (.hbtn) use engine colors ─── */
  .hbtn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    min-height: 34px !important;
    padding: 6px 14px !important;
    border-radius: 10px !important;
    font-family: 'Winky Sans','Segoe UI',system-ui,sans-serif !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: 0.4px !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
    border: 1px solid #36342F !important;
    background: #94886B !important;
    color: #36342F !important;
    text-decoration: none !important;
    line-height: 1 !important;
  }
  .hbtn:hover {
    background: #ECDEB7 !important;
    transform: translateY(-1px) !important;
    border-color: #36342F !important;
  }

  /* ─── Badges (type-badge) ─── */
  .type-badge {
    display: inline-block !important;
    padding: 2px 8px !important;
    border-radius: 4px !important;
    font-size: 10px !important;
    font-weight: bold !important;
    color: white !important;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
  }
  .type-electric, .type-normal { color: #222 !important; }

  /* ─── Info panel modals ─── */
  #poke-modal-inner > div > div:last-child:not(.modal-title):not(.pw-panel):not(.pw-info-row-between) {
    padding: 10px 12px !important;
    background: #524f48 !important;
    border-radius: 8px !important;
    font-size: 12px !important;
    line-height: 1.6 !important;
    color: #ECDEB7 !important;
  }

  /* ─── Win/Body consistency ─── */
  .win-body {
    padding: 10px !important;
  }
  .win-header {
    padding: 10px 14px !important;
  }

  /* ─── Modal consistency ─── */
  #poke-modal-inner, #settings-inner, #battle-summary-inner {
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
  }

  /* ─── Inventory items spacing ─── */
  .inv-item {
    border-radius: 10px !important;
  }

  /* ─── Shortcut buttons ─── */
  .shortcut-action-btn {
    font-family: 'Winky Sans','Segoe UI',system-ui,sans-serif !important;
  }
  `;

  const style = document.createElement('style');
  style.id = 'poke-legacy-overrides';
  style.textContent = css;
  document.head.appendChild(style);
}

if (document.readyState === 'complete') injectLegacyOverrides();
else document.addEventListener('DOMContentLoaded', injectLegacyOverrides);
})();
