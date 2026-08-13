/**
 * PokeWorld UI Design System — Toggle Component
 *
 * Standardized on/off switch control (settings, filters, options).
 * The ONE toggle used everywhere the game needs a boolean control.
 *
 * @module ui/Toggle
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string} [options.label=''] - Text displayed next to the switch
 * @param {boolean} [options.checked=false] - Initial state
 * @param {Function} [options.onChange] - Handler receiving the new boolean state
 * @param {boolean} [options.disabled=false] - Whether the toggle is disabled
 * @param {string} [options.className=''] - Additional CSS classes
 *
 * Events: emits `ui:toggle` on the EventBus with { checked }.
 */
import { eventBus } from '../core/event-bus.js';

let _toggleSeq = 0;

export class Toggle {
  constructor(options = {}) {
    this.label = options.label || '';
    this.checked = Boolean(options.checked);
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    this.disabled = Boolean(options.disabled);
    this.className = options.className || '';
    this.inputId = `pw-toggle-${++_toggleSeq}`;
    this._element = null;
    this._input = null;
  }

  /**
   * Create and return the toggle DOM element (a <label> wrapping input + text).
   * @returns {HTMLLabelElement}
   */
  render() {
    const label = document.createElement('label');
    label.className = `pw-ui-toggle ${this.className}`.trim();
    label.htmlFor = this.inputId;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = this.inputId;
    input.className = 'pw-ui-toggle-input';
    input.checked = this.checked;
    input.disabled = this.disabled;
    input.addEventListener('change', () => {
      this.checked = input.checked;
      if (this.onChange) this.onChange(input.checked);
      eventBus.emit('ui:toggle', { checked: input.checked, id: this.inputId, component: 'Toggle' });
    });

    const track = document.createElement('span');
    track.className = 'pw-ui-toggle-track';
    track.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'pw-ui-toggle-label';
    text.textContent = this.label;

    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(text);

    this._element = label;
    this._input = input;
    return label;
  }

  /**
   * Programmatically set the state (does not fire handlers).
   * @param {boolean} checked
   */
  setChecked(checked) {
    this.checked = Boolean(checked);
    if (this._input) this._input.checked = this.checked;
  }

  /**
   * @returns {boolean}
   */
  isChecked() {
    return this.checked;
  }
}

