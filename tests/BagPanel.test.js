/**
 * @file BagPanel.test.js
 * @brief Team held-item selection must use the shared Bag screen and row component.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, assert } from './TestRunner.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { ActiveTeamPanel } from '../src/panels/ActiveTeamPanel.js';
import { BagPanel } from '../src/panels/fullscreen/BagPanel.js';
import { BagCategoryIds } from '../src/config/BagCategories.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { t } from '../src/localization/LocalizationManager.js';
import { setRoster } from './RosterFixtures.js';

const saves = SaveSystem.getInstance();
const source = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8');

describe('Team held-item selection through the Bag', (test) => {
  test('team entry points use the Bag panel; the duplicate picker is not registered', () => {
    const team = source('src/panels/ActiveTeamPanel.js');
    const info = source('src/panels/PokemonInfoModal.js');
    const page = source('src/pages/GamePage.js');
    const modalIds = source('src/config/ModalIds.js');
    const fullscreenCss = source('assets/css/fullscreen-panel.css');
    const bagCss = source('assets/css/bag.css');
    const panelCss = source('assets/css/panels.css');

    assert.ok(/ModalIds\.BAG,\s*\{\s*mode:\s*'held-item'/.test(team), 'team item action opens held-item mode in BagPanel');
    assert.ok(/ModalIds\.BAG,\s*\{\s*mode:\s*'held-item'/.test(info), 'Pokémon sheet item action opens the same BagPanel');
    assert.ok(/new BagPanel\(\)/.test(page), 'GamePage registers the Bag panel');
    assert.ok(/\.pw-fullscreen-overlay\.pw-bag-held-item-mode\s*\{\s*z-index:\s*32000/.test(fullscreenCss), 'the Bag opened from a Pokémon sheet stacks above the parent modal');
    assert.ok(/\.inv-list-root\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(auto-fill, minmax\(220px, 1fr\)\)/.test(bagCss), 'held-item selection inherits the standard Bag grid columns');
    assert.ok(!/\.inv-list-root\.pw-held-item-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s.test(bagCss + panelCss), 'held-item selection does not collapse back to a single list column');
    assert.ok(/\.pw-held-item-actions\s*\{[^}]*display:\s*flex/s.test(fullscreenCss), 'held-item actions use the fixed footer slot');
    assert.ok(!/HeldItemPickerModal/.test(page), 'GamePage does not register a separate item picker');
    assert.ok(!/HELD_ITEM_PICKER/.test(modalIds), 'there is no obsolete item-picker modal id');
    assert.ok(!fs.existsSync(path.resolve('src/panels/HeldItemPickerModal.js')), 'the duplicate panel implementation is removed');
    assert.ok(!fs.existsSync(path.resolve('src/panels/components/HeldItemBagRow.js')), 'held-item rows use BagItemRow');
  });

  test('choosing an owned item from the team opens the Bag and equips through one save write', () => {
    const previousSave = saves.getCurrentSave();
    const originalSaveCurrent = saves.saveCurrent;
    const save = SaveData.createNew('Bag selection test', 'charmander');
    const first = PokemonFactory.create('charmander', 12);
    const second = PokemonFactory.create('bulbasaur', 12);
    second.heldItem = 'charcoal';
    setRoster(save, [first, second]);
    save.inventory.add('charcoal', 1, { deferSave: true });
    save.inventory.add('leftovers', 1, { deferSave: true });
    saves.setCurrentSave(save);

    const bag = new BagPanel();
    const team = new ActiveTeamPanel(DashboardColumns.LEFT);
    let writes = 0;
    saves.saveCurrent = () => { writes++; };
    try {
      team._openHeldItemPicker(0);
      assert.ok(bag.isOpen(), 'the full-screen Bag panel opened');
      assert.ok(bag.getDomElement().classList.contains('pw-fullscreen-overlay'));
      assert.ok(bag.getDomElement().classList.contains('pw-bag-held-item-mode'), 'the item-selection layer is raised above the Pokémon sheet');
      const bagTabs = bag.getDomElement().querySelectorAll('.pw-chip');
      assert.equal(bagTabs.length, 1, 'the focused Bag view exposes only its held-items category');
      assert.equal(bagTabs[0].querySelector('.pw-chip-label')?.textContent, t('cat_held_items'));
      assert.ok(bag.getDomElement().querySelector('.pw-held-item-target-sprite'), 'the Bag selection context shows the target Pokémon');
      bag._setCategory(BagCategoryIds.POKEBALLS);
      assert.equal(bag._mode, 'held-item', 'a non-held category cannot silently exit item-selection mode');
      assert.equal(bag._category, BagCategoryIds.HELD);

      const rows = bag.getDomElement().querySelectorAll('.pw-held-item-row');
      const rowFor = (itemId) => rows.find((row) => row.dataset.itemId === itemId);
      const heldElsewhere = rowFor('charcoal');
      const available = rowFor('leftovers');
      const footer = bag.getDomElement().querySelector('.pw-modal-footer');
      const removeButton = footer?.querySelector('.pw-held-item-remove');
      assert.ok(footer?.classList.contains('is-filled'), 'held-item actions fill the fixed fullscreen footer');
      assert.ok(removeButton && footer.querySelector('.pw-held-item-cancel'), 'the footer always offers Remove and Cancel');
      assert.equal(removeButton.getAttribute('disabled'), 'disabled', 'Remove is disabled while the target has no held item');
      assert.equal(bag.getDomElement().querySelector('.pw-modal-body')?.querySelector('.pw-held-item-actions'), null, 'held-item actions do not scroll with the item list');
      assert.ok(heldElsewhere && available, 'Bag shows the owned held items');
      assert.equal(heldElsewhere.classList.contains('inv-item'), true, 'held item uses the standard Bag item row');
      assert.equal(heldElsewhere.getAttribute('aria-disabled'), 'true', 'an item held by another teammate is unavailable');
      assert.equal(available.getAttribute('role'), 'button', 'an available Bag row is keyboard- and pointer-selectable');

      heldElsewhere.click();
      assert.equal(first.heldItem, null, 'unavailable item cannot be equipped');
      assert.equal(writes, 0, 'invalid selection does not save');

      available.click();
      assert.equal(first.heldItem, 'leftovers');
      assert.equal(save.inventory.count('leftovers'), 1, 'equipping does not consume the owned held item');
      assert.equal(writes, 1, 'the TeamSystem mutation saves exactly once');
      assert.equal(bag.isOpen(), false, 'the Bag closes after a successful selection');
      assert.equal(bag.getDomElement().classList.contains('pw-bag-held-item-mode'), false, 'the raised layer is cleared on close');

      team._openHeldItemPicker(0);
      const equippedRemove = bag.getDomElement().querySelector('.pw-modal-footer')?.querySelector('.pw-held-item-remove');
      assert.ok(equippedRemove, 'the fixed footer keeps the removal action when an item is equipped');
      assert.equal(equippedRemove.getAttribute('disabled'), null, 'Remove is enabled for the equipped item');
      equippedRemove.click();
      assert.equal(first.heldItem, null, 'the footer removes the held item');
      assert.equal(writes, 2, 'removing the held item also saves exactly once');
      assert.equal(bag.isOpen(), false, 'removal closes the held-item selection');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      if (bag.isOpen()) bag.close();
      team.destroy();
      bag.destroy();
      saves.setCurrentSave(previousSave);
    }
  });

  test('open held-item mode refreshes its lock when a battle starts and ends', () => {
    const previousSave = saves.getCurrentSave();
    const originalSaveCurrent = saves.saveCurrent;
    const battle = BattleSystem.getInstance();
    assert.equal(battle.isActive(), false, 'the isolated test starts outside a battle');
    const save = SaveData.createNew('Bag battle lock test', 'charmander');
    save.player.location = 'route1';
    setRoster(save, [PokemonFactory.create('charmander', 12)]);
    save.inventory.add('leftovers', 1, { deferSave: true });
    saves.setCurrentSave(save);
    saves.saveCurrent = () => {};
    const bag = new BagPanel();
    const rowFor = (itemId) => bag.getDomElement().querySelectorAll('.pw-held-item-row')
      .find((row) => row.dataset.itemId === itemId);

    try {
      bag.open({ mode: 'held-item', teamIndex: 0 });
      assert.equal(rowFor('leftovers').getAttribute('aria-disabled'), 'false');
      assert.ok(battle.startBattle('route1', { chain: false }), 'the controlled wild battle starts');
      assert.equal(rowFor('leftovers').getAttribute('aria-disabled'), 'true', 'battle start locks the live Bag selection');
      assert.ok(bag.getDomElement().textContent.includes(t('held_item_battle_locked')), 'the active-battle note appears in the current language');

      battle.endBattle(false);
      assert.equal(rowFor('leftovers').getAttribute('aria-disabled'), 'false', 'battle end restores the Bag selection');
    } finally {
      if (battle.isActive()) battle.endBattle(false);
      if (bag.isOpen()) bag.close();
      bag.destroy();
      saves.saveCurrent = originalSaveCurrent;
      saves.setCurrentSave(previousSave);
    }
  });
});
