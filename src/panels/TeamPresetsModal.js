/**
 * @file TeamPresetsModal.js
 * @brief Twenty-slot party preset manager and editor. The view only uses widgets and
 * TeamPresetSystem; Pokémon remain owned by the active party or the PC box.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UITextInput } from '../ui/UITextInput.js';
import { UIButton } from '../ui/UIButton.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { TeamPresetSystem } from '../systems/TeamPresetSystem.js';
import { TeamPresetRules } from '../config/TeamPresetRules.js';
import { TeamPresetsChangedEvent } from '../core/events/TeamPresetsChangedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export class TeamPresetsModal extends StaticModalPanel {
  constructor() {
    super({ id: ModalIds.TEAM_PRESETS, title: t('panel_presets_title'), size: 'lg', name: 'TeamPresetsModal' });
    this.setBodyClass('pw-team-presets-modal');
    /** @private {'list'|'edit'} */ this._view = 'list';
    /** @private {string|null} */ this._selectedPresetId = null;
    /** @private {string[]} */ this._draftMembers = [];
    /** @private {string} */ this._searchQuery = '';

    for (const eventClass of [TeamPresetsChangedEvent, TeamChangedEvent, BoxChangedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** Rebuilds from the active save on every opening. @override */
  onEnter() {
    super.onEnter();
    this._view = 'list';
    this._selectedPresetId = null;
    this._draftMembers = [];
    this._searchQuery = '';
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._view = 'list';
    this._selectedPresetId = null;
    this._draftMembers = [];
    this._searchQuery = '';
  }

  /** @private */
  _render() {
    this.clearChildren();
    if (this._view === 'edit' && this._selectedPresetId) {
      this._renderEditor();
    } else {
      this._renderList();
    }
  }

  /** @private */
  _renderList() {
    const presets = TeamPresetSystem.getInstance();
    const all = presets.getAll();
    const activeId = presets.getData()?.activeId;
    this.addChild(new UIText({ tagName: 'div', className: 'preset-manager-hint', text: t('presets_hint') }));

    const grid = new UIContainer({ className: 'preset-list pw-preset-grid' });
    all.forEach((slot, index) => {
      const defaultName = this._getSlotName(slot, index);
      const members = presets.getResolvedMembers(slot.id);
      const row = new UIContainer({ className: `preset-row${slot.id === activeId ? ' active' : ''}` });
      row.addChild(new UIText({ tagName: 'span', className: 'preset-row-idx', text: String(index + 1) }));

      const nameInput = new UITextInput({
        value: slot.name || '',
        placeholder: defaultName,
        maxLength: TeamPresetRules.NAME_MAX_LENGTH,
        className: 'preset-name-input',
        onSubmit: (value) => this._rename(slot.id, value),
        onChange: (value) => this._rename(slot.id, value)
      });
      nameInput.setAttribute('aria-label', t('preset_name_label', { name: defaultName }));
      row.addChild(nameInput);

      const chips = new UIContainer({ tagName: 'span', className: 'preset-row-chips' });
      if (members.length === 0) {
        chips.addChild(new UIText({ tagName: 'span', className: 'preset-chip-empty', text: t('preset_empty') }));
      } else {
        for (const member of members.slice(0, TeamPresetRules.MAX_MEMBERS)) {
          if (!member.pokemon) {
            const missing = new UIText({ tagName: 'span', className: 'preset-chip missing', text: t('preset_missing_symbol') });
            missing.setTooltip(t('preset_missing_hint'));
            chips.addChild(missing);
            continue;
          }
          const pokemon = member.pokemon;
          const label = pokemon.getDisplayName();
          const chip = new UIContainer({
            tagName: 'span',
            className: `preset-chip${member.source === 'box' ? ' in-box' : ''}`,
            children: [new UIPokemonSprite({
              species: pokemon.species,
              form: pokemon.form,
              shiny: pokemon.shiny,
              alt: label,
              size: PokemonSpriteSizes.CONTEXT
            })]
          });
          chip.setTooltip(t('preset_member_tooltip', { name: label, source: t(member.source === 'box' ? 'preset_in_box_tag' : 'preset_in_team_tag') }));
          chips.addChild(chip);
        }
      }
      row.addChild(chips);
      row.addChild(new UIText({
        tagName: 'span',
        className: 'preset-row-count',
        text: `${members.length}/${TeamPresetRules.MAX_MEMBERS}`
      }));
      const actions = new UIContainer({ tagName: 'div', className: 'preset-row-actions' });
      if (slot.id === activeId) actions.addChild(new UIText({ tagName: 'span', className: 'preset-active-tag', text: t('preset_active_tag') }));
      actions.addChildren([
        new UIButton({ text: t('preset_load_btn'), variant: 'hbtn', size: 'sm', onClick: () => this._load(slot.id) }),
        new UIButton({ text: t('preset_save_btn'), variant: 'hbtn', size: 'sm', onClick: () => this._saveCurrent(slot.id) }),
        new UIButton({ text: t('preset_edit_btn'), variant: 'hbtn', size: 'sm', onClick: () => this._openEditor(slot.id) })
      ]);
      row.addChild(actions);
      grid.addChild(row);
    });
    this.addChild(grid);
    this.addChild(new UIContainer({
      className: 'pw-presets-footer',
      children: [new UIButton({ text: t('close_btn'), variant: 'secondary', onClick: () => this.close() })]
    }));
  }

  /** @private */
  _renderEditor() {
    const presets = TeamPresetSystem.getInstance();
    const slot = presets.getPreset(this._selectedPresetId);
    if (!slot) {
      this._view = 'list';
      this._renderList();
      return;
    }
    const index = TeamPresetRules.PRESET_IDS.indexOf(slot.id);
    const defaultName = this._getSlotName(slot, index);
    const wrapper = new UIContainer({ className: 'pw-preset-editor' });
    wrapper.addChild(new UIButton({
      text: t('back_to_presets'),
      variant: 'ghost',
      size: 'sm',
      className: 'pw-preset-back',
      onClick: () => {
        this._view = 'list';
        this._selectedPresetId = null;
        this._render();
      }
    }));
    wrapper.addChild(new UIText({ tagName: 'h3', className: 'pw-preset-editor-title', text: t('preset_editor_sub') }));

    const nameInput = new UITextInput({
      value: slot.name || '',
      placeholder: defaultName,
      maxLength: TeamPresetRules.NAME_MAX_LENGTH,
      className: 'pw-preset-name-input',
      onSubmit: (value) => this._rename(slot.id, value)
    });
    wrapper.addChild(new UIContainer({
      className: 'pw-preset-name-row',
      children: [
        nameInput,
        new UIButton({ text: t('preset_save_name_btn'), variant: 'secondary', size: 'sm', onClick: () => this._rename(slot.id, nameInput.getValue()) })
      ]
    }));
    wrapper.addChild(new UIText({ tagName: 'div', className: 'pw-preset-editor-hint', text: t('preset_editor_manage_hint') }));

    const memberList = new UIContainer({ className: 'pw-preset-members' });
    wrapper.addChild(new UIText({ tagName: 'h4', className: 'pw-preset-section-title', text: t('preset_members_title', { count: this._draftMembers.length }) }));
    for (const [indexInParty, uid] of this._draftMembers.entries()) {
      const resolved = presets.resolvePokemon(uid);
      const pokemon = resolved?.pokemon;
      const label = pokemon ? pokemon.getDisplayName() : t('preset_missing_hint');
      const row = new UIContainer({
        className: `pw-preset-member${pokemon ? '' : ' is-missing'}`,
        children: [
          pokemon && new UIPokemonSprite({ species: pokemon.species, form: pokemon.form, alt: label, size: PokemonSpriteSizes.STANDARD, className: 'pw-preset-member-sprite' }),
          new UIText({ tagName: 'span', className: 'pw-preset-member-name', text: `${indexInParty + 1}. ${label}` }),
          new UIContainer({
            className: 'pw-preset-member-actions',
            children: [
              new UIButton({ text: t('preset_move_up'), variant: 'ghost', size: 'sm', disabled: indexInParty === 0, onClick: () => this._moveMember(indexInParty, -1) }),
              new UIButton({ text: t('preset_move_down'), variant: 'ghost', size: 'sm', disabled: indexInParty === this._draftMembers.length - 1, onClick: () => this._moveMember(indexInParty, 1) }),
              new UIButton({ text: t('preset_remove_member'), variant: 'danger', size: 'sm', onClick: () => this._removeMember(uid) })
            ]
          })
        ]
      });
      memberList.addChild(row);
    }
    if (!this._draftMembers.length) {
      memberList.addChild(new UIText({ tagName: 'div', className: 'pw-preset-empty', text: t('preset_no_members') }));
    }
    wrapper.addChild(memberList);

    const candidateArea = new UIContainer({ className: 'pw-preset-picker' });
    candidateArea.addChild(new UIText({ tagName: 'h4', className: 'pw-preset-section-title', text: t('preset_pick_poke_title') }));
    const candidates = new UIContainer({ className: 'pw-preset-candidates' });
    const search = new UITextInput({
      value: this._searchQuery,
      placeholder: t('preset_pick_search_ph'),
      className: 'pw-preset-search',
      onInput: (value) => {
        this._searchQuery = value;
        this._renderCandidates(candidates);
      }
    });
    candidateArea.addChild(search);
    candidateArea.addChild(candidates);
    wrapper.addChild(candidateArea);
    this._renderCandidates(candidates);

    wrapper.addChild(new UIContainer({
      className: 'pw-preset-editor-actions',
      children: [
        new UIButton({ text: t('preset_apply_btn'), variant: 'primary', disabled: this._draftMembers.length === 0, onClick: () => this._applyDraft(slot.id) }),
        new UIButton({ text: t('preset_save_current_btn'), variant: 'secondary', onClick: () => this._saveCurrent(slot.id) }),
        new UIButton({ text: t('preset_save_editor_btn'), variant: 'success', onClick: () => this._saveDraft(slot.id) })
      ]
    }));
    this.addChild(wrapper);
  }

  /** @private @param {UIContainer} target */
  _renderCandidates(target) {
    target.clearChildren();
    const selected = new Set(this._draftMembers);
    const query = this._searchQuery.trim().toLocaleLowerCase();
    const roster = TeamPresetSystem.getInstance().getRosterMembers();
    let shown = 0;
    for (const { pokemon, source } of roster) {
      if (selected.has(pokemon.uid)) continue;
      const name = pokemon.getDisplayName();
      const searchable = `${name} ${pokemon.species} ${pokemon.uid}`.toLocaleLowerCase();
      if (query && !searchable.includes(query)) continue;
      const sourceLabel = t(source === 'team' ? 'preset_in_team_tag' : 'preset_in_box_tag');
      target.addChild(new UIButton({
        text: `${name} · ${sourceLabel}`,
        variant: 'secondary',
        size: 'sm',
        className: 'pw-preset-candidate',
        disabled: this._draftMembers.length >= TeamPresetRules.MAX_MEMBERS,
        onClick: () => this._addMember(pokemon.uid)
      }));
      shown++;
    }
    if (shown === 0) target.addChild(new UIText({ tagName: 'div', className: 'pw-preset-empty', text: query ? t('no_pokemon_found') : t('preset_no_candidates') }));
  }

  /** @private @param {{id:string,name:string|null}} slot @param {number} index */
  _getSlotName(slot, index) {
    const defaultKey = TeamPresetRules.DEFAULT_NAME_KEYS[slot.id];
    return slot.name || (defaultKey ? t(defaultKey) : t('preset_default_name', { n: index + 1 }));
  }

  /** @private @param {string} id */
  _openEditor(id) {
    const slot = TeamPresetSystem.getInstance().getPreset(id);
    if (!slot) return;
    this._selectedPresetId = id;
    this._draftMembers = [...slot.members];
    this._searchQuery = '';
    this._view = 'edit';
    this._render();
  }

  /** @private @param {number} index @param {number} delta */
  _moveMember(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= this._draftMembers.length) return;
    [this._draftMembers[index], this._draftMembers[next]] = [this._draftMembers[next], this._draftMembers[index]];
    this._render();
  }

  /** @private @param {string} uid */
  _addMember(uid) {
    if (this._draftMembers.length >= TeamPresetRules.MAX_MEMBERS || this._draftMembers.includes(uid)) return;
    this._draftMembers.push(uid);
    this._render();
  }

  /** @private @param {string} uid */
  _removeMember(uid) {
    this._draftMembers = this._draftMembers.filter((memberUid) => memberUid !== uid);
    this._render();
  }

  /** @private @param {string} id @param {string} name */
  _rename(id, name) {
    if (TeamPresetSystem.getInstance().rename(id, name)) this._notify(t('preset_name_saved'));
  }

  /** @private @param {string} id */
  _saveCurrent(id) {
    if (!TeamPresetSystem.getInstance().saveCurrentToPreset(id)) return;
    const slot = TeamPresetSystem.getInstance().getPreset(id);
    if (this._view === 'edit' && this._selectedPresetId === id) {
      this._draftMembers = [...slot.members];
      this._render();
    }
    this._notify(t('preset_saved', { name: this._getSlotName(slot, TeamPresetRules.PRESET_IDS.indexOf(id)), count: slot.members.length }));
  }

  /** @private @param {string} id */
  _saveDraft(id) {
    if (!TeamPresetSystem.getInstance().setMembers(id, this._draftMembers)) return;
    const slot = TeamPresetSystem.getInstance().getPreset(id);
    this._draftMembers = [...slot.members];
    this._notify(t('preset_saved', { name: this._getSlotName(slot, TeamPresetRules.PRESET_IDS.indexOf(id)), count: slot.members.length }));
  }

  /** @private @param {string} id */
  _applyDraft(id) {
    if (!TeamPresetSystem.getInstance().setMembers(id, this._draftMembers)) return;
    this._load(id);
  }

  /** @private @param {string} id */
  _load(id) {
    const result = TeamPresetSystem.getInstance().load(id);
    if (!result.ok) {
      const messageKey = result.reason === 'battle'
        ? 'cannot_change_team_battle'
        : result.reason === 'not-found'
          ? 'preset_pokemon_not_found'
          : 'preset_empty';
      this._notify(t(messageKey));
      return;
    }
    const slot = TeamPresetSystem.getInstance().getPreset(id);
    this._notify(t('preset_loaded', { name: this._getSlotName(slot, TeamPresetRules.PRESET_IDS.indexOf(id)), count: result.count }));
    this._view = 'list';
    this._selectedPresetId = null;
    this._render();
  }

  /** @private @param {string} message */
  _notify(message) {
    NotificationSystem.getInstance().notifyTemporary(message, { channel: NotificationChannels.GAMEPLAY });
  }
}
