/** @file InteractionCorrections.test.js @brief Real gesture contracts, explicit legacy receipts and minimal live combat controls. */
import fs from 'node:fs';
import { describe, assert } from './TestRunner.js';
import { fakeEvent } from './FakeDom.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { ActiveTeamPanel } from '../src/panels/ActiveTeamPanel.js';
import { BattlePanel } from '../src/panels/BattlePanel.js';
import { RelaunchControls } from '../src/panels/components/RelaunchControls.js';
import { RelaunchSystem } from '../src/systems/RelaunchSystem.js';
import { ShopSystem } from '../src/systems/ShopSystem.js';
import { RelaunchRules } from '../src/config/RelaunchRules.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { convertLegacyRelaunch } from '../src/data/save/migrations/LegacyRelaunchMigration.js';
import { EventBus } from '../src/core/EventBus.js';
import { SaveLoadedEvent } from '../src/core/events/SaveLoadedEvent.js';
import {
  LocalizationManager,
  t,
} from '../src/localization/LocalizationManager.js';

const saves = SaveSystem.getInstance(),
  team = TeamSystem.getInstance(),
  battle = BattleSystem.getInstance();
const copy = (x) => JSON.parse(JSON.stringify(x));
function fixture() {
  TrainingSystem.getInstance().onDestroy();
  if (battle.isActive()) battle.endBattle(false);
  const save = saves.createNewSave('Interaction regression', 'charmander');
  save.tutorial.enabled = false;
  save.player.location = 'route1';
  for (const species of ['pidgey', 'eevee'])
    team.addPokemon(PokemonFactory.create(species, 10), { deferSave: true });
  return save;
}
function writes(action) {
  const old = saves.saveCurrent;
  let n = 0;
  saves.saveCurrent = function (...args) {
    n++;
    return old.apply(this, args);
  };
  try {
    action();
    return n;
  } finally {
    saves.saveCurrent = old;
  }
}
function geometry(panel) {
  panel._sortableList
    .getChildren()
    .forEach(
      (row, i) =>
        (row.getDomElement().getBoundingClientRect = () => ({
          left: 0,
          right: 300,
          top: 100 * i,
          bottom: 100 * i + 80,
          width: 300,
          height: 80,
          x: 0,
          y: 100 * i,
        })),
    );
}
function pointer(node, type, extra = {}) {
  node.dispatchEvent(
    fakeEvent(type, {
      bubbles: true,
      button: 0,
      pointerType: 'mouse',
      pointerId: 7,
      clientX: 30,
      clientY: 30,
      ...extra,
    }),
  );
}
function legacy(upgrades, automation = {}) {
  return {
    version: 4,
    G: {
      saveMeta: { id: 'PW-LEGACY-INTERACTION', name: 'Legacy interaction' },
      region: 'kanto',
      location: 'route1',
      team: [{ id: 4, level: 10, moves: ['tackle'] }],
      wallet: { questPoints: 12345, dungeonTokens: 99 },
      automationUpgrades: upgrades,
      automation,
    },
  };
}

