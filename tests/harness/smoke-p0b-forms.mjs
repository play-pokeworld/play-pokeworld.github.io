// smoke-p0b-forms.mjs — V7 · P0b (FORM-01..04) end-to-end in a REAL browser.
//
// MANUAL RUN (requires the built app served over HTTP + Chromium):
//   npm run build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-p0b-forms.mjs
//
// Verifies, against the REAL served build:
//   A. clean boot (0 page error / 0 failed HTTP resource), PD stops at #386;
//   B. FORM-01 — buying a form at the Weather Institute creates a SEPARATE
//      Pokémon `{id:351, form:1}` keyed "351-1" in the PC, next to its base;
//      its sprite is the form sprite; the base is NOT marked caught, but
//      Hoenn progress counts the species once;
//   C. FORM-03 — the dex sheet of Castform shows the « Formes » cards; the PC
//      box renders the « Forme » badge and the « Formes » filter works;
//   D. FORM-02 — a v3 save (legacy ids 387/390 in team / box / dex) stored in
//      localStorage loads WITHOUT deletion and comes back migrated to v4.

import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const httpFailures = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
page.on('response', (res) => { if (res.status() >= 400 && !/favicon/.test(res.url())) httpFailures.push(`${res.status()} ${res.url()}`); });

async function bootNewGame() {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await page.waitForSelector('#starter-modal.open, #starter-modal', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => {
    const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
    if (btn) btn.click();
  });
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
}

await bootNewGame();
assert.deepEqual(errors, [], 'A1 — clean boot');
const a = await page.evaluate(() => ({ pdLen: window.PD.length, pd387: window.PD[387], forms: Object.keys(window.FORMS), v: window.PW_VERSION }));
assert.equal(a.pdLen, 387, 'A2 — PD stops at #386');
assert.equal(a.pd387, undefined, 'A3 — no PD[387]');
assert.deepEqual(a.forms, ['351-1', '351-2', '351-3', '386-1', '386-2', '386-3'], 'A4 — FORMS loaded');

