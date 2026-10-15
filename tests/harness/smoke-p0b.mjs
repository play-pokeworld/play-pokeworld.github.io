// smoke-p0b.mjs — verification of the P1 UI fixes in a real Chromium:
//  B. filter editor: 5 locked presets in order (Errant first since V7-R3c), options panel
//     collapsed by default + ⚙ toggle, type/encounter dropdowns;
//  C. shop: first city sells ONLY Poké Ball (progressive per-town unlock);
//  D. bag + dictionary list balls;
//  A. capture animation: anchored in the battle window + catch rate label,
//     and the verdict still shows when animations are disabled.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 }).catch(() => {});
const picked = await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) { btn.click(); return true; } return false;
});
if (picked) {
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
} else {
  await page.evaluate(() => { window.G.starter = true; window.G.team.push(window.createPoke(4, 5, false)); window.saveGame(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.startSaveById(window.currentSaveId || localStorage.getItem('pokeworld_active_save')));
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
}
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
// Neutralize tutorial rewards so they cannot shift money during assertions.
await page.evaluate(() => {
  try {
    const st = window.ensureTutorialState();
    if (window.tutorialSteps) for (const s of window.tutorialSteps()) st.rewards[s.id] = true;
  } catch (_) {}
});

// ── B. Filter editor ────────────────────────────────────────────────────────
await page.evaluate(() => window.openBallFilterEditor());
await page.waitForSelector('#pw-ball-filter-list .pw-ball-filter-row', { timeout: 5000 });
const editor = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#pw-ball-filter-list .pw-ball-filter-row')];
  return {
    count: rows.length,
    names: rows.map(r => (r.querySelector('.pw-ball-filter-name')?.textContent || '').trim()),
    optsVisible: rows.map(r => !!r.querySelector('.pw-ball-opts')),
    paramBtns: rows.map(r => (r.querySelector('.pw-ball-params-toggle')?.textContent || '').trim()),
    switches: rows.map(r => !!r.querySelector('.pw-ball-switch')),
  };
});
assert.equal(editor.count, 5, 'B1 — 5 preset filters in the editor');
// V7-R3c : ordre = priorité → Errant, Nouveau chromatique, Chromatique déjà capturé, Nouveau, Déjà capturé
assert.equal(editor.names[0], 'Errant', 'B2 — "Errant" is the FIRST filter (order = priority, R3c-06)');
assert.ok(editor.names.indexOf('Nouveau chromatique') < editor.names.indexOf('Nouveau'), 'B2b — shiny presets come before "Nouveau"');
assert.ok(editor.names.includes('Déjà capturé'), 'B3 — "Déjà capturé" present');
assert.ok(editor.optsVisible.every(v => v === false), 'B4 — options hidden by default (name + ball only)');
assert.ok(editor.paramBtns.length === 5 && editor.paramBtns.every(l => /paramètre/i.test(l)), 'B5 — each filter has its own "Modifier les paramètres" button');
assert.ok(editor.switches.every(v => v === true), 'B6 — each filter has an enable switch');

// Gear moved to the Poké Balls window header; grid header says "Nom"; no hint line.
const winHeader = await page.evaluate(() => {
  const head = document.getElementById('win-pokeballs');
  const tool = head ? head.querySelector('[data-call="openBallFilterEditor"]') : null;
  const body = document.getElementById('pokeballs-window-body');
  return {
    hasTool: !!tool,
    headText: body ? body.textContent : '',
    hasHint: body ? !!body.querySelector('.pw-ball-slot-hint') : true,
  };
});
assert.equal(winHeader.hasTool, true, 'B6b — the settings gear sits in the Poké Balls window header');
assert.ok(/Nom/.test(winHeader.headText), 'B6c — grid header says "Nom" (not "Filtres de capture")');
assert.equal(winHeader.hasHint, false, 'B6d — the useless hint line is removed');

