/**
 * PokéWorld UI — Atoll FACTORY preparation sheet (rebuilt from zero on the
 * ECS DS). The shell (title + hint + team body + action bar + note) used to
 * be a raw HTML string concatenated inside renderAtollFactoryPrep; the team
 * cards themselves were already unified (generatePokeCardHTML). The shell
 * is now a pure view; the adapter only shapes the localized model.
 *
 * Kept contracts:
 *  - `.modal-close[data-call="closeAtollFactoryPrep"]`,
 *  - `#atoll-prep-body.team-view` (drag & drop target, installed by the
 *    adapter AFTER the html is set — installAtollPrepDragDrop),
 *  - actions data-call="atollFactoryPrepFight" / "atollFactoryPrepAbandon"
 *    (the abandon stays the flat danger kind), hints `.atoll-prep-hint` /
 *    `.atoll-prep-note`.
 *
 * The vdom serializer escapes text — the adapter passes RAW (unescaped,
 * already localized) strings; cards arrive as trusted DS component HTML.
 *
 * @module ui/views/AtollFactoryPrepView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class AtollFactoryPrepView extends UIView {
  constructor(model) {
    super({ name: 'AtollFactoryPrepView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    return [
      h('div', { class: 'modal-title' },
        h('div', { class: 'pw-row' },
          h('span', { class: 'pw-info-icon' }, '🏭'),
          h('div', { class: 'pw-info-head-text' },
            h('div', { class: 'pw-info-name' }, m.title || ''),
            h('div', { class: 'pw-text-sm pw-light1' }, m.streakText || ''))),
        h('span', { class: 'modal-close', dataset: { action: 'legacy-call', call: 'closeAtollFactoryPrep', callArgs: '' } })),
      h('small', { class: 'atoll-prep-hint' }, m.hintText || ''),
      h('div', { id: 'atoll-prep-body', class: 'team-view' }, h.raw(m.cardsHtml || '')),
      h('div', { class: 'pw-btn-group' },
        h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'atollFactoryPrepFight', callArgs: '' } },
          m.continueLabel || ''),
        h('button', { class: 'hbtn pw-btn-danger', dataset: { action: 'legacy-call', call: 'atollFactoryPrepAbandon', callArgs: '' } },
          m.abandonLabel || '')),
      h('small', { class: 'atoll-prep-note' }, m.noteText || ''),
    ];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:atoll-factory-prep', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (fullscreen-panel.js). */
  static toHTML(model) {
    const view = new AtollFactoryPrepView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
