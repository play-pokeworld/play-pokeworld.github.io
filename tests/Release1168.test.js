/**
 * @file Release1168.test.js
 * @brief 1.16.8 — one size for item sprites in the two loot summaries.
 *
 * Reported: item sprites were a different size in every window; the location window was fine but the
 * battle summary and the AFK report were gigantic. Root cause: both summaries built their own <img>
 * with the class `battle-summary-item-icon`, which no stylesheet ever styled, so the browser fell back
 * to the intrinsic size of the PNG (24 px for a candy, 371 px for a Master Ball).
 *
 * The fix is structural, not cosmetic: one shared `LootItemList` component renders the loot of both
 * summaries with the canonical `UIItemSprite` in the location window's 72 px round frame
 * (`.pw-grid-media`). These tests pin that structure so the two windows can never drift apart again.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { installFakeDom } from './FakeDom.js';
import { LootItemList } from '../src/panels/components/LootItemList.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { AfkSummaryModal } from '../src/panels/AfkSummaryModal.js';
import { UIContainer } from '../src/ui/UIContainer.js';
import { UIItemSprite } from '../src/ui/UIItemSprite.js';
import { LocalizationManager } from '../src/localization/LocalizationManager.js';
import { readBundle } from './CssBundle.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const readSource = (relative) => fs.readFileSync(PROJECT_ROOT + relative, 'utf8');
/** Items whose art has wildly different intrinsic sizes: the whole point of the regression. */
const ITEMS = [
  { itemId: 'rarecandy', quantity: 2 },
  { itemId: 'masterball', quantity: 1 },
  { itemId: 'nugget', quantity: 12 }
];

/** Every element of a container's DOM, the container included. */
function elements(node) {
  const root = node.getDomElement();
  return [root, ...root.querySelectorAll('*')];
}

/** Item media of a rendered loot list: the canonical round frame and the image inside it. */
function media(node) {
  const root = node.getDomElement();
  return {
    frames: [...root.querySelectorAll('.pw-item-sprite')],
    images: [...root.querySelectorAll('img')],
    gridMedia: [...root.querySelectorAll('.pw-grid-media')]
  };
}

describe('1.16.8 — item sprites of the battle summary and the AFK report', (test) => {
  installFakeDom();
  LocalizationManager.getInstance().setLanguage('fr');

  test('the shared loot list renders the canonical UIItemSprite in the location window frame', () => {
    const list = new LootItemList({ items: ITEMS, emptyKey: 'afk_none', resolveName: (id) => `name.${id}` });
    const found = media(list);
    assert.equal(found.frames.length, ITEMS.length, 'one sprite per looted item');
    assert.equal(found.images.length, ITEMS.length, 'the sprites are the only images: no bare <img> left');
    assert.equal(found.gridMedia.length, ITEMS.length, 'every sprite carries the location window size class');
    for (const frame of found.frames) {
      assert.ok(frame.classList.contains('pw-poke-circle-wrap'), 'the sprite uses the canonical round frame');
      const image = frame.querySelector('img');
      assert.ok(image.classList.contains('pw-item-circle-img'), 'the art is clipped by the item circle');
      assert.ok(!image.classList.contains('pw-image--native-size'), 'no intrinsic-size fallback is requested');
    }
    for (const image of found.images) {
      const classes = String(image.className);
      assert.ok(!classes.includes('battle-summary-item-icon'), 'the unstyled legacy class is gone');
    }
    return `${found.frames.length} canonical sprites`;
  });

  test('name and quantity are stacked next to the sprite, not squeezed into one line', () => {
    const list = new LootItemList({ items: ITEMS, emptyKey: 'afk_none', resolveName: (id) => `name.${id}` });
    const metas = [...list.getDomElement().querySelectorAll('.loot-item-meta')];
    assert.equal(metas.length, ITEMS.length, 'one meta column per entry');
    for (const meta of metas) {
      assert.equal(meta.children.length, 2, 'the name and the quantity are two stacked lines');
      assert.ok(/^×\d/.test(meta.children[1].textContent), 'the second line is the quantity');
    }
    return 'stacked meta';
  });

  test('an empty loot list says so, and never renders a stray sprite', () => {
    const list = new LootItemList({ items: [], emptyKey: 'battle_summary_no_items', resolveName: (id) => id });
    const root = list.getDomElement();
    assert.equal(root.querySelectorAll('.pw-item-sprite').length, 0);
    assert.equal(root.querySelectorAll('.loot-item-entry').length, 0);
    assert.ok(root.querySelector('.pw-empty-state'), 'the empty state line is displayed');
    return 'empty state';
  });

  test('the battle summary renders its loot through the shared list', () => {
    const modal = new BattleSummaryModal();
    const target = new UIContainer({});
    modal._renderItems(ITEMS, target);
    const found = media(target);
    assert.equal(found.frames.length, ITEMS.length);
    assert.equal(found.images.length, ITEMS.length);
    assert.ok(target.getDomElement().querySelector('.pw-section-title'), 'the items title is kept');
    assert.equal(target.getDomElement().querySelectorAll('.loot-item-entry').length, ITEMS.length);
    return 'battle summary';
  });

  test('the AFK report renders its loot through the same shared list', () => {
    const modal = new AfkSummaryModal();
    const section = modal._itemsSection(ITEMS);
    assert.ok(section instanceof LootItemList, 'the AFK report has no loot implementation of its own');
    const found = media(section);
    assert.equal(found.frames.length, ITEMS.length);
    assert.equal(found.images.length, ITEMS.length);
    return 'afk report';
  });

  test('both summaries produce byte-identical loot markup', () => {
    const battle = new UIContainer({});
    new BattleSummaryModal()._renderItems(ITEMS, battle);
    const afk = new AfkSummaryModal()._itemsSection(ITEMS);
    assert.equal(battle.getDomElement().innerHTML, afk.getDomElement().innerHTML,
      'the two windows share one implementation, so they can never diverge');
    return 'identical markup';
  });

  test('no window builds an item icon by hand any more', () => {
    for (const relative of ['/src/panels/BattleSummaryModal.js', '/src/panels/AfkSummaryModal.js']) {
      const source = readSource(relative);
      assert.ok(!source.includes('battle-summary-item-icon'), `${relative} keeps the unstyled class`);
      assert.ok(!source.includes('getImagePath'), `${relative} resolves item art by itself instead of using UIItemSprite`);
    }
    const css = readBundle();
    assert.ok(css.includes('.loot-item-entry'), 'the loot card has a real style rule');
    return 'no hand-built icons';
  });

  test('the compact windows keep their own sizing', () => {
    // 1.16.8 only touches the loot summaries: every other item media keeps the class it already had.
    const owners = {
      '/src/panels/fullscreen/BagPanel.js': 'inv-icon-img',
      '/src/panels/components/ShopItemCard.js': 'pw-shop-ico-img',
      '/src/panels/components/DictionaryCard.js': 'dict-entry-item-img',
      '/src/panels/components/BattleLootStrip.js': 'pw-battle-loot-chips'
    };
    for (const [relative, token] of Object.entries(owners)) {
      assert.ok(readSource(relative).includes(token), `${relative} was not touched by the loot refactor`);
    }
    return 'compact windows untouched';
  });
});
