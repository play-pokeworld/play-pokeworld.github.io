// smoke-p1.mjs — V7 · P1 end-to-end verification in a REAL browser.
//
// MANUAL RUN (requires the built app served over HTTP + Chromium):
//   npm run build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-p1.mjs
//
// Verifies, against the REAL served build:
//   A. Version — Settings shows one single version number (package.json), nothing else;
//   B. DEX-01 / FORM — Pokédex opens on Hoenn with the forms counter, Castform
//      form is a separate box entry that does not count for the 100 %;
//   C. LEG-02 — the Sealed Chamber NPC offers step 1 of the Regirock chain, the
//      step is accepted, the next step is only offered after the first is done,
//      the final encounter refuses to start away from Desert Ruins, then starts
//      ON SITE with battle.legendaryQuest (×2, not guaranteed);
//   D. ATL-03 — the Atoll home shows the Fragments card; with enough fragments
//      the summon list is rendered and a summon starts a legendaryQuest battle
//      tagged fragment:<id>;
//   E. HOE-01 — quest 278 (rival, route 103) launches its scripted battle with the
//      starter-dependent roster;
//   F. zero page error / zero failed HTTP resource across the whole run.

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// V7 · P2 — the expected version is read from package.json (single source of truth, see tools/gen-version.mjs).
const PKG_VERSION = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'), 'utf8')).version;
const VERSION_RE = PKG_VERSION.replace(/\./g, '\\.');

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const httpFailures = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
page.on('response', (res) => { if (res.status() >= 400 && !/favicon/.test(res.url())) httpFailures.push(`${res.status()} ${res.url()}`); });

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
assert.deepEqual(errors, [], '0 — clean boot');

// ── A — one single version number ──────────────────────────────────────────
const ver = await page.evaluate(() => {
  window.openSettings();
  const modal = document.getElementById('settings-modal') || document.body;
  const txt = modal.innerText || modal.textContent || '';
  window.closeSettings();
  return { txt, PW_VERSION: window.PW_VERSION };
});
assert.equal(ver.PW_VERSION, PKG_VERSION, `A1 — PW_VERSION is ${PKG_VERSION}`);
assert.match(ver.txt, new RegExp('version ' + VERSION_RE, 'i'), `A2 — Settings shows « version ${PKG_VERSION} »`);
assert.doesNotMatch(ver.txt, /build w\d+|V7-P0a|2026-/, 'A3 — no second version string (build/date/passe) left in Settings');
assert.equal((ver.txt.match(new RegExp(VERSION_RE, 'g')) || []).length, 1, 'A4 — the number appears exactly once');

// ── B — forms in the dex / boxes ───────────────────────────────────────────
const dex = await page.evaluate(() => {
  window.G.unlockedRegions = ['kanto', 'johto', 'hoenn'];
  window.G.region = 'hoenn';
  const base = window.createPoke(351, 20);
  const sunny = window.createPoke('351-1', 20);
  const totalBefore = window.countCaughtInRegion('hoenn');
  window.G.pokedex[351] = window.G.pokedex[351] || {};
  window.G.pokedex[351].caught = true;
  window.G.pokedex[351].forms = { 1: { caught: true, seen: true } };
  const totalAfter = window.countCaughtInRegion('hoenn');
  return {
    baseKey: window.speciesKey(base), sunnyKey: window.speciesKey(sunny), same: window.sameSpecies(base, sunny),
    sunnyName: window.getPokeName(sunny), regionTotal: window.getRegionPokedexTotal('hoenn'), totalBefore, totalAfter,
    formsCaught: window.countCaughtForms('hoenn'),
  };
});
assert.equal(dex.baseKey, '351', 'B1 — base Castform key');
assert.equal(dex.sunnyKey, '351-1', 'B2 — Sunny form key');
assert.equal(dex.same, false, 'B3 — a form is a separate Pokémon for the boxes');
assert.equal(dex.regionTotal, 135, 'B4 — Hoenn 100 % = 135 species (forms excluded)');
assert.equal(dex.totalAfter, dex.totalBefore + 1, 'B5 — catching base Castform counts once, the form adds nothing to the 100 %');
assert.deepEqual(dex.formsCaught, { caught: 1, total: 6 }, 'B6 — the form is tracked in the forms counter (1 / 6 Hoenn forms)');