// ── B — FORM-01: buy Castform Sunny at the Weather Institute ─────────────
const b = await page.evaluate(() => {
  const G = window.G;
  G.money = 100000;
  G.region = 'hoenn';
  G.location = 'weather_institute';
  const base = window.createPoke(351, 20, false);
  G.collection[window.generateUniqueBoxId(351)] = base;
  window.markDexCaught(351, false);
  // The location panel offers the shop button from FORM_SHOPS (data-driven).
  const model = window.locationInfoModel ? window.locationInfoModel() : null;
  const shopBtn = model && model.actions.find((x) => x.callArgs === "'castform_forms'");
  window.openFullscreenPanel('castform_forms');
  const panel = document.getElementById('fs-panel-content');
  const htmlBefore = panel ? panel.innerHTML : '';
  window.buySpecialFormPokemon(351, 1, 20000);
  const htmlAfter = panel ? panel.innerHTML : '';
  const entries = Object.entries(G.collection).map(([k, p]) => [k, p.id, p.form || 0, p.name, p.type1]);
  const sunny = Object.values(G.collection).find((p) => p.id === 351 && p.form === 1);
  return {
    shopBtn: !!shopBtn, shopLabel: shopBtn && shopBtn.label,
    cardsBefore: (htmlBefore.match(/pw-manage-card/g) || []).length,
    buyButtonsBefore: (htmlBefore.match(/buySpecialFormPokemon/g) || []).length,
    buyButtonsAfter: (htmlAfter.match(/buySpecialFormPokemon/g) || []).length,
    money: G.money, entries,
    sunnyName: sunny && sunny.name, sunnySprite: sunny && window.getPokemonSpriteUrl(sunny, false),
    baseCaught: !!(G.pokedex[351] && G.pokedex[351].caught),
    formCaught: !!(G.pokedex[351] && G.pokedex[351].forms && G.pokedex[351].forms[1] && G.pokedex[351].forms[1].caught),
    hoennCount: window.countCaughtInRegion('hoenn'), hoennTotal: window.getRegionPokedexTotal('hoenn'),
    formsCount: window.countCaughtForms('hoenn'),
    dupeAdd: window.addPokemonRespectingUniqueness(window.createPoke('351-1', 5, false)).added,
  };
});
assert.equal(b.shopBtn, true, 'B1 — the Weather Institute panel offers the forms shop');
assert.match(b.shopLabel, /Institut Météo/, 'B2 — localized shop title from FORM_SHOPS.titleKey');
assert.equal(b.cardsBefore, 3, 'B3 — 3 Castform forms on sale');
assert.equal(b.buyButtonsBefore, 3, 'B4 — 3 buy buttons before purchase');
assert.equal(b.buyButtonsAfter, 2, 'B5 — the bought form is no longer actionable');
assert.equal(b.money, 80000, 'B6 — 20 000 ₽ debited (data price)');
assert.ok(b.entries.some((e) => e[0] === '351-1' && e[1] === 351 && e[2] === 1), 'B7 — PC entry keyed "351-1" with {id:351, form:1}');
assert.ok(b.entries.some((e) => e[1] === 351 && e[2] === 0), 'B8 — the base Castform is still in the PC');
assert.equal(b.sunnyName, 'Morphéo Solaire', 'B9 — localized form name');
assert.match(b.sunnySprite, /castform-sunny\.png$/, 'B10 — form sprite');
assert.equal(b.baseCaught, true, 'B11 — base caught mark untouched');
assert.equal(b.formCaught, true, 'B12 — form caught mark under G.pokedex[351].forms[1]');
assert.equal(b.hoennTotal, 135, 'B13 — forms never inflate the regional total');
assert.equal(b.hoennCount, 1, 'B14 — Castform counted ONCE for Hoenn');
assert.deepEqual(b.formsCount, { caught: 1, total: 6 }, 'B15 — separate forms counter');
assert.equal(b.dupeAdd, false, 'B16 — the same form cannot be added twice');
assert.deepEqual(errors, [], 'B17 — no page errors during the purchase flow');

// ── C — FORM-03: dex sheet + box badge/filter ─────────────────────────────
const c = await page.evaluate(() => {
  window.openDexEntry(351);
  const inner = document.getElementById('poke-modal-inner');
  const html = inner ? inner.innerHTML : '';
  const cards = [...(inner ? inner.querySelectorAll('.pw-dex-form-card') : [])].map((el) => ({ cls: el.className, text: el.textContent.replace(/\s+/g, ' ').trim() }));
  document.getElementById('poke-modal').classList.remove('open');
  // PC box
  window.showTab && window.showTab('box');
  const tab = document.getElementById('tab-content');
  if (tab && window.renderBox) window.renderBox(tab);
  const boxHtml = tab ? tab.innerHTML : '';
  const badges = (boxHtml.match(/pw-box-form-badge/g) || []).length;
  const cardsAll = (boxHtml.match(/pw-poke-card/g) || []).length;
  window.setBoxFilter('forms', 'forms');
  if (tab && window.renderBox) window.renderBox(tab); // the tab may not be the active one in this harness
  const filtered = (document.getElementById('tab-content').innerHTML.match(/pw-poke-card/g) || []).length;
  window.resetBoxFilters();
  return { hasFormsSection: /pw-dex-forms/.test(html), cards, badges, cardsAll, filtered };
});
assert.equal(c.hasFormsSection, true, 'C1 — dex sheet has the « Formes » section');
assert.equal(c.cards.length, 3, 'C2 — 3 form cards');
assert.ok(c.cards[0].cls.includes('is-owned') && /Morphéo Solaire/.test(c.cards[0].text) && /Obtenue/.test(c.cards[0].text), 'C3 — Sunny card owned');
assert.ok(c.cards[1].cls.includes('is-missing') && /Institut Météo|Boutique/.test(c.cards[1].text), 'C4 — missing card shows its shop source');
assert.ok(c.badges >= 1, 'C5 — « Forme » badge on the PC card');
assert.ok(c.cardsAll >= 2, 'C6 — base + form cards in the box');
assert.equal(c.filtered, 1, 'C7 — « Formes » filter keeps only the form');
assert.deepEqual(errors, [], 'C8 — no page errors in dex/box');

