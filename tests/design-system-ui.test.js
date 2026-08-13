// ── Design System UI (session 2026-08, UI overhaul) ──────────────
// Unit tests for the base UI objects (Toolbar, Toggle, sprite circle),
// the design token catalog, and the fixed-toolbar wiring of the data
// screens (bag, dictionary, Pokédex, selectors).
// Self-contained: uses a minimal in-repo DOM stub (the suite never
// requires node_modules).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ── Minimal DOM stub (createElement / classList / events / selectors) ──
class MiniEvent {
  constructor(type, opts = {}) { this.type = type; this.bubbles = !!opts.bubbles; }
}
class MiniEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this._classes = new Set();
    this._listeners = {};
    this._text = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.width = 0;
    this.height = 0;
    this.id = '';
    this.type = '';
    this.href = '';
  }
  get classList() {
    return {
      add: (...cs) => cs.forEach((c) => this._classes.add(c)),
      remove: (...cs) => cs.forEach((c) => this._classes.delete(c)),
      toggle: (c, force) => {
        const on = force === undefined ? !this._classes.has(c) : !!force;
        on ? this._classes.add(c) : this._classes.delete(c);
        return on;
      },
      contains: (c) => this._classes.has(c),
    };
  }
  get className() { return [...this._classes].join(' '); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html || ''; }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'data-i18n-aria-label') this.dataset.i18nAriaLabel = v; }
  getAttribute(k) { return this.attributes[k] ?? this.dataset[k.replace(/^data-/, '')] ?? null; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  dispatchEvent(ev) { (this._listeners[ev.type] || []).forEach((fn) => fn(ev)); if (ev.bubbles && this.parentNode) this.parentNode.dispatchEvent(ev); return true; }
  _flatten(out = []) { out.push(this); this.children.forEach((c) => c._flatten(out)); return out; }
  _matches(sel) {
    sel = sel.trim();
    const attrM = sel.match(/^\[([\w-]+)="([^"]*)"\]$/);
    if (attrM) return this.getAttribute(attrM[1]) === attrM[2] || this.dataset[attrM[1].replace(/^data-/, '')] === attrM[2];
    const tagAttrM = sel.match(/^([a-z]+)\[([\w-]+)="([^"]*)"\]$/i);
    if (tagAttrM) return this.tagName === tagAttrM[1].toUpperCase() && String(this[tagAttrM[2]] ?? this.getAttribute(tagAttrM[2])) === tagAttrM[3];
    const parts = sel.split('.');
    const tag = parts[0];
    if (tag && tag !== '*' && this.tagName !== tag.toUpperCase()) return false;
    return parts.slice(1).every((cls) => this._classes.has(cls));
  }
  querySelectorAll(sel) { return this._flatten().filter((el) => el !== this && el._matches(sel)); }
  querySelector(sel) { return this._flatten().find((el) => el !== this && el._matches(sel)) || null; }
}
function patchGlobals() {
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    HTMLElement: globalThis.HTMLElement,
    Event: globalThis.Event,
  };
  globalThis.document = {
    createElement: (tag) => new MiniEl(tag),
    body: new MiniEl('body'),
    getElementById: () => null,
  };
  globalThis.window = globalThis.window || {};
  globalThis.window.Event = MiniEvent;
  globalThis.HTMLElement = MiniEl;
  globalThis.Event = MiniEvent;
  return () => {
    globalThis.document = prev.document;
    globalThis.window = prev.window;
    globalThis.HTMLElement = prev.HTMLElement;
    globalThis.Event = prev.Event;
  };
}

