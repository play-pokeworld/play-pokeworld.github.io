/**
 * @file InterfaceGrammar.test.js
 * @brief Static guards for the shared catalogue grammar (1.16.51): one cell, one row, one chip.
 *
 * Every case below is a defect seen on a screenshot during the pass: a framed card where the
 * catalogue draws a row, a two-pixel ring where it draws a hairline, a coloured banner where it
 * draws a label. The guards read the sheets, so they hold whatever the panels do at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, assert } from './TestRunner.js';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CSS_ROOT = path.join(PROJECT_ROOT, 'assets/css');

const read = (relative) => fs.readFileSync(path.join(CSS_ROOT, relative), 'utf8');
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
/** Every rule of a sheet as `{ selector, body }`, comments removed. */
const rules = (relative) => [...stripComments(read(relative)).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((match) => ({ selector: match[1].trim().replace(/\s+/g, ' '), body: match[2] }));

/** The last rule whose selector is exactly one of `selectors` — the one the cascade ends on. */
const lastRule = (relative, selectors) => {
  const wanted = Array.isArray(selectors) ? selectors : [selectors];
  return rules(relative).filter((rule) => wanted.includes(rule.selector)).pop() || null;
};

describe('Shared display grammar (1.16.51)', (test) => {
  test('a collection cell paints no frame: the only circle on screen is the sprite disc', () => {
    // The same cell serves the Pokedex and the PC box. A 72px circle with a two-pixel border
    // turned every entry into a second disc and made the collection unreadable.
    const cell = lastRule('panels/pokedex.css', '.pw-pokedex-entry.dex-entry');
    assert.ok(cell, 'the collection cell keeps a rule of its own');
    assert.ok(/border: 0/.test(cell.body), 'the cell carries no border');
    assert.ok(/background: none/.test(cell.body), 'the cell carries no fill');
    assert.ok(/border-radius: 0/.test(cell.body), 'the cell is a column, not a circle');
    // The grid may be described by several rules across the pass; whichever of them declares a
    // background must declare none, so no later block can quietly restore the painted panel.
    const grids = rules('panels/pokedex.css')
      .filter((rule) => rule.selector === '.pw-pokedex-grid' && /background/.test(rule.body));
    assert.ok(grids.length > 0, 'the collection grid declares its background');
    assert.ok(grids.every((rule) => /background: none|background: transparent/.test(rule.body)),
      'the collection grid paints nothing');
  });

  test('badges and leagues are one tile, and the name is the light bar of that tile', () => {
    // The catalogue draws both as the same .gcell: quiet surface, hairline, full-bleed name bar.
    const badges = rules('components/badges.css');
    const tile = badges.filter((rule) => rule.selector.includes('.pw-badge-card,')
      || rule.selector.startsWith('.pw-badge-card,\n')).pop()
      || badges.find((rule) => /^\.pw-badge-card,\s*\.pw-league-card \{/.test(rule.selector.replace(/\n/g, ' ')));
    assert.ok(tile, 'badges and leagues share one tile rule');
    assert.ok(/border-radius: 10px/.test(tile.body), 'the tile keeps the small catalogue radius');
    const title = badges.find((rule) => rule.selector === '.pw-badge-card-title');
    assert.ok(title && /background: var\(--pw-text-primary\)/.test(title.body),
      'the name is painted as the light bar of the tile');
    assert.ok(title && /width: 100%/.test(title.body), 'the bar spans the tile edge to edge');
    const text = badges.find((rule) => rule.selector.includes('.pw-badge-card-text'));
    assert.ok(text && /display: contents/.test(text.body),
      'the wrapper of the lines stops boxing them, so the bar can bleed');
  });

  test('achievements are a column of rows, with the rank as a pill', () => {
    const grid = lastRule('panels/achievements.css', '.pw-ach-grid');
    assert.ok(grid && /grid-template-columns: minmax\(0, 1fr\)/.test(grid.body),
      'achievements read down one column');
    const card = rules('panels/achievements.css').find((rule) => rule.selector === '.pw-ach-card');
    assert.ok(card && /display: grid/.test(card.body), 'the cell is a row: disc, text column, end column');
    assert.ok(card && /grid-template-columns: 34px minmax\(0, 1fr\) auto/.test(card.body),
      'the row is the three columns of the catalogue');
    const pinned = rules('panels/achievements.css').find((rule) => rule.selector === '.pw-ach-card.is-pinned');
    assert.ok(pinned && /border: 1px/.test(pinned.body) && !/!important/.test(pinned.body),
      'pinned stands on the same single hairline, without an override');
    const bonuses = rules('panels/achievements.css').find((rule) => rule.selector === '.pw-ach-bonuses-section');
    assert.ok(bonuses && /background: none/.test(bonuses.body) && /border: 0/.test(bonuses.body),
      'the bonuses open on a label, not on a framed section');
  });

  test('a list row is one hairline of the border token, whatever the list', () => {
    const dictionary = rules('panels/dictionary.css').find((rule) => rule.selector === '.dict-entry');
    assert.ok(dictionary && /border:1px solid var\(--pw-border-color\)/.test(dictionary.body),
      'the dictionary cell wears the shared hairline');
    assert.ok(!/border-left:4px/.test(dictionary.body), 'the four-pixel type stripe is gone');
    const puzzle = rules('panels/guide.css').find((rule) => rule.selector === '.pw-puzzle-card');
    assert.ok(puzzle && /border-radius: 8px/.test(puzzle.body), 'a puzzle is a row, not a card');
    const preset = rules('panels/presets.css').find((rule) => rule.selector === '.preset-row');
    assert.ok(preset && /border: 1px solid var\(--pw-border-color\)/.test(preset.body),
      'a preset slot wears the shared hairline');
    const activePreset = rules('panels/presets.css').find((rule) => rule.selector === '.preset-row.active');
    assert.ok(activePreset && /box-shadow: none/.test(activePreset.body), 'the active slot casts no glow');
  });

  test('dashboard windows share the same hairline: no coloured banner, no framed swatch', () => {
    // The intention: one row grammar for the whole column. The catalogue tints the hairline of each
    // destination at half with its colour (`.scrow`, CATALOGUE_AFFICHAGES.html line 647) on the
    // header surface; what must never come back is a saturated frame, a gradient fill or a 2px line.
    const shortcutRules = rules('panels/shortcuts.css')
      .filter((rule) => rule.selector === '.shortcut-action-btn' && /\bborder\b/.test(rule.body));
    assert.ok(shortcutRules.some((rule) => /border: 1px solid/.test(rule.body)),
      'a shortcut is a row of the dashboard');
    assert.ok(shortcutRules.every((rule) => !/border: 2px/.test(rule.body)),
      'no shortcut keeps the two-pixel frame');
    assert.ok(shortcutRules.every((rule) => !/linear-gradient/.test(rule.body)),
      'a shortcut row carries no gradient fill');
    const tinted = rules('panels/shortcuts.css').find((rule) => rule.selector === '.shortcut-action-btn');
    assert.ok(/border: 1px solid color-mix\(in srgb, var\(--shortcut-color/.test(tinted.body)
      && / 50%/.test(tinted.body),
      'the hairline is the destination colour mixed at half with the border token');
    assert.ok(/background: var\(--pw-bg-header\)/.test(tinted.body),
      'the row sits on the header surface of the catalogue');
    const npc = rules('panels/npc.css').find((rule) => rule.selector.includes('.pw-loc-npc-btn')
      && /background: var\(--pw-bg-header\)/.test(rule.body));
    assert.ok(npc, 'a person on the location sheet sits on the header surface');
    const level = rules('panels/team-window.css').find((rule) => rule.selector === '#team-window-body .poke-card .poke-level');
    assert.ok(level && /background: var\(--pw-bg-sprite\)/.test(level.body),
      'the level of a team member is a pill of the shared chip grammar');
    const theme = rules('panels/settings.css').find((rule) => rule.selector === '.pw-settings-modal-window .pw-settings-grid');
    assert.ok(theme && /minmax\(120px, 1fr\)/.test(theme.body), 'the theme choices are swatch tiles');
    const labels = rules('panels/settings.css').filter((rule) => rule.selector === '.settings-section h3');
    assert.ok(labels.some((rule) => /text-transform: uppercase/.test(rule.body)),
      'a settings group opens on the shared small-caps label');
    assert.ok(labels.every((rule) => !/text-transform/.test(rule.body) || /uppercase/.test(rule.body)),
      'no block of the label cancels its small caps');
  });

  test('every window is drawn on the page, with one hairline and the small radius', () => {
    // A panel used to be a mid-grey box (--pw-surface) carrying a cream 2px darker edge, floating
    // over a cream-bordered window: three surfaces and two hairlines for one screen. The catalogue
    // draws a page (--pw-bg-page), a window on it (--pw-bg-surface) and cards of the corpus
    // (--pw-bg-header), each with the same #4A3E31 hairline.
    const tokens = stripComments(read('core/tokens.css'));
    assert.ok(/--pw-bg-page:\s*#[0-9A-Fa-f]{6}/.test(tokens), 'the page colour is a token of the corpus');
    assert.ok(/--pw-border:\s*var\(--pw-border-color\)/.test(tokens),
      '--pw-border is an alias of the hairline, never a second cream value');
    assert.ok(/--pw-radius:\s*var\(--pw-window-radius\)/.test(tokens),
      'a window keeps one radius step');
    assert.ok(/--pw-border-panel-header:\s*var\(--pw-border-color\)/.test(tokens),
      'the band under a panel header is the same hairline');
    const modal = rules('components/ui-modal.css')
      .filter((rule) => rule.selector === '.pw-fullscreen-overlay > .pw-modal-container');
    assert.ok(modal.some((rule) => /background: var\(--pw-bg-page\)/.test(rule.body)),
      'a full-screen panel is drawn on the page');
    const twoPx = /2px solid var\(--pw-border-panel-header\)/;
    for (const sheet of ['components/ui-modal.css', 'layout/window-chrome.css', 'core/base.css']) {
      assert.ok(!twoPx.test(stripComments(read(sheet))), `${sheet} keeps no two-pixel header rule`);
    }
  });

  test('the button family is described once, and it is the catalogue button', () => {
    // Wave 34 removed the layer of !important blocks that repainted every .hbtn and .tab of the
    // game from panel sheets: one rule now decides the surface, the hairline and the accent.
    const buttons = stripComments(read('components/ui-button.css'));
    const base = /(^|\})\s*\.hbtn \{([^}]*)\}/m.exec(buttons);
    assert.ok(base, 'the .hbtn base rule exists');
    assert.ok(/background: var\(--pw-bg-surface\)/.test(base[2]), 'a button sits on the window surface');
    assert.ok(/border: 1px solid var\(--pw-border-color\)/.test(base[2]), 'a button carries one hairline');
    assert.ok(/border-radius: var\(--pw-radius-sm\)/.test(base[2]), 'a button keeps the small radius');
    // A paint is a background, a border or a colour: the ergonomic rules (display:none on a
    // disabled control) keep their !important, they are not a paint.
    assert.ok(!/\.hbtn[^{}]*\{[^}]*(background|border|color)[^}]*!important/.test(buttons),
      'no .hbtn paint is forced with !important');
    assert.ok(!/background: var\(--pw-btn-bg\) !important/.test(buttons),
      'the old blanket paint is gone');
    for (const sheet of ['panels/automation.css']) {
      assert.ok(!/\.hbtn:not\([^{}]*\{[^}]*!important/.test(stripComments(read(sheet))),
        `${sheet} stops repainting every .hbtn of the game`);
    }
  });

  test('a category strip is one pill family across the bag, the box and the dictionary', () => {
    const chips = rules('components/chips.css');
    const family = chips.filter((rule) => /\.tab, \.dict-tab/.test(rule.selector.replace(/\s+/g, ' ')));
    assert.ok(family.length >= 1, 'the tab family shares one rule');
    const base = family[0];
    assert.ok(/border-radius: 18px/.test(base.body), 'a category pill is fully rounded');
    assert.ok(/background: var\(--pw-bg-header\)/.test(base.body), 'it sits on the header surface of the strip');
    const active = chips.filter((rule) => /\.tab\.active, \.dict-tab\.active/.test(rule.selector.replace(/\s+/g, ' ')));
    assert.ok(active.some((rule) => /background: var\(--light1\)/.test(rule.body)),
      'the active pill takes the light accent, as the catalogue selector does');
    assert.ok(!/\.dict-tab[^{}]*\{[^}]*(background|border|color)[^}]*!important/.test(stripComments(read('components/chips.css'))),
      'no tab paint is forced with !important');
  });

  test('an inset field is darker than the page and shares the hairline', () => {
    const tokens = stripComments(read('core/tokens.css'));
    assert.ok(/--pw-bg-inset:\s*var\(--pw-bg-sprite\)/.test(tokens), 'a field is an inset of the page');
    assert.ok(/--pw-border-soft:\s*var\(--pw-border-color\)/.test(tokens),
      'a field is ringed by the shared hairline');
  });

  test('the save menu is on the type scale like every other screen', () => {
    // It was the last sheet outside the scale, kept legal by a whitelist in the vocabulary test.
    const sheet = stripComments(read('panels/save-menu.css'));
    assert.ok(!/font-size:\s*[0-9.]+px/.test(sheet), 'no pixel font size survives in the save menu');
    assert.ok(/var\(--pw-font-size-hero\)/.test(sheet), 'the logo reads its own step of the scale');
    const vocabulary = stripComments(fs.readFileSync(path.join(PROJECT_ROOT, 'tests/StyleVocabulary.test.js'), 'utf8'));
    assert.ok(!/save-menu\.css/.test(vocabulary),
      'the save menu no longer needs an exemption from the scale');
  });

  test('a filter bar keeps the pill grammar and never grows a second frame', () => {
    // Pills carry one hairline each; the bar around them stays the toolbar's business.
    const pills = read('components/ui-toolbar.css');
    assert.ok(/border-radius: 999px/.test(pills), 'filter pills are fully rounded');
  });
});