// The gear must OPEN the editor without starting a window drag (data-stop-drag).
const gear = await page.evaluate(() => {
  const btn = document.querySelector('#win-pokeballs [data-call="openBallFilterEditor"]');
  if (!btn) return null;
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window }));
  const opacity = document.getElementById('win-pokeballs').style.opacity;
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window }));
  return { stopDrag: btn.dataset.stopDrag === 'true', opacity, editorOpen: !!document.getElementById('pw-ball-overlay-root') };
});
assert.ok(gear && gear.stopDrag, 'B6e — gear has data-stop-drag');
assert.equal(gear.opacity, '', 'B6f — mousedown on gear does NOT start a window drag');
assert.equal(gear.editorOpen, true, 'B6g — clicking the gear opens the filter editor');

// The gear must be small (26px), and the filter NAME must be plain text.
const gearSize = await page.evaluate(() => {
  const btn = document.querySelector('#win-pokeballs [data-call="openBallFilterEditor"]');
  const r = btn.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
});
assert.ok(gearSize.w <= 30 && gearSize.h <= 30, 'B6h — gear is small (26px, got ' + gearSize.w + 'x' + gearSize.h + ')');
const nameCell = await page.evaluate(() => {
  const name = document.querySelector('#pokeballs-window-body .pw-ball-row-name');
  return { action: name ? name.getAttribute('data-action') : 'none', call: name ? name.getAttribute('data-call') : 'none' };
});
assert.equal(nameCell.action, null, 'B6i — filter name is plain text (no click action)');

// Open the settings of the FIRST filter only → +/- circular buttons, no checkboxes.
await page.evaluate(() => { const row = document.querySelector('#pw-ball-filter-list .pw-ball-filter-row'); row.querySelector('.pw-ball-params-toggle').click(); });
const optsOn = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#pw-ball-filter-list .pw-ball-filter-row')];
  const first = rows[0];
  return {
    visibleCount: rows.filter(r => !!r.querySelector('.pw-ball-opts')).length,
    optBtns: [...first.querySelectorAll('.pw-ball-opt-btn')].map(b => ({ text: b.textContent.trim(), disabled: b.disabled, cls: b.className })),
    nCheckboxes: first.querySelectorAll('input[type=checkbox]').length,
    optsIsColumn: getComputedStyle(first.querySelector('.pw-ball-opts')).flexDirection === 'column',
  };
});
assert.equal(optsOn.visibleCount, 1, 'B7 — only the toggled filter shows its options (per-filter)');
assert.ok(optsOn.optBtns.length >= 1, 'B8 — +/- option buttons rendered');
assert.ok(optsOn.optBtns.every(b => b.disabled === true), 'B9 — preset option buttons locked (read-only)');
assert.equal(optsOn.nCheckboxes, 0, 'B10 — no checkboxes, only circular +/- buttons');
assert.equal(optsOn.optsIsColumn, true, 'B11 — options laid out vertically');

// Custom filter: name input + toggleable +/- buttons.
await page.evaluate(() => window.createBallFilter());
const custom = await page.evaluate(() => {
  // Re-query après le re-render (le DOM est remplacé à chaque clic).
  const findCustom = () => [...document.querySelectorAll('#pw-ball-filter-list .pw-ball-filter-row')].find(x => x.dataset.filterId && x.dataset.filterId.startsWith('custom_'));
  const before = findCustom();
  const isInput = !!before.querySelector('.pw-ball-filter-name-input');
  before.querySelector('.pw-ball-params-toggle').click();
  const after = findCustom();
  const btns = [...after.querySelectorAll('.pw-ball-opt-btn')];
  return { names: isInput ? 'input' : 'span', btnsDisabled: btns.map(b => b.disabled), nOptRows: after.querySelectorAll('.pw-ball-opt-row').length };
});
assert.equal(custom.names, 'input', 'B12 — custom filter name is an editable input');
assert.ok(custom.btnsDisabled.every(d => d === false), 'B13 — custom filter options toggleable');
assert.ok(custom.nOptRows >= 6, 'B14 — custom filter offers the 4 conditions + type + encounter');
// Colored +/- buttons (green add / red remove) on the custom filter.
const colors = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#pw-ball-filter-list .pw-ball-filter-row')];
  const r = rows.find(x => x.dataset.filterId && x.dataset.filterId.startsWith('custom_'));
  const add = r.querySelector('.pw-ball-opt-btn.add');
  const rem = r.querySelector('.pw-ball-opt-btn.remove');
  return { addBg: add ? getComputedStyle(add).backgroundColor : '', remBg: rem ? getComputedStyle(rem).backgroundColor : '' };
});
assert.ok(/46, 204, 113/.test(colors.addBg), 'B15 — add buttons are green (rgb(46, 204, 113))');
assert.ok(/231, 76, 60/.test(colors.remBg), 'B16 — remove buttons are red (rgb(231, 76, 60))');
await page.evaluate(() => window.closeBallOverlay());

