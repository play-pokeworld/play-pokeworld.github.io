/** @file FeedbackCorrections.test.js @brief Regression contracts for the eight requested 1.14.20 corrections. */
import { describe, assert } from './TestRunner.js';
import { fakeEvent } from './FakeDom.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { TeamPresetSystem } from '../src/systems/TeamPresetSystem.js';
import { TeamPresetEditSystem } from '../src/systems/TeamPresetEditSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { MineSystem, MineResults } from '../src/systems/MineSystem.js';
import { SecretBaseSystem } from '../src/systems/SecretBaseSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { MigrationV18ToV19 } from '../src/data/save/migrations/MigrationV18ToV19.js';
import { FacilityStaffSystem } from '../src/systems/FacilityStaffSystem.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { EventBus } from '../src/core/EventBus.js';
import { TeamChangedEvent } from '../src/core/events/TeamChangedEvent.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { BoxPokemonSelectedEvent } from '../src/core/events/BoxPokemonSelectedEvent.js';
import { BoxPokemonSelectionCancelledEvent } from '../src/core/events/BoxPokemonSelectionCancelledEvent.js';
import { BoxPokemonSelectionRemoveRequestedEvent } from '../src/core/events/BoxPokemonSelectionRemoveRequestedEvent.js';
import { BattleFoeKnockedOutEvent } from '../src/core/events/BattleFoeKnockedOutEvent.js';
import { ActiveTeamPanel } from '../src/panels/ActiveTeamPanel.js';
import { TrainingCenterPanel } from '../src/panels/TrainingCenterPanel.js';
import { TeamPresetsPanel } from '../src/panels/fullscreen/TeamPresetsPanel.js';
import { TeamPresetEditorModal } from '../src/panels/team-presets/TeamPresetEditorModal.js';
import { TeamPresetMemberCard } from '../src/panels/team-presets/TeamPresetMemberCard.js';
import { MinePanel } from '../src/panels/MinePanel.js';
import { StaffCard } from '../src/panels/facilities/StaffCard.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { UISortableList } from '../src/ui/UISortableList.js';
import { UIContainer } from '../src/ui/UIContainer.js';
import { UIButton } from '../src/ui/UIButton.js';
import { MineRules } from '../src/config/MineRules.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import {
  LocalizationManager,
  t,
} from '../src/localization/LocalizationManager.js';

const saves = SaveSystem.getInstance(),
  team = TeamSystem.getInstance(),
  presets = TeamPresetSystem.getInstance(),
  edit = TeamPresetEditSystem.getInstance(),
  mine = MineSystem.getInstance(),
  base = SecretBaseSystem.getInstance();
const copy = (value) => JSON.parse(JSON.stringify(value));
function fresh(name) {
  edit.onDestroy();
  TrainingSystem.getInstance().onDestroy();
  HatcherySystem.getInstance().onDestroy();
  QuestSystem.getInstance().onDestroy();
  if (BattleSystem.getInstance().isActive())
    BattleSystem.getInstance().endBattle(false);
  const save = saves.createNewSave(name, 'charmander');
  save.tutorial.enabled = false;
  for (const id of ['mine', 'training', 'hatchery'])
    save.access.unlockFeature(id);
  for (const id of [
    'brock',
    'misty',
    'surge',
    'erika',
    'koga',
    'sabrina',
    'blaine',
    'giovanni',
  ])
    save.player.earnBadge(id);
  for (const [id, n] of [
    ['money', 100000],
    ['questPoint', 100000],
    ['diamond', 10000],
  ])
    save.currencies.add(id, n - save.currencies.get(id));
  edit.init();
  mine.setRandom(new SeededRandom(1234));
  return save;
}
function owned(species = 'pikachu', level = 20) {
  const p = PokemonFactory.create(species, level);
  BoxSystem.getInstance().addPokemon(p, { deferSave: true });
  return p;
}
function writes(action) {
  const original = saves.saveCurrent;
  let count = 0;
  saves.saveCurrent = function (...args) {
    count++;
    return original.apply(this, args);
  };
  try {
    action();
  } finally {
    saves.saveCurrent = original;
  }
  return count;
}
function hoenn(save) {
  save.player.location = 'route101';
  save.player.region = 'hoenn';
  save.access.unlockLocation('route101');
  save.quests.setMainStep(
    'hoenn',
    QuestDB.getInstance()
      .getMainChain('hoenn')
      .findIndex((q) => q.key === 'main.216') + 1,
  );
}

