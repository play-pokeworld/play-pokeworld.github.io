/**
 * @file gen-shops.mjs
 * @brief Generates src/data/raw/shops-data.js from the original shop stocks:
 *   src/data/shops-data.js (SHOPS), src/data/shops-hoenn.js (SHOPS_HOENN) and the TM / HM stock
 *   src/data/ctcs-shop-data.js (CTCS_SHOP_STOCK, merged after the base stock, like shopItemsModel()).
 * Entry: { items [item ids, display order], requiresLeague? (league id that unlocks the shop) }.
 * Items unknown to the generated item table or without a price are dropped (the original skips them).
 * Poké Balls are not part of the stock: ShopRules adds them from the location badge requirement.
 *
 * Usage: node tools/data/gen-shops.mjs <original repository root>
 */

import path from 'path';
import { pathToFileURL } from 'url';
import { OriginalSource } from './OriginalSource.mjs';
import { writeTable, PROJECT_ROOT } from './TableWriter.mjs';

const GENERATOR = 'tools/data/gen-shops.mjs';
/** Original renderShop(): the Indigo Plateau shop opens once the Kanto league is won. */
const LEAGUE_LOCKED_SHOPS = Object.freeze({ indigo: 'elite4' });

export async function generateShops(source) {
  const { SHOPS } = await source.module('src/data/shops-data.js');
  const { SHOPS_HOENN } = await source.module('src/data/shops-hoenn.js');
  await source.module('src/data/ctcs-shop-data.js');
  const tmStock = globalThis.CTCS_SHOP_STOCK || {};
  const itemsModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/data/raw/items-data.js')).href);
  const items = Object.values(itemsModule)[0] || {};
  const dropped = [];
  const shops = {};
  for (const [id, shop] of Object.entries({ ...SHOPS, ...SHOPS_HOENN })) {
    const base = shop.items || [];
    const stock = [...base, ...(tmStock[id] || []).filter((itemId) => !base.includes(itemId))];
    const kept = stock.filter((itemId) => {
      const ok = items[itemId] && items[itemId].price > 0 && items[itemId].buyable !== false;
      if (!ok) dropped.push({ shop: id, item: itemId });
      return ok;
    });
    const entry = { items: kept };
    if (LEAGUE_LOCKED_SHOPS[id]) entry.requiresLeague = LEAGUE_LOCKED_SHOPS[id];
    shops[id] = entry;
  }
  const count = writeTable({
    file: 'src/data/raw/shops-data.js',
    name: 'SHOPS_TABLE',
    brief: 'Town shops: items for sale (base stock, then TMs / HMs).',
    notes: [
      'Entry: { items [item ids], requiresLeague? (league id) }. Prices come from items-data.js.',
      'Poké Balls are added by ShopRules from the badge requirement of the location.',
      'Name: t(\'shop.<id>\'). Hand-made shops: src/data/content/shops-content.js.'
    ],
    data: shops,
    generator: GENERATOR
  });
  return { count, dropped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateShops(new OriginalSource(process.argv[2] || '../orig'));
  console.log(`shops=${result.count} dropped=${result.dropped.length}`);
  for (const { shop, item } of result.dropped) console.log(`  ! ${shop}: ${item}`);
}
