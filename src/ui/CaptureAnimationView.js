/**
 * @file CaptureAnimationView.js
 * @brief Two-phase capture animation overlay, driven by a typed domain event.
 */

import { UIContainer } from './UIContainer.js';
import { UIImage } from './UIImage.js';
import { UIText } from './UIText.js';
import { CaptureAttemptResolvedEvent } from '../core/events/CaptureAttemptResolvedEvent.js';
import { CaptureAnimationRules } from '../config/CaptureAnimationRules.js';
import { AnimationPreferences } from '../config/AnimationPreferences.js';
import { PreferencesSystem } from '../systems/PreferencesSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { t } from '../localization/LocalizationManager.js';

export class CaptureAnimationView extends UIContainer {
  constructor() {
    super({ id: 'pw-capture-anim', className: 'pw-capture-overlay', name: 'CaptureAnimationView' });
    this._phaseTimer = null;
    this._hideTimer = null;
    this._ball = new UIImage({ className: 'pw-ca-ball', alt: '', pixelated: true });
    this._rate = new UIText({ tagName: 'span', className: 'pw-ca-rate' });
    this._result = new UIText({ tagName: 'span', className: 'pw-ca-label' });
    this.addChildren([this._ball, this._rate, this._result]);
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-atomic', 'true');
    this.setData('phase', 'chance');
    this.hide();
    this.listen(CaptureAttemptResolvedEvent, (event) => this._play(event));
  }

  /** @private @param {CaptureAttemptResolvedEvent} event */
  _play(event) {
    this._clearTimers();
    const enabled = PreferencesSystem.getInstance().getAnimationPreference(AnimationPreferences.CAPTURE);
    if (enabled) {
      this._ball.setSource(ItemDB.getInstance().getImagePath(event.ballId));
      this._rate.setText(t('ball_catch_chance', { rate: Math.round(event.rate) }));
    } else {
      this._ball.setSource('');
    }
    this._result.setText(t(event.caught ? 'ball_catch_success' : 'ball_catch_fail'));
    this.toggleClass('is-caught', event.caught);
    this.toggleClass('is-escape', !event.caught);
    this.toggleClass('is-motion-disabled', !enabled);
    this.setData('phase', enabled ? 'chance' : 'result');
    this._positionAtOpponent();
    this.show();

    if (enabled) {
      this._phaseTimer = setTimeout(() => {
        this.setData('phase', 'result');
      }, CaptureAnimationRules.RESULT_PHASE_MS);
    }
    this._hideTimer = setTimeout(() => this.hide(), CaptureAnimationRules.TRANSITION_MS);
  }

  /** @private Position the verdict over the wild Pokémon card, as in the original view. */
  _positionAtOpponent() {
    const panel = document.getElementById('battle-center-panel');
    const row = document.getElementById('battle-team-row');
    const card = row?.querySelector('.pw-enemy-card') || row?.querySelector('.poke-card');
    if (!panel || !card || typeof panel.getBoundingClientRect !== 'function' || typeof card.getBoundingClientRect !== 'function') {
      this.addClass('is-viewport-fixed');
      this._setCssVariable('--pw-capture-x', '50%');
      this._setCssVariable('--pw-capture-y', '40%');
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const viewportWidth = Number(document.documentElement?.clientWidth) || 0;
    const viewportHeight = Number(document.documentElement?.clientHeight) || 0;
    const cardVisible = cardRect.width > 0 && cardRect.height > 0
      && cardRect.right > 0 && cardRect.left < viewportWidth
      && cardRect.bottom > 0 && cardRect.top < viewportHeight;
    if (!cardVisible) {
      // The dashboard can scroll the battle column completely out of view while
      // the Route 1 action remains visible. Keep the capture verdict on screen.
      this.addClass('is-viewport-fixed');
      this._setCssVariable('--pw-capture-x', '50%');
      this._setCssVariable('--pw-capture-y', '40%');
      return;
    }
    this.removeClass('is-viewport-fixed');
    this._setCssVariable('--pw-capture-x', `${Math.round(cardRect.left + cardRect.width / 2 - panelRect.left + (panel.scrollLeft || 0))}px`);
    this._setCssVariable('--pw-capture-y', `${Math.round(cardRect.top + cardRect.height / 2 - panelRect.top + (panel.scrollTop || 0))}px`);
  }

  /** @private */
  _clearTimers() {
    if (this._phaseTimer !== null) clearTimeout(this._phaseTimer);
    if (this._hideTimer !== null) clearTimeout(this._hideTimer);
    this._phaseTimer = null;
    this._hideTimer = null;
  }

  /** @override */
  onDestroy() {
    this._clearTimers();
    super.onDestroy();
  }
}
