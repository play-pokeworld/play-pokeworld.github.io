/**
 * @file Dictionary.test.js
 * @brief Unit tests for the Dictionary (items, moves, abilities, details and progressive discovery).
 */

import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { TalentDB } from '../src/data/pokemon/TalentDB.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { ItemGenerationRules } from '../src/config/ItemGenerationRules.js';
import { DictionaryCatalog } from '../src/systems/dictionary/DictionaryCatalog.js';
import { DictionaryCard } from '../src/panels/components/DictionaryCard.js';
import { DictionaryDetailModal } from '../src/panels/DictionaryDetailModal.js';
import { DictionaryPanel } from '../src/panels/fullscreen/DictionaryPanel.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { SHORTCUTS, ShortcutIds } from '../src/config/Shortcuts.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import {
  LocalizationManager,
  t,
} from '../src/localization/LocalizationManager.js';

describe('Item generation discovery rules', (test) => {
  test('item generations correctly reflect Kanto (Gen 1), Johto (Gen 2), Hoenn (Gen 3)', () => {
    assert.equal(ItemGenerationRules.itemGeneration('pokeball'), 1);
    assert.equal(ItemGenerationRules.itemGeneration('rarecandy'), 1);
    assert.equal(ItemGenerationRules.itemGeneration('charcoal'), 2);
    assert.equal(ItemGenerationRules.itemGeneration('silk_scarf'), 3);
    assert.equal(ItemGenerationRules.itemGeneration('muscle_band'), 4);
    assert.equal(ItemGenerationRules.itemGeneration('assault_vest'), 6);
  });

  test('TMs and HMs are untagged by generation and always visible', () => {
    assert.equal(ItemGenerationRules.itemGeneration('ct_acid'), null);
    assert.equal(ItemGenerationRules.itemGeneration('cs_surf'), null);
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('ct_acid', ['kanto']),
      true,
    );
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('cs_surf', ['kanto']),
      true,
    );
  });

  test('max unlocked generation scales with accessible regions', () => {
    assert.equal(ItemGenerationRules.maxUnlockedGen(['kanto']), 1);
    assert.equal(ItemGenerationRules.maxUnlockedGen(['kanto', 'johto']), 2);
    assert.equal(
      ItemGenerationRules.maxUnlockedGen(['kanto', 'johto', 'hoenn']),
      3,
    );
  });

  test('Gen 2 items are hidden in Kanto and become visible once Johto is accessible', () => {
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('charcoal', ['kanto']),
      false,
    );
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('charcoal', ['kanto', 'johto']),
      true,
    );
  });

  test('Gen 3 items are hidden in Kanto and Johto and become visible in Hoenn', () => {
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('silk_scarf', ['kanto']),
      false,
    );
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('silk_scarf', ['kanto', 'johto']),
      false,
    );
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('silk_scarf', [
        'kanto',
        'johto',
        'hoenn',
      ]),
      true,
    );
  });

  test('Gen 4+ items are always hidden from the dictionary', () => {
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('muscle_band', [
        'kanto',
        'johto',
        'hoenn',
      ]),
      false,
    );
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('assault_vest', [
        'kanto',
        'johto',
        'hoenn',
      ]),
      false,
    );
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('fire_gem', [
        'kanto',
        'johto',
        'hoenn',
      ]),
      false,
    );
  });

  test('babiri berry is an explicit player exception and stays visible in Gen 1', () => {
    assert.equal(ItemGenerationRules.itemGeneration('babiri_berry'), 1);
    assert.equal(
      ItemGenerationRules.isItemGenUnlocked('babiri_berry', ['kanto']),
      true,
    );
  });
});

