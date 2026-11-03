/**
 * @file DungeonKeyboard.test.js
 * @brief Arrow keys drive the expedition from anywhere, and never scroll the page during a run.
 */
import { describe, assert } from './TestRunner.js';
import { DungeonSystem } from '../src/systems/DungeonSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { ModalFocusScope } from '../src/ui/ModalFocusScope.js';
import { DUNGEON_KEYS, handleDungeonKeydown } from '../src/ui/DungeonKeyboard.js';

/** @param {string} key @param {Object} [target] @returns {Object} keydown event with a spy */
function keyEvent(key, target = null) {
  const event = {
    key,
    target,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    repeat: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
  return event;
}

/** Runs `body` with a fake active run that records moves. */
function withActiveRun(body) {
  const dungeon = DungeonSystem.getInstance();
  const battle = BattleSystem.getInstance();
  const originalGetRun = dungeon.getRun;
  const originalMove = dungeon.move;
  const originalActive = battle.isActive;
  const originalModalState = ModalFocusScope.isActive;
  const moves = [];
  dungeon.getRun = () => ({ active: true, pos: 'c0r0' });
  dungeon.move = (direction) => {
    moves.push(direction);
    return true;
  };
  battle.isActive = () => false;
  // Other test modules may leave a modal registered on the singleton: state the precondition.
  ModalFocusScope.isActive = () => false;
  try {
    body(moves);
  } finally {
    dungeon.getRun = originalGetRun;
    dungeon.move = originalMove;
    battle.isActive = originalActive;
    ModalFocusScope.isActive = originalModalState;
  }
}

describe('Dungeon keyboard', (test) => {
  test('the four arrows move the trainer and are consumed while a run is active', () => {
    withActiveRun((moves) => {
      for (const [key, direction] of Object.entries(DUNGEON_KEYS)) {
        const event = keyEvent(key);
        assert.ok(handleDungeonKeydown(event), `${key} is consumed`);
        assert.ok(event.defaultPrevented, `${key} never scrolls the page`);
        assert.equal(moves.at(-1), direction, `${key} moves ${direction}`);
      }
      assert.equal(moves.length, 4);
    });
  });

  test('outside a run the arrows keep their native behaviour (no interception, no scroll lock)', () => {
    const event = keyEvent('ArrowDown');
    assert.equal(handleDungeonKeydown(event), false);
    assert.ok(!event.defaultPrevented, 'the page still scrolls when no dungeon is active');
  });

  test('a text field, a modifier and an open modal keep their keys', () => {
    withActiveRun((moves) => {
      const input = document.createElement('input');
      const inField = keyEvent('ArrowUp', input);
      assert.equal(handleDungeonKeydown(inField), false, 'typing in a field is never hijacked');
      assert.ok(!inField.defaultPrevented);

      const withCtrl = keyEvent('ArrowLeft');
      withCtrl.ctrlKey = true;
      assert.equal(handleDungeonKeydown(withCtrl), false, 'browser shortcuts win');

      const original = ModalFocusScope.isActive;
      ModalFocusScope.isActive = () => true;
      try {
        assert.equal(handleDungeonKeydown(keyEvent('ArrowRight')), false, 'a modal above owns the keys');
      } finally {
        ModalFocusScope.isActive = original;
      }
      assert.equal(moves.length, 0, 'no move was triggered');
    });
  });

  test('an encounter pauses the board but the arrows still do not scroll', () => {
    withActiveRun((moves) => {
      const battle = BattleSystem.getInstance();
      battle.isActive = () => true;
      const event = keyEvent('ArrowDown');
      assert.ok(handleDungeonKeydown(event), 'the key is consumed');
      assert.ok(event.defaultPrevented, 'no page scroll while an encounter runs');
      assert.equal(moves.length, 0, 'the board does not move during a battle');
    });
  });

  test('a held key repeats are ignored so the trainer does not run across the map', () => {
    withActiveRun((moves) => {
      const repeat = keyEvent('ArrowUp');
      repeat.repeat = true;
      assert.ok(handleDungeonKeydown(repeat));
      assert.equal(moves.length, 0, 'auto-repeat is swallowed');
    });
  });
});