test('Toolbar: fixed non-scrolling bar with unified sort pills', async () => {
  const restore = patchGlobals();
  try {
    const { Toolbar } = await import('../src/ui/Toolbar.js');
    const tb = new Toolbar({
      search: { placeholder: 'Search…', value: '' },
      sort: { options: [{ id: 'name', label: 'Name' }, { id: 'level', label: 'Level' }], active: 'level' },
    });
    const el = tb.render();
    assert.ok(el.classList.contains('pw-ui-toolbar'), 'toolbar root class');
    assert.ok(el.classList.contains('pw-ui-toolbar--fixed'), 'fixed (never scrolls) marker');
    const sorts = el.querySelectorAll('.usm-sort-btn');
    assert.equal(sorts.length, 2, 'two sort pills (buttons, never a dropdown)');
    assert.ok(sorts[1].classList.contains('active'), 'active sort highlighted');
    const input = el.querySelector('input.pw-ui-toolbar-search');
    assert.ok(input, 'standardized search field present');
    assert.ok(tb.isFixed(), 'fixed mode reported');
  } finally { restore(); }
});

test('Toolbar: search + sort update state and emit ui:filter-change', async () => {
  const restore = patchGlobals();
  try {
    const { Toolbar } = await import('../src/ui/Toolbar.js');
    const { eventBus } = await import('../src/core/event-bus.js');
    const tb = new Toolbar({
      search: { placeholder: 'q' },
      sort: { options: [{ id: 'name', label: 'N' }, { id: 'qty', label: 'Q' }], active: 'name' },
    });
    const el = tb.render();
    const seen = [];
    const off = eventBus.on('ui:filter-change', (p) => seen.push(p));
    const input = el.querySelector('input');
    input.value = 'pika';
    input.dispatchEvent(new MiniEvent('input', { bubbles: true }));
    assert.deepEqual(tb.getState(), { query: 'pika', sort: 'name' }, 'state mirrors user input');
    el.querySelector('[data-sort="qty"]').dispatchEvent(new MiniEvent('click', { bubbles: true }));
    assert.equal(tb.getState().sort, 'qty', 'sort switched');
    assert.equal(seen.length, 2, 'one emission per user interaction');
    assert.equal(seen[0].query, 'pika', 'payload carries the query');
    assert.equal(seen[1].sort, 'qty', 'payload carries the sort');
    off();
  } finally { restore(); }
});

test('Toggle: state change notifies callback and ui:toggle event', async () => {
  const restore = patchGlobals();
  try {
    const { Toggle } = await import('../src/ui/Toggle.js');
    const { eventBus } = await import('../src/core/event-bus.js');
    let cbValue = null;
    const tog = new Toggle({ label: 'Shiny only', checked: false, onChange: (v) => { cbValue = v; } });
    const el = tog.render();
    assert.ok(el.classList.contains('pw-ui-toggle'), 'toggle class');
    assert.equal(el.querySelector('.pw-ui-toggle-label').textContent, 'Shiny only', 'label rendered');
    const seen = [];
    const off = eventBus.on('ui:toggle', (p) => seen.push(p));
    const input = el.querySelector('input[type="checkbox"]');
    input.checked = true;
    input.dispatchEvent(new MiniEvent('change', { bubbles: true }));
    assert.equal(cbValue, true, 'callback received the new state');
    assert.equal(tog.isChecked(), true, 'component state updated');
    assert.equal(seen.length, 1, 'one ui:toggle emission');
    assert.equal(seen[0].checked, true, 'event payload');
    tog.setChecked(false);
    assert.equal(input.checked, false, 'programmatic set');
    off();
  } finally { restore(); }
});

