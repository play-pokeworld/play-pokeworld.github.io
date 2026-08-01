/**
 * PokeEngine — Panel Component
 * Modal windows, drawers, tooltips — all unified
 */
(function() {
'use strict';

class Panel {
  /**
   * @param {object} options
   * @param {string} options.title - panel title
   * @param {string|HTMLElement} options.content - body content
   * @param {string} options.variant - 'modal'|'drawer'|'tooltip'|'popover'
   * @param {number} options.w - width
   * @param {number} options.h - height
   * @param {boolean} options.closable - show close button
   * @param {function} options.onClose - close handler
   * @param {boolean} options.overlay - show dark overlay
   */
  constructor(options = {}) {
    this.title = options.title || '';
    this.content = options.content || '';
    this.variant = options.variant || 'modal';
    this.w = options.w || 480;
    this.h = options.h || 0;
    this.closable = options.closable !== false;
    this.onClose = options.onClose || null;
    this.overlay = options.overlay !== false;
    this.className = options.className || '';
    this._element = null;
    this._overlayEl = null;
    this._open = false;
  }

  open() {
    if (this._open) return;
    this._open = true;
    
    // Overlay
    if (this.overlay) {
      this._overlayEl = document.createElement('div');
      this._overlayEl.className = 'poke-overlay';
      this._overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:900;display:flex;align-items:center;justify-content:center;';
      this._overlayEl.addEventListener('click', (e) => { if (e.target === this._overlayEl) this.close(); });
      document.body.appendChild(this._overlayEl);
    }

    const container = this._overlayEl || document.body;
    const panel = document.createElement('div');
    panel.className = 'poke-panel poke-panel--' + this.variant + (this.className ? ' ' + this.className : '');
    
    const baseStyle = `background:var(--dark2);border:1px solid var(--dark3);border-radius:12px;max-width:${this.w}px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.6);color:var(--light2);`;
    if (this.h) panel.style.cssText = baseStyle + `height:${this.h}px;`;
    else panel.style.cssText = baseStyle;

    // Title bar
    if (this.title) {
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--dark3);font-size:15px;font-weight:bold;';
      
      const titleEl = document.createElement('span');
      titleEl.textContent = this.title;
      header.appendChild(titleEl);
      
      if (this.closable) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'background:none;border:none;color:var(--light2);font-size:18px;cursor:pointer;padding:4px;';
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);
      }
      
      panel.appendChild(header);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'poke-panel-body';
    body.style.cssText = 'padding:16px;';
    
    if (typeof this.content === 'string') {
      body.innerHTML = this.content;
    } else if (this.content instanceof HTMLElement) {
      body.appendChild(this.content);
    }
    panel.appendChild(body);

    if (this._overlayEl) this._overlayEl.appendChild(panel);
    else container.appendChild(panel);
    
    this._element = panel;
    this._trigger('open');
  }

  close() {
    if (!this._open) return;
    this._open = false;
    if (this._element) this._element.remove();
    if (this._overlayEl) this._overlayEl.remove();
    this._trigger('close');
    if (this.onClose) this.onClose();
  }

  _trigger(name) {
    if (window.poke?.EventBus) {
      const bus = new window.poke.EventBus();
      // We don't have access to the engine here, so we'll dispatch a DOM event
      document.dispatchEvent(new CustomEvent('poke:panel:' + name, { detail: { panel: this } }));
    }
  }

  setContent(content) {
    this.content = content;
    if (this._element) {
      const body = this._element.querySelector('.poke-panel-body');
      if (body) {
        body.innerHTML = '';
        if (typeof content === 'string') body.innerHTML = content;
        else if (content instanceof HTMLElement) body.appendChild(content);
      }
    }
  }

  isOpen() { return this._open; }
  get element() { return this._element; }

  // ─── Quick factories ───
  static modal(title, content, options) {
    return new Panel(Object.assign({ title, content, variant: 'modal', w: 520 }, options));
  }
  static tooltip(content, x, y) {
    const p = new Panel({ content, variant: 'tooltip', w: 200, closable: false, overlay: false });
    p._x = x; p._y = y;
    return p;
  }
}

window.PokePanel = Panel;
if (!window.poke) window.poke = {};
window.poke.Panel = Panel;
})();

