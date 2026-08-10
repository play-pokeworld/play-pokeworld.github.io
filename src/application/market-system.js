/**
 * PokeWorld Application — Economy/Market Orchestration (ECS)
 *
 * Drives the `economy:market` ECS system
 * (src/application/ecs-gameplay-systems.js) for every economic action of the
 * shipped game: Pokemon market purchases, item shop purchases and treasure
 * sales — the code paths the retired classic `src/game/economy/market.js`
 * (deleted in this wave) implemented directly on globals:
 *
 *   - stock and prices are computed INSIDE the system from the domain rules
 *     (src/domain/economy/market.js — STRICT PARITY balances, design decision
 *     §1.3 documented in MIGRATION_STATUS.md);
 *   - money lives on the player `Wallet` component, bag contents on the
 *     `InventoryItems` component; they are synced ⇄ G only at this boundary;
 *   - this orchestrator keeps the exact legacy side effects after a
 *     successful operation (Pokemon creation/unlocks, Pokedex, saves, UI
 *     refresh) — persistence is a boundary concern.
 *
 * @module application/market-system
 */
import { getGameplayWorld } from './battle-loop.js';
import { syncPlayerPresence, applyEconomyComponents } from './encounter-system.js';
import { getPokemonPrice as domainPokemonPrice, categorizeMarketSpecies } from '../domain/economy/market.js';
import * as marketRules from '../domain/economy/market.js';

let marketEid = -1;

function gameState() {
  return typeof globalThis !== 'undefined' ? globalThis.G : null;
}

/** Ensure the marketplace entity (Marketplace + ShopStock) exists. */
export function ensureMarketplace() {
  const { world } = getGameplayWorld();
  if (!world) return -1;
  if (marketEid >= 0 && world._entities.has(marketEid)) return marketEid;
  marketEid = world.create();
  world.add(marketEid, 'Marketplace', { lastOutcome: null });
  world.add(marketEid, 'ShopStock', { region: 'kanto', items: [], shopId: null, shopItems: [] });
  return marketEid;
}

function runMarketOp(op) {
  const eid = ensureMarketplace();
  const { world } = getGameplayWorld();
  if (!world || eid < 0) return null;
  world.run('economy:market', op);
  const market = world.get(eid, 'Marketplace');
  return market ? market.lastOutcome : null;
}

/**
 * ECS-backed replacement of the retired classic `getMarketPokemon` —
 * returns the purchasable species ids for the current region, computed by
 * the system on the ShopStock component.
 * @returns {number[]}
 */
export function getMarketPokemon() {
  const G = gameState();
  if (!G) return [];
  syncPlayerPresence();
  runMarketOp({ op: 'refresh-market', region: G.region || 'kanto' });
  const { world } = getGameplayWorld();
  const stock = marketEid >= 0 ? world.get(marketEid, 'ShopStock') : null;
  return stock ? (stock.items || []).map((it) => it.id) : [];
}

/**
 * ECS-backed replacement of the retired classic `getPokemonPrice` — strict
 * parity with the classic pricing table (see domain/economy/market.js).
 * @param {number} id
 * @returns {number}
 */
export function getPokemonPrice(id) {
  return domainPokemonPrice(id, globalThis.PD || {});
}

export { categorizeMarketSpecies };

/**
 * ECS-backed replacement of the retired classic `buyPokemon`. The payment
 * rule (listed species, funds check, wallet debit) runs INSIDE the system;
 * this function then applies the Pokemon-creation handoff unchanged.
 * @param {number} id species id
 */
export function buyPokemon(id) {
  const G = gameState();
  if (!G) return;
  id = Number(id);
  syncPlayerPresence();
  runMarketOp({ op: 'refresh-market', region: G.region || 'kanto' });
  const outcome = runMarketOp({ op: 'buy-pokemon', speciesId: id });
  if (!outcome || !outcome.ok) {
    if (outcome && outcome.reason === 'insufficient-funds') {
      globalThis.notify(globalThis.t('n.pas_assez_dargent'), 'var(--red)');
    }
    return;
  }

  // ── Persistence / world handoff (identical to the retired classic) ─────
  applyEconomyComponents();
  globalThis.updateHeader();
  const price = outcome.price;
  const isShiny = (typeof globalThis.rollShiny === 'function') ? globalThis.rollShiny() : false;
  const p = globalThis.createPoke(id, 1, isShiny);
  if (!p) { globalThis.notify(globalThis.t('legacy_message_n_erreur_lors_de_la_cr_ation_du_pok_mon'), 'var(--red)'); return; }
  if (isShiny) {
    p.shinyUnlocked = true; p.shinyActive = true; p.shiny = true;
    if (typeof globalThis.unlockShinyForSpecies === 'function') globalThis.unlockShinyForSpecies(id);
  }
  if (typeof globalThis.unlockTalentForSpecies === 'function' && p.talent) globalThis.unlockTalentForSpecies(id, p.talent);
  if (G.team.length < 6 && !globalThis.speciesOwned(id)) {
    G.team.push(p);
    if (typeof globalThis.syncTeamSlotHeldItems === 'function') globalThis.syncTeamSlotHeldItems();
    globalThis.notify(globalThis.tr('joined_team_price', { name: p.name, price: price.toLocaleString() }), 'var(--green)');
  } else {
    let boxId = 'market_' + id + '_' + Date.now();
    while (G.collection[boxId]) boxId = 'market_' + id + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    G.collection[boxId] = p;
    globalThis.notify(globalThis.tr('sent_to_box_price', { name: p.name, price: price.toLocaleString() }), 'var(--green)');
  }
  G.pokedex[id] = Object.assign({}, G.pokedex[id] || {}, { seen: true, caught: true });
  if (isShiny) G.pokedex[id].shiny = true;
  globalThis.saveGame();
  try { globalThis.autoSave(); } catch (_e) { /* autosave optional */ }
  const fsContent = globalThis.document && globalThis.document.getElementById('fs-panel-content');
  if (fsContent && globalThis.document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'
      && typeof globalThis.renderMarket === 'function') {
    globalThis.renderMarket(fsContent);
  }
  globalThis.updateHeader();
  globalThis.renderTeamWindow();
}