// ── C — LEG-02 Regirock chain, live ────────────────────────────────────────
const chain1 = await page.evaluate(() => {
  window.ensureQuestState();
  // REG-01 region lock: in Hoenn, before the local League, only Hoenn Pokémon battle.
  window.G.team = [window.createPoke(254, 50)];
  window.G.location = 'sealed_chamber';
  const idx = (window.NPCS.sealed_chamber || []).findIndex((n) => n.quest === 'leg_regirock_1');
  window.openNpc('sealed_chamber', idx);
  const body = document.getElementById('quest-body');
  const offerBtn = body && body.querySelector('[data-call="acceptSideQuest"], [data-call*="acceptSideQuest"]');
  const offerText = body ? body.innerText : '';
  if (offerBtn) offerBtn.click();
  const active = window.G.activeQuests.some((i) => i.cat === 'side' && i.qid === 'leg_regirock_1');
  // Re-open: the NPC must now show the step as active, and step 2 must NOT be offered yet.
  window.openNpc('sealed_chamber', idx);
  const text2 = document.getElementById('quest-body').innerText;
  try { window.closeQuestModal(); } catch (_) {}
  return { idx, hadOffer: !!offerBtn, offerText, active, text2, step2Offered: /leg_regirock_2/.test(document.getElementById('quest-body').innerHTML) };
});
assert.ok(chain1.idx >= 0, 'C1 — a Sealed Chamber NPC gives leg_regirock_1');
assert.equal(chain1.hadOffer, true, 'C2 — the dialog offers the step');
assert.equal(chain1.active, true, 'C3 — step 1 accepted and active');
assert.equal(chain1.step2Offered, false, 'C4 — step 2 is not offered while step 1 is unfinished');

const chain2 = await page.evaluate(() => {
  // Finish step 1 and step 2 the way the game does (completedQuests + chain), then claim the final step away from the site.
  window.G.completedQuests['side_leg_regirock_1'] = true;
  window.G.activeQuests = window.G.activeQuests.filter((i) => i.qid !== 'leg_regirock_1');
  window.acceptSideQuest('leg_regirock_2');
  const inst = window.G.activeQuests.find((i) => i.qid === 'leg_regirock_2');
  inst.progress = 1; inst.done = true;
  window.G.location = 'sealed_chamber';
  window.claimQuest('leg_regirock_2', 'side');
  const refusedAway = !(window.battle && window.battle.active);
  const stillActive = window.G.activeQuests.some((i) => i.qid === 'leg_regirock_2');
  // Now on site.
  window.G.location = 'desert_ruins';
  const notes = [];
  const _n = window.notify; window.notify = (m, c) => { notes.push(String(m)); try { _n(m, c); } catch (_) {} };
  window.claimQuest('leg_regirock_2', 'side');
  window.notify = _n;
  const b = window.battle;
  const e = b && (b.enemyPoke || b.enemy);
  const r = { notes, refusedAway, stillActive, started: !!(b && b.active), enemyId: e && e.id, level: e && e.level, legendaryQuest: !!(b && b.legendaryQuest), questGift: !!(b && b.questGift), qid: b && b.questRewardQuestId, cat: b && b.questRewardCat };
  // Capture-rate contract: ×2 of the base ball rate, capped at 100 %.
  const def = window.ballDef ? window.ballDef('pokeball') : null;
  r.rate = (def && typeof window.ballEffectiveRate === 'function') ? window.ballEffectiveRate(def, e) : null;
  r.mult = window.LEGENDARY_QUEST_CATCH_MULT;
  try { window.endBattle(); } catch (_) {}
  r.claimableAfter = window.G.activeQuests.some((i) => i.qid === 'leg_regirock_2' && i.done);
  return r;
});
assert.equal(chain2.refusedAway, true, 'C5 — the final encounter does not start away from Desert Ruins');
assert.equal(chain2.stillActive, true, 'C6 — the step stays claimable after the refusal');
assert.equal(chain2.started, true, 'C7 — the encounter starts on site — ' + JSON.stringify(chain2.notes));
assert.equal(chain2.enemyId, 377, 'C8 — Regirock');
assert.equal(chain2.level, 40, 'C9 — level 40 (LEG-02 table)');
assert.equal(chain2.legendaryQuest, true, 'C10 — battle.legendaryQuest flag (×2 rate, not guaranteed)');
assert.equal(chain2.questGift, false, 'C11 — not a guaranteed gift');
assert.equal(chain2.cat, 'side', 'C12 — reward routed to the side quest');
assert.equal(chain2.mult, 2, 'C13 — multiplier is the single constant');
assert.equal(chain2.claimableAfter, true, 'C14 — after leaving the battle the step is still claimable (retry)');

