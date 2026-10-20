/**
 * @file FakeDom.js
 * @brief Minimal in-memory DOM for the Node test suite (C++ equivalent: a test double of the browser).
 * Supports what the UI widgets use: element tree, classList, attributes, dataset, style variables,
 * textContent, events, and simple `#id` / `.class` / `tag` selectors.
 */

class FakeClassList {
  constructor(element) { this._element = element; this._set = new Set(); }
  add(...names) { names.filter(Boolean).forEach((n) => this._set.add(n)); }
  remove(...names) { names.forEach((n) => this._set.delete(n)); }
  contains(name) { return this._set.has(name); }
  toggle(name, force) {
    const on = force === undefined ? !this._set.has(name) : !!force;
    if (on) this._set.add(name); else this._set.delete(name);
    return on;
  }
  get value() { return [...this._set].join(' '); }
  set value(text) { this._set = new Set(String(text).split(/\s+/).filter(Boolean)); }
}

class FakeStyle {
  constructor() { this._vars = new Map(); }
  setProperty(name, value) { this._vars.set(name, String(value)); }
  removeProperty(name) { this._vars.delete(name); }
  getPropertyValue(name) { return this._vars.get(name) ?? ''; }
}

export class FakeElement {
  constructor(tagName, namespace = null) {
    this.tagName = String(tagName).toUpperCase();
    this.namespaceURI = namespace;
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.style = new FakeStyle();
    this.attributes = new Map();
    this._listeners = new Map();
    this._text = '';
    this.value = '';
    this.disabled = false;
    this.scrollTop = 0;
  }

  get className() { return this.classList.value; }
  set className(text) { this.classList.value = text; }
  get id() { return this.attributes.get('id') ?? ''; }
  set id(value) { this.attributes.set('id', String(value)); }
  get childNodes() { return this.children; }
  get firstElementChild() { return this.children[0] ?? null; }
  get isConnected() { let node = this; while (node.parentNode) node = node.parentNode; return node === globalThis.document?.documentElement; }

  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(text) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; this._text = String(text ?? ''); }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  append(...nodes) { nodes.forEach((n) => this.appendChild(n)); }
  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = reference ? this.children.indexOf(reference) : -1;
    child.parentNode = this;
    if (index < 0) this.children.push(child); else this.children.splice(index, 0, child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  replaceChildren(...nodes) { this.textContent = ''; nodes.forEach((n) => this.appendChild(n)); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }

  addEventListener(type, callback) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(callback);
  }
  removeEventListener(type, callback) {
    const list = this._listeners.get(type) || [];
    const index = list.indexOf(callback);
    if (index >= 0) list.splice(index, 1);
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    event.currentTarget = this;
    for (const callback of [...(this._listeners.get(event.type) || [])]) callback(event);
    if (event.bubbles && !event._stopped && this.parentNode) this.parentNode.dispatchEvent(event);
    return true;
  }
  click() { this.dispatchEvent(fakeEvent('click', { bubbles: true })); }
  focus() {}
  blur() {}
  select() {}
  scrollBy() {}
  scrollIntoView() {}
  getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }

  matches(selector) {
    return selector.split(',').some((part) => {
      const s = part.trim();
      if (s.startsWith('#')) return this.id === s.slice(1);
      if (s.startsWith('.')) return s.slice(1).split('.').every((c) => this.classList.contains(c));
      return this.tagName === s.toUpperCase();
    });
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => node.children.forEach((c) => { if (c.matches(selector)) out.push(c); walk(c); });
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { for (let n = this; n; n = n.parentNode) if (n.matches?.(selector)) return n; return null; }
}

/** @returns {Object} A bare event object understood by FakeElement.dispatchEvent */
export function fakeEvent(type, init = {}) {
  return {
    type, bubbles: !!init.bubbles, key: init.key, detail: init.detail ?? 0, button: init.button ?? 0, clientX: init.clientX ?? 0, clientY: init.clientY ?? 0,
    target: null, currentTarget: null, _stopped: false,
    preventDefault() {}, stopPropagation() { this._stopped = true; }
  };
}

/** Installs document / window / localStorage globals (idempotent). */
export function installFakeDom() {
  if (globalThis.__fakeDomInstalled) return;
  globalThis.__fakeDomInstalled = true;

  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; }
  };

  const documentElement = new FakeElement('html');
  const body = new FakeElement('body');
  documentElement.appendChild(body);
  globalThis.document = {
    documentElement,
    body,
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (ns, tag) => new FakeElement(tag, ns),
    createTextNode: (text) => { const n = new FakeElement('#text'); n.textContent = text; return n; },
    getElementById: (id) => documentElement.querySelector(`#${id}`),
    querySelector: (s) => documentElement.querySelector(s),
    querySelectorAll: (s) => documentElement.querySelectorAll(s),
    addEventListener: (...a) => documentElement.addEventListener(...a),
    removeEventListener: (...a) => documentElement.removeEventListener(...a),
    elementFromPoint: () => null
  };

  const windowListeners = new FakeElement('window');
  globalThis.window = globalThis;
  globalThis.innerWidth = 1600;
  globalThis.innerHeight = 900;
  globalThis.addEventListener = (...a) => windowListeners.addEventListener(...a);
  globalThis.removeEventListener = (...a) => windowListeners.removeEventListener(...a);
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
}
