/**
 * @file BallDescription.js
 * @brief Description of a ball in the picker (C++: class BallDescription, static), port of the
 * original ballOptionDesc() / ItemEngine ball sentence:
 * "Catch rate: X%" · flavour text of the item.
 */

import { ItemDB } from '../../data/items/ItemDB.js';
import { BallRules } from '../../config/BallRules.js';
import { compose, t } from '../../localization/LocalizationManager.js';
import { ItemDescription } from '../../data/items/ItemDescription.js';

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
    const flavour = ItemDescription.of(ballId);
    if (flavour) parts.push(flavour);
    // compose() keeps the key of each part: the description follows a language change.
    return compose(parts[0], t('ball_desc_separator'), parts[1] || '');
  }
}
