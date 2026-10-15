// V7 · DBT-09 — extrait de src/data/game-helpers.js (découpage par domaine, aucun changement de règle).
// Récompenses : attribution d'objets (quêtes, butin) avec conversion des surplus en ₽ (dupes.js).
import { getDuplicateItemPayout, getItemStackLimit } from './dupes.js';
function grantRewardItem(key, qty){
 qty = Math.max(1, Number(qty || 1));
 if(!ITEMS[key]) return {added:0, money:0};
 const itm = ITEMS[key];
 if(itm.type === 'treasure' || itm.type === 'fossil'){
  addToInventory(key, qty);
  return {added:qty, money:0};
 }
 const cap = getItemStackLimit(key);
 const cur = Number((G.inventory && G.inventory[key]) || 0);
 const added = Math.min(Math.max(0, cap - cur), qty);
 if(added > 0) addToInventory(key, added);
 const overflow = qty - added;
 let money = 0;
 if(overflow > 0){
  money = getDuplicateItemPayout(key, overflow); // stack full: the overflow IS converted
  if(money > 0){
    { const _bonus = pwLateLink('applySecretBaseMoneyBonus'); if(_bonus) money = _bonus(money); }
    G.money = (G.money || 0) + money;
  }
 }
 return {added, money};
}
function grantRewardItems(items){
 const result = {added:{}, money:0};
 if(!items) return result;
 for(const key in items){
  const r = grantRewardItem(key, items[key]);
  if(r.added) result.added[key] = (result.added[key] || 0) + r.added;
  result.money += r.money || 0;
 }
 return result;
}

// Surface classique (consommateurs par identifiant libre, harnais VM).
if (typeof grantRewardItem !== 'undefined') { if (typeof window !== 'undefined') window.grantRewardItem = grantRewardItem; if (typeof globalThis !== 'undefined') globalThis.grantRewardItem = grantRewardItem; }
if (typeof grantRewardItems !== 'undefined') { if (typeof window !== 'undefined') window.grantRewardItems = grantRewardItems; if (typeof globalThis !== 'undefined') globalThis.grantRewardItems = grantRewardItems; }

export {
  grantRewardItem,
  grantRewardItems,
};