/**
 * ECS-backed replacement of the retired classic `buyItem`: bag-cap, funds
 * and wallet/bag mutation run INSIDE the system; the location's shop offer
 * (ShopStock.shopItems) is refreshed by the system the same way.
 * @param {string} key item key
 */
export function buyItem(key) {
  const G = gameState();
  if (!G) return;
  const loc = typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G.location) : null;
  const shopId = loc ? loc.shopId : null;
  if (shopId === 'indigo' && !G.championTitle) {
    globalThis.notify(globalThis.t('m.shop.1'), 'var(--red)');
    return;
  }
  syncPlayerPresence();
  runMarketOp({ op: 'refresh-shop', shopId: shopId || '' });
  const outcome = runMarketOp({ op: 'buy-item', itemKey: key });
  if (!outcome || !outcome.ok) {
    if (outcome && outcome.reason === 'bag-full') {
      globalThis.notify(globalThis.tr('bag_full_for', { item: globalThis.getItemName(key), max: 25 }), 'var(--red)');
    } else if (outcome && outcome.reason === 'insufficient-funds') {
      globalThis.notify(globalThis.t('n.pas_assez_dargent'), 'var(--red)');
    }
    return;
  }

  applyEconomyComponents();
  globalThis.updateHeader();
  globalThis.notify(globalThis.tr('item_bought', { item: globalThis.getItemName(key) }));
  const fsContent = globalThis.document && globalThis.document.getElementById('fs-panel-content');
  if (fsContent && globalThis.document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'
      && typeof globalThis.renderShop === 'function') {
    globalThis.renderShop(fsContent);
  }
}

/**
 * ECS-backed replacement of the retired classic `sellTreasure` — fossil
 * guard, quantity clamp, inventory decrement and wallet credit all run
 * INSIDE the system on components.
 * @param {string} key item key
 * @param {number} count units to sell
 */
export function sellTreasure(key, count) {
  const G = gameState();
  if (!G) return;
  syncPlayerPresence();
  const outcome = runMarketOp({ op: 'sell-treasure', itemKey: key, count });
  if (!outcome || !outcome.ok) {
    if (outcome && outcome.reason === 'not-sellable' && (globalThis.ITEMS || {})[key]) {
      globalThis.notify(globalThis.t('fossil_not_sellable'), 'var(--red)');
    }
    return;
  }

  applyEconomyComponents();
  const EventBusRef = globalThis.EventBus;
  const EVENTSRef = globalThis.EVENTS || {};
  if (EventBusRef && typeof EventBusRef.emit === 'function' && EVENTSRef.MINE_SELL) {
    EventBusRef.emit(EVENTSRef.MINE_SELL, { key, amount: outcome.count });
  }
  globalThis.updateHeader();
  globalThis.notify(globalThis.tr('treasure_sold', {
    n: outcome.count, item: globalThis.getItemName(key), gain: outcome.gain.toLocaleString(),
  }), 'var(--green)');
  globalThis.saveGame();
  globalThis.onInventoryClick(key);
}

/** Domain rule re-export for UI adapters (category bucketing etc.). */
export const marketDomain = marketRules;

if (typeof window !== 'undefined') {
  // Same public surface as the retired classic modules — every entry now
  // goes through the ECS world.
  window.getMarketPokemon = getMarketPokemon;
  window.getPokemonPrice = getPokemonPrice;
  window.buyPokemon = buyPokemon;
  window.buyItem = buyItem;
  window.sellTreasure = sellTreasure;
}
if (typeof globalThis !== 'undefined') {
  globalThis.getMarketPokemon = getMarketPokemon;
  globalThis.getPokemonPrice = getPokemonPrice;
  globalThis.buyPokemon = buyPokemon;
  globalThis.buyItem = buyItem;
  globalThis.sellTreasure = sellTreasure;
}
