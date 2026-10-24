/**
 * @file PokemonMoveLearningModal.js
 * @brief Modal displaying the full categorized learnable moves catalog,
 * built as a medium UIPanel / UIModal with standard header, subtitle count,
 * three categorized sections (Niveau, CT/CS, Entraînement), single footer return button,
 * and individual close button leaving the underlying Pokémon sheet open.
 */
import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { ModalIds } from '../config/ModalIds.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { MoveLearnset } from '../data/pokemon/MoveLearnset.js';
import { MoveLearningSystem } from '../systems/MoveLearningSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { BoxSystem } from '../systems/BoxSystem.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { PokemonUsageChangedEvent } from '../core/events/PokemonUsageChangedEvent.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';
import { TextFormatter } from '../core/TextFormatter.js';

export class PokemonMoveLearningModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.MOVE_LEARN,
      title: t('learnable_moves_panel_title'),
      size: 'md',
      bodyClassName: 'pw-pokemon-info-body',
      overlayId: 'poke-learnable-moves-modal',
      overlayClassName: 'pw-move-learning-overlay',
      hasHeader: true,
      hasFooter: true,
      showCloseBtn: true,
      name: 'PokemonMoveLearningModal'
    });
    this._pokemonUid = null;

    // Single return button placed canonically in the UIPanel footer
    this._returnBtn = new UIButton({
      className: 'hbtn poke-detail-mini-btn',
      text: t('back_to_pokemon'),
      onClick: () => this.close()
    });
    this._returnBtn.setAriaLabel(t('back_to_pokemon'));
    this.addFooterChild(this._returnBtn);

    for (const eventClass of [TeamChangedEvent, BoxChangedEvent, PokemonUsageChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    if (typeof params.pokemonUid === 'string') {
      this._pokemonUid = params.pokemonUid;
    }
    super.open(params);
  }

  /** @override @param {Object} [params={}] */
  onEnter(params = {}) {
    super.onEnter(params);
    if (typeof params.pokemonUid === 'string') {
      this._pokemonUid = params.pokemonUid;
    }
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._pokemonUid = null;
  }

  /** @private */
  _render() {
    this.clearChildren();
    const save = SaveSystem.getInstance().getCurrentSave();
    const pokemon = this._pokemonUid
      ? (BoxSystem.getInstance().getPokemonByUid(this._pokemonUid) || TeamSystem.getInstance().getPokemonByUid(this._pokemonUid))
      : TeamSystem.getInstance().getTeam()[0];

    if (!pokemon) {
      this.setTitle(t('learnable_moves_panel_title'));
      this.setSubtitle('');
      this.addChild(new UIText({ tagName: 'p', className: 'poke-detail-empty', text: t('pokemon_info_no_pokemon') }));
      return;
    }

    const isBattleLocked = BattleSystem.getInstance().isActive();
    const types = pokemon.getTypes();
    const levelUpMoveIds = [...MoveLearnset.poolFor(types)];
    const trainingMoveIds = [...MoveLearnset.trainingPoolFor(types)];

    const ctMoveIds = [];
    const itemByMove = new Map();
    for (const item of ItemDB.getInstance().getAll()) {
      if ((item.kind === ItemKinds.TM || item.kind === ItemKinds.HM) && item.move) {
        if (MoveLearningSystem.getInstance().canUnlockWithItem(item.id, pokemon)) {
          if (!ctMoveIds.includes(item.move)) {
            ctMoveIds.push(item.move);
            itemByMove.set(item.move, item.id);
          }
        }
      }
    }

    const sortMoves = (arr) => {
      const moveDb = MoveDB.getInstance();
      arr.sort((a, b) => {
        const ma = moveDb.getById(a);
        const mb = moveDb.getById(b);
        if (!ma || !mb) return 0;
        if (ma.type !== mb.type) return (ma.type || '').localeCompare(mb.type || '');
        return (mb.power || 0) - (ma.power || 0);
      });
    };
    sortMoves(levelUpMoveIds);
    sortMoves(ctMoveIds);
    sortMoves(trainingMoveIds);

    const knownSet = new Set((pokemon.moves || []).map((m) => (typeof m === 'string' ? m : m.id)));
    const maxLevelKnown = MoveLearnset.knownCountAt(pokemon.level);
    const availLevelSet = new Set(levelUpMoveIds.slice(0, maxLevelKnown).filter((id) => !knownSet.has(id)));

    const availCtSet = new Set();
    for (const moveId of ctMoveIds) {
      const itemId = itemByMove.get(moveId);
      if (itemId && !knownSet.has(moveId) && (save?.inventory?.count(itemId) || 0) > 0) {
        availCtSet.add(moveId);
      }
    }

    const availTrainingSet = new Set();
    for (const id of trainingMoveIds) {
      if (!knownSet.has(id) && pokemon.unlockedMoves?.includes(id)) {
        availTrainingSet.add(id);
      }
    }

    const totalPool = [...new Set([...levelUpMoveIds, ...ctMoveIds, ...trainingMoveIds])];
    const totalCount = totalPool.length;
    let knownCount = 0;
    let availCount = 0;
    for (const id of totalPool) {
      if (knownSet.has(id)) knownCount++;
      else if (availLevelSet.has(id) || availCtSet.has(id) || availTrainingSet.has(id)) availCount++;
    }
    const countLabel = `${knownCount + availCount}/${totalCount} ${t('possessed_short')}`;

    // Header title and subtitle on UIPanel chrome
    this.setTitle(t('learnable_moves_panel_title'));
    this.setSubtitle(countLabel);

    const block = new UIContainer({
      className: 'poke-detail-moves-block',
      dataset: { learnablePanel: '1' }
    });

    const createMoveRow = (moveId, isKnown, isAvailable, onLearn) => {
      const move = MoveDB.getInstance().getById(moveId);
      if (!move) return null;
      const typeLabel = t(`type.${move.type}`);
      const nameKey = `move.${moveId}`;
      const name = LocalizationManager.getInstance().has(nameKey) ? t(nameKey) : moveId;
      const power = move.power > 0 ? TextFormatter.formatNumber(move.power) : '-';
      const catLabel = t(`move_category_${move.category}`);

      const stateClass = isKnown ? 'known' : (isAvailable ? 'available clickable' : 'locked');

      const rowChildren = [
        new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: typeLabel }),
        new UIText({ tagName: 'span', className: 'poke-detail-move-name', text: name }),
        new UIText({ tagName: 'span', className: 'poke-detail-move-meta', text: `${power} ${t('power_abbrev')} · ${catLabel}` })
      ];

      if (isKnown) {
        rowChildren.push(new UIText({
          tagName: 'span',
          className: 'poke-detail-pill is-known',
          text: `✓ ${t('move_pill_equipped')}`
        }));
      } else if (isAvailable) {
        rowChildren.push(new UIText({
          tagName: 'span',
          className: 'poke-detail-pill is-learnable',
          text: `✓ ${t('move_pill_available')}`
        }));
      }

      const row = new UIContainer({
        className: `poke-detail-move-row ${stateClass}`,
        children: rowChildren
      });
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('title', isBattleLocked ? t('action_blocked_in_battle') : (isAvailable ? t('click_replace_context_info') : t('context_info_touch')));
      row._setCssVariable('--type-color', `var(--type-${move.type})`);

      if (isAvailable && !isBattleLocked && typeof onLearn === 'function') {
        row.addDomListener('click', () => onLearn());
      }

      row.addDomListener('contextmenu', (e) => {
        e.preventDefault();
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
          kind: 'move',
          id: moveId,
          backLabel: t('modal_close_btn')
        }));
      });

      return row;
    };

    const handleLearn = (moveId) => {
      if (isBattleLocked) {
        NotificationSystem.getInstance().notifyTemporary(t('action_blocked_in_battle'));
        return;
      }
      const currentMoves = pokemon.moves || [];
      if (currentMoves.length < 4) {
        MoveLearningSystem.getInstance().learnMove(pokemon.uid, moveId, null);
        this._render();
      } else {
        this.close();
        NotificationSystem.getInstance().notifyTemporary(t('select_move_first'));
      }
    };

    // Category 1: ★ Niveau (N)
    const levelSection = new UIContainer({ className: 'poke-detail-moves-section' });
    levelSection.addChild(new UIContainer({
      className: 'poke-detail-moves-title',
      children: [
        new UIText({
          tagName: 'span',
          text: `${t('category_level_up')} (${levelUpMoveIds.length})`
        })
      ]
    }));
    const levelRows = levelUpMoveIds.map((id) =>
      createMoveRow(id, knownSet.has(id), availLevelSet.has(id), () => handleLearn(id))
    ).filter(Boolean);
    levelSection.addChild(new UIContainer({
      className: 'poke-detail-moves-list learn',
      children: levelRows.length ? levelRows : [
        new UIText({ tagName: 'div', className: 'poke-detail-empty', text: t('pokemon_info_no_learnable_moves') })
      ]
    }));
    block.addChild(levelSection);

    // Category 2: ◇ CT/CS (N)
    const ctSection = new UIContainer({ className: 'poke-detail-moves-section' });
    ctSection.addChild(new UIContainer({
      className: 'poke-detail-moves-title',
      children: [
        new UIText({
          tagName: 'span',
          text: `${t('category_ct_cs')} (${ctMoveIds.length})`
        })
      ]
    }));
    const ctRows = ctMoveIds.map((id) =>
      createMoveRow(id, knownSet.has(id), availCtSet.has(id), () => handleLearn(id))
    ).filter(Boolean);
    ctSection.addChild(new UIContainer({
      className: 'poke-detail-moves-list learn',
      children: ctRows.length ? ctRows : [
        new UIText({ tagName: 'div', className: 'poke-detail-empty', text: t('pokemon_info_no_learnable_moves') })
      ]
    }));
    block.addChild(ctSection);

    // Category 3: ▽ Entraînement (N)
    const trainingSection = new UIContainer({ className: 'poke-detail-moves-section' });
    trainingSection.addChild(new UIContainer({
      className: 'poke-detail-moves-title',
      children: [
        new UIText({
          tagName: 'span',
          text: `${t('category_training')} (${trainingMoveIds.length})`
        })
      ]
    }));
    const trainingRows = trainingMoveIds.map((id) =>
      createMoveRow(id, knownSet.has(id), availTrainingSet.has(id), () => handleLearn(id))
    ).filter(Boolean);
    trainingSection.addChild(new UIContainer({
      className: 'poke-detail-moves-list learn',
      children: trainingRows.length ? trainingRows : [
        new UIText({ tagName: 'div', className: 'poke-detail-empty', text: t('training_no_moves') })
      ]
    }));
    block.addChild(trainingSection);

    this.addChild(block);
  }
}