// ── D — ATL-03 Fragments card ──────────────────────────────────────────────
const atoll = await page.evaluate(() => {
  window.markRegionLeagueWon('kanto'); // the Atoll opens after the Kanto League
  // REG-01: Johto/Hoenn dex unlock = previous League won + 100 % of the previous dex.
  window.markRegionLeagueWon('johto');
  for (let id = 1; id <= 251; id++) { window.G.pokedex[id] = Object.assign(window.G.pokedex[id] || {}, { caught: true, seen: true }); }
  const unlocked = window.getUnlockedRegionsForPokedex().join(',');
  window.G.atoll = window.G.atoll || {};
  window.ensureAtollState();
  window.G.atoll.fragments = 0;
  window.openFullscreenPanel('atoll');
  window.setAtollTab('menu');
  const root = document.getElementById('fs-panel-content');
  const txt0 = root ? root.innerText : '';
  const choices0 = root ? root.querySelectorAll('[data-call="summonFragmentLegendary"]').length : -1;
  window.G.atoll.fragments = window.LEGEND_FRAGMENT_COST;
  window.setAtollTab('menu');
  const choices1 = root.querySelectorAll('[data-call="summonFragmentLegendary"]').length;
  const txt1 = root.innerText;
  const ok = window.summonFragmentLegendary(384);
  const b = window.battle;
  const e = b && (b.enemyPoke || b.enemy);
  const r = { unlocked, txt0, choices0, choices1, txt1, ok, started: !!(b && b.active), enemyId: e && e.id, level: e && e.level, legendaryQuest: !!(b && b.legendaryQuest), qid: b && b.questRewardQuestId, cat: b && b.questRewardCat, fragmentsAfter: window.G.atoll.fragments, pending: window.G.atoll.pendingFragmentLegendary };
  try { window.endBattle(); } catch (_) {}
  window.setAtollTab('menu');
  r.retryShown = root.querySelectorAll('[data-call="startFragmentLegendaryEncounter"]').length;
  try { window.closeFullscreenPanel(); } catch (_) {}
  return r;
});
assert.match(atoll.txt0, /Fragments de Légende/, 'D1 — Fragments card rendered on the Atoll home');
assert.equal(atoll.choices0, 0, 'D2 — no summon control without enough fragments (informational text only)');
assert.equal(atoll.unlocked, 'kanto,johto,hoenn', 'D3a — three regions unlocked for the dex');
assert.equal(atoll.choices1, 21, `D3 — ${atoll.choices1} legendaries offered with 3 regions unlocked (5 + 6 + 10)`);
assert.equal(atoll.ok, true, 'D4 — summon accepted');
assert.equal(atoll.started, true, 'D5 — encounter started');
assert.equal(atoll.enemyId, 384, 'D6 — Rayquaza');
assert.equal(atoll.level, 70, 'D7 — level 70');
assert.equal(atoll.legendaryQuest, true, 'D8 — legendaryQuest rules (×2, not guaranteed)');
assert.equal(atoll.qid, 'fragment:384', 'D9 — tagged fragment:<id>');
assert.equal(atoll.fragmentsAfter, 0, 'D10 — 50 fragments consumed');
assert.equal(atoll.pending, 384, 'D11 — pending summon kept until the capture');
assert.ok(atoll.retryShown >= 1, 'D12 — retry control rendered after leaving the battle');

// ── E — HOE-01 scripted rival battle from quest 278 ────────────────────────
const hoe = await page.evaluate(() => {
  window.G.starterSpecies = window.G.starterSpecies || {};
  window.G.starterSpecies.hoenn = 255; // Torchic → rival has Mudkip line
  window.G.region = 'hoenn';
  window.ensureQuestState();
  const chain = window.getRegionChain('hoenn');
  const idx = chain.findIndex((q) => q.id === 278);
  window.G.mainStep.hoenn = idx;
  window.syncActiveMain();
  window.G.location = 'route103';
  const def = window.getMainQuestDef(278);
  const notes = [];
  const _n = window.notify; window.notify = (m, c) => { notes.push(String(m)); try { _n(m, c); } catch (_) {} };
  try { if (typeof window.closeBattleSummary === 'function') window.closeBattleSummary(); } catch (_) {}
  window.startQuestTrainerBattle(278, 'main');
  window.notify = _n;
  const b = window.battle;
  const ids = b && b.enemyTeam ? b.enemyTeam.map((p) => p.id) : (b && (b.enemyPoke || b.enemy) ? [(b.enemyPoke || b.enemy).id] : []);
  const r = { notes, idx, battleId: def && def.battleId, started: !!(b && b.active), ids, trainer: b && (b.trainerName || b.trainerKey || b.officialKey) };
  try { window.endBattle(); } catch (_) {}
  return r;
});
assert.ok(hoe.idx >= 0, 'E1 — quest 278 in the Hoenn chain');
assert.equal(hoe.battleId, 'hoenn_rival_route103', 'E2 — scripted battle id');
assert.equal(hoe.started, true, 'E3 — the battle starts from the journal — ' + JSON.stringify(hoe.notes));
assert.ok(hoe.ids.includes(258), `E4 — rival roster depends on the starter (Mudkip vs Torchic): ${JSON.stringify(hoe.ids)}`);

// ── F — integrity ──────────────────────────────────────────────────────────
assert.deepEqual(errors, [], 'F1 — zero page error during the run');
assert.deepEqual(httpFailures, [], 'F2 — zero failed HTTP resource');
await browser.close();
console.log(`smoke-p1: OK — version ${PKG_VERSION} single, forms/dex, LEG-02 chain live (×2 on site), ATL-03 fragments live, HOE-01 rival live, 0 error.`);
