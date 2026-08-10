/**
 * PokéWorld UI — LearnableMovesPanelView (rebuilt from zero on the ECS DS)
 *
 * The "all learnable moves" panel opened from a Pokémon sheet: title with
 * the ownership counter, three categorized sections (level-up / TM-HM /
 * training-only) of move rows (ECS move-row component) with equipped /
 * available pills, and the footer (back to the sheet + close).
 *
 * Kept contracts:
 *   - `.poke-detail-moves-block[data-learnable-panel="1"]` marker — the
 *     in-place refresh guard (refreshLearnableMovesPanelIfOpen) and probes
 *     depend on it,
 *   - every row carries `data-context-call="openMoveInfo"` with the exact
 *     legacy context args (team idx / box id) for right-click info,
 *   - the footer back button routes to openPokeModal/openBoxPokeModal with
 *     the source id, the close button uses data-action="close-poke-modal",
 *   - section/moves-list class hooks (.poke-detail-moves-section,
 *     .poke-detail-moves-title, .poke-detail-moves-list.learn).
 *
 * ONE scroll (user rule, 2026-08-05): the old panel capped its block at
 * 70vh with a nested scroller, forcing the pointer to sit precisely over
 * the list. The block now grows naturally — the modal inner is the single
 * scroll container everywhere on the panel.
 *
 * Model (shaped by the classic adapter, labels already localized):
 * {
 *   title, countLabel,
 *   sections: [{ label, count, emptyMsg,
 *     moves: [{ name, typeCls, typeName, typeColor, meta,
 *               stateClass, pill, contextArgs }] }],
 *   back: { label, call, args }, closeLabel,
 * }
 *
 * @module ui/views/LearnableMovesPanelView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { moveRowVNode } from '../components/move-row.js';

export class LearnableMovesPanelView extends UIView {
  constructor(model) {
    super({ name: 'LearnableMovesPanelView', model: model || {} });
  }

  sectionVNode(sec) {
    const body = (sec.moves && sec.moves.length)
      ? h('div', { class: 'poke-detail-moves-list learn' },
          sec.moves.map((mv) => moveRowVNode({
            name: mv.name,
            typeCls: mv.typeCls,
            typeName: mv.typeName,
            typeColor: mv.typeColor,
            meta: mv.meta,
            stateClass: mv.stateClass,
            pill: mv.pill || null,
            context: { call: 'openMoveInfo', args: mv.contextArgs },
          })))
      : h('div', { class: 'poke-detail-empty' }, sec.emptyMsg || '');
    return h('div', { class: 'poke-detail-moves-section' },
      h('div', { class: 'poke-detail-moves-title' },
        h('span', null,
          sec.label || '',
          h('span', { style: { fontSize: '11px', color: 'var(--light1)', fontWeight: '400' } }, ` (${sec.count != null ? sec.count : (sec.moves ? sec.moves.length : 0)})`))),
      body);
  }

  windowVNode() {
    const m = this.model;
    return [
      h('div', { class: 'modal-title' },
        h('div', null,
          m.title || '',
          h('span', { style: { fontSize: '12px', color: 'var(--light1)', fontWeight: '400' } }, ` ${m.countLabel || ''}`)),
        h('span', { class: 'modal-close', dataset: { action: 'close-poke-modal' } }, '✕')),
      h('div', { class: 'poke-detail-moves-block', dataset: { learnablePanel: '1' } },
        (m.sections || []).map((sec) => this.sectionVNode(sec))),
      h('div', { class: 'pw-flex-center pw-gap-sm', style: { marginTop: '8px' } },
        m.back ? h('button', {
          class: 'hbtn poke-detail-mini-btn',
          dataset: { action: 'legacy-call', call: m.back.call || '', callArgs: m.back.args == null ? '' : String(m.back.args) },
        }, m.back.label || '') : null,
        h('button', { class: 'hbtn', dataset: { action: 'close-poke-modal' } }, m.closeLabel || '')),
    ];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:learnable-moves-panel', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (poke-modal.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new LearnableMovesPanelView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
