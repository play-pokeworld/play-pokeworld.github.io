/**
 * @file PokemonInfoModal.js
 * @brief Read-only Pokémon sheet with stats, IVs, EVs, moves, talent and held item.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';
import { TextFormatter } from '../core/TextFormatter.js';

const STAT_KEYS = Object.freeze(['hp', 'atk', 'def', 'spa', 'spd', 'spe']);

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
    this.listen(TeamChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
    this.listen(BattleEndedEvent, () => {
      if (this.isOpen()) this._render();
    });
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    if (Number.isInteger(Number(params.teamIndex))) this._teamIndex = Number(params.teamIndex);
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

  /** @private */
  _render() {
    this.clearChildren();
    const pokemon = TeamSystem.getInstance().getTeam()[this._teamIndex];
    if (!pokemon) {
      this.addChild(new UIText({ tagName: 'p', className: 'poke-detail-empty', text: t('pokemon_info_no_pokemon') }));
      return;
    }

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
    const maxStatValue = Math.max(1, ...STAT_KEYS.map((key) => Number(stats[key]) || 0));
    const statsRows = STAT_KEYS.map((key) => {
      const value = Number(stats[key]) || 0;
      return new UIContainer({
        className: 'poke-detail-stat-row',
        children: [
          new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}`) }),
          new UIProgressBar({
            value,
            max: maxStatValue,
            trackClassName: 'poke-detail-stat-bar',
            fillClassName: 'poke-detail-stat-fill'
          }),
          new UIText({ tagName: 'span', className: 'poke-detail-stat-value', text: TextFormatter.formatNumber(value) })
        ]
      });
    });
    const statsPanel = new UIContainer({
      className: 'poke-detail-panel',
      children: [new UIText({ tagName: 'h3', text: t('pokemon_info_stats') }), ...statsRows]
    });

    const spreadRows = STAT_KEYS.map((key) => new UIContainer({
      className: 'poke-detail-stat-row',
      children: [
        new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}_short`) }),
        new UIText({ tagName: 'span', className: 'poke-detail-stat-value', text: TextFormatter.formatNumber(pokemon.ivs[key]) }),
        new UIText({ tagName: 'span', className: 'poke-detail-stat-value', text: TextFormatter.formatNumber(pokemon.evs[key]) })
      ]
    }));
    const spreadPanel = new UIContainer({
      className: 'poke-detail-panel',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_info_ivs_evs') }),
        new UIContainer({
          className: 'poke-detail-spread-head',
          children: [
            new UIText({ tagName: 'span', text: '' }),
            new UIText({ tagName: 'strong', text: t('pokemon_info_ivs') }),
            new UIText({ tagName: 'strong', text: t('pokemon_info_evs') })
          ]
        }),
        ...spreadRows
      ]
    });

    const heldItem = pokemon.heldItem ? ItemDB.getInstance().getById(pokemon.heldItem) : null;
    const heldNameKey = pokemon.heldItem ? `item.${pokemon.heldItem}.name` : '';
    const heldName = heldItem
      ? (LocalizationManager.getInstance().has(heldNameKey) ? t(heldNameKey) : pokemon.heldItem)
      : t('pokemon_info_no_item');
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
      new UIButton({
        text: t('pokemon_info_change_item'),
        className: 'poke-detail-mini-btn',
        variant: 'secondary',
        size: 'sm',
        onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(
          ModalIds.HELD_ITEM_PICKER,
          { teamIndex: this._teamIndex }
        ))
      })
    ];
    const itemPanel = new UIContainer({
      className: 'poke-detail-panel',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_info_held_item') }),
        new UIContainer({ className: 'poke-detail-held', children: heldContents })
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

    this.addChild(new UIContainer({ className: 'poke-detail-shell', children: [hero, new UIContainer({ className: 'poke-detail-side', children: [statsPanel] })] }));
    this.addChild(new UIContainer({ className: 'poke-detail-section-grid', children: [spreadPanel, itemPanel, talentPanel, movesPanel] }));
  }
}