describe('Immediate whole-card pointer drag', (test) => {
  test('ordinary mouse movement starts drag immediately, without waiting for a hold timer', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const row = panel._sortableList.getChildren()[0];
      pointer(row.getDomElement(), 'pointerdown');
      pointer(row.getDomElement(), 'pointermove', { clientY: 45 });
      assert.ok(row.getDomElement().classList.contains('is-dragging'));
      assert.ok(row.getDomElement().classList.contains('pw-sortable-floating'));
    } finally {
      panel.destroy();
    }
  });
  test('a fast whole-card drop swaps canonical UIDs once and keeps all owned instances and nodes', () => {
    const save = fixture(),
      panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const ids = [...team.getMemberUids()],
        row = panel._cards.get(ids[0]),
        objects = save.collection.getAll();
      pointer(row.getDomElement(), 'pointerdown');
      pointer(row.getDomElement(), 'pointermove', { clientY: 230 });
      assert.equal(
        writes(() =>
          pointer(row.getDomElement(), 'pointerup', { clientY: 230 }),
        ),
        1,
      );
      assert.deepEqual(team.getMemberUids(), [ids[2], ids[1], ids[0]]);
      assert.equal(panel._cards.get(ids[0]), row);
      assert.ok(objects.every((p) => save.collection.get(p.uid) === p));
      assert.equal(
        panel._sortableList
          .getDomElement()
          .querySelectorAll('.pw-sortable-placeholder').length,
        0,
      );
    } finally {
      panel.destroy();
    }
  });
  test('movement below the threshold remains a click, with no reorder or placeholder', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const node = panel._sortableList.getChildren()[0].getDomElement(),
        before = [...team.getMemberUids()];
      pointer(node, 'pointerdown');
      pointer(node, 'pointermove', { clientY: 32 });
      assert.equal(
        writes(() => pointer(node, 'pointerup')),
        0,
      );
      assert.deepEqual(team.getMemberUids(), before);
      assert.equal(node.classList.contains('is-dragging'), false);
    } finally {
      panel.destroy();
    }
  });
  test('read-only move bars are part of the draggable card, not a false interactive blocker', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const row = panel._sortableList.getChildren()[0],
        move = row.getDomElement().querySelector('.poke-move');
      assert.ok(move);
      pointer(move, 'pointerdown');
      pointer(row.getDomElement(), 'pointermove', { clientY: 130 });
      assert.ok(row.getDomElement().classList.contains('is-dragging'));
    } finally {
      panel.destroy();
    }
  });
  test('information, held-item and PC buttons never arm card drag', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const row = panel._sortableList.getChildren()[0];
      for (const node of row.getDomElement().querySelectorAll('button')) {
        pointer(node, 'pointerdown');
        assert.equal(panel._sortableList._mouseDragArm, null);
      }
      pointer(row._itemBadge.getDomElement(), 'pointerdown');
      assert.equal(panel._sortableList._mouseDragArm, null);
    } finally {
      panel.destroy();
    }
  });
  test('cancelled drags suppress their release click but a new intentional pointer press is not swallowed', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const widget = panel._sortableList,
        row = widget.getChildren()[0],
        node = row.getDomElement();
      pointer(node, 'pointerdown');
      pointer(node, 'pointermove', { clientY: 130 });
      widget.cancelDrag();
      assert.ok(widget._suppressedClicks.has(row));
      pointer(node, 'pointerdown');
      assert.equal(widget._suppressedClicks.has(row), false);
    } finally {
      panel.destroy();
    }
  });
  test('right-button and cancelled pointer gestures never reorder or save', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const node = panel._sortableList.getChildren()[0].getDomElement(),
        before = [...team.getMemberUids()];
      pointer(node, 'pointerdown', { button: 2 });
      assert.equal(panel._sortableList._mouseDragArm, null);
      pointer(node, 'pointerdown');
      pointer(node, 'pointermove', { clientY: 130 });
      assert.equal(
        writes(() => pointer(node, 'pointercancel')),
        0,
      );
      assert.deepEqual(team.getMemberUids(), before);
      assert.equal(node.classList.contains('pw-sortable-floating'), false);
    } finally {
      panel.destroy();
    }
  });
  test('live HP refresh keeps the same floating row and leaves the gesture in progress', () => {
    const save = fixture(),
      panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const row = panel._sortableList.getChildren()[0],
        node = row.getDomElement();
      pointer(node, 'pointerdown');
      pointer(node, 'pointermove', { clientY: 130 });
      save.team[0].hp = Math.max(1, save.team[0].hp - 1);
      panel.refresh();
      assert.equal(panel._sortableList.getChildren()[0], row);
      assert.ok(node.classList.contains('pw-sortable-floating'));
      assert.ok(panel._sortableList._motion.isActive());
    } finally {
      panel.destroy();
    }
  });
  test('save changes cancel a gesture before it can change another party or charge a write', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      geometry(panel);
      const node = panel._sortableList.getChildren()[0].getDomElement();
      pointer(node, 'pointerdown');
      pointer(node, 'pointermove', { clientY: 130 });
      const other = fixture(),
        before = [...other.teamMembers.getUids()];
      EventBus.getInstance().dispatch(new SaveLoadedEvent(other.id, other));
      assert.equal(panel._sortableList._motion.isActive(), false);
      assert.equal(
        writes(() => pointer(node, 'pointerup', { clientY: 130 })),
        0,
      );
      assert.deepEqual(other.teamMembers.getUids(), before);
    } finally {
      panel.destroy();
    }
  });
  test('destroying a dragged panel restores the original classes and removes its placeholder', () => {
    fixture();
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    geometry(panel);
    const node = panel._sortableList.getChildren()[0].getDomElement();
    pointer(node, 'pointerdown');
    pointer(node, 'pointermove', { clientY: 130 });
    const motion = panel._sortableList._motion;
    panel.destroy();
    assert.equal(motion.isActive(), false);
    assert.equal(node.classList.contains('pw-sortable-floating'), false);
  });
});