// Ball picker: selected row must keep text readable (dark text on accent).
await page.evaluate(() => window.openBallPicker('new'));
const selContrast = await page.evaluate(() => {
  const sel = document.querySelector('.pw-ball-row-opt.selected');
  if (!sel) return null;
  return { nameColor: getComputedStyle(sel.querySelector('.pw-ball-name')).color };
});
assert.ok(selContrast && /28, 26, 23/.test(selContrast.nameColor), 'B17 — selected ball name is dark (readable on accent)');
await page.evaluate(() => window.closeBallOverlay());

// ── C. Shop progressive per town ────────────────────────────────────────────
const shopAt = async (loc) => page.evaluate((l) => {
  G.location = l;
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  if (typeof window.renderShop === 'function') window.renderShop(el);
  const txt = (document.getElementById('fs-panel-content') || document.getElementById('tab-content')).textContent || '';
  return { hasSuper: /Super Ball/.test(txt), hasHyper: /Hyper Ball/.test(txt), hasPoke: /Poké Ball/.test(txt) };
}, loc);
const pallet = await shopAt('pallet');
assert.equal(pallet.hasPoke, true, 'C1 — pallet sells Poké Ball');
assert.equal(pallet.hasSuper, false, 'C2 — pallet does NOT sell Super Ball');
assert.equal(pallet.hasHyper, false, 'C3 — pallet does NOT sell Hyper Ball');
const cinnabar = await shopAt('cinnabar');
assert.equal(cinnabar.hasSuper, true, 'C4 — cinnabar sells Super Ball');
assert.equal(cinnabar.hasHyper, true, 'C5 — cinnabar sells Hyper Ball');

// ── D. Bag category + dictionary ────────────────────────────────────────────
await page.evaluate(() => { G.pokeballs.pokeball = 10; G.pokeballs.greatball = 3; G.inventory.nugget = 2; window.renderInventory(document.getElementById('fs-panel-content') || document.getElementById('tab-content')); });
const bag = await page.evaluate(() => {
  const panel = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  return { html: panel.innerHTML };
});
assert.ok(/Poké Balls/.test(bag.html), 'D1 — "Poké Balls" category tab exists');
await page.evaluate(() => { window._invCat = 'pokeballs'; window._invCatTouched = true; window.renderInventory(document.getElementById('fs-panel-content') || document.getElementById('tab-content')); });
const bagItems = await page.evaluate(() => {
  const panel = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  return [...panel.querySelectorAll('.inv-name')].map(e => e.textContent.trim());
});
assert.ok(bagItems.some(n => /Poké Ball/.test(n)), 'D2 — Poké Ball listed in bag');
assert.ok(bagItems.some(n => /Super Ball/.test(n)), 'D3 — Super Ball listed in bag');
assert.ok(!bagItems.some(n => /Honor Ball/.test(n)), 'D4 — Honor Ball hidden at 0 qty');
const dict = await page.evaluate(() => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  window.renderDictionary(host);
  const text = host.textContent || '';
  host.remove();
  return { text };
});
assert.ok(/Poké Ball/.test(dict.text), 'D5 — dictionary lists Poké Ball');
assert.ok(/Super Ball/.test(dict.text), 'D6 — dictionary lists Super Ball');

