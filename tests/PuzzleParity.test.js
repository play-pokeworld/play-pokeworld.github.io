/**
 * @file PuzzleParity.test.js
 * @brief Cross-region puzzle catalog, all interaction types, and quest-event progression.
 */
import { describe, assert } from './TestRunner.js';
import { PuzzleDB } from '../src/data/quests/PuzzleDB.js';
import { PuzzleSystem, PuzzleOutcomes } from '../src/systems/PuzzleSystem.js';
import { PuzzleTypes } from '../src/config/PuzzleTypes.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { ObjectiveTypes } from '../src/data/quests/ObjectiveTypes.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { LocationActions } from '../src/panels/components/LocationActions.js';
import { PuzzleSolveModal } from '../src/panels/PuzzleSolveModal.js';
import { t } from '../src/localization/LocalizationManager.js';

describe('Cross-region puzzles', (test) => {
  test('every quest puzzle objective resolves to a localized puzzle across Kanto, Johto, and Hoenn', () => {
    const puzzles = PuzzleDB.getInstance();
    assert.equal(puzzles.count, 31);
    assert.deepEqual(puzzles.validate(), []);
    const typeCounts = Object.fromEntries(Object.values(PuzzleTypes).map((type) => [
      type,
      puzzles.getAll().filter((puzzle) => puzzle.type === type).length
    ]));
    assert.deepEqual(typeCounts, { sequence: 13, code: 10, braille: 6, wait: 1, party: 1 });
    for (const quest of QuestDB.getInstance().getAll().filter((entry) => entry.objective.type === ObjectiveTypes.PUZZLE)) {
      assert.ok(puzzles.has(quest.objective.puzzle), `${quest.key} references ${quest.objective.puzzle}`);
    }
  });

  test('non-Kanto location actions expose the local puzzle count', () => {
    for (const [locationId, total] of [['ruinsofalph', 2], ['sealed_chamber', 3]]) {
      const actions = new LocationActions(LocationDB.getInstance().getById(locationId), 0);
      try {
        const puzzleAction = actions.getChildren().find((child) =>
          child.getDomElement().classList.contains('pw-loc-quest-btn') &&
          child.getDomElement().textContent.includes(t('loc_puzzle_progress_action', { done: 0, total }))
        );
        assert.ok(puzzleAction, `${locationId} should show its ${total}-puzzle exploration action`);
      } finally {
        actions.destroy();
      }
    }
  });

  test('a Johto sequence unlocks its dependent puzzle and progresses the accepted quest', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Alph puzzle audit', 'cyndaquil');
    save.player.region = 'johto';
    save.player.location = 'ruinsofalph';
    saves.setCurrentSave(save);
    const quests = QuestSystem.getInstance();
    quests.init();
    try {
      const puzzles = PuzzleSystem.getInstance();
      assert.equal(puzzles.getStatus('alph_mirror_path'), PuzzleOutcomes.LOCKED);
      assert.ok(quests.accept('side.s92'));
      const result = puzzles.solveSequence('alph_unown_circle', ['E', 'S', 'W', 'N', 'E', 'S']);
      assert.equal(result.result, PuzzleOutcomes.SOLVED_FIRST);
      assert.equal(puzzles.getStatus('alph_mirror_path'), PuzzleOutcomes.OPEN);
      assert.equal(quests.getStatus('side.s92')?.complete, true);
    } finally {
      saves.setCurrentSave(previousSave);
    }
  });

  test('Braille codes, party seals, and side-quest puzzle progress use the live team', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Sealed chamber audit', 'mudkip');
    save.player.region = 'hoenn';
    save.player.location = 'sealed_chamber';
    saves.setCurrentSave(save);
    const quests = QuestSystem.getInstance();
    quests.init();
    try {
      const puzzles = PuzzleSystem.getInstance();
      assert.ok(quests.accept('side.s100'));
      assert.equal(puzzles.solveCode('sealed_braille_a', 'mer').result, PuzzleOutcomes.SOLVED_FIRST);
      assert.equal(puzzles.getStatus('sealed_braille_b'), PuzzleOutcomes.OPEN);
      assert.equal(puzzles.solveCode('sealed_braille_b', 'porte').result, PuzzleOutcomes.SOLVED_FIRST);
      assert.equal(puzzles.solveParty('sealed_relicanth_wailord').result, PuzzleOutcomes.INCORRECT);

      assert.ok(TeamSystem.getInstance().addPokemon(PokemonFactory.create('relicanth', 40)));
      assert.ok(TeamSystem.getInstance().addPokemon(PokemonFactory.create('wailord', 40)));
      assert.equal(puzzles.solveParty('sealed_relicanth_wailord').result, PuzzleOutcomes.SOLVED_FIRST);
      assert.equal(save.quests.getProgress('side.s100'), 1);
      assert.equal(PuzzleDB.getInstance().getById('sealed_relicanth_wailord').hidePartyList, true);
    } finally {
      saves.setCurrentSave(previousSave);
    }
  });

  test('a wait puzzle requires the full duration and persists a successful solve once', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Regirock wait audit', 'torchic');
    save.player.region = 'hoenn';
    save.player.location = 'desert_ruins';
    save.statistics.recordPuzzle('sealed_relicanth_wailord');
    save.statistics.recordPuzzle('regirock_braille_lesson');
    saves.setCurrentSave(save);
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) {
      writes++;
      return originalSaveCurrent.apply(this, args);
    };
    try {
      const puzzles = PuzzleSystem.getInstance();
      assert.equal(puzzles.solveWait('regirock_wait', Date.now() - 1000).result, PuzzleOutcomes.INCORRECT);
      assert.equal(writes, 0);
      assert.equal(puzzles.solveWait('regirock_wait', Date.now() - 61000).result, PuzzleOutcomes.SOLVED_FIRST);
      assert.equal(save.statistics.solvedPuzzles.includes('regirock_wait'), true);
      assert.equal(writes, 1);
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      saves.setCurrentSave(previousSave);
    }
  });

  test('the Regi dial uses the number of other seals already solved', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Regice dial audit', 'mudkip');
    save.player.region = 'hoenn';
    save.player.location = 'island_cave';
    save.statistics.recordPuzzle('regice_braille_lesson');
    saves.setCurrentSave(save);
    try {
      const puzzles = PuzzleSystem.getInstance();
      assert.equal(puzzles.solveCode('regice_digits', '08').result, PuzzleOutcomes.INCORRECT);
      save.statistics.recordPuzzle('regirock_name');
      save.statistics.recordPuzzle('registeel_name');
      assert.equal(puzzles.solveCode('regice_digits', '08').result, PuzzleOutcomes.SOLVED_FIRST);
    } finally {
      saves.setCurrentSave(previousSave);
    }
  });

  test('the puzzle modal renders Braille, wait, and hidden-party interactions', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Puzzle UI audit', 'mudkip');
    save.player.region = 'hoenn';
    save.player.location = 'sealed_chamber';
    save.statistics.recordPuzzle('sealed_braille_b');
    saves.setCurrentSave(save);
    const modal = new PuzzleSolveModal();
    try {
      modal.open({ puzzleId: 'sealed_braille_a' });
      assert.ok(modal.getDomElement().querySelector('.pw-puzzle-braille-cells'));
      assert.ok(modal.getDomElement().querySelector('#pw-puzzle-answer-input'));
      modal.close();

      save.player.location = 'desert_ruins';
      save.statistics.recordPuzzle('sealed_relicanth_wailord');
      save.statistics.recordPuzzle('regirock_braille_lesson');
      modal.open({ puzzleId: 'regirock_wait' });
      assert.ok(modal.getDomElement().querySelector('.pw-puzzle-instructions')?.textContent.includes('60'));
      modal.close();

      save.player.location = 'sealed_chamber';
      modal.open({ puzzleId: 'sealed_relicanth_wailord' });
      assert.ok(modal.getDomElement().querySelector('.pw-puzzle-instructions'));
      assert.equal(modal.getDomElement().querySelector('#pw-puzzle-answer-input'), null);
    } finally {
      modal.close();
      modal.destroy();
      saves.setCurrentSave(previousSave);
    }
  });
});
