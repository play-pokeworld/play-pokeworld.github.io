/**
 * @file StaticRules.test.js
 * @brief Enforces the architecture rules of Rules.md on the source tree.
 */

import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { listJsFiles, findMatches, findBrokenImports, stripComments } from './SourceScanner.js';
import { GameConfig } from '../src/config/GameConfig.js';
import { SaveSchema } from '../src/config/SaveSchema.js';

const SRC = path.resolve('src');
const ALL = listJsFiles(SRC);
/** Code files: localization tables and raw game data are content, not code. */
const CODE = listJsFiles(SRC, ['localization/fr', 'localization/en', 'data/raw']);

/** Files allowed to touch the global browser objects. */
const DOM_ALLOWED = (file) => file.startsWith('ui/') || file === 'main.js' || file === 'core/LocalStore.js';

describe('Static rules', (test) => {
  test('release metadata stays synchronized with the documented facility schema', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(path.resolve('package-lock.json'), 'utf8'));
    assert.equal(GameConfig.VERSION, packageJson.version);
    assert.equal(packageLock.version, packageJson.version);
    assert.equal(packageLock.packages[''].version, packageJson.version);
    assert.equal(SaveSchema.VERSION, 20);
  });

  test('every relative import resolves to an existing export', () => {
    assert.empty(findBrokenImports(SRC, ALL), 'broken imports');
  });

  test('no HTML string injection (innerHTML / outerHTML / insertAdjacentHTML)', () => {
    assert.empty(findMatches(SRC, ALL, /\b(innerHTML|outerHTML|insertAdjacentHTML)\b/), 'HTML injection');
  });

  test('document / window are only used by src/ui, main.js and LocalStore', () => {
    const files = CODE.filter((file) => !DOM_ALLOWED(file));
    assert.empty(findMatches(SRC, files, /\b(document|window)\s*\./), 'DOM access outside the UI layer');
  });

  test('localStorage is only used by core/LocalStore.js', () => {
    const files = ALL.filter((file) => file !== 'core/LocalStore.js');
    assert.empty(findMatches(SRC, files, /\blocalStorage\b/), 'direct localStorage access');
  });

  test('no inline style assignment (styling goes through CSS classes and variables)', () => {
    assert.empty(findMatches(SRC, CODE, /\.style\.(?!setProperty|removeProperty|getPropertyValue)[A-Za-z]+\s*=|\.style\s*=|cssText/), 'inline styles');
  });

  test('pages are only imported by PageRegistry', () => {
    const pageFile = /from\s+['"][^'"]*\/(?!BasePage|PageIds|PageRegistry)[A-Za-z]+Page\.js['"]|from\s+['"]\.\/(?!BasePage|PageIds|PageRegistry)[A-Za-z]+Page\.js['"]/;
    const files = CODE.filter((file) => file !== 'pages/PageRegistry.js');
    assert.empty(findMatches(SRC, files, pageFile), 'page imported outside PageRegistry');
  });

  test('no literal text in console calls (debug logs are localized)', () => {
    assert.empty(findMatches(SRC, CODE, /console\.(log|info|warn|error|debug)\(\s*['"`]/), 'literal console text');
  });

  test('no emoji in code (icons come from IconRegistry)', () => {
    assert.empty(findMatches(SRC, CODE, /\p{Extended_Pictographic}/u), 'emoji in code');
  });

  test('no French comments in code (code is English-only)', () => {
    const hits = [];
    for (const file of ALL.filter((f) => !f.startsWith('localization/fr/') && !f.startsWith('localization/en/'))) {
      const code = fs.readFileSync(path.join(SRC, file), 'utf8');
      const comments = code.length - stripComments(code).length > 0 ? code.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || [] : [];
      for (const comment of comments) {
        if (/\b(le|la|les|des|une|est|pour|avec|dans|sur|pas)\b.*\b(le|la|les|des|une|est|pour|avec|dans)\b/i.test(comment)
          && /[éèêàùç]/.test(comment)) {
          hits.push(`${file}: ${comment.trim().slice(0, 100)}`);
        }
      }
    }
    assert.empty(hits, 'French comments');
  });

  test('no legacy global surface (globalThis / window assignments)', () => {
    const files = ALL.filter((file) => file !== 'core/LocalStore.js');
    assert.empty(findMatches(SRC, files, /\bglobalThis\b|\bwindow\.[A-Za-z_$]+\s*=[^=]/), 'global surface');
  });

  test('assets are referenced from the root assets/ folder only', () => {
    assert.empty(findMatches(SRC, ALL, /src\/assets\//), 'src/assets path');
  });

  test('one class per file', () => {
    const offenders = CODE.filter((file) => {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      return (code.match(/^\s*(export\s+)?class\s+\w+/gm) || []).length > 1;
    });
    assert.empty(offenders, 'files declaring several classes');
  });

  test('pages never keep a reference to a panel or a modal', () => {
    const pages = CODE.filter((file) => file.startsWith('pages/'));
    assert.empty(findMatches(SRC, pages, /this\._\w+\s*=\s*new\s+\w+(Panel|Modal)\s*\(/), 'panel / modal stored by a page');
  });

  test('every dashboard panel receives its starting column', () => {
    const offenders = CODE.filter((file) => {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      return /extends DraggablePanel/.test(code) && !/constructor\(column\)[\s\S]*?\bcolumn,/.test(code);
    });
    assert.empty(offenders, 'DraggablePanel subclasses without constructor(column)');
  });

  test('dashboard windows stay unscrollable while the document scrolls (dashboard-layout.css)', () => {
    const css = fs.readFileSync(path.resolve('assets/css/dashboard-layout.css'), 'utf8');
    assert.ok(/\.dash-win > \.win-body \{[^}]*overflow: visible !important/.test(css), 'win-body overflow visible');
    assert.ok(/body:not\(\.save-menu-active\)\s*\{[^}]*overflow-y: auto/.test(css), 'the document is the scroll container');
    assert.ok(/body:not\(\.mobile-mode\) #main-dashboard\s*\{[^}]*overflow: visible !important/.test(css), 'desktop dashboard expands instead of scrolling internally');
    assert.ok(/body\.mobile-mode #main-dashboard\s*\{[^}]*overflow: visible !important/.test(css), 'mobile dashboard expands instead of scrolling internally');
    assert.ok(/@import url\("\.\/dashboard-layout\.css"\);\s*$/m.test(fs.readFileSync(path.resolve('assets/css/style.css'), 'utf8')), 'loaded by style.css');
  });

  test('the six-member Team can hide its add slot despite the dashboard display override', () => {
    const css = fs.readFileSync(path.resolve('assets/css/design-system.css'), 'utf8');
    const visibilityCss = fs.readFileSync(path.resolve('assets/css/ui-element.css'), 'utf8');
    const team = fs.readFileSync(path.resolve('src/panels/ActiveTeamPanel.js'), 'utf8');
    assert.ok(/#team-window-body \.pw-drop-zone:not\(\.is-hidden\)\s*\{[^}]*display:\s*flex\s*!important/s.test(css), 'the flex override only matches a visible add slot');
    assert.ok(/\.pw-element\.is-hidden\s*\{[^}]*display:\s*none\s*!important/s.test(visibilityCss), 'hidden widgets retain the normal display-none rule');
    assert.ok(/if \(teamSize < PlayerDefaults\.TEAM_SIZE\) this\._addSlot\.show\(\);\s*else this\._addSlot\.hide\(\)/.test(team), 'ActiveTeamPanel hides the slot at the configured team limit');
  });

  test('desktop header and dashboard columns preserve the reference proportions', () => {
    const css = fs.readFileSync(path.resolve('assets/css/dashboard-layout.css'), 'utf8');
    assert.ok(/\.pw-game-screen > #header\s*\{[^}]*min-height:\s*65px/.test(css), 'desktop header keeps the 65px reference height');
    assert.ok(/#settings-btn\.pw-header-settings\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/.test(css), 'settings control keeps its 44px square size');
    assert.ok(/#main-dashboard > #col-1,[\s\S]*?#main-dashboard > #col-3\s*\{[^}]*flex:\s*1 1 0/.test(css), 'outer columns have the reference 1x share');
    assert.ok(/#main-dashboard > #col-2\s*\{[^}]*flex:\s*2 1 0/.test(css), 'map column has the reference 2x share');
  });

  test('Pokédex and Guide use the same responsive width tiers as Bag and PC', () => {
    const css = fs.readFileSync(path.resolve('assets/css/fullscreen-panel.css'), 'utf8');
    const panels = [
      fs.readFileSync(path.resolve('assets/css/pokedex.css'), 'utf8'),
      fs.readFileSync(path.resolve('assets/css/guide.css'), 'utf8')
    ];
    assert.ok(/--pw-modal-container-max-width:\s*960px/.test(css), 'the default fullscreen-panel cap is 960px');
    assert.ok(/@media \(min-width:\s*1600px\)[\s\S]*?--pw-modal-container-max-width:\s*1380px/.test(css), 'large desktop panels match the 1380px Bag/PC cap');
    assert.ok(/@media \(min-width:\s*2200px\)[\s\S]*?--pw-modal-container-max-width:\s*1820px/.test(css), 'ultra-wide panels match the 1820px Bag/PC cap');
    for (const panel of panels) {
      assert.ok(/width:\s*min\(95vw, var\(--pw-modal-container-max-width, 960px\)\)/.test(panel), 'panel width follows the shared responsive token');
      assert.ok(/max-width:\s*var\(--pw-modal-container-max-width, 960px\)/.test(panel), 'panel maximum follows the shared responsive token');
    }
  });

  test('PC and Pokédex Pokémon tiles keep reference geometry and silhouette states', () => {
    const pcCss = fs.readFileSync(path.resolve('assets/css/pokemon-grid.css'), 'utf8');
    const dexCss = fs.readFileSync(path.resolve('assets/css/pokedex.css'), 'utf8');
    assert.ok(/\.pw-box-panel \.pw-box-roster--storage\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill, minmax\(90px, 1fr\)\)/s.test(pcCss), 'PC cards use the reference grid density');
    assert.ok(/\.pw-box-panel \.pw-box-pokemon-tile\.dex-entry\s*\{[^}]*width:\s*72px;[^}]*height:\s*72px;[^}]*border-radius:\s*50%/s.test(pcCss), 'the PC entry uses the same 72px circular tile geometry');
    assert.ok(/\.pw-box-panel \.pw-box-grid-entry \.box-level\s*\{[^}]*bottom:\s*-9px[^}]*background:\s*var\(--dark1\)/s.test(pcCss), 'the PC level pill sits beneath the sprite');
    assert.ok(/\.pw-pokedex-entry\.dex-entry\s*\{[^}]*width:\s*72px;[^}]*height:\s*72px;[^}]*border-radius:\s*50%/s.test(dexCss), 'Pokédex entries are 72px circular tiles');
    assert.ok(/\.pw-pokedex-entry\.unknown \.dex-sprite img\s*\{[^}]*brightness\(0\)/s.test(dexCss), 'unknown entries use the original dark silhouette');
    assert.ok(/\.pw-pokedex-entry\.seen \.dex-sprite img\s*\{[^}]*brightness\(\.42\) saturate\(0\)/s.test(dexCss), 'seen entries use the original grayscale silhouette');
    assert.ok(!dexCss.includes('.pw-pokedex-name'), 'names are not added beneath the reference Pokédex tiles');
  });

  test('PC hides rank labels and keeps sort categories in its responsive filter toolbar', () => {
    const boxPanel = fs.readFileSync(path.resolve('src/panels/fullscreen/BoxPanel.js'), 'utf8');
    const panelCss = fs.readFileSync(path.resolve('assets/css/fullscreen-panel.css'), 'utf8');
    const styles = fs.readFileSync(path.resolve('assets/css/panels.css'), 'utf8');
    assert.ok(!boxPanel.includes('pw-box-rank'), 'rank is not rendered on Pokémon entries');
    assert.ok(!styles.includes('.pw-box-rank'), 'obsolete rank-badge styling is removed');
    assert.ok(/chips:\s*\[[\s\S]*?SORTS\.map/.test(boxPanel), 'sort categories are chips inside the existing FilterBar model');
    assert.ok(!boxPanel.includes('_sortBar()'), 'the detached second sort bar is removed');
    assert.ok(/#fs-box \.pw-modal-search-bar\.is-filled\s*\{[^}]*display:\s*block/s.test(panelCss), 'PC toolbar is laid out as a full-width panel, not a right-aligned flex item');
    assert.ok(/#fs-box \.pw-box-filterbar\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*box-sizing:\s*border-box/s.test(panelCss), 'the PC filter bar fits its modal at available widths');
  });

  test('PC and Pokédex use the same tile widget while BoxPanel stays team-agnostic', () => {
    const boxPanel = fs.readFileSync(path.resolve('src/panels/fullscreen/BoxPanel.js'), 'utf8');
    const pokedexPanel = fs.readFileSync(path.resolve('src/panels/fullscreen/PokedexPanel.js'), 'utf8');
    const entryWidget = fs.readFileSync(path.resolve('src/panels/components/PokemonGridEntry.js'), 'utf8');
    const transferSystem = fs.readFileSync(path.resolve('src/systems/TeamBoxTransferSystem.js'), 'utf8');
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf8');
    assert.ok(boxPanel.includes("import { PokemonGridEntry } from '../components/PokemonGridEntry.js';"), 'BoxPanel uses the shared full tile component');
    assert.ok(pokedexPanel.includes("import { PokemonGridEntry } from '../components/PokemonGridEntry.js';"), 'Pokédex uses the same full tile component');
    assert.ok(entryWidget.includes("import { PokemonGridSprite } from './PokemonGridSprite.js';"), 'the shared tile wraps the common sprite widget');
    assert.ok(entryWidget.includes('pw-pokemon-grid-entry'), 'both panels instantiate the same outer tile class');
    assert.ok(/className: 'dex-entry pw-box-pokemon-tile'/.test(boxPanel), 'PC entries keep the Pokédex dex-entry base class');
    assert.ok(!/TeamSystem|TeamChangedEvent|teamUid|select-team|replace-team/.test(boxPanel), 'BoxPanel contains no team system or team-flow state');
    assert.ok(/extends BaseSystem/.test(transferSystem) && /TeamSystem/.test(transferSystem) && /BoxSystem/.test(transferSystem), 'cross-system transfers are owned by a separate BaseSystem');
    assert.ok(boxPanel.includes('BoxPokemonSelectionRemoveRequestedEvent'), 'the PC footer emits a generic selection action');
    assert.ok(/_onSelectionRemoveRequested[\s\S]*?storeToBox\(pending\.teamUid\)/.test(transferSystem), 'the coordinator interprets removal as a Team-to-PC transfer');
    assert.ok(main.includes("engine.registerSystem('TeamBoxTransferSystem', TeamBoxTransferSystem.getInstance());"), 'the coordinator follows the Engine lifecycle from the composition root');
  });

  test('dungeon grid styles target the Rework widget and keep reference tile states legible', () => {
    const css = fs.readFileSync(path.resolve('assets/css/dungeons.css'), 'utf8');
    const panel = fs.readFileSync(path.resolve('src/panels/components/DungeonExpeditionPanel.js'), 'utf8');
    assert.ok(/\.pw-dungeon-expedition \.pw-dgn-grid\s*\{/.test(css), 'styles target the actual Rework panel host');
    assert.ok(/\.pw-dungeon-expedition \.pw-dgn-grid--11\s*\{[^}]*repeat\(11, 44px\)/.test(css), 'the widest saved map keeps one fixed reference column per map column');
    assert.ok(/\.pw-dungeon-expedition \.pw-dgn-tile\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/.test(css), 'tiles use the reference 44 px size');
    assert.ok(/\.pw-dungeon-expedition \.pw-dungeon-map\s*\{[^}]*overflow-x:\s*auto/.test(css), 'the framed board scrolls rather than clips on narrow screens');
    assert.ok(/\.pw-dgn-tile \.pw-dgn-ic\s*\{[^}]*width:\s*74%;[^}]*mask-image:\s*var\(--pw-mask-icon\)/.test(css), 'tile glyphs are CSS-tinted reference sprites at 74 %');
    assert.ok(/\.pw-dgn-tile \.pw-dgn-player\s*\{[^}]*width:\s*82%/.test(css), 'the player sprite keeps the reference 82 % size');
    assert.ok(panel.includes('AssetPaths.dungeonTile(') && panel.includes('DungeonTileVisuals') && !/mapPin|TILE_ICONS/.test(panel), 'tiles draw the reference dungeon sprites instead of generic icons');
    assert.ok(/\.pw-dungeon-expedition \.pw-dgn-tile\.is-fog::before\s*\{[^}]*content:\s*'\?'/.test(css), 'unexplored tiles show the reference question mark');
    for (const state of ['t-empty', 't-combat', 't-elite', 't-chest', 't-boss', 't-ladder']) {
      assert.ok(css.includes(`.pw-dungeon-expedition .pw-dgn-tile.${state}`), `${state} has an explicit map treatment`);
    }
    assert.ok(/var\(--pw-dgn-tint\)/.test(css) && /var\(--red\)/.test(css) && /var\(--yellow\)/.test(css) && /var\(--blue\)/.test(css), 'type colors follow the active theme tokens');
    assert.ok(!/\bempty:\s*'emptyDiamond'/.test(panel), 'explored empty tiles stay visually empty like the reference');
  });

  test('Settings doubles the medium width on desktop and preserves its responsive mobile cap', () => {
    const css = fs.readFileSync(path.resolve('assets/css/ui-modal.css'), 'utf8');
    const desktop = css.match(/\.pw-panel--modal-window\.pw-settings-modal-window\s*\{([^}]+)\}/);
    const mobile = css.match(/@media \(max-width: 600px\)[\s\S]*?\.pw-panel--modal-window\.pw-settings-modal-window\s*\{([^}]+)\}/);
    assert.ok(desktop, 'the Settings dialog has its dedicated desktop sizing rule');
    assert.ok(/width:\s*min\(1120px, calc\(100vw - 40px\)\)/.test(desktop[1]), 'desktop width is at least twice the 560px medium baseline, clamped to the viewport');
    assert.ok(/max-width:\s*min\(1120px, calc\(100vw - 40px\)\)/.test(desktop[1]), 'the desktop maximum follows the same viewport cap');
    assert.ok(mobile, 'the dedicated mobile override remains present');
    assert.ok(/width:\s*min\(560px, calc\(100vw - 24px\)\)/.test(mobile[1]), 'mobile keeps the previous narrow width');
    assert.ok(/max-width:\s*calc\(100vw - 24px\)/.test(mobile[1]), 'mobile width remains constrained to the viewport');
  });

  test('shiny sprites use the star badge, not a red border or glow', () => {
    const css = fs.readFileSync(path.resolve('assets/css/design-system.css'), 'utf8');
    const spriteRule = css.match(/\.pw-poke-card\.box-card--shiny \.box-tile\s*\{([^}]*)\}/);
    assert.ok(spriteRule, 'the legacy shiny sprite selector is explicitly normalized');
    assert.ok(/border-color:\s*transparent\s*!important/.test(spriteRule[1]), 'the sprite has no shiny-colored border');
    assert.ok(/box-shadow:\s*none\s*!important/.test(spriteRule[1]), 'the sprite has no shiny-colored frame');
  });

  test('background walkers mirror sprites to face the randomized travel direction', () => {
    const css = fs.readFileSync(path.resolve('assets/css/pokemon-background.css'), 'utf8');
    assert.ok(/\.pw-background-pokemon-walker--facing-left \.pw-background-pokemon-sprite\s*\{[^}]*transform:\s*scaleX\(-1\)/.test(css), 'leftward routes mirror the sprite');
    assert.ok(/\.pw-background-pokemon-walker--facing-right \.pw-background-pokemon-sprite\s*\{[^}]*transform:\s*scaleX\(1\)/.test(css), 'rightward routes keep the default sprite orientation');
  });

  test('mobile dashboard focus does not hide modal windows', () => {
    const css = fs.readFileSync(path.resolve('assets/css/panels.css'), 'utf8');
    assert.ok(/body\.mobile-mode \.pw-modal-backdrop > \.pw-panel--modal-window\s*\{[^}]*display:\s*flex/.test(css), 'modal panels stay visible above the mobile dashboard');
  });
});
