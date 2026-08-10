/**
 * PokéWorld UI — PokeDetailView (rebuilt from zero on the ECS DS)
 *
 * The detailed Pokémon sheet (fiche) opened from the team, the box, or a
 * battle: ONE shell rendered as ONE virtual tree at open time. Since
 * wave 10 the whole content is ECS-native: stat bars, rank panel, talent
 * block (selector or readonly chips), evolution methods and move rows are
 * design-system components driven by structured models — the classic
 * adapter only shapes data (labels, unlock state, context args).
 * Any block may still arrive as a trusted raw fragment (`rowsHtml`/`html`)
 * — the view renders it verbatim, which keeps the door open for future
 * sections without touching the shell.
 *
 * Kept contracts (the classic behaviors drive them by class/dataset):
 *   - `.modal-title.poke-detail-title` + `.modal-close[data-action="close-poke-modal"][data-reset-move-editor][data-reset-box-move]`,
 *   - `.poke-detail-shell > .poke-detail-hero + .poke-detail-side`,
 *   - stat tabs `.poke-detail-stat-tab[data-stat-tab]` and panels
 *     `.poke-detail-stat-panel[data-stat-panel]` (switchPokemonStatTab
 *     toggles .active on both),
 *   - `.poke-detail-section-grid > .poke-detail-panel(.poke-detail-panel-wide) > h3 + block`,
 *   - `.poke-detail-moves-block` with `.poke-detail-moves-title`,
 *     `.poke-detail-moves-list.current`, `.poke-detail-learn-title`,
 *     `.poke-detail-moves-list.learn` and the full-list button fragment,
 *   - stat fills keep their data-pct/data-bg painter attributes.
 *
 * Model (shaped by the classic adapter):
 * {
 *   titleHtml,                                  // shiny ★, name, #id
 *   hero: { nameHtml, spriteHtml, spriteClass, typesHtml,
 *           shinyToggleHtml, protectionHtml },
 *   stats: { tabs: [{ id, label, active }],
 *            panels: [{ id, active, rows: [statRow] | rowsHtml }] },
 *   sections: [{ title, wide, kind: 'talent'|'rank'|'evos'|undefined,
 *                talent?, rank?, evos?, html? }],
 *   moves: { titleLabel, cancelHtml, knownRows: [moveRow] | knownHtml,
 *            knownEmptyLabel,
 *            learn: { titleLabel, hintHtml, rows: [moveRow] | rowsHtml,
 *                     emptyLabel } | null,
 *            fullListBtnHtml },
 * }
 *
 * @module ui/views/PokeDetailView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from '../components/component-utils.js';
import { moveRowVNode } from '../components/move-row.js';
import { statRowVNode, rankPanelVNode, talentBlockVNode, evoMethodsVNode, shinyToggleVNode, protectionBarVNode } from '../components/poke-detail.js';

export class PokeDetailView extends UIView {
  constructor(model) {
    super({ name: 'PokeDetailView', model: model || {} });
  }

  sectionContent(sec) {
    if (sec.kind === 'talent' && sec.talent) return talentBlockVNode(sec.talent);
    if (sec.kind === 'rank' && sec.rank) return rankPanelVNode(sec.rank);
    if (sec.kind === 'evos' && sec.evos) return evoMethodsVNode(sec.evos);
    return h.raw(sec.html || '');
  }

  windowVNode() {
    const m = this.model;
    const hero = m.hero || {};
    const stats = m.stats || { tabs: [], panels: [] };
    const moves = m.moves || {};
    return h('div', { class: 'pw-poke-detail-root' },
      // ── Title bar ─────────────────────────────────────────────────
      h('div', { class: 'modal-title poke-detail-title' },
        h('div', null, h.raw(m.titleHtml || '')),
        h('span', {
          class: 'modal-close',
          dataset: { action: 'close-poke-modal', resetMoveEditor: 'true', resetBoxMove: 'true' },
        }, '✕')),
      // ── Hero + stats ──────────────────────────────────────────────
      h('div', { class: 'poke-detail-shell' },
        h('section', { class: 'poke-detail-hero' },
          h('div', { class: 'poke-detail-name-row' }, h('div', null, h.raw(hero.nameHtml || ''))),
          h('div', { class: cx(hero.spriteClass || 'poke-detail-sprite-card') }, h.raw(hero.spriteHtml || '')),
          h('div', { class: 'poke-detail-types' }, h.raw(hero.typesHtml || '')),
          hero.shinyToggle ? shinyToggleVNode(hero.shinyToggle) : (hero.shinyToggleHtml ? h.raw(hero.shinyToggleHtml) : null),
          hero.protections ? protectionBarVNode(hero.protections) : (hero.protectionHtml ? h.raw(hero.protectionHtml) : null)),
        h('aside', { class: 'poke-detail-side' },
          h('div', { class: 'poke-detail-stat-tabs' },
            ...(stats.tabs || []).map((tab) => h('button', {
              type: 'button',
              class: cx('poke-detail-stat-tab', tab.active && 'active'),
              dataset: {
                statTab: tab.id,
                action: 'legacy-call',
                call: 'switchPokemonStatTab',
                callArgs: `'${tab.id}'`,
              },
            }, tab.label))),
          ...(stats.panels || []).map((panel) => h('div', {
            class: cx('poke-detail-stat-panel', panel.active && 'active'),
            dataset: { statPanel: panel.id },
          },
            panel.rows
              ? panel.rows.map(statRowVNode)
              : h.raw(panel.rowsHtml || ''))))),
      // ── Section grid (talents / rank / evolutions) ───────────────
      h('div', { class: 'poke-detail-section-grid' },
        ...(m.sections || []).map((sec) => h('section', {
          class: cx('poke-detail-panel', sec.wide && 'poke-detail-panel-wide'),
        },
          h('h3', null, sec.title || ''),
          this.sectionContent(sec)))),
      // ── Moves block ───────────────────────────────────────────────
      h('section', { class: 'poke-detail-moves-block' },
        h('div', { class: 'poke-detail-moves-title' },
          h('span', null, moves.titleLabel || ''),
          moves.cancelHtml ? h.raw(moves.cancelHtml) : null),
        h('div', { class: 'poke-detail-moves-list current' },
          moves.knownRows
            ? (moves.knownRows.length
                ? moves.knownRows.map(moveRowVNode)
                : h('div', { class: 'poke-detail-empty' }, moves.knownEmptyLabel || ''))
            : h.raw(moves.knownHtml || '')),
        moves.learn
          ? h('div', { class: 'poke-detail-learn-title' }, moves.learn.titleLabel || '', moves.learn.hintHtml ? h.raw(' ' + moves.learn.hintHtml) : null)
          : null,
        moves.learn
          ? h('div', { class: 'poke-detail-moves-list learn' },
              moves.learn.rows
                ? (moves.learn.rows.length
                    ? moves.learn.rows.map(moveRowVNode)
                    : h('div', { class: 'poke-detail-empty' }, moves.learn.emptyLabel || ''))
                : h.raw(moves.learn.rowsHtml || ''))
          : null,
        moves.fullListBtnHtml ? h.raw(moves.fullListBtnHtml) : null));
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:poke-detail', []);
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
    const view = new PokeDetailView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
