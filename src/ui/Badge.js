/**
 * PokeWorld UI Design System — Badge Component
 *
 * Compact label for Pokemon types, statuses, counters, or notifications.
 *
 * @module ui/Badge
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string} [options.text=''] - Label displayed in badge
 * @param {string} [options.variant='default'] - Visual style ('default'|'success'|'warning'|'danger'|'info'|'type')
 * @param {string} [options.color=''] - Optional custom background color
 * @param {string} [options.className=''] - Additional CSS classes
 */

export class Badge {
  constructor(options = {}) {
    this.text = options.text || '';
    this.variant = options.variant || 'default';
    this.color = options.color || '';
    this.className = options.className || '';
    this._element = null;
  }

  /**
   * Render and return the badge element
   * @returns {HTMLSpanElement}
   */
  render() {
    const el = document.createElement('span');
    el.className = `pw-ui-badge pw-ui-badge--${this.variant} ${this.className}`.trim();
    if (this.color) {
      el.style.backgroundColor = this.color;
    }
    el.textContent = this.text;
    this._element = el;
    return el;
  }
}

