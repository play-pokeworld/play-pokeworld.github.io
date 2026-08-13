/**
 * Wave 32 — 9th user pass.
 *
 * Two user reports, each guarded by its ROOT CAUSE rather than by the
 * incidental spelling of the fix:
 *
 *   12. "Panel headers still differ." The 7th-pass CSS patch was not enough:
 *       there was a shared header *look* but no shared header *builder*.
 *       26 sites hand-rolled `<div class="modal-title">` with divergent
 *       innards, so a stylesheet could never make them identical. The fix is
 *       structural — ONE constructor (components/panel-header.js) that every
 *       panel calls, so headers are identical BY CONSTRUCTION.
 *
 *   13. Mine treasures: buried and unearthed rows looked the same because
 *       `.pw-mine-treasure` was emitted but had NO CSS rule at all; only a
 *       `❓` prefix distinguished them. The state must be carried by the
 *       pill (background + name colour) plus the item sprite once unearthed,
 *       and the marker must be gone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { panelHeaderVNode, panelHeaderHTML } from '../src/ui/components/panel-header.js';
import * as components from '../src/ui/components/index.js';

const ROOT = path.join(import.meta.dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CSS = R('src/assets/styles/design-system.css');

/** Every production file that could hold a panel header. */
function srcFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.js')) out.push(rel);
    }
  };
  walk('src');
  return out;
}

// ══════════════════ 12. the shared header constructor ══════════════════

test('wave 32 A: the shared constructor exists and is reachable from the barrel', () => {
  assert.equal(typeof panelHeaderVNode, 'function');
  assert.equal(typeof panelHeaderHTML, 'function');
  assert.equal(components.panelHeaderVNode, panelHeaderVNode,
    'the components barrel re-exports the header builder');
  assert.equal(components.panelHeaderHTML, panelHeaderHTML);
});

test('wave 32 B: the canonical structure is always the same', () => {
  // Minimal call: no icon, no subtitle, no close.
  const bare = panelHeaderHTML({ title: 'Sac' });
  // Full call: everything on.
  const full = panelHeaderHTML({
    icon: '🎒', title: 'Sac', subtitle: '12 objets',
    close: { action: 'close-poke-modal', glyph: '✕' },
  });

  for (const html of [bare, full]) {
    assert.ok(html.startsWith('<div class="modal-title"'), 'root is .modal-title');
    // The text always lives in the same two nested nodes, so the CSS rules
    // keyed on them apply to EVERY panel, not to a lucky few.
    assert.ok(html.includes('class="pw-row"'), 'icon+text cluster wrapper');
    assert.ok(html.includes('class="pw-info-head-text"'), 'text cluster');
    assert.ok(html.includes('class="pw-info-name"'), 'title node');
  }
  assert.ok(!bare.includes('pw-info-icon'), 'no empty icon slot when unused');
  assert.ok(!bare.includes('modal-close'), 'no close control when unused');
  assert.ok(full.includes('pw-info-icon'), 'icon slot when asked');
  assert.ok(full.includes('pw-text-sm'), 'subtitle uses the small-text tone');
  assert.ok(full.includes('class="modal-close"'), 'canonical close class');
});

test('wave 32 C: the close control normalizes every legacy shape', () => {
  const call = panelHeaderHTML({ title: 'x', close: { call: 'closePresetEditor' } });
  assert.ok(call.includes('data-action="legacy-call"'), 'call ⇒ legacy-call action');
  assert.ok(call.includes('data-call="closePresetEditor"'));
  assert.ok(call.includes('data-call-args=""'), 'empty args still emitted');

  const btn = panelHeaderHTML({
    title: 'x',
    close: { action: 'close-settings', tag: 'button', ariaLabel: 'Fermer', glyph: '✕' },
  });
  assert.ok(btn.includes('<button'), 'button flavour honoured');
  assert.ok(btn.includes('type="button"'), 'buttons are never submit buttons');
  assert.ok(btn.includes('aria-label="Fermer"'));

  // glyph:false ⇒ the CSS ::before draws the cross; the node stays empty.
  const css = panelHeaderHTML({ title: 'x', close: { action: 'pw-info-back', glyph: false } });
  assert.ok(/<span class="modal-close"[^>]*><\/span>/.test(css), 'empty close node');
  assert.ok(/\.modal-close:empty::before\s*\{[^}]*content:/.test(CSS),
    'the stylesheet supplies the ✕ for empty close controls');
});