describe('Original main automation ownership', (test) => {
  for (const [label, upgrades] of [
    ['boolean map', { autoRelaunch: true, autoDungeonRelaunch: true }],
    ['numeric map', { autoRelaunch: 1, autoDungeonRelaunch: 1 }],
    [
      'positive paid receipts',
      { autoRelaunch: 2500, autoDungeonRelaunch: 5000 },
    ],
    [
      'explicit string flags',
      { autoRelaunch: 'true', autoDungeonRelaunch: '1' },
    ],
    ['owned id list', ['autoRelaunch', 'autoDungeonRelaunch']],
    [
      'structured receipts',
      {
        autoRelaunch: { purchased: true },
        autoDungeonRelaunch: { owned: true },
      },
    ],
  ]) {
    test(`${label} survives the complete original-to-current import and reload without a second payment`, () => {
      const raw = legacy(upgrades, {
          autoRelaunch: false,
          autoDungeonRelaunch: true,
          autoDungeonMode: 'chest',
        }),
        before = copy(raw),
        save = SaveData.fromJson(raw);
      assert.ok(
        save.relaunch.wild.purchased && save.relaunch.dungeon.purchased,
      );
      assert.equal(save.relaunch.wild.enabled, false);
      assert.equal(save.relaunch.dungeon.enabled, true);
      assert.equal(save.relaunch.dungeon.mode, 'chest');
      assert.equal(save.currencies.get('questPoint'), 12345);
      assert.equal(save.serialize().version, SaveSchema.VERSION);
      const reload = SaveData.fromJson(save.serialize());
      assert.deepEqual(reload.relaunch.serialize(), save.relaunch.serialize());
      assert.deepEqual(raw, before);
    });
  }
  test('explicit disabled preferences in numeric or string form never become enabled by import', () => {
    for (const disabled of [false, 0, 'false', '0']) {
      const state = convertLegacyRelaunch({
        automationUpgrades: { autoRelaunch: true },
        automation: { autoRelaunch: disabled },
      });
      assert.equal(state.wild.purchased, true);
      assert.equal(state.wild.enabled, false);
    }
  });
  test('an old enabled preference is positive evidence even when its separate purchase map was absent', () => {
    const state = convertLegacyRelaunch({
      automation: {
        autoRelaunch: 'true',
        autoDungeonRelaunch: { purchased: true, enabled: false },
      },
    });
    assert.ok(state.wild.purchased && state.wild.enabled);
    assert.ok(state.dungeon.purchased && !state.dungeon.enabled);
  });
  test('missing, negative, malformed or unrelated flags never grant relaunch upgrades', () => {
    for (const value of [
      undefined,
      false,
      0,
      'false',
      '0',
      'yes',
      -4,
      Infinity,
      {},
      { purchased: false },
    ]) {
      const state = convertLegacyRelaunch({
        automationUpgrades: { autoRelaunch: value, autoHatch: true },
      });
      assert.equal(state.wild.purchased, false);
      assert.equal(state.dungeon.purchased, false);
    }
  });
  test('structured disabled receipt preferences remain disabled without a separate preference field', () => {
    const state = convertLegacyRelaunch({
      automationUpgrades: { autoRelaunch: { purchased: true, enabled: false } },
    });
    assert.ok(state.wild.purchased && !state.wild.enabled);
  });
  test('imported owned modules disappear from shop stock, without touching the imported wallet', () => {
    fixture();
    const save = SaveData.fromJson(
      legacy({ autoRelaunch: true, autoDungeonRelaunch: true }),
    );
    saves.setCurrentSave(save);
    const offers = ShopSystem.getInstance().getOffers('pewter');
    assert.equal(
      offers.some((o) => o.upgradeId === 'wild' || o.upgradeId === 'dungeon'),
      false,
    );
    assert.equal(save.currencies.get('questPoint'), 12345);
  });
});

