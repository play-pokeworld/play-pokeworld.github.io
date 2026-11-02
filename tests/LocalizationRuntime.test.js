/**
 * @file LocalizationRuntime.test.js
 * @brief Language switch, live: every view already built must show the new language.
 *
 * The static rules check that the keys exist; this file checks the *behaviour* the player sees.
 * A view is built in French, the language is switched, and the whole rendered subtree is inspected:
 *   - no text may still contain a French-only value (a value that differs between FR and EN);
 *   - no text may display a raw translation key;
 *   - switching back to French must restore the French texts.
 * It covers the dashboard panels, a modal open on screen, and the battle texts produced *after*
 * the switch.
 */

import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { LocalizationManager } from '../src/localization/LocalizationManager.js';
import { LocalizedTextBinder } from '../src/ui/LocalizedTextBinder.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { addOwned } from './RosterFixtures.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { CurrenciesPanel } from '../src/panels/CurrenciesPanel.js';
import { PokeballsPanel } from '../src/panels/PokeballsPanel.js';
import { StoryPanel } from '../src/panels/StoryPanel.js';
import { MinePanel } from '../src/panels/MinePanel.js';
import { HatcheryPanel } from '../src/panels/HatcheryPanel.js';
import { TrainingCenterPanel } from '../src/panels/TrainingCenterPanel.js';
import { ActiveTeamPanel } from '../src/panels/ActiveTeamPanel.js';
import { BattlePanel } from '../src/panels/BattlePanel.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { SecretBasePanel } from '../src/panels/SecretBasePanel.js';
import { ShortcutsPanel } from '../src/panels/ShortcutsPanel.js';
import { HeaderPanel } from '../src/panels/HeaderPanel.js';
import { BagPanel } from '../src/panels/fullscreen/BagPanel.js';
import { PokemonInfoModal } from '../src/panels/PokemonInfoModal.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { DictionaryPanel } from '../src/panels/fullscreen/DictionaryPanel.js';
import { PokedexPanel } from '../src/panels/fullscreen/PokedexPanel.js';
import { AchievementsPanel } from '../src/panels/AchievementsPanel.js';
import { ShopPanel } from '../src/panels/fullscreen/ShopPanel.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { PokemonMoveLearningModal } from '../src/panels/PokemonMoveLearningModal.js';
import { NpcTalkModal } from '../src/panels/NpcTalkModal.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { MineSystem } from '../src/systems/MineSystem.js';
import { NotificationSystem } from '../src/systems/NotificationSystem.js';
import { NotificationCenterView } from '../src/ui/notifications/NotificationCenterView.js';
import { t } from '../src/localization/LocalizationManager.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';


const lm = LocalizationManager.getInstance();
const saves = SaveSystem.getInstance();
const tables = lm._tables;
const LEFT = DashboardColumns.LEFT;
const CENTER = DashboardColumns.CENTER;
const RIGHT = DashboardColumns.RIGHT;

/**
 * Values that exist in one language only: the reference used to detect a text left behind.
 * Single-word values are ignored (too generic: a name or a number would give false positives).
 * @param {string} lang
 * @returns {Array<{key: string, text: string}>}
 */
function exclusiveValues(lang) {
  const other = Object.keys(tables).find((code) => code !== lang);
  return Object.entries(tables[lang])
    .filter(([key, text]) => tables[other][key] !== undefined && tables[other][key] !== text
      && text.length >= 6 && text.trim().includes(' '))
    .map(([key, text]) => ({ key, text }));
}

/** Keys known by the tables: a displayed raw key means a missing translation path. */
const KNOWN_KEYS = new Set(Object.keys(tables.fr));

/**
 * Every text displayed by a subtree: text content plus the text-carrying attributes.
 * @param {HTMLElement} root
 * @returns {Array<{where: string, text: string}>}
 */
function collectTexts(root) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (node._text) out.push({ where: `${node.tagName}.${node.classList?.value || ''}`.slice(0, 60), text: node._text });
    for (const attribute of ['title', 'aria-label', 'alt', 'placeholder']) {
      const value = node.getAttribute?.(attribute);
      if (value) out.push({ where: `@${attribute}`, text: value });
    }
    for (const child of node.children || []) walk(child);
  };
  walk(root);
  return out;
}

/**
 * Asserts that no displayed text is left in a language that is not the active one.
 * @param {HTMLElement} root
 * @param {string} label
 */
