/** @file Market.test.js @brief Regional stock policy, atomic acquisition and stable shared purchase UI. */
import fs from 'node:fs';
import { describe, assert } from './TestRunner.js';
import { MarketRules } from '../src/config/MarketRules.js';
import { MarketCatalog } from '../src/systems/shop/MarketCatalog.js';
import { MarketPokemonFactory } from '../src/systems/shop/MarketPokemonFactory.js';
import { ShopSystem, PurchaseResults } from '../src/systems/ShopSystem.js';
import { ShopCatalog } from '../src/systems/shop/ShopCatalog.js';
import { ShopOfferKinds } from '../src/systems/shop/ShopOfferKinds.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { SpeciesOwnership } from '../src/systems/catch/SpeciesOwnership.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/core/Random.js';
import { TextFormatter } from '../src/core/TextFormatter.js';
import { MarketPurchaseCompletedEvent } from '../src/core/events/MarketPurchaseCompletedEvent.js';
import { CurrencyChangedEvent } from '../src/core/events/CurrencyChangedEvent.js';
import { PokemonCaughtEvent } from '../src/core/events/PokemonCaughtEvent.js';
import { SaveLoadedEvent } from '../src/core/events/SaveLoadedEvent.js';
import { MarketPanel } from '../src/panels/fullscreen/MarketPanel.js';
import { MoneyRow } from '../src/panels/components/MoneyRow.js';
import { ShopFooter } from '../src/panels/components/ShopFooter.js';
import { ModalIds } from '../src/config/ModalIds.js';
import {
  LocalizationManager,
  t,
} from '../src/localization/LocalizationManager.js';

const saves = SaveSystem.getInstance(),
  shops = ShopSystem.getInstance(),
  bus = EventBus.getInstance();
const clone = (value) => JSON.parse(JSON.stringify(value));
function fixture({ region = 'kanto', points = 50000, badge = true } = {}) {
  TrainingSystem.getInstance().onDestroy();
  if (BattleSystem.getInstance().isActive())
    BattleSystem.getInstance().endBattle(false);
  const save = saves.createNewSave('Market fixture', 'charmander');
  save.tutorial.enabled = false;
  save.player.region = region;
  if (badge) save.player.earnBadge('brock');
  save.currencies.add('questPoint', points - save.currencies.get('questPoint'));
  shops.setRandom(Random.sequence([0.81, 0.42, 0.73, 0.95, 0.58, 0.37, 0.64]));
  FeatureAccessSystem.getInstance().refresh('market-fixture', {
    force: true,
    persist: false,
  });
  return save;
}
function withWrites(action) {
  const original = saves.saveCurrent;
  let writes = 0;
  saves.saveCurrent = function (...args) {
    writes++;
    return original.apply(this, args);
  };
  try {
    return { result: action(), writes };
  } finally {
    saves.saveCurrent = original;
  }
}
function add(species, level = 10) {
  const pokemon = PokemonFactory.create(species, level);
  assert.ok(BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }));
  return pokemon;
}
function button(panel, text) {
  return [...panel.getDomElement().querySelectorAll('button')].find(
    (node) => node.textContent === text,
  );
}
function card(panel, id) {
  return [...panel.getDomElement().querySelectorAll('.pw-market-row')].find(
    (node) => node.dataset.speciesId === id,
  );
}

