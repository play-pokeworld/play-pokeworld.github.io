/**
 * @file BallDescription.js
 * @brief Description of a ball in the picker (C++: class BallDescription, static), port of the
 * original ballOptionDesc() / ItemEngine ball sentence:
 * "Catch rate: X%" · flavour text of the item.
 */

import { ItemDB } from '../../data/items/ItemDB.js';
import { BallRules } from '../../config/BallRules.js';
import { LocalizationManager, t } from '../../localization/LocalizationManager.js';

export class BallDescription {
  /**
   * @param {string} ballId - Ball item id or BallRules.NO_BALL
   * @returns {string}
   */
  static describe(ballId) {
    if (ballId === BallRules.NO_BALL) return t('ball_no_ball_desc');
    const ball = ItemDB.getInstance().getById(ballId)?.ball;
    if (!ball) return '';
    const parts = [t('ball_catch_rate', { rate: ball.rate })];
    const flavourKey = `item.${ballId}.desc`;
    if (LocalizationManager.getInstance().has(flavourKey)) parts.push(t(flavourKey));
    return parts.filter(Boolean).join(t('ball_desc_separator'));
  }
}
