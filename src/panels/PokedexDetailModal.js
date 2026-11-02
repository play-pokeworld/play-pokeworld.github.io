/**
 * @file PokedexDetailModal.js
 * @brief Canonical Pokédex species encyclopedic sheet matching the main game's layout and design.
 * Features:
 *   - Hero card with high-res sprite, capture status, types, cry player, catch rate, and base EXP.
 *   - Official Pokédex flavor text description (FR and EN).
 *   - Base stats with proportional bars and Total BST.
 *   - Full evolutionary chain with levels, evolution stones, and link cable requirements.
 *   - Obtainment methods and wild routes with exact encounter percentages.
 *   - Species abilities (normal and hidden) with descriptions and dictionary links.
 *   - Detailed learnset with level-up table, TM/HM compatibilities, and dojo training moves.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIImage } from '../ui/UIImage.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { ModalIds } from '../config/ModalIds.js';
import { PokemonRules } from '../config/PokemonRules.js';
import { MoveConfig } from '../config/MoveConfig.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { TalentDB, TalentRarity } from '../data/pokemon/TalentDB.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { MoveLearnset } from '../data/pokemon/MoveLearnset.js';
import { SpeciesSourceCatalog } from '../data/pokemon/SpeciesSourceCatalog.js';
import { POKEDEX_FLAVOR } from '../data/pokedex-flavor.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { LocalizationManager, t, lt } from '../localization/LocalizationManager.js';

const STAT_KEYS = PokemonRules.STAT_KEYS;
const STAT_COLORS = Object.freeze({
  hp: '#60BE58',
  atk: '#D3425F',
  def: '#539DDF',
  spa: '#EF90E6',
  spd: '#B763CF',
  spe: '#FBA64C'
});
const STAT_MAX = 255;

export class PokedexDetailModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.POKEDEX_DETAIL,
      overlayId: 'pw-pokedex-detail-modal',
      overlayClassName: 'poke-detail-front',
      size: 'md',
      className: 'pw-pokemon-info-window pw-pokedex-species-window',
      bodyClassName: 'pw-pokemon-info-body pw-pokedex-species-body',
      hasHeader: true,
      hasFooter: false,
      showCloseBtn: true,
      closeOnBackdrop: true,
      name: 'PokedexDetailModal'
    });

    /** @private @type {string|null} */
    this._speciesId = null;
    /** @private @type {'level'|'tm'|'training'} */
    this._activeMoveTab = 'level';
  }

  /** @override @param {{speciesId?: string}} [params={}] */
  onEnter(params = {}) {
    super.onEnter(params);
    this._speciesId = params.speciesId || 'bulbasaur';
    this._activeMoveTab = 'level';
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._speciesId = null;
  }

  /** @private */
  _render() {
    this.clearChildren();
    if (!this._speciesId) return;

    const db = PokemonDB.getInstance();
    const species = db.getById(this._speciesId);
    if (!species) return;

    const save = SaveSystem.getInstance().getCurrentSave();
    const displayName = t(species.getNameKey());
    const dexNum = String(species.dex).padStart(3, '0');

    // Title on header
    this.setTitle(`#${dexNum} ${displayName}`);

    // Capture & Seen status
    const isCaught = save?.pokedex?.isCaught(species.id) ?? false;
    const isShiny = save?.pokedex?.getCaughtStatus ? save.pokedex.getCaughtStatus(species.id) === 'shiny' : false;
    const isSeen = save?.pokedex?.isSeen(species.id) ?? false;

    // --- 1. Shell: Hero (left) and Base Stats (right) ---
    const heroCard = this._renderHero(species, displayName, dexNum, { isCaught, isShiny, isSeen });
    const statsCard = this._renderBaseStats(species);

    const shell = new UIContainer({
      className: 'poke-detail-shell',
      children: [heroCard, statsCard]
    });
    this.addChild(shell);

    // --- 2. Section Grid: 2 columns and wide rows ---
    const sectionGrid = new UIContainer({ className: 'poke-detail-section-grid' });

    // Wide Row 1: Pokédex Description (Flavor text)
    sectionGrid.addChild(this._renderFlavorSection(species));

    // Wide Row 2: Evolutionary Chain
    sectionGrid.addChild(this._renderEvolutionSection(species));

    // Wide Row 3: Obtainment & Locations
    sectionGrid.addChild(this._renderObtainmentSection(species));

    // Column 1: Talents & Abilities
    sectionGrid.addChild(this._renderTalentSection(species));

    // Wide Row 4: Learnable Moves (Learnset)
    sectionGrid.addChild(this._renderMovesSection(species));

    this.addChild(sectionGrid);
  }

  /**
   * Builds the left hero card matching PokemonInfoModal layout.
   * @private
   */
  _renderHero(species, displayName, dexNum, { isCaught, isShiny, isSeen }) {
    const statusText = isCaught
      ? t('pokedex_status_caught')
      : isSeen
        ? t('pokedex_status_seen')
        : t('pokedex_status_unknown');
    const regionName = t(`region.${species.region}`);

    const nameRow = new UIContainer({
      className: 'poke-detail-name-row',
      children: [
        new UIContainer({
          children: [
            new UIText({ tagName: 'b', text: displayName }),
            new UIText({
              tagName: 'span',
              className: 'poke-detail-location',
              text: `#${dexNum} · ${regionName} · ${statusText}`
            })
          ]
        })
      ]
    });

    const spriteCard = new UIContainer({
      className: `poke-detail-sprite-card${isShiny ? ' is-shiny' : ''}`,
      children: [
        new UIPokemonSprite({
          species: species.id,
          shiny: isShiny,
          size: PokemonSpriteSizes.HERO,
          alt: displayName
        })
      ]
    });

    const typesRow = new UIContainer({
      className: 'poke-detail-types',
      children: species.types.map((type) => new UIText({
        tagName: 'span',
        className: `type-badge type-${type}`,
        text: t(`type.${type}`)
      }))
    });

    const cryBtn = new UIButton({
      className: 'hbtn poke-cry-btn',
      onClick: () => AudioSystem.getInstance().playCry(species.dex || species.id)
    });
    cryBtn.addChild(new UIIcon({ icon: 'sound', className: 'pw-btn-icon' }));
    cryBtn.addChild(new UIText({ tagName: 'span', text: t('pokedex_play_cry') }));

    const factsRow = new UIContainer({
      className: 'pw-pokedex-facts-row',
      children: [
        new UIContainer({
          className: 'pw-pokedex-fact-pill',
          children: [
            new UIText({ tagName: 'span', className: 'pw-fact-label', text: t('pokedex_catch_rate') }),
            new UIText({ tagName: 'strong', className: 'pw-fact-val', text: String(species.catchRate) })
          ]
        }),
        new UIContainer({
          className: 'pw-pokedex-fact-pill',
          children: [
            new UIText({ tagName: 'span', className: 'pw-fact-label', text: t('pokedex_base_exp') }),
            new UIText({ tagName: 'strong', className: 'pw-fact-val', text: String(species.xpYield) })
          ]
        })
      ]
    });

    return new UIContainer({
      className: 'poke-detail-hero',
      children: [nameRow, spriteCard, typesRow, cryBtn, factsRow]
    });
  }

  /**
   * Builds the right stats panel matching PokemonInfoModal layout.
   * @private
   */
  _renderBaseStats(species) {
    const stats = species.baseStats || {};
    let bst = 0;

    const panel = new UIContainer({ className: 'poke-detail-stat-panel active' });

    for (const key of STAT_KEYS) {
      const val = Number(stats[key]) || 0;
      bst += val;
      const color = STAT_COLORS[key] || '#539DDF';

      panel.addChild(new UIContainer({
        className: 'poke-detail-stat-row',
        children: [
          new UIText({ tagName: 'span', className: 'poke-detail-stat-name', text: t(`stat_${key}`) }),
          new UIProgressBar({
            value: val,
            max: STAT_MAX,
            trackClassName: 'poke-detail-stat-bar',
            fillClassName: 'poke-detail-stat-fill',
            color
          }),
          new UIContainer({
            className: 'poke-detail-stat-value',
            children: [
              new UIText({ text: String(val) }),
              new UIText({ tagName: 'small', text: ` / ${STAT_MAX}` })
            ]
          })
        ]
      }));
    }

    panel.addChild(new UIContainer({
      className: 'poke-detail-stat-total',
      children: [
        new UIText({ tagName: 'span', text: t('pokedex_stat_total') }),
        new UIText({ tagName: 'strong', text: String(bst) })
      ]
    }));

    const tabs = new UIContainer({
      className: 'poke-detail-stat-tabs',
      children: [
        new UIButton({
          className: 'poke-detail-stat-tab active',
          variant: 'primary',
          size: 'sm',
          text: t('dict_base_stats')
        })
      ]
    });

    return new UIContainer({
      className: 'poke-detail-side',
      children: [tabs, panel]
    });
  }

  /**
   * Official Pokédex description card with elegant typography.
   * @private
   */
  _renderFlavorSection(species) {
    const lang = LocalizationManager.getInstance().currentLang || 'fr';
    const flavorTable = POKEDEX_FLAVOR[lang] || POKEDEX_FLAVOR.fr || POKEDEX_FLAVOR.en || {};
    const text = flavorTable[String(species.dex)] || POKEDEX_FLAVOR.en[String(species.dex)] || '';

    const card = new UIContainer({
      className: 'pw-pokedex-flavor-card',
      children: [
        new UIText({ tagName: 'p', className: 'pw-pokedex-flavor-text', text: `« ${text} »` })
      ]
    });

    return new UIContainer({
      className: 'poke-detail-panel poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', text: t('pokedex_flavor_title') }),
        card
      ]
    });
  }

  /**
   * Evolution chain section with visual pre-evolution and forward evolutions.
   * @private
   */
  _renderEvolutionSection(species) {
    const evoRows = [];
    const db = PokemonDB.getInstance();

    // 1. Check for pre-evolution (e.g. Ivysaur -> pre-evolution Bulbasaur)
    const preEvo = db.getAll().find((s) => s.evolutions && s.evolutions.some((e) => e.to === species.id));
    if (preEvo) {
      const preName = t(preEvo.getNameKey());
      const link = preEvo.evolutions.find((e) => e.to === species.id);
      const reqLvl = link?.level ?? link?.minLevel;
      let condition = '';
      if (reqLvl && !link?.item) {
        condition = lt`${t('level_word')} ${reqLvl}`;
      } else if (link?.item) {
        const itemDef = ItemDB.getInstance().getById(link.item);
        const itemName = itemDef ? t(itemDef.nameKey) : link.item;
        condition = reqLvl ? lt`${itemName} (${t('level_word')} ${reqLvl})` : itemName;
      }
      evoRows.push(new UIContainer({
        className: 'pw-pokedex-evo-row',
        children: [
          new UIText({ tagName: 'span', className: 'pw-evo-badge', text: t('pokedex_pre_evo') }),
          new UIPokemonSprite({ species: preEvo.id, size: PokemonSpriteSizes.SMALL, alt: preName }),
          new UIText({ tagName: 'b', text: preName }),
          new UIText({ tagName: 'span', className: 'pw-evo-arrow', text: `➔ [ ${condition} ] ➔` }),
          new UIPokemonSprite({ species: species.id, size: PokemonSpriteSizes.SMALL, alt: t(species.getNameKey()) }),
          new UIText({ tagName: 'b', text: t(species.getNameKey()) })
        ]
      }));
    }

    // 2. Check for forward evolutions
    if (species.evolutions && species.evolutions.length > 0) {
      for (const evo of species.evolutions) {
        const targetSpecies = db.getById(evo.to);
        const targetName = targetSpecies ? t(targetSpecies.getNameKey()) : t(`pokemon.${evo.to}`);
        const requiredLevel = evo.level ?? evo.minLevel;
        let condText = '';

        if (requiredLevel && !evo.item) {
          condText = lt`${t('level_word')} ${requiredLevel}`;
        } else if (evo.item) {
          const itemDef = ItemDB.getInstance().getById(evo.item);
          const itemName = itemDef ? t(itemDef.nameKey) : evo.item;
          condText = requiredLevel ? lt`${itemName} (${t('level_word')} ${requiredLevel})` : itemName;
        } else {
          condText = t('m.progression.8');
        }

        const evoRow = new UIContainer({
          className: 'pw-pokedex-evo-row',
          children: [
            new UIText({ tagName: 'span', className: 'pw-evo-badge pw-evo-badge--next', text: t('pokedex_evo_to') }),
            new UIPokemonSprite({ species: species.id, size: PokemonSpriteSizes.SMALL, alt: t(species.getNameKey()) }),
            new UIText({ tagName: 'b', text: t(species.getNameKey()) }),
            new UIText({ tagName: 'span', className: 'pw-evo-arrow', text: `➔ [ ${condText} ] ➔` }),
            new UIPokemonSprite({ species: evo.to, size: PokemonSpriteSizes.SMALL, alt: targetName }),
            new UIText({ tagName: 'b', text: targetName })
          ]
        });
        evoRows.push(evoRow);
      }
    }

    if (evoRows.length === 0) {
      evoRows.push(new UIText({
        tagName: 'p',
        className: 'poke-detail-subtle',
        text: t('pokedex_no_evolution')
      }));
    }

    const evoBox = new UIContainer({
      className: 'pw-pokedex-evo-box',
      children: evoRows
    });

    return new UIContainer({
      className: 'poke-detail-panel poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', text: t('evolutions_title') }),
        evoBox
      ]
    });
  }

  /**
   * Obtainment methods and encounter locations.
   * @private
   */
  _renderObtainmentSection(species) {
    const sources = SpeciesSourceCatalog.getFormattedSources(species.id);
    const rows = [];

    if (sources.length > 0) {
      for (const source of sources) {
        rows.push(new UIContainer({
          className: 'pw-pokedex-source-chip',
          children: [
            new UIIcon({ icon: 'map', className: 'pw-source-icon' }),
            new UIText({ tagName: 'span', text: source })
          ]
        }));
      }
    } else {
      rows.push(new UIText({
        tagName: 'p',
        className: 'poke-detail-subtle',
        text: t('pokedex_no_locations')
      }));
    }

    const sourcesGrid = new UIContainer({
      className: 'pw-pokedex-sources-grid',
      children: rows
    });

    return new UIContainer({
      className: 'poke-detail-panel poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', text: t('pokedex_sources_title') }),
        sourcesGrid
      ]
    });
  }

  /**
   * Talents and abilities section with rarity and description.
   * @private
   */
  _renderTalentSection(species) {
    const talentDb = TalentDB.getInstance();
    const talentRows = [];

    const getRarityLabel = (rarity) => {
      if (rarity === TalentRarity.COMMON) return t('rarity_common_label');
      if (rarity === TalentRarity.RARE) return t('rarity_uncommon_label');
      if (rarity === TalentRarity.VERY_RARE) return t('rarity_rare_label');
      return t('rarity_unknown_label');
    };

    // Normal talents: the hidden talent is listed as its own card below, and it is never drawn
    // by the talent roll (PokemonFactory.rollTalent), so it is not repeated here.
    for (const talentId of species.talents.filter((id) => id !== species.hiddenTalent)) {
      const talentDef = talentDb.getById(talentId);
      const talName = t(`talent.${talentId}.name`);
      const rarity = getRarityLabel(talentDef?.rarity);

      const card = new UIContainer({
        className: 'pw-pokedex-talent-card',
        children: [
          new UIContainer({
            className: 'pw-pokedex-talent-head',
            children: [
              new UIText({ tagName: 'strong', text: talName }),
              new UIText({ tagName: 'span', className: 'pw-talent-rarity-badge', text: rarity })
            ]
          }),
          new UIText({ tagName: 'p', className: 'poke-detail-subtle', text: t(`talent.${talentId}.desc`) })
        ]
      });
      card.addDomListener('click', () => {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
          kind: 'talent',
          id: talentId,
          backLabel: t('modal_close_btn')
        }));
      });
      talentRows.push(card);
    }

    // Hidden talent
    if (species.hiddenTalent) {
      const hiddenId = species.hiddenTalent;
      const talName = t(`talent.${hiddenId}.name`);

      const card = new UIContainer({
        className: 'pw-pokedex-talent-card pw-pokedex-talent-card--hidden',
        children: [
          new UIContainer({
            className: 'pw-pokedex-talent-head',
            children: [
              new UIText({ tagName: 'strong', text: `★ ${talName}` }),
              new UIText({ tagName: 'span', className: 'pw-talent-rarity-badge pw-badge--hidden', text: t('pokedex_hidden_talent_tag') })
            ]
          }),
          new UIText({ tagName: 'p', className: 'poke-detail-subtle', text: t(`talent.${hiddenId}.desc`) })
        ]
      });
      card.addDomListener('click', () => {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
          kind: 'talent',
          id: hiddenId,
          backLabel: t('modal_close_btn')
        }));
      });
      talentRows.push(card);
    }

    return new UIContainer({
      className: 'poke-detail-panel poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_talents') }),
        new UIContainer({ className: 'pw-pokedex-talents-list', children: talentRows })
      ]
    });
  }

  /**
   * Learnset moves section with tabs: Level-up, TM/HM, and Training.
   * Switching tabs updates the content box directly without re-rendering the whole modal,
   * preserving scroll position.
   * @private
   */
  _renderMovesSection(species) {
    const tabs = new UIContainer({ className: 'poke-detail-stat-tabs' });
    const contentBox = new UIContainer({ className: 'pw-pokedex-moves-content' });
    const tabConfigs = [
      { id: 'level', label: t('pokedex_moves_level') },
      { id: 'tm', label: t('pokedex_moves_tm') },
      { id: 'training', label: t('pokedex_moves_training') }
    ];

    const tabButtons = [];

    const switchTab = (tabId) => {
      this._activeMoveTab = tabId;
      for (let i = 0; i < tabConfigs.length; i++) {
        const active = tabConfigs[i].id === tabId;
        const btn = tabButtons[i];
        btn.setVariant(active ? 'primary' : 'secondary');
        const dom = btn.getDomElement();
        if (dom) {
          dom.classList.toggle('active', active);
        }
      }
      contentBox.clearChildren();
      this._populateMoveTabContent(species, tabId, contentBox);
    };

    for (const conf of tabConfigs) {
      const active = this._activeMoveTab === conf.id;
      const btn = new UIButton({
        className: `poke-detail-stat-tab pw-move-tab${active ? ' active' : ''}`,
        variant: active ? 'primary' : 'secondary',
        size: 'sm',
        text: conf.label,
        onClick: () => switchTab(conf.id)
      });
      tabButtons.push(btn);
      tabs.addChild(btn);
    }

    this._populateMoveTabContent(species, this._activeMoveTab, contentBox);

    return new UIContainer({
      className: 'poke-detail-panel poke-detail-panel-wide',
      children: [
        new UIText({ tagName: 'h3', text: t('pokemon_info_moves') }),
        tabs,
        contentBox
      ]
    });
  }

  /**
   * Populates the move tab content container.
   * @private
   */
  _populateMoveTabContent(species, tabId, contentBox) {
    const moveDb = MoveDB.getInstance();
    const itemDb = ItemDB.getInstance();

    if (tabId === 'level') {
      const moveIds = MoveLearnset.poolFor(species.types);
      const rows = [];

      // Table Header
      rows.push(new UIContainer({
        className: 'pw-dex-move-row pw-dex-move-row--header',
        children: [
          new UIText({ tagName: 'span', className: 'pw-mcol-lvl', text: t('level_word') }),
          new UIText({ tagName: 'span', className: 'pw-mcol-name', text: t('dict_moves') }),
          new UIText({ tagName: 'span', className: 'pw-mcol-type', text: t('box_filter_type') }),
          new UIText({ tagName: 'span', className: 'pw-mcol-power', text: t('pokedex_move_power') }),
          new UIText({ tagName: 'span', className: 'pw-mcol-acc', text: t('pokedex_move_acc') })
        ]
      }));

      moveIds.forEach((moveId, index) => {
        const move = moveDb.getById(moveId);
        if (!move) return;
        const requiredLvl = index === 0 ? 1 : 1 + (index * MoveConfig.LEVEL_STEP);
        const powerText = move.power > 0 ? String(move.power) : '—';
        const accText = move.accuracy > 0 ? `${move.accuracy}%` : '—';

        const row = new UIContainer({
          className: 'pw-dex-move-row',
          children: [
            new UIText({ tagName: 'span', className: 'pw-mcol-lvl', text: `Lv ${requiredLvl}` }),
            new UIText({ tagName: 'strong', className: 'pw-mcol-name', text: t(`move.${move.id}`) }),
            new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: t(`type.${move.type}`) }),
            new UIText({ tagName: 'span', className: 'pw-mcol-power', text: powerText }),
            new UIText({ tagName: 'span', className: 'pw-mcol-acc', text: accText })
          ]
        });
        row.addDomListener('click', () => {
          EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
            kind: 'move',
            id: move.id,
            backLabel: t('modal_close_btn')
          }));
        });
        rows.push(row);
      });

      contentBox.addChild(new UIContainer({ className: 'pw-dex-moves-table', children: rows }));
    } else if (tabId === 'tm') {
      const tmItems = itemDb.getAll().filter((item) => {
        if (![ItemKinds.TM, ItemKinds.HM].includes(item.kind) || !item.move) return false;
        const move = moveDb.getById(item.move);
        if (!move) return false;
        const types = species.types;
        return move.learnTypes.includes(MoveConfig.ANY_TYPE)
          || move.type === MoveConfig.ANY_TYPE
          || types.includes(move.type)
          || move.learnTypes.some((type) => types.includes(type));
      });

      const tmGrid = new UIContainer({ className: 'pw-dex-tms-grid' });
      for (const item of tmItems) {
        const move = moveDb.getById(item.move);
        const itemName = t(item.nameKey);
        const moveName = move ? t(`move.${move.id}`) : item.move;

        const chip = new UIContainer({
          className: 'pw-dex-tm-chip',
          children: [
            new UIText({ tagName: 'b', className: 'pw-tm-code', text: itemName }),
            new UIText({ tagName: 'span', className: 'pw-tm-move-name', text: moveName }),
            move ? new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: t(`type.${move.type}`) }) : null
          ].filter(Boolean)
        });
        chip.addDomListener('click', () => {
          if (move) {
            EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
              kind: 'move',
              id: move.id,
              backLabel: t('modal_close_btn')
            }));
          }
        });
        tmGrid.addChild(chip);
      }
      contentBox.addChild(tmGrid);
    } else {
      const trainingMoves = MoveLearnset.trainingPoolFor(species.types);
      const trainGrid = new UIContainer({ className: 'pw-dex-tms-grid' });
      for (const moveId of trainingMoves) {
        const move = moveDb.getById(moveId);
        if (!move) continue;

        const chip = new UIContainer({
          className: 'pw-dex-tm-chip',
          children: [
            new UIText({ tagName: 'span', className: 'pw-tm-move-name', text: t(`move.${move.id}`) }),
            new UIText({ tagName: 'span', className: `type-badge type-${move.type}`, text: t(`type.${move.type}`) })
          ]
        });
        chip.addDomListener('click', () => {
          EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
            kind: 'move',
            id: move.id,
            backLabel: t('modal_close_btn')
          }));
        });
        trainGrid.addChild(chip);
      }
      contentBox.addChild(trainGrid);
    }
  }
}