describe('Only the useful Auto switch in combat', (test) => {
  test('an owned wild switch is visible during a genuine live wild battle, not inside its hidden idle scene', () => {
    const save = fixture();
    save.relaunch.wild.purchased = true;
    save.relaunch.wild.enabled = true;
    const panel = new BattlePanel(DashboardColumns.CENTER);
    try {
      assert.ok(battle.startBattle('route1'));
      const view = panel._relaunchGroup.getChildren()[0];
      assert.equal(view.isVisible(), true);
      assert.equal(view.getChildren().length, 1);
      assert.equal(view._switch.isChecked(), true);
      assert.equal(view.getParent(), panel._relaunchGroup);
      assert.ok(panel._relaunchGroup.getParent() === panel);
    } finally {
      battle.endBattle(false);
      panel.destroy();
    }
  });
  test('an unowned module is never rendered as a fake enabled switch or an intrusive combat purchase card', () => {
    fixture();
    const view = new RelaunchControls('wild', 'unit');
    try {
      assert.equal(view.isVisible(), false);
      assert.equal(view.getChildren().length, 1);
      assert.equal(
        view.getDomElement().querySelectorAll('.pw-relaunch-offer').length,
        0,
      );
      assert.equal(view.getDomElement().querySelectorAll('small').length, 0);
    } finally {
      view.destroy();
    }
  });
  test('switching the owned module updates only the preference, saves once, and does not refund ownership', () => {
    const save = fixture();
    save.relaunch.wild.purchased = true;
    save.relaunch.wild.enabled = true;
    const view = new RelaunchControls('wild', 'unit');
    try {
      assert.equal(
        writes(() => view._switch.getDomElement().click()),
        1,
      );
      assert.equal(save.relaunch.wild.purchased, true);
      assert.equal(save.relaunch.wild.enabled, false);
      assert.equal(view._switch.isChecked(), false);
    } finally {
      view.destroy();
    }
  });
  test('FR and EN labels and refresh keep the same one-button widget and never write a save', () => {
    const save = fixture();
    save.relaunch.wild.purchased = true;
    const locale = LocalizationManager.getInstance(),
      old = locale.currentLang,
      view = new RelaunchControls('wild', 'unit');
    try {
      const node = view._switch.getDomElement();
      assert.equal(
        writes(() => {
          for (const lang of ['fr', 'en']) {
            locale.setLanguage(lang);
            view.refresh();
            assert.equal(view._switch.getDomElement(), node);
            assert.equal(view.getChildren().length, 1);
            assert.equal(node.textContent, t(RelaunchRules.UPGRADES.wild.toggleLabelKey));
          }
        }),
        0,
      );
    } finally {
      locale.setLanguage(old);
      view.destroy();
    }
  });
  test('bench switching resolves a stable UID after canonical party reordering', () => {
    fixture();
    assert.ok(battle.startBattle('route1'));
    const ids = [...team.getMemberUids()];
    team.swapMembers(ids[0], ids[2]);
    assert.ok(battle.switchPlayerPokemonByUid(ids[2]));
    assert.equal(battle.getPlayerPokemon().uid, ids[2]);
    battle.endBattle(false);
  });
  test('an unknown combatant UID cannot switch or mutate the active battle', () => {
    fixture();
    assert.ok(battle.startBattle('route1'));
    const before = copy(battle._session.captureState());
    assert.equal(battle.switchPlayerPokemonByUid('foreign-uid'), false);
    assert.deepEqual(battle._session.captureState(), before);
    battle.endBattle(false);
  });
  test('battle geometry uses the container width and normal growing page flow, not clipping or fixed action offsets', () => {
    const css = fs.readFileSync(
      new URL('../assets/css/battle-responsive.css', import.meta.url),
      'utf8',
    );
    assert.ok(css.includes('@container pw-battle'));
    assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'));
    assert.ok(css.includes('overflow: visible'));
    assert.ok(css.includes('flex-wrap: wrap'));
  });
});
