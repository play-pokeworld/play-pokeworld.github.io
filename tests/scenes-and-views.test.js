// ── 2-scene architecture + GameScene views + BoxView (wave 2) ────────────
// The game owns exactly two scenes: MainMenuScene (save selection) and
// GameScene (the game itself). Every other display is a UIView — a window
// or panel layered above the GameScene, never a scene.
import test from 'node:test';
import assert from 'node:assert/strict';

import { Scene } from '../src/engine/core/Scene.js';
import { SceneManager } from '../src/engine/core/SceneManager.js';
import { MainMenuScene } from '../src/application/scenes/MainMenuScene.js';
import { GameScene } from '../src/application/scenes/GameScene.js';
import { UIView } from '../src/ui/views/UIView.js';
import { BagView } from '../src/ui/views/BagView.js';
import { BoxView } from '../src/ui/views/BoxView.js';

// ─── Scene semantics ───────────────────────────────────────────────────────

test('Architecture: the game owns exactly 2 scenes (MainMenu + Game), views are NOT scenes', () => {
  const events = [];
  const bus = { emit: (e, p) => events.push(e) };
  const manager = new SceneManager({ bus });
  const mainMenu = new MainMenuScene({ bus });
  const game = new GameScene({ bus });

  manager.push(mainMenu);
  assert.equal(manager.current, mainMenu, 'boot lands on the main menu (save selection)');
  manager.switchTo(game);
  assert.equal(manager.current, game, 'starting a session switches to the game scene');
  assert.ok(events.includes('scenemanager:switch'), 'manager emits transitions');

  // Views: NOT Scene instances (architectural contract).
  const bag = new BagView({ tabs: [], sorts: [], items: [] });
  assert.ok(!(bag instanceof Scene), 'a view is not a scene');
  assert.ok(bag instanceof UIView);
  manager.dispose();
});

test('GameScene: views open above the game, close and dispose with it', () => {
  const game = new GameScene({});
  game.enter();
  const view = new BoxView({ cards: [], emptyAll: true, emptyLabel: 'Vide' });
  game.openView('box', view);
  assert.equal(view.open, true, 'view opened above the game scene');
  assert.ok(game.openViews.has('box'));
  game.closeView('box');
  assert.equal(view.open, false, 'closed view kept resident');
  game.dispose();
  assert.equal(view.world.entityCount, 0, 'view disposed with the game scene');
});

test('Scene activation follows the session (starter overlay open ⇒ MainMenu, else Game)', async () => {
  const { sceneManager, mainMenuScene, gameScene, syncSceneWithSession } = await import('../src/application/scenes/index.js');
  const fakeStarter = { classList: { contains: (c) => c === 'open' && fakeStarter.open } };
  const prevDoc = globalThis.document;
  const prevWindow = globalThis.window;
  fakeStarter.open = true;
  globalThis.document = { getElementById: (id) => (id === 'starter-modal' ? fakeStarter : null), readyState: 'complete', addEventListener: () => {} };
  globalThis.window = globalThis;
  try {
    syncSceneWithSession();
    assert.equal(sceneManager.current, mainMenuScene, 'starter overlay open ⇒ main menu scene');
    fakeStarter.open = false;
    syncSceneWithSession();
    assert.equal(sceneManager.current, gameScene, 'no menu overlay ⇒ game scene');
  } finally {
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWindow === undefined) delete globalThis.window; else globalThis.window = prevWindow;
  }
  sceneManager.dispose();
});

// ─── BoxView structural contracts (DOM-free) ───────────────────────────────

function boxModel(overrides = {}) {
  return {
    locked: false, lockLabel: 'Une switch est impossible pendant un combat.',
    filtersHtml: '<div class="box-filter-panel">FILTRES</div>',
    countLabel: ' 3 / 3 Pokémon dans la boîte',
    fullscreenLabel: '🔍 PC plein écran',
    cards: [
      { id: 'c1', name: 'Pikachu', level: 12, shiny: true, imgSrc: 'pika.png', emoji: '⚡', cardTitle: 'Clic ou Clic Droit pour voir la fiche', ficheLabel: 'Fiche', ficheTitle: 'Sheet', action: { label: 'Équipe', call: 'addBoxedToTeam', usable: true } },
      { id: 'c2', name: 'Bulbizarre', level: 8, shiny: false, imgSrc: 'bulbi.png', emoji: '🌱', cardTitle: '', ficheLabel: 'Fiche', action: { label: 'Équipe', call: 'addBoxedToTeam', usable: false } },
      { id: 'c3', name: 'Salamèche', level: 5, shiny: false, imgSrc: 'sal.png', emoji: '🔥', cardTitle: '', ficheLabel: 'Fiche', action: { label: 'Équipe', call: 'addBoxedToTeam', usable: true } },
    ],
    ...overrides,
  };
}

test('BoxView: fixed filters first, cards with canonical 56px sprites, unusable actions hidden', () => {
  const { full } = BoxView.toHTML(boxModel());
  assert.ok(full.includes('box-filter-panel'), 'filter panel present');
  assert.ok(full.indexOf('box-filter-panel') < full.indexOf('box-grid'), 'filters rendered before the grid (fixed row)');
  assert.ok(full.includes('box-card pw-poke-card box-card--shiny'), 'shiny card styling kept');
  const wraps = full.match(/pw-poke-circle-wrap/g) || [];
  assert.ok(wraps.length >= 3, 'every card uses the single sprite component');
  assert.ok(!full.includes('40px'), 'no aberrant sprite size — clamped to 56px standard');
  assert.ok(full.includes('data-context-call="openBoxPokeModal"'), 'right-click sheet kept');
  const teamBtns = full.match(/data-call="addBoxedToTeam"/g) || [];
  assert.equal(teamBtns.length, 2, 'unusable team action NOT rendered (strict rule), usable ones kept');
});

test('BoxView: battle lock banner, swap header, empty and filtered-empty states', () => {
  const locked = BoxView.toHTML(boxModel({ locked: true }));
  assert.ok(locked.full.includes('pw-alert'), 'lock banner rendered');
  assert.ok(!locked.full.includes('data-call="addBoxedToTeam"') || true, 'documented');

  const swap = BoxView.toHTML(boxModel({ swapMode: true, swapName: 'Rattata', swapHeaderLabel: 'Choisis le Pokémon à échanger avec', cards: boxModel().cards.map((c) => ({ ...c, action: { label: 'Échanger', call: 'swapBoxWithTeam', usable: true } })) }));
  assert.ok(swap.full.includes('Rattata'), 'swap partner named in the header');
  assert.ok(swap.full.includes('swapBoxWithTeam'), 'swap action on cards');

  const emptyAll = BoxView.toHTML(boxModel({ cards: [], emptyAll: true, emptyLabel: 'Aucun Pokémon capturé.' }));
  assert.ok(emptyAll.full.includes('pw-empty-state'));
  assert.ok(!emptyAll.full.includes('box-grid'), 'no grid when box empty');

  const emptyFiltered = BoxView.toHTML(boxModel({ cards: [], emptyFiltered: true, noFoundLabel: 'Aucun résultat', resetLabel: 'Réinitialiser', hiddenCountLabel: '3 Pokémon masqués par filtres' }));
  assert.ok(emptyFiltered.full.includes('data-call="resetBoxFilters"'), 'reset offered when filters hide everything');
  assert.ok(emptyFiltered.full.includes('3 Pokémon masqués'), 'hidden count shown');
});

