/**
 * @file LocalQuestBattle.test.js
 * @brief Temporary NPC dialogue, local quest battle pool and no-auto-capture settlement.
 */
import { describe, assert } from './TestRunner.js';
import { Random } from '../src/core/Random.js';
import { EventBus } from '../src/core/EventBus.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { LocationActions } from '../src/panels/components/LocationActions.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { NpcTalkModal } from '../src/panels/NpcTalkModal.js';
import { LOCAL_QUEST_BATTLE_NPC_ID } from '../src/config/LocalQuestBattleRules.js';
import {
  LOCAL_QUEST_BATTLE_TOWN_POOLS,
  LOCAL_QUEST_BATTLE_FALLBACK_POOL
} from '../src/data/content/LocalQuestBattleContent.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { EncounterRules } from '../src/systems/battle/EncounterRules.js';
import { t } from '../src/localization/LocalizationManager.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { ModalToggledEvent } from '../src/core/events/ModalToggledEvent.js';
import { ModalNames } from '../src/config/ModalNames.js';

const saves = SaveSystem.getInstance();
const quests = QuestSystem.getInstance();
const battle = BattleSystem.getInstance();

function prepareAzaleaQuestSave(name) {
  const save = saves.createNewSave(name, 'charmander');
  save.player.region = 'johto';
  save.player.location = 'azalea';
  save.team[0].setLevel(100);
  save.quests.activate('side.s33');
  return save;
}

