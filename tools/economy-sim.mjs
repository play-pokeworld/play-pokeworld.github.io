#!/usr/bin/env node
/**
 * PokéWorld — Simulateur d'économie v6 (finale)
 * Personnel en rotation 4 monnaies · prix fixes par palier · auto PQ/₽/💎 ·
 * mine garantie positive · bonus d'argent plafonnés ×1,5.
 *
 *   node tools/economy-sim.mjs
 */
const fmt = (n) => Number(n).toLocaleString('fr-FR');
const sum = (a) => a.reduce((x, y) => x + y, 0);

// ─────────────────────────────────────────────────────────────
// 1. PERSONNEL (15) — rotation ₽ → PQ → 💎 → PC
// ─────────────────────────────────────────────────────────────
const STAFF_CYCLE = ['₽', 'PQ', '💎', 'PC'];
const STAFF_LADDERS = {
  '₽': [25000, 75000, 200000, 500000],
  PQ: [1000, 2000, 4000, 8000],
  '💎': [20, 50, 100, 200],
  PC: [100, 200, 400],
};
function staffTable() {
  const rows = []; const idx = { '₽': 0, PQ: 0, '💎': 0, PC: 0 };
  for (let i = 0; i < 15; i++) {
    const cur = STAFF_CYCLE[i % 4];
    rows.push({ n: i + 1, cur, price: STAFF_LADDERS[cur][idx[cur]++] });
  }
  return rows;
}
function staffTotals() {
  const t = { '₽': 0, PQ: 0, '💎': 0, PC: 0 };
  for (const r of staffTable()) t[r.cur] += r.price;
  return t;
}

// ─────────────────────────────────────────────────────────────
// 2. PUITS ₽ — prix FIXES par palier
// ─────────────────────────────────────────────────────────────
const HELD_TIERS = [
  { label: 'Tier 1 — baies résistance (17) + boosters de type (19)', unit: 20000, count: 36, region: 'Kanto' },
  { label: 'Tier 2 — joyaux (18) + graines (4) + météo (4) + utilitaires', unit: 60000, count: 30, region: 'Johto' },
];
const CT_TIERS = [
  { label: 'CT basiques', unit: 10000, count: 24, region: 'Kanto' },
  { label: 'CT intermédiaires + CS', unit: 25000, count: 16, region: 'Johto' },
  { label: 'CT puissantes', unit: 60000, count: 6, region: 'Hoenn' },
];
const RARE_CANDY_PRICE = 10000;       // Super Bonbon — re-prixé (demandé)
const MASTERBALL_MONEY = 10_000_000;

// ─────────────────────────────────────────────────────────────
// 3. AUTO — déblocage PQ · usage ₽ · mine tout 💎
// ─────────────────────────────────────────────────────────────
const AUTO_UNLOCK = [
  ['Auto-éclosion', 500, 'usage 1 000 ₽/éclosion'],
  ['Auto-remplissage pension', 1000, 'usage 250 ₽/remplissage'],
  ['Auto-entraînement', 1000, 'usage 500 ₽/combat'],
  ['Auto-mine', 1000, 'usage 1 💎/tuile (tout en 💎)'],
];

// ─────────────────────────────────────────────────────────────
// 4. PQ
// ─────────────────────────────────────────────────────────────
const PQ_OAK = [['Lucky Egg (XP ×1,1)', 500], ['Amulet Coin (₽ ×1,1)', 1500], ['Shiny Charm (shiny ×1,05)', 2500]];
const PQ_EVO = [['Metal Coat', 2000], ['King’s Rock', 2000], ['Dragon Scale', 3000], ['Upgrade', 4000],
  ['Deep Sea Tooth', 5000], ['Deep Sea Scale', 5000], ['Prism Scale', 6000]];
const PQ_MARKET = { kanto: { s: 3, sp: 1000, r: 7, rp: 1500 }, johto: { s: 3, sp: 2000, r: 12, rp: 4000 }, hoenn: { s: 2, sp: 3000, r: 3, rp: 6000 } };
const PQ_SLOTS = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

