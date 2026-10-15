#!/usr/bin/env node
/**
 * PokéWorld — Simulateur d'économie (V7 · DBT-08)
 *
 * TOUTES les constantes sont LUES DEPUIS LE CODE DU JEU : aucun prix, aucune
 * échelle, aucune table n'est recopiée ici. Si une valeur change dans le jeu,
 * le récapitulatif change avec elle (et la garantie de positivité de la mine
 * est re-vérifiée). Les seules valeurs locales sont des HYPOTHÈSES DE
 * SIMULATION (cadence de jeu), regroupées dans ASSUMPTIONS et affichées comme
 * telles.
 *
 *   node tools/economy-sim.mjs            # récapitulatif
 *   node tools/economy-sim.mjs --check    # sortie 1 si la mine n'est plus garantie positive
 */
import { gameConstants } from './lib/game-constants.mjs';

const ARGS = process.argv.slice(2);
const CHECK = ARGS.includes('--check');

const fmt = (n) => Number(n).toLocaleString('fr-FR');
const sum = (a) => a.reduce((x, y) => x + y, 0);
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

// ─────────────────────────────────────────────────────────────
// Hypothèses de SIMULATION (cadence) — pas des constantes du jeu
// ─────────────────────────────────────────────────────────────
const ASSUMPTIONS = {
  battlesPerHour: 1500,     // joueur actif, auto-combat
  pqPerCycle: 15600,        // revenu PQ d'un cycle complet de quêtes répétables
  cyclesPerDay: 3,
  digsPerLayer: 120,        // ~80 cases × 1,5 coup (dureté 1-4, burin puissance 2)
};

const C = await gameConstants();

// ═════════════════════════════════════════════
function staffTable() {
  const sym = C.staffCurrencySymbol;
  return C.STAFF_DEFS.map((def, i) => {
    const { currency, price } = C.staffPrice(def);
    return { n: i + 1, id: def.id, cur: sym(currency), price };
  });
}
function staffTotals(rows) {
  const t = { '₽': 0, PQ: 0, '💎': 0, PC: 0 };
  for (const r of rows) t[r.cur] += r.price;
  return t;
}

// Regroupe les objets d'un type par prix (paliers réels de la boutique).
function priceTiers(type) {
  const tiers = new Map();
  for (const [key, it] of Object.entries(C.ITEMS)) {
    if (it.type !== type || !it.price) continue;
    const row = tiers.get(it.price) || { unit: it.price, count: 0, keys: [] };
    row.count++; row.keys.push(key);
    tiers.set(it.price, row);
  }
  return [...tiers.values()].sort((a, b) => a.unit - b.unit);
}

