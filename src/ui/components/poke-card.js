/**
 * PokéWorld UI — PokeCard (THE single standardized Pokémon card)
 *
 * HARD DESIGN RULE (user requirement): exactly ONE Pokémon card component
 * exists. Every screen that shows a Pokémon summary card — PC box tab,
 * fullscreen unified selector, TM/HM picker, save-icon picker — renders
 * through THIS component, so all Pokémon displays are strictly identical:
 *
 *   ┌────────────────────┐
 *   │   ╭──────╮  ★      │  circular tile + top-right ★ (dex look)
 *   │   │sprite│ [Nv.50] │  level pill UNDER the sprite, styled EXACTLY
 *   │   ╰──────╯         │  like the Pokédex number chip (wave 18)
 *   │  Name              │
 *   │  [badges]          │
 *   │  [action buttons]  │  only usable actions are rendered
 *   └────────────────────┘
 *
 * Wave 18 (user feedback): the PC box must LOOK like the Pokédex — same
 * circular tile + chip language — with the level shown the same way the
 * dex shows its number. The ★ lives top-right of the tile (like
 * .dex-shiny), never inline next to the name anymore.
 *
 * The sprite always goes through the single PokemonSprite component
 * (canonical beige circle, 2 clamped global sizes).
 *
 * Two usage modes:
 *   - pokeCardVNode(model)  → virtual node (ECS views),
 *   - pokeCardHTML(model)   → HTML string (classic adapters — they cannot
 *                             import; they call it through
 *                             window.PokeUI.components.pokeCardHTML).
 *
 * Model:
 * {
 *   entityId,            // optional ECS entity id (data-pw-eid)
 *   title,               // card tooltip
 *   extraClass,          // extra root classes (e.g. save-icon highlight)
 *   shiny,               // shiny styling + ★ tag next to the name
 *   imgSrc, emoji, size, // sprite ('standard' | 'team')
 *   name,                // Pokémon display name
 *   levelLabel,          // pre-formatted ('Nv.50' / 'Lv.50')
 *   badgesHtml,          // optional raw HTML row of status badges
 *   select: { call, callArgs, contextCall, contextArgs } | null,
 *   actions: [{ label, call, callArgs, title, className }] — only USABLE
 *            actions must be passed; unusable ones are never rendered.
 * }
 *
 * @module ui/components/poke-card
 */
import { pokemonSpriteVNode } from './sprite.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/**
 * @param {Object} model
 * @returns {*} virtual node of the canonical Pokémon card
 */
export function pokeCardVNode(model = {}) {
  const select = model.select || {};
  const dataset = {};
  if (select.call) {
    dataset.action = 'legacy-call';
    dataset.call = select.call;
    dataset.callArgs = select.callArgs != null ? select.callArgs : '';
  }
  if (select.contextCall) {
    dataset.contextCall = select.contextCall;
    dataset.contextArgs = select.contextArgs != null ? select.contextArgs : '';
  }
  if (model.entityId != null) dataset.pwEid = String(model.entityId);

  const actions = Array.isArray(model.actions) ? model.actions.filter(Boolean) : [];

  return h('div', {
    class: cx('box-card pw-poke-card', model.shiny && 'box-card--shiny', model.extraClass),
    dataset,
    title: model.title || '',
  },
    h('div', { class: cx('ab-icon box-tile', model.shiny && 'shiny-spark is-shiny') },
      pokemonSpriteVNode({ imgSrc: model.imgSrc, emoji: model.emoji, shiny: !!model.shiny, size: model.size || 'standard' }),
      // Level pill UNDER the sprite — SAME styling hook as the dex number
      // chip (.box-card .box-level / .dex-entry .dex-number share a rule).
      h('div', { class: 'box-level' }, model.levelLabel || ''),
      // Shiny ★ top-right of the tile, exactly like .dex-shiny.
      h('div', { class: cx('box-shiny', model.shiny ? 'is-visible' : 'is-hidden') }, '★')),
    h('div', { class: 'pw-bold pw-text-sm box-name' }, model.name || '?'),
    model.badgesHtml
      ? h('div', { class: 'box-status-badges', dataset: { action: 'stop-propagation' } }, h.raw(model.badgesHtml))
      : null,
    actions.length
      ? h('div', { class: 'box-actions', dataset: { action: 'stop-propagation' } },
          ...actions.map((a) => h('button', {
            type: 'button',
            class: cx('hbtn extracted-bridge-style-013', a.className),
            dataset: { action: 'legacy-call', call: a.call, callArgs: a.callArgs != null ? a.callArgs : '' },
            title: a.title || '',
          }, a.label)))
      : null);
}

/**
 * HTML string of the canonical card (classic adapters via window.PokeUI).
 * @param {Object} model
 * @returns {string}
 */
export function pokeCardHTML(model = {}) {
  return toHTMLString(pokeCardVNode(model));
}
