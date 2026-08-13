/**
 * PokéWorld UI — opponent trainer card (ECS DS, rebuilt from zero)
 *
 * The card shown above the enemy Pokémon in the battle team row during a
 * champion/gym/quest-trainer fight: sprite tile (role-tinted by class),
 * name, role label and up to 4 style chips.
 *
 * Kept contracts: .trainer-visual-card.role-{role} (role tinted by the
 * existing theme rules 5905+), .trainer-sprite-placeholder (sprite
 * fragment inside), .trainer-style-row > em chips.
 *
 * Model (shaped and localized by battle-team-ui.js):
 * { role, spriteHtml, name, roleLabel, styleLabels: [label…] }
 *
 * @module ui/components/trainer-card
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

export function trainerCardVNode(m) {
  return h('div', { class: `trainer-visual-card role-${String(m.role || 'trainer').toLowerCase()}` },
    h('div', { class: 'trainer-sprite-placeholder' }, h.raw(m.spriteHtml || '')),
    h('div', null,
      h('b', null, m.name || ''),
      h('span', null, m.roleLabel || ''),
      h('div', { class: 'trainer-style-row' },
        ...(m.styleLabels || []).slice(0, 4).map((label) => h('em', null, label)))));
}

/** String serialization for the classic adapter (battle-team-ui.js). */
export function trainerCardHTML(m) {
  return toHTMLString(trainerCardVNode(m));
}

