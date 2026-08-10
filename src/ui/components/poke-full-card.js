/**
 * PokéWorld UI — PokeFullCard (THE single complete Pokémon card)
 *
 * The rich companion card used by the Party window, the battle team row,
 * the Factory preparation panel, preset manager and base NPC editor.
 * Rebuilt from zero on the design system while PRESERVING the live
 * anchors the 60 fps battle ticker mutates (updateMoveBars):
 *   - root `.poke-card` (+ `.active` flag the ticker looks for),
 *   - `.poke-moves` children in order (indexOf-based move lookup),
 *   - `.poke-move` (+ `.pw-charge-move` charge vars `--charge-pct/color`),
 *   - `.hp-fill[data-pct]` / `.xp-fill[data-pct]` (data-pct bar painter),
 *   - `.poke-item-badge`, `.poke-sprite-container`, drag attributes.
 *
 * Sprites go through the single PokemonSprite component (canonical SOLID
 * DARK disc, DS2807) at the 'team' size (96px — Team/Battle context).
 *
 * Model (shaped by the classic adapter generatePokeCardHTML):
 * {
 *   active, fainted, shiny, extraClass?,
 *   sprite: { imgSrc, emoji, title, click:{call,args}|null,
 *             context:{call,args}|null, handlers:boolean, back?:boolean },
 *   item: { key, spriteHtml, empty, title, click, context } | null,
 *   name, level, shinyStar,
 *   hp: { current, max, pct, cls },
 *   xp: { pct } | null,
 *   statusBadgesHtml (raw trusted string, built by the game),
 *   moves: 'bars' | 'chips' | null,
 *   moveCells: [{ empty } | { name, typeLabel, typeCls, next, contextArgs,
 *                              effHtml, drag:{datasetKey, value}|null, title }],
 * }
 *
 * @module ui/components/poke-full-card
 */
import { pokemonSpriteVNode } from './sprite.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/** Dataset for an optional legacy click/context pair (order preserved). */
function actionDataset(prefix, click, context) {
  const dataset = {};
  if (click && click.call) {
    dataset[prefix === 'data' ? 'action' : 'action'] = 'legacy-call';
    dataset.call = click.call;
    dataset.callArgs = click.args != null ? click.args : '';
  }
  if (context && context.call) {
    dataset.contextCall = context.call;
    dataset.contextArgs = context.args != null ? context.args : '';
  }
  return dataset;
}

/**
 * @param {Object} model
 * @returns {*} virtual node of the complete Pokémon card
 */
