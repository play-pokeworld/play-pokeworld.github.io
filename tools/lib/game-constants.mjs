// V7 · DBT-08 — Chargeur des constantes d'économie DEPUIS LE CODE DU JEU pour
// les outils (economy-sim). Les modules ESM du jeu s'attendent à un contexte
// navigateur minimal (window/document/G) : on pose un shim inerte, on importe
// les vrais modules, on relit les constantes exportées. Aucune valeur n'est
// recopiée ici — si le jeu change, l'outil suit (ou échoue bruyamment).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function installBrowserShim() {
  if (globalThis.window) return;
  const el = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, appendChild() {}, replaceChildren() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] });
  globalThis.window = globalThis;
  globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: el, body: el(), head: el(), addEventListener() {} };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.G = {}; globalThis.battle = {};
}

/** Lit « const numItems = rand(a, b) + extraItems » et « Math.min(n, … » dans generateMineLayer. */
function readMineLayerTreasures() {
  const src = R('src/application/economy/mine.js');
  const body = src.slice(src.indexOf('function generateMineLayer'));
  const m = /const numItems = rand\((\d+),\s*(\d+)\)\s*\+\s*extraItems/.exec(body);
  const x = /extraItems = Math\.min\((\d+),/.exec(body);
  if (!m) throw new Error('game-constants: generateMineLayer — règle « rand(min, max) + extraItems » introuvable (mettre à jour tools/lib/game-constants.mjs)');
  return { min: Number(m[1]), max: Number(m[2]), extraMax: x ? Number(x[1]) : 0 };
}

/** Coût d'une tuile en auto-mine : « spendDiamonds(n) » dans le ticker auto. */
function readAutoMineCostPerTile() {
  const src = R('src/application/economy/mine.js');
  // V7 · DBT-01 — tolérant à la mise en forme Prettier (l'appel addBattleLog(...) tient sur plusieurs lignes).
  const n = /spendDiamonds\((\d+)\);\s*addBattleLog\([\s\S]{0,240}?mine_auto_fee_diamonds_log/.exec(src);
  if (!n) throw new Error('game-constants: coût auto-mine par tuile introuvable dans mine.js');
  return Number(n[1]);
}

export async function gameConstants() {
  installBrowserShim();
  const imp = (p) => import(path.join(ROOT, p));
  const [items, automation, currency, mine, balls, hatchery, training, atollPanel, baseDialog, dungeon] = await Promise.all([
    imp('src/data/items-data.js'),
    imp('src/application/automation/automation.js'),
    imp('src/application/economy/currency.js'),
    imp('src/application/economy/mine.js'),
    imp('src/application/economy/pokeballs.js'),
    imp('src/application/breeding/hatchery.js'),
    imp('src/application/combat/training.js'),
    imp('src/ui/game/fullscreen-panel.js'),
    imp('src/ui/game/base/base-dialog.js'),
    imp('src/application/world/dungeon-run.js'),
  ]);
  const need = (mod, name, file) => {
    if (mod[name] === undefined) throw new Error(`game-constants: ${file} n'exporte plus « ${name} »`);
    return mod[name];
  };
  return {
    ITEMS: need(items, 'ITEMS', 'items-data.js'),
    STAFF_DEFS: need(automation, 'STAFF_DEFS', 'automation.js'),
    STAFF_CYCLE: need(automation, 'STAFF_CYCLE', 'automation.js'),
    STAFF_LADDERS: need(automation, 'STAFF_LADDERS', 'automation.js'),
    staffPrice: need(automation, 'staffPrice', 'automation.js'),
    staffCurrencySymbol: need(automation, 'staffCurrencySymbol', 'automation.js'),
    AUTOMATION_UPGRADE_COSTS: need(automation, 'AUTOMATION_UPGRADE_COSTS', 'automation.js'),
    REGION_INDEX: need(currency, 'REGION_INDEX', 'currency.js'),
    DUNGEON_TOLLS: need(currency, 'DUNGEON_TOLLS', 'currency.js'),
    DIAMOND_VALUES: need(currency, 'DIAMOND_VALUES', 'currency.js'),
    dungeonToll: need(currency, 'dungeonToll', 'currency.js'),
    tokensPerCatch: need(currency, 'tokensPerCatch', 'currency.js'),
    moneyPerKill: need(currency, 'moneyPerKill', 'currency.js'),
    pqMarketPrice: need(currency, 'pqMarketPrice', 'currency.js'),
    pqForMoney: need(currency, 'pqForMoney', 'currency.js'),
    MINE_W: need(mine, 'MINE_W', 'mine.js'),
    MINE_H: need(mine, 'MINE_H', 'mine.js'),
    MINE_ITEMS: need(mine, 'MINE_ITEMS', 'mine.js'),
    MINE_AUTO_COST: need(mine, 'MINE_AUTO_COST', 'mine.js'),
    MINE_TOOL_DEFS: need(mine, 'MINE_TOOL_DEFS', 'mine.js'),
    MINE_ENERGY_UPGRADE_COSTS: need(mine, 'MINE_ENERGY_UPGRADE_COSTS', 'mine.js'),
    mineLayerTreasures: readMineLayerTreasures(),
    autoMineCostPerTile: readAutoMineCostPerTile(),
    BALL_DEFS: need(balls, 'BALL_DEFS', 'pokeballs.js'),
    HONOR_EVERY: need(balls, 'HONOR_EVERY', 'pokeballs.js'),
    MASTER_BALL_BASES: need(balls, 'MASTER_BALL_BASES', 'pokeballs.js'),
    MASTER_BALL_STEPS: need(balls, 'MASTER_BALL_STEPS', 'pokeballs.js'),
    HATCHERY_SLOT_UPGRADE_COSTS: need(hatchery, 'HATCHERY_SLOT_UPGRADE_COSTS', 'hatchery.js'),
    HATCHERY_QUEUE_UPGRADE_COSTS: need(hatchery, 'HATCHERY_QUEUE_UPGRADE_COSTS', 'hatchery.js'),
    TRAINING_MULTI_SLOT_COST: need(training, 'TRAINING_MULTI_SLOT_COST', 'training.js'),
    TRAINING_AUTOMATION_SLOT_COST: need(training, 'TRAINING_AUTOMATION_SLOT_COST', 'training.js'),
    TRAINING_QUEUE_UPGRADE_COSTS: need(training, 'TRAINING_QUEUE_UPGRADE_COSTS', 'training.js'),
    ATOLL_SHOP: need(atollPanel, 'ATOLL_SHOP', 'fullscreen-panel.js'),
    baseRanks: need(baseDialog, 'ORAS_FLAG_RANKS', 'base-dialog.js'),
    DUNGEON_AUTO_UNLOCK_CLEARS: need(dungeon, 'DUNGEON_AUTO_UNLOCK_CLEARS', 'dungeon-run.js'),
  };
}
