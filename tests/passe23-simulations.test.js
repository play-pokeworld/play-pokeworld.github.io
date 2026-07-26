import test from 'node:test';
import assert from 'node:assert/strict';

// ── Passe 23 / Étape 7 (finale) : équilibrage par simulations ───────────
// Le vrai moteur de combat (vm) mesure les taux de victoire d'un joueur de
// référence lv 100 entraîné (benchmark figé = borne BASSE : un joueur réel
// adapte son équipe grâce à l'aperçu de la rotation, mesuré séparément).
// Bandes validées en passe 23 (8 fenêtres de rotation × 12 runs, RNG seedé
// → mesures déterministes) :
//   Tour E/D 100 % · C 99 · B 92,7 · A 73,4 · S 61,5 · Libre 16,7
//   Usine C 87,5 · A 93,8 (miroir : même constructeur des deux côtés)
//   Arènes 3v3 : 25,0 / 18,2 (sans objets) / 38,0 — modes contrainte
//   Dôme : 71,4 (quarts) · 36,5 (finale)
//   Équipe « adaptée » (choisie via l'aperçu) : Libre 57,3 · S 77,1 ·
//   finale 86,5 % → le défi est franchissable AVEC préparation.
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

// Bandes [min, max] : le benchmark figé ne s'adapte jamais (borne basse) et
// les plafonds documentent la marge de progression du contenu endgame.
const BANDS = {
  tower_e: [0.99, 1.0], tower_d: [0.99, 1.0],
  tower_c: [0.85, 1.0], tower_b: [0.70, 1.0], tower_a: [0.45, 0.95],
  tower_s: [0.35, 0.85], tower_free: [0.05, 0.55],
  factory_c: [0.55, 1.0], factory_a: [0.60, 1.0],
  arena_three: [0.05, 0.75], arena_no_item: [0.03, 0.70], arena_type: [0.10, 0.80],
  dome_quarter: [0.40, 1.0], dome_final: [0.10, 0.75],
};

test('passe 23 : chaque mode de l\'atoll dans sa bande de difficulté cible', { timeout: 300000 }, async () => {
  const rates = {};
  for (const mk of Object.keys(BANDS)) rates[mk] = await atollRate(mk);
  for (const [mk, [lo, hi]] of Object.entries(BANDS)) {
    const r = rates[mk];
    assert.ok(r >= lo, `${mk} : ${(r * 100).toFixed(1)} % < plancher ${(lo * 100).toFixed(0)} % (mode devenu trop dur)`);
    assert.ok(r <= hi, `${mk} : ${(r * 100).toFixed(1)} % > plafond ${(hi * 100).toFixed(0)} % (mode devenu trop facile)`);
  }
  // Progression globale : la Tour reste l'échelle de difficulté croissante
  assert.ok(rates.tower_c >= rates.tower_a, `progression : C (${(rates.tower_c * 100).toFixed(0)} %) ≥ A (${(rates.tower_a * 100).toFixed(0)} %)`);
  assert.ok(rates.tower_a >= rates.tower_free - 0.75, `progression : A vs Libre`);
  assert.ok(rates.tower_s <= rates.tower_c, `rang S (${(rates.tower_s * 100).toFixed(0)} %) ≤ rang C (${(rates.tower_c * 100).toFixed(0)} %)`);
  // L'atoll garde un vrai défi : la Tour Libre et la Finale du Dôme restent dures
  assert.ok(rates.tower_free <= 0.5, `Tour Libre = défi ultime (${(rates.tower_free * 100).toFixed(1)} %)`);
  assert.ok(rates.dome_final <= 0.7, `Finale Dôme = défi (${(rates.dome_final * 100).toFixed(1)} %)`);
  console.log('  taux mesurés : ' + Object.entries(rates).map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`).join(' '));
});

test('passe 23 : arènes 3v3 — statScale 0.5 appliqué (budgets réduits vs Tour)', { timeout: 60000 }, () => {
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  for (const mk of ['arena_three', 'arena_no_item', 'arena_type']) {
    assert.equal(sb.ATOLL_MODES[mk].statScale, 0.5, `${mk} : statScale 0.5`);
    const team = sb.buildAtollTeam(mk, 40, 'enemy');
    for (const p of team) {
      assert.ok(sum(p.ivs) <= 18 && sum(p.evs) <= 18, `${mk} ${p.id} : budgets ×0.5 → ≤ 18/18 (niveau campagne)`);
    }
  }
  // Tour/Dôme : budgets endgame 36/36 intacts
  const tower = sb.buildAtollTeam('tower_s', 40, 'enemy');
  assert.ok(Math.max(...tower.map((p) => sum(p.evs))) >= 30, 'tower_s : profil endgame ~36 EV conservé');
});
