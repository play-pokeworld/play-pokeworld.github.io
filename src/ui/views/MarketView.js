/**
 * PokéWorld UI — MarketView (rebuilt from zero on the ECS DS)
 *
 * The Pokémon market panel (fullscreen panel content): purchasable species
 * grouped by category (starters / fossils / rare / other), displayed as a
 * GRID (like the shops). Each card shows the species sprite with a Poké Ball
 * status indicator (empty / normal / golden) and a click-to-select contract;
 * the actual purchase happens through the bottom bar (market-panel.js).
 *
 * Kept contracts (classic layer + harness drive them):
 *   - one card per species: `.shop-item .pw-market-row` with
 *     data-action="legacy-call", data-call="selectMarketPokemon",
 *     data-call-args="<speciesId>" (numeric),
 *   - `.pw-empty-state-lg` empty state,
 *   - unseen species show "???" (localization is language-free by nature),
 *   - owned species get the `pw-text-sm pw-green` "bought" line,
 *   - the money/currency row lives OUTSIDE (fs-panel-filters slot).
 *
 * Model (labels pre-localized by the adapter):
 * {
 *   emptyLabel: string,
 *   selectedId: number|null,
 *   categories: [{ key, label, cards: [{
 *     id, name, numLabel, typesHtml, priceLabel,
 *     ownedLabel|null, ballSrc, spriteHtml,
 *   }] }],
 * }
 *
 * @module ui/views/MarketView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class MarketView extends UIView {
  constructor(model) {
    super({ name: 'MarketView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const cats = (m.categories || []).filter((c) => c && Array.isArray(c.cards) && c.cards.length);
    if (!cats.length) {
      return h('div', { class: 'pw-empty-state-lg' }, m.emptyLabel || '');
    }
    return h(
      'div',
      { class: 'pw-market-list' },
      ...cats
        .map((cat) => [
          h('div', { class: 'pw-manage-title pw-market-cat' }, cat.label || ''),
          h(
            'div',
            { class: 'pw-market-grid' },
            ...cat.cards.filter(Boolean).map((card) => marketCardVNode(m, card))
          ),
        ])
        .flat()
    );
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:market', []);
    this.windowEntity.addComponent(
      new UIRenderComponent({
        template: () => this.windowVNode(),
      })
    );
  }

  /**
   * DOM-free serialization for the classic adapter (market-panel.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new MarketView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

function marketCardVNode(m, card) {
  const selected = String(card.id) === String(m.selectedId);
  return h(
    'div',
    {
      class: 'shop-item pw-manage-card pw-market-row' + (selected ? ' selected' : ''),
      dataset: { action: 'legacy-call', call: 'selectMarketPokemon', callArgs: String(card.id) },
    },
    h(
      'div',
      { class: 'pw-manage-orb pw-market-orb' },
      h('div', { class: 'pw-manage-sprite' }, h.raw(card.spriteHtml || '')),
      card.ballSrc ? h('img', { class: 'pw-market-ball', src: card.ballSrc, alt: '' }) : null
    ),
    h(
      'div',
      { class: 'pw-flex-1' },
      h(
        'div',
        { class: 'pw-manage-name' },
        card.name || '',
        ' ',
        h('span', { class: 'pw-manage-sub' }, card.numLabel || '')
      ),
      h('div', { class: 'pw-manage-desc' }, h.raw(card.typesHtml || '')),
      card.ownedLabel ? h('div', { class: 'pw-text-sm pw-green' }, card.ownedLabel) : null
    ),
    h('div', { class: 'pw-manage-level pw-market-price' }, h.raw(card.priceLabel || ''))
  );
}
