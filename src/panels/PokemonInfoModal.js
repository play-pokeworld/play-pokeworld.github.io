/**
 * @file PokemonInfoModal.js
 * @brief Pokémon sheet with stats, IVs, EVs, move learning, talent and held item.
 * The sheet works on any owned Pokémon (by uid). It shows where the Pokémon is currently used
 * (PokemonUsageSystem) and disables, with their reason, only the actions that usage forbids.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { BoxSystem } from '../systems/BoxSystem.js';
import { MoveLearningSystem } from '../systems/MoveLearningSystem.js';
import { PokemonUsageSystem } from '../systems/PokemonUsageSystem.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { PokemonUsageChangedEvent } from '../core/events/PokemonUsageChangedEvent.js';
import { PokemonActionIds, PokemonActionLockKinds } from '../config/PokemonUsageRules.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { PokemonRules } from '../config/PokemonRules.js';

const STAT_KEYS = PokemonRules.STAT_KEYS;
const STAT_TABS = Object.freeze(['stats', 'ivs', 'evs']);

export class PokemonInfoModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.POKEMON_INFO,
      title: '',
      size: 'lg',
      className: 'poke-detail-inner',
      bodyClassName: 'pw-pokemon-info-body',
      overlayId: 'poke-modal',
      overlayClassName: 'poke-detail-front',
      hasHeader: false,
      showCloseBtn: false,
      name: 'PokemonInfoModal'
    });
    this._teamIndex = 0;
    this._pokemonUid = null;
    this._activeStatTab = 'stats';
    this._pendingFocusKey = null;
    for (const eventClass of [TeamChangedEvent, BoxChangedEvent, PokemonUsageChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    const previousTarget = this._pokemonUid ?? `team:${this._teamIndex}`;
    if (typeof params.pokemonUid === 'string') {
      this._pokemonUid = params.pokemonUid;
    } else {
      this._pokemonUid = null;
      if (Number.isInteger(Number(params.teamIndex))) this._teamIndex = Number(params.teamIndex);
    }
    const nextTarget = this._pokemonUid ?? `team:${this._teamIndex}`;
    if (nextTarget !== previousTarget) {
      this._activeStatTab = 'stats';
      if (this.isOpen()) this._pendingFocusKey = 'pokemon-info-tab-stats';
    }
    if (this.isOpen()) {
      this._render();
      return;
    }
    super.open(params);
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._pokemonUid = null;
  }

  /**
   * @private
   * @param {string} uid
   * @param {'favorite'|'locked'} field
   * @returns {boolean}
   */
  _toggleCollectionFlag(uid, field) {
    const update = (pokemon) => {
      if (pokemon.uid !== uid) return false;
      pokemon[field] = !pokemon[field];
      return true;
    };
    return BoxSystem.getInstance().updatePokemon(uid, update);
  }

  /**
   * Localized reason why an action is unavailable for this Pokémon, or null when it is allowed.
   * @private
   * @param {string} uid
   * @param {string} action - PokemonActionIds value
   * @returns {string|null}
   */
  _actionLockReason(uid, action) {
    const lock = PokemonUsageSystem.getInstance().getActionLock(uid, action);
    if (!lock) return null;
    return lock.kind === PokemonActionLockKinds.REQUIRES
      ? t(`pokemon_action_requires_${lock.usage}`)
      : t(`pokemon_action_locked_${lock.usage}`);
  }

  /** @private @param {string|null} reason @returns {UIText|null} */
  _lockReasonText(reason) {
    return reason ? new UIText({ tagName: 'p', className: 'poke-detail-lock-reason', text: reason }) : null;
  }

  /** @private @param {string} uid @returns {UIContainer} Current location line */
  _renderLocation(uid) {
    const usage = PokemonUsageSystem.getInstance().getPrimaryUsage(uid);
    return new UIContainer({
      className: 'poke-detail-location',
      children: [
        new UIText({ tagName: 'span', className: 'poke-detail-location-label', text: t('pokemon_usage_label') }),
        new UIText({ tagName: 'strong', text: t(usage ? `pokemon_usage_${usage}` : 'pokemon_usage_none') })
      ]
    });
  }

  /** @private @returns {{focusKey:string|null,panelScrollTop:number,panelScrollLeft:number,bodyScrollTop:number,bodyScrollLeft:number}} */
  _captureRenderState() {
    const focusKey = this._pendingFocusKey || this.getFocusedDataKey();
    this._pendingFocusKey = null;
    return {
      focusKey,
      panelScrollTop: Number(this._dom.scrollTop) || 0,
      panelScrollLeft: Number(this._dom.scrollLeft) || 0,
      bodyScrollTop: Number(this._bodyDom?.scrollTop) || 0,
      bodyScrollLeft: Number(this._bodyDom?.scrollLeft) || 0
    };
  }

  /** @private @param {ReturnType<PokemonInfoModal['_captureRenderState']>} state */
  _restoreRenderState(state) {
    if (state.focusKey) this.focusDescendantByDataKey(state.focusKey);
    this._dom.scrollTop = state.panelScrollTop;
    this._dom.scrollLeft = state.panelScrollLeft;
    if (this._bodyDom) {
      this._bodyDom.scrollTop = state.bodyScrollTop;
      this._bodyDom.scrollLeft = state.bodyScrollLeft;
    }
  }

  /** @private @param {'stats'|'ivs'|'evs'} tab */
  _setActiveStatTab(tab) {
    if (!STAT_TABS.includes(tab) || tab === this._activeStatTab) return false;
    this._activeStatTab = tab;
    this._pendingFocusKey = `pokemon-info-tab-${tab}`;
    this._render();
    return true;
  }

  /** @private @param {KeyboardEvent} event @param {'stats'|'ivs'|'evs'} currentTab */
  _handleStatTabKeydown(event, currentTab) {
    const currentIndex = STAT_TABS.indexOf(currentTab);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % STAT_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + STAT_TABS.length - 1) % STAT_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = STAT_TABS.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    this._setActiveStatTab(STAT_TABS[nextIndex]);
  }

  /** @private @param {Object} pokemon @param {Object} stats */
  _renderStatTabs(pokemon, stats) {
    const tabs = new UIContainer({ className: 'poke-detail-stat-tabs' });
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', t('pokemon_info_stat_tabs'));
    const tabLabels = {
      stats: 'pokemon_info_stats',
      ivs: 'pokemon_info_ivs',
      evs: 'pokemon_info_evs'
    };
    for (const tab of STAT_TABS) {
      const active = tab === this._activeStatTab;
      const button = new UIButton({
        className: 'poke-detail-stat-tab',
        variant: active ? 'primary' : 'secondary',
        size: 'sm',
        text: t(tabLabels[tab]),
        onClick: () => this._setActiveStatTab(tab)
      });
      button.setActive(active);
      button.setAttribute('role', 'tab');
      button.setAttribute('id', `pokemon-info-tab-${tab}`);
      button.setAttribute('aria-selected', String(active));
      button.setAttribute('aria-controls', `pokemon-info-stat-panel-${tab}`);
      button.setAttribute('tabindex', active ? '0' : '-1');
      button.setData('focusKey', `pokemon-info-tab-${tab}`);
      button.addDomListener('keydown', (event) => this._handleStatTabKeydown(event, tab));
      tabs.addChild(button);
    }

    const panel = new UIContainer({ className: 'poke-detail-stat-panel active' });
    panel.setId(`pokemon-info-stat-panel-${this._activeStatTab}`);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `pokemon-info-tab-${this._activeStatTab}`);
    panel.setAttribute('tabindex', '0');
    const headingKey = tabLabels[this._activeStatTab];
    panel.addChild(new UIText({ tagName: 'h3', text: t(headingKey) }));

    if (this._activeStatTab === 'stats') {
      const values = STAT_KEYS.map((key) => Number(stats[key]) || 0);
      const max = Math.max(1, ...values);
      for (const [index, key] of STAT_KEYS.entries()) {
        const value = values[index];
        panel.addChild(new UIContainer({
          className: 'poke-detail-stat-row',
          children: [
            new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}`) }),
            new UIProgressBar({
              value,
              max,
              trackClassName: 'poke-detail-stat-bar',
              fillClassName: 'poke-detail-stat-fill'
            }),
            new UIText({ tagName: 'span', className: 'poke-detail-stat-value', text: TextFormatter.formatNumber(value) })
          ]
        }));
      }
    } else {
      const isIv = this._activeStatTab === 'ivs';
      const values = STAT_KEYS.map((key) => Math.max(0, Number(pokemon[isIv ? 'ivs' : 'evs']?.[key]) || 0));
      const max = isIv ? PokemonRules.IV_MAX : PokemonRules.EV_MAX;
      for (const [index, key] of STAT_KEYS.entries()) {
        const value = values[index];
        panel.addChild(new UIContainer({
          className: 'poke-detail-stat-row',
          children: [
            new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}_short`) }),
            new UIProgressBar({
              value,
              max,
              trackClassName: 'poke-detail-stat-bar',
              fillClassName: 'poke-detail-stat-fill'
            }),
            new UIText({ tagName: 'span', className: 'poke-detail-stat-value', text: `${TextFormatter.formatNumber(value)} / ${max}` })
          ]
        }));
      }
      const total = values.reduce((sum, value) => sum + value, 0);
      const totalMax = isIv ? PokemonRules.IV_MAX * STAT_KEYS.length : PokemonRules.EV_TOTAL_MAX;
      panel.addChild(new UIContainer({
        className: 'poke-detail-stat-total',
        children: [
          new UIText({ tagName: 'span', text: t(isIv ? 'pokemon_info_iv_total' : 'pokemon_info_ev_total') }),
          new UIText({ tagName: 'strong', text: `${TextFormatter.formatNumber(total)} / ${totalMax}` })
        ]
      }));
    }

    return new UIContainer({ className: 'poke-detail-side', children: [tabs, panel] });
  }

  /** @private */
  _render() {
    const renderState = this._captureRenderState();
    this.clearChildren();
    const pokemon = this._pokemonUid
      ? BoxSystem.getInstance().getPokemonByUid(this._pokemonUid)
      : TeamSystem.getInstance().getTeam()[this._teamIndex];
    if (!pokemon) {
      this.addChild(new UIText({ tagName: 'p', className: 'poke-detail-empty', text: t('pokemon_info_no_pokemon') }));
      this._restoreRenderState(renderState);
      return;
    }
    this._teamIndex = TeamSystem.getInstance().getMemberUids().indexOf(pokemon.uid);

    const displayName = pokemon.getDisplayName();
    const speciesName = t(pokemon.getNameKey());
    const species = pokemon.getSpecies();
    const close = new UIButton({
      icon: 'close',
      className: 'modal-close',
      onClick: (event) => {
        event.stopPropagation();
        this.close();
      }
    });
    close.setAriaLabel(t('modal_close_btn'));
    close.setData('focusKey', 'pokemon-info-close');

    this.addChild(new UIContainer({
      className: 'poke-detail-title',
      children: [
        new UIContainer({
          className: 'poke-detail-name-row',
          children: [
            new UIText({ tagName: 'strong', text: displayName }),
            new UIText({ tagName: 'span', className: 'poke-detail-id', text: t('level_short_value', { level: pokemon.level }) }),
            new UIText({ tagName: 'span', className: 'poke-detail-id', text: t('pokemon_info_species_value', { label: t('pokemon_info_species'), name: speciesName }) })
          ]
        }),
        close
      ]
    }));
    this.addChild(this._renderLocation(pokemon.uid));

    const types = pokemon.getTypes().map((type) => new UIText({
      tagName: 'span',
      className: `type-badge type-${type}`,
      text: t(`type.${type}`)
    }));
    const hero = new UIContainer({
      className: 'poke-detail-hero',
      children: [
        new UIContainer({
          className: 'poke-detail-sprite-card',
          children: [new UIPokemonSprite({
            species: pokemon.species,
            form: pokemon.form,
            shiny: pokemon.shiny,
            alt: displayName,
            size: PokemonSpriteSizes.TEAM
          })]
        }),
        new UIContainer({ className: 'poke-detail-types', children: types }),
        new UIText({ tagName: 'div', className: 'poke-detail-subtle', text: t('hp_value_over_max', {
          value: TextFormatter.formatNumber(pokemon.hp),
          max: TextFormatter.formatNumber(pokemon.getMaxHp())
        }) }),
        new UIProgressBar({
          value: pokemon.hp,
          max: pokemon.getMaxHp(),
          trackClassName: 'hp-bar',
          fillClassName: 'hp-fill'
        }),
        new UIText({ tagName: 'div', className: 'poke-detail-subtle', text: t('exp_value_over_max', {
          value: TextFormatter.formatNumber(pokemon.getExpInLevel()),
          max: TextFormatter.formatNumber(pokemon.getExpLevelSpan())
        }) }),
        new UIProgressBar({
          value: pokemon.getExpInLevel(),
          max: pokemon.getExpLevelSpan(),
          trackClassName: 'xp-bar',
          fillClassName: 'xp-fill'
        })
      ]
    });

    const stats = pokemon.getStats();
    const statsPanel = this._renderStatTabs(pokemon, stats);

    const heldItem = pokemon.heldItem ? ItemDB.getInstance().getById(pokemon.heldItem) : null;
    const heldNameKey = pokemon.heldItem ? `item.${pokemon.heldItem}.name` : '';
    const heldName = heldItem
      ? (LocalizationManager.getInstance().has(heldNameKey) ? t(heldNameKey) : pokemon.heldItem)
      : t('pokemon_info_no_item');
    const heldItemLockReason = this._actionLockReason(pokemon.uid, PokemonActionIds.CHANGE_HELD_ITEM);
    const changeItemButton = new UIButton({
      text: t('pokemon_info_change_item'),
      className: 'poke-detail-mini-btn',
      variant: 'secondary',
      size: 'sm',
      disabled: !!heldItemLockReason,
      onClick: () => {
        if (this._teamIndex < 0) return;
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(
          ModalIds.BAG,
          { mode: 'held-item', teamIndex: this._teamIndex }
        ));
      }
    });
    changeItemButton.setData('focusKey', 'pokemon-info-held-item');
    if (heldItemLockReason) changeItemButton.setAttribute('title', heldItemLockReason);
    const heldContents = [
      new UIContainer({
        className: 'poke-detail-held-icon',
        children: heldItem
          ? [new UIImage({ src: ItemDB.getInstance().getImagePath(pokemon.heldItem), alt: heldName, pixelated: true })]
          : []
      }),
      new UIContainer({
        className: 'poke-detail-held-text',
        children: [
          new UIText({ tagName: 'strong', text: heldName }),
          heldItem && new UIText({ tagName: 'span', text: t(`item.${pokemon.heldItem}.desc`) })
        ]
      }),
      changeItemButton
    ];
    const itemPanel = new UIContainer({
      className: 'poke-detail-panel',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_info_held_item') }),
        new UIContainer({ className: 'poke-detail-held', children: heldContents }),
        this._lockReasonText(heldItemLockReason)
      ]
    });

    const talentKey = pokemon.talent ? `talent.${pokemon.talent}.name` : '';
    const talentName = talentKey && LocalizationManager.getInstance().has(talentKey)
      ? t(talentKey)
      : t('pokemon_info_no_talent');
    const talentDescKey = pokemon.talent ? `talent.${pokemon.talent}.desc` : '';
    const talentDesc = talentDescKey && LocalizationManager.getInstance().has(talentDescKey)
      ? t(talentDescKey)
      : '';
    const talentPanel = new UIContainer({
      className: 'poke-detail-panel',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_info_talent') }),
        new UIContainer({
          className: 'poke-detail-ability-chip',
          children: [
            new UIText({ tagName: 'strong', text: talentName }),
            species?.hiddenTalent === pokemon.talent && new UIText({ tagName: 'small', text: t('pokemon_info_hidden_talent') })
          ]
        }),
        talentDesc && new UIText({ tagName: 'p', className: 'poke-detail-subtle', text: talentDesc })
      ]
    });

    const moves = pokemon.moves.map((moveId) => {
      const move = MoveDB.getInstance().getById(moveId);
      if (!move) return null;
      const typeLabel = t(`type.${move.type}`);
      const nameKey = `move.${moveId}`;
      const name = LocalizationManager.getInstance().has(nameKey) ? t(nameKey) : moveId;
      const power = move.power > 0 ? TextFormatter.formatNumber(move.power) : t('pokemon_info_status_move');
      return new UIContainer({
        className: `poke-detail-move-row type-${move.type}`,
        children: [
          new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: typeLabel }),
          new UIText({ tagName: 'span', className: 'poke-detail-move-name', text: name }),
          new UIText({ tagName: 'span', className: 'poke-detail-move-meta', text: power }),
          new UIText({ tagName: 'span', className: 'poke-detail-move-meta', text: t(`move_category_${move.category}`) })
        ]
      });
    }).filter(Boolean);
    const movesPanel = new UIContainer({
      className: 'poke-detail-moves-block poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', className: 'poke-detail-moves-title', text: t('pokemon_info_moves') }),
        moves.length
          ? new UIContainer({ className: 'poke-detail-moves-list', children: moves })
          : new UIText({ tagName: 'div', className: 'poke-detail-empty', text: t('pokemon_info_no_moves') })
      ]
    });
    const moveLearning = MoveLearningSystem.getInstance();
    const learnLockReason = moveLearning.isBattleLocked()
      ? t('pokemon_move_learning_battle_locked')
      : this._actionLockReason(pokemon.uid, PokemonActionIds.LEARN_MOVE);
    const learnableMoves = moveLearning.getLearnableMoveIds(pokemon);
    const learnableRows = learnableMoves.map((moveId) => {
      const move = MoveDB.getInstance().getById(moveId);
      if (!move) return null;
      return new UIContainer({
        className: `poke-detail-learnable-row type-${move.type}`,
        children: [
          new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: t(`type.${move.type}`) }),
          new UIText({ tagName: 'span', className: 'poke-detail-move-name', text: t(`move.${moveId}`) }),
          new UIButton({
            variant: 'secondary',
            size: 'sm',
            text: t('pokemon_info_learn_move'),
            disabled: !!learnLockReason,
            onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.MOVE_LEARN, {
              pokemonUid: pokemon.uid,
              moveId
            }))
          })
        ]
      });
    }).filter(Boolean);
    const learnablePanel = new UIContainer({
      className: 'poke-detail-moves-block poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', className: 'poke-detail-moves-title', text: t('pokemon_info_learnable_moves') }),
        learnableRows.length ? this._lockReasonText(learnLockReason) : null,
        learnableRows.length
          ? new UIContainer({ className: 'poke-detail-learnable-list', children: learnableRows })
          : new UIText({ tagName: 'div', className: 'poke-detail-empty', text: t('pokemon_info_no_learnable_moves') })
      ]
    });
    const favoriteButton = new UIButton({
      variant: pokemon.favorite ? 'primary' : 'secondary',
      size: 'sm',
      text: t(pokemon.favorite ? 'pokemon_favorite_on' : 'pokemon_favorite_off'),
      onClick: () => this._toggleCollectionFlag(pokemon.uid, 'favorite')
    });
    favoriteButton.setData('focusKey', 'pokemon-info-favorite');
    const lockedButton = new UIButton({
      variant: pokemon.locked ? 'primary' : 'secondary',
      size: 'sm',
      text: t(pokemon.locked ? 'pokemon_locked_on' : 'pokemon_locked_off'),
      onClick: () => this._toggleCollectionFlag(pokemon.uid, 'locked')
    });
    lockedButton.setData('focusKey', 'pokemon-info-locked');
    const collectionPanel = new UIContainer({
      className: 'poke-detail-panel poke-detail-protection',
      children: [
        new UIText({ tagName: 'h3', text: t('guide_sheet_fav') }),
        favoriteButton,
        lockedButton
      ]
    });

    this.addChild(new UIContainer({ className: 'poke-detail-shell', children: [hero, statsPanel] }));
    this.addChild(new UIContainer({ className: 'poke-detail-section-grid', children: [collectionPanel, itemPanel, talentPanel, movesPanel, learnablePanel] }));
    this._restoreRenderState(renderState);
  }
}
