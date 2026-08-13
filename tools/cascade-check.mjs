#!/usr/bin/env node
/**
 * PokéWorld — cascade checker (design-system.css only, single stylesheet).
 * For a given element description (tag + classes + data-* attrs), compute
 * which declaration WINS for each CSS property (specificity × source order,
 * !important first). Simplified but exact for this codebase's selectors.
 */
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');

// Strip @media blocks keep inner rules (same cascade), strip comments.
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [];
const re = /([^{}]+)\{([^{}]*)\}/g;
let m; let order = 0;
while ((m = re.exec(clean))) {
  const sels = m[1].split(',').map(s => s.trim()).filter(Boolean);
  const decls = {};
  m[2].split(';').map(d => d.trim()).filter(d => d.includes(':')).forEach(d => {
    const i = d.indexOf(':');
    const prop = d.slice(0, i).trim();
    let val = d.slice(i + 1).trim();
    const important = /!important\s*$/.test(val);
    val = val.replace(/!important\s*$/, '').trim();
    // shorthand background expands to background-color for our purpose when plain color
    decls[prop] = { val, important, order };
  });
  rules.push({ sels, decls, order: order++ });
}

function specCount(sel) {
  // specificity (a=id, b=class|attr|pseudo-class, c=tag)
  const ids = (sel.match(/#[\w-]+/g) || []).length;
  const tags = (sel.match(/(^|[\s>+~])([a-zA-Z][\w-]*)/g) || []).length;
  const classes = (sel.match(/\.[\w-]+/g) || []).length;
  const attrs = (sel.match(/\[[^\]]+\]/g) || []).length;
  const pseudos = (sel.match(/(?<!:):[a-zA-Z-]+/g) || []).length;
  return [ids, classes + attrs + pseudos, tags];
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function matches(sel, el) {
  // supports: tag, .cls, [attr], [attr="v"], * — joined/simple compounds + descendant combinators (last compound must match)
  let s = sel.trim();
  // pseudo-states always potentially match except :not() contents must not match
  const nots = [...s.matchAll(/:not\(([^)]*)\)/g)].map(x => x[1]);
  for (const n of nots) if (simpleMatch(n, el)) return false;
  s = s.replace(/::[a-zA-Z-]+/g, '').replace(/:[a-zA-Z-]+(\([^)]*\))?/g, '');
  const last = s.split(/[\s>+~]+/).pop();
  return simpleMatch(last, el);
}
function simpleMatch(comp, el) {
  if (!comp || comp === '*') return true;
  const tag = comp.match(/^[a-zA-Z][\w-]*/);
  if (tag && tag[0].toLowerCase() !== el.tag) return false;
  for (const c of comp.match(/\.[\w-]+/g) || []) if (!el.classes.includes(c.slice(1))) return false;
  for (const a of comp.match(/\[[^\]]+\]/g) || []) {
    const inner = a.slice(1, -1);
    const mm = inner.match(/^([\w-]+)(?:[*^$|~]?=["']?([^"'\]]*)["']?)?$/);
    if (!mm) continue;
    const [_, name, val] = mm;
    if (!(name in el.attrs)) return false;
    if (val) {
      if (inner.includes('*=')) { if (!String(el.attrs[name]).includes(val)) return false; }
      else if (String(el.attrs[name]) !== val) return false;
    }
  }
  return true;
}

export function cascade(el) {
  const win = {};
  rules.forEach((r) => {
    r.sels.forEach((sel) => {
      if (!matches(sel, el)) return;
      const spec = specCount(sel);
      for (const [prop, d] of Object.entries(r.decls)) {
        const cur = win[prop];
        if (!cur || cmp(spec, cur.spec) > 0 || (cmp(spec, cur.spec) === 0 && r.order >= cur.order)) {
          win[prop] = { spec, order: r.order, val: d.val, important: d.important, sel };
        }
      }
    });
  });
  // !important overrides non-important regardless
  for (const [prop, d] of Object.entries(win)) {
    // find best important
    let bestImp = null;
    rules.forEach((r) => r.sels.forEach((sel) => {
      if (!matches(sel, el)) return;
      const dd = r.decls[prop];
      if (dd && dd.important) {
        const spec = specCount(sel);
        if (!bestImp || cmp(spec, bestImp.spec) > 0 || (cmp(spec, bestImp.spec) === 0 && r.order >= bestImp.order)) {
          bestImp = { spec, order: r.order, val: dd.val, important: true, sel };
        }
      }
    }));
    if (bestImp && (!d.important || cmp(bestImp.spec, d.spec) >= 0)) win[prop] = bestImp;
  }
  return win;
}

const els = {
  'theme swatch dark': { tag: 'button', classes: ['theme-swatch', 'theme-swatch--dark'], attrs: { 'data-theme-btn': 'dark', 'data-action': 'set-theme', 'data-theme-value': 'dark' } },
  'theme swatch fire': { tag: 'button', classes: ['theme-swatch', 'theme-swatch--fire'], attrs: { 'data-theme-btn': 'fire', 'data-action': 'set-theme', 'data-theme-value': 'fire' } },
  'delete save button': { tag: 'button', classes: ['hbtn', 'pw-btn-danger'], attrs: { 'data-action': 'confirm-delete' } },
  'training mode row (move, clickable)': { tag: 'div', classes: ['pokechill-row', 'training-mode-row', 'training-mode--move'], attrs: { 'data-action': 'legacy-call' } },
  'training mode row (locked)': { tag: 'div', classes: ['pokechill-row', 'training-mode-row', 'training-mode--hidden', 'is-disabled'], attrs: {} },
  'auto toggle ON (training)': { tag: 'button', classes: ['hbtn', 'training-slot-auto-btn', 'is-on'], attrs: { 'data-action': 'legacy-call' } },
};
for (const [name, el] of Object.entries(els)) {
  const w = cascade(el);
  console.log('\n▶', name);
  for (const p of ['background', 'background-color', 'color', 'border-color', 'opacity']) {
    if (w[p]) console.log(`  ${p}: ${w[p].val}  [${w[p].important ? '!' : ' '}] <${w[p].sel}>`);
  }
  // effective bg: shorthand background covers background-color
  const bg = w['background-color'] || w['background'];
  console.log('  ⇒ effective background-color:', bg ? bg.val : '(none)');
}