// ─────────────────────────────────────────────────────────────
// 5. MINE (💎) — avec GARANTIE DE POSITIVITÉ
// ─────────────────────────────────────────────────────────────
// 7 trésors (à l'image de PokéClicker : os, morceaux d'étoile, écaille cœur…)
const MINE_TREASURES = [
  ['stardust', 'Poussière d’étoile', 70],
  ['iron_ball', 'Boule de Fer', 70],
  ['nugget', 'Pépite', 100],
  ['rare_bone', 'Os rare', 100],
  ['star_piece', 'Morceau d’étoile', 175],
  ['big_nugget', 'Grosse Pépite', 250],
  ['heart_scale', 'Écaille Cœur', 350],
];
// Génération à l'image de PokéClicker : 3-4 au début → 6-8 avec les upgrades
// (niveau d'énergie de la mine +1 trésor par niveau, plafonné à +4)
const TREASURES_BASE = { min: 3, max: 4 };
const TREASURES_EXTRA_MAX = 4;        // +1 par niveau d'énergie (max +4) → 7-8
const AUTO_MINE_COST_PER_TILE = 1;   // 💎
const LAYER_DIGS = 120;              // 80 cases × ~1,5 coup (dureté 1-4, burin puissance 2)
const DIAMOND_TOOLS = [['Marteau (3×3)', 150], ['Pioche (croix)', 400], ['Foreuse (ligne 5)', 800], ['Dynamite (4×4)', 1200]];
const DIAMOND_ENERGY = [100, 250, 500, 1000];

// ─────────────────────────────────────────────────────────────
// 6. PC
// ─────────────────────────────────────────────────────────────
const PC_SHOP = [['Super Bonbon', 25], ['Restes', 120], ['Veste de Combat', 180], ['Évoluroc', 200],
  ['Bandeau Choix', 260], ['Lunettes Choix', 260], ['Orbe Vie', 360], ['Cristaux Z (18 × 100)', 1800]];

// ─────────────────────────────────────────────────────────────
// 7. BONUS D'ARGENT — budget & plafond
// ─────────────────────────────────────────────────────────────
const BONUS = [
  { source: 'Base secrète (400 drapeaux, platine)', mult: 1.08, note: 'déjà en jeu (code)' },
  { source: 'Amulet Coin (objet d’Oak, PQ)', mult: 1.10, note: 'à ajouter' },
  { source: 'Succès — plafond global rebalancé', mult: 1.25, note: 'roadmap ×1.29 → ×1.25' },
  { source: 'Succès — bonus régional (dans sa région)', mult: 1.15, note: 'local uniquement' },
  { source: 'Talents (pickup / pickpocket / hoarder)', mult: 1.00, note: 'bonus de butin, pas d’argent' },
];
const MONEY_CAP = 1.50;

