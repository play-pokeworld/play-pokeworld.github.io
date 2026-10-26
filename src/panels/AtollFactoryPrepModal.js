/**
 * @file AtollFactoryPrepModal.js
 * @brief Rental team organization modal for Battle Factory: reorder Pokémon and move slots before battle.
 */

import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { ModalIds } from '../config/ModalIds.js';
import { AtollSystem } from '../systems/AtollSystem.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { AtollStateChangedEvent } from '../core/events/AtollStateChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class AtollFactoryPrepModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.ATOLL_FACTORY_PREP,
      title: t('atoll_factory_run_title'),
      size: 'lg',
      name: 'AtollFactoryPrepModal'
    });
    this.setBodyClass('pw-atoll-prep-modal-body');

    this.listen(AtollStateChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const atollSys = AtollSystem.getInstance();
    const run = atollSys.getFactoryRun();

    if (!run || !Array.isArray(run.team) || !run.team.length) {
      this.addChild(new UIText({
        tagName: 'div',
        className: 'pw-empty-state-lg',
        text: t('atoll_factory_broken')
      }));
      return;
    }

    const mode = atollSys.getMode(run.modeKey) || {};
    this.setTitle(`${t('atoll_factory_run_title')} · ${t('atoll_factory_run_streak', { streak: run.streak || 0, mode: t(mode.label || '') })}`);

    // Instruction hint
    this.addChild(new UIText({
      tagName: 'small',
      className: 'atoll-prep-hint',
      text: t('atoll_factory_prep_hint')
    }));

    // Cards Grid
    const teamGrid = new UIContainer({ id: 'atoll-prep-body', className: 'pw-team-modal-grid team-view' });
    const moveDb = MoveDB.getInstance();

    run.team.forEach((entry, pokeIdx) => {
      const species = PokemonDB.getInstance().getById(entry.species);
      const name = species ? t(species.getNameKey()) : entry.species;

      const card = new UIContainer({ className: 'pw-team-modal-card' });

      // Header row
      const head = new UIContainer({ className: 'pw-team-modal-header' });
      head.addChild(new UIPokemonSprite({
        species: entry.species,
        alt: name,
        size: PokemonSpriteSizes.STANDARD,
        className: 'pw-team-modal-img'
      }));

      const nameCol = new UIContainer({ className: 'pw-team-modal-info' });
      nameCol.addChild(new UIText({ tagName: 'b', text: name }));
      nameCol.addChild(new UIText({ tagName: 'span', className: 'pw-text-sm pw-light1', text: `Nv.${entry.level || 100}` }));
      head.addChild(nameCol);

      // Reorder buttons for Pokémon
      const reorderPoke = new UIContainer({ className: 'pw-btn-group' });
      if (pokeIdx > 0) {
        reorderPoke.addChild(new UIButton({
          variant: 'hbtn',
          text: '↑',
          onClick: () => atollSys.swapFactoryPokemon(pokeIdx, pokeIdx - 1)
        }));
      }
      if (pokeIdx < run.team.length - 1) {
        reorderPoke.addChild(new UIButton({
          variant: 'hbtn',
          text: '↓',
          onClick: () => atollSys.swapFactoryPokemon(pokeIdx, pokeIdx + 1)
        }));
      }
      head.addChild(reorderPoke);
      card.addChild(head);

      // Moves list
      const movesContainer = new UIContainer({ className: 'pw-team-modal-moves' });
      const moves = entry.moves || [];
      moves.forEach((moveEntry, moveIdx) => {
        const moveId = typeof moveEntry === 'string' ? moveEntry : moveEntry.id;
        const move = moveDb.getById(moveId);
        const moveRow = new UIContainer({ className: 'poke-move' });

        moveRow.addChild(new UIText({
          tagName: 'span',
          className: 'pw-move-name',
          text: move ? t(`move.${move.id}`) : moveId
        }));

        const moveReorder = new UIContainer({ className: 'pw-btn-group' });
        if (moveIdx > 0) {
          moveReorder.addChild(new UIButton({
            variant: 'hbtn',
            text: '↑',
            onClick: () => atollSys.swapFactoryMoves(pokeIdx, moveIdx, moveIdx - 1)
          }));
        }
        if (moveIdx < moves.length - 1) {
          moveReorder.addChild(new UIButton({
            variant: 'hbtn',
            text: '↓',
            onClick: () => atollSys.swapFactoryMoves(pokeIdx, moveIdx, moveIdx + 1)
          }));
        }
        moveRow.addChild(moveReorder);
        movesContainer.addChild(moveRow);
      });
      card.addChild(movesContainer);

      teamGrid.addChild(card);
    });

    this.addChild(teamGrid);

    // Bottom Action Bar
    const actions = new UIContainer({ className: 'pw-btn-group' });
    actions.addChild(new UIButton({
      variant: 'hbtn pw-btn-positive',
      text: t('atoll_factory_continue'),
      onClick: () => {
        this.close();
        atollSys.startBattle(run.modeKey);
      }
    }));
    actions.addChild(new UIButton({
      variant: 'hbtn pw-btn-danger',
      text: t('atoll_factory_abandon'),
      onClick: () => {
        atollSys.abandonFactoryRun();
        this.close();
      }
    }));
    this.addChild(actions);

    // Reorganization notice note
    this.addChild(new UIText({
      tagName: 'small',
      className: 'atoll-prep-note',
      text: t('atoll_factory_reorg_hint', { pct: 25 })
    }));
  }
}