function assertNoStaleText(root, label) {
  const foreign = Object.keys(tables).find((code) => code !== lm.currentLang);
  const excluded = exclusiveValues(foreign);
  const stale = [];
  for (const { where, text } of collectTexts(root)) {
    const hit = excluded.find(({ key, text: value }) => text.includes(value) && !String(tables[lm.currentLang][key]).includes(value));
    if (hit) stale.push(`${where}: "${text.slice(0, 70)}" still contains ${foreign.toUpperCase()} "${hit.text}" (${hit.key})`);
  }
  assert.empty(stale, `${label}: texts left in the previous language`);
}

/**
 * Asserts that no displayed text is a raw translation key.
 * @param {HTMLElement} root
 * @param {string} label
 */
function assertNoRawKey(root, label) {
  const raw = collectTexts(root)
    .map(({ where, text }) => ({ where, text: text.trim() }))
    .filter(({ text }) => text && KNOWN_KEYS.has(text))
    .map(({ where, text }) => `${where}: ${text}`);
  assert.empty(raw, `${label}: raw translation keys on screen`);
}

/** Builds a rich save: team, wallet, inventory and unlocked facilities. */
function prepareSave(name = 'Localization runtime') {
  const save = SaveData.createNew(name, 'charmander');
  addOwned(save, new PokemonData({ species: 'pidgey', level: 12 }), new PokemonData({ species: 'rattata', level: 9 }));
  for (const currency of ['money', 'diamond', 'questPoint', 'dungeonToken', 'battlePoint']) {
    save.currencies.add(currency, 5000);
  }
  save.inventory.add('pokeball', 25);
  save.inventory.add('superpotion', 5);
  save.inventory.add('rarecandy', 2);
  for (const feature of ['mine', 'hatchery', 'training', 'secret-base']) {
    if (typeof save.access?.unlockFeature === 'function') save.access.unlockFeature(feature);
  }
  saves.setCurrentSave(save);
  return save;
}

/**
 * Mounts a view on the document so that the language change reaches it like in the browser.
 * @param {import('../src/ui/UIElement.js').UIElement} view
 */
function mount(view) {
  document.body.appendChild(view.getDomElement());
  return view;
}

/** Runs one panel through FR → EN → FR and checks the three states. */
function checkView(create, label) {
  lm.setLanguage('fr');
  const view = mount(create());
  try {
    assertNoRawKey(view.getDomElement(), `${label} (FR)`);
    lm.setLanguage('en');
    assertNoStaleText(view.getDomElement(), `${label} (EN)`);
    assertNoRawKey(view.getDomElement(), `${label} (EN)`);
    lm.setLanguage('fr');
    assertNoStaleText(view.getDomElement(), `${label} (back to FR)`);
  } finally {
    view.destroy?.();
  }
}

