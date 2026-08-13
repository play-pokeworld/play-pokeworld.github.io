/**
 * PokéWorld UI — SaveMenuView (rebuilt from zero on the ECS DS)
 *
 * The save-game main menu face (the screen the game boots into) rendered
 * as ONE virtual tree at open time — labels come from t() in the CURRENT
 * language, no more id-targeted textContent surgery on static markup.
 *
 * Kept contracts (the classic layer + harness drive them):
 *   - #save-menu-title / #save-menu-subtitle headings,
 *   - #save-menu-list.save-menu-list host filled with .save-slot cards
 *     built by the single SaveCard component, or the .save-menu-empty
 *     state (.save-menu-empty-icon + h2 + p),
 *   - #save-menu-prev / #save-menu-next scroll buttons
 *     (legacy-call scrollSaveList ±1, updateSaveMenuScrollButtons toggles
 *     their .is-invisible on overflow — NOT .is-hidden, which is a
 *     display:none !important utility that breaks the shell grid),
 *   - #save-menu-new-btn (legacy-call createNewSaveFromMenu),
 *   - #save-menu-import-label (for=save-menu-import-file) +
 *     #save-menu-import-file file input
 *     (class pw-static-010, data-action="import-save-file", change
 *     delegation → importSave),
 *   - .save-menu-bg-layer décor, .save-menu-panel shell.
 *
 * Model (shaped by the classic adapter):
 * {
 *   title, subtitle, newLabel, importLabel,
 *   empty: { title, desc } | null,
 *   cardsHtml: string[],                 // saveCardHTML() output strings
 * }
 *
 * @module ui/views/SaveMenuView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class SaveMenuView extends UIView {
  constructor(model) {
    super({ name: 'SaveMenuView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    return [
      h('div', { class: 'save-menu-bg-layer', 'aria-hidden': 'true' }),
      h('section', { class: 'save-menu-panel', 'aria-labelledby': 'save-menu-title' },
        h('div', { class: 'save-menu-title-block' },
          // ONE title only (user rule): the game name, no kicker bubble.
          h('h1', { id: 'save-menu-title' }, m.title || ''),
          h('p', { id: 'save-menu-subtitle' }, m.subtitle || '')),
        h('div', { class: 'save-menu-list-shell' },
          h('button', {
            type: 'button', id: 'save-menu-prev', class: 'hbtn save-menu-scroll-btn',
            dataset: { action: 'legacy-call', call: 'scrollSaveList', callArgs: '-1' },
          }, '‹'),
          h('div', { id: 'save-menu-list', class: 'save-menu-list' },
            m.empty
              ? h('div', { class: 'save-menu-empty' },
                  h('div', { class: 'save-menu-empty-icon' }, '◇'),
                  h('h2', null, m.empty.title || ''),
                  h('p', null, h.raw(m.empty.desc || '')))
              : null,
            ...(Array.isArray(m.cardsHtml) ? m.cardsHtml.filter(Boolean).map((html) => h.raw(html)) : [])),
          h('button', {
            type: 'button', id: 'save-menu-next', class: 'hbtn save-menu-scroll-btn',
            dataset: { action: 'legacy-call', call: 'scrollSaveList', callArgs: '1' },
          }, '›')),
        h('div', { class: 'save-menu-actions' },
          h('button', {
            type: 'button', id: 'save-menu-new-btn', class: 'hbtn save-menu-action-primary',
            dataset: { action: 'legacy-call', call: 'createNewSaveFromMenu', callArgs: '' },
          }, m.newLabel || ''),
          h('label', { id: 'save-menu-import-label', class: 'hbtn save-menu-action-secondary', for: 'save-menu-import-file' }, m.importLabel || ''),
          h('input', {
            type: 'file', id: 'save-menu-import-file', accept: '.json,application/json',
            class: 'pw-static-010', dataset: { action: 'import-save-file' },
          })),
        h('div', { class: 'save-menu-lang-actions', style: { display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'center' } },
          h('button', {
            type: 'button',
            class: `hbtn lang-btn${(typeof globalThis.currentLang === 'function' && globalThis.currentLang() === 'fr') ? ' active' : ''}`,
            dataset: { action: 'legacy-call', call: 'setSaveMenuLang', callArgs: "'fr'" },
          }, 'FR'),
          h('button', {
            type: 'button',
            class: `hbtn lang-btn${(typeof globalThis.currentLang === 'function' && globalThis.currentLang() === 'en') ? ' active' : ''}`,
            dataset: { action: 'legacy-call', call: 'setSaveMenuLang', callArgs: "'en'" },
          }, 'EN')
        )),
    ];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:save-menu', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (save.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new SaveMenuView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

