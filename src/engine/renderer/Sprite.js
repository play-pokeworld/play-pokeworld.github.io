/**
 * PokeEngine — Sprite Component
 * Image rendering with lazy loading, error handling, pixel-art mode
 */
(function() {
'use strict';

class Sprite {
  /**
   * @param {object} options
   * @param {string} options.src - image URL
   * @param {number} options.w - width (px)
   * @param {number} options.h - height (px)
   * @param {boolean} options.pixelated - enable pixel-art rendering
   * @param {string} options.fallback - fallback text/emoji
   */
  constructor(options = {}) {
    this.src = options.src || '';
    this.w = options.w || 72;
    this.h = options.h || 72;
    this.pixelated = options.pixelated !== false;
    this.fallback = options.fallback || '';
    this._loaded = false;
    this._element = null;
    this._lastSrc = null;
  }

  /**
   * Render sprite to HTML string (for innerHTML usage)
   */
  toHTML() {
    return `<img src="${this.src}" ${this.pixelated ? 'class="pw-img-pixelated" ' : ''}data-style="width:var(--sp-w);height:var(--sp-h);object-fit:contain;" style="--sp-w:${this.w}px;--sp-h:${this.h}px;" 
      onerror="this.style.display='none';this.nextSibling.style.display='inline-flex';" 
      onload="this.style.display='inline-flex';">
      <span data-style="display:none;align-items:center;justify-content:center;width:var(--sp-w);height:var(--sp-h);font-size:20px;" style="--sp-w:${this.w}px;--sp-h:${this.h}px;">${this.fallback}</span>`;
  }

  /**
   * Create a real DOM element
   */
  createElement() {
    const img = document.createElement('img');
    img.src = this.src;
    img.style.cssText = `width:${this.w}px;height:${this.h}px;${
      this.pixelated ? 'image-rendering:pixelated;image-rendering:crisp-edges;' : ''
    }object-fit:contain;transition:opacity 0.2s;`;
    img.alt = '';
    
    const fallbackSpan = document.createElement('span');
    fallbackSpan.textContent = this.fallback;
    fallbackSpan.style.cssText = `display:none;align-items:center;justify-content:center;width:${this.w}px;height:${this.h}px;font-size:20px;`;

    img.onerror = () => { img.style.display = 'none'; fallbackSpan.style.display = 'inline-flex'; };
    img.onload = () => { img.style.display = 'inline-flex'; this._loaded = true; };
    
    const container = document.createElement('div');
    container.style.cssText = `width:${this.w}px;height:${this.h}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
    container.appendChild(img);
    container.appendChild(fallbackSpan);
    
    this._element = container;
    return container;
  }

  /**
   * Update sprite source
   */
  setSrc(src) {
    if (src === this._lastSrc) return;
    this._lastSrc = src;
    this.src = src;
    if (this._element) {
      const img = this._element.querySelector('img');
      if (img) { img.src = src; img.style.display = 'none'; }
    }
    this._loaded = false;
  }

  get element() { return this._element; }
  get loaded() { return this._loaded; }

  /**
   * Static: Create pokemon sprite
   */
  static pokemon(idOrName, variant = 'front', size = 72) {
    const base = 'src/assets/images/pokemon/';
    const dirs = { front: 'front', back: 'front', frontShiny: 'frontShiny', backShiny: 'frontShiny' };
    const dir = dirs[variant] || 'front';
    return new Sprite({ src: `${base}${dir}/${idOrName}.png`, w: size, h: size, pixelated: true, fallback: '?' });
  }

  /**
   * Static: Create item sprite
   */
  static item(key, size = 40) {
    return new Sprite({ src: `src/assets/images/items/${key}.png`, w: size, h: size, pixelated: true, fallback: '📦' });
  }

  /**
   * Static: Create type badge sprite
   */
  static type(name, size = 14) {
    const colors = {
      fire:'#f08030',water:'#6890f0',grass:'#78c850',electric:'#f8d030',
      ice:'#98d8d8',fighting:'#c03028',poison:'#a040a0',ground:'#e0c068',
      flying:'#a890f0',psychic:'#f85888',bug:'#a8b820',rock:'#b8a038',
      ghost:'#705898',dragon:'#7038f8',dark:'#705848',steel:'#b8b8d0',
      fairy:'#ee99ac',normal:'#a8a878'
    };
    const c = colors[name.toLowerCase()] || '#888';
    const el = document.createElement('span');
    el.textContent = name;
    el.style.cssText = `display:inline-block;padding:2px 8px;border-radius:4px;font-size:${size-4}px;font-weight:bold;color:white;background:${c};text-shadow:0 1px 2px rgba(0,0,0,0.3);`;
    return el;
  }
}

window.PokeSprite = Sprite;
if (!window.poke) window.poke = {};
window.poke.Sprite = Sprite;
})();