// ── A. Capture animation anchored + rate label + disabled fallback ─────────
const anim = await page.evaluate(() => {
  const row = document.getElementById('battle-team-row');
  row.innerHTML = '<div class="poke-card" style="width:300px;height:120px;background:#222;">enemy</div>';
  const card = row.querySelector('.poke-card');
  const cr = card.getBoundingClientRect();
  window.playCaptureAnimation('pokeball', true, 'Capturé !', 10);
  const root = document.getElementById('pw-capture-anim');
  const rr = root.getBoundingClientRect();
  return {
    parentId: root.parentNode.id || root.parentNode.tagName,
    position: getComputedStyle(root).position,
    cardCenter: { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 },
    animCenter: { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 },
    html: root.innerHTML,
  };
});
assert.equal(anim.parentId, 'battle-center-panel', 'A1 — animation is a CHILD of the battle window');
assert.equal(anim.position, 'absolute', 'A2 — positioned absolute inside the window');
assert.ok(Math.abs(anim.animCenter.x - anim.cardCenter.x) < 6 && Math.abs(anim.animCenter.y - anim.cardCenter.y) < 6, 'A3 — centered on the enemy card');
assert.ok(/Chance de Capture\s*:\s*10\s*%/.test(anim.html), 'A4 — phase 1 shows "Chance de Capture : 10%"');

// Disabled animations: verdict still appears (blocking until next spawn).
await page.evaluate(() => { if (!G.settings) G.settings = {}; G.settings.captureAnimations = false; window.playCaptureAnimation('pokeball', false, 'Échec…', 10); });
const disabled = await page.evaluate(() => {
  const root = document.getElementById('pw-capture-anim');
  return { html: root ? root.innerHTML : '', until: window.__pwCaptureAnimUntil || 0 };
});
assert.ok(/Échec…/.test(disabled.html) && !/pw-ca-ball/.test(disabled.html), 'A5 — disabled: verdict shown without the ball');
assert.ok(disabled.until > Date.now(), 'A6 — disabled verdict still blocks the next spawn');
await page.evaluate(() => { if (!G.settings) G.settings = {}; G.settings.captureAnimations = true; });

// ── H. Header no longer shows money ────────────────────────────────────────
// Passe 28 : #h-money subsiste masqué (du code historique l'écrit encore) — il ne doit pas être visible.
assert.equal(await page.evaluate(() => { const el = document.getElementById('h-money'); return !!el && !el.hidden && el.offsetParent !== null; }), false, 'H1 — money not visible in the title bar');
assert.equal(await page.evaluate(() => { const i = document.querySelector('#win-currency .pw-win-hdr-icon'); return i ? i.textContent.trim() : ''; }), '₽', 'H2 — ₽ symbol in the Monnaies window header (not the game title)');
assert.equal(await page.evaluate(() => (document.querySelector('#header .brand-pokedollar') ? true : false)), false, 'H3 — no ₽ in the game title');

// ── I. Ball slot "0" + picker effects ──────────────────────────────────────
await page.evaluate(() => { G.pokeballs.filters = G.pokeballs.filters.map(f => ({ ...f, ball: 'none' })); window.renderPokeballWindow(); });
assert.equal(await page.evaluate(() => { const img = document.querySelector('#pokeballs-window-body .pw-ball-row-ball img'); return img ? img.getAttribute('src') : ''; }), 'src/assets/images/pokeball/None.svg', 'I1 — empty ball (None.svg) shown when no ball is set');
// Le nom de filtre n'est PAS cliquable (pas d'action, curseur par défaut).
assert.equal(await page.evaluate(() => { const n = document.querySelector('#pokeballs-window-body .pw-ball-row-name'); return n ? (n.getAttribute('data-action') || '') : ''; }), '', 'I1b — filter name has no click action');
assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#pokeballs-window-body .pw-ball-row-name')).cursor), 'default', 'I1c — filter name cursor is default (not pointer)');
await page.evaluate(() => window.openBallPicker('new'));
const pickerText = await page.evaluate(() => (document.querySelector('.pw-ball-box') || {}).textContent || '');
assert.ok(/Taux de capture/.test(pickerText), 'I2 — ball picker shows catch rate (effects)');
assert.ok(/Super Ball/.test(pickerText) && /20\s*%/.test(pickerText), 'I3 — Great Ball shows 20% catch rate');
assert.ok(/Hyper Ball/.test(pickerText) && /30\s*%/.test(pickerText), 'I4 — Ultra Ball shows 30% catch rate');
await page.evaluate(() => window.closeBallOverlay());

assert.deepEqual(errors, [], 'Z — no page errors');
console.log('smoke-p0b: OK — per-filter settings toggle, vertical +/- options, enable switch, per-town shop, bag+dictionary, animation, header ₽, empty ball slot, picker effects, 0 error.');
await browser.close();

