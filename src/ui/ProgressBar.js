/**
 * PokeWorld UI Design System — ProgressBar Component
 *
 * Progress indicator for HP bars, XP bars, breeding, or mining timers.
 *
 * @module ui/ProgressBar
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {number} [options.value=0] - Current progress value (0 to max)
 * @param {number} [options.max=100] - Maximum progress value
 * @param {string} [options.variant='default'] - Bar variant ('default'|'hp'|'xp'|'timer')
 * @param {string} [options.label=''] - Optional text displayed inside bar
 * @param {boolean} [options.showPercentage=false] - Whether to show percentage text
 * @param {string} [options.className=''] - Additional CSS classes
 */

export class ProgressBar {
  constructor(options = {}) {
    this.value = Number(options.value) || 0;
    this.max = Number(options.max) || 100;
    this.variant = options.variant || 'default';
    this.label = options.label || '';
    this.showPercentage = Boolean(options.showPercentage);
    this.className = options.className || '';
    this._element = null;
    this._fillElement = null;
    this._labelElement = null;
  }

  /**
   * Render and return the progress bar element
   * @returns {HTMLElement}
   */
  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-progress pw-ui-progress--${this.variant} ${this.className}`.trim();

    const fill = document.createElement('div');
    fill.className = 'pw-ui-progress-fill';
    const percent = Math.min(100, Math.max(0, (this.value / (this.max || 1)) * 100));
    fill.style.width = `${percent}%`;
    el.appendChild(fill);
    this._fillElement = fill;

    if (this.label || this.showPercentage) {
      const label = document.createElement('span');
      label.className = 'pw-ui-progress-label';
      label.textContent = this.label || `${Math.round(percent)}%`;
      el.appendChild(label);
      this._labelElement = label;
    }

    this._element = el;
    return el;
  }

  setValue(value, max = null) {
    this.value = Number(value) || 0;
    if (max !== null) this.max = Number(max) || 100;
    if (this._fillElement) {
      const percent = Math.min(100, Math.max(0, (this.value / (this.max || 1)) * 100));
      this._fillElement.style.width = `${percent}%`;
      if (this._labelElement && this.showPercentage) {
        this._labelElement.textContent = `${Math.round(percent)}%`;
      }
    }
  }
}
