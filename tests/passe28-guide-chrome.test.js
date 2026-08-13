import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';
import { GuidePanelView, TutorialCardView } from '../src/ui/views/GuidePanelView.js'; // wave 14: real DS views injected into the vm sandbox
import { DashboardChromeView } from '../src/ui/views/DashboardChromeView.js';

// ── Phase 28 (wave 14): Guide & tutorial card + dashboard chrome
// User feedback handled first: the visited/reachable/locked "legend" panel
// was REMOVED — the "?" colour help is the only legend that must exist.
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const INDEX = R('index.html');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    document: { getElementById: () => null, createElement: () => ({ remove() {} }) },
    navigator: { maxTouchPoints: 0 },
    setTimeout: () => 0,
    G: { team: [], inventory: {}, badges: [], lang: 'en', wildWinsByLoc: {}, activeQuests: [] },
    t: (k) => k, tr: (k) => k,
    getIcon: () => '<svg viewBox="0 0 24 24"></svg>',
    saveGame: () => {}, notify: () => {}, addToInventory: () => {}, updateHeader: () => {},
    renderStoryWindow: () => {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.PokeUI = { views: { GuidePanelView, TutorialCardView } }; // wave 14 (legitimate move: adapters delegate to the DS views)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle (tutorial ESM = bundle isolé, globales via shim).
  const TUT_SRC = R('src/ui/game/tutorial.js');
  vm.runInContext(harnessIsEsm(TUT_SRC) ? harnessBundleSource(['src/ui/game/tutorial.js']) : TUT_SRC, sandbox, { filename: 'tutorial.js' });
  return sandbox;
}

test('legend panel REMOVED: no mapLegend* symbols anywhere (user feedback)', () => {
  assert.ok(!R('src/ui/game/map-logic.js').includes('showMapLegend'), 'adapter gone');
  assert.ok(!R('src/ui/components/map-dressing.js').includes('mapLegendBox'), 'component gone');
  const viewSrc = R('src/ui/views/MapOverlaysView.js');
  assert.ok(!viewSrc.includes('legendHTML'), 'view static gone');
  assert.ok(!CSS.includes('pw-map-legend'), 'styles gone');
});

test('tutorial card renders from zero via TutorialCardView (inline bar)', () => {
  const sb = makeSandbox();
  const html = sb.renderTutorialQuestBlock();
  assert.ok(html.includes('data-view="TutorialCardView"'), 'ECS view marker');
  assert.ok(html.includes('pw-tut-card') && html.includes('pw-tut-bar-fill'), 'DS card + bar');
  assert.ok(/width:\s*0%/.test(html) && html.includes('data-pct="0"'), 'inline width + data-pct contract');
  assert.ok(html.includes('data-call="tutorialDisable"'), 'disable-all routed');
  assert.ok(!html.includes('tutorial-quest-card') && !html.includes('tutorial-progress-bar'), 'zero legacy classes');
});

test('tutorial card NOT rendered when tutorials are disabled', () => {
  const sb = makeSandbox();
  sb.G.tutorial = { enabled: false, completed: {}, dismissedTips: {}, rewards: {} };
  assert.equal(sb.renderTutorialQuestBlock(), '', 'unusable ⇒ not rendered');
  assert.equal(sb.tutorialQuestModel(), null, 'model is null');
});

test('tutorialQuestModel shape: localized labels built in the adapter', () => {
  const sb = makeSandbox();
  const m = sb.tutorialQuestModel();
  assert.ok(m && typeof m.title === 'string' && m.title.length > 0, 'title');
  assert.ok(typeof m.pct === 'number' && m.pct >= 0 && m.pct <= 100, 'pct clamped');
  assert.ok(Array.isArray(m.actions) && m.actions.length === 3, 'primary + guide + disable');
  assert.equal(m.actions[0].primary, true, 'first action is the CTA');
});

test('guidePanelModel home: sections + tutorial actions', () => {
  const sb = makeSandbox();
  const m = sb.guidePanelModel();
  assert.equal(m.mode, 'home');
  assert.ok(m.cards.length >= 5, `${m.cards.length} section cards`);
  assert.ok(m.actions.some((a) => a.call === 'tutorialEnable'), 'enable action');
  assert.ok(m.cards.every((c) => c.id && c.title && typeof c.meta === 'string'), 'card shape');
});

