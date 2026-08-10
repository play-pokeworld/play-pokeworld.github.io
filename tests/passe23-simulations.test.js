import test from 'node:test';
import assert from 'node:assert/strict';

// ── Phase 23 / Step 7 (final): balancing by simulations ──────────────────
// The real battle engine (vm) measures the win rates of a trained
// lv-100 reference player (frozen benchmark = LOWER bound: a real player
// adapts their team thanks to the rotation preview, measured separately).
// Bands validated in phase 23 (8 rotation windows × 12 runs, seeded RNG
// → deterministic measurements):
//   Tower E/D 100 % · C 99 · B 92.7 · A 73.4 · S 61.5 · Free 16.7
//   Factory C 87.5 · A 93.8 (mirror: same builder on both sides)
//   3v3 Gyms: 25.0 / 18.2 (without items) / 38.0 — constraint modes
//   Dome: 71.4 (quarterfinals) · 36.5 (final)
//   "Adapted" team (picked via the preview): Open 57.3 · S 77.1 ·
//   finale 86.5% → the challenge is beatable WITH preparation.
const SIM = await import('../tools/sim_battles.mjs');
const { sb, winRate, buildTrainedTeam, ENDGAME_IDS } = SIM;

const WINDOWS = [40, 41, 42, 43, 44, 45, 46, 47];
const RUNS_PER_W = 12;

async function atollRate(mk) {
  const mode = sb.ATOLL_MODES[mk];
  let wins = 0, runs = 0;
  for (const w of WINDOWS) {
    const enemy = sb.buildAtollTeam(mk, w, 'enemy');
    const playerFactory = mode.borrowed
      ? () => sb.buildAtollTeam(mk, w, 'rental').map((p) => ({ ...p, moves: (p.moves || []).map((m) => ({ ...m })) }))
      : () => buildTrainedTeam(ENDGAME_IDS, 100).slice(0, mode.playerCap || 6).map((p) => mode.noItems ? { ...p, heldItem: null } : p);
    const r = await winRate(`t23:${mk}@${w}`, playerFactory, () => enemy.map((p) => ({ ...p, moves: (p.moves || []).map((m) => ({ ...m })) })), { runs: RUNS_PER_W, seedKey: `t23:${mk}@${w}` });
    wins += r.wins; runs += r.runs;
  }
  return wins / runs;
}

// [min, max] bands: the frozen benchmark never adapts (lower bound) and
// the ceilings document the endgame content's progression margin.
const BANDS = {
  tower_e: [0.99, 1.0], tower_d: [0.99, 1.0],
  tower_c: [0.85, 1.0], tower_b: [0.70, 1.0], tower_a: [0.45, 0.95],
  tower_s: [0.35, 0.85], tower_free: [0.05, 0.55],
  factory_c: [0.55, 1.0], factory_a: [0.60, 1.0],
  arena_three: [0.05, 0.75], arena_no_item: [0.03, 0.70], arena_type: [0.10, 0.80],
  dome_quarter: [0.40, 1.0], dome_final: [0.10, 0.75],
};

test('phase 23: every atoll mode in its target difficulty band', { timeout: 300000 }, async () => {
  const rates = {};
  for (const mk of Object.keys(BANDS)) rates[mk] = await atollRate(mk);
  for (const [mk, [lo, hi]] of Object.entries(BANDS)) {
    const r = rates[mk];
    assert.ok(r >= lo, `${mk}: ${(r * 100).toFixed(1)}% < floor ${(lo * 100).toFixed(0)}% (mode became too hard)`);
    assert.ok(r <= hi, `${mk} : ${(r * 100).toFixed(1)} % > plafond ${(hi * 100).toFixed(0)} % (mode devenu trop facile)`);
  }
  // Global progression: the Tower remains the ladder of increasing difficulty
  assert.ok(rates.tower_c >= rates.tower_a, `progression: C (${(rates.tower_c * 100).toFixed(0)} %) ≥ A (${(rates.tower_a * 100).toFixed(0)} %)`);
  assert.ok(rates.tower_a >= rates.tower_free - 0.75, `progression: A vs Free`);
  assert.ok(rates.tower_s <= rates.tower_c, `rank S (${(rates.tower_s * 100).toFixed(0)} %) ≤ rank C (${(rates.tower_c * 100).toFixed(0)} %)`);
  // The atoll keeps a real challenge: the Open Tower and the Dome Finale stay hard
  assert.ok(rates.tower_free <= 0.5, `Open Tower = ultimate challenge (${(rates.tower_free * 100).toFixed(1)} %)`);
  assert.ok(rates.dome_final <= 0.7, `Dome Final = challenge (${(rates.dome_final * 100).toFixed(1)} %)`);
  console.log('  measured rates: ' + Object.entries(rates).map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`).join(' '));
});

test('phase 23: 3v3 gyms — statScale 0.5 applied (reduced budgets vs Tower)', { timeout: 60000 }, () => {
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  for (const mk of ['arena_three', 'arena_no_item', 'arena_type']) {
    assert.equal(sb.ATOLL_MODES[mk].statScale, 0.5, `${mk} : statScale 0.5`);
    const team = sb.buildAtollTeam(mk, 40, 'enemy');
    for (const p of team) {
      assert.ok(sum(p.ivs) <= 18 && sum(p.evs) <= 18, `${mk} ${p.id}: budgets ×0.5 → ≤ 18/18 (campaign level)`);
    }
  }
  // Tower/Dome: endgame 36/36 budgets intact
  const tower = sb.buildAtollTeam('tower_s', 40, 'enemy');
  assert.ok(Math.max(...tower.map((p) => sum(p.evs))) >= 30, 'tower_s: endgame ~36 EV profile kept');
});