// ── D — FORM-02: a v3 save loads by migration (never deleted) ─────────────
const legacyId = await page.evaluate(() => {
  const G = JSON.parse(JSON.stringify(window.G));
  G.team = [{ ...window.createPoke(25, 30, false) }, { ...window.createPoke(351, 40, false), id: 387, name: 'Morphéo Solaire' }];
  G.collection = { 'box_390_1': { ...window.createPoke(386, 50, false), id: 390, name: 'Deoxys Attaque' } };
  G.pokedex = { 25: { seen: true, caught: true }, 387: { seen: true, caught: true }, 390: { seen: true, caught: true, shiny: true } };
  // A DIFFERENT slot id: the live game autosaves its own slot on unload.
  const id = 'v3legacy_' + Date.now();
  G.saveMeta = { ...(G.saveMeta || {}), id, name: 'Legacy v3', version: 3 };
  const data = { version: 3, timestamp: Date.now(), saveId: id, G };
  localStorage.setItem('pokeworld_save_slot_' + id, JSON.stringify(data));
  localStorage.setItem('pokeworld_save', JSON.stringify(data));
  localStorage.setItem('pokeworld_active_save_id', id);
  return id;
});
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.waitForTimeout(1500); // let the save menu settle (boot normalizes the slot index first)
const d = await page.evaluate((id) => {
  // (the live game re-points the active id to its own slot on unload — load OUR slot explicitly)
  const slot = JSON.parse(localStorage.getItem('pokeworld_save_slot_' + id) || 'null');
  let loaded = false;
  try { loaded = window.startSaveById ? window.startSaveById(id) : window.loadGame(true); } catch (e) { return { err: String(e) }; }
  const after = JSON.parse(localStorage.getItem('pokeworld_save_slot_' + id) || 'null');
  const G = window.G;
  return {
    slotExisted: !!slot, loaded,
    team: G.team.map((p) => [p.id, p.form || 0, p.name]),
    boxKeys: Object.keys(G.collection), box: Object.values(G.collection).map((p) => [p.id, p.form || 0, p.name]),
    dex387: G.pokedex[387], dex390: G.pokedex[390],
    f351: G.pokedex[351] && G.pokedex[351].forms, f386: G.pokedex[386] && G.pokedex[386].forms,
    versionAfter: after && after.version,
  };
}, legacyId);
assert.equal(d.slotExisted, true, 'D1 — v3 slot written');
assert.equal(d.loaded, true, 'D2 — v3 save LOADS (not deleted)');
assert.deepEqual(d.team, [[25, 0, 'Pikachu'], [351, 1, 'Morphéo Solaire']], 'D3 — team migrated (387 → 351-1)');
assert.deepEqual(d.boxKeys, ['386-1'], 'D4 — box re-keyed to the species key');
assert.deepEqual(d.box, [[386, 1, 'Deoxys Attaque']], 'D5 — box Pokémon migrated (390 → 386-1)');
assert.equal(d.dex387, undefined, 'D6 — legacy dex entry removed');
assert.equal(d.dex390, undefined, 'D6b — legacy dex entry removed');
assert.deepEqual(d.f351, { 1: { seen: true, caught: true } }, 'D7 — dex form entry under the base');
assert.deepEqual(d.f386, { 1: { seen: true, caught: true, shiny: true } }, 'D8 — shiny flag carried over');
assert.equal(d.versionAfter, 4, 'D9 — slot rewritten as v4');
assert.deepEqual(errors, [], 'D10 — no page errors during the migration');
assert.deepEqual(httpFailures, [], 'E — zero failed HTTP resource');

console.log('smoke-p0b-forms: OK (A boot · B shop/PC · C dex+box · D migration v3→v4)');
await browser.close();
