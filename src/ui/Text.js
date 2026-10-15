/**
 * PokeWorld UI Design System — Text & Label Component
 *
 * Consistent typography component for headings, body text, and helper labels.
 *
 * @module ui/Text
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string} [options.text=''] - Text content
 * @param {string} [options.variant='body'] - Typography variant ('title'|'subtitle'|'body'|'caption'|'help')
 * @param {string} [options.tag='p'] - HTML tag ('h1'|'h2'|'h3'|'p'|'span'|'label')
 * @param {string} [options.color=''] - Optional CSS color string
 * @param {string} [options.className=''] - Additional CSS classes
 */

export class Text {
  constructor(options = {}) {
    this.text = options.text || '';
    this.variant = options.variant || 'body';
    this.tag = options.tag || (this.variant === 'title' ? 'h2' : 'p');
    this.color = options.color || '';
    this.className = options.className || '';
    this._element = null;
  }

  /**
   * Render and return the text element
   * @returns {HTMLElement}
   */
  render() {
    const el = document.createElement(this.tag);
    el.className = `pw-ui-text pw-ui-text--${this.variant} ${this.className}`.trim();
    if (this.color) {
      el.style.color = this.color;
    }
    el.textContent = this.text;
    this._element = el;
    return el;
  }

  setText(newText) {
    this.text = newText;
    if (this._element) {
      this._element.textContent = newText;
    }
  }
}