describe('Feedback corrections 1.14.20', (test) => {
  test('manual survey migration is pure and preserves board, FIFO, preset UIDs and the real saved battle', () => {
    const save = fresh('Clock migration');
    mine.ensureLayer();
    const p = owned();
    TrainingSystem.getInstance().init();
    TrainingSystem.getInstance().assignPokemon(0, p.uid);
    TrainingSystem.getInstance().startSession(p.uid, 'move', 0);
    presets.saveCurrentToPreset('preset1');
    const raw = copy(save.serialize());
    raw.version = 18;
    delete raw.mine.manualSurveyReadyAt;
    const before = copy(raw),
      migrated = MigrationV18ToV19.migrate(raw);
    assert.deepEqual(raw, before);
    assert.equal(migrated.mine.manualSurveyReadyAt, 0);
    assert.deepEqual(migrated.training, raw.training);
    assert.deepEqual(migrated.hatchery, raw.hatchery);
    assert.deepEqual(migrated.teamPresets, raw.teamPresets);
    assert.deepEqual(migrated.mine.grid, raw.mine.grid);
    assert.deepEqual(migrated.collection, raw.collection);
    const loaded = SaveData.fromJson(raw);
    assert.equal(loaded.serialize().version, 20);
    assert.deepEqual(
      loaded.training.slots[0].battle,
      save.training.slots[0].battle,
    );
    TrainingSystem.getInstance().cancelSession(0);
  });
  test('manual survey runs once then enforces exactly 600 seconds without hidden rewards or repeated writes', () => {
    const save = fresh('Manual survey clock');
    mine.ensureLayer();
    const original = Date.now;
    let now = original();
    Date.now = () => now;
    try {
      const inventory = copy(save.inventory.serialize()),
        energy = save.mine.energy;
      assert.equal(
        writes(() =>
          assert.equal(
            mine.startNextLayer({ discardCurrent: true }).result,
            MineResults.READY,
          ),
        ),
        1,
      );
      const at = save.mine.manualSurveyReadyAt;
      assert.equal(at, now + 600000);
      assert.equal(mine.getManualSurveySnapshot().remainingSeconds, 600);
      assert.equal(
        writes(() =>
          assert.equal(
            mine.startNextLayer({ discardCurrent: true }).result,
            MineResults.SURVEY_COOLDOWN,
          ),
        ),
        0,
      );
      now += 599999;
      assert.equal(mine.getManualSurveySnapshot().remainingSeconds, 1);
      assert.equal(
        mine.startNextLayer({ discardCurrent: true }).result,
        MineResults.SURVEY_COOLDOWN,
      );
      now++;
      assert.equal(mine.getManualSurveySnapshot().ready, true);
      assert.equal(
        writes(() => mine.startNextLayer({ discardCurrent: true })),
        1,
      );
      assert.deepEqual(save.inventory.serialize(), inventory);
      assert.equal(save.mine.energy, energy);
    } finally {
      Date.now = original;
    }
  });
  test('survey timestamp survives JSON reload and another save never inherits its clock', () => {
    const first = fresh('Clock first');
    mine.ensureLayer();
    mine.startNextLayer({ discardCurrent: true });
    const at = first.mine.manualSurveyReadyAt;
    const loaded = SaveData.fromJson(copy(first.serialize()));
    saves.setCurrentSave(loaded);
    assert.equal(mine.getManualSurveySnapshot().readyAt, at);
    const second = fresh('Clock second');
    assert.equal(second.mine.manualSurveyReadyAt, 0);
    assert.equal(mine.getManualSurveySnapshot().ready, true);
    saves.setCurrentSave(loaded);
    assert.equal(mine.getManualSurveySnapshot().readyAt, at);
  });
  test('automatic completion starts a real next layer without resetting the manual survey clock', () => {
    const save = fresh('Automatic renewal clock');
    mine.ensureLayer();
    mine.startNextLayer({ discardCurrent: true });
    const at = save.mine.manualSurveyReadyAt;
    save.mine.grid = Array.from({ length: 8 }, () => Array(10).fill(0));
    save.mine.grid[0][0] = 1;
    save.mine.items = [
      { itemId: 'nugget', x: 0, y: 0, shape: [[1]], collected: false },
    ];
    const before = save.inventory.count('nugget');
    assert.deepEqual(mine.digAt(0, 0).dug, ['nugget']);
    assert.equal(save.inventory.count('nugget'), before + 1);
    assert.equal(save.mine.manualSurveyReadyAt, at);
    assert.ok(save.mine.items.some((item) => !item.collected));
  });
  test('rendering and countdown updates retain the same survey button and never write or regenerate', () => {
    const save = fresh('Clock rendering');
    mine.ensureLayer();
    mine.startNextLayer({ discardCurrent: true });
    const panel = new MinePanel(DashboardColumns.RIGHT),
      original = Date.now,
      now = original();
    Date.now = () => now + 1000;
    try {
      const button = panel._nextLayer.getDomElement(),
        grid = copy(save.mine.grid);
      assert.equal(
        writes(() => {
          panel._refreshSurvey();
          panel._refreshSurvey();
        }),
        0,
      );
      assert.equal(panel._nextLayer.getDomElement(), button);
      assert.equal(button.getAttribute('disabled'), 'disabled');
      assert.equal(button.classList.contains('hbtn'), false);
      assert.ok(button.textContent.includes('9:59'));
      assert.deepEqual(save.mine.grid, grid);
    } finally {
      Date.now = original;
      panel.destroy();
    }
  });
  test('malformed manual-survey timestamps normalize without changing legitimate clocks', () => {
    for (const value of [-1, NaN, Infinity, 'bad'])
      assert.equal(
        SaveData.fromJson({
          ...fresh('Malformed clock').serialize(),
          mine: { manualSurveyReadyAt: value },
        }).mine.manualSurveyReadyAt,
        0,
      );
    const raw = { version: 18, mine: { manualSurveyReadyAt: 123456 } };
    assert.equal(
      MigrationV18ToV19.migrate(raw).mine.manualSurveyReadyAt,
      123456,
    );
  });
  test('the team manager button is a standalone direct child, not a framed toolbar', () => {
    fresh('Unframed manager');
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT);
    try {
      const root = panel.getDomElement(),
        button = root.querySelector('.team-presets-open-btn');
      assert.ok(button);
      assert.equal(button.parentNode, root.querySelector('.win-body'));
      assert.equal(root.querySelector('.pw-team-toolbar'), null);
      assert.equal(root.querySelector('.ui-control-toolbar'), null);
    } finally {
      panel.destroy();
    }
  });
  test('whole-card immediate pointer movement reorders canonical team UIDs with a single save and keeps the card node', () => {
    const save = fresh('Real pointer contract');
    team.addMember(owned('pidgey').uid);
    team.addMember(owned('eevee').uid);
    const panel = new ActiveTeamPanel(DashboardColumns.LEFT),
      ids = team.getMemberUids(),
      row = panel._cards.get(ids[0]),
      oldSet = globalThis.setTimeout,
      oldClear = globalThis.clearTimeout;
    let arm;
    globalThis.setTimeout = (fn) => ((arm = fn), 1);
    globalThis.clearTimeout = () => {};
    try {
      panel._sortableList.getChildren().forEach((card, index) => {
        card.getDomElement().getBoundingClientRect = () => ({
          x: 0,
          y: index * 100,
          left: 0,
          right: 300,
          top: index * 100,
          bottom: index * 100 + 80,
          width: 300,
          height: 80,
        });
      });
      const node = row.getDomElement();
      node.dispatchEvent(
        fakeEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 7,
          clientX: 20,
          clientY: 20,
        }),
      );
      arm?.();
      node.dispatchEvent(
        fakeEvent('pointermove', {
          bubbles: true,
          pointerId: 7,
          clientX: 20,
          clientY: 220,
        }),
      );
      assert.equal(
        writes(() =>
          node.dispatchEvent(
            fakeEvent('pointerup', {
              bubbles: true,
              pointerId: 7,
              clientX: 20,
              clientY: 220,
            }),
          ),
        ),
        1,
      );
      assert.deepEqual(team.getMemberUids(), [ids[2], ids[1], ids[0]]);
      assert.equal(panel._cards.get(ids[0]), row);
      assert.equal(
        save.collection.get(ids[0]),
        row._pokemonUid && team.getPokemonByUid(ids[0]),
      );
    } finally {
      globalThis.setTimeout = oldSet;
      globalThis.clearTimeout = oldClear;
      panel.destroy();
    }
  });
  test('sortable drop targeting uses both axes for side-by-side preset cards', () => {
    const a = new UIContainer(),
      b = new UIContainer(),
      handle = new UIButton();
    a.addChild(handle);
    let result;
    const list = new UISortableList({
      onReorder: (...args) => {
        result = args;
      },
    });
    list.setItems([
      { key: 'a', row: a, handle },
      { key: 'b', row: b },
    ]);
    a.getDomElement().getBoundingClientRect = () => ({
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    });
    b.getDomElement().getBoundingClientRect = () => ({
      left: 110,
      right: 210,
      top: 0,
      bottom: 100,
    });
    try {
      handle.getDomElement().dispatchEvent(fakeEvent('pointerdown'));
      handle
        .getDomElement()
        .dispatchEvent(fakeEvent('pointermove', { clientX: 150, clientY: 30 }));
      handle.getDomElement().dispatchEvent(fakeEvent('pointerup'));
      assert.deepEqual(result, ['a', 'b']);
    } finally {
      list.destroy();
    }
  });
  test('the full-screen manager builds all twenty distinct keyed cards', () => {
    fresh('Twenty preset cards');
    presets.saveCurrentToPreset('preset1');
    const panel = new TeamPresetsPanel();
    try {
      panel.open();
      const rows = panel.getDomElement().querySelectorAll('.preset-row');
      assert.equal(rows.length, 20);
      assert.equal(
        new Set(rows.map((row) => row.getAttribute('data-preset-id'))).size,
        20,
      );
      assert.ok(rows[0].querySelector('.preset-chip'));
    } finally {
      panel.close();
      panel.destroy();
    }
  });
  test('manager roster refreshes retain an uncommitted name and the native input node', () => {
    fresh('Stable preset name');
    const panel = new TeamPresetsPanel();
    try {
      panel.open();
      const input = panel.getDomElement().querySelector('.preset-name-input');
      input.focus();
      input.dispatchEvent(fakeEvent('focus'));
      input.value = 'Uncommitted';
      EventBus.getInstance().dispatch(new TeamChangedEvent(1));
      assert.equal(
        panel.getDomElement().querySelector('.preset-name-input'),
        input,
      );
      assert.equal(input.value, 'Uncommitted');
    } finally {
      panel.close();
      panel.destroy();
    }
  });
  test('preset draft edits and closing do not modify saved presets or the canonical party', () => {
    const save = fresh('Discard draft'),
      other = owned();
    presets.saveCurrentToPreset('preset1');
    edit.begin('preset1');
    const before = copy(save.serialize()),
      uid = save.team[0].uid;
    assert.equal(
      writes(() => {
        edit.remove(uid);
        edit.close();
      }),
      0,
    );
    assert.deepEqual(save.serialize(), before);
    assert.ok(save.collection.has(other.uid));
  });
  test('preset selector cancellation, duplicate and foreign results leave the draft intact', () => {
    const save = fresh('Draft selection'),
      p = owned();
    presets.saveCurrentToPreset('preset1');
    edit.begin('preset1');
    edit.requestPokemon(1);
    const pending = { ...edit._pending },
      before = edit.getSnapshot().members;
    EventBus.getInstance().dispatch(
      new BoxPokemonSelectedEvent('foreign', p.uid),
    );
    assert.deepEqual(edit.getSnapshot().members, before);
    EventBus.getInstance().dispatch(
      new BoxPokemonSelectionCancelledEvent(pending.requestId),
    );
    EventBus.getInstance().dispatch(
      new BoxPokemonSelectedEvent(pending.requestId, p.uid),
    );
    assert.deepEqual(edit.getSnapshot().members, before);
    edit.requestPokemon(1);
    EventBus.getInstance().dispatch(
      new BoxPokemonSelectedEvent(edit._pending.requestId, save.team[0].uid),
    );
    assert.deepEqual(edit.getSnapshot().members, before);
  });
  test('a selected preset Pokémon remains the identical collection object and is saved as one UID only', () => {
    const save = fresh('Draft selected UID'),
      p = owned();
    presets.saveCurrentToPreset('preset1');
    edit.begin('preset1');
    edit.requestPokemon(1);
    const count = save.collection.size;
    assert.equal(
      writes(() =>
        EventBus.getInstance().dispatch(
          new BoxPokemonSelectedEvent(edit._pending.requestId, p.uid),
        ),
      ),
      0,
    );
    assert.equal(
      writes(() => assert.ok(edit.save())),
      1,
    );
    assert.deepEqual(presets.getPreset('preset1').members, [
      save.team[0].uid,
      p.uid,
    ]);
    assert.equal(save.collection.get(p.uid), p);
    assert.equal(save.collection.size, count);
    assert.equal(team.isMember(p.uid), false);
  });
  test('the preset removal footer removes a draft reference, never the owned Pokémon', () => {
    const save = fresh('Draft remove footer'),
      p = owned();
    presets.setMembers('preset1', [save.team[0].uid, p.uid]);
    edit.begin('preset1');
    edit.requestPokemon(1);
    EventBus.getInstance().dispatch(
      new BoxPokemonSelectionRemoveRequestedEvent(edit._pending.requestId),
    );
    assert.deepEqual(edit.getSnapshot().members, [save.team[0].uid]);
    assert.ok(save.collection.has(p.uid));
    assert.equal(presets.getPreset('preset1').members.length, 2);
  });
  test('opening a different save invalidates pending preset selectors without cross-save writes', () => {
    const save = fresh('Draft context'),
      p = owned();
    presets.saveCurrentToPreset('preset1');
    edit.begin('preset1');
    edit.requestPokemon(1);
    const request = edit._pending.requestId;
    const second = fresh('Other draft context');
    const before = copy(second.serialize());
    EventBus.getInstance().dispatch(
      new BoxPokemonSelectedEvent(request, p.uid),
    );
    assert.equal(edit.getSnapshot(), null);
    assert.deepEqual(second.serialize(), before);
    assert.ok(second.id !== save.id);
  });
  test('applying edited members is one atomic save and battle refusal preserves both preset and party', () => {
    const save = fresh('Atomic draft apply'),
      p = owned();
    presets.saveCurrentToPreset('preset1');
    assert.equal(
      writes(() => assert.ok(presets.applyMembers('preset1', [p.uid]).ok)),
      1,
    );
    assert.deepEqual(team.getMemberUids(), [p.uid]);
    assert.equal(save.collection.get(p.uid), p);
    BattleSystem.getInstance().startBattle('route1');
    assert.ok(BattleSystem.getInstance().isActive());
    const before = copy(save.serialize());
    assert.equal(
      writes(() =>
        assert.equal(
          presets.applyMembers('preset1', [save.collection.getAll()[0].uid])
            .reason,
          'battle',
        ),
      ),
      0,
    );
    assert.deepEqual(save.serialize(), before);
    BattleSystem.getInstance().endBattle(false);
  });
  test('the editor builds full shared cards, preserves the empty slot, and closes without implicit saving', () => {
    const save = fresh('Full editor'),
      p = owned();
    presets.setMembers('preset1', [save.team[0].uid, p.uid]);
    const modal = new TeamPresetEditorModal();
    try {
      modal.open({ presetId: 'preset1' });
      assert.equal(modal._list.getChildren().length, 2);
      assert.equal(
        modal.getDomElement().querySelectorAll('.poke-moves').length,
        2,
      );
      assert.ok(modal._add.isVisible());
      const before = copy(presets.getPreset('preset1'));
      edit.remove(p.uid);
      modal.close();
      assert.deepEqual(presets.getPreset('preset1'), before);
    } finally {
      modal.destroy();
    }
  });
  test('a resting boxed Pokémon is not falsely greyed out and its real HP never changes', () => {
    fresh('Resting card');
    const p = owned();
    p.hp = 0;
    const before = copy(p.serialize()),
      card = new TeamPresetMemberCard();
    try {
      card.setEntry({ uid: p.uid, index: 0, pokemon: p, source: 'box' });
      assert.equal(card.getDomElement().classList.contains('fainted'), false);
      assert.equal(card._hpBar.getPercent(), 100);
      assert.deepEqual(p.serialize(), before);
    } finally {
      card.destroy();
    }
  });
  test('all three helper sectors retain visible price facts for poor and still-locked recruits', () => {
    const save = fresh('Visible helper quotes');
    for (const id of ['money', 'questPoint', 'diamond'])
      save.currencies.add(id, -save.currencies.get(id));
    for (const sector of ['mine', 'training', 'hatchery'])
      for (const model of FacilityStaffSystem.getInstance().getSnapshot(
        sector,
      )) {
        const card = new StaffCard(model);
        try {
          assert.ok(card._quote.isVisible());
          assert.ok(card._price.isVisible());
          assert.equal(card._price.getParent(), card._quote);
          assert.equal(card._button.isVisible(), false);
          assert.ok(
            card
              .getDomElement()
              .textContent.includes(String(model.cost).slice(0, 1)),
          );
        } finally {
          card.destroy();
        }
      }
  });
  test('the training panel omits the unrequested parallel-session introduction', () => {
    fresh('No training intro');
    const panel = new TrainingCenterPanel(DashboardColumns.RIGHT);
    try {
      assert.ok(
        !panel
          .getDomElement()
          .textContent.includes(t('training_parallel_hint')),
      );
    } finally {
      panel.destroy();
    }
  });
  test('Location alcoves are a separate section after encounters, not generic action tiles', () => {
    const save = fresh('Location section');
    hoenn(save);
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    try {
      const root = panel.getDomElement();
      assert.equal(
        root.querySelector('.pw-loc-alcove-list').children.length,
        2,
      );
      assert.equal(
        root
          .querySelector('.pw-loc-action-grid')
          .querySelectorAll('[data-secret-base-layout]').length,
        0,
      );
      assert.equal(
        root.querySelector('.pw-loc-alcove-row').querySelectorAll('button')
          .length,
        2,
      );
    } finally {
      panel.destroy();
    }
  });
  test('Location base controls stay alive during KO refreshes and first establishment creates one genuine base', () => {
    const save = fresh('Stable alcove controls');
    hoenn(save);
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    try {
      const row = panel._alcoves._rows.getChildren()[0],
        button = row.getChildren()[1].getDomElement();
      panel._render();
      assert.equal(panel._alcoves._rows.getChildren()[0], row);
      assert.equal(row.getChildren()[1].getDomElement(), button);
      assert.equal(
        writes(() => panel._alcoves._establish('tree_1')),
        1,
      );
      assert.equal(save.secretBase.layoutId, 'tree_1');
      assert.ok(
        panel.getDomElement().textContent.includes(t('location_alcoves_enter')),
      );
    } finally {
      panel.destroy();
    }
  });
  test('a relocation prompt is lossless on cancellation and keeps its controls across unrelated Location refreshes', () => {
    const save = fresh('Alcove relocation');
    hoenn(save);
    base.establish('route101', 'tree_1');
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    try {
      const before = copy(save.secretBase.serialize());
      panel._alcoves._establish('bush_1');
      assert.ok(panel._alcoves._confirm.isOpen());
      panel._render();
      assert.ok(panel._alcoves._confirm.isOpen());
      panel._alcoves._confirm.close();
      assert.deepEqual(save.secretBase.serialize(), before);
    } finally {
      panel.destroy();
    }
  });
});