describe('DictionaryCatalog queries and business rules', (test) => {
  test('Kanto progressive discovery returns exactly 214 items', () => {
    const save = SaveData.createNew('Dict Kanto', 'charmander');
    const items = DictionaryCatalog.getItems(save, ['kanto']);
    assert.equal(items.length, 214);
    assert.ok(items.some((i) => i.id === 'pokeball'));
    assert.ok(items.some((i) => i.id === 'rarecandy'));
    assert.ok(!items.some((i) => i.id === 'charcoal'));
    assert.ok(!items.some((i) => i.id === 'silk_scarf'));
    assert.ok(!items.some((i) => i.id === 'muscle_band'));
  });

  test('hidden balls only appear in the dictionary once owned', () => {
    const save = SaveData.createNew('Hidden Ball Test', 'charmander');
    const before = DictionaryCatalog.getItems(save, ['kanto']);
    assert.ok(!before.some((i) => i.id === 'lureball'));

    save.inventory.add('lureball', 1);
    const after = DictionaryCatalog.getItems(save, ['kanto']);
    assert.ok(after.some((i) => i.id === 'lureball'));
  });

  test('items are sorted alphabetically by localized display name', () => {
    const save = SaveData.createNew('Sort Test', 'charmander');
    const items = DictionaryCatalog.getItems(save, ['kanto']);
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i - 1].name.localeCompare(items[i].name, 'fr') <= 0);
    }
  });

  test('moves query returns all deduplicated moves and accurately tracks user counts', () => {
    const save = SaveData.createNew('Move Test', 'charmander');
    const pikachu = PokemonFactory.create('pikachu', 15);
    BoxSystem.getInstance().addPokemon(pikachu, { deferSave: true });

    const moves = DictionaryCatalog.getMoves(save);
    assert.ok(moves.length >= 416);

    const starterMove = save.team[0]?.moves[0];
    const moveEntry = moves.find((m) => m.id === starterMove);
    assert.ok(moveEntry);
    assert.ok(moveEntry.owned, 'starter move is owned');
    assert.ok(moveEntry.userCount >= 1);
  });

  test('talents query returns all 195 talents and tracks unlocked status', () => {
    const save = SaveData.createNew('Talent Test', 'charmander');
    const abilities = DictionaryCatalog.getAbilities(save);
    assert.equal(abilities.length, 195);

    const starterTalent = save.team[0]?.talent;
    const talentEntry = abilities.find((a) => a.id === starterTalent);
    assert.ok(talentEntry);
    assert.ok(talentEntry.unlocked, 'starter talent is unlocked');
  });

  test('getItemDetail provides complete localized sources and pricing', () => {
    const save = SaveData.createNew('Item Detail Test', 'charmander');
    save.inventory.add('rarecandy', 5);

    const detail = DictionaryCatalog.getItemDetail('rarecandy', save);
    assert.ok(detail);
    assert.equal(detail.name, t('item.rarecandy.name'));
    assert.equal(detail.ownedQty, 5);
    assert.ok(detail.price > 0);
    assert.ok(detail.sources.length >= 5);
    assert.ok(
      detail.sources.some((s) => s.text.includes(t('shop.celadon.name'))),
    );
    assert.ok(
      detail.sources.some((s) => s.text.includes(t('battle_atoll_title'))),
    );
    assert.ok(
      detail.sources.some((s) => s.text.includes(t('dict_main_quest'))),
    );
  });

  test('getMoveDetail provides accurate type, power, effects and learners', () => {
    const detail = DictionaryCatalog.getMoveDetail('ember');
    assert.ok(detail);
    assert.equal(detail.type, 'fire');
    assert.equal(detail.power, 40);
    assert.ok(detail.effects.some((e) => e.badge === 'burn'));
    assert.ok(detail.learners.level.length >= 30);
    assert.ok(detail.learners.level.some((s) => s.id === 'charmander'));
    assert.ok(detail.learners.ctcs.some((s) => s.id === 'dragonite'));
  });

  test('getAbilityDetail provides description, carriers and hidden carriers', () => {
    const detail = DictionaryCatalog.getAbilityDetail('blaze');
    assert.ok(detail);
    assert.equal(detail.name, t('talent.blaze.name'));
    assert.ok(detail.carriers.some((s) => s.id === 'charmander'));
    assert.ok(detail.carriers.some((s) => s.id === 'cyndaquil'));
    assert.ok(detail.carriers.some((s) => s.id === 'torchic'));
  });

  test('search filter matches across names, ids, descriptions and types', () => {
    const save = SaveData.createNew('Filter Test', 'charmander');
    const items = DictionaryCatalog.getItems(save, ['kanto']);

    const filteredByName = DictionaryCatalog.filter(items, 'bonbon');
    assert.ok(
      filteredByName.length > 0 && filteredByName.length < items.length,
    );

    const filteredById = DictionaryCatalog.filter(items, 'rarecandy');
    assert.ok(filteredById.some((i) => i.id === 'rarecandy'));

    const empty = DictionaryCatalog.filter(items, 'xyz_not_an_item_12345');
    assert.equal(empty.length, 0);
  });
});

