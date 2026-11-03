/**
 * @file Release1169.test.js
 * @brief 1.16.9 — the save card shows an OWNED POKÉMON chosen from the PC box, never an NPC portrait.
 *
 * Reported: "in the settings and on the save cards, it must be like in the main game: a Pokémon
 * chosen from the PC box, not an NPC image — please put a Pokémon back on the save cards."
 *
 * The card used to show the team lead, unless the player had picked an NPC portrait in the settings
 * (that choice won). The portrait is now always an owned Pokémon (`player.avatarPokemonUid`), chosen
 * in a dedicated picker that lists the whole collection, and the NPC portrait selector is gone.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { installFakeDom } from './FakeDom.js';
import { SaveCard } from '../src/ui/SaveCard.js';
import { PlayerData } from '../src/data/save/PlayerData.js';
import { MigrationV20ToV21 } from '../src/data/save/migrations/MigrationV20ToV21.js';
import { SaveMigrator } from '../src/data/save/migrations/SaveMigrator.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { SaveIconPickerModal } from '../src/panels/SaveIconPickerModal.js';
import { CapturedPokemonList } from '../src/panels/components/CapturedPokemonList.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { AfkSummaryModal } from '../src/panels/AfkSummaryModal.js';
import { UIContainer } from '../src/ui/UIContainer.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const readSource = (relative) => fs.readFileSync(PROJECT_ROOT + relative, 'utf8');

/** A raw schema-20 save: the collection is a flat array, the team an array of uids. */
function rawSave20() {
  return {
    version: 20,
    player: { trainerName: 'Red', trainerSprite: 'Youngster' },
    collection: [{ uid: 'p_a', species: 'charmander', level: 12 }, { uid: 'p_b', species: 'bulbasaur', level: 8 }],
    team: ['p_b', 'p_a']
  };
}

/** A minimal in-memory collection with the API the card relies on. */
function collectionOf(entries) {
  return {
    get: (uid) => entries.find((entry) => entry.uid === uid) || null,
    getAll: () => entries
  };
}

