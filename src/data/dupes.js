// V7 · DBT-09 — extrait de src/data/game-helpers.js (découpage par domaine, aucun changement de règle).
// Doublons : conversion d'un objet en double / en surplus de pile (ECO-05, D5 : 10 % du prix) et limite de pile.
// V7 · P1a · ECO-05 (D5): a duplicate / overflow item converts at 10 % of its
// price (was 25 %). ≈ 69 k ₽/h at 1 % drop, 415 k ₽/h at the 6 % cap — the main
// tap stays the wild-win payout (36 k ₽/h early Kanto → 1.09 M ₽/h end Hoenn).
const DUPLICATE_ITEM_PAYOUT_RATE = 0.10;
if (typeof globalThis !== 'undefined') globalThis.DUPLICATE_ITEM_PAYOUT_RATE = DUPLICATE_ITEM_PAYOUT_RATE;
function getDuplicateItemPayout(key, qty){
 const itm = ITEMS[key] || ITEMS[normalizeItemKey ? normalizeItemKey(key) : key];
 const unit = Math.max(0, Math.floor(((itm && (itm.price || itm.value)) || 0) * DUPLICATE_ITEM_PAYOUT_RATE));
 return unit * Math.max(1, qty || 1);
}
// Item stack limit (same rule as addToInventory): held / battle items /
// berries = 25, everything else is virtually unlimited. Phase 30: loot
// money-conversion must only trigger WHEN the stack is full — before,
// owning ONE single copy was enough to convert everything into money,
// and routes were handing out cash for no reason (beta feedback).
function getItemStackLimit(key){
 const itm = ITEMS[key] || ITEMS[normalizeItemKey ? normalizeItemKey(key) : key];
 return (itm && (itm.type === 'held' || itm.category || itm.buff)) ? 25 : 999999;
}

// Surface classique (consommateurs par identifiant libre, harnais VM).
if (typeof getDuplicateItemPayout !== 'undefined') { if (typeof window !== 'undefined') window.getDuplicateItemPayout = getDuplicateItemPayout; if (typeof globalThis !== 'undefined') globalThis.getDuplicateItemPayout = getDuplicateItemPayout; }
if (typeof getItemStackLimit !== 'undefined') { if (typeof window !== 'undefined') window.getItemStackLimit = getItemStackLimit; if (typeof globalThis !== 'undefined') globalThis.getItemStackLimit = getItemStackLimit; }

export {
  DUPLICATE_ITEM_PAYOUT_RATE,
  getDuplicateItemPayout,
  getItemStackLimit,
};