function main() {
  const staff = staffTable();
  const st = staffTotals(staff);
  const heldTiers = priceTiers('held');
  const ctTiers = priceTiers('ct');
  const stoneTiers = priceTiers('stone');
  const held = sum(heldTiers.map((t) => t.unit * t.count));
  const ct = sum(ctTiers.map((t) => t.unit * t.count));
  const stones = sum(stoneTiers.map((t) => t.unit * t.count));
  const moneyPermanent = held + ct + stones + st['₽'];

  const rareCandy = C.ITEMS.rarecandy || C.ITEMS.rare_candy || {};
  const balls = Object.entries(C.BALL_DEFS).filter(([, d]) => !d.notForSale && d.price > 0);

  // PQ
  const pqAutomation = Object.values(C.AUTOMATION_UPGRADE_COSTS).concat([C.TRAINING_AUTOMATION_SLOT_COST]);
  const pqSlots = [...C.HATCHERY_SLOT_UPGRADE_COSTS, ...C.HATCHERY_QUEUE_UPGRADE_COSTS,
    C.TRAINING_MULTI_SLOT_COST, ...C.TRAINING_QUEUE_UPGRADE_COSTS];
  const pqMarketSamples = [1, 152, 252, 138, 345, 142].map((id) => [id, C.pqMarketPrice(id)]);
  const pqTotal = sum(pqAutomation) + sum(pqSlots) + st.PQ;

  // 💎 / mine
  const tools = Object.entries(C.MINE_TOOL_DEFS).filter(([, d]) => d.diamondCost);
  const dTools = sum(tools.map(([, d]) => d.diamondCost));
  const dEnergy = sum(C.MINE_ENERGY_UPGRADE_COSTS);
  const dTotal = dTools + dEnergy + C.MINE_AUTO_COST + st['💎'];
  const treasures = Object.entries(C.DIAMOND_VALUES);
  const minValue = Math.min(...treasures.map(([, v]) => v));
  const avgValue = sum(treasures.map(([, v]) => v)) / treasures.length;
  const gen = C.mineLayerTreasures; // { min, max, extraMax } lus dans generateMineLayer
  const minYield = gen.min * minValue;
  const avgYield = ((gen.min + gen.max) / 2) * avgValue;
  const tiles = C.MINE_W * C.MINE_H;
  const layerCost = Math.min(tiles, ASSUMPTIONS.digsPerLayer) * C.autoMineCostPerTile;
  const positive = minYield >= 1.5 * layerCost;

  // PC
  const pcShop = C.ATOLL_SHOP;
  const pcTotal = sum(pcShop.map(([, p]) => p)) + st.PC;

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PokéWorld — Économie (constantes lues dans le code) — Récapitulatif');
  console.log('═══════════════════════════════════════════════════════════════════');

  console.log(`— 1. Personnel (${staff.length}) — rotation ${C.STAFF_CYCLE.map(C.staffCurrencySymbol).join(' → ')} —`);
  const cols = 3, rowsN = Math.ceil(staff.length / cols);
  for (let i = 0; i < rowsN; i++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const r = staff[i + c * rowsN];
      if (r) cells.push(`${rpad(r.n, 2)} | ${pad(r.cur, 3)} | ${rpad(fmt(r.price), 8)}`);
    }
    console.log(cells.join('   '));
  }
  const counts = { '₽': 0, PQ: 0, '💎': 0, PC: 0 }; staff.forEach((r) => counts[r.cur]++);
  console.log(`Occurrences : ₽ ×${counts['₽']} · PQ ×${counts.PQ} · 💎 ×${counts['💎']} · PC ×${counts.PC}`);
  console.log(`Échelles : ${Object.entries(C.STAFF_LADDERS).map(([k, v]) => `${C.staffCurrencySymbol(k)} ${v.map(fmt).join('/')}`).join(' · ')}`);
  console.log(`Totaux : ₽ ${fmt(st['₽'])} · PQ ${fmt(st.PQ)} · 💎 ${fmt(st['💎'])} · PC ${fmt(st.PC)}`);

  console.log('\n— 2. Puits ₽ (prix FIXES par palier, lus dans ITEMS) —');
  for (const t of heldTiers) console.log(`  ${pad(`Objets tenus à ${fmt(t.unit)} ₽`, 36)} : ${rpad(t.count, 3)} × ${fmt(t.unit)} = ${fmt(t.unit * t.count)} ₽`);
  for (const t of ctTiers) console.log(`  ${pad(`CT à ${fmt(t.unit)} ₽`, 36)} : ${rpad(t.count, 3)} × ${fmt(t.unit)} = ${fmt(t.unit * t.count)} ₽`);
  for (const t of stoneTiers) console.log(`  ${pad(`Pierres à ${fmt(t.unit)} ₽`, 36)} : ${rpad(t.count, 3)} × ${fmt(t.unit)} = ${fmt(t.unit * t.count)} ₽`);
  console.log(`  ${pad('Personnel (part ₽)', 36)} : ${fmt(st['₽'])} ₽`);
  console.log(`  ${pad('Super Bonbon', 36)} : ${fmt(rareCandy.price || 0)} ₽ l’unité (+ ${fmt((pcShop.find(([k]) => k === 'rarecandy') || [, 0])[1])} PC à l’Atoll)`);
  console.log(`  ── TOTAL ₽ permanent (hors bonbons/balls) : ${fmt(moneyPermanent)} ₽`);

  console.log('\n— 3. Auto-modes : déblocage PQ · mine en 💎 —');
  for (const [k, v] of Object.entries(C.AUTOMATION_UPGRADE_COSTS)) console.log(`  ${pad(k, 28)} : déblocage ${fmt(v)} PQ`);
  console.log(`  ${pad('training automation slot', 28)} : déblocage ${fmt(C.TRAINING_AUTOMATION_SLOT_COST)} PQ`);
  console.log(`  ${pad('auto-mine', 28)} : déblocage ${fmt(C.MINE_AUTO_COST)} 💎 · usage ${C.autoMineCostPerTile} 💎/tuile`);
  console.log(`  ${pad('auto-donjon', 28)} : gratuit après ${C.DUNGEON_AUTO_UNLOCK_CLEARS} complétions`);

  console.log('\n— 4. Points de quête (PQ) —');
  console.log(`  Personnel (part PQ)                  : ${fmt(st.PQ)} PQ`);
  console.log(`  Marché Pokémon (pqMarketPrice)       : ${pqMarketSamples.map(([id, p]) => `#${id} ${fmt(p)}`).join(' · ')}`);
  console.log(`  Emplacements pension/entraînement    : ${fmt(sum(pqSlots))} PQ (échelle : ${pqSlots.map(fmt).join(' · ')})`);
  console.log(`  Déblocage des auto-modes             : ${fmt(sum(pqAutomation))} PQ`);
  console.log(`  PQ par quête répétable (pqForMoney)  : ${[5000, 9000, 16000, 21000, 27000].map((m) => `${fmt(m)}₽→${C.pqForMoney(m)}`).join(' · ')}`);
  console.log(`  ── TOTAL PQ (hors marché/Master Ball) : ${fmt(pqTotal)} PQ`);
  const pqPerDay = ASSUMPTIONS.pqPerCycle * ASSUMPTIONS.cyclesPerDay;
  console.log(`     hypothèse ${fmt(ASSUMPTIONS.pqPerCycle)} PQ/cycle · ${ASSUMPTIONS.cyclesPerDay} cycles/j → ~${(pqTotal / pqPerDay).toFixed(1)} jours pour tout acheter`);

  console.log('\n— 5. Diamants (💎) — mine —');
  console.log(`  Personnel (part 💎)                  : ${fmt(st['💎'])} 💎`);
  console.log(`  Outils (${tools.length})                           : ${tools.map(([k, d]) => `${k} ${fmt(d.diamondCost)}`).join(' · ')} = ${fmt(dTools)} 💎`);
  console.log(`  Énergie (${C.MINE_ENERGY_UPGRADE_COSTS.length} paliers)                 : ${C.MINE_ENERGY_UPGRADE_COSTS.map(fmt).join(' · ')} = ${fmt(dEnergy)} 💎`);
  console.log(`  Auto-mine (déblocage)                : ${fmt(C.MINE_AUTO_COST)} 💎`);
  console.log(`  ── TOTAL 💎 (hors Master Ball)        : ${fmt(dTotal)} 💎  ≈ ${Math.round(dTotal / avgYield)} couches pour tout s’autofinancer`);
  console.log('');
  console.log('  — GARANTIE DE POSITIVITÉ (la mine rend toujours plus que son coût) —');
  console.log(`    Trésors (${treasures.length}, DIAMOND_VALUES) : ${treasures.map(([n, v]) => `${n} ${v}`).join(' · ')}`);
  console.log(`    Génération : ${gen.min}-${gen.max} par couche (+${gen.extraMax} max avec le mineur de Mahogany) — grille ${C.MINE_W}×${C.MINE_H} = ${tiles} cases`);
  console.log(`    Rendement MINIMUM       : ${gen.min} × ${minValue} = ${fmt(minYield)} 💎/couche`);
  console.log(`    Coût auto-mine          : ~${ASSUMPTIONS.digsPerLayer} coups × ${C.autoMineCostPerTile} 💎 = ${fmt(layerCost)} 💎/couche (hypothèse)`);
  console.log(`    Bilan MINIMUM           : ${minYield - layerCost >= 0 ? '+' : ''}${fmt(minYield - layerCost)} 💎 (×${(minYield / layerCost).toFixed(2)})  ${positive ? '✓ TOUJOURS POSITIF' : '✗ RÉGRESSION'}`);
  console.log(`    Bilan MOYEN             : +${fmt(Math.round(avgYield - layerCost))} 💎/couche (~${Math.round(avgYield)} gagnés)`);
  console.log(`    Règle anti-régression   : rendement minimum ≥ 1,5 × coût d’auto-mine (--check)`);

  console.log('\n— 6. Points de combat (PC) —');
  console.log(`  Personnel (part PC)                  : ${fmt(st.PC)} PC`);
  console.log(`  Magasin Atoll (ATOLL_SHOP)           : ${pcShop.map(([k, p]) => `${k} ${fmt(p)}`).join(' · ')} = ${fmt(sum(pcShop.map(([, p]) => p)))} PC`);
  console.log(`  ── TOTAL PC (hors Master Ball)        : ${fmt(pcTotal)} PC`);

  console.log('\n— 7. Bonus d’argent (base secrète, rangs lus dans le code) —');
  for (const r of C.baseRanks) console.log(`  ${pad(r.id, 20)} : ₽ ×${Number(r.moneyMult).toFixed(2)} · XP ×${Number(r.xpMult).toFixed(2)} · mine +${r.mineBonus} · butin +${r.dropBonus}`);

  console.log('\n— 8. Poké Balls (BALL_DEFS) + Honor Ball —');
  console.log(`  ${balls.map(([k, d]) => `${k} ${fmt(d.price)} ₽ (${d.rate} %)`).join(' · ')}`);
  console.log(`  Honor Ball : 1 offerte par tranche de ${C.HONOR_EVERY} Poké Balls achetées.`);

  console.log('\n— 9. Master Ball multi-monnaies (base + palier linéaire par achat) —');
  console.log(`  ${Object.entries(C.MASTER_BALL_BASES).map(([k, v]) => `${k} ${fmt(v)} (+${fmt(C.MASTER_BALL_STEPS[k])}/achat)`).join(' · ')}`);

  console.log('\n— 10. Péage des donjons (JD, DUNGEON_TOLLS) —');
  console.log('  badgeReq | Péage JD | captures pour entrer (tokensPerCatch)');
  for (let b = 0; b <= 8; b++) {
    const region = b <= 2 ? 'kanto' : b <= 5 ? 'johto' : 'hoenn';
    const d = C.REGION_INDEX[region] * 9 + b + 1;
    const toll = C.dungeonToll(b);
    const t = C.tokensPerCatch(d, region);
    console.log(`  ${rpad(b, 8)} | ${rpad(fmt(toll), 8)} | ${rpad(Math.ceil(toll / t), 20)}`);
  }

  console.log('\n— 11. Revenu (moneyPerKill, formule du code) —');
  const marks = [[1, 'Début Kanto'], [9, 'Fin Kanto'], [18, 'Fin Johto'], [27, 'Fin Hoenn']];
  console.log(`  ${marks.map(([d, l]) => `${l} (d=${d}) : ${fmt(C.moneyPerKill(d))} ₽/victoire`).join(' · ')}`);
  console.log(`  À ${fmt(ASSUMPTIONS.battlesPerHour)} combats/h : ${marks.map(([d]) => fmt(C.moneyPerKill(d) * ASSUMPTIONS.battlesPerHour)).join(' → ')} ₽/h`);

  if (CHECK && !positive) {
    console.error(`\n✗ economy-sim --check : la mine n'est plus garantie positive (min ${minYield} < 1,5 × ${layerCost}).`);
    process.exit(1);
  }
}

main();