describe('Market regional rules and approved Johto policy', (test) => {
  test('all frozen stock, categories and exceptions resolve to known canonical species', () => {
    for (const table of [
      MarketRules.STOCK,
      MarketRules.CATEGORIES,
      MarketRules.BANNED,
    ])
      for (const list of Object.values(table)) {
        assert.ok(Object.isFrozen(list));
        assert.ok(list.every((id) => PokemonDB.getInstance().has(id)));
      }
    assert.ok(Object.isFrozen(MarketRules));
  });
  test('Kanto reproduces the nine current main offers and quest-point prices', () => {
    const save = fixture();
    assert.deepEqual(
      MarketCatalog.offers(save).map((o) => [o.dex, o.unitPrice, o.category]),
      [
        [1, 1000, 'starter'],
        [4, 1000, 'starter'],
        [7, 1000, 'starter'],
        [133, 2000, 'rare'],
        [137, 2000, 'rare'],
        [106, 2000, 'rare'],
        [107, 2000, 'rare'],
        [124, 2000, 'rare'],
        [131, 2000, 'rare'],
      ],
    );
  });
  test('the user-selected main filtering on existing Johto encounters leaves exactly six offers', () => {
    const save = fixture({ region: 'johto' });
    assert.deepEqual(
      MarketCatalog.offers(save).map((o) => [o.dex, o.unitPrice]),
      [
        [152, 3000],
        [155, 3000],
        [158, 3000],
        [196, 6000],
        [197, 6000],
        [199, 6000],
      ],
    );
  });
  test('Hoenn retains its four native offers, including the Castform wild exception', () => {
    const save = fixture({ region: 'hoenn' });
    assert.deepEqual(
      MarketCatalog.offers(save).map((o) => [o.dex, o.unitPrice]),
      [
        [252, 6000],
        [255, 6000],
        [258, 6000],
        [351, 12000],
      ],
    );
  });
  test('a caught or already owned species stays purchasable, but ordinary wild species never join the shelf', () => {
    const save = fixture();
    save.pokedex.markCaught('bulbasaur', true, { deferSave: true });
    assert.ok(MarketCatalog.offers(save).some((o) => o.key === 'bulbasaur'));
    assert.ok(!MarketCatalog.offers(save).some((o) => o.key === 'pidgey'));
    assert.equal(
      MarketCatalog.offers(save).find((o) => o.key === 'bulbasaur').owned,
      false,
    );
  });
  test('categories follow main ordering and no legendary is invented from a price override', () => {
    assert.equal(MarketCatalog.category('kabuto'), 'fossil');
    assert.equal(MarketCatalog.category('eevee'), 'rare');
    assert.equal(MarketCatalog.category('chikorita'), 'starter');
    assert.equal(MarketCatalog.category('espeon'), 'other');
    const save = fixture();
    for (const region of ['kanto', 'johto', 'hoenn']) {
      save.player.region = region;
      assert.ok(
        !MarketCatalog.offers(save).some((o) =>
          ['mew', 'mewtwo', 'jirachi', 'deoxys', 'beldum'].includes(o.key),
        ),
      );
    }
  });
  test('the central access resolver preserves the first-badge or Johto gate without adding a saved flag', () => {
    const save = fixture({ badge: false });
    assert.equal(FeatureAccessSystem.getInstance().isMarketUnlocked(), false);
    save.player.region = 'johto';
    assert.equal(FeatureAccessSystem.getInstance().isMarketUnlocked(), true);
    save.player.region = 'hoenn';
    assert.equal(FeatureAccessSystem.getInstance().isMarketUnlocked(), false);
    save.player.earnBadge('brock');
    assert.equal(FeatureAccessSystem.getInstance().isMarketUnlocked(), true);
    assert.equal(Object.hasOwn(save.access.serialize(), 'market'), false);
  });
  test('catalog reads neither mutate state nor draw randomness', () => {
    const save = fixture(),
      before = JSON.stringify(save.serialize());
    MarketCatalog.offers(save);
    MarketCatalog.offers(save);
    assert.equal(JSON.stringify(save.serialize()), before);
    assert.equal(MarketCatalog.price('not_a_species'), 0);
    assert.deepEqual(MarketCatalog.offers(null), []);
  });
});

