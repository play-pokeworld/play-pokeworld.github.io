/**
 * @file UIBadgeCard.js
 * @brief Card of a badge or league title (original badges-panel getBadgeImgHtml + card markup):
 * emblem picture glowing in its own colour once obtained, greyed out otherwise, then text lines.
 * The colour is data (TrainerDB / LeagueDB badgeColor); it only reaches CSS through
 * the --pw-badge-color custom property.
 */
import { UIContainer } from './UIContainer.js';
import { UIImage } from './UIImage.js';
import { UIText } from './UIText.js';

/** Layouts of the card (CSS modifier classes). */
export const BadgeCardLayouts = Object.freeze({
  /** Gym badge: column, 48 px emblem. */
  BADGE: 'pw-badge-card',
  /** League title: row, 40 px trophy. */
  LEAGUE: 'pw-league-card'
});

export class UIBadgeCard extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} options.image - Emblem path (AssetPaths.badge)
   * @param {string} options.title
   * @param {string[]} [options.lines=[]] - Secondary lines, in order
   * @param {string} [options.status=''] - Last line (league: beaten / not beaten)
   * @param {boolean} options.obtained
   * @param {string|null} [options.color=null] - Glow / border colour once obtained
   * @param {string} [options.layout=BadgeCardLayouts.BADGE]
   */
  constructor({ image, title, lines = [], status = '', obtained, color = null, layout = BadgeCardLayouts.BADGE }) {
    super({ className: layout, name: 'UIBadgeCard' });
    this.toggleClass('obtained', obtained);
    this.toggleClass('locked', !obtained);
    if (color) this._setCssVariable('--pw-badge-color', color);
    const text = new UIContainer({ className: 'pw-badge-card-text' });
    text.addChild(new UIText({ tagName: 'div', className: 'pw-badge-card-title', text: title }));
    lines.forEach((line, index) => text.addChild(new UIText({ tagName: 'div', className: `pw-badge-card-line pw-badge-card-line-${index + 1}`, text: line })));
    if (status) text.addChild(new UIText({ tagName: 'div', className: 'pw-badge-card-status', text: status }));
    this.addChildren([
      new UIContainer({ className: 'pw-badge-emblem', children: [new UIImage({ src: image, alt: title, className: 'pw-badge-emblem-img' })] }),
      text
    ]);
  }
}
