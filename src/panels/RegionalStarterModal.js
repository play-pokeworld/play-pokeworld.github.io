/**
 * @file RegionalStarterModal.js
 * @brief Mandatory first-starter choice when a newly unlocked region is entered.
 */
import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { STARTERS_BY_REGION } from '../data/pokemon/StarterData.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { RegionalStarterSystem } from '../systems/RegionalStarterSystem.js';
import { ModalIds } from '../config/ModalIds.js';
import { RegionalStarterRequiredEvent } from '../core/events/RegionalStarterRequiredEvent.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class RegionalStarterModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.REGIONAL_STARTER,
      overlayId: 'regional-starter-modal',
      overlayClassName: 'pw-starter-overlay',
      className: 'starter-modal-window',
      size: 'lg',
      hasHeader: false,
      hasFooter: false,
      closeOnBackdrop: false,
      showCloseBtn: false,
      name: 'RegionalStarterModal'
    });
    this._regionId = null;
    this._error = null;
    this.listen(RegionalStarterRequiredEvent, (event) => {
      if (!this.isOpen()) this.open({ regionId: event.regionId });
    });
    this.listen(LanguageChangedEvent, () => {
      if (this.isOpen()) this._renderContent();
    });
    this.addDomListener('keydown', (event) => {
      if (event.key === 'Escape') event.preventDefault();
    });
  }

  /** @override @param {{regionId?:string}} [params={}] */
  onEnter({ regionId } = {}) {
    super.onEnter();
    this._regionId = typeof regionId === 'string' ? regionId : null;
    this._renderContent();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._regionId = null;
    this._error = null;
  }

  /** @private */
  _renderContent() {
    this.clearChildren();
    const starters = STARTERS_BY_REGION[this._regionId] || [];
    if (starters.length === 0) return;

    this.addChild(new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1 pw-center starter-welcome',
      text: t(`starter_welcome_${this._regionId}`)
    }));
    const titleBlock = new UIContainer({ className: 'pw-center starter-title-block' });
    titleBlock.addChild(new UIText({
      tagName: 'div',
      id: 'starter-modal-title',
      className: 'pw-text-md pw-bold pw-light2',
      text: t(`starter_title_${this._regionId}`)
    }));
    titleBlock.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('starter_subtitle') }));
    this.addChild(titleBlock);

    this._error = new UIText({ tagName: 'div', className: 'starter-name-error', text: '' });
    this._error.setAttribute('role', 'alert');
    this._error.setVisible(false);
    this.addChild(this._error);

    const stack = new UIContainer({ className: 'starter-cards-stack' });
    for (const starter of starters) stack.addChild(this._buildStarterCard(starter));
    this.addChild(stack);
    this.addChild(new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1 starter-modal-footer',
      text: t('starter_required')
    }));
  }

  /** @private @param {Readonly<Object>} starter @returns {UIContainer} */
  _buildStarterCard(starter) {
    const name = t(starter.nameKey);
    const card = new UIContainer({ className: 'starter-card starter-card--custom' });
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', t('regional_starter_choose_aria', { name }));
    card.setAttribute('data-starter-id', starter.species);
    card.setAttribute('data-starter-region', this._regionId);

    const sprite = new UIContainer({ className: 'poke-sprite' });
    sprite.addChild(new UIPokemonSprite({ species: starter.species, alt: name, size: PokemonSpriteSizes.LARGE }));
    card.addChild(sprite);

    const info = new UIContainer({ className: 'pw-flex-1' });
    const nameRow = new UIContainer({ className: 'poke-name pw-text-md' });
    nameRow.addChild(new UIText({ text: name }));
    nameRow.addChild(new UIText({
      className: 'pw-text-sm starter-dex-number',
      text: t('starter_dex_number', { id: PokemonDB.getInstance().getById(starter.species)?.dex ?? 0 })
    }));
    info.addChild(nameRow);
    info.addChild(new UIText({ tagName: 'div', className: 'pw-text-glow', text: t(starter.descKey) }));
    card.addChild(info);
    card.addChild(new UIText({ tagName: 'div', className: 'starter-choose-label', text: t('starter_choose_btn') }));

    card.addDomListener('click', () => this._choose(starter));
    card.addDomListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._choose(starter);
      }
    });
    return card;
  }

  /** @private @param {Readonly<Object>} starter */
  _choose(starter) {
    const result = RegionalStarterSystem.getInstance().chooseStarter(this._regionId, starter.species);
    if (!result.success) {
      this._error?.setText(t('regional_starter_selection_failed'));
      this._error?.setVisible(true);
      return;
    }
    this.close();
  }
}
