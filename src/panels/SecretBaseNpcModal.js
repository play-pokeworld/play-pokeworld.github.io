/**
 * @file SecretBaseNpcModal.js
 * @brief Modal dialog for customizing a secret base NPC (name, sprite gallery, team builder, and dialogue).
 * Faithfully brings the visual look gallery and team builder from main into the Rework architecture.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UITextInput } from '../ui/UITextInput.js';
import { UISortableList } from '../ui/UISortableList.js';
import { ModalIds } from '../config/ModalIds.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';
import { SecretBaseSystem } from '../systems/SecretBaseSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';
import { BaseNpcMemberCard } from './components/BaseNpcMemberCard.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class SecretBaseNpcModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.SECRET_BASE_NPC,
      title: t('panel.npc_save'),
      size: 'md',
      bodyId: 'pw-secret-base-npc-body',
      bodyClassName: 'pw-secret-base-npc-body pw-base-npced',
      className: 'pw-secret-base-npc-modal pw-base-npced',
      name: 'SecretBaseNpcModal',
      hasHeader: true,
      showCloseBtn: true,
      closeOnBackdrop: true
    });

    /** @private @type {string|null} */
    this._npcId = null;
    /** @private @type {'editor'|'sprite-picker'|'mon-picker'|'preset-picker'} */
    this._mode = 'editor';
    /** @private @type {string} */
    this._draftName = '';
    /** @private @type {string} */
    this._selectedSprite = SecretBaseRules.DEFAULT_NPC_SPRITE;
    /** @private @type {Array<Object>} */
    this._draftTeam = [];
    /** @private @type {{pre: string, win: string, lose: string}} */
    this._draftMessages = { pre: '', win: '', lose: '' };
    /** @private @type {number} */
    this._pickSlot = 0;
    /** @private @type {string} */
    this._spriteSearch = '';
    /** @private @type {string} */
    this._monSearch = '';

    /** @private @type {UITextInput|null} */
    this._nameInput = null;
    /** @private @type {UITextInput|null} */
    this._preInput = null;
    /** @private @type {UITextInput|null} */
    this._winInput = null;
    /** @private @type {UITextInput|null} */
    this._loseInput = null;

    /** @private @type {UIContainer|null} */
    this._looksGrid = null;
    /** @private @type {UIText|null} */
    this._looksCountText = null;
    /** @private @type {UIContainer|null} */
    this._monCandidatesContainer = null;

    this.listen(ModalOpenRequestedEvent, (event) => {
      if (event.modalId === ModalIds.SECRET_BASE_NPC) {
        this._npcId = event.params?.npcId || null;
        this._mode = 'editor';
        this._spriteSearch = '';
        this._monSearch = '';
        this._loadNpcDraft();
        this._render();
        this.open();
      }
    });
  }

  /** @private */
  _loadNpcDraft() {
    const system = SecretBaseSystem.getInstance();
    const base = system.getBase();
    const npc = (base?.npcs || []).find((entry) => entry.id === this._npcId) || null;
    if (npc) {
      this._draftName = npc.name || '';
      this._selectedSprite = npc.sprite || SecretBaseRules.DEFAULT_NPC_SPRITE;
      this._draftTeam = Array.isArray(npc.team) ? clone(npc.team) : [];
      this._draftMessages = {
        pre: npc.messages?.pre || '',
        win: npc.messages?.win || '',
        lose: npc.messages?.lose || ''
      };
    } else {
      this._draftName = '';
      this._selectedSprite = SecretBaseRules.DEFAULT_NPC_SPRITE;
      this._draftTeam = [];
      this._draftMessages = { pre: '', win: '', lose: '' };
    }
  }

  /** @private */
  _saveFormInputs() {
    if (this._nameInput) this._draftName = this._nameInput.getValue();
    if (this._preInput) this._draftMessages.pre = this._preInput.getValue();
    if (this._winInput) this._draftMessages.win = this._winInput.getValue();
    if (this._loseInput) this._draftMessages.lose = this._loseInput.getValue();
  }

  /** @private */
  _render() {
    this.clearChildren();
    if (!this._npcId) {
      this.addChild(new UIText({ className: 'pw-empty-state-md', text: t('err.unknown') }));
      return;
    }

    if (this._mode === 'sprite-picker') {
      this._renderSpritePicker();
    } else if (this._mode === 'mon-picker') {
      this._renderMonPicker();
    } else if (this._mode === 'preset-picker') {
      this._renderPresetPicker();
    } else {
      this._renderEditor();
    }
  }

  /** @private */
  _renderEditor() {
    const system = SecretBaseSystem.getInstance();
    const scrollContainer = new UIContainer({ className: 'pw-base-npced-container' });

    // Hint banner
    scrollContainer.addChild(new UIText({
      className: 'preset-manager-hint settings-hint',
      text: t('npced.hint')
    }));

    // ── 1. Identity section (Portrait button + Name input + Style button) ──
    const portraitBtn = new UIButton({
      className: 'base-npc-portrait-btn pw-base-npced-id-portrait',
      title: t('npced.edit_sprite_hint'),
      onClick: () => {
        this._saveFormInputs();
        this._mode = 'sprite-picker';
        this._render();
      }
    });
    portraitBtn.addChildren([
      new UIImage({
        className: 'pw-base-portrait is-64 pw-base-npced-portrait-img',
        src: AssetPaths.trainerSprite(this._selectedSprite),
        alt: t('npced.sprite')
      }),
      new UIContainer({
        className: 'base-npc-portrait-edit',
        children: [new UIIcon({ name: 'rename', size: 12 })]
      })
    ]);

    this._nameInput = new UITextInput({
      id: 'pw-base-npc-name',
      value: this._draftName,
      maxLength: SecretBaseRules.MAX_NPC_NAME_LENGTH,
      placeholder: t('panel.npc_name_placeholder'),
      onInput: (val) => { this._draftName = val; }
    });

    const styleActionRow = new UIContainer({
      className: 'pw-row pw-flex-gap-sm',
      children: [
        new UIText({
          className: 'pw-text-sm pw-light1',
          text: `${t('npced.sprite')} · ${SecretBaseRules.NPC_SPRITES.length} dispo`
        }),
        new UIButton({
          className: 'hbtn',
          text: t('npced.sprite_picker_title'),
          onClick: () => {
            this._saveFormInputs();
            this._mode = 'sprite-picker';
            this._render();
          }
        })
      ]
    });

    const idFields = new UIContainer({
      className: 'pw-base-npced-id-fields',
      children: [
        new UIContainer({
          className: 'save-profile-field',
          children: [
            new UIText({ tagName: 'label', text: t('npced.name') }),
            this._nameInput
          ]
        }),
        styleActionRow
      ]
    });

    const idBox = new UIContainer({
      className: 'pw-base-npced-id-box',
      children: [portraitBtn, idFields]
    });
    scrollContainer.addChild(idBox);

    // ── 2. Team section (Unified Team View with UISortableList, identical to ActiveTeamPanel) ──
    const teamHeader = new UIContainer({
      className: 'pw-base-npced-teambar',
      children: [
        new UIContainer({
          children: [
            new UIText({ tagName: 'h3', text: t('npced.team', { n: this._draftTeam.length }) }),
            new UIText({ className: 'settings-hint', text: t('npced.level_auto') })
          ]
        }),
        new UIButton({
          id: 'pw-base-npc-import-team-btn',
          className: 'hbtn pw-btn-primary',
          text: t('npced.from_preset'),
          onClick: () => {
            this._saveFormInputs();
            this._mode = 'preset-picker';
            this._render();
          }
        })
      ]
    });

    const entries = [];
    this._draftTeam.forEach((mon, index) => {
      const card = new BaseNpcMemberCard({
        index,
        onPick: (slot) => {
          this._saveFormInputs();
          this._pickSlot = slot;
          this._mode = 'mon-picker';
          this._render();
        },
        onRemove: (slot) => {
          this._saveFormInputs();
          this._draftTeam.splice(slot, 1);
          this._render();
        },
        onReorder: (slot, delta) => {
          const target = slot + delta;
          if (target >= 0 && target < this._draftTeam.length) {
            this._saveFormInputs();
            const [moved] = this._draftTeam.splice(slot, 1);
            this._draftTeam.splice(target, 0, moved);
            this._render();
          }
        }
      });
      card.setNpcPokemon(mon, index);
      entries.push({ key: String(index), row: card, handle: card.getDragHandle() });
    });

    const sortableTeamList = new UISortableList({
      className: 'pw-team-member-list',
      rowDrag: true,
      onReorder: (fromKey, toKey) => {
        const fromIdx = Number(fromKey);
        const toIdx = Number(toKey);
        if (Number.isInteger(fromIdx) && Number.isInteger(toIdx) && fromIdx !== toIdx) {
          this._saveFormInputs();
          const [moved] = this._draftTeam.splice(fromIdx, 1);
          this._draftTeam.splice(toIdx, 0, moved);
          this._render();
        }
      }
    });
    sortableTeamList.setAttribute('role', 'list');
    sortableTeamList.setItems(entries);

    // Standard drop-zone add slot matching ActiveTeamPanel
    const addSlotCount = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1',
      text: t('team_count', { count: this._draftTeam.length })
    });
    const addSlot = new UIContainer({
      className: 'pw-drop-zone preset-slot-empty pw-base-npced-mon-add',
      children: [
        new UIText({
          tagName: 'div',
          className: 'pw-text-lg',
          text: t('add_slot_symbol')
        }),
        new UIText({
          tagName: 'div',
          className: 'pw-text-sm pw-light2 pw-bold',
          text: t('add_pokemon')
        }),
        addSlotCount
      ]
    });
    addSlot.setAttribute('role', 'button');
    addSlot.setAttribute('tabindex', '0');
    addSlot.setAriaLabel(t('add_pokemon'));
    addSlot.addDomListener('click', () => {
      this._saveFormInputs();
      this._pickSlot = this._draftTeam.length;
      this._mode = 'mon-picker';
      this._render();
    });

    const teamViewContainer = new UIContainer({
      id: 'base-npced-team',
      className: 'team-view pw-base-npced-team-grid',
      children: [
        sortableTeamList,
        ...(this._draftTeam.length < 6 ? [addSlot] : [])
      ]
    });

    const teamSection = new UIContainer({
      className: 'settings-section',
      children: [teamHeader, teamViewContainer]
    });
    scrollContainer.addChild(teamSection);

    // ── 3. Quotes section (Spacious inputs matching Settings) ──
    this._preInput = new UITextInput({
      id: 'pw-base-npc-pre',
      value: this._draftMessages.pre,
      maxLength: SecretBaseRules.MAX_NPC_MESSAGE_LENGTH,
      placeholder: t('panel.npc_pre_placeholder'),
      onInput: (val) => { this._draftMessages.pre = val; }
    });
    this._winInput = new UITextInput({
      id: 'pw-base-npc-win',
      value: this._draftMessages.win,
      maxLength: SecretBaseRules.MAX_NPC_MESSAGE_LENGTH,
      placeholder: t('panel.npc_win_placeholder'),
      onInput: (val) => { this._draftMessages.win = val; }
    });
    this._loseInput = new UITextInput({
      id: 'pw-base-npc-lose',
      value: this._draftMessages.lose,
      maxLength: SecretBaseRules.MAX_NPC_MESSAGE_LENGTH,
      placeholder: t('panel.npc_lose_placeholder'),
      onInput: (val) => { this._draftMessages.lose = val; }
    });

    const quotesSection = new UIContainer({
      className: 'settings-section pw-base-npced-quotes-section',
      children: [
        new UIText({ tagName: 'h3', text: t('npced.quotes') }),
        new UIContainer({
          className: 'save-profile-field',
          children: [
            new UIText({ tagName: 'label', text: t('npced.quote_pre') }),
            this._preInput
          ]
        }),
        new UIContainer({
          className: 'save-profile-field',
          children: [
            new UIText({ tagName: 'label', text: t('npced.quote_win') }),
            this._winInput
          ]
        }),
        new UIContainer({
          className: 'save-profile-field',
          children: [
            new UIText({ tagName: 'label', text: t('npced.quote_lose') }),
            this._loseInput
          ]
        })
      ]
    });
    scrollContainer.addChild(quotesSection);

    // ── 4. Actions footer ──
    const actions = new UIContainer({
      className: 'pw-modal-actions',
      children: [
        new UIButton({
          id: 'pw-base-npc-save-btn',
          className: 'hbtn pw-btn-primary',
          text: t('npced.save'),
          onClick: () => {
            this._saveFormInputs();
            system.updateNpc(this._npcId, {
              name: this._draftName,
              sprite: this._selectedSprite,
              team: this._draftTeam,
              messages: this._draftMessages
            });
            this.close();
          }
        }),
        new UIButton({
          className: 'hbtn pw-btn-danger',
          text: t('npced.delete'),
          onClick: () => {
            system.removeNpc(this._npcId);
            this.close();
          }
        }),
        new UIButton({
          className: 'hbtn pw-btn-cancel',
          text: t('npced.back'),
          onClick: () => this.close()
        })
      ]
    });

    this.addChild(scrollContainer);
    this.addChild(actions);
  }

  /** @private */
  _getFilteredSprites() {
    const filterQuery = (this._spriteSearch || '').trim().toLowerCase();
    return SecretBaseRules.NPC_SPRITES.filter((id) => !filterQuery || id.toLowerCase().includes(filterQuery));
  }

  /** @private */
  _updateLooksGrid() {
    if (!this._looksGrid) return;
    const sprites = this._getFilteredSprites();
    if (this._looksCountText) {
      this._looksCountText.setText(`${t('npced.sprite_picker_title')} (${sprites.length}/${SecretBaseRules.NPC_SPRITES.length})`);
    }
    this._looksGrid.clearChildren();
    if (!sprites.length) {
      this._looksGrid.addChild(new UIText({ className: 'pw-empty-state-md', text: t('err.unknown') }));
      return;
    }
    const lookCards = sprites.map((id) => {
      const isSelected = id === this._selectedSprite;
      const btn = new UIButton({
        className: `pw-base-look-card base-npc-look ${isSelected ? 'is-selected sel' : ''}`,
        title: id,
        onClick: () => {
          this._selectedSprite = id;
          this._mode = 'editor';
          this._render();
        }
      });
      btn.addChildren([
        new UIImage({ className: 'pw-base-look-img pw-base-portrait is-48', src: AssetPaths.trainerSprite(id), alt: id }),
        new UIText({ className: 'pw-base-look-label', text: id })
      ]);
      return btn;
    });
    this._looksGrid.addChildren(lookCards);
  }

  /** @private */
  _renderSpritePicker() {
    const container = new UIContainer({ className: 'pw-base-picker-container pw-base-looks-picker' });

    this._spriteSearch = this._spriteSearch || '';
    const initialSprites = this._getFilteredSprites();

    this._looksCountText = new UIText({
      tagName: 'h3',
      text: `${t('npced.sprite_picker_title')} (${initialSprites.length}/${SecretBaseRules.NPC_SPRITES.length})`
    });

    const header = new UIContainer({
      className: 'pw-base-picker-header',
      children: [
        this._looksCountText,
        new UIText({ className: 'settings-hint', text: t('npced.sprite_picker_hint') })
      ]
    });
    container.addChild(header);

    // Standard search filter input - NOT torn down on typing to preserve focus
    const filterInput = new UITextInput({
      className: 'dict-search pw-base-looks-filter',
      value: this._spriteSearch,
      placeholder: 'trainer-42...',
      onInput: (val) => {
        this._spriteSearch = val;
        this._updateLooksGrid();
      }
    });
    container.addChild(filterInput);

    this._looksGrid = new UIContainer({
      className: 'pw-base-looks-grid base-npc-looks pw-base-looks-scroll'
    });
    this._updateLooksGrid();
    container.addChild(this._looksGrid);

    const footer = new UIContainer({
      className: 'pw-modal-actions',
      children: [
        new UIButton({
          className: 'hbtn pw-btn-cancel',
          text: t('npced.back'),
          onClick: () => {
            this._mode = 'editor';
            this._render();
          }
        })
      ]
    });

    this.addChild(container);
    this.addChild(footer);
  }

  /** @private */
  _updateMonCandidates() {
    if (!this._monCandidatesContainer) return;
    const save = SaveSystem.getInstance().getCurrentSave();
    const pokemonDb = PokemonDB.getInstance();

    const partyUids = new Set(save?.teamMembers?.getUids?.() || []);
    const rawCandidates = [];
    for (const p of save?.team || []) {
      if (p?.species) rawCandidates.push({ mon: p, tag: t('preset_in_team_tag'), inBox: false });
    }
    for (const p of save?.collection?.getAll?.() || []) {
      if (p?.species && !partyUids.has(p.uid)) {
        rawCandidates.push({ mon: p, tag: t('box_pc_location'), inBox: true });
      }
    }

    const query = (this._monSearch || '').trim().toLowerCase();
    const filtered = rawCandidates.filter(({ mon }) => {
      if (!query) return true;
      const speciesObj = pokemonDb.getById(mon.species);
      const name = speciesObj ? t(speciesObj.getNameKey()).toLowerCase() : '';
      return name.includes(query) || mon.species.toLowerCase().includes(query);
    });

    this._monCandidatesContainer.clearChildren();
    if (!filtered.length) {
      this._monCandidatesContainer.addChild(new UIText({
        className: 'pw-empty-state-md',
        text: t('err.unknown')
      }));
      return;
    }

    const rows = filtered.slice(0, 120).map(({ mon, tag, inBox }) => {
      const speciesObj = pokemonDb.getById(mon.species);
      const speciesName = speciesObj ? t(speciesObj.getNameKey()) : mon.species;

      const rowBtn = new UIButton({
        className: 'inv-item preset-pick-row pw-preset-pick-card',
        onClick: () => {
          this._draftTeam[this._pickSlot] = {
            species: mon.species,
            level: mon.level || 5,
            moves: [...(mon.moves || [])],
            talent: mon.talent || null,
            shiny: mon.shiny === true,
            ...(mon.heldItem ? { heldItem: mon.heldItem } : {})
          };
          this._mode = 'editor';
          this._render();
        }
      });
      rowBtn.addChildren([
        new UIImage({
          className: 'pw-preset-pick-mon-img',
          src: AssetPaths.pokemonSprite(mon.species, mon.form || '', mon.shiny === true),
          alt: speciesName
        }),
        new UIContainer({
          className: 'pw-preset-pick-info',
          children: [
            new UIText({ className: 'pw-preset-pick-title', text: `${speciesName} (Nv. ${mon.level || 5})` }),
            new UIText({ className: 'pw-text-sm pw-light1', text: `#${mon.species}` })
          ]
        }),
        new UIText({ className: `preset-pick-tag ${inBox ? 'in-box' : ''}`, text: tag })
      ]);
      return rowBtn;
    });

    this._monCandidatesContainer.addChildren(rows);
  }

  /** @private */
  _renderMonPicker() {
    const container = new UIContainer({ className: 'pw-base-picker-container pw-base-pick-scroll' });

    const header = new UIContainer({
      className: 'pw-base-picker-header',
      children: [
        new UIText({
          tagName: 'h3',
          text: `${t('npced.pick_title')} — ${this._pickSlot + 1}/6`
        }),
        new UIText({ className: 'settings-hint', text: t('npced.level_auto') })
      ]
    });
    container.addChild(header);

    this._monSearch = this._monSearch || '';

    // Standard candidate search input - NOT torn down on typing to preserve focus
    const searchInput = new UITextInput({
      className: 'dict-search preset-pick-search',
      value: this._monSearch,
      placeholder: t('npced.pick_search'),
      onInput: (val) => {
        this._monSearch = val;
        this._updateMonCandidates();
      }
    });
    container.addChild(searchInput);

    this._monCandidatesContainer = new UIContainer({
      className: 'preset-pick-list pw-preset-pick-list'
    });
    this._updateMonCandidates();
    container.addChild(this._monCandidatesContainer);

    const footerButtons = [];
    if (this._draftTeam[this._pickSlot]) {
      footerButtons.push(new UIButton({
        className: 'hbtn pw-btn-danger',
        text: t('npced.remove_mon'),
        onClick: () => {
          this._draftTeam.splice(this._pickSlot, 1);
          this._mode = 'editor';
          this._render();
        }
      }));
    }
    footerButtons.push(new UIButton({
      className: 'hbtn pw-btn-cancel',
      text: t('npced.back'),
      onClick: () => {
        this._mode = 'editor';
        this._render();
      }
    }));

    const footer = new UIContainer({
      className: 'pw-modal-actions',
      children: footerButtons
    });

    this.addChild(container);
    this.addChild(footer);
  }

  /** @private */
  _renderPresetPicker() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const system = SecretBaseSystem.getInstance();
    const pokemonDb = PokemonDB.getInstance();
    const container = new UIContainer({ className: 'pw-base-picker-container pw-base-pick-scroll' });

    const header = new UIContainer({
      className: 'pw-base-picker-header',
      children: [
        new UIText({ tagName: 'h3', text: t('npced.preset_picker_title') }),
        new UIText({ className: 'settings-hint', text: t('npced.preset_picker_hint') })
      ]
    });
    container.addChild(header);

    const rows = [];

    const buildTeamMonSlots = (monList) => {
      return (monList || []).slice(0, 6).map((m) => {
        const speciesObj = pokemonDb.getById(m.species);
        const name = speciesObj ? t(speciesObj.getNameKey()) : m.species;
        return new UIContainer({
          className: 'pw-preset-pick-mon-slot',
          children: [
            new UIImage({
              className: 'pw-preset-pick-mon-img',
              src: AssetPaths.pokemonSprite(m.species, m.form || '', m.shiny === true),
              alt: name
            }),
            new UIContainer({
              className: 'pw-preset-pick-mon-meta',
              children: [
                new UIText({ className: 'pw-preset-pick-mon-name', text: name }),
                new UIText({ className: 'pw-preset-pick-mon-lvl', text: `Nv. ${m.level || 5}` })
              ]
            })
          ]
        });
      });
    };

    // 1. Active team option
    const activeTeam = save?.team || [];
    if (activeTeam.length) {
      const activeBtn = new UIButton({
        className: 'inv-item preset-pick-row pw-preset-pick-card',
        onClick: () => {
          this._draftTeam = system.captureCurrentTeam();
          this._mode = 'editor';
          this._render();
        }
      });
      activeBtn.addChildren([
        new UIContainer({
          className: 'pw-preset-pick-header',
          children: [
            new UIText({ className: 'pw-preset-pick-title', text: t('npced.from_preset_active') }),
            new UIText({ className: 'pw-preset-pick-count', text: `${activeTeam.length} Pokémon` })
          ]
        }),
        new UIContainer({
          className: 'pw-preset-pick-grid',
          children: buildTeamMonSlots(activeTeam)
        })
      ]);
      rows.push(activeBtn);
    }

    // 2. Saved presets
    const presets = save?.teamPresets?.getAll?.() || [];
    for (const preset of presets) {
      const members = (preset.members || []).map((uid) => save.collection.get(uid)).filter(Boolean);
      if (!members.length) continue;

      const presetBtn = new UIButton({
        className: 'inv-item preset-pick-row pw-preset-pick-card',
        onClick: () => {
          this._draftTeam = members.slice(0, 6).map((p) => ({
            species: p.species,
            level: p.level || 5,
            moves: [...(p.moves || [])],
            talent: p.talent || null,
            shiny: p.shiny === true,
            ...(p.heldItem ? { heldItem: p.heldItem } : {})
          }));
          this._mode = 'editor';
          this._render();
        }
      });
      presetBtn.addChildren([
        new UIContainer({
          className: 'pw-preset-pick-header',
          children: [
            new UIText({ className: 'pw-preset-pick-title', text: preset.name || preset.id }),
            new UIText({ className: 'pw-preset-pick-count', text: `${members.length} Pokémon` })
          ]
        }),
        new UIContainer({
          className: 'pw-preset-pick-grid',
          children: buildTeamMonSlots(members)
        })
      ]);
      rows.push(presetBtn);
    }

    container.addChild(new UIContainer({
      className: 'preset-pick-list pw-preset-pick-list',
      children: rows.length ? rows : [new UIText({ className: 'pw-empty-state-md', text: '—' })]
    }));

    const footer = new UIContainer({
      className: 'pw-modal-actions',
      children: [
        new UIButton({
          className: 'hbtn pw-btn-cancel',
          text: t('npced.back'),
          onClick: () => {
            this._mode = 'editor';
            this._render();
          }
        })
      ]
    });

    this.addChild(container);
    this.addChild(footer);
  }
}
