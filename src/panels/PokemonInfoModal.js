/**
 * @file PokemonInfoModal.js
 * @brief Pokémon sheet matching main's PokeDetailView design,
 * with canonical hero card, side stat tabs, embedded talents dropdown without extra frames,
 * rank, evolutions, and moves block with click-to-swap and full learnable moves modal opener.
 */
import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { UIDropdown } from '../ui/UIDropdown.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { BoxSystem } from '../systems/BoxSystem.js';
import { MoveLearningSystem } from '../systems/MoveLearningSystem.js';
import { PokemonUsageSystem } from '../systems/PokemonUsageSystem.js';
import { PokemonTalentSystem } from '../systems/PokemonTalentSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { CaughtStatus } from '../data/save/PokedexData.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { PokemonUsageChangedEvent } from '../core/events/PokemonUsageChangedEvent.js';
import { PokemonActionIds, PokemonActionLockKinds } from '../config/PokemonUsageRules.js';
import { PokemonRankRules } from '../systems/box/PokemonRankRules.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { TalentDB, TalentRarity } from '../data/pokemon/TalentDB.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { PokemonRules } from '../config/PokemonRules.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';

const STAT_KEYS = PokemonRules.STAT_KEYS;
const STAT_TABS = Object.freeze(['stats', 'ivs', 'evs']);
const STAT_COLORS = Object.freeze(['#60BE58', '#D3425F', '#539DDF', '#EF90E6', '#B763CF', '#FBA64C']);
const STAT_MAX_VALS = Object.freeze([500, 220, 220, 220, 220, 220]);

