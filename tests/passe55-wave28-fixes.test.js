// Wave 28 — user-reported visual/UX fixes (15 points). DOM-free locks for
// the exact contracts each fix established; the pixel-level before/after
// proof lives in harness/visual-wave28.mjs (Chromium).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const R = (rel) => fs.readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');
const DS = R('src/assets/styles/design-system.css');
const DS1 = DS.replace(/\s+/g, ' ');
const IDX = R('index.html');
const MD = R('src/ui/components/map-dressing.js');
const LI = R('src/ui/game/location-info.js');
const SV = R('src/application/save/save.js');
const SMV = R('src/ui/views/SettingsModalView.js');
const BV = R('src/ui/views/BaseViews.js');
const PM = R('src/ui/game/preset-manager.js');
const QV = R('src/ui/views/QuestView.js');
const BOOT = R('src/application/bootstrap-timers.js');
const BI = R('src/application/combat/battle-init.js');
const BUI = R('src/ui/game/battle-ui.js');

/* ── 1. Location window: findable items = wild display (disc + name below) ── */
test('wave28 #1: route drops render as wild-entry cards (disc + name below)', () => {
  assert.ok(MD.includes("class: 'pw-loc-wild-grid pw-loc-drop-grid'"), 'drops reuse the wild grid');
  assert.ok(MD.includes("class: 'pw-loc-wild-card pw-loc-drop-card'"), 'drops reuse the wild card');
  assert.ok(MD.includes("class: 'pw-loc-wild-disc'"), 'drops reuse the 72px disc frame');
  assert.ok(!MD.includes('pw-loc-drop-chip'), 'old inline chip markup gone');
  assert.ok(LI.includes('itemIcon(d, 56)'), '56px item sprite (was 24px)');
  assert.ok(LI.includes('pw-poke-circle-wrap'), 'canonical disc wrap around the icon');
  assert.ok(!/\{\s*iconHtml: itm \? itemIcon\(d, 24\)/.test(LI), 'old 24px model gone');
});

/* ── 2. Settings: no duplicate sprite+name recap under the save icon label ── */
test('wave28 #2: settings save-icon section no longer recaps sprite + name', () => {
  assert.ok(!SMV.includes("id: 'save-profile-icon-current'"), 'recap zone removed from the view');
  assert.ok(SMV.includes('openSaveIconBoxSelector'), 'the picker button stays');
  // the legacy writer no-ops through its guard (contract kept for passe30)
  assert.ok(SV.includes('renderSaveProfileCurrentIcon'), 'writer kept');
  assert.ok(SV.includes("if(!target) return;"), 'missing-target guard');
});

/* ── 3. Management / editors / summary header bands = full sheet width ────── */
test('wave28 #3: header bands defeat the max-width hammer (full-bleed, right side too)', () => {
  const band = DS1.substring(DS1.indexOf('max-width: none !important') - 1200, DS1.indexOf('max-width: none !important') + 40);
  for (const needle of [
    '#poke-modal-inner > .pw-view > .modal-title:first-child',
    '#battle-summary-inner > .pw-view > .modal-title:first-child',
    '.afk-result-card > .modal-title:first-child',
    '#poke-modal.preset-editor-modal #poke-modal-inner > .pw-view > .modal-title:first-child',
    '#poke-modal.preset-editor-modal #poke-modal-inner .pw-base-dialog > .modal-title:first-child',
    '#poke-modal.preset-editor-modal #poke-modal-inner .pw-base-npced > .modal-title:first-child',
    '#poke-modal-inner.management-inner > .pw-view > .modal-title.management-title:first-child',
  ]) assert.ok(band.includes(needle), `uncapped band: ${needle}`);
  assert.ok(DS1.includes('max-width: none !important'), 'hammer defeated');
});

/* ── 14. Opened panels paint ABOVE the game title bar ────────────────────── */
test('wave28 #14: overlays sit above #header (z 950)', () => {
  assert.ok(DS1.includes('#fullscreen-panel-modal { z-index: 1100 !important; }'), 'fs modal (inline 600) raised');
  const m = DS1.match(/#settings-modal, #quest-modal, #poke-modal, #battle-summary-modal \{ z-index: (\d+)/);
  assert.ok(m && Number(m[1]) > 950, `modal group z ${m && m[1]} > 950`);
  assert.ok(DS1.includes('#confirm-modal { z-index: 50000 !important; }'), 'confirm stays on top (untouched)');
});

/* ── 4. NPC editor: whole-page scroll + identity row side by side ─────────── */
test('wave28 #4: NPC editor scrolls as one page, sprite next to the name field', () => {
  // Wave 30 (documented movement): whole-sheet-scroll → window template
  // (sealed frame; the panel BODY scrolls; head/foot outside the flow).
  assert.ok(/#poke-modal\.preset-editor-modal #poke-modal-inner:has\(\.pw-panel-shell\)[\s\S]*?overflow-y: hidden !important/.test(DS1),
    'wave 30: the frame is sealed while a chromed panel is open');
  assert.ok(/\.pw-base-npced #base-npced-team \{[^}]*max-height: none !important[^}]*overflow: visible !important/.test(DS1),
    'the team section no longer owns a nested scroller');
  assert.ok(/#base-npced-team \{[^}]*display:\s*grid/.test(DS1), 'team cards flow as a grid');
  assert.ok(BV.includes("class: 'pw-base-npced-id'"), 'dedicated identity row');
  assert.ok(BV.includes('pw-base-npced-id-portrait'), 'portrait button left');
  assert.ok(BV.includes('pw-base-npced-id-name'), 'name field right');
  assert.ok(!BV.includes('pw-base-npced-portrait-slot'), 'the 22px idx chip is gone from the identity row');
  assert.ok(DS1.includes('.pw-base-npced-id {'), 'identity row CSS present');
});

/* ── 5. Dictionary search bar back to a sane height ───────────────────────── */
test('wave28 #5: dict search kills the row-basis that made it 140px tall', () => {
  assert.ok(DS1.includes('.dict-toolbar > .dict-search { flex: 0 0 auto; width: 100%; }'),
    'flex-basis neutralized inside the column toolbar');
});

/* ── 6. Attack chips: neutral base, type-colour charge fill, no bottom bar ── */
test('wave28 #6: attack chips neutral, charge fill = exact type colour, bottom bar gone', () => {
  assert.ok(DS1.includes('.poke-move[class*="type-"] { background: var(--light1) !important; color: var(--dark1) !important; }'),
    'typed chips keep the neutral base');
  assert.ok(DS1.includes('.poke-move[class*="type-"].charging { --charge-color: var(--type-color, rgba(148,136,107,0.4)); }'),
    'charge fill takes the exact type colour');
  assert.ok(DS1.includes('.poke-move.charging::before {'), 'the on-chip bar is untouched');
  assert.ok(!IDX.includes('<div id="move-buttons"></div>'), 'the extra bottom bar is removed');
  assert.ok(BUI.includes('if (!container) return;'), 'renderMoveButtons missing-host guard');
});

/* ── 7. ONE content-grid recipe across panels ─────────────────────────────── */
test('wave28 #7: guide / team manager / management sections / quest board / NPC team share the canonical grid', () => {
  assert.ok(/\.pw-guide-grid \{\s*grid-template-columns: repeat\(auto-fill, minmax\(min\(240px, 100%\), 1fr\)\);\s*gap: 14px;/.test(DS1),
    'guide grid = canonical recipe');
  assert.ok(PM.includes('preset-list pw-preset-grid'), 'team manager opts into the grid');
  assert.ok(DS1.includes('.pw-preset-grid {'), 'preset grid CSS present');
  assert.ok(/\.upgrade-grid,[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(min\(240px, 100%\), 1fr\)\);\s*gap: 14px;/.test(DS1),
    'management sections = canonical recipe');
  assert.ok(QV.includes('pw-quest-offer-grid'), 'repeatable board offers flow in a grid');
  assert.ok(DS1.includes('.pw-quest-offer-grid {'), 'quest offer grid CSS present');
  assert.ok(/#base-npced-team \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(min\(300px, 100%\), 1fr\)\) !important;/.test(DS1), 'NPC team grid = canonical recipe (wave 30)');
});

/* ── 8. PC editor: the duplicated close button is gone ────────────────────── */
test('wave28 #8: BasePcDialogView drops the bottom "Fermer" button', () => {
  const pcView = BV.substring(BV.indexOf('export class BasePcDialogView'), BV.indexOf('export class BaseNpcEditorView'));
  assert.ok(!pcView.includes('m.closeLabel'), 'no close footer button');
  assert.ok(!pcView.includes('pw-btn-group'), 'no button group below the panel');
  assert.ok(pcView.includes("call: 'closeBaseDialog'"), 'the title ✕ stays (closeBaseDialog contract)');
});

/* ── 9. Escape + mobile back close the top overlay ────────────────────────── */
test('wave28 #9: Escape + history back close the top menu', () => {
  assert.ok(BOOT.includes("e.key !== 'Escape'"), 'Escape keydown handler');
  assert.ok(BOOT.includes('pwCloseTopOverlay'), 'top-overlay closer exposed');
  // Vague 41 — lock recâblé (intention 'global export' préservée) : la pose
  // window est devenue le shim canonique gardé globalThis (window === globalThis
  // au navigateur).
  assert.ok(BOOT.includes("globalThis.pwCloseTopOverlay = pwCloseTopOverlay"), 'global export');
  assert.ok(BOOT.includes("history.pushState({ pwOverlaySeed: 1 }, '')"), 'history seed on first open');
  assert.ok(BOOT.includes("'popstate'"), 'back button listener');
  assert.ok(BOOT.includes('closeUnifiedSelectorModal') && BOOT.includes('closeFullscreenPanel'), 'cleanup table reused');
  assert.ok(BOOT.includes("'confirm-modal': 1"), 'mandatory dialogs never close (Escape excluded)');
});

/* ── 10. Menus scale with the screen ──────────────────────────────────────── */
test('wave28 #10: large screens raise the panel caps (tokens + fixed widths)', () => {
  for (const mq of ['@media (min-width: 1600px)', '@media (min-width: 2200px)'])
    assert.ok(DS1.includes(mq), `device step ${mq}`);
  assert.ok(DS1.includes('--pw-panel-w-md: 900px'), 'settings/info wider at 1600+');
  assert.ok(/--pw-panel-w-info: 980px/.test(DS1), 'info panels wider at 2200+');
  assert.ok(/@media \(min-width: 1600px\)[\s\S]*?\.pw-modal-container \{ max-width: 1380px; \}/.test(DS1), 'fs container scales');
  assert.ok(DS1.includes('#battle-summary-inner { max-width: 1080px; }'), 'summary scales');
});

/* ── 11. Explorer on small screens auto-opens the battle view ─────────────── */
test('wave28 #11: battle start focuses the Combat view on mobile', () => {
  assert.ok(BI.includes("document.body.classList.contains('mobile-mode')"), 'mobile detection');
  assert.ok(BI.includes("setMobileView('combat')"), 'auto-switch to the battle window');
});

/* ── 12 + 13. Small screens: sheets anchor at the top, above the chrome ───── */
test('wave28 #12/#13: on mobile the sheets anchor at the top and cover the shortcut bar', () => {
  assert.ok(/@media \(max-width: 850px\), \(pointer: coarse\) \{ #settings-modal, #quest-modal, #confirm-modal, #poke-modal, #battle-summary-modal, #unified-selector-modal \{ align-items: flex-start; padding-top: 6px; \}/.test(DS1),
    'top-anchored sheets');
  assert.ok(DS1.includes('#fullscreen-panel-modal { align-items: flex-start !important; padding-top: 6px !important; }'),
    'fullscreen panel top-anchored (inline styles defeated)');
});
