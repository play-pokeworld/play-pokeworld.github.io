import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { pickWildFromTable, ROAMING_CHANCE, ROAMING_LEVEL } from '../src/domain/world/encounter-rules.js';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

// ── V7 · P1a — ROAM-01 (errance 1 %, niveau 75) · ECO-05 (doublons 10 %) ────

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (o) => JSON.parse(JSON.stringify(o)); // cross-realm objects (vm sandbox) → plain

// Deterministic PRNG (mulberry32) so the 10 000-draw acceptance is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('ROAM-01 — constants: 1 % per spawn, level 75 fixed (D3, D18)', () => {
  assert.equal(ROAMING_CHANCE, 0.01);
  assert.equal(ROAMING_LEVEL, 75);
});

test('ROAM-01 — acceptance: 10 000 draws on a route with a roamer → 80–120 sightings', () => {
  const wild = [[16, 2, 5, 'common'], [19, 2, 5, 'common'], [10, 3, 6, 'uncommon'], [25, 3, 6, 'rare']];
  for (const seed of [1, 42, 2026]) {
    const rng = mulberry32(seed);
    let sightings = 0;
    for (let i = 0; i < 10000; i++) {
      const pick = pickWildFromTable(wild, { roamingId: 144, rng });
      if (pick && pick.isRoaming) {
        sightings++;
        assert.equal(pick.speciesId, 144);
        assert.equal(pick.level, 75);
      }
    }
    assert.ok(sightings >= 80 && sightings <= 120, `seed ${seed}: ${sightings} sightings / 10 000 (expected 100 ± 20)`);
  }
});

test('ROAM-01 / TXT-01 — the location panel reads the constants (no « 1% » / « Nv.45 » in texts)', () => {
  const fr = R('src/localization/fr/ui.js');
  const en = R('src/localization/en/ui.js');
  assert.match(fr, /"roaming_short":"Errant \(\{pct\} %\)"/);
  assert.match(en, /"roaming_short":"Roaming \(\{pct\}%\)"/);
  const li = R('src/ui/game/location-info.js');
  assert.doesNotMatch(li, /\+ '45'/, 'roamer level is not hard-coded any more');
  assert.match(li, /ROAMING_LEVEL/);
  assert.ok(wsMatch(li, /tr\('roaming_short', \{ pct:/)); // V7 · DBT-01
  // The classic surface exposes the constants for the panel.
  assert.equal(globalThis.ROAMING_CHANCE, 0.01);
  assert.equal(globalThis.ROAMING_LEVEL, 75);
});

function helpersSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], collection: {}, inventory: {}, money: 0, region: 'kanto', badges: [], lang: 'fr' },
    t: (k) => k, tr: (k) => k, notify: () => {}, saveGame: () => {}, updateHeader: () => {},
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of ['src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js', 'src/data/locations-data.js', 'src/data/game-helpers.js']) {
    vm.runInContext(harnessBundleSource([f]), sandbox, { filename: f });
  }
  return sandbox;
}

test('ECO-05 — duplicate / overflow items convert at 10 % of their price (D5)', () => {
  const sb = helpersSandbox();
  assert.equal(sb.DUPLICATE_ITEM_PAYOUT_RATE, 0.10);
  const price = (k) => (sb.ITEMS[k].price || sb.ITEMS[k].value || 0);
  for (const key of ['pokeball', 'greatball', 'ultraball', 'firestone', 'rarecandy']) {
    assert.ok(price(key) > 0, `${key} has a price`);
    assert.equal(sb.getDuplicateItemPayout(key, 1), Math.floor(price(key) * 0.10), `${key} × 1`);
    assert.equal(sb.getDuplicateItemPayout(key, 3), Math.floor(price(key) * 0.10) * 3, `${key} × 3`);
  }
  // Order of magnitude from the roadmap: ≈ 1 900 ₽ per converted drop at the old
  // 25 % was ≈ 4 750 ₽ — the 10 % rate is 2.5× lower than before.
  assert.equal(sb.getDuplicateItemPayout('ultraball', 1), 200);
  assert.doesNotMatch(R('src/data/game-helpers.js'), /\|\| 0\) \* 0\.25\)/, 'no 25 % literal left in the payout');
});

test('REG-01 — region lock = previous league won + 100 % of the previous regional dex, legendaries included (D2)', () => {
  const sb = helpersSandbox();
  const meta = sb.getRegionMeta('kanto');
  assert.equal(meta.start, 1);
  assert.equal(meta.end, 151);
  assert.equal(sb.getRegionPokedexTotal('kanto'), 151, 'the total includes the 5 Kanto legendaries/mythicals');
  sb.G.pokedex = {};
  sb.G.regionLeagueWon = {};
  // 1) league not won → locked (reason league)
  assert.deepEqual(J(sb.getRegionAccessStatus('johto')), { ok: false, reason: 'league', previous: 'kanto', target: 'johto' });
  // 2) league won, 150/151 (Mew missing) → locked (reason dex)
  sb.G.regionLeagueWon.kanto = true;
  sb.G.championTitle = true;
  for (let id = 1; id <= 150; id++) sb.G.pokedex[id] = { seen: true, caught: true };
  const st = sb.getRegionAccessStatus('johto');
  assert.equal(st.ok, false);
  assert.equal(st.reason, 'dex');
  assert.equal(st.caught, 150);
  assert.equal(st.total, 151);
  // 3) 151/151 → open. Kanto itself is always open.
  sb.G.pokedex[151] = { seen: true, caught: true };
  assert.deepEqual(J(sb.getRegionAccessStatus('johto')), { ok: true });
  assert.deepEqual(J(sb.getRegionAccessStatus('kanto')), { ok: true });
});

test('ROAM-01 — the roamer stays on the spawn table during the offline catch-up (PW_FF): AFK legendary farming is legitimate', async () => {
  // Player decision (2026-10-14): parking the team on the roamer's route and
  // coming back later is the point of the 1 % — a wiped team is the player's
  // call, and the offline recap reports the roamer (see passe28 V7 tests).
  if (!globalThis.window) globalThis.window = globalThis;
  const E = await import('../src/application/encounter-system.js');
  const { getGameplayWorld } = await import('../src/application/battle-loop.js');
  const G = { location: 'route1', team: [{}], dungeonRun: null };
  globalThis.G = G;
  globalThis.getLocObj = () => ({ type: 'route', wild: [[16, 2, 5, 'common']], badgeReq: 0 });
  globalThis.getRoamingLegendaryForRoute = () => 144; // Articuno roams route1 in this window
  globalThis.isDungeonRunAt = () => false;
  try {
    for (const ff of [false, true]) {
      if (ff) globalThis.PW_FF = true; else delete globalThis.PW_FF;
      const eid = E.syncPlayerPresence();
      assert.ok(eid >= 0);
      assert.equal(getGameplayWorld().world.get(eid, 'WildSpawnTable').roamingId, 144, `${ff ? 'offline catch-up' : 'live play'}: the roamer is on the table`);
    }
  } finally {
    delete globalThis.PW_FF;
  }
});

test('ROAM-01 — the roaming roll is always drawn on a free spawn (RNG lockstep live ≡ offline)', () => {
  const wild = [[16, 2, 5, 'common'], [19, 2, 5, 'common']];
  const draws = (opts) => { let n = 0; pickWildFromTable(wild, { ...opts, rng: () => { n++; return 0.5; } }); return n; };
  assert.equal(draws({ roamingId: 144 }), draws({ roamingId: 0 }), 'same RNG consumption with or without a roamer');
  assert.ok(draws({ roamingId: 0 }) >= 2, 'roam roll + bucket/species rolls');
});
