/**
 * PokeEngine — Badge Component
 * Reusable colored badge for types, status effects, categories
 */
(function() {
'use strict';

class Badge {
  static COLORS = {
    // Types
    bug: '#92BD2D', dark: '#595761', dragon: '#0C6AC8',
    electric: '#F2D94E', fairy: '#EF90E6', fighting: '#D3425F',
    fire: '#FBA64C', flying: '#A1BBEC', ghost: '#5F6DBC',
    grass: '#60BE58', ground: '#DA7C4D', ice: '#76D1C1',
    normal: '#A0A29F', poison: '#B763CF', psychic: '#FA8582',
    rock: '#C9BC8A', steel: '#5795A3', water: '#539DDF',
    // Status
    burn: '#FBA64C', freeze: '#76D1C1', paralysis: '#F2D94E',
    poisoned: '#B763CF', sleep: '#A0A29F', confused: '#FA8582',
    // Other
    shiny: '#FF4444', locked: '#888', boost: '#60BE58',
    penalty: '#D3425F', special: '#B763CF',
  };

  /**
   * @param {object} options
   * @param {string} options.text - badge text
   * @param {string} options.type - type name ('fire','water',etc) for auto-color
   * @param {string} options.color - explicit color override
   * @param {string} options.size - 'sm'|'md'|'lg'
   * @param {boolean} options.bold
   */
  constructor(options = {}) {
    this.text = options.text || '';
    this.type = (options.type || '').toLowerCase();
    this.color = options.color || Badge.COLORS[this.type] || '#888';
    this.size = options.size || 'sm';
    this.bold = options.bold !== false;
    this.className = options.className || '';
    this._element = null;
  }

  toHTML() {
    const sizes = { sm: '9px', md: '11px', lg: '13px' };
    const pads = { sm: '2px 6px', md: '3px 10px', lg: '4px 14px' };
    const fs = sizes[this.size] || '10px';
    const pd = pads[this.size] || '2px 6px';
    return `<span class="poke-badge ${this.className}" data-style="display:inline-block;padding:var(--badge-pd);border-radius:4px;font-size:var(--badge-fs);
      font-weight:${this.bold ? 'bold' : '400'};color:white;background:var(--badge-bg);
      text-shadow:0 1px 2px rgba(0,0,0,0.3);${['electric','normal','ground'].includes(this.type) ? 'color:#222;' : ''}" style="--badge-pd:${pd};--badge-fs:${fs};--badge-bg:${this.color};">
      ${this.text}</span>`;
  }

  createElement() {
    const el = document.createElement('span');
    el.className = 'poke-badge' + (this.className ? ' ' + this.className : '');
    el.textContent = this.text;
    const sizes = { sm: '9px', md: '11px', lg: '13px' };
    const pads = { sm: '2px 6px', md: '3px 10px', lg: '4px 14px' };
    el.style.cssText = `display:inline-block;padding:${pads[this.size]||'2px 6px'};border-radius:4px;font-size:${sizes[this.size]||'10px'};
      font-weight:${this.bold ? 'bold' : '400'};color:white;background:${this.color};
      text-shadow:0 1px 2px rgba(0,0,0,0.3);`;
    if (['electric','normal','ground'].includes(this.type)) el.style.color = '#222';
    this._element = el;
    return el;
  }

  setText(text) { this.text = text; if (this._element) this._element.textContent = text; }

  get element() { return this._element; }

  // ─── Factory methods ───
  static type(name, size) { return new Badge({ text: name, type: name, size }); }
  static status(name, size) { 
    const map = { burn:'fire', freeze:'ice', paralysis:'electric', poisoned:'poison', sleep:'normal', confused:'psychic' };
    return new Badge({ text: name, type: map[name.toLowerCase()] || name, size });
  }
  static shiny() { return new Badge({ text: '★ CHROMATIQUE', type: 'shiny', size: 'sm' }); }
}

window.PokeBadge = Badge;
if (!window.poke) window.poke = {};
window.poke.Badge = Badge;
})();
