/**
 * PokeWorld UI Design System — WriteBox Component
 *
 * Universal interactive input box for filtering PC boxes, bag, dictionary,
 * or renaming presets. Includes placeholder, clear button (✕), and EventBus emission.
 *
 * @module ui/WriteBox
 */
import { eventBus } from '../core/event-bus.js';

export class WriteBox {
  /**
   * @param {Object} options
   * @param {string} [options.value=''] - Initial input value
   * @param {string} [options.placeholder=''] - Placeholder text
   * @param {boolean} [options.clearable=true] - Whether to show clear (✕) button
   * @param {Function} [options.onInput] - Callback fired on text input
   * @param {Function} [options.onClear] - Callback fired when cleared
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    this.value = options.value || '';
    this.placeholder = options.placeholder || '';
    this.clearable = options.clearable !== false;
    this.onInput = typeof options.onInput === 'function' ? options.onInput : null;
    this.onClear = typeof options.onClear === 'function' ? options.onClear : null;
    this.className = options.className || '';
    this._element = null;
    this._inputElement = null;
  }

  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-writebox ${this.className}`.trim();

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'pw-ui-writebox-input';
    inp.value = this.value;
    inp.placeholder = this.placeholder;

    inp.addEventListener('input', (e) => {
      this.value = inp.value;
      eventBus.emit('input:select', { target: inp, value: this.value });
      if (this.onInput) this.onInput(this.value, e);
    });

    el.appendChild(inp);
    this._inputElement = inp;

    if (this.clearable) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'pw-ui-writebox-clear';
      clearBtn.textContent = '✕';
      clearBtn.addEventListener('click', () => {
        inp.value = '';
        this.value = '';
        eventBus.emit('input:select', { target: clearBtn, cleared: true });
        if (this.onClear) this.onClear();
        if (this.onInput) this.onInput('', null);
      });
      el.appendChild(clearBtn);
    }

    this._element = el;
    return el;
  }

  setValue(val) {
    this.value = String(val || '');
    if (this._inputElement) {
      this._inputElement.value = this.value;
    }
  }

  getValue() {
    return this.value;
  }
}
