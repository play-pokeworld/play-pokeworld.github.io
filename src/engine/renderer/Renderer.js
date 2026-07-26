/**
 * PokeEngine — Renderer
 * 
 * Virtual DOM-style renderer for game UI.
 * Renders entities with 'Display' components as HTML.
 * Supports layers, visibility, z-index.
 */
(function() {
'use strict';

class Renderer {
  constructor(options = {}) {
    this.container = options.container || document.createElement('div');
    this._engine = null;
    this._layers = new Map();   // name -> { zIndex, element }
    this._viewport = { width: window.innerWidth, height: window.innerHeight };
    this._dirty = true;
    
    // Auto-create default layers
    this.createLayer('bg', -10);
    this.createLayer('game', 0);
    this.createLayer('ui', 10);
    this.createLayer('overlay', 20);
    this.createLayer('modal', 100);

    // Resize handler
    window.addEventListener('resize', () => {
      this._viewport = { width: window.innerWidth, height: window.innerHeight };
      this._dirty = true;
    });
  }

  createLayer(name, zIndex) {
    const el = document.createElement('div');
    el.className = 'poke-layer poke-layer-' + name;
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:' + (zIndex || 0) + ';';
    this.container.appendChild(el);
    this._layers.set(name, { zIndex: zIndex || 0, element: el });
    this._sortLayers();
    return el;
  }

  getLayer(name) {
    return this._layers.get(name)?.element;
  }

  _sortLayers() {
    const sorted = Array.from(this._layers.entries()).sort((a, b) => a[1].zIndex - b[1].zIndex);
    for (const [, layer] of sorted) {
      this.container.appendChild(layer.element);
    }
  }

  // ─── ECS Integration ───
  /**
   * Register ECS-to-renderer system
   * Entities need: 'Display' component with { layer, html, visible }
   */
  registerSystem(world) {
    world.system('renderer:display', ['Display'], (eid, display) => {
      if (!display.visible) {
        if (display._el) { display._el.style.display = 'none'; }
        return;
      }
      const layer = this._layers.get(display.layer || 'game');
      if (!layer) return;

      if (!display._el) {
        display._el = document.createElement('div');
        display._el.className = 'poke-entity eid-' + eid;
        display._el.style.cssText = 'position:absolute;pointer-events:auto;';
        layer.element.appendChild(display._el);
      }

      display._el.style.display = 'flex';
      if (display.html !== undefined && display._lastHtml !== display.html) {
        display._el.innerHTML = display.html;
        display._lastHtml = display.html;
      }
      
      // Transform: position, size, rotation
      const s = '';
      const transforms = [];
      if (display.x !== undefined) display._el.style.left = display.x + 'px';
      if (display.y !== undefined) display._el.style.top = display.y + 'px';
      if (display.w !== undefined) display._el.style.width = (typeof display.w === 'number' ? display.w + 'px' : display.w);
      if (display.h !== undefined) display._el.style.height = (typeof display.h === 'number' ? display.h + 'px' : display.h);
      display._el.style.zIndex = display.zIndex || 0;
    });

    // Cleanup system for destroyed entities
    world.system('renderer:cleanup', ['Display'], (eid, display) => {
      if (display._el && !world.has(eid, 'Alive')) {
        display._el.remove();
        world.remove(eid, 'Display');
      }
    });
  }

  // ─── Direct rendering (non-ECS) ───
  render(layerName, html, options = {}) {
    const layer = this._layers.get(layerName);
    if (!layer) return null;
    const el = document.createElement('div');
    el.innerHTML = html;
    const child = el.firstElementChild;
    if (child) {
      if (options.x !== undefined) child.style.left = options.x + 'px';
      if (options.y !== undefined) child.style.top = options.y + 'px';
      if (options.className) child.className += ' ' + options.className;
      layer.element.appendChild(child);
    }
    return child;
  }

  clear(layerName) {
    if (layerName) {
      const layer = this._layers.get(layerName);
      if (layer) layer.element.innerHTML = '';
    } else {
      for (const [, layer] of this._layers) layer.element.innerHTML = '';
    }
    return this;
  }

  _render(alpha) {
    this.events?.emit('renderer:prerender', alpha);
    this._engine?.world.run('renderer:display');
    this.events?.emit('renderer:postrender', alpha);
  }

  get events() { return this._engine?.events; }
  get viewport() { return this._viewport; }
  get container() { return this._container; }
  set container(el) { this._container = el; if (el) el.style.position = 'relative'; }
}

window.PokeRenderer = Renderer;
if (!window.poke) window.poke = {};
window.poke.Renderer = Renderer;
})();
