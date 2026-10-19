/**
 * @file StarterModal.js
 * @brief Starter Pokémon selection dialog (C++: class StarterModal : public UIModal).
 * Layout (top to bottom), matching the original StarterModalView plus the rework addition:
 *   1. welcome line, 2. title + subtitle,
 *   3. trainer nickname field (rework addition — required before picking),
 *   4. the three starter cards, 5. footer: "Back" button (rework addition) + hint.
 * No header bar and backdrop clicks are ignored; "Back" or Escape returns to the save menu.
 * Opened through `new ModalOpenRequestedEvent(ModalIds.STARTER)`.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { UITextInput } from '../ui/UITextInput.js';
import { UIButton } from '../ui/UIButton.js';
import { ModalIds } from '../config/ModalIds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { STARTERS_BY_REGION, DEFAULT_STARTER_REGION } from '../data/pokemon/StarterData.js';
import { GameConfig } from '../config/GameConfig.js';
import { t } from '../localization/LocalizationManager.js';

const NAME_INPUT_ID = 'starter-name-input';

export class StarterModal extends UIModal {
  /**
   * @param {Object} [options={}]
   * @param {Function} [options.onStarterChosen=null] - (trainerName, species) => void
   * @param {string} [options.region]                 - Key of STARTERS_BY_REGION
   */
  constructor(options = {}) {
    super({
      id: ModalIds.STARTER,
      overlayId: 'starter-modal',
      overlayClassName: 'pw-starter-overlay',
      className: 'starter-modal-window',
      size: 'lg',
      hasHeader: false,
      hasFooter: false,
      closeOnBackdrop: false,
      showCloseBtn: false,
      name: 'StarterModal'
    });

    this._onStarterChosen = options.onStarterChosen || null;
    this._region = options.region || DEFAULT_STARTER_REGION;

    /** @private @type {UITextInput|null} */
    this._nameInput = null;
    /** @private @type {UIText|null} */
    this._nameError = null;
    /** @private @type {UIContainer[]} */
    this._cards = [];

    this.addDomListener('keydown', (event) => {
      if (event.key === 'Escape') this._cancel();
    });

    this.onInit();
  }

  onInit() {
    this._renderContent();
  }

  /**
   * Opens the modal for a new save; the nickname field starts empty.
   */
  open() {
    this._renderContent();
    super.open();
    this._nameInput.focus();
  }

  /** @private */
  _renderContent() {
    this.clearChildren();
    this._cards = [];

    // 1-2. Welcome line, title and subtitle (original classes kept for parity)
    this.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-center starter-welcome', text: t(`starter_welcome_${this._region}`) }));

    const titleBlock = new UIContainer({ className: 'pw-center starter-title-block' });
    titleBlock.addChild(new UIText({ tagName: 'div', id: 'starter-modal-title', className: 'pw-text-md pw-bold pw-light2', text: t(`starter_title_${this._region}`) }));
    titleBlock.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('starter_subtitle') }));
    this.addChild(titleBlock);

    // 3. Trainer nickname (rework addition)
    this.addChild(this._buildNameField());

    // 4. Starter cards
    const stack = new UIContainer({ className: 'starter-cards-stack' });
    for (const starter of STARTERS_BY_REGION[this._region] || []) {
      const card = this._buildStarterCard(starter);
      this._cards.push(card);
      stack.addChild(card);
    }
    this.addChild(stack);

    // 5. Footer: back to the save menu (rework addition) + hint
    const backButton = new UIButton({
      className: 'starter-back-btn',
      variant: 'secondary',
      size: 'sm',
      icon: 'chevronLeft',
      text: t('starter_back_btn'),
      onClick: () => this._cancel()
    });
    backButton.setTooltip(t('starter_back_tooltip'));
    this.addChild(new UIContainer({
      className: 'starter-modal-footer-row',
      children: [
        backButton,
        new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 starter-modal-footer', text: t('starter_required') })
      ]
    }));
  }

  /** @private @returns {UIContainer} */
  _buildNameField() {
    const field = new UIContainer({ className: 'starter-name-field' });

    field.addChild(new UIText({
      tagName: 'label',
      className: 'starter-name-label',
      text: t('starter_trainer_name'),
      htmlFor: NAME_INPUT_ID
    }));

    this._nameInput = new UITextInput({
      id: NAME_INPUT_ID,
      className: 'starter-name-input',
      placeholder: t('starter_trainer_placeholder'),
      maxLength: GameConfig.TRAINER_NAME_MAX_LENGTH,
      onInput: () => this._setNameError(false),
      onSubmit: () => {
        if (this._validateName() && this._cards.length > 0) this._cards[0].focus();
      }
    });
    field.addChild(this._nameInput);

    this._nameError = new UIText({ tagName: 'div', className: 'starter-name-error', text: t('starter_name_required') });
    this._nameError.setAttribute('role', 'alert');
    this._nameError.setVisible(false);
    field.addChild(this._nameError);

    return field;
  }

  /**
   * @private
   * @param {import('../data/pokemon/StarterData.js').StarterDefinition} starter
   * @returns {UIContainer}
   */
  _buildStarterCard(starter) {
    const name = t(starter.nameKey);
    const card = new UIContainer({ className: 'starter-card starter-card--custom' });
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setData('starterId', starter.species);
    card.setData('starterRegion', this._region);

    const sprite = new UIContainer({ className: 'poke-sprite' });
    sprite.addChild(new UIPokemonSprite({ species: starter.species, alt: name, size: PokemonSpriteSizes.LARGE }));
    card.addChild(sprite);

    const info = new UIContainer({ className: 'pw-flex-1' });
    const nameRow = new UIContainer({ className: 'poke-name pw-text-md' });
    nameRow.addChild(new UIText({ text: name }));
    nameRow.addChild(new UIText({ className: 'pw-text-sm starter-dex-number', text: t('starter_dex_number', { id: PokemonDB.getInstance().getById(starter.species)?.dex ?? 0 }) }));
    info.addChild(nameRow);
    info.addChild(new UIText({ tagName: 'div', className: 'pw-text-glow', text: t(starter.descKey) }));
    card.addChild(info);

    card.addChild(new UIText({ tagName: 'div', className: 'starter-choose-label', text: t('starter_choose_btn') }));

    card.addDomListener('click', () => this._pickStarter(starter));
    card.addDomListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._pickStarter(starter);
      }
    });
    return card;
  }

  /**
   * @private
   * @returns {boolean} true when a nickname has been typed
   */
  _validateName() {
    const valid = this._nameInput.getValue().length > 0;
    this._setNameError(!valid);
    return valid;
  }

  /** @private @param {boolean} visible */
  _setNameError(visible) {
    this._nameInput.setInvalid(visible);
    this._nameError.setVisible(visible);
  }

  /** @private Closes without creating a save (the save menu stays underneath). */
  _cancel() {
    if (!this.isOpen()) return;
    console.log(t('debug_starter_cancelled'));
    this.close();
  }

  /** @private */
  _pickStarter(starter) {
    if (!this._validateName()) {
      console.warn(t('debug_starter_name_missing'));
      this._nameInput.focus();
      return;
    }

    const trainerName = this._nameInput.getValue();
    console.log(t('debug_starter_picked', { id: starter.species, name: t(starter.nameKey) }));
    this.close();

    if (this._onStarterChosen) {
      this._onStarterChosen(trainerName, starter.species);
    }
  }
}
