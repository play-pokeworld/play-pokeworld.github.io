/**
 * PokéWorld UI — static panel headers (Wave 33, user feedback)
 *
 * ── Why this module exists ──────────────────────────────────────────────
 * Wave 32 introduced `panelHeaderVNode()`, THE single constructor for every
 * panel header, and rebranded the 26 JS sites that build headers at runtime.
 * Four headers escaped that pass because they are not built by JS at all:
 * they are literal header markup typed straight into index.html
 *
 *   #settings-modal          Réglages
 *   #quest-modal             Quêtes
 *   #unified-selector-modal  Sélection
 *   #battle-summary-modal    Butin & résumé de session
 *
 * Those four were hand-aligned onto the canonical structure in Wave 32, so
 * they *looked* right — but they were identical by copy-paste, which is
 * exactly the failure mode the user rejected: nothing stops the next edit
 * from drifting, and a change to the constructor would not reach them.
 *
 * This module closes the loop. At boot, each of the four bands is REBUILT
 * from `panelHeaderVNode()` and swapped into the DOM in place. From now on
 * every header in the game — runtime or static — comes out of one function.
 *
 * Contract preserved for each rebuilt header:
 *   - the ids the rest of the codebase writes into (`#settings-title`,
 *     `#quest-title`, `#usm-title`, `#battle-summary-title`);
 *   - the `data-i18n` / `data-i18n-aria-label` hooks the localization pass
 *     walks (the swap happens before the first i18n pass);
 *   - the `data-action` hooks of the delegated dispatcher;
 *   - the layout-only static classes (`pw-static-054/055/035`).
 *
 * @module ui/components/static-headers
 */
import { panelHeaderVNode } from './panel-header.js';
import { mount } from '../../engine/render/vdom.js';

/**
 * Descriptor per static header: the host `.modal-title` and the options
 * handed to the ONE constructor. Kept declarative so a future static panel
 * is one entry, never a new copy of the markup.
 */
const STATIC_HEADERS = [
  {
    host: '#settings-modal .modal-title',
    opts: {
      title: 'Réglages',
      titleProps: { id: 'settings-title', 'data-i18n': 'settings_title' },
      close: {
        tag: 'button', action: 'close-settings', glyph: '✕',
        ariaLabel: '', i18nAriaLabel: 'modal_close_btn',
      },
    },
  },
  {
    host: '#quest-modal .modal-title',
    opts: {
      title: '',
      titleProps: { id: 'quest-title' },
      close: {
        tag: 'button', call: 'closeQuestModal', callArgs: '', glyph: '✕',
        ariaLabel: 'Fermer', i18nAriaLabel: 'modal_close_btn',
      },
    },
  },
  {
    host: '#unified-selector-modal .modal-title',
    opts: {
      class: 'pw-static-054',
      title: 'Sélection',
      titleProps: { id: 'usm-title', class: 'pw-info-name pw-static-035', 'data-i18n': 'usm_selection' },
      close: {
        tag: 'button', action: 'close-unified-selector', glyph: '✕',
        class: 'pw-static-055', ariaLabel: 'Fermer', i18nAriaLabel: 'modal_close_btn',
      },
    },
  },
  {
    host: '#battle-summary-modal .modal-title',
    opts: {
      title: 'Butin & résumé de session',
      titleProps: { id: 'battle-summary-title', 'data-i18n': 'battle_summary_title' },
      close: {
        tag: 'button', action: 'close-battle-summary', glyph: '✕',
        ariaLabel: 'Fermer', i18nAriaLabel: 'modal_close_btn',
      },
    },
  },
];

/**
 * Rebuild the static headers through `panelHeaderVNode()`.
 * Idempotent: a rebuilt band is flagged and skipped on later calls.
 *
 * @param {Document|Element} [root=document] scope to search (tests pass a fragment)
 * @returns {number} how many headers were rebuilt
 */
export function pwBuildStaticHeaders(root) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  if (!scope || !scope.querySelector) return 0;
  let n = 0;
  for (const spec of STATIC_HEADERS) {
    const host = scope.querySelector(spec.host);
    if (!host || host.dataset.pwHeaderBuilt === '1') continue;
    // mount() builds real DOM nodes — no innerHTML, so the engine's HTML
    // sink contract is respected without an exemption.
    const built = mount(panelHeaderVNode(spec.opts));
    if (!built || built.nodeType !== 1) continue;
    built.dataset.pwHeaderBuilt = '1';
    host.replaceWith(built);
    n++;
  }
  return n;
}

if (typeof window !== 'undefined') {
  window.pwBuildStaticHeaders = pwBuildStaticHeaders;
  // Run as soon as the document body exists — before the first i18n pass and
  // before any panel is opened, so no consumer ever sees the literal markup.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pwBuildStaticHeaders(), { once: true });
  } else {
    pwBuildStaticHeaders();
  }
}

export default pwBuildStaticHeaders;
