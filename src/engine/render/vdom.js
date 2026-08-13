/**
 * PokeEngine — VDOM (technology-agnostic virtual nodes)
 *
 * Single-source UI description used by the whole design system: every scene
 * and every base UI object produces plain virtual nodes (`h()` descriptors)
 * which are then materialized either:
 *   - as an HTML string  → toHTMLString(node)  (server/vm/test contexts, no DOM),
 *   - as real DOM nodes  → mount(node, doc)    (browser runtime).
 *
 * One renderer, two materializations: markup can never diverge between the
 * game and the test harness.
 *
 * Props contract:
 *   - class: string               → class attribute
 *   - style: object               → inline style (kebab-cased keys)
 *   - dataset: object             → data-* attributes
 *   - onClick / onContextmenu / onInput / onChange / onSubmit: functions
 *     (ignored by toHTMLString, bound as listeners by mount)
 *   - disabled: boolean           → boolean attribute
 *   - any other string/number/boolean prop: plain escaped attribute
 *   - h.raw('<div>…</div>')       → trusted, already-built HTML escape hatch
 *
 * @module engine/render/vdom
 */

const RAW_TAG = Symbol.for('pw.raw');

/**
 * HTML escaping (text nodes and attribute values).
 * @param {*} v
 * @returns {string}
 */
export function esc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // NOTE: single quotes stay raw — this serializer always double-quotes
  // attribute values, so ' is safe and data-* args stay human-readable
  // and greppable (data-call-args="'id'" — same contract as the legacy
  // string-built markup).
}

const VOID_TAGS = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source']);

/**
 * Create a virtual node.
 * @param {string} tag HTML tag name ('div', 'button', ...).
 * @param {Object|null} [props]
 * @param {...*} children Nested nodes / strings / numbers / arrays / nulls.
 * @returns {Object} Virtual node descriptor.
 */
export function h(tag, props = null, ...children) {
  return { tag, props: props || {}, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) };
}

/**
 * Trusted raw HTML node (use only for internally-built markup such as icon
 * SVGs produced by the game itself — never for user input).
 * @param {string} html
 * @returns {Object}
 */
h.raw = function raw(html) {
  return { tag: RAW_TAG, props: { __html: String(html) }, children: [] };
};

/** @param {*} node @returns {boolean} */
export function isVNode(node) {
  return !!node && typeof node === 'object' && 'tag' in node;
}

/**
 * Serialize a virtual tree to an HTML string (DOM-free).
 * @param {*} node
 * @returns {string}
 */
export function toHTMLString(node) {
  if (node === null || node === undefined || node === false) return '';
  if (Array.isArray(node)) return node.map(toHTMLString).join('');
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (!isVNode(node)) return '';
  if (node.tag === RAW_TAG) return node.props.__html;

  const attrs = [];
  const props = node.props || {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') { attrs.push(`class="${esc(value)}"`); continue; }
    if (key === 'style' && typeof value === 'object') {
      const css = Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      if (css) attrs.push(`style="${esc(css)}"`);
      continue;
    }
    if (key === 'dataset' && typeof value === 'object') {
      for (const [dk, dv] of Object.entries(value)) {
        if (dv === null || dv === undefined) continue;
        attrs.push(`data-${dk.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${esc(dv)}"`);
      }
      continue;
    }
    if (key.startsWith('on') && typeof value === 'function') continue; // listeners: DOM-only
    if (key === 'disabled') { if (value) attrs.push('disabled'); continue; }
    if (typeof value === 'boolean') { attrs.push(`${key}="${value ? 'true' : 'false'}"`); continue; }
    attrs.push(`${key}="${esc(value)}"`);
  }

  const open = attrs.length ? `<${node.tag} ${attrs.join(' ')}>` : `<${node.tag}>`;
  if (VOID_TAGS.has(node.tag)) return open;
  return `${open}${node.children.map(toHTMLString).join('')}</${node.tag}>`;
}

/**
 * Materialize a virtual tree into real DOM nodes.
 * @param {*} node
 * @param {Document} [doc] Document to create nodes with (defaults to global).
 * @returns {Node|null}
 */
export function mount(node, doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) throw new Error('[engine] vdom.mount requires a Document');
  if (node === null || node === undefined || node === false) return doc.createComment('empty');
  if (Array.isArray(node)) {
    const frag = doc.createDocumentFragment();
    for (const child of node) frag.appendChild(mount(child, doc));
    return frag;
  }
  if (typeof node === 'string' || typeof node === 'number') return doc.createTextNode(String(node));
  if (!isVNode(node)) return doc.createComment('invalid');
  if (node.tag === RAW_TAG) {
    const tpl = doc.createElement('template');
    tpl.innerHTML = node.props.__html;
    return tpl.content.cloneNode(true);
  }

  const el = doc.createElement(node.tag);
  const props = node.props || {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') { el.className = String(value); continue; }
    if (key === 'style' && typeof value === 'object') { Object.assign(el.style, value); continue; }
    if (key === 'dataset' && typeof value === 'object') { Object.assign(el.dataset, value); continue; }
    if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    if (key === 'disabled') { if (value) el.setAttribute('disabled', ''); continue; }
    el.setAttribute(key, typeof value === 'boolean' ? String(value) : String(value));
  }
  for (const child of node.children) el.appendChild(mount(child, doc));
  return el;
}

/**
 * Replace the content of a host element with a rendered virtual tree.
 * @param {*} node
 * @param {Element} host
 * @param {Document} [doc]
 */
export function renderInto(node, host, doc = (typeof document !== 'undefined' ? document : null)) {
  const dom = mount(node, doc || host.ownerDocument);
  host.replaceChildren(dom);
  return host;
}

