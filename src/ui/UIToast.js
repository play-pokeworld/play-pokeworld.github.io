/**
 * @file UIToast.js
 * @brief Notification card (C++ equivalent: class UIToast : public UIElement).
 * Layout: optional badge + rich-text message on the left, close button or timer tag on the right.
 * Visual state is class-driven: .is-visible (enter), .is-leaving (exit), .pw-toast--tone-<tone>.
 */

import { UIElement } from './UIElement.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIButton } from './UIButton.js';

export class UIToast extends UIElement {
  /**
   * @param {Object} options
   * @param {string} options.message              - Localized template (TextFormatter markup allowed)
   * @param {string} [options.variant='normal']   - Adds .pw-toast-<variant>
   * @param {string} [options.tone='success']     - Adds .pw-toast--tone-<tone>
   * @param {{text: string, className: string}|null} [options.badge=null] - Small label above the message
   * @param {string} [options.timerLabel='']      - Shown instead of the close button when set
   * @param {string} [options.closeLabel='']      - Tooltip / aria-label of the close button
   * @param {Function} [options.onClose=null]
   */
  constructor(options = {}) {
    super({
      className: `pw-toast-card pw-toast-${options.variant || 'normal'} pw-toast--tone-${options.tone || 'success'}`,
      name: 'UIToast'
    });

    const content = new UIContainer({ className: 'pw-toast-content' });
    if (options.badge) {
      const top = new UIContainer({ className: 'pw-toast-top' });
      top.addChild(new UIText({ text: options.badge.text, className: `pw-toast-badge ${options.badge.className || ''}`.trim() }));
      content.addChild(top);
    }
    content.addChild(new UIText({ tagName: 'div', className: 'pw-toast-body', richText: options.message }));
    this.addChild(content);

    const action = new UIContainer({ className: 'pw-toast-action' });
    if (options.timerLabel) {
      action.addChild(new UIText({ text: options.timerLabel, className: 'pw-toast-timer-tag' }));
    } else {
      const close = new UIButton({
        icon: 'close',
        className: 'pw-toast-close',
        onClick: (event) => {
          event.stopPropagation();
          if (options.onClose) options.onClose();
        }
      });
      close.setTooltip(options.closeLabel || '');
      close.setAriaLabel(options.closeLabel || '');
      action.addChild(close);
    }
    this.addChild(action);
  }

  /** Plays the enter transition (next frame, so that the initial state is rendered first). */
  playEnter() {
    const schedule = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
    schedule(() => this.addClass('is-visible'));
  }

  /**
   * Plays the leave transition then destroys the toast.
   * @param {number} durationMs - Must match the CSS transition
   */
  playLeave(durationMs) {
    this.removeClass('is-visible');
    this.addClass('is-leaving');
    setTimeout(() => this.destroy(), durationMs);
  }
}