export class PokemonInfoModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.POKEMON_INFO,
      title: t('pokemon_info_title'),
      size: 'md',
      bodyClassName: 'pw-pokemon-info-body',
      overlayId: 'poke-modal',
      overlayClassName: 'poke-detail-front',
      hasHeader: true,
      hasFooter: false,
      showCloseBtn: true,
      name: 'PokemonInfoModal'
    });
    if (this._titleDom) {
      this._titleDom.classList.add('poke-detail-title');
    }
    if (this._closeButton) {
      this._closeButton.setData('focusKey', 'pokemon-info-close');
    }
    this._teamIndex = 0;
    this._pokemonUid = null;
    this._activeStatTab = 'stats';
    this._replaceSlot = null;
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
      this._replaceSlot = null;
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
    this._replaceSlot = null;
  }

  /**
   * Helper retained for architecture compatibility with Bag held-item flow.
   * Dispatches ModalIds.BAG, { mode: 'held-item' }.
   * @private
   */
  _openHeldItemBag(teamIndex = 0) {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(
      ModalIds.BAG,
      { mode: 'held-item', teamIndex }
    ));
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
    const updated = BoxSystem.getInstance().updatePokemon(uid, update);
    if (updated) this._render();
    return updated;
  }

  /**
   * @private
   * @param {string} uid
   * @returns {boolean}
   */
  _toggleShinySkin(uid) {
    const update = (pokemon) => {
      if (pokemon.uid !== uid) return false;
      pokemon.shiny = !pokemon.shiny;
      return true;
    };
    const updated = BoxSystem.getInstance().updatePokemon(uid, update);
    if (updated) this._render();
    return updated;
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
      stats: LocalizationManager.getInstance().has('base_stats_tab') ? t('base_stats_tab') : t('pokemon_info_stats'),
      ivs: 'IV',
      evs: 'EV'
    };
    for (const tab of STAT_TABS) {
      const active = tab === this._activeStatTab;
      const button = new UIButton({
        className: `poke-detail-stat-tab${active ? ' active' : ''}`,
        variant: active ? 'primary' : 'secondary',
        size: 'sm',
        text: tabLabels[tab],
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

    if (this._activeStatTab === 'stats') {
      const values = STAT_KEYS.map((key) => Number(stats[key]) || 0);
      for (const [index, key] of STAT_KEYS.entries()) {
        const value = values[index];
        const max = STAT_MAX_VALS[index] || 220;
        const color = STAT_COLORS[index] || '#ECDEB7';
        panel.addChild(new UIContainer({
          className: 'poke-detail-stat-row',
          children: [
            new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}`) }),
            new UIProgressBar({
              value,
              max,
              trackClassName: 'poke-detail-stat-bar',
              fillClassName: 'poke-detail-stat-fill',
              color
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
        const barColor = STAT_COLORS[index] || (isIv ? '#f2d94e' : '#63c7ff');
        panel.addChild(new UIContainer({
          className: 'poke-detail-stat-row',
          children: [
            new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}`) }),
            new UIProgressBar({
              value,
              max,
              trackClassName: 'poke-detail-stat-bar',
              fillClassName: 'poke-detail-stat-fill',
              color: barColor
            }),
            new UIContainer({
              className: 'poke-detail-stat-value',
              children: [
                new UIText({ text: TextFormatter.formatNumber(value) }),
                new UIText({ tagName: 'small', text: ` / ${max}` })
              ]
            })
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

  /**
   * Builds the talent section directly without useless wrapper cards or non-conforming skins.
   * @private
   * @param {Object} pokemon
   * @returns {UIContainer}
   */
  _renderTalentSection(pokemon) {
    const talentPanel = new UIContainer({ className: 'poke-detail-panel poke-detail-talent-panel' });
    talentPanel.addChild(new UIText({ tagName: 'h3', text: t('pokemon_talents') }));
    const state = PokemonTalentSystem.getInstance().getSnapshot(pokemon.uid);
    if (!state) return talentPanel;

    const talentDb = TalentDB.getInstance();
    const getRarityLabel = (rarity) => {
      if (rarity === TalentRarity.COMMON) return t('rarity_common_label');
      if (rarity === TalentRarity.RARE) return t('rarity_uncommon_label');
      if (rarity === TalentRarity.VERY_RARE) return t('rarity_rare_label');
      return t('rarity_unknown_label');
    };

    const dropdownOptions = state.options.map((option) => {
      const talentDef = talentDb.getById(option.id);
      const rarityLabel = getRarityLabel(talentDef?.rarity);
      const talName = t(`talent.${option.id}.name`);
      return {
        value: option.id,
        disabled: !option.unlocked,
        label: option.unlocked
          ? `${talName} [${rarityLabel}]`
          : `${talName} [${rarityLabel}] — (${t('locked_talent_hint')})`
      };
    });

    if (dropdownOptions.length > 0) {
      const choice = new UIDropdown({
        options: dropdownOptions,
        value: state.current || '',
        disabled: state.locked,
        focusKey: 'pokemon-info-talent',
        onChange: (id) => PokemonTalentSystem.getInstance().equip(pokemon.uid, id)
      });
      choice.setTooltip(t('facility_talent_choose'));
      talentPanel.addChild(choice);
    } else if (state.current) {
      talentPanel.addChild(new UIText({ tagName: 'strong', text: t(`talent.${state.current}.name`) }));
    } else {
      talentPanel.addChild(new UIText({ tagName: 'strong', text: t('pokemon_info_no_talent') }));
    }

    if (state.current) {
      talentPanel.addChild(new UIText({
        tagName: 'p',
        className: 'poke-detail-subtle talent-desc',
        text: t(`talent.${state.current}.desc`)
      }));
    }

    if (state.hidden) {
      const isUnlocked = state.hiddenUnlocked;
      const chip = new UIContainer({
        className: `poke-detail-ability-chip pw-hidden-ability-chip ${isUnlocked ? 'pw-ha-unlocked' : 'pw-ha-locked'}`
      });
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.addChild(new UIText({
        text: `${isUnlocked ? '★ ' : ''}${t('hidden_ability_label')} : ${t(`talent.${state.hidden}.name`)} (${t(isUnlocked ? 'dict_ability_unlocked' : 'locked')})`
      }));
      chip.addDomListener('click', () => {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
          kind: 'talent',
          id: state.hidden,
          backLabel: t('modal_close_btn')
        }));
      });
      talentPanel.addChild(chip);

      talentPanel.addChild(new UIText({
        tagName: 'p',
        className: 'poke-detail-subtle talent-desc',
        text: t(`talent.${state.hidden}.desc`)
      }));
    }

    if (state.locked) {
      talentPanel.addChild(new UIText({
        tagName: 'p',
        className: 'poke-detail-lock-reason',
        text: state.lock ? t(`pokemon_action_locked_${state.lock.usage}`) : t('action_blocked_in_battle')
      }));
    }

    return talentPanel;
  }

  /** @private */
  _render() {
    const renderState = this._captureRenderState();
    this.clearChildren();
    const save = SaveSystem.getInstance().getCurrentSave();
    const pokemon = this._pokemonUid
      ? BoxSystem.getInstance().getPokemonByUid(this._pokemonUid)
      : TeamSystem.getInstance().getTeam()[this._teamIndex];
    if (!pokemon) {
      this.setTitle(t('pokemon_info_title'));
      this.addChild(new UIText({ tagName: 'p', className: 'poke-detail-empty', text: t('pokemon_info_no_pokemon') }));
      this._restoreRenderState(renderState);
      return;
    }
    this._teamIndex = TeamSystem.getInstance().getMemberUids().indexOf(pokemon.uid);

    const displayName = pokemon.getDisplayName();
    const species = pokemon.getSpecies();
    const usage = PokemonUsageSystem.getInstance().getPrimaryUsage(pokemon.uid);
    const locationText = t(usage ? `pokemon_usage_${usage}` : 'pokemon_usage_none');

    // Canonical header update on UIPanel chrome
    const isShiny = pokemon.shiny;
    this.setTitle(`${isShiny ? '★ ' : ''}${displayName} #${species.dex}`);

    // Hero panel
    const heroChildren = [
      new UIContainer({
        className: 'poke-detail-name-row',
        children: [
          new UIContainer({
            children: [
              new UIText({ tagName: 'b', text: displayName }),
              new UIText({ tagName: 'span', className: 'poke-detail-location', text: `${t('level_word')} ${pokemon.level} · ${locationText}` })
            ]
          })
        ]
      }),
      new UIContainer({
        className: `poke-detail-sprite-card${pokemon.shiny ? ' is-shiny' : ''}`,
        children: [
          new UIPokemonSprite({
            species: pokemon.species,
            form: pokemon.form,
            shiny: pokemon.shiny,
            size: PokemonSpriteSizes.HERO,
            alt: displayName
          })
        ]
      }),
      new UIContainer({
        className: 'poke-detail-types',
        children: pokemon.getTypes().map((type) => new UIText({
          tagName: 'span',
          className: `type-badge type-${type}`,
          text: t(`type.${type}`)
        }))
      })
    ];

    const shinyUnlocked = pokemon.shinyUnlocked || (save && save.pokedex?.getCaughtStatus(pokemon.species) === CaughtStatus.SHINY) || pokemon.shiny;
    if (shinyUnlocked) {
      const shinyToggle = new UIButton({
        className: `hbtn poke-detail-shiny-toggle ${pokemon.shiny ? 'is-on' : 'is-off'}`,
        onClick: () => this._toggleShinySkin(pokemon.uid)
      });
      shinyToggle.addChild(new UIText({ tagName: 'span', className: 'poke-detail-shiny-star', text: '★' }));
      shinyToggle.addChild(new UIText({ tagName: 'span', text: t(pokemon.shiny ? 'shiny_skin_on' : 'shiny_skin_off') }));
      heroChildren.push(shinyToggle);
    }

    const favoriteBtn = new UIButton({
      className: `hbtn poke-protect-btn ${pokemon.favorite ? 'is-on' : 'is-off'}`,
      onClick: () => this._toggleCollectionFlag(pokemon.uid, 'favorite')
    });
    favoriteBtn.setData('focusKey', 'pokemon-info-favorite');
    favoriteBtn.addChild(new UIText({
      tagName: 'span',
      className: 'poke-protect-label',
      text: t(pokemon.favorite ? 'pokemon_favorite_on' : 'pokemon_favorite_off')
    }));

    const lockedBtn = new UIButton({
      className: `hbtn poke-protect-btn ${pokemon.locked ? 'is-locked' : 'is-off'}`,
      onClick: () => this._toggleCollectionFlag(pokemon.uid, 'locked')
    });
    lockedBtn.setData('focusKey', 'pokemon-info-locked');
    lockedBtn.addChild(new UIText({
      tagName: 'span',
      className: 'poke-protect-label',
      text: t(pokemon.locked ? 'pokemon_locked_on' : 'pokemon_locked_off')
    }));

    const protectActions = new UIContainer({
      className: 'poke-protection-actions',
      children: [favoriteBtn, lockedBtn]
    });
    heroChildren.push(protectActions);

    const hero = new UIContainer({ className: 'poke-detail-hero', children: heroChildren });
    const stats = pokemon.getStats();
    const statsPanel = this._renderStatTabs(pokemon, stats);

    const shell = new UIContainer({
      className: 'poke-detail-shell',
      children: [hero, statsPanel]
    });
    this.addChild(shell);

    // Section grid: exactly 2 columns (Talents and Rang) and wide Evolutions row
    const talentPanel = this._renderTalentSection(pokemon);

    // Rank panel
    const rank = PokemonRankRules.getRank(pokemon);
    const bst = species.baseStats
      ? Object.values(species.baseStats).reduce((sum, v) => sum + (Number(v) || 0), 0)
      : 300;
    const rankLetter = new UIText({ tagName: 'div', className: 'poke-rank-letter', text: rank });
    const rankInfo = new UIContainer({
      children: [
        new UIText({ tagName: 'b', text: t('pokemon_rank') }),
        new UIText({ tagName: 'span', text: `BST ${bst}` })
      ]
    });
    const rankBox = new UIContainer({
      className: `poke-rank-panel rank-${rank.toLowerCase()}`,
      children: [rankLetter, rankInfo]
    });
    const rankPanel = new UIContainer({
      className: 'poke-detail-panel',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_rank') }),
        rankBox
      ]
    });

    // Evolutions panel (wide)
    const evoRows = [];
    if (species.evolutions && species.evolutions.length > 0) {
      for (const evo of species.evolutions) {
        const targetName = t(`pokemon.${evo.to}`);
        if (evo.minLevel) {
          evoRows.push(new UIText({
            tagName: 'div',
            richText: `<b>${t('m.progression.8')}</b> ${t('m.progression.7', { lvl: evo.minLevel })} <b>${targetName}</b>`
          }));
        } else if (evo.item) {
          const itemDef = ItemDB.getInstance().getById(evo.item);
          const itemName = itemDef ? t(itemDef.nameKey) : evo.item;
          evoRows.push(new UIText({
            tagName: 'div',
            richText: `<b>${t('m.progression.6')}</b> ${t('m.progression.5')} ${itemName} → <b>${targetName}</b>`
          }));
        } else {
          evoRows.push(new UIText({
            tagName: 'div',
            richText: `<b>${t('m.progression.4')}</b> → <b>${targetName}</b>`
          }));
        }
      }
    } else {
      evoRows.push(new UIText({
        tagName: 'div',
        className: 'poke-detail-subtle',
        text: t('m.progression.3')
      }));
    }

    const evoCard = new UIContainer({
      className: 'pw-progress-card-subtle',
      children: [
        new UIText({ tagName: 'div', className: 'pw-progress-section-title', text: t('m.progression.2') }),
        new UIContainer({ className: 'pw-progress-row', children: evoRows })
      ]
    });

    const evoPanel = new UIContainer({
      className: 'poke-detail-panel poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', text: t('evolutions_title') }),
        evoCard
      ]
    });

    const sectionGrid = new UIContainer({
      className: 'poke-detail-section-grid',
      children: [
        talentPanel,
        rankPanel,
        evoPanel
      ]
    });
    this.addChild(sectionGrid);

    // Moves block
    const movesChildren = [];
    const moveLearning = MoveLearningSystem.getInstance();
    const isBattleLocked = BattleSystem.getInstance().isActive();
    const learnLockReason = isBattleLocked
      ? t('action_blocked_in_battle')
      : this._actionLockReason(pokemon.uid, PokemonActionIds.LEARN_MOVE);

    // Title row with optional Cancel replacement button
    const titleChildren = [new UIText({ tagName: 'span', text: t('moves_lbl') })];
    if (this._replaceSlot !== null) {
      titleChildren.push(new UIButton({
        className: 'hbtn poke-detail-mini-btn',
        text: t('cancel'),
        onClick: () => {
          this._replaceSlot = null;
          this._render();
        }
      }));
    }
    movesChildren.push(new UIContainer({
      className: 'poke-detail-moves-title',
      children: titleChildren
    }));

    // Known moves list
    const knownMoves = (pokemon.moves || []).map((moveId, slotIndex) => {
      const move = MoveDB.getInstance().getById(moveId);
      if (!move) return null;
      const typeLabel = t(`type.${move.type}`);
      const nameKey = `move.${moveId}`;
      const name = LocalizationManager.getInstance().has(nameKey) ? t(nameKey) : moveId;
      const power = move.power > 0 ? TextFormatter.formatNumber(move.power) : '-';
      const catLabel = t(`move_category_${move.category}`);
      const isSelected = this._replaceSlot === slotIndex;

      const rowChildren = [
        new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: typeLabel }),
        new UIText({ tagName: 'span', className: 'poke-detail-move-name', text: name }),
        new UIText({ tagName: 'span', className: 'poke-detail-move-meta', text: `${power} ${t('power_abbrev')} · ${catLabel}` })
      ];
      if (isSelected) {
        rowChildren.push(new UIText({
          tagName: 'span',
          className: 'poke-detail-pill danger',
          text: t('replacement_badge')
        }));
      }

      const row = new UIContainer({
        className: `poke-detail-move-row type-${move.type} clickable${isSelected ? ' selected' : ''}`,
        children: rowChildren
      });
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('title', isBattleLocked ? t('action_blocked_in_battle') : t('click_replace_context_info'));
      row._setCssVariable('--type-color', `var(--type-${move.type})`);

      // Left click toggles replacement slot or swaps with another equipped move
      row.addDomListener('click', () => {
        if (isBattleLocked) {
          NotificationSystem.getInstance().notifyTemporary(t('action_blocked_in_battle'), {
            channel: NotificationChannels.GAMEPLAY,
            tone: NotificationTones.DANGER
          });
          return;
        }
        if (this._replaceSlot === null) {
          this._replaceSlot = slotIndex;
        } else if (this._replaceSlot === slotIndex) {
          this._replaceSlot = null;
        } else {
          const temp = pokemon.moves[this._replaceSlot];
          pokemon.moves[this._replaceSlot] = pokemon.moves[slotIndex];
          pokemon.moves[slotIndex] = temp;
          this._replaceSlot = null;
          SaveSystem.getInstance().saveCurrent();
        }
        this._render();
      });

      // Right click opens Dictionary detail
      row.addDomListener('contextmenu', (e) => {
        e.preventDefault();
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
          kind: 'move',
          id: moveId,
          backLabel: t('modal_close_btn')
        }));
      });

      return row;
    }).filter(Boolean);

    movesChildren.push(new UIContainer({
      className: 'poke-detail-moves-list current',
      children: knownMoves.length ? knownMoves : [
        new UIText({ tagName: 'div', className: 'poke-detail-empty', text: t('pokemon_info_no_moves') })
      ]
    }));

    // Learnable moves preview (up to 6)
    const learnableMoves = moveLearning.getLearnableMoveIds(pokemon);
    const canReplace = !isBattleLocked && this._replaceSlot !== null;
    const isFull = (pokemon.moves || []).length >= 4 && !canReplace;

    if (learnableMoves.length > 0) {
      const learnTitleChildren = [
        new UIText({ tagName: 'span', text: t('learnable_moves_title') })
      ];
      if (isFull) {
        learnTitleChildren.push(new UIText({
          tagName: 'span',
          className: 'pw-text-xs pw-light1',
          text: ` (${t('select_move_first')})`
        }));
      }

      movesChildren.push(new UIContainer({
        className: 'poke-detail-learn-title',
        children: learnTitleChildren
      }));
      if (learnLockReason) movesChildren.push(this._lockReasonText(learnLockReason));

      const learnRows = [];
      for (const moveId of learnableMoves.slice(0, 6)) {
        const move = MoveDB.getInstance().getById(moveId);
        if (!move) continue;
        const typeLabel = t(`type.${move.type}`);
        const nameKey = `move.${moveId}`;
        const name = LocalizationManager.getInstance().has(nameKey) ? t(nameKey) : moveId;
        const power = move.power > 0 ? TextFormatter.formatNumber(move.power) : '-';
        const catLabel = t(`move_category_${move.category}`);
        const isActive = !isBattleLocked && !learnLockReason && (canReplace || !isFull);

        // Learnable moves rendered identically to selected moves (no '+' button or useless widgets)
        const rowChildren = [
          new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: typeLabel }),
          new UIText({ tagName: 'span', className: 'poke-detail-move-name', text: name }),
          new UIText({ tagName: 'span', className: 'poke-detail-move-meta', text: `${power} ${t('power_abbrev')} · ${catLabel}` })
        ];

        const row = new UIContainer({
          className: `poke-detail-move-row poke-detail-learnable-row type-${move.type} learnable${isActive ? ' clickable' : ' locked'}`,
          children: rowChildren
        });
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('title', learnLockReason || (isBattleLocked ? t('action_blocked_in_battle') : t('context_info_touch')));
        row._setCssVariable('--type-color', `var(--type-${move.type})`);

        if (!isActive || !!learnLockReason) {
          row.setAttribute('disabled', 'disabled');
          row.setAttribute('aria-disabled', 'true');
        }

        if (isActive && !learnLockReason) {
          row.addDomListener('click', () => {
            const replaceSlot = this._replaceSlot;
            this._replaceSlot = null;
            MoveLearningSystem.getInstance().learnMove(pokemon.uid, moveId, replaceSlot);
            this._render();
          });
        }

        row.addDomListener('contextmenu', (e) => {
          e.preventDefault();
          EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
            kind: 'move',
            id: moveId,
            backLabel: t('modal_close_btn')
          }));
        });

        learnRows.push(row);
      }

      movesChildren.push(new UIContainer({
        className: 'poke-detail-moves-list learn',
        children: learnRows
      }));
    }

    // Full list button: opens PokemonMoveLearningModal as a separate stacked modal
    const fullListBtn = new UIButton({
      className: 'hbtn poke-detail-full-list-btn',
      text: t('view_all_learnable_moves'),
      onClick: () => {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.MOVE_LEARN, {
          pokemonUid: pokemon.uid
        }));
      }
    });
    movesChildren.push(fullListBtn);

    const movesBlock = new UIContainer({
      className: 'poke-detail-moves-block',
      children: movesChildren
    });
    this.addChild(movesBlock);

    this._restoreRenderState(renderState);
  }
}