test('GuidePanelView renders home grid and detail pages from zero', () => {
  const home = GuidePanelView.panelHTML({ mode: 'home', title: 'Guide', sub: 's', actions: [], cards: [{ id: 'combat', iconHtml: '<svg/>', title: 'Combat', meta: '8 pages' }] });
  assert.ok(home.includes('data-view="GuidePanelView"') && home.includes('pw-guide-card'), 'home grid');
  assert.ok(home.includes('data-call="setGuideSection"') && home.includes('data-call-args="\'combat\'"'), 'setGuideSection routing');
  const detail = GuidePanelView.panelHTML({ mode: 'detail', iconHtml: '<svg/>', title: 'Combat', sub: 's', backLabel: '←', pages: [{ title: 'p1', text: 't1' }, { title: 'p2', text: 't2' }] });
  assert.ok((detail.match(/pw-guide-page"/g) || []).length === 2, 'two page cards');
  assert.ok(detail.includes('data-call-args="null"'), 'back routing to setGuideSection(null)');
});

test('DashboardChromeView: ONE grip, icon lifted, label hooks kept', () => {
  const html = DashboardChromeView.titleHTML({ iconHtml: '<svg viewBox="0 0 24 24"></svg>', labelId: 'story-win-title', labelKey: 'story_quests_title', labelText: 'Histoire & Quêtes' });
  assert.equal((html.match(/pw-win-hdr-grip/g) || []).length, 1, 'exactly one grip');
  assert.equal((html.match(/<span><\/span>/g) || []).length, 6, 'six grip dots');
  assert.ok(html.includes('pw-win-hdr-icon') && html.includes('<svg'), 'icon raw SVG');
  assert.ok(html.includes('id="story-win-title"') && html.includes('data-i18n="story_quests_title"'), 'label hooks');
  assert.ok(!html.includes('Histoire & Quêtes') && html.includes('Histoire &amp; Quêtes'), 'text escaped');
});

test('index.html shells: 10 DS headers, zero legacy chrome classes', () => {
  assert.equal((INDEX.match(/class="pw-win-hdr" data-drag-window/g) || []).length, 10, '10 headers');
  assert.equal((INDEX.match(/<span class="pw-win-hdr-grip"/g) || []).length, 10, '10 grips');
  // Wave 27: 9 i18n labels, not 10 — map-win-title is the deliberate exception:
  // map_title_name contains {region} and the data-i18n label pass painted the
  // RAW template ("Carte {region}" on screen); the node is now owned by the two
  // interpolated writers (region.js / map-render.js). Guarded in passe54.
  assert.equal((INDEX.match(/class="pw-win-hdr-label" data-i18n=/g) || []).length, 9, '9 labels (+ map title, wave 27)');
  assert.ok(!INDEX.includes('class="title-icon"') && !INDEX.includes('class="drag-handle"'), 'legacy chrome gone');
});

test('CSS guide/tutorial/chrome blocks: DS present, legacy absent', () => {
  for (const needle of ['.pw-guide-card {', '.pw-guide-pages {', '.pw-tut-card {', '.pw-tut-bar-fill {',
    '.pw-win-hdr {', '.pw-win-hdr-grip {', '.pw-win-tool-btn {', '.dash-win.insert-above {',
    '.dash-col.col-hovered {', 'pwWinFlash', 'DS2813', 'DS2814']) {
    assert.ok(CSS.includes(needle), `missing ${needle}`);
  }
  for (const gone of ['.tutorial-quest-card', '.tutorial-progress-bar', '.guide-info-card', '.guide-card-button',
    '.win-header {', '.win-header-title', '.drag-handle', '.win-tool-btn']) {
    assert.ok(!CSS.includes(gone), `legacy ${gone} still present`);
  }
});

test('win-drag ghost + flash adapters carry no inline chrome styles', () => {
  const drag = R('src/ui/game/win-drag.js');
  assert.ok(!drag.includes("style.pointerEvents") && !drag.includes("style.zIndex") && !/style\.position\s*=/.test(drag), 'ghost chrome on the class');
  const dash = R('src/ui/game/dashboard.js');
  assert.ok(dash.includes('renderDashboardChrome') && dash.includes("pw-win-flash") && !dash.includes("style.boxShadow"), 'chrome stamper + class flash');
  const boot = R('src/application/bootstrap-timers.js');
  assert.ok(boot.includes('renderDashboardChrome'), 'stamped at boot');
});