describe('Local quest battle', (test) => {
  test('only an active local KILL quest in a place without normal encounters enables the NPC', () => {
    const save = prepareAzaleaQuestSave('Local quest eligibility');
    quests.init();
    assert.equal(LocationDB.getInstance().getEncounters('azalea').length, 0);
    const state = quests.getLocalDefeatBattleState('azalea');
    assert.equal(state?.quest.key, 'side.s33');
    assert.equal(state?.progress, 0);
    assert.equal(state?.remaining, state?.count);
    assert.equal(quests.getLocalDefeatBattleState('route29'), null, 'ordinary encounter locations never get the NPC');
    save.quests.deactivate('side.s33');
    assert.equal(quests.getLocalDefeatBattleState('azalea'), null, 'inactive quests do not create an NPC');
    save.player.region = 'kanto';
    save.player.location = 'route2_south';
    save.quests.activate('side.s2');
    assert.equal(quests.getLocalDefeatBattleState('route2_south'), null,
      'a linked encounter group remains a normal wild area even if a sub-location is empty');
  });

  test('town and fallback pools preserve the original species and levels with valid stable ids', () => {
    const compact = Object.fromEntries(Object.entries(LOCAL_QUEST_BATTLE_TOWN_POOLS).map(([location, pool]) => [
      location,
      pool.map(({ species, minLevel, maxLevel }) => [species, minLevel, maxLevel])
    ]));
    assert.deepEqual(compact, {
      azalea: [['zubat', 16, 16], ['ekans', 16, 16], ['koffing', 18, 18], ['rattata', 17, 17]],
      goldenrod: [['rattata', 20, 20], ['raticate', 22, 22], ['zubat', 20, 20], ['koffing', 22, 22], ['grimer', 22, 22]],
      mahogany: [['raticate', 27, 27], ['zubat', 26, 26], ['grimer', 28, 28], ['koffing', 29, 29], ['weezing', 30, 30]],
      olivine: [['tentacool', 24, 24], ['krabby', 24, 24], ['machop', 26, 26], ['tentacruel', 26, 26]],
      cherrygrove: [['rattata', 6, 6], ['pidgey', 6, 6], ['sentret', 6, 6]],
      newbark: [['sentret', 4, 4], ['pidgey', 4, 4], ['rattata', 4, 4]],
      violet: [['pidgey', 10, 10], ['spearow', 10, 10], ['hoothoot', 10, 10]],
      ecruteak: [['gastly', 22, 22], ['haunter', 24, 24], ['koffing', 23, 23]],
      blackthorn: [['dratini', 32, 32], ['geodude', 32, 32], ['crobat', 34, 34]]
    });
    assert.deepEqual(LOCAL_QUEST_BATTLE_FALLBACK_POOL.map(({ species, minLevel, maxLevel }) =>
      [species, minLevel, maxLevel]
    ), [['rattata', 10, 10], ['zubat', 10, 10], ['ekans', 10, 10]]);
    assert.ok([...Object.values(LOCAL_QUEST_BATTLE_TOWN_POOLS), LOCAL_QUEST_BATTLE_FALLBACK_POOL]
      .flat().every((entry) => PokemonDB.getInstance().has(entry.species) && entry.minLevel > 0 && entry.maxLevel >= entry.minLevel));
  });

  test('a local quest battle is refused while an independent training session is active', () => {
    prepareAzaleaQuestSave('Local quest training guard');
    quests.init();
    battle.init();
    const training = TrainingSystem.getInstance();
    const previousSession = training._session;
    training._session = {};
    try {
      assert.ok(quests.requestLocalDefeatBattle('azalea', 'side.s33'));
      assert.equal(battle.isActive(), false);
    } finally {
      training._session = previousSession;
    }
  });

  test('an open battle summary blocks the local battle until it has closed', () => {
    prepareAzaleaQuestSave('Local quest summary guard');
    quests.init();
    battle.init();
    EventBus.getInstance().dispatch(new ModalToggledEvent(ModalNames.BATTLE_SUMMARY, true));
    try {
      assert.ok(quests.requestLocalDefeatBattle('azalea', 'side.s33'));
      assert.equal(battle.isActive(), false);
    } finally {
      EventBus.getInstance().dispatch(new ModalToggledEvent(ModalNames.BATTLE_SUMMARY, false));
    }
  });

  test('the hand-authored town pool draws its fixed levels without a shiny roll', () => {
    const drawn = EncounterRules.drawQuestBattle(
      LOCAL_QUEST_BATTLE_TOWN_POOLS.azalea,
      Random.sequence([0, 0.5, 0.5, 0.5, 0.5])
    );
    assert.equal(drawn.pokemon.species, 'zubat');
    assert.equal(drawn.pokemon.level, 16);
    assert.equal(drawn.pokemon.shiny, false);
  });

  test('LocationPanel renders the temporary NPC action without restoring overview tags', () => {
    prepareAzaleaQuestSave('Local quest panel');
    quests.init();
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    const dom = panel.getDomElement();
    const npcAction = [...dom.querySelectorAll('.pw-loc-action-btn')].find((button) =>
      button.getAttribute('data-npc-id') === LOCAL_QUEST_BATTLE_NPC_ID
    );
    assert.ok(npcAction, 'the real location panel exposes the temporary NPC tile');
    assert.equal(dom.querySelector('.pw-loc-overview-meta'), null, 'temporary NPC access does not reintroduce location tags');
    panel.destroy();
  });

  test('NPC dialogue closes before the local one-off battle starts', async () => {
    prepareAzaleaQuestSave('Local quest dialogue');
    quests.init();
    battle.init();
    battle.setRandom(Random.sequence([0.99]));
    const state = quests.getLocalDefeatBattleState('azalea');
    const actions = new LocationActions(LocationDB.getInstance().getById('azalea'), 0, false, state);
    const npcTile = actions.getChildren().find((child) =>
      child.getDomElement().getAttribute('data-npc-id') === LOCAL_QUEST_BATTLE_NPC_ID
    );
    assert.ok(npcTile, 'the temporary NPC is exposed as a location action');
    assert.equal(npcTile.getDomElement().getAttribute('data-quest-key'), 'side.s33');

    const modal = new NpcTalkModal();
    modal.open({ locationId: 'azalea', npcId: LOCAL_QUEST_BATTLE_NPC_ID });
    assert.equal(battle.isActive(), false, 'opening or reading the dialogue does not start combat');
    const questTitle = t(`quests.${state.quest.category}.${state.quest.id}.title`);
    assert.ok(modal.getDomElement().textContent.includes(questTitle), 'the dialogue names the active quest');
    modal.close();
    await Promise.resolve();
    assert.equal(battle.isActive(), true, 'combat starts after the close event has completed');
    assert.equal(battle.getBattleSummary().localQuestBattleKey, 'side.s33');
    assert.equal(battle._wildChain, false, 'the special encounter cannot chain into normal wild battles');
    battle.endBattle();
    modal.onDestroy();
    actions.onDestroy();
    battle.setRandom(Random.default);
  });

  test('winning is a wild victory for the quest and location, with no capture and one save', () => {
    const save = prepareAzaleaQuestSave('Local quest settlement');
    quests.init();
    battle.init();
    battle.setRandom(Random.sequence([0.99]));
    const initialTeamSize = save.team.length;
    const defeatedEvents = [];
    const onDefeated = (event) => defeatedEvents.push(event);
    EventBus.getInstance().subscribe(PokemonDefeatedEvent, onDefeated);
    const originalTryCatch = battle._tryCatch;
    let catchAttempts = 0;
    battle._tryCatch = function (...args) {
      catchAttempts++;
      return originalTryCatch.apply(this, args);
    };
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) {
      writes++;
      return originalSaveCurrent.apply(this, args);
    };
    try {
      assert.ok(quests.requestLocalDefeatBattle('azalea', 'side.s33'));
      const foe = battle.getCurrentFoe();
      assert.ok(foe);
      foe.hp = 0;
      battle._session._resolve();
      battle.update(0.1);

      assert.equal(battle.isActive(), false);
      assert.equal(save.quests.getProgress('side.s33'), 1, 'the local battle advances the active KILL objective');
      assert.equal(save.statistics.wildWinsInGroup('azalea'), 1, 'the victory is recorded at the quest location');
      assert.equal(defeatedEvents.length, 1);
      assert.equal(defeatedEvents[0].wild, true);
      assert.equal(defeatedEvents[0].locationId, 'azalea');
      assert.equal(defeatedEvents[0].deferSave, true, 'quest updates join the battle save transaction');
      assert.equal(catchAttempts, 0, 'no automatic capture is attempted');
      assert.equal(save.team.length, initialTeamSize);
      assert.equal(save.pokedex.isCaught(foe.species), false);
      assert.equal(writes, 1, 'battle, quest, rewards and statistics persist in one write');
      assert.equal(battle.getBattleSummary().localQuestBattleKey, 'side.s33');
    } finally {
      if (battle.isActive()) battle.endBattle();
      saves.saveCurrent = originalSaveCurrent;
      battle._tryCatch = originalTryCatch;
      battle.setRandom(Random.default);
      EventBus.getInstance().unsubscribe(PokemonDefeatedEvent, onDefeated);
    }
  });
});
