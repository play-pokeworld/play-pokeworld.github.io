/**
 * PokéWorld UI — BoxView (PC box, rebuilt from zero on the ECS DS)
 *
 * The player's PC box as a view layered over the GameScene. Structure:
 *   - battle-lock banner (when a battle is running),
 *   - the filter panel (fixed panel row, same family as the bag one),
 *   - the header (counter or swap context),
 *   - the card grid: every card shows the Pokémon through the single
 *     PokemonSprite component (canonical beige circle, clamped sizes).
 *
 * STRICT button rule: card actions that cannot be used right now (team
 * full, battle running) are NOT rendered — no dead disabled buttons.
 *
 * Model (shaped by the classic adapter):
 * {
 *   locked, lockLabel, filtersHtml, emptyAll, emptyLabel,
 *   emptyFiltered, noFoundLabel, resetLabel, hiddenCountLabel,
 *   swapMode, swapName, finishLabel, countLabel, fullscreenLabel,
 *   cards: [{ id, name, level, shiny, imgSrc, emoji, ficheLabel,
 *             action: { label, call, usable, unusableTitle } }],
 *   fillTeamLabel, swapLabel
 * }
 *
 * @module ui/views/BoxView
 */
import { UIView } from './UIView.js';
import { createLayout } from '../components/layouts.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { pokeCardVNode } from '../components/poke-card.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class BoxView extends UIView {
  constructor(model) {
    super({ name: 'BoxView', model: model || {} });
  }

  onLoad() {
    const model = this.model;

    // Card grid entity (columns driven by the themed .box-grid CSS).
    this.gridEntity = createLayout(this, {
      direction: 'grid',
      cols: 0,
      className: 'box-grid-root',
      bodyClassName: 'box-grid',
      scrollable: true,
    });
    for (const card of model.cards || []) {
      const cell = this.spawn('ui:box-card', [], this.gridEntity);
      cell.addComponent(new UIInteractiveComponent({
        action: 'legacy-call',
        call: 'openBoxPokeModal',
        callArgs: `'${card.id}'`,
      }));
      cell.addComponent(new UIRenderComponent({
        template: (ce) => {
          const inter = ce.get(UIInteractiveComponent);
          if (inter.renderHidden) return null;
          // THE single standardized Pokémon card (same component everywhere:
          // box tab, fullscreen selector, pickers).
          return pokeCardVNode({
            entityId: ce.id,
            title: card.cardTitle || '',
            shiny: !!card.shiny,
            shinyTitle: 'Forme Shiny',
            imgSrc: card.imgSrc,
            emoji: card.emoji,
            size: 'standard',
            name: card.name,
            levelLabel: `Nv.${card.level}`,
            select: {
              call: 'openBoxPokeModal',
              callArgs: `'${card.id}'`,
              contextCall: 'openBoxPokeModal',
              contextArgs: `'${card.id}'`,
            },
            // Per-card buttons are OPTIONAL: the PC box cards render none
            // (sheet opens by clicking the card — user rule).
            actions: [
              ...(card.ficheLabel
                ? [{ label: card.ficheLabel, title: card.ficheTitle || 'Sheet', call: 'openBoxPokeModal', callArgs: `'${card.id}'` }]
                : []),
              // STRICT RULE: unusable action (team full / battle) ⇒ not rendered.
              ...(card.action && card.action.usable
                ? [{ label: card.action.label, call: card.action.call, callArgs: `'${card.id}'` }]
                : []),
            ],
          });
        },
      }));
    }
  }

  /** @returns {*} Vnode for the full box content (filters first, fixed row). */
  contentVNode() {
    const model = this.model;
    const children = [];

    if (model.locked) {
      // Wave 43 — lockLabel: trusted localized markup (battle_lock_box: <b>…</b>).
      children.push(h('div', { class: 'pw-alert' },
        h('span', { class: 'pw-text-md' }), h('span', null, model.lockLabel ? h.raw(model.lockLabel) : '')));
    }
    if (model.filtersHtml) children.push(h.raw(model.filtersHtml));

    if (model.emptyAll) {
      // Wave 43 — emptyLabel: trusted localized markup (box_empty: <br><br>).
      children.push(h('div', { class: 'pw-empty-state' }, model.emptyLabel ? h.raw(model.emptyLabel) : ''));
      if (model.swapMode) {
        children.push(h('div', { class: 'pw-btn-center' },
          h('button', { type: 'button', class: 'hbtn', dataset: { action: 'legacy-call', call: 'cancelBoxSwap', callArgs: '' } }, model.finishLabel || '')));
      }
      return children;
    }
    if (model.emptyFiltered) {
      children.push(h('div', { class: 'pw-empty-state' },
        model.noFoundLabel || '',
        h('br'),
        h('button', { type: 'button', class: 'hbtn', style: { 'margin-top': '8px' }, dataset: { action: 'legacy-call', call: 'resetBoxFilters', callArgs: '' } }, model.resetLabel || ''),
        h('div', { style: { 'margin-top': '6px', 'font-size': '11px' } }, model.hiddenCountLabel || '')));
      return children;
    }

    // Header: swap context or counter + fullscreen shortcut.
    if (model.swapMode) {
      children.push(h('div', { class: 'loc-sub extracted-bridge-style-010' },
        `${model.swapHeaderLabel || ''} `,
        h('b', null, model.swapName || ''),
        '. ',
        h('button', { type: 'button', class: 'hbtn extracted-bridge-style-011', dataset: { action: 'legacy-call', call: 'cancelBoxSwap', callArgs: '' } })));
    } else {
      children.push(h('div', { class: 'pw-row-between' },
        h('span', { class: 'loc-sub' }, model.countLabel || ''),
        h('button', { type: 'button', class: 'hbtn extracted-bridge-style-012', dataset: { action: 'legacy-call', call: 'openUnifiedSelectorModal', callArgs: "'box_view'" } }, model.fullscreenLabel || '')));
    }

    children.push(this.gridEntity.get(UIRenderComponent).renderTemplate());
    return children;
  }

  buildView() {
    return h('div', { class: 'pw-view box-panel-content', dataset: { view: this.name } },
      this.contentVNode());
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {{full: string}}
   */
  static toHTML(model) {
    const view = new BoxView(model);
    view.enter();
    return { full: toHTMLString(view.buildView()) };
  }
}
