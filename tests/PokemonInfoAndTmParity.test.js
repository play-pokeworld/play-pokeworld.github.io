/**
 * @file PokemonInfoAndTmParity.test.js
 * @brief Tests for PokemonInfoModal visual and functional parity with main,
 * as well as TM/HM learnability filtering in Bag and BoxPanel.
 */
import { describe, assert } from './TestRunner.js';
import { fakeEvent } from './FakeDom.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { PokemonInfoModal } from '../src/panels/PokemonInfoModal.js';
import { PokemonMoveLearningModal } from '../src/panels/PokemonMoveLearningModal.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { BagPanel } from '../src/panels/fullscreen/BagPanel.js';
import { BagCategoryIds } from '../src/config/BagCategories.js';
import { MoveLearningSystem } from '../src/systems/MoveLearningSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { t } from '../src/localization/LocalizationManager.js';
import { setRoster } from './RosterFixtures.js';

const saves = SaveSystem.getInstance();

describe('PokemonInfoModal and TM/HM parity', (test) => {
  test('PokemonInfoModal hero, stat tabs and section grid match main layout and strip HP/EXP bars', () => {
    const save = saves.createNewSave('Info parity test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 25);
    pikachu.shiny = true;
    setRoster(save, [pikachu]);
    saves.setCurrentSave(save);

    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemonUid: pikachu.uid });
      const dom = modal.getDomElement();

      // Header checks
      const title = dom.querySelector('.pw-win-hdr-title') || dom.querySelector('.poke-detail-title');
      assert.ok(title, 'Header has title');
      assert.ok(title.textContent.includes('Pikachu'), 'Title contains Pokémon name');
      assert.ok(title.textContent.includes('#25'), 'Dex id is present in title');
      assert.ok(title.textContent.includes('★'), 'Shiny tag is rendered in title');
      assert.equal(modal.getSize(), 'md', 'Modal uses medium size (md)');

      // Hero checks
      const hero = dom.querySelector('.poke-detail-hero');
      assert.ok(hero, 'Hero container exists');
      assert.ok(hero.querySelector('.poke-detail-name-row'), 'Name and level row is present');
      assert.ok(hero.querySelector('.poke-detail-location'), 'Location row is present');
      assert.ok(hero.querySelector('.poke-detail-sprite-card'), 'Sprite card is present');
      const spriteWrap = hero.querySelector('.pw-poke-circle-wrap');
      assert.ok(spriteWrap?.classList.contains('pw-poke-circle-wrap--hero'), 'Hero sprite uses 132px hero circle wrap');
      assert.ok(hero.querySelector('.poke-detail-types'), 'Types container is present');
      assert.ok(hero.querySelector('.poke-detail-shiny-toggle'), 'Shiny toggle button is present');
      assert.ok(hero.querySelector('.poke-protection-actions'), 'Protection actions container is present');

      // Unwanted bars are removed from hero
      assert.equal(hero.querySelector('.hp-bar'), null, 'HP progress bar is not in hero');
      assert.equal(hero.querySelector('.xp-bar'), null, 'XP progress bar is not in hero');

      // Stat panel checks (no redundant h3)
      const statPanel = dom.querySelector('.poke-detail-stat-panel');
      assert.ok(statPanel, 'Stat panel exists');
      assert.equal(statPanel.querySelector('h3'), null, 'Stat panel has no redundant h3 heading');
      const statRows = statPanel.querySelectorAll('.poke-detail-stat-row');
      assert.equal(statRows.length, 6, 'Six stat rows are rendered');

      // Section grid layout: talent, rank, and evos only (no held item panel)
      const grid = dom.querySelector('.poke-detail-section-grid');
      assert.ok(grid, 'Section grid exists');
      const panels = grid.querySelectorAll('.poke-detail-panel');
      assert.equal(panels.length, 3, 'Exactly three panels exist: talent, rank and evolutions');
      assert.equal(dom.querySelector('.poke-detail-held'), null, 'Held item section does not exist on Pokémon sheet');
      assert.ok(dom.querySelector('.poke-detail-panel-wide'), 'Evolutions panel spans wide');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
    }
  });

  test('Move replacement flow on Pokémon sheet: selection, cancel, and replacement', () => {
    const save = saves.createNewSave('Move replacement test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 25);
    // Give Pikachu 4 moves
    pikachu.moves = ['thunder_shock', 'quick_attack', 'thunder_wave', 'tackle'];
    // Unlock swift as learnable move
    pikachu.unlockMove('swift');
    setRoster(save, [pikachu]);
    saves.setCurrentSave(save);

    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemonUid: pikachu.uid });
      const dom = modal.getDomElement();

      // Because Pikachu has 4 moves, learnable moves are locked by default
      const learnRows = [...dom.querySelectorAll('.poke-detail-learnable-row')];
      assert.ok(dom.textContent.includes(t('select_move_first')), 'Displays 4/4 replacement hint');
      assert.equal(dom.querySelectorAll('.poke-detail-learnable-row .pw-button').length, 0, 'No + button in learnable rows');
      assert.ok(learnRows.every((r) => r.classList.contains('locked')), 'Learnable rows are locked when full');

      // Click on slot 1 ('quick_attack') to select it for replacement
      const currentList = dom.querySelector('.current');
      const knownRows = currentList.querySelectorAll('.poke-detail-move-row');
      assert.equal(knownRows.length, 4, 'Four known moves rendered');
      knownRows[1].click();

      // Now slot 1 should be selected
      assert.equal(modal._replaceSlot, 1, 'Slot 1 is armed for replacement');
      const updatedDom = modal.getDomElement();
      const updatedKnownRows = updatedDom.querySelector('.current').querySelectorAll('.poke-detail-move-row');
      assert.ok(updatedKnownRows[1].classList.contains('selected'), 'Slot 1 row has selected class');
      assert.ok(updatedKnownRows[1].textContent.includes(t('replacement_badge')), 'Slot 1 displays replacement badge');

      // Cancel button should now be visible in moves title
      const cancelBtn = updatedDom.querySelector('.poke-detail-moves-title').querySelector('.poke-detail-mini-btn');
      assert.ok(cancelBtn, 'Cancel button is visible when replacement slot is active');

      // Learnable moves should now be active
      const learnList = updatedDom.querySelector('.learn');
      const activeLearnRows = learnList.querySelectorAll('.clickable');
      assert.ok(activeLearnRows.length > 0, 'Learnable rows become clickable');

      // Click learnable row for swift to replace slot 1
      const swiftRow = [...learnList.querySelectorAll('.poke-detail-move-row')].find((r) => r.textContent.includes('Météores'));
      assert.ok(swiftRow, 'Swift move row found');
      swiftRow.click();
      assert.equal(modal._replaceSlot, null, 'Replacement slot resets to null');
      assert.ok(pikachu.moves.includes('swift'), 'Swift is now learned by Pikachu');
      assert.equal(pikachu.moves[1], 'swift', 'Swift replaced slot 1');
      assert.equal(pikachu.moves.length, 4, 'Pikachu still has exactly 4 moves');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
    }
  });

  test('Move swapping interaction between equipped moves on Pokémon sheet', () => {
    const save = saves.createNewSave('Move swap test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 25);
    pikachu.moves = ['thunder_shock', 'quick_attack', 'thunder_wave', 'tackle'];
    setRoster(save, [pikachu]);
    saves.setCurrentSave(save);

    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemonUid: pikachu.uid });
      const dom = modal.getDomElement();
      const currentList = dom.querySelector('.current');
      const knownRows = currentList.querySelectorAll('.poke-detail-move-row');

      // Click slot 0 ('thunder_shock'), then click slot 1 ('quick_attack') -> swaps them!
      knownRows[0].click();
      assert.equal(modal._replaceSlot, 0, 'Slot 0 is armed for replacement/swap');

      const updatedRows = modal.getDomElement().querySelector('.current').querySelectorAll('.poke-detail-move-row');
      updatedRows[1].click();
      assert.equal(modal._replaceSlot, null, 'Slot reset to null after swap');
      assert.equal(pikachu.moves[0], 'quick_attack', 'Slot 0 is now quick_attack');
      assert.equal(pikachu.moves[1], 'thunder_shock', 'Slot 1 is now thunder_shock');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
    }
  });

  test('Right-clicking known or learnable moves opens Dictionary detail modal', () => {
    const save = saves.createNewSave('Move info test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 25);
    pikachu.moves = ['thunder_shock'];
    pikachu.unlockMove('swift');
    setRoster(save, [pikachu]);
    saves.setCurrentSave(save);

    let modalRequests = [];
    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      modalRequests.push(event);
    });

    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemonUid: pikachu.uid });
      const dom = modal.getDomElement();

      // Right-click known move
      const knownRow = dom.querySelector('.current').querySelector('.poke-detail-move-row');
      assert.ok(knownRow, 'Known move row exists');
      knownRow.dispatchEvent(fakeEvent('contextmenu', { bubbles: true, cancelable: true }));

      assert.ok(modalRequests.some((req) => req.modalId === ModalIds.DICTIONARY_DETAIL && req.params.id === 'thunder_shock'),
        'Right clicking known move opens Dictionary detail for thunder_shock');

      // Right-click learnable move
      modalRequests = [];
      const learnRow = dom.querySelector('.learn').querySelector('.poke-detail-move-row');
      assert.ok(learnRow, 'Learnable move row exists');
      learnRow.dispatchEvent(fakeEvent('contextmenu', { bubbles: true, cancelable: true }));

      assert.ok(modalRequests.some((req) => req.modalId === ModalIds.DICTIONARY_DETAIL),
        'Right clicking learnable move opens Dictionary detail');
    } finally {
      unsubscribe();
      if (modal.isOpen()) modal.close();
      modal.destroy();
    }
  });

  test('TM/HM learnability rules strictly filter species compatibility', () => {
    const moveLearning = MoveLearningSystem.getInstance();
    const pikachu = PokemonFactory.create('pikachu', 20);
    const bulbasaur = PokemonFactory.create('bulbasaur', 20);
    const squirtle = PokemonFactory.create('squirtle', 20);

    // Surf (cs03_surf): Water type move
    assert.equal(moveLearning.canUnlockWithItem('cs03_surf', squirtle), true, 'Squirtle can learn Surf');
    assert.equal(moveLearning.canUnlockWithItem('cs03_surf', pikachu), false, 'Pikachu cannot learn Surf');
    assert.equal(moveLearning.canUnlockWithItem('cs03_surf', bulbasaur), false, 'Bulbasaur cannot learn Surf');

    // Cut (cs01_cut): Normal / Grass move
    assert.equal(moveLearning.canUnlockWithItem('cs01_cut', bulbasaur), true, 'Bulbasaur can learn Cut');
    assert.equal(moveLearning.canUnlockWithItem('cs01_cut', pikachu), false, 'Pikachu cannot learn Cut');

    // Toxic (ct06_toxic): Compatible with all
    assert.equal(moveLearning.canUnlockWithItem('ct06_toxic', pikachu), true, 'Pikachu can learn Toxic');
    assert.equal(moveLearning.canUnlockWithItem('ct06_toxic', bulbasaur), true, 'Bulbasaur can learn Toxic');
    assert.equal(moveLearning.canUnlockWithItem('ct06_toxic', squirtle), true, 'Squirtle can learn Toxic');
  });

  test('BagPanel displays CT/CS items with proper suffix in item name', () => {
    const save = saves.createNewSave('Bag CT suffix test', 'pikachu');
    save.inventory.add('cs03_surf', 1, { deferSave: true });
    save.inventory.add('ct06_toxic', 1, { deferSave: true });
    saves.setCurrentSave(save);

    const bag = new BagPanel();
    try {
      bag.open();
      bag._setCategory(BagCategoryIds.TM_HM);
      const dom = bag.getDomElement();
      const names = [...dom.querySelectorAll('.inv-name')].map((el) => el.textContent);
      assert.ok(names.some((name) => name.includes('Surf CS')), 'Surf displays with CS suffix in bag');
      assert.ok(names.some((name) => name.includes('Toxik CT')), 'Toxik displays with CT suffix in bag');
    } finally {
      if (bag.isOpen()) bag.close();
      bag.destroy();
    }
  });

  test('BoxPanel in TM/HM item use mode filters out incompatible Pokémon and shows instruction', () => {
    const save = saves.createNewSave('Box TM filter test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 20);
    const bulbasaur = PokemonFactory.create('bulbasaur', 20);
    const squirtle = PokemonFactory.create('squirtle', 20);
    setRoster(save, [pikachu, bulbasaur], [squirtle]);
    save.inventory.add('cs03_surf', 2, { deferSave: true });
    saves.setCurrentSave(save);

    const box = new BoxPanel();
    try {
      box.open({ itemUseId: 'cs03_surf' });
      const dom = box.getDomElement();

      // Title should show Teaching Surf (CS)
      assert.ok(box.getTitle().includes('Surf (CS)'), 'Box title displays teaching Surf (CS)');
      assert.ok(box.getTitle().includes('2'), 'Box title displays quantity 2');

      // Instruction should name Surf
      const instruction = dom.querySelector('.pw-box-instruction')?.textContent ?? '';
      assert.ok(instruction.includes('Surf'), 'Instruction text references Surf');

      // Grid entries: only Squirtle is compatible with Surf!
      const entries = [...dom.querySelectorAll('.pw-box-pokemon-tile')];
      assert.equal(entries.length, 1, 'Only compatible Pokémon (Squirtle) is offered');
      assert.equal(entries[0].getAttribute('data-species-id'), 'squirtle', 'Offered Pokémon is Squirtle');

      // Teach Surf to Squirtle
      box._handleItemUse(squirtle.uid);
      assert.ok(squirtle.unlockedMoves.includes('surf'), 'Surf is now unlocked for Squirtle');
      assert.equal(save.inventory.count('cs03_surf'), 1, 'Inventory count decremented to 1');

      // With 1 remaining copy, BoxPanel stays open, but Squirtle has already unlocked Surf,
      // and Pikachu & Bulbasaur are incompatible, so 0 compatible Pokémon remain!
      assert.ok(box.isOpen(), 'BoxPanel remains open while items remain');
      const emptyState = dom.querySelector('.pw-empty-state-md');
      assert.ok(emptyState, 'Empty state displayed when no more compatible Pokémon exist');
      assert.ok(emptyState.textContent.includes(t('no_pokemon_found')), 'Empty state displays no_pokemon_found message');
    } finally {
      if (box.isOpen()) box.close();
      box.destroy();
    }
  });

  test('Talent dropdown options display rarity labels [Commun], [Peu commun], [Rare] and has no useless frame', () => {
    const save = saves.createNewSave('Talent rarity test', 'eevee');
    const eevee = PokemonFactory.create('eevee', 20);
    setRoster(save, [eevee]);
    saves.setCurrentSave(save);

    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemonUid: eevee.uid });
      const dom = modal.getDomElement();

      // No useless frame around dropdown
      assert.equal(dom.querySelector('.pw-card-83'), null, 'No useless card frame around talent dropdown');

      const talentSelect = dom.querySelector('[data-focus-key="pokemon-info-talent"]') || dom.querySelector('select');
      assert.ok(talentSelect, 'Talent dropdown select exists');
      const options = [...talentSelect.querySelectorAll('option')];
      assert.ok(options.length > 0, 'Talent select has options');
      // Options should have rarity labels like [Commun], [Peu commun], or [Rare]
      assert.ok(options.some((opt) => /\[(Commun|Peu commun|Rare)\]/.test(opt.textContent)),
        'Talent option text includes rarity label');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
    }
  });

  test('Learnable moves modal displays 3 categories with titles, ratio header, single footer button, and closes leaving Pokemon sheet open', () => {
    const save = saves.createNewSave('Learnable view test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 25);
    setRoster(save, [pikachu]);
    saves.setCurrentSave(save);

    let modalRequests = [];
    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      modalRequests.push(event);
    });

    const infoModal = new PokemonInfoModal();
    const learnModal = new PokemonMoveLearningModal();
    try {
      infoModal.open({ pokemonUid: pikachu.uid });
      const dom = infoModal.getDomElement();

      // Click "Voir toutes les capacités" button
      const viewAllBtn = dom.querySelector('.poke-detail-full-list-btn');
      assert.ok(viewAllBtn, 'View all learnable moves button is present');
      viewAllBtn.click();

      assert.ok(modalRequests.some((req) => req.modalId === ModalIds.MOVE_LEARN && req.params.pokemonUid === pikachu.uid),
        'Clicking view all learnable moves requests MOVE_LEARN modal with pokemonUid');

      // Open the learnable moves modal (stacks on top)
      learnModal.open({ pokemonUid: pikachu.uid });
      assert.ok(learnModal.isOpen(), 'Learnable moves modal is open');
      assert.ok(infoModal.isOpen(), 'Pokemon info modal remains open underneath');
      assert.equal(learnModal.getSize(), 'md', 'Learnable moves modal uses medium size (md)');

      const movesViewDom = learnModal.getDomElement();

      // Header ratio
      const countEl = movesViewDom.querySelector('.pw-win-hdr-subtitle');
      assert.ok(countEl, 'Header possesses count ratio element');
      assert.ok(/\d+\/\d+/.test(countEl.textContent), 'Header ratio displays X/Y format');

      // 3 Categories with clear titles
      const sections = movesViewDom.querySelectorAll('.poke-detail-moves-section');
      assert.equal(sections.length, 3, 'Three move categories are displayed (Niveau, CT/CS, Entraînement)');
      const titles = [...movesViewDom.querySelectorAll('.poke-detail-moves-title')].map((el) => el.textContent);
      assert.ok(titles.some((t) => t.includes('Niveau')), 'Level section has clear title with count');
      assert.ok(titles.some((t) => t.includes('CT/CS')), 'CT/CS section has clear title with count');
      assert.ok(titles.some((t) => t.includes('Entraînement')), 'Training section has clear title with count');

      // Footer with strictly ONE single button: "Retour au Pokémon"
      const footer = movesViewDom.querySelector('.pw-panel-footer');
      assert.ok(footer, 'Canonical UIPanel footer container is present');
      const footerButtons = footer.querySelectorAll('button');
      assert.equal(footerButtons.length, 1, 'Strictly ONE button exists in the footer');
      assert.ok(footerButtons[0].textContent.includes(t('back_to_pokemon')), 'Footer button is Retour au Pokémon');

      // Close button (la croix) closes ONLY the learnable moves modal, leaving Pokemon info modal underneath
      const closeBtn = movesViewDom.querySelector('.pw-modal-close-btn');
      assert.ok(closeBtn, 'Close button exists in header');
      closeBtn.click();

      assert.equal(learnModal.isOpen(), false, 'Learnable moves modal is closed');
      assert.equal(infoModal.isOpen(), true, 'Pokemon info modal remains open underneath');
    } finally {
      unsubscribe();
      if (learnModal.isOpen()) learnModal.close();
      if (infoModal.isOpen()) infoModal.close();
      learnModal.destroy();
      infoModal.destroy();
    }
  });
});
