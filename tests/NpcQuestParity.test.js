/**
 * @file NpcQuestParity.test.js
 * @brief Stable NPC identity, quest-offer coverage, and linked quest progression across regions.
 */
import { describe, assert } from './TestRunner.js';
import { L_en_npc } from '../src/localization/en/npc.js';
import { L_fr_npc } from '../src/localization/fr/npc.js';
import { NpcQuestDirectory } from '../src/data/quests/NpcQuestDirectory.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { QuestCategories } from '../src/data/quests/QuestCategories.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { NpcDirectory } from '../src/data/world/NpcDirectory.js';
import { NpcTalkedEvent } from '../src/core/events/NpcTalkedEvent.js';
import { EventBus } from '../src/core/EventBus.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { LocationActions } from '../src/panels/components/LocationActions.js';

describe('NPC quest parity', (test) => {
  test('all dialogue entries have matching stable FR/EN ids and all reference offers are linked', () => {
    const frEntries = Object.entries(L_fr_npc).flatMap(([locationId, entries]) =>
      entries.map((npc, index) => ({ locationId, index, id: npc.id }))
    );
    const enEntries = Object.entries(L_en_npc).flatMap(([locationId, entries]) =>
      entries.map((npc, index) => ({ locationId, index, id: npc.id }))
    );
    assert.equal(frEntries.length, 214);
    assert.equal(enEntries.length, frEntries.length);
    assert.equal(new Set(frEntries.map((entry) => entry.id)).size, frEntries.length);
    assert.deepEqual(enEntries.map((entry) => entry.id), frEntries.map((entry) => entry.id));
    assert.equal(NpcQuestDirectory.getIds().length, 210);

    const dialogueIds = new Set(frEntries.map((entry) => entry.id));
    const links = NpcQuestDirectory.getIds();
    let mainCount = 0;
    let sideCount = 0;
    let boardCount = 0;
    for (const npcId of links) {
      const link = NpcQuestDirectory.get(npcId);
      assert.ok(dialogueIds.has(npcId), `linked NPC ${npcId} exists in localized dialogue`);
      if (link.mainQuestKey) {
        mainCount++;
        assert.equal(QuestDB.getInstance().getById(link.mainQuestKey)?.category, QuestCategories.MAIN);
      }
      if (link.sideQuestKey) {
        sideCount++;
        assert.equal(QuestDB.getInstance().getById(link.sideQuestKey)?.category, QuestCategories.SIDE);
      }
      if (link.repeatableBoard) boardCount++;
    }
    assert.equal(mainCount, 44);
    assert.equal(sideCount, 147);
    assert.equal(boardCount, 24);
  });

  test('non-Kanto offers, board access, and multiple NPC links are discoverable', () => {
    const linkFor = (locationId, index) => {
      const npc = NpcDirectory.getByLocation(locationId)[index];
      assert.ok(npc, `NPC ${locationId}:${index} exists`);
      return NpcQuestDirectory.get(npc.id);
    };
    assert.equal(linkFor('newbark', 0)?.mainQuestKey, 'main.101');
    assert.equal(linkFor('sprouttower', 0)?.sideQuestKey, 'side.s94');
    assert.equal(linkFor('slateport', 2)?.sideQuestKey, 'side.s132');
    assert.equal(linkFor('jroute29', 0)?.repeatableBoard, true);
    assert.deepEqual(NpcQuestDirectory.getNpcIdsForQuest('main.113'), [
      NpcDirectory.getByLocation('ruinsofalph')[0].id,
      NpcDirectory.getByLocation('ruinsofalph')[2].id
    ]);
  });

  test('a linked legendary NPC advances to the next uncompleted chain offer', () => {
    const saveSystem = SaveSystem.getInstance();
    const previousSave = saveSystem.getCurrentSave();
    const save = SaveData.createNew('Quest chain audit', 'mudkip');
    save.player.region = 'hoenn';
    save.player.location = 'slateport';
    saveSystem.setCurrentSave(save);
    try {
      const npcId = NpcQuestDirectory.getNpcIdForQuest('side.leg_latias_1');
      assert.ok(npcId);
      let state = QuestSystem.getInstance().getNpcQuestState(npcId);
      assert.equal(state?.side?.quest.key, 'side.leg_latias_1');
      assert.equal(state?.side?.state, 'offer');

      save.quests.markCompleted('side.leg_latias_1');
      state = QuestSystem.getInstance().getNpcQuestState(npcId);
      assert.equal(state?.side?.quest.key, 'side.leg_latias_2');
      assert.equal(state?.side?.state, 'offer');
    } finally {
      saveSystem.setCurrentSave(previousSave);
    }
  });

  test('main quest offers and side quest progress use distinct NPC status badges', () => {
    const saveSystem = SaveSystem.getInstance();
    const previousSave = saveSystem.getCurrentSave();
    const quests = QuestSystem.getInstance();
    const johtoSave = SaveData.createNew('NPC status audit', 'chikorita');
    johtoSave.player.region = 'johto';
    johtoSave.player.location = 'newbark';
    saveSystem.setCurrentSave(johtoSave);
    quests.init();
    quests.syncMainQuest();

    try {
      const mainNpc = NpcDirectory.getByLocation('newbark').find((npc) =>
        NpcQuestDirectory.get(npc.id)?.mainQuestKey === 'main.101'
      );
      assert.ok(mainNpc, 'New Bark NPC offers the first Johto main quest');
      const mainState = quests.getNpcQuestState(mainNpc.id)?.main;
      assert.equal(mainState?.state, 'active');
      const mainTile = LocationActions._npcTile(LocationDB.getInstance().getById('newbark'), mainNpc).getDomElement();
      assert.equal(mainTile.getAttribute('data-quest-category'), 'main');
      assert.equal(mainTile.getAttribute('data-quest-state'), 'active');
      assert.equal(mainTile.getAttribute('data-quest-badge'), 'offer');
      assert.equal(mainTile.querySelector('.pw-loc-action-status')?.getAttribute('data-icon'), 'exclamation', 'mainTalk remains an offer marker while active');
      assert.ok(mainTile.classList.contains('pw-npc-quest-offer'));

      const kantoSave = SaveData.createNew('NPC side status audit', 'charmander');
      saveSystem.setCurrentSave(kantoSave);
      const sideNpc = NpcDirectory.getByLocation('pallet').find((npc) =>
        NpcQuestDirectory.get(npc.id)?.sideQuestKey === 'side.s1'
      );
      assert.ok(sideNpc, 'Pallet NPC offers the linked side quest');
      assert.ok(quests.accept('side.s1'), 'the side quest can be accepted through QuestSystem');
      const sideState = quests.getNpcQuestState(sideNpc.id)?.side;
      assert.equal(sideState?.state, 'active');
      const sideTile = LocationActions._npcTile(LocationDB.getInstance().getById('pallet'), sideNpc).getDomElement();
      assert.equal(sideTile.getAttribute('data-quest-category'), 'side');
      assert.equal(sideTile.getAttribute('data-quest-state'), 'active');
      assert.equal(sideTile.getAttribute('data-quest-badge'), 'active');
      assert.equal(sideTile.querySelector('.pw-loc-action-status')?.getAttribute('data-icon'), 'hourglass', 'an active side quest has its own progress marker');
      assert.ok(sideTile.classList.contains('pw-npc-quest-active'));
    } finally {
      saveSystem.setCurrentSave(previousSave);
    }
  });

  test('accepted talk side quests progress from another NPC in the required location', () => {
    const saveSystem = SaveSystem.getInstance();
    const previousSave = saveSystem.getCurrentSave();
    const save = SaveData.createNew('Talk quest audit', 'mudkip');
    save.player.region = 'hoenn';
    save.player.location = 'slateport';
    saveSystem.setCurrentSave(save);
    const quests = QuestSystem.getInstance();
    quests.init();
    try {
      const offerNpcId = NpcQuestDirectory.getNpcIdForQuest('side.s132');
      const otherNpc = NpcDirectory.getByLocation('slateport').find((npc) => npc.id !== offerNpcId);
      assert.ok(otherNpc);
      assert.ok(quests.accept('side.s132'));
      EventBus.getInstance().dispatch(new NpcTalkedEvent('slateport', otherNpc.id));
      assert.equal(save.quests.getProgress('side.s132'), 1);
      assert.equal(quests.getStatus('side.s132')?.complete, true);
    } finally {
      saveSystem.setCurrentSave(previousSave);
    }
  });

  test('active main talk quest counts any NPC in its target location, not only its offer NPC', () => {
    const saveSystem = SaveSystem.getInstance();
    const previousSave = saveSystem.getCurrentSave();
    const save = SaveData.createNew('Main talk location audit', 'charmander');
    save.player.region = 'kanto';
    save.player.location = 'pallet';
    saveSystem.setCurrentSave(save);
    const quests = QuestSystem.getInstance();
    quests.init();
    quests.syncMainQuest();
    try {
      const quest = QuestDB.getInstance().getMainChain('kanto')[0];
      assert.equal(quest.objective.type, 'talk');
      const offerNpcId = NpcQuestDirectory.getNpcIdForQuest(quest.key);
      const otherNpc = NpcDirectory.getByLocation('pallet').find((npc) => npc.id !== offerNpcId);
      assert.ok(otherNpc, 'Pallet has a second NPC who is not the quest offerer');
      assert.ok(save.quests.getActiveKeys().includes(quest.key));

      EventBus.getInstance().dispatch(new NpcTalkedEvent('viridian', otherNpc.id));
      assert.equal(save.quests.getProgress(quest.key), 0, 'a conversation outside the objective location does not count');
      EventBus.getInstance().dispatch(new NpcTalkedEvent('pallet', otherNpc.id));
      assert.equal(save.quests.getMainStep('kanto'), 1, 'a different NPC at Pallet advances the main quest chain');
    } finally {
      saveSystem.setCurrentSave(previousSave);
    }
  });
});