test('Sprite circle: canonical background at the two standardized sizes', async () => {
  const restore = patchGlobals();
  try {
    const { buildSpriteCircle } = await import('../src/ui/sprite-circle.js');
    const sm = buildSpriteCircle({ size: 'standard', src: 'x.png', alt: 'Pikachu' });
    const lg = buildSpriteCircle({ size: 'team', shiny: true });
    assert.ok(sm.classList.contains('pw-poke-circle-wrap'), 'canonical wrapper');
    assert.ok(sm.querySelector('.pw-poke-circle-bg'), 'canonical dark disc behind (DS2807)');
    // Waves 15+17 (user feedback): canonical sizes bumped 56→64→72 / 96→104.
    assert.equal(sm.style.width, '72px', 'standard = 72 px (--pw-size-poke-sm)');
    assert.equal(lg.style.width, '104px', 'team = 104 px (--pw-size-poke-lg)');
    assert.equal(sm.querySelector('img.pw-poke-circle-img').alt, 'Pikachu', 'sprite alt');
    assert.ok(lg.querySelector('.pw-poke-circle-shiny'), 'shiny marker');
    const weird = buildSpriteCircle({ size: 'huge' });
    assert.equal(weird.style.width, '72px', 'unknown token clamped to standard');
  } finally { restore(); }
});

test('Design tokens: theme palette parity + the two sprite sizes in the stylesheet', async () => {
  const { THEME_IDS, SPRITE_SIZES } = await import('../src/core/design-tokens.js');
  const css = R('src/assets/styles/design-system.css');
  const themeBlocks = [...css.matchAll(/\[data-theme="([a-z]+)"\]\s*\{/g)].map((m) => m[1]);
  const inCss = new Set(themeBlocks);
  for (const id of THEME_IDS) {
    if (id === 'dark') continue; // dark = :root defaults
    assert.ok(inCss.has(id), `theme "${id}" has a CSS palette block`);
  }
  assert.deepEqual(THEME_IDS, ['dark', 'light', 'gameboy', 'fire'], 'single theme catalog');
  assert.ok(css.includes('--pw-size-poke-sm:'), 'sm sprite token in CSS');
  assert.ok(css.includes('--pw-size-poke-lg:'), 'lg sprite token in CSS');
  assert.ok(css.includes(`--pw-size-poke-sm: ${SPRITE_SIZES.standard}px`), 'JS/CSS parity for the standard size');
  assert.ok(css.includes(`--pw-size-poke-lg: ${SPRITE_SIZES.team}px`), 'JS/CSS parity for the team size');
});

test('Data screens: fixed toolbars routed out of the scrollers, charm out of the grid, filters everywhere', () => {
  const bag = R('src/ui/game/inventory.js');
  const bagScreen = R('src/ui/views/BagView.js');
  assert.ok(bag.includes('fs-panel-filters'), 'bag toolbar routed to the fixed slot');
  assert.ok(bagScreen.includes('filterBarVNode'), 'bag toolbar renders THE unified FilterBar component (rebuilt screen)');
  const filterBar = R('src/ui/components/filter-bar.js');
  assert.ok(filterBar.includes('pw-ui-toolbar'), 'the FilterBar component carries the DS toolbar classes');
  const dict = R('src/ui/game/fullscreen-panel.js');
  const dictScreen = R('src/ui/views/DictionaryView.js');
  assert.ok(dictScreen.includes('dict-toolbar pw-ui-toolbar'), 'dictionary adopts the unified fixed toolbar (rebuilt screen)');
  assert.ok(dict.includes("getElementById('fs-panel-filters')"), 'dictionary toolbar outside the scroller');
  const dex = R('src/ui/game/pokedex.js');
  const dexScreen = R('src/ui/views/PokedexView.js');
  assert.ok(dexScreen.includes('dex-charm-info'), 'Shiny Charm banner lives in the fixed info bar (rebuilt screen)');
  assert.ok(dexScreen.includes('filtersVNode') && dexScreen.indexOf('dex-charm-info') < dexScreen.indexOf('buildView'), 'charm banner bound to the fixed bar, never the grid');
  const sel = R('src/ui/game/box-selector.js');
  const m = sel.match(/showBoxFilters = \(([\s\S]*?)\) && _usmSubTab/);
  assert.ok(m, 'selector filter switch located');
  for (const mode of ['training', 'hatchery', 'preset_slot_', 'basenpc_slot_', 'training_queue_', 'hatchery_queue_']) {
    assert.ok(m[1].includes(mode), `filters enabled for selector mode ${mode}`);
  }
});