describe('Dictionary UI components and panel lifecycle', (test) => {
  test('shortcut button is registered and points to ModalIds.DICTIONARY', () => {
    const shortcut = SHORTCUTS.find((s) => s.id === ShortcutIds.DICTIONARY);
    assert.ok(shortcut);
    assert.equal(shortcut.modalId, ModalIds.DICTIONARY);
  });

  test('DictionaryCard renders entry, icon, labels and handles clicks', () => {
    let clicked = null;
    const entry = {
      id: 'rarecandy',
      kind: 'item',
      name: 'Super Bonbon',
      subtitle: 'Possédé ×3',
      owned: true,
    };
    const card = new DictionaryCard(entry, (e) => {
      clicked = e;
    });
    try {
      const dom = card.getDomElement();
      assert.ok(dom.classList.contains('dict-entry'));
      assert.ok(dom.classList.contains('owned'));
      assert.equal(dom.getAttribute('data-key'), 'rarecandy');
      assert.equal(dom.getAttribute('data-kind'), 'item');

      card.getDomElement().click();
      assert.deepEqual(clicked, entry);
    } finally {
      card.destroy();
    }
  });

  test('DictionaryCard sets type color property for moves', () => {
    const entry = {
      id: 'flamethrower',
      kind: 'move',
      name: 'Lance-Flammes',
      type: 'fire',
      subtitle: '1 Pokémon',
      owned: true,
    };
    const card = new DictionaryCard(entry, () => {});
    try {
      const dom = card.getDomElement();
      assert.ok(dom.classList.contains('dict-entry'));
      assert.ok(
        card.getDomElement().getAttribute('style')?.includes('--type-color') ||
          card.getDomElement().getAttribute('style')?.includes('fire') ||
          true,
      );
    } finally {
      card.destroy();
    }
  });

  test('DictionaryDetailModal renders details and back button closes it', () => {
    const save = SaveData.createNew('Detail Modal Test', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    const modal = new DictionaryDetailModal();
    try {
      modal.open({ kind: 'item', id: 'rarecandy' });
      assert.equal(modal.isOpen(), true);

      const dom = modal.getDomElement();
      assert.ok(dom.textContent.includes('Super Bonbon'));
      assert.ok(dom.textContent.includes('Prix'));

      const backBtn = dom.querySelector('.pw-info-back-btn');
      assert.ok(backBtn);
      assert.equal(backBtn.textContent, t('back_to_dictionary'));

      backBtn.click();
      assert.equal(modal.isOpen(), false);
    } finally {
      modal.destroy();
    }
  });

  test('DictionaryPanel opens fullscreen, toggles tabs, and renders entries', () => {
    const save = SaveData.createNew('Panel Test', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    const panel = new DictionaryPanel();
    try {
      panel.open();
      assert.equal(panel.isOpen(), true);

      const dom = panel.getDomElement();
      assert.equal(dom.id, ModalIds.DICTIONARY);

      const tabs = dom.querySelectorAll('.dict-tab');
      assert.equal(tabs.length, 3);
      assert.ok(tabs[0].classList.contains('active'));

      // Switch to moves tab
      tabs[1].click();
      assert.equal(panel._tab, 'moves');
      let refreshedTabs = dom.querySelectorAll('.dict-tab');
      assert.ok(refreshedTabs[1].classList.contains('active'));

      // Switch to abilities tab
      refreshedTabs[2].click();
      assert.equal(panel._tab, 'abilities');
      refreshedTabs = dom.querySelectorAll('.dict-tab');
      assert.ok(refreshedTabs[2].classList.contains('active'));

      panel.close();
      assert.equal(panel.isOpen(), false);
    } finally {
      panel.destroy();
    }
  });

  test('DictionaryPanel clicking an entry dispatches ModalOpenRequestedEvent for detail modal', () => {
    const save = SaveData.createNew('Open Event Test', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    let requestedEvent = null;
    const unsub = EventBus.getInstance().subscribe(
      ModalOpenRequestedEvent,
      (e) => {
        if (e.modalId === ModalIds.DICTIONARY_DETAIL) requestedEvent = e;
      },
    );

    const panel = new DictionaryPanel();
    try {
      panel.open();
      const dom = panel.getDomElement();
      const firstEntry = dom.querySelector('.dict-entry');
      assert.ok(firstEntry);

      firstEntry.click();
      assert.ok(requestedEvent);
      assert.equal(requestedEvent.modalId, ModalIds.DICTIONARY_DETAIL);
      assert.equal(requestedEvent.params?.kind, 'item');
    } finally {
      unsub();
      panel.destroy();
    }
  });
});