test('wave 32 D: no production file hand-rolls a panel header any more', () => {
  const offenders = [];
  for (const f of srcFiles()) {
    if (f === 'src/ui/components/panel-header.js') continue;
    const text = R(f);
    text.split('\n').forEach((line, i) => {
      // A header emitted as markup: `class="modal-title"` inside a string or
      // template literal. Comments and querySelector('.modal-title') are not
      // header construction and stay allowed.
      if (/class=\\?["']modal-title/.test(line)) offenders.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    'every header must come from panelHeaderVNode/panelHeaderHTML');
});

test('wave 32 E: the classic string-building panels call the shared builder', () => {
  // These are the last string-based panels (info sheets, legacy modal
  // factory, preset editor). They must import the constructor, not re-type
  // the markup.
  for (const f of [
    'src/data/items-helpers.js',
    'src/ui/game/fullscreen-panel.js',
    'src/ui/game/legacy-components.js',
    'src/ui/game/poke-modal.js',
    'src/ui/game/preset-manager.js',
  ]) {
    const text = R(f);
    assert.ok(/import \{ panelHeaderHTML \} from '.*panel-header\.js';/.test(text),
      `${f} imports the shared header builder`);
    assert.ok(text.includes('panelHeaderHTML({'), `${f} actually calls it`);
  }
});

test('wave 32 F: the static headers in index.html follow the same structure', () => {
  const html = R('index.html');
  // Each static `.modal-title` must carry the same nesting the constructor
  // emits, otherwise those four panels drift again the moment the CSS moves.
  const headers = html.match(/<div class="modal-title[^"]*">[\s\S]*?<\/div>\s*<\/div>/g) || [];
  assert.ok(headers.length >= 4, 'found the static headers');
  for (const hdr of headers) {
    assert.ok(hdr.includes('class="pw-row"'), 'static header uses .pw-row');
    assert.ok(hdr.includes('pw-info-head-text'), 'static header uses the text cluster');
    assert.ok(hdr.includes('pw-info-name'), 'static header titles use .pw-info-name');
  }
  // The ids other modules target must survive the restructuring.
  for (const id of ['settings-title', 'quest-title', 'usm-title', 'battle-summary-title']) {
    assert.ok(html.includes(`id="${id}"`), `${id} kept (targeted by the classic bridge)`);
  }
});

test('wave 32 G: the retired private close class is gone for good', () => {
  // `.afk-modal-close` was a drifted 24px/36px copy of the shared cross.
  for (const f of srcFiles()) {
    const text = R(f);
    assert.ok(!/class[^\n]*afk-modal-close/.test(text),
      `${f} must not emit the private AFK cross`);
  }
  assert.ok(!/^\.afk-modal-close/m.test(CSS), 'no CSS rule resurrects it');
});

// ═══════════════════ 13. mine treasure readability ═══════════════════

test('wave 32 H: .pw-mine-treasure finally has a rule, with two distinct states', () => {
  const pill = CSS.match(/^\.pw-mine-treasure\s*\{[^}]*\}/m);
  assert.ok(pill, 'the buried state is styled (it had NO rule at all before)');
  const collected = CSS.match(/^\.pw-mine-treasure\.is-collected\s*\{[^}]*\}/m);
  assert.ok(collected, 'the unearthed state is styled');

  // Root cause of the report: both states must differ on the BACKGROUND and
  // on the text colour — not merely on a prefix glyph.
  const bgOf = (rule) => (rule[0].match(/background:\s*([^;]+);/) || [])[1];
  const fgOf = (rule) => (rule[0].match(/(?:^|[^-])color:\s*([^;]+);/) || [])[1];
  assert.ok(bgOf(pill) && bgOf(collected), 'both states set a background');
  assert.notEqual(bgOf(pill), bgOf(collected), 'the backgrounds differ');
  assert.ok(fgOf(pill) && fgOf(collected), 'both states set a name colour');
  assert.notEqual(fgOf(pill), fgOf(collected), 'the name colours differ');
});

test('wave 32 I: the treasure row shows the item sprite and drops the ❓ marker', () => {
  const view = R('src/ui/views/MineWindowView.js');
  const ui = R('src/ui/game/mine-ui.js');

  // Strip comments first: the explanatory note legitimately *names* the
  // retired glyphs; what must be gone is any glyph actually rendered.
  const code = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/❓/.test(code), 'no buried marker glyph rendered by the view');
  assert.ok(!/✔/.test(code), 'no collected marker glyph either');

  // The sprite is supplied by the model and rendered BEFORE the name.
  assert.ok(/itemIcon\(i\.key,\s*\d+/.test(ui), 'mine-ui builds a per-treasure icon');
  const row = view.match(/pw-mine-treasure['"][\s\S]{0,600}?\)\)\)\)/);
  assert.ok(row, 'located the treasure row markup');
  const iconPos = row[0].indexOf('iconHtml');
  const namePos = row[0].indexOf('pw-mine-treasure-name');
  assert.ok(iconPos > -1 && namePos > -1, 'row renders an icon slot and a name slot');
  assert.ok(iconPos < namePos, 'the sprite precedes the name');

  // Accessibility: the state disappeared from the visuals, so it must be
  // reachable by assistive tech.
  assert.ok(/aria-label/.test(row[0]) && /title/.test(row[0]),
    'the pill announces its state to screen readers');
  assert.ok(/mine_treasure_buried/.test(ui) && /mine_treasure_found/.test(ui),
    'the state labels are localized, not hardcoded');
  for (const lang of ['fr', 'en']) {
    const eco = R(`src/localization/${lang}/economy.js`);
    assert.ok(eco.includes('"mine_treasure_buried"'), `${lang}: buried label`);
    assert.ok(eco.includes('"mine_treasure_found"'), `${lang}: unearthed label`);
  }
});

test('wave 32 J: only unearthed treasures carry a sprite', () => {
  const ui = R('src/ui/game/mine-ui.js');
  const rows = ui.match(/rows:\s*items\.map\([\s\S]*?\)\)\s*\}/);
  assert.ok(rows, 'located the treasure model');
  assert.ok(/i\.collected\s*\?\s*itemIcon/.test(rows[0]),
    'a buried treasure must not reveal which item it is');
});