describe('Canonical market transactions', (test) => {
  test('locked commands are rejected without payment, ownership or persistence', () => {
    const save = fixture({ badge: false }),
      before = JSON.stringify(save.serialize());
    const x = withWrites(() => shops.buyMarket('bulbasaur', 1));
    assert.equal(x.result, PurchaseResults.LOCKED);
    assert.equal(x.writes, 0);
    assert.equal(JSON.stringify(save.serialize()), before);
  });
  test('a first purchase joins a free party slot through the canonical collection and costs only quest points', () => {
    const save = fixture(),
      inventory = clone(save.inventory.serialize()),
      money = save.currencies.get('money');
    assert.equal(shops.buyMarket('bulbasaur', 1), PurchaseResults.OK);
    const pokemon = save.collection
      .getAll()
      .find((p) => p.species === 'bulbasaur');
    assert.ok(pokemon);
    assert.equal(save.team.at(-1), pokemon);
    assert.equal(save.collection.get(pokemon.uid), pokemon);
    assert.equal(save.currencies.get('questPoint'), 49000);
    assert.equal(save.currencies.get('money'), money);
    assert.deepEqual(save.inventory.serialize(), inventory);
    assert.equal(pokemon.level, 1);
    assert.equal(pokemon.ivs.hp, 0);
    assert.equal(pokemon.evs.atk, 0);
    assert.ok(save.pokedex.isCaught('bulbasaur'));
    assert.ok(save.talents.has('bulbasaur', pokemon.talent));
  });
  test('buying an already owned species creates a distinct PC Pokémon, never an IV duplicate reward', () => {
    const save = fixture(),
      original = save.team[0],
      before = clone(original.serialize()),
      team = [...save.teamMembers.getUids()];
    assert.equal(shops.buyMarket('charmander', 2), PurchaseResults.OK);
    assert.equal(
      save.collection.getAll().filter((p) => p.species === 'charmander').length,
      3,
    );
    assert.deepEqual(save.teamMembers.getUids(), team);
    assert.deepEqual(original.serialize(), before);
  });
  test('a full party receives every bought Pokémon in the PC without moving existing references', () => {
    const save = fixture();
    for (const id of ['pidgey', 'rattata', 'pikachu', 'magikarp', 'geodude'])
      TeamSystem.getInstance().addPokemon(PokemonFactory.create(id, 5), {
        deferSave: true,
      });
    const team = [...save.teamMembers.getUids()];
    assert.equal(save.team.length, 6);
    assert.equal(shops.buyMarket('squirtle', 2), PurchaseResults.OK);
    assert.deepEqual(save.teamMembers.getUids(), team);
    assert.equal(
      save.collection.getAll().filter((p) => p.species === 'squirtle').length,
      2,
    );
  });
  test('bulk acquisition is collision-safe even with a constant injected random sequence', () => {
    const save = fixture();
    shops.setRandom(Random.sequence([0.9]));
    assert.equal(shops.buyMarket('squirtle', 4), PurchaseResults.OK);
    const entries = save.collection
      .getAll()
      .filter((p) => p.species === 'squirtle');
    assert.equal(entries.length, 4);
    assert.equal(new Set(entries.map((p) => p.uid)).size, 4);
    assert.equal(save.team.filter((p) => p.species === 'squirtle').length, 1);
    assert.equal(save.currencies.get('questPoint'), 46000);
  });
  test('quantity clamps to the affordable whole amount and never partially debits a failed unit', () => {
    const save = fixture({ points: 3500 });
    assert.equal(shops.buyMarket('bulbasaur', 100), PurchaseResults.OK);
    assert.equal(
      save.collection.getAll().filter((p) => p.species === 'bulbasaur').length,
      3,
    );
    assert.equal(save.currencies.get('questPoint'), 500);
  });
  test('nonfinite and fractional quantities cannot create nonfinite amounts or an endless batch', () => {
    const save = fixture();
    assert.equal(shops.buyMarket('squirtle', NaN), PurchaseResults.OK);
    assert.equal(shops.buyMarket('squirtle', 2.9), PurchaseResults.OK);
    assert.equal(shops.buyMarket('squirtle', Infinity), PurchaseResults.OK);
    assert.equal(
      save.collection.getAll().filter((p) => p.species === 'squirtle').length,
      4,
    );
  });
  test('insufficient funds leave every saved field unchanged and perform no write', () => {
    const save = fixture({ points: 999 }),
      before = JSON.stringify(save.serialize());
    const x = withWrites(() => shops.buyMarket('bulbasaur', 1));
    assert.equal(x.result, PurchaseResults.NOT_ENOUGH);
    assert.equal(x.writes, 0);
    assert.equal(JSON.stringify(save.serialize()), before);
  });
  test('foreign-region, unlisted and invented species never evade the live catalog', () => {
    const save = fixture(),
      before = JSON.stringify(save.serialize());
    for (const id of ['totodile', 'pidgey', 'mew', 'invented'])
      assert.equal(shops.buyMarket(id, 1), PurchaseResults.UNKNOWN_OFFER);
    assert.equal(JSON.stringify(save.serialize()), before);
  });
  test('wallet observers see the whole batch, with reentrant purchases refused', () => {
    const save = fixture(),
      seen = [];
    let nested;
    const off = bus.subscribe(CurrencyChangedEvent, (event) => {
      if (event.currencyKey === 'questPoint') {
        seen.push(
          save.collection.getAll().filter((p) => p.species === 'squirtle')
            .length,
        );
        nested = shops.buyMarket('squirtle', 1);
      }
    });
    try {
      assert.equal(shops.buyMarket('squirtle', 3), PurchaseResults.OK);
    } finally {
      off();
    }
    assert.deepEqual(seen, [3]);
    assert.equal(nested, PurchaseResults.LOCKED);
    assert.equal(save.currencies.get('questPoint'), 47000);
  });
  test('a successful batch saves once and emits one typed completion with no wild capture event', () => {
    const save = fixture(),
      events = [],
      captures = [];
    const a = bus.subscribe(MarketPurchaseCompletedEvent, (event) =>
      events.push(event),
    );
    const b = bus.subscribe(PokemonCaughtEvent, (event) =>
      captures.push(event),
    );
    const stats = clone(save.statistics.serialize()),
      hatchery = clone(save.hatchery.serialize());
    let x;
    try {
      x = withWrites(() => shops.buyMarket('bulbasaur', 3));
    } finally {
      a();
      b();
    }
    assert.equal(x.result, PurchaseResults.OK);
    assert.equal(x.writes, 1);
    assert.equal(events.length, 1);
    assert.equal(events[0].quantity, 3);
    assert.equal(events[0].total, 3000);
    assert.equal(events[0].deferSave, true);
    assert.equal(captures.length, 0);
    assert.deepEqual(save.statistics.serialize(), stats);
    assert.deepEqual(save.hatchery.serialize(), hatchery);
  });
  test('a genuine shiny roll unlocks the species consistently for old and newly purchased copies', () => {
    const save = fixture();
    const old = add('bulbasaur');
    shops.setRandom(Random.sequence([0]));
    assert.equal(shops.buyMarket('bulbasaur', 2), PurchaseResults.OK);
    assert.ok(
      save.collection
        .getAll()
        .filter((p) => p.species === 'bulbasaur')
        .every((p) => p.shiny),
    );
    assert.ok(SpeciesOwnership.isShinyUnlocked(save, 'bulbasaur'));
    assert.ok(old.shiny);
  });
  test('a previously unlocked shiny is inherited without inventing another shiny roll or catch credit', () => {
    const save = fixture();
    save.pokedex.markCaught('bulbasaur', true, { deferSave: true });
    shops.setRandom(Random.sequence([0.99]));
    shops.buyMarket('bulbasaur', 1);
    assert.ok(
      save.collection.getAll().find((p) => p.species === 'bulbasaur').shiny,
    );
    assert.equal(save.statistics.caughtTotal, 0);
  });
  test('the batch factory refuses an unknown species before changing the loaded save', () => {
    const save = fixture(),
      before = JSON.stringify(save.serialize());
    assert.equal(
      MarketPokemonFactory.createBatch(
        save,
        'invented',
        2,
        Random.sequence([0.8]),
      ),
      null,
    );
    assert.equal(JSON.stringify(save.serialize()), before);
  });
  test('a same-species shiny purchase preserves and reloads an in-flight training DTO without losing the unlock', () => {
    const save = fixture();
    save.access.unlockFeature('training');
    for (const id of ['surge', 'blaine']) save.player.earnBadge(id);
    const trainee = add('bulbasaur', 10),
      training = TrainingSystem.getInstance();
    training.setRandom(Random.sequence([0.314159]));
    training.init();
    assert.equal(
      training.startSession(trainee.uid, 'level', 0).result,
      'ready',
    );
    training.update(0.37);
    saves.saveCurrent();
    const before = clone(save.training.serialize());
    shops.setRandom(Random.sequence([0]));
    assert.equal(shops.buyMarket('bulbasaur', 1), PurchaseResults.OK);
    assert.deepEqual(save.training.serialize(), before);
    assert.ok(trainee.shiny);
    const raw = save.serialize();
    training.onDestroy();
    const copy = new SaveData();
    copy.deserialize(raw);
    saves.setCurrentSave(copy);
    bus.dispatch(new SaveLoadedEvent(copy.id, copy));
    training.init();
    assert.ok(training.isActive());
    assert.deepEqual(copy.training.serialize(), before);
    assert.ok(copy.collection.get(trainee.uid).shiny);
    training.onDestroy();
  });
  test('market acquisitions round-trip in the existing schema with one owner per UID', () => {
    const save = fixture();
    shops.buyMarket('bulbasaur', 3);
    const raw = save.serialize(),
      copy = new SaveData();
    copy.deserialize(raw);
    assert.equal(raw.version, SaveSchema.VERSION);
    assert.equal(copy.collection.size, save.collection.size);
    assert.deepEqual(copy.teamMembers.getUids(), save.teamMembers.getUids());
    for (const pokemon of copy.team)
      assert.equal(copy.collection.get(pokemon.uid), pokemon);
    assert.equal(copy.currencies.get('questPoint'), 47000);
  });
  test('purchasing while training is active preserves the exact saved battle, assignment and RNG state', () => {
    const save = fixture();
    save.access.unlockFeature('training');
    for (const id of [
      'misty',
      'surge',
      'erika',
      'koga',
      'sabrina',
      'blaine',
      'giovanni',
    ])
      save.player.earnBadge(id);
    save.statistics.recordLeague('kanto');
    const trainee = add('pidgey', 10),
      training = TrainingSystem.getInstance();
    training.setRandom(Random.sequence([0.314159]));
    training.init();
    assert.equal(
      training.startSession(trainee.uid, 'level', 0).result,
      'ready',
    );
    training.update(0.37);
    saves.saveCurrent();
    const before = JSON.stringify(save.training.serialize());
    shops.buyMarket('bulbasaur', 2);
    assert.equal(JSON.stringify(save.training.serialize()), before);
    assert.equal(save.training.slots[0].pokemonUid, trainee.uid);
    assert.ok(training.isActive());
    training.onDestroy();
  });
});

