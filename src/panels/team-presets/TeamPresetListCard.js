/** @file TeamPresetListCard.js @brief Stable manager row: editable name, canonical sprite chips and real preset actions. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { TeamPresetRules } from '../../config/TeamPresetRules.js';
import { TeamPresetSystem } from '../../systems/TeamPresetSystem.js';
import { t } from '../../localization/LocalizationManager.js';

export class TeamPresetListCard extends UIContainer {
  /** @param {Object} slot @param {Object} actions */
  constructor(slot, actions) {
    super({ className: 'preset-row', name: 'TeamPresetListCard' });
    this._id = slot.id;
    this._editing = false;
    this._signature = '';
    const index = TeamPresetRules.PRESET_IDS.indexOf(slot.id),
      name =
        slot.name ||
        t(TeamPresetRules.DEFAULT_NAME_KEYS[slot.id] || 'preset_default_name', {
          n: index + 1,
        });
    this._name = new UITextInput({
      value: name,
      placeholder: name,
      maxLength: TeamPresetRules.NAME_MAX_LENGTH,
      className: 'preset-name-input',
      onChange: (value) => actions.rename(slot.id, value),
      onSubmit: (value) => actions.rename(slot.id, value),
    });
    this._name.setAriaLabel(t('preset_name_label', { name }));
    this._name.setData('focusKey', `preset-name-${slot.id}`);
    this._name.addDomListener('focus', () => {
      this._editing = true;
    });
    this._name.addDomListener('blur', () => {
      this._editing = false;
    });
    this._chips = new UIContainer({ className: 'preset-row-chips' });
    this._count = new UIText({ className: 'preset-row-count' });
    this._active = new UIText({
      className: 'preset-active-tag',
      text: t('preset_active_tag'),
    });
    this.addChildren([
      new UIText({ className: 'preset-row-idx', text: String(index + 1) }),
      this._name,
      this._chips,
      this._count,
      new UIContainer({
        className: 'preset-row-actions',
        children: [
          this._active,
          new UIButton({
            className: 'hbtn',
            text: t('preset_load_btn'),
            onClick: () => actions.load(slot.id),
          }),
          new UIButton({
            className: 'hbtn',
            text: t('preset_save_btn'),
            onClick: () => actions.save(slot.id),
          }),
          new UIButton({
            className: 'hbtn',
            text: t('preset_edit_btn'),
            onClick: () => actions.edit(slot.id),
          }),
        ],
      }),
    ]);
    this.setData('presetId', slot.id);
  }
  /** Updates in place; roster ticks never discard a name being typed. @param {Object} slot @param {string} activeId */
  setModel(slot, activeId) {
    const system = TeamPresetSystem.getInstance(),
      members = system.getResolvedMembers(slot.id);
    if (!this._editing)
      this._name.setValue(
        slot.name ||
          t(
            TeamPresetRules.DEFAULT_NAME_KEYS[slot.id] || 'preset_default_name',
            { n: TeamPresetRules.PRESET_IDS.indexOf(slot.id) + 1 },
          ),
      );
    this._count.setText(
      t('preset_member_count', {
        count: members.length,
        max: TeamPresetRules.MAX_MEMBERS,
      }),
    );
    this.toggleClass('active', slot.id === activeId);
    this._active.setVisible(slot.id === activeId);
    const signature = JSON.stringify(
      members.map(({ uid, pokemon, source }) => [
        uid,
        pokemon?.species,
        pokemon?.form,
        pokemon?.shiny,
        source,
      ]),
    );
    if (signature === this._signature) return;
    this._signature = signature;
    this._chips.clearChildren();
    if (!members.length) {
      this._chips.addChild(
        new UIText({ className: 'preset-chip-empty', text: t('preset_empty') }),
      );
      return;
    }
    for (const member of members) {
      if (!member.pokemon) {
        this._chips.addChild(
          new UIText({
            className: 'preset-chip missing',
            text: t('preset_missing_symbol'),
          }),
        );
        continue;
      }
      const pokemon = member.pokemon,
        chip = new UIContainer({
          tagName: 'span',
          className: `preset-chip${member.source === 'box' ? ' in-box' : ''}`,
          children: [
            new UIPokemonSprite({
              loading: 'eager',
              species: pokemon.species,
              form: pokemon.form,
              shiny: pokemon.shiny,
              alt: pokemon.getDisplayName(),
              size: 'context',
            }),
          ],
        });
      chip.setTooltip(
        t('preset_member_tooltip', {
          name: pokemon.getDisplayName(),
          source: t(
            member.source === 'box'
              ? 'preset_in_box_tag'
              : 'preset_in_team_tag',
          ),
        }),
      );
      this._chips.addChild(chip);
    }
  }
}
