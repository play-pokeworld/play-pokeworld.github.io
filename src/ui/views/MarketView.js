/**
 * PokéWorld UI — MarketView (rebuilt from zero on the ECS DS)
 *
 * The Pokémon market panel (fullscreen panel content): purchasable species
 * grouped by category (starters / fossils / rare / other). The classic
 * adapter buckets the species, localizes labels and shapes the model; the
 * view owns 100% of the markup.
 *
 * Kept contracts (classic layer + harness drive them):
 *   - one card per species: `.shop-item` with data-action="legacy-call",
 *     data-call="buyPokemon", data-call-args="<speciesId>" (numeric),
 *   - `.pw-empty-state-lg` empty state,
 *   - unseen species show "???" (localization is language-free by nature),
 *   - owned species get the `pw-text-sm pw-green` "bought" line,
 *   - the money row lives OUTSIDE (fs-panel-filters slot, DS MoneyRow).
 *
 * Model (labels pre-localized by the adapter):
 * {
 *   emptyLabel: string,
 *   categories: [{ key, label, cards: [{
 *     id, name, numLabel, typesHtml, bstLabel, priceLabel,
 *     ownedLabel|null, spriteHtml,
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
    return h('div', { class: 'pw-market-list' },
      ...cats.map((cat) => [
        h('div', { class: 'pw-manage-title pw-market-cat' }, cat.label || ''),
        ...cat.cards.filter(Boolean).map((card) => h('div', {
          class: 'shop-item pw-manage-card pw-market-row',
          dataset: { action: 'legacy-call', call: 'buyPokemon', callArgs: String(card.id) },
        },
          h('div', { class: 'pw-manage-orb' },
            h('div', { class: 'pw-manage-sprite' }, h.raw(card.spriteHtml || ''))),
          h('div', { class: 'pw-flex-1' },
            h('div', { class: 'pw-manage-name' },
              card.name || '',
              ' ',
              h('span', { class: 'pw-manage-sub' }, card.numLabel || '')),
            h('div', { class: 'pw-manage-desc' }, h.raw(card.typesHtml || ''), ` · ${card.bstLabel || ''}`),
            card.ownedLabel ? h('div', { class: 'pw-text-sm pw-green' }, card.ownedLabel) : null),
          h('div', { class: 'pw-manage-level' }, card.priceLabel || ''))),
      ]).flat());
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:market', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (market.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new MarketView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