describe('Native market view and shared purchase widgets', (test) => {
  test('all stylesheet imports precede qualified rules so the market skin is actually loaded', () => {
    const css = fs
      .readFileSync(new URL('../assets/css/style.css', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(css.includes('@import url("./market.css")'));
    assert.ok(css.lastIndexOf('@import') < css.indexOf('{'));
  });
  test('training uses a container-bounded track and container reflow rather than clipping its slots', () => {
    const css = fs.readFileSync(
      new URL('../assets/css/facilities.css', import.meta.url),
      'utf8',
    );
    assert.ok(css.includes('minmax(min(280px, 100%), 1fr)'));
    assert.ok(css.includes('@container pw-training-slot'));
    assert.ok(css.includes('overflow-wrap: anywhere'));
  });
  test('market fullscreen opens with only the quest-point wallet and no purchase bar until selection', () => {
    fixture();
    const panel = new MarketPanel();
    try {
      panel.open();
      assert.equal(panel.getDomElement().id, ModalIds.MARKET);
      assert.equal(panel._wallet._currency, 'questPoint');
      assert.equal(panel._footer.isVisible(), false);
      assert.equal(
        panel.getDomElement().querySelectorAll('.pw-market-row').length,
        9,
      );
    } finally {
      panel.destroy();
    }
  });
  test('selecting a native card does not buy or save and reuses the shop quantity/footer component', () => {
    const save = fixture(),
      panel = new MarketPanel();
    try {
      panel.open();
      const x = withWrites(() => card(panel, 'bulbasaur').click());
      assert.equal(x.writes, 0);
      assert.equal(save.currencies.get('questPoint'), 50000);
      assert.ok(panel._footer instanceof ShopFooter);
      assert.equal(panel._quantity, 1);
      assert.equal(panel._footer.isVisible(), true);
      assert.ok(card(panel, 'bulbasaur').classList.contains('selected'));
    } finally {
      panel.destroy();
    }
  });
  test('typing, increment, reset and Max use the same footer nodes and affordable quantity rules', () => {
    fixture({ points: 15000 });
    const panel = new MarketPanel();
    try {
      panel.open();
      card(panel, 'bulbasaur').click();
      const input = panel._footer._input.getDomElement();
      panel._setQuantity(4);
      assert.equal(panel._quantity, 4);
      button(panel, t('shop_add_qty', { n: 10 })).click();
      assert.equal(panel._quantity, 14);
      button(panel, t('shop_add_qty', { n: 100 })).click();
      assert.equal(panel._quantity, 15);
      button(panel, t('shop_reset')).click();
      assert.equal(panel._quantity, 1);
      button(panel, t('shop_max')).click();
      assert.equal(panel._quantity, 15);
      assert.equal(panel._footer._input.getDomElement(), input);
    } finally {
      panel.destroy();
    }
  });
  test('a zero wallet never removes the visible species quote or silently purchases a Pokémon', () => {
    const save = fixture({ points: 0 }),
      panel = new MarketPanel();
    try {
      panel.open();
      card(panel, 'bulbasaur').click();
      assert.ok(card(panel, 'bulbasaur').textContent.includes('1K'));
      assert.equal(panel._quantity, 1);
      button(panel, t('buy_btn')).click();
      assert.equal(save.collection.size, 1);
      assert.equal(save.currencies.get('questPoint'), 0);
    } finally {
      panel.destroy();
    }
  });
  test('wallet and ownership refreshes retain the selected card, decoded sprite and quantity field', () => {
    const save = fixture(),
      panel = new MarketPanel();
    try {
      panel.open();
      card(panel, 'bulbasaur').click();
      const node = card(panel, 'bulbasaur'),
        sprite = node.querySelector('.pw-poke-circle-img'),
        input = panel._footer._input.getDomElement();
      save.currencies.add('questPoint', 1000);
      save.pokedex.markSeen('bulbasaur', { deferSave: true });
      assert.equal(card(panel, 'bulbasaur'), node);
      assert.equal(node.querySelector('.pw-poke-circle-img'), sprite);
      assert.equal(panel._footer._input.getDomElement(), input);
      assert.ok(node.textContent.includes(t('pokemon.bulbasaur')));
    } finally {
      panel.destroy();
    }
  });
  test('save and region changes reset stale selections and never transfer a pending purchase', () => {
    fixture();
    const panel = new MarketPanel();
    try {
      panel.open();
      card(panel, 'bulbasaur').click();
      panel._setQuantity(8);
      const other = fixture({ region: 'johto' });
      bus.dispatch(new SaveLoadedEvent(other.id, other));
      assert.equal(panel._selected, null);
      assert.equal(panel._quantity, 1);
      assert.equal(panel._footer.isVisible(), false);
      assert.equal(
        panel.getDomElement().querySelectorAll('.pw-market-row').length,
        6,
      );
    } finally {
      panel.destroy();
    }
  });
  test('FR/EN live labels and actions update without reconstructing their cards', () => {
    fixture();
    const locale = LocalizationManager.getInstance(),
      before = locale.currentLang,
      panel = new MarketPanel();
    try {
      panel.open();
      card(panel, 'bulbasaur').click();
      const node = card(panel, 'bulbasaur');
      locale.setLanguage(before === 'fr' ? 'en' : 'fr');
      assert.equal(card(panel, 'bulbasaur'), node);
      assert.ok(button(panel, t('buy_btn')));
      assert.equal(
        panel._footer._input.getDomElement().getAttribute('aria-label'),
        t('market_quantity_label'),
      );
    } finally {
      locale.setLanguage(before);
      panel.destroy();
    }
  });
  test('compact market amounts retain exact tooltips and money rows retain their existing full-number default', () => {
    assert.equal(TextFormatter.formatCompactNumber(1250), '1.2K');
    assert.equal(TextFormatter.formatCompactNumber(12500), '12K');
    assert.equal(TextFormatter.formatCompactNumber(999999), '999K');
    const row = new MoneyRow(12500);
    try {
      assert.ok(
        row
          .getDomElement()
          .textContent.includes(TextFormatter.formatNumber(12500)),
      );
    } finally {
      row.destroy();
    }
  });
});
