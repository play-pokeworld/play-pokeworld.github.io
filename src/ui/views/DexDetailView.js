/**
 * PokéWorld UI — DexDetailView (rebuilt from zero on the ECS DS)
 *
 * The Pokédex DETAIL sheet, opened by clicking a dex cell (openDexEntry).
 * Same visual language as the shared info panel (move/item/talent):
 * canonical header, flat hero panel (canonical LARGE sprite disc +
 * type badges), framed .pw-panel sections and the shared stat cards —
 * the old hand-grown .dex-detail-* markup (radial-gradient orb, rgba
 * flavor box, 4-column mini stats) is gone.
 *
 * Kept contracts:
 *   - ONE close control: .modal-title.poke-detail-title .modal-close with
 *     data-action="close-poke-modal" (the classic adapter still adds
 *     .poke-detail-inner on #poke-modal-inner),
 *   - move chips: [data-action="legacy-call"][data-call="openMoveInfo"]
 *     with data-call-args="'<moveKey>'",
 *   - talent chips: same contract with data-call="openAbilityInfo",
 *   - .dict-chip-list > .dict-chip chips, .shiny-tag star, and the shared
 *     .pw-info-stat-cards / .pw-card-dark.pw-center stat cards.
 *
 * Model (shaped and localized by the classic adapter, economy/pokedex.js):
 * {
 *   id, name, shiny,
 *   spriteHtml,        // canonical sprite disc fragment (trusted)
 *   typesHtml,         // type badges fragment (trusted)
 *   flavorLabel, flavor,
 *   evolutionsHtml,    // DS evolution-methods block (trusted, maybe '')
 *   sourcesLabel, sources: [label…],
 *   movesLabel, moves: [{key, label}], noMovesLabel,
 *   talentsLabel, talents: [{key, label}], noTalentsLabel,
 *   statsLabel, stats: [{label, value}…]
 * }
 *
 * @module ui/views/DexDetailView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

function sectionVNode(title, ...bodyNodes) {
  return h('div', { class: 'pw-panel pw-info-section' },
    title ? h('div', { class: 'pw-section-title' }, h.raw(title)) : null,
    h('div', { class: 'pw-info-section-body' }, ...bodyNodes));
}

function chipListVNode(chips) {
  return h('div', { class: 'dict-chip-list' }, ...chips);
}

export class DexDetailView extends UIView {
  constructor(model) {
    super({ name: 'DexDetailView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const nodes = [];

    // ── Header (cross = close the sheet, contract unchanged) ────────
    nodes.push(h('div', { class: 'modal-title poke-detail-title' },
      h('div', { class: 'pw-dex-title-text' },
        `#${m.id} `,
        m.shiny ? h('span', { class: 'shiny-tag' }, '★') : null,
        String(m.name || '')),
      h('span', { class: 'modal-close', dataset: { action: 'close-poke-modal' } })));

    // ── Hero: canonical sprite disc + type badges (flat panel) ──────
    nodes.push(h('div', { class: 'pw-panel pw-dex-hero' },
      h.raw(m.spriteHtml || ''),
      h('div', { class: 'pw-dex-hero-types' }, h.raw(m.typesHtml || ''))));

    // ── Description ─────────────────────────────────────────────────
    if (m.flavor) {
      nodes.push(sectionVNode(m.flavorLabel || '',
        h('div', { class: 'pw-text-sm pw-dex-flavor' }, String(m.flavor))));
    }

    // ── Evolutions (block already rendered by the DS component) ─────
    if (m.evolutionsHtml) nodes.push(h.raw(m.evolutionsHtml));

    // ── Where to find it ────────────────────────────────────────────
    const sources = (m.sources || []).filter(Boolean);
    if (sources.length) {
      nodes.push(sectionVNode(m.sourcesLabel || '',
        chipListVNode(sources.map((label) => h('span', { class: 'dict-chip' }, String(label))))));
    }

    // ── Moves (clickable chips → move info panel) ───────────────────
    const moves = m.moves || [];
    nodes.push(sectionVNode(m.movesLabel || '',
      moves.length
        ? chipListVNode(moves.map((mv) => h('span', {
            class: 'dict-chip',
            dataset: { action: 'legacy-call', call: 'openMoveInfo', callArgs: `'${mv.key}'` },
          }, String(mv.label))))
        : h('span', { class: 'dict-muted' }, String(m.noMovesLabel || ''))));

    // ── Talents (clickable chips → ability info panel) ──────────────
    const talents = m.talents || [];
    nodes.push(sectionVNode(m.talentsLabel || '',
      talents.length
        ? chipListVNode(talents.map((tal) => h('span', {
            class: 'dict-chip',
            dataset: { action: 'legacy-call', call: 'openAbilityInfo', callArgs: `'${tal.key}'` },
          }, String(tal.label))))
        : h('span', { class: 'dict-muted' }, String(m.noTalentsLabel || ''))));

    // ── Base stats (shared stat cards, same as the info panels) ─────
    const stats = m.stats || [];
    if (stats.length) {
      nodes.push(h('div', { class: 'pw-panel pw-info-section' },
        m.statsLabel ? h('div', { class: 'pw-section-title' }, h.raw(m.statsLabel)) : null,
        h('div', { class: 'pw-info-section-body' },
          h('div', { class: 'pw-info-stat-cards pw-dex-stats' },
            stats.map((s) => h('div', { class: 'pw-card-dark pw-center' },
              h('div', { class: 'pw-text-sm pw-light1' }, String(s.label || '')),
              h('div', { class: 'pw-text-lg pw-bold' }, String(s.value == null ? '' : s.value))))))));
    }

    return nodes;
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:dex-detail', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (openDexEntry).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new DexDetailView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