export function pokeFullCardVNode(model = {}) {
  const sp = model.sprite || {};
  const item = model.item || null;
  const children = [];

  // ── Top: sprite (+ item badge) / name / HP / XP ─────────────────────
  // ONE disc only: the pokemonSpriteVNode below already renders its own
  // .pw-poke-circle-bg (DS2807 — the single dark disc). A second bg layer
  // here stacked two translucent halos into a much lighter ring than on
  // the PC box / Pokédex screens.
  const spriteNode = h('div', {
    class: cx('poke-sprite-container large', model.shiny && 'shiny'),
    dataset: sp.handlers === false ? {} : actionDataset('data', sp.click, sp.context),
    title: sp.title || '',
  },
    h('div', { class: 'poke-sprite' },
      pokemonSpriteVNode({ imgSrc: sp.imgSrc, emoji: sp.emoji, shiny: !!model.shiny, size: 'team' })));

  let itemBadge = null;
  if (item) {
    const itemDataset = {};
    if (item.key) itemDataset.itemKey = item.key;
    if (!item.readonly && item.click && item.click.call) {
      itemDataset.action = 'legacy-call';
      itemDataset.call = item.click.call;
      itemDataset.callArgs = item.click.args != null ? item.click.args : '';
    }
    if (item.key && item.context && item.context.call) {
      itemDataset.contextCall = item.context.call;
      itemDataset.contextArgs = item.context.args != null ? item.context.args : '';
    }
    itemBadge = h('div', {
      class: cx('poke-item-badge', item.empty && 'empty'),
      dataset: itemDataset,
      title: item.title || '',
    }, item.empty ? '+' : h.raw(item.spriteHtml || ''));
  }

  children.push(h('div', { class: 'poke-card-top' },
    h('div', { class: 'pw-relative' }, spriteNode, itemBadge),
    h('div', { class: 'poke-info' },
      h('div', { class: 'poke-name' },
        h('span', null,
          model.shinyStar ? h.raw('<span class="pw-shiny-star">★</span>') : null,
          model.name || '?'),
        h('span', { class: 'poke-level' }, `Nv.${model.level != null ? model.level : '?'}`)),
      h('div', { class: 'hp-bar-container' },
        h('div', { class: 'hp-bar' },
          // Wave 13: hp fill width inline (self-contained bar), data-pct
          // kept as the legacy painter contract.
          h('div', {
            class: cx('hp-fill', model.hp && model.hp.cls),
            dataset: { pct: String(model.hp ? Math.max(0, Math.min(100, Math.round(model.hp.pct || 0))) : 0) },
            style: { width: `${model.hp ? Math.max(0, Math.min(100, Math.round(model.hp.pct || 0))) : 0}%` },
          })),
        h('div', { class: 'hp-text' }, `${model.hp ? model.hp.current : '?'}/${model.hp ? model.hp.max : '?'} PV`)),
      model.xp
        ? h('div', { class: 'xp-bar-container' },
            h('div', { class: 'xp-bar' },
              h('div', {
                class: 'xp-fill',
                dataset: { pct: String(Math.max(0, Math.min(100, Math.round(model.xp.pct || 0)))) },
                style: { width: `${Math.max(0, Math.min(100, Math.round(model.xp.pct || 0)))}%` },
              })))
        : null)));

  // ── Status badges (game-built trusted html) ──────────────────────────
  if (model.statusBadgesHtml) {
    children.push(h('div', { class: 'poke-status' }, h.raw(model.statusBadgesHtml)));
  }

  // ── Moves (live anchors: .poke-moves direct children, in order) ─────
  if (model.moves) {
    const cells = (model.moveCells || []).map((mv) => {
      if (!mv || mv.empty) return h('div', { class: 'poke-move empty' }, '-');
      const isBar = model.moves === 'bars';
      const dataset = {};
      if (mv.drag) dataset[mv.drag.datasetKey] = mv.drag.value;
      dataset.contextCall = 'openMoveInfo';
      dataset.contextArgs = mv.contextArgs;
      return h('div', {
        // The row itself carries the type class: the charge fill
        // (--charge-color on .pw-charge-move) and the left border then use
        // the EXACT same --type-* colour token everywhere (user feedback).
        class: cx('poke-move',
          mv.typeCls && `type-${mv.typeCls}`,
          isBar && 'charging pw-charge-move',
          isBar && mv.next && 'ready',
          !isBar && mv.drag && 'draggable-move'),
        draggable: mv.drag ? 'true' : undefined,
        dataset,
        title: mv.title || '',
      },
        h('span', { class: 'move-name' }, mv.name),
        h('span', { class: `move-type type-${mv.typeCls}` }, mv.typeLabel),
        mv.effHtml ? h.raw(mv.effHtml) : null);
    });
    children.push(h('div', { class: 'poke-moves' }, ...cells));
  }

  return h('div', {
    class: cx('poke-card pw-poke-card', model.active && 'active', model.fainted && 'fainted', model.extraClass),
  }, ...children);
}

/**
 * HTML string of the complete card (classic adapters via window.PokeUI).
 * @param {Object} model
 * @returns {string}
 */
export function pokeFullCardHTML(model = {}) {
  return toHTMLString(pokeFullCardVNode(model));
}