// ═════════════════════════════════════════════
function main() {
  const staff = staffTable();
  const st = staffTotals();
  const held = sum(HELD_TIERS.map((t) => t.unit * t.count));
  const ct = sum(CT_TIERS.map((t) => t.unit * t.count));
  const moneyPermanent = held + ct + st['₽'];

  const pqAuto = sum(AUTO_UNLOCK.filter((a) => !a[0].includes('mine')).map(([, p]) => p));
  const pqOak = sum(PQ_OAK.map(([, p]) => p));
  const pqEvo = sum(PQ_EVO.map(([, p]) => p));
  const pqMarket = Object.values(PQ_MARKET).reduce((a, r) => a + r.s * r.sp + r.r * r.rp, 0);
  const pqSlots = sum(PQ_SLOTS);
  const pqTotal = pqOak + pqEvo + pqMarket + pqSlots + pqAuto + st.PQ;

  const dTools = sum(DIAMOND_TOOLS.map(([, p]) => p));
  const dEnergy = sum(DIAMOND_ENERGY);
  const dAuto = AUTO_UNLOCK[3][1];
  const dTotal = dTools + dEnergy + dAuto + st['💎'];

  const pcTotal = sum(PC_SHOP.map(([, p]) => p)) + st.PC;

  // mine net-positive
  const minValue = Math.min(...MINE_TREASURES.map(([, , v]) => v));
  const avgValue = sum(MINE_TREASURES.map(([, , v]) => v)) / MINE_TREASURES.length;
  const minYield = TREASURES_BASE.min * minValue;
  const avgYield = ((TREASURES_BASE.min + TREASURES_BASE.max) / 2) * avgValue;
  const layerCost = LAYER_DIGS * AUTO_MINE_COST_PER_TILE;

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  PokéWorld — Économie v6 (finale) — Récapitulatif des monnaies');
  console.log('══════════════════════════════════════════════════════════════\n');

  console.log('— 1. Personnel (15) — rotation ₽ → PQ → 💎 → PC —');
  console.log('# | Monnaie | Prix        # | Monnaie | Prix        # | Monnaie | Prix');
  for (let i = 0; i < 5; i++) {
    const line = (n) => {
      const r = staff[n - 1];
      const s = r.cur === '₽' ? ' ₽' : r.cur === 'PQ' ? ' PQ' : r.cur === '💎' ? ' 💎' : ' PC';
      return `${String(n).padStart(2)} | ${r.cur.padEnd(4)} | ${String(fmt(r.price)).padStart(7)}${s}`;
    };
    console.log(`${line(i + 1)}   ${line(i + 6)}   ${line(i + 11)}`);
  }
  const counts = { '₽': 0, PQ: 0, '💎': 0, PC: 0 }; staff.forEach((r) => counts[r.cur]++);
  console.log(`Occurrences : ₽ ×${counts['₽']} · PQ ×${counts.PQ} · 💎 ×${counts['💎']} · PC ×${counts.PC}   (PC = endgame → 3 seulement)`);
  console.log(`Totaux : ₽ ${fmt(st['₽'])} · PQ ${fmt(st.PQ)} · 💎 ${fmt(st['💎'])} · PC ${fmt(st.PC)}`);

  console.log('\n— 2. Puits ₽ (prix FIXES par palier — pas de multiplicateur régional) —');
  for (const t of HELD_TIERS) console.log(`  ${t.label.padEnd(52)} : ${fmt(t.count)} × ${fmt(t.unit)} = ${fmt(t.unit * t.count)} ₽  (${t.region})`);
  for (const t of CT_TIERS) console.log(`  ${t.label.padEnd(52)} : ${fmt(t.count)} × ${fmt(t.unit)} = ${fmt(t.unit * t.count)} ₽  (${t.region})`);
  console.log(`  Personnel (part ₽)                                : ${fmt(st['₽'])} ₽`);
  console.log(`  Super Bonbon (CONSERVÉ)                           : ${fmt(RARE_CANDY_PRICE)} ₽ l’unité (boutique) + 25 PC (Atoll)`);
  console.log(`  Master Ball                                        : ${fmt(MASTERBALL_MONEY)} ₽`);
  console.log(`  ── TOTAL ₽ permanent (hors bonbons/balls)          : ${fmt(moneyPermanent)} ₽`);
  console.log(`  + balls en continu (le seul consommable de flux) + Super Bonbons + usage auto (₽)`);

  console.log('\n— 3. Auto-modes : déblocage PQ · usage ₽ · mine tout 💎 —');
  for (const [name, unlock, usage] of AUTO_UNLOCK) console.log(`  ${name.padEnd(24)} : déblocage ${fmt(unlock)} ${name === 'Auto-mine' ? '💎' : 'PQ'} · ${usage}`);

  console.log('\n— 4. Points de quête (PQ) —');
  console.log(`  Objets d’Oak (3)                     : ${fmt(pqOak)} PQ`);
  console.log(`  Personnel (part PQ)                  : ${fmt(st.PQ)} PQ`);
  console.log(`  Marché Pokémon (30 espèces)          : ${fmt(pqMarket)} PQ`);
  console.log(`  Objets d’évolution tenus (7)         : ${fmt(pqEvo)} PQ`);
  console.log(`  Emplacements pension/entraînement    : ${fmt(pqSlots)} PQ (échelle : ${PQ_SLOTS.map(fmt).join(' · ')})`);
  console.log(`  Déblocage des auto-modes             : ${fmt(pqAuto)} PQ`);
  console.log(`  ── TOTAL PQ (hors Master Ball/re-roll): ${fmt(pqTotal)} PQ`);
  console.log(`     revenu 15 600 PQ/cycle · ~3 cycles/j actif → ~${(pqTotal / 46800).toFixed(1)} jours pour tout acheter`);

  console.log('\n— 5. Diamants (💎) — mine —');
  console.log(`  Personnel (part 💎)                  : ${fmt(st['💎'])} 💎`);
  console.log(`  Outils (4)                           : ${fmt(dTools)} 💎`);
  console.log(`  Énergie +25 (4 paliers)              : ${fmt(dEnergy)} 💎`);
  console.log(`  Auto-mine (déblocage)                : ${fmt(dAuto)} 💎`);
  console.log(`  ── TOTAL 💎 (hors Master Ball)        : ${fmt(dTotal)} 💎  ≈ ${Math.round(dTotal / ((avgYield) / 1))} couches pour tout s’autofinancer`);
  console.log('');
  console.log('  — GARANTIE DE POSITIVITÉ (la mine rend toujours plus que son coût) —');
  console.log(`    Trésors (7, à l’image de PokéClicker) : ${MINE_TREASURES.map(([n, , v]) => `${n} ${v}`).join(' · ')}`);
  console.log(`    Génération : ${TREASURES_BASE.min}-${TREASURES_BASE.max} au début → +1 par niveau d’énergie (max +${TREASURES_EXTRA_MAX}) = ${TREASURES_BASE.min + TREASURES_EXTRA_MAX}-${TREASURES_BASE.max + TREASURES_EXTRA_MAX} à fond`);
  console.log(`    Rendement MINIMUM       : ${TREASURES_BASE.min} × ${minValue} = ${fmt(minYield)} 💎/couche`);
  console.log(`    Coût auto-mine          : ~${LAYER_DIGS} tuiles × ${AUTO_MINE_COST_PER_TILE} 💎 = ${fmt(layerCost)} 💎/couche`);
  console.log(`    Bilan MINIMUM           : +${fmt(minYield - layerCost)} 💎 (×${(minYield / layerCost).toFixed(2)})  ✓ TOUJOURS POSITIF`);
  console.log(`    Bilan MOYEN (début)     : +${fmt(Math.round(avgYield - layerCost))} 💎/couche (~${Math.round(avgYield)} gagnés)`);
  console.log(`    Minage MANUEL           : 0 💎 (énergie régénérée par les combats) → pur bénéfice`);
  console.log(`    Règle anti-régression   : rendement ≥ 1,5 × coût d’auto-mine (test unitaire)`);

  console.log('\n— 6. Points de combat (PC) —');
  console.log(`  Personnel (part PC)                  : ${fmt(st.PC)} PC`);
  console.log(`  Magasin Atoll                        : ${fmt(sum(PC_SHOP.map(([, p]) => p)))} PC`);
  console.log(`  ── TOTAL PC (hors Master Ball)        : ${fmt(pcTotal)} PC`);

  console.log('\n— 7. Budget des bonus d’argent (plafond global ×1.5) —');
  for (const b of BONUS) console.log(`  ${b.source.padEnd(44)} : ×${b.mult.toFixed(2).padEnd(6)}  ${b.note}`);
  const product = BONUS.filter((b) => !b.source.includes('régional')).reduce((a, b) => a * b.mult, 1);
  console.log(`  Produit global (base × oak × succès) = ×${product.toFixed(3)}  →  plafonné à ×${Math.min(MONEY_CAP, product).toFixed(2)}`);
  console.log(`  → l’économie est calibrée à ×1.0 ; à fond de bonus, ×~${Math.min(MONEY_CAP, product).toFixed(2)}, absorbé par les puits répétables.`);

  console.log('\n— 8. Poké Balls (prix fixe) + Honor Ball —');
  console.log('  Poké Ball 100 · Super Ball 500 · Hyper Ball 2 000 · Master Ball 10 M  (taux 10/15/20/100 %)');
  console.log('  Honor Ball : 1 offerte par tranche de 10 Poké Balls achetées (même taux, cosmétique).');

  console.log('\n— 9. Master Ball multi-monnaies —');
  console.log('  ₽ 10 000 000 · 75 000 JD · 3 000 PQ · 250 💎 · 500 PC  (×1,35 à chaque achat)');

  console.log('\n— 10. Péage des 43 donjons (JD) —');
  console.log('  badgeReq | Péage JD | captures pour entrer');
  const tokensPerCatch = (d, region) => Math.max(1, Math.round(6 * Math.pow((2 * d) / (2.8 / (1 + ({ kanto: 0, johto: 1, hoenn: 2 }[region]) / 3)), 1.08)));
  const TOLL = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
  for (let b = 0; b <= 8; b++) {
    const region = b <= 2 ? 'kanto' : b <= 5 ? 'johto' : 'hoenn';
    const d = ({ kanto: 0, johto: 1, hoenn: 2 }[region]) * 9 + b + 1;
    const t = tokensPerCatch(d, region);
    console.log(`  ${String(b).padStart(8)} | ${String(fmt(TOLL[b])).padStart(8)} | ${String(Math.ceil(TOLL[b] / t)).padStart(20)}`);
  }

  console.log('\n— 11. Revenu (contexte, formules PokéClicker) —');
  console.log('  Début Kanto (d=1) : 10 ₽/victoire · Fin Kanto (d=9) : 90 · Fin Johto (d=18) : 193 · Fin Hoenn (d=27) : 302');
  console.log('  À 1 500 combats/h : 15 000 → 135 000 → 289 500 → 453 000 ₽/h');
}

main();