describe('1.16.9 — the save card shows a Pokémon, chosen from the PC box', (test) => {
  installFakeDom();
  LocalizationManager.getInstance().setLanguage('fr');

  test('the schema knows the new field and its migration', () => {
    assert.equal(SaveSchema.VERSION, 21);
    const chain = SaveMigrator.getMigrations();
    assert.equal(chain.length, SaveSchema.VERSION, 'one migration per version step');
    assert.equal(chain.at(-1).from, 20);
    assert.equal(chain.at(-1).to, 21);
    return 'schema 21';
  });

  test('an existing save keeps the Pokémon it displays today, and the migration is pure', () => {
    const raw = rawSave20();
    const before = JSON.stringify(raw);
    const migrated = MigrationV20ToV21.migrate(raw);
    assert.equal(JSON.stringify(raw), before, 'the raw save is never mutated');
    assert.equal(migrated.version, 21);
    assert.equal(migrated.player.avatarPokemonUid, 'p_b', 'the lead team member is inherited');
    assert.equal(migrated.player.trainerSprite, 'Youngster', 'the map appearance is untouched');
    assert.deepEqual(migrated.collection, raw.collection);
    return 'lead inherited';
  });

  test('the migration keeps a valid choice, drops an unknown uid and falls back gracefully', () => {
    const kept = MigrationV20ToV21.migrate({ ...rawSave20(), player: { avatarPokemonUid: 'p_a' } });
    assert.equal(kept.player.avatarPokemonUid, 'p_a');

    const stale = MigrationV20ToV21.migrate({ ...rawSave20(), player: { avatarPokemonUid: 'p_gone' } });
    assert.equal(stale.player.avatarPokemonUid, 'p_b', 'an unknown uid falls back to the lead');

    const noTeam = MigrationV20ToV21.migrate({ version: 20, player: {}, collection: rawSave20().collection, team: [] });
    assert.equal(noTeam.player.avatarPokemonUid, 'p_a', 'no party: the first owned Pokémon');

    const nothing = MigrationV20ToV21.migrate({ version: 20, player: {}, collection: [], team: [] });
    assert.equal(nothing.player.avatarPokemonUid, '', 'no owned Pokémon: empty, resolved at render time');

    const broken = MigrationV20ToV21.migrate(null);
    assert.equal(broken.version, 21, 'malformed input still yields a valid shape');
    return 'fallbacks';
  });

  test('the player model round-trips the portrait uid and rejects anything else', () => {
    const player = new PlayerData({ trainerName: 'Red', avatarPokemonUid: 'p_a' });
    assert.equal(player.serialize().avatarPokemonUid, 'p_a');
    assert.equal(new PlayerData({ avatarPokemonUid: 42 }).avatarPokemonUid, '', 'a non-string is ignored');
    assert.equal(new PlayerData().avatarPokemonUid, '', 'a new profile has no choice yet');
    return 'round trip';
  });

  test('the resolution order is chosen, then lead, then first owned, then nothing', () => {
    const lead = { uid: 'p_a', species: 'charmander' };
    const boxed = { uid: 'p_b', species: 'bulbasaur' };
    const all = collectionOf([lead, boxed]);
    assert.equal(SaveCard.resolveAvatarPokemon({ player: { avatarPokemonUid: 'p_b' }, team: [lead], collection: all }).species, 'bulbasaur');
    assert.equal(SaveCard.resolveAvatarPokemon({ player: { avatarPokemonUid: 'p_gone' }, team: [lead], collection: all }).species, 'charmander');
    assert.equal(SaveCard.resolveAvatarPokemon({ player: {}, team: [], collection: all }).species, 'charmander');
    assert.equal(SaveCard.resolveAvatarPokemon({ player: {}, team: [], collection: collectionOf([]) }), null);
    return 'ordering';
  });

  test('the card draws the Pokémon on the canonical disc, never an NPC image', () => {
    const save = {
      id: 'PW-TEST',
      background: 'classic',
      player: { trainerName: 'Red', trainerSprite: 'Youngster', avatarPokemonUid: 'p_b', badges: [], playTimeSeconds: 0 },
      team: [],
      collection: collectionOf([{ uid: 'p_b', species: 'bulbasaur', level: 8, getDisplayName: () => 'Bulbizarre' }])
    };
    const card = new SaveCard({ save, mode: 'preview' });
    const root = card.getDomElement();
    const icon = root.querySelector('.save-slot-icon');
    assert.ok(icon, 'the card has an icon');
    assert.ok(icon.querySelector('.pw-poke-circle-wrap'), 'the Pokémon uses the canonical disc');
    const image = icon.querySelector('img');
    assert.ok(image.getAttribute('src').includes('/pokemon/bulbasaur'), `the art is the chosen Pokémon: ${image?.getAttribute('src')}`);
    const sources = [...root.querySelectorAll('img')].map((node) => String(node.getAttribute('src') || ''));
    assert.ok(sources.every((src) => !src.includes('images/trainers/')), `no trainer/NPC portrait is drawn (${sources.join(', ')})`);
    assert.equal(root.querySelectorAll('.save-slot-icon-missing-mark').length, 0);
    return image.getAttribute('src');
  });

  test('a save with no owned Pokémon shows the explicit placeholder', () => {
    const card = new SaveCard({
      save: { id: 'PW-EMPTYY', background: 'classic', player: { trainerName: 'Red', trainerSprite: 'Youngster' }, team: [], collection: collectionOf([]) },
      mode: 'preview'
    });
    const root = card.getDomElement();
    assert.equal(root.querySelectorAll('img').length, 0, 'no image at all');
    assert.equal(root.querySelectorAll('.save-slot-icon-missing-mark').length, 1, 'the "?" placeholder is displayed');
    return 'placeholder';
  });

  test('the settings offer a Pokémon picker and no NPC portrait list', () => {
    const section = readSource('/src/panels/settings/SaveProfileSection.js');
    assert.ok(!section.includes('TRAINER_AVATARS'), 'the NPC portrait list is not used any more');
    assert.ok(!section.includes('UIDropdown({\n      id: \'save-profile-avatar-select\''), 'the portrait dropdown is gone');
    assert.ok(section.includes('ModalIds.SAVE_ICON_PICKER'), 'the picker is opened by request');
    assert.ok(section.includes('avatarPokemonUid'), 'the draft carries the chosen Pokémon');
    assert.ok(section.includes('resolveAvatarPokemon'), 'the recap uses the same resolution as the card');
    assert.ok(!fs.existsSync(`${PROJECT_ROOT}/src/data/save/TrainerAvatars.js`), 'the dead portrait list is deleted');
    return 'settings';
  });

  test('the picker lists owned Pokémon and can be searched', () => {
    const source = readSource('/src/panels/SaveIconPickerModal.js');
    assert.equal(SaveIconPickerModal.name, 'SaveIconPickerModal');
    assert.ok(source.includes('collection.getAll()'), 'it lists the whole owned collection');
    assert.ok(source.includes('save-icon-picker-search'), 'it has a search field');
    assert.ok(source.includes('ariaPressed'), 'the current choice is exposed to assistive tech');
    assert.ok(ModalIds.SAVE_ICON_PICKER === 'pw-save-icon-picker');
    const picker = new SaveIconPickerModal();
    assert.equal(picker.getId(), ModalIds.SAVE_ICON_PICKER);
    return 'picker';
  });

  test('the two summaries share one captured-Pokémon list', () => {
    const captures = [
      { species: 'rattata', name: 'Rattata', shiny: false, duplicate: false, count: 1 },
      { species: 'pidgey', name: 'Roucool', shiny: true, duplicate: false, count: 1 },
      { species: 'rattata', name: 'Rattata', shiny: false, duplicate: true, count: 1 }
    ];
    const battle = new UIContainer({});
    new BattleSummaryModal()._renderCaptures(captures, battle);
    const afk = new AfkSummaryModal()._capturesSection(captures);
    assert.ok(afk instanceof CapturedPokemonList, 'the AFK report reuses the shared list');
    assert.equal(battle.getDomElement().innerHTML, afk.getDomElement().innerHTML,
      'both windows render the exact same captured-Pokémon markup');
    const rows = afk.getDomElement().querySelectorAll('.battle-summary-entry');
    assert.ok(rows.length >= 2, 'every capture group is displayed');
    return `${rows.length} rows, identical markup`;
  });

  test('an empty capture list keeps each window its own wording', () => {
    const battle = new UIContainer({});
    new BattleSummaryModal()._renderCaptures([], battle);
    const afk = new AfkSummaryModal()._capturesSection([]);
    assert.equal(battle.getDomElement().querySelectorAll('.battle-summary-entry').length, 0);
    assert.ok(battle.getDomElement().querySelector('.pw-empty-state'));
    assert.ok(afk.getDomElement().querySelector('.pw-empty-state'));
    return 'empty states';
  });

  test('the new labels exist in every language', () => {
    for (const key of ['save_icon_picker_title', 'save_icon_search_placeholder', 'save_icon_picker_count', 'save_icon_pick_pokemon_aria', 'save_profile_icon', 'save_profile_choose_icon']) {
      for (const lang of ['fr', 'en']) {
        LocalizationManager.getInstance().setLanguage(lang);
        assert.ok(t(key) !== key, `${key} is missing in ${lang}`);
      }
    }
    LocalizationManager.getInstance().setLanguage('fr');
    return 'labels';
  });
});
