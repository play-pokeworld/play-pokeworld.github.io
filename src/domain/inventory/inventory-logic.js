/**
 * Domain: Inventory logic (pure, no DOM)
 * Extracted from src/legacy/scripts/gameplay/economy/inventory.js
 */

export function itemCat(key, ITEMS) {
  const items = ITEMS || (globalThis.ITEMS || {});
  const itm = items[key];
  if (!itm) return 'all';
  if (key.startsWith('berry')) return 'berry';
  if (itm.type === 'stone') return 'stone';
  if (itm.type === 'treasure') return 'treasure';
  if (itm.type === 'candy' || itm.type === 'special') return 'special';
  if (itm.buff) return 'object';
  return 'berry';
}

export function filterEntries(entries, cat, itemCatFn) {
  if (cat === 'all') return entries;
  return entries.filter(([k]) => itemCatFn(k) === cat);
}

export function sortEntries(entries, sortMode, getItemNameFn, itemCatFn) {
  const arr = [...entries];
  if (sortMode === 'name') {
    arr.sort((a, b) => getItemNameFn(a[0]).localeCompare(getItemNameFn(b[0])));
  } else if (sortMode === 'qty') {
    arr.sort((a, b) => b[1] - a[1]);
  } else if (sortMode === 'category') {
    arr.sort((a, b) => itemCatFn(a[0]).localeCompare(itemCatFn(b[0])));
  }
  return arr;
}

// Global compatibility
if (typeof window !== 'undefined') {
  window.itemCat = (key) => itemCat(key, globalThis.ITEMS);
}
