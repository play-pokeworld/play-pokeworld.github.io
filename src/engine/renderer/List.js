/**
 * PokeEngine — List & Dropdown Component
 * Select dropdowns, item lists, grid views
 */
(function() {
'use strict';

class Select {
  /**
   * @param {object} options
   * @param {Array<{value:string,label:string,disabled?:boolean}>} options.options
   * @param {string} options.value - selected value
   * @param {function} options.onChange - change handler
   * @param {string} options.className
   */
  constructor(options = {}) {
    this.options = options.options || [];
    this.value = options.value || '';
    this.onChange = options.onChange || null;
    this.className = options.className || '';
    this.placeholder = options.placeholder || '';
    this._element = null;
  }

  toHTML() {
    const opts = this.options.map(o => 
      `<option value="${o.value}" ${o.value === this.value ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}>${o.label}</option>`
    ).join('');
    return `<select class="poke-select ${this.className}" data-style="background:rgba(0,0,0,0.24);color:var(--light2);border:1px solid rgba(236,222,183,0.16);border-radius:10px;padding:8px 10px;min-height:36px;">
      ${this.placeholder ? `<option value="">${this.placeholder}</option>` : ''}
      ${opts}
    </select>`;
  }

  createElement() {
    const sel = document.createElement('select');
    sel.className = 'poke-select' + (this.className ? ' ' + this.className : '');
    sel.style.cssText = 'background:rgba(0,0,0,0.24);color:var(--light2);border:1px solid rgba(236,222,183,0.16);border-radius:10px;padding:8px 10px;min-height:36px;';
    
    if (this.placeholder) {
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = this.placeholder;
      sel.appendChild(ph);
    }
    
    for (const opt of this.options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.disabled) o.disabled = true;
      if (opt.value === this.value) o.selected = true;
      sel.appendChild(o);
    }
    
    if (this.onChange) sel.addEventListener('change', (e) => this.onChange(e, sel.value));
    
    this._element = sel;
    return sel;
  }

  setValue(val) { this.value = val; if (this._element) this._element.value = val; }
  getValue() { return this._element ? this._element.value : this.value; }
  get element() { return this._element; }
}

/**
 * Grid list for items, pokemon, moves
 */
class Grid {
  /**
   * @param {object} options
   * @param {Array} options.items - data items
   * @param {function} options.renderItem - fn(item) => HTML string or element
   * @param {number} options.columns - grid columns
   * @param {number} options.gap - gap in px
   * @param {function} options.onItemClick
   */
  constructor(options = {}) {
    this.items = options.items || [];
    this.renderItem = options.renderItem || (() => '');
    this.columns = options.columns || 4;
    this.gap = options.gap || 10;
    this.onItemClick = options.onItemClick || null;
    this._element = null;
  }

  render() {
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${this.columns},1fr);gap:${this.gap}px;padding:${this.gap}px;`;
    grid.className = 'poke-grid';
    
    for (const item of this.items) {
      const content = this.renderItem(item);
      if (typeof content === 'string') {
        const div = document.createElement('div');
        div.innerHTML = content;
        const child = div.firstElementChild;
        if (child) {
          if (this.onItemClick) child.addEventListener('click', (e) => this.onItemClick(item, e));
          grid.appendChild(child);
        }
      } else if (content instanceof HTMLElement) {
        if (this.onItemClick) content.addEventListener('click', (e) => this.onItemClick(item, e));
        grid.appendChild(content);
      }
    }
    
    this._element = grid;
    return grid;
  }

  refresh(items) {
    this.items = items || this.items;
    if (this._element) {
      this._element.innerHTML = '';
      this.render();
    }
  }

  get element() { return this._element; }
}

window.PokeSelect = Select;
window.PokeGrid = Grid;
if (!window.poke) window.poke = {};
window.poke.Select = Select;
window.poke.Grid = Grid;
})();