describe('Localization runtime', (test) => {
  test('a language change refreshes every dashboard window already on screen', () => {
    prepareSave();
    const factories = [
      ['CurrenciesPanel', () => new CurrenciesPanel(RIGHT)],
      ['PokeballsPanel', () => new PokeballsPanel(RIGHT)],
      ['StoryPanel', () => new StoryPanel(LEFT)],
      ['MinePanel', () => new MinePanel(LEFT)],
      ['HatcheryPanel', () => new HatcheryPanel(LEFT)],
      ['TrainingCenterPanel', () => new TrainingCenterPanel(CENTER)],
      ['ActiveTeamPanel', () => new ActiveTeamPanel(CENTER)],
      ['BattlePanel', () => new BattlePanel(CENTER)],
      ['LocationPanel', () => new LocationPanel(CENTER)],
      ['SecretBasePanel', () => new SecretBasePanel(RIGHT)],
      ['ShortcutsPanel', () => new ShortcutsPanel(RIGHT)],
      ['HeaderPanel', () => new HeaderPanel()]
    ];
    for (const [label, create] of factories) checkView(create, label);
  });

  test('a modal opened before the switch refreshes in place', () => {
    prepareSave('Localization modals');
    lm.setLanguage('fr');
    const bag = mount(new BagPanel());
    bag.open({});
    try {
      assert.ok(collectTexts(bag.getDomElement()).length > 5, 'the bag renders its content');
      assertNoRawKey(bag.getDomElement(), 'BagPanel (FR)');
      lm.setLanguage('en');
      assertNoStaleText(bag.getDomElement(), 'BagPanel (EN)');
      assertNoRawKey(bag.getDomElement(), 'BagPanel (EN)');
      lm.setLanguage('fr');
      assertNoStaleText(bag.getDomElement(), 'BagPanel (back to FR)');
    } finally {
      bag.destroy?.();
    }
  });

  test('the sheets of a Pokémon, the PC box and the move learning window follow the switch', () => {
    const save = prepareSave('Localization sheets');
    QuestSystem.getInstance().init?.();
    const pokemon = save.team[0];
    lm.setLanguage('fr');
    const info = mount(new PokemonInfoModal());
    const box = mount(new BoxPanel());
    const learning = mount(new PokemonMoveLearningModal());
    try {
      info.open({ pokemonUid: pokemon.uid });
      assertNoRawKey(info.getDomElement(), 'PokemonInfoModal (FR)');
      lm.setLanguage('en');
      assertNoStaleText(info.getDomElement(), 'PokemonInfoModal (EN)');
      assertNoRawKey(info.getDomElement(), 'PokemonInfoModal (EN)');

      box.open({});
      lm.setLanguage('fr');
      assertNoStaleText(box.getDomElement(), 'BoxPanel (FR)');
      lm.setLanguage('en');
      assertNoStaleText(box.getDomElement(), 'BoxPanel (EN)');

      learning.open({ pokemonUid: pokemon.uid });
      lm.setLanguage('fr');
      assertNoStaleText(learning.getDomElement(), 'PokemonMoveLearningModal (FR)');
      lm.setLanguage('en');
      assertNoStaleText(learning.getDomElement(), 'PokemonMoveLearningModal (EN)');
    } finally {
      info.destroy?.();
      box.destroy?.();
      learning.destroy?.();
    }
  });

  test('the Pokédex, the dictionary, the achievements, the shop and the battle summary follow the switch', () => {
    prepareSave('Localization fullscreens');
    QuestSystem.getInstance().init?.();
    // One full-screen screen at a time: opening one closes the previous one (as in the game).
    const view = (factory) => {
      const screen = factory();
      mount(screen);
      screen.open?.({});
      return screen;
    };
    const factories = [
      ['PokedexPanel', () => view(() => new PokedexPanel())],
      ['DictionaryPanel', () => view(() => new DictionaryPanel())],
      ['AchievementsPanel', () => view(() => new AchievementsPanel(DashboardColumns.RIGHT))],
      ['ShopPanel', () => view(() => new ShopPanel())],
      ['BattleSummaryModal', () => view(() => new BattleSummaryModal())]
    ];
    for (const [label, create] of factories) {
      try {
        checkView(create, label);
      } finally {
        // checkView destroys the mounted screen it created
      }
    }
  });

  test('a battle running while the language changes keeps its texts in the active language', () => {
    prepareSave('Localization live battle');
    QuestSystem.getInstance().init?.();
    lm.setLanguage('fr');
    const panel = mount(new BattlePanel(CENTER));
    try {
      assert.ok(BattleSystem.getInstance().startBattle('route1', { chain: false }), 'the battle starts');
      assertNoRawKey(panel.getDomElement(), 'BattlePanel (FR, running)');
      lm.setLanguage('en');
      assertNoStaleText(panel.getDomElement(), 'BattlePanel (EN, running)');
      assertNoRawKey(panel.getDomElement(), 'BattlePanel (EN, running)');
      lm.setLanguage('fr');
      assertNoStaleText(panel.getDomElement(), 'BattlePanel (FR, running)');
    } finally {
      BattleSystem.getInstance().endBattle?.();
      panel.destroy?.();
    }
  });

  test('active quests, the quest journal and their rewards follow the switch', () => {
    const save = prepareSave('Localization quests');
    QuestSystem.getInstance().init?.();
    save.quests.activate('main.2');
    save.quests.activate('side.s2');
    const activeQuests = QuestSystem.getInstance().getActiveQuests?.() || [];
    lm.setLanguage('fr');
    const panel = mount(new StoryPanel(LEFT));
    try {
      assert.ok(activeQuests.length >= 2, `active quests are displayed: ${activeQuests.length}`);
      assertNoRawKey(panel.getDomElement(), 'StoryPanel (FR, quests)');
      lm.setLanguage('en');
      assertNoStaleText(panel.getDomElement(), 'StoryPanel (EN, quests)');
      assertNoRawKey(panel.getDomElement(), 'StoryPanel (EN, quests)');
      lm.setLanguage('fr');
      assertNoStaleText(panel.getDomElement(), 'StoryPanel (FR, quests)');
    } finally {
      panel.destroy?.();
    }
    assert.ok(save, 'the save stays loaded');
  });

  test('the facilities showing a Pokémon (daycare, training, mine) follow the switch', () => {
    const save = prepareSave('Localization facilities');
    QuestSystem.getInstance().init?.();
    const stored = save.collection.getAll().find((pokemon) => !save.teamMembers.includes(pokemon.uid));
    assert.ok(stored, 'a stored Pokémon is available');
    HatcherySystem.getInstance().depositPokemon(stored.uid);
    TrainingSystem.getInstance().assignPokemon(0, stored.uid);
    MineSystem.getInstance().startMining?.();
    lm.setLanguage('fr');
    const panels = [
      ['HatcheryPanel', mount(new HatcheryPanel(LEFT))],
      ['TrainingCenterPanel', mount(new TrainingCenterPanel(CENTER))],
      ['MinePanel', mount(new MinePanel(LEFT))]
    ];
    try {
      for (const [label, panel] of panels) assertNoRawKey(panel.getDomElement(), `${label} (FR)`);
      lm.setLanguage('en');
      for (const [label, panel] of panels) {
        assertNoStaleText(panel.getDomElement(), `${label} (EN)`);
        assertNoRawKey(panel.getDomElement(), `${label} (EN)`);
      }
      lm.setLanguage('fr');
      for (const [label, panel] of panels) assertNoStaleText(panel.getDomElement(), `${label} (FR again)`);
    } finally {
      for (const [, panel] of panels) panel.destroy?.();
    }
  });

  test('notifications already displayed follow the switch, new ones use the new language', () => {
    prepareSave('Localization notifications');
    const center = mount(new NotificationCenterView());
    try {
      lm.setLanguage('fr');
      NotificationSystem.getInstance().notifyTemporary(t('sale_sold_money', { quantity: 1, item: t('item.rarecandy.name'), gain: 10 }));
      const frenchTexts = collectTexts(center.getDomElement()).map((entry) => entry.text).join('|');
      assert.ok(frenchTexts.includes('Vente'), `the notification is displayed in French: ${frenchTexts}`);

      lm.setLanguage('en');
      const englishTexts = collectTexts(center.getDomElement()).map((entry) => entry.text).join('|');
      assert.ok(!englishTexts.includes('Vente'), `the displayed notification followed the switch: ${englishTexts}`);
      assert.ok(englishTexts.includes('Sold'), `the displayed notification is now in English: ${englishTexts}`);

      NotificationSystem.getInstance().notifyTemporary(t('sale_sold_money', { quantity: 2, item: t('item.rarecandy.name'), gain: 20 }));
      const freshTexts = collectTexts(center.getDomElement()).map((entry) => entry.text).join('|');
      assert.ok(freshTexts.includes('Sold'), `a new notification uses the active language: ${freshTexts}`);
    } finally {
      center.destroy?.();
      lm.setLanguage('fr');
    }
  });

  test('an NPC dialogue opened before the switch follows it', () => {
    prepareSave('Localization npc');
    QuestSystem.getInstance().init?.();
    lm.setLanguage('fr');
    const modal = mount(new NpcTalkModal());
    try {
      modal.open({ locationId: 'pallet', npcId: 'kanto_pallet_npc_02' });
      lm.setLanguage('en');
      assertNoStaleText(modal.getDomElement(), 'NpcTalkModal (EN)');
    } finally {
      modal.destroy?.();
      lm.setLanguage('fr');
    }
  });

  test('refreshing the bound texts never creates a binding nor duplicates a text', () => {
    prepareSave('Localization binder');
    lm.setLanguage('fr');
    const panel = mount(new CurrenciesPanel(RIGHT));
    try {
      const count = LocalizedTextBinder.getBindingCount();
      assert.ok(count > 0, 'the panel binds its texts');
      const textBefore = panel.getDomElement().textContent;
      LocalizedTextBinder.refresh();
      LocalizedTextBinder.refresh();
      assert.equal(LocalizedTextBinder.getBindingCount(), count, 'a refresh adds no binding');
      assert.equal(panel.getDomElement().textContent, textBefore, 'a refresh duplicates no text');
    } finally {
      panel.destroy?.();
      lm.setLanguage('fr');
    }
  });
});
