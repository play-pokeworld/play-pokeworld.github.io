/**
 * PokéWorld UI — « Rejoindre le Discord » (V7-R1 · retours joueurs #4)
 *
 * Un seul composant pour les deux emplacements demandés (Réglages et menu
 * principal des sauvegardes) : un lien externe stylé comme un bouton, ouvert
 * dans un nouvel onglet (`rel="noopener noreferrer"`), avec le glyphe Discord
 * en SVG inline (aucune ressource distante).
 *
 * @module ui/components/discord-link
 */
import { h } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

const DISCORD_GLYPH_PATH =
  'M19.54 5.3A17.3 17.3 0 0 0 15.3 4a12 12 0 0 0-.55 1.13 16 16 0 0 0-4.8 0A12 12 0 0 0 9.4 4a17.3 17.3 0 0 0-4.25 1.3C2.45 9.3 1.72 13.2 2.08 17a17.4 17.4 0 0 0 5.2 2.63 12.8 12.8 0 0 0 1.12-1.82 11.3 11.3 0 0 1-1.76-.85l.43-.34a12.4 12.4 0 0 0 10.6 0l.43.34c-.56.33-1.15.62-1.76.85.33.64.7 1.25 1.12 1.82A17.3 17.3 0 0 0 22.66 17c.43-4.4-.73-8.26-3.12-11.7ZM9.1 14.66c-1.02 0-1.86-.93-1.86-2.08s.82-2.08 1.86-2.08c1.05 0 1.88.94 1.86 2.08 0 1.15-.82 2.08-1.86 2.08Zm6.84 0c-1.02 0-1.86-.93-1.86-2.08s.82-2.08 1.86-2.08c1.05 0 1.88.94 1.86 2.08 0 1.15-.82 2.08-1.86 2.08Z';

export function discordGlyphVNode() {
  return h(
    'svg',
    {
      class: 'pw-discord-glyph',
      viewBox: '0 0 24 24',
      width: '18',
      height: '18',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    h('path', { d: DISCORD_GLYPH_PATH, fill: 'currentColor' })
  );
}

/**
 * @param {string} url      lien d'invitation (data/game-config.js → DISCORD_URL)
 * @param {string} label    libellé localisé (t('discord_join_btn'))
 * @param {string} [cls]    classe(s) additionnelle(s)
 */
export function discordLinkVNode(url, label, cls) {
  if (!url) return null;
  return h(
    'a',
    {
      // Pas de `hbtn` : dans les Réglages, `#settings-inner .hbtn` aplatit la
      // couleur (!important) ; le bouton Discord garde sa teinte officielle.
      class: cx('pw-discord-btn', cls),
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      dataset: { pwExternal: 'discord' },
    },
    discordGlyphVNode(),
    h('span', { class: 'pw-discord-label' }, label || '')
  );
}
