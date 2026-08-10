/**
 * PokéWorld UI — PokemonSprite (THE single Pokémon display component)
 *
 * The one and only way to display a Pokémon sprite in the game. Every
 * screen (bag, box, team, battle, selectors, presets, dex...) MUST build
 * its sprites through this component, which guarantees:
 *   - a rigorously identical background everywhere (canonical SOLID DARK
 *     disc — theme token --pw-bg-sprite, DS2807 — always darker than the
 *     theme surface, visible on any backdrop, no light/dark mix-up),
 *   - at most TWO global sizes: 'team' (Équipe/Combat, 104px) and
 *     'standard' (everything else, 72px, waves 15+17) — any other size
 *     token is clamped. The <img> ALWAYS carries .sprite-img so the DS
 *     size caps apply (wave 17: without it the img rendered at its
 *     natural PNG size and overflowed the circle — broken PC box).
 *
 * @module ui/components/sprite
 */
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { h, cx, entityDataset } from './component-utils.js';
import { spriteSizeFor } from './theme.js';

/** @returns {string[]} The only two allowed sprite size tokens. */
export const POKEMON_SPRITE_SIZES = Object.freeze(['standard', 'team']);

/**
 * Create a Pokémon sprite entity.
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} props
 * @param {string} [props.imgSrc] Resolved sprite URL (empty → emoji fallback).
 * @param {string} [props.emoji] Emoji fallback when no sprite URL.
 * @param {string} [props.alt] Accessible name.
 * @param {boolean} [props.shiny=false] Shiny ring.
 * @param {'standard'|'team'} [props.size='standard'] Clamped to the 2 tokens.
 * @param {(event:*, entity:*) => void} [props.onClick] Makes the sprite clickable.
 * @param {string} [props.action] Legacy attribute-dispatch action name.
 * @param {string[]} [props.actionArgs]
 * @param {string} [props.className]
 * @param {string} [props.imgClass] Extra class on the <img> (e.g. silhouette filter).
 * @param {Object} [props.parent]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createPokemonSprite(scene, props = {}) {
  const size = spriteSizeFor(props.size); // clamps to 72 / 104 px
  const entity = scene.spawn('ui:pokemon-sprite', [], props.parent || undefined);

  const interactive = new UIInteractiveComponent({
    onClick: props.onClick || null,
    disabled: !!props.disabled,
    hideWhenDisabled: props.hideWhenDisabled !== false,
    action: props.action || null,
    actionArgs: props.actionArgs || null,
  });
  entity.addComponent(interactive);

  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => {
      const inter = e.get(UIInteractiveComponent);
      if (inter.renderHidden) return null;
      const dataset = { ...entityDataset(e) };
      if (inter.action) dataset.action = inter.action;
      return h('span', {
        class: cx('pw-poke-circle-wrap', props.className),
        style: { width: `${size}px`, height: `${size}px` },
        dataset,
        'aria-label': props.alt || null,
      },
        h('span', { class: 'pw-poke-circle-bg' }),
        props.imgSrc
          ? h('img', { class: cx('pw-poke-circle-img sprite-img', props.imgClass || null), src: props.imgSrc, alt: props.alt || '', loading: 'lazy' })
          : h('span', { class: 'pw-poke-circle-emoji' }, props.emoji || '❓'),
        props.shiny ? h('span', { class: 'pw-poke-circle-shiny' }) : null);
    },
  }));
  return entity;
}

/**
 * Standalone vnode variant (no entity) for read-only sprite displays inside
 * cards — identical markup, same canonical background and size clamp.
 * @param {Object} props Same visual props as createPokemonSprite.
 * @returns {*} vnode
 */
export function pokemonSpriteVNode(props = {}) {
  const size = spriteSizeFor(props.size);
  const dataset = {};
  if (props.action) dataset.action = props.action;
  if (props.call) dataset.call = props.call;
  if (props.callArgs != null) dataset.callArgs = props.callArgs;
  return h('span', {
    class: cx('pw-poke-circle-wrap', props.className),
    style: { width: `${size}px`, height: `${size}px` },
    dataset,
  },
    h('span', { class: 'pw-poke-circle-bg' }),
    props.imgSrc
      ? h('img', { class: cx('pw-poke-circle-img sprite-img', props.imgClass || null), src: props.imgSrc, alt: props.alt || '', loading: 'lazy' })
      : h('span', { class: 'pw-poke-circle-emoji' }, props.emoji || '❓'),
    props.shiny ? h('span', { class: 'pw-poke-circle-shiny' }) : null);
}
