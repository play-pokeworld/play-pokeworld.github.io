/**
 * @file BallSlotIcon.js
 * @brief Picture of the ball of a filter, the "none" slot when no ball is set
 * (C++: class BallSlotIcon : public UIImage).
 */

import { UIImage } from '../../ui/UIImage.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { t } from '../../localization/LocalizationManager.js';

/** Sprite of the empty slot (original src/assets/images/pokeball/None.svg). */
const NO_BALL_SPRITE = 'None';

export class BallSlotIcon extends UIImage {
  /**
   * @param {string} ballId - Ball item id or BallRules.NO_BALL
   * @param {string} [size='md'] - 'md' (22 px, panel / editor) | 'lg' (26 px, picker)
   */
  constructor(ballId, size = 'md') {
    const ball = ItemDB.getInstance().getById(ballId)?.ball;
    super({
      src: AssetPaths.pokeball(ball ? ball.sprite : NO_BALL_SPRITE),
      alt: ball ? t(`item.${ballId}.name`) : t('ball_no_ball'),
      className: `pw-ball-icon pw-ball-icon--${size}`,
      pixelated: true,
      name: 'BallSlotIcon'
    });
  }
}
