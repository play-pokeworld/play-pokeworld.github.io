/**
 * @file NavMenu.js
 * @brief Navigation menu opened by the Poké Ball of the header.
 * The button is the brand mark of HeaderPanel (#nav-menu-btn); this overlay only listens to it.
 * The tiles reuse the SHORTCUTS config, so a screen is never listed twice with its own copy of
 * its label or of its modal id.
 */

import { UIContainer } from './UIContainer.js';
import { UIButton } from './UIButton.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { SHORTCUTS } from '../config/Shortcuts.js';
import { FeatureAccessSystem } from '../systems/FeatureAccessSystem.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

/** Screens that have no shortcut button but belong in the navigation menu. */
const EXTRA_ENTRIES = Object.freeze([
  { labelKey: 'panel_team', icon: 'team', modalId: ModalIds.TEAM },
  { labelKey: 'settings_title', icon: 'settings', modalId: ModalIds.SETTINGS }
]);

export class NavMenu extends UIContainer {
  constructor() {
    super({ id: 'nav-menu', className: 'pw-nav-menu', name: 'NavMenu', tag: 'Panel' });
    this.setAttribute('hidden', '');

    this._scrim = new UIContainer({ className: 'pw-nav-scrim' });
    this._scrim.addDomListener('click', () => this.close());

    this._panel = new UIContainer({ className: 'pw-nav-panel' });
    this._tiles = new UIContainer({ className: 'pw-nav-tiles' });
    this._panel.addChild(this._tiles);

    this.addChildren([this._scrim, this._panel]);
    this._renderTiles();

    // The header is built after this panel, so the button is reached by delegation
    // instead of being captured once at construction.
    this._onDocumentClick = (event) => {
      const button = event.target?.closest?.('#nav-menu-btn');
      if (button) this.toggle();
    };
    this._onKeyDown = (event) => {
      if (event.key === 'Escape' && this.isOpen()) this.close();
      const button = event.target?.closest?.('#nav-menu-btn');
      if (button && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        this.toggle();
      }
    };
    this.listen(ContentAccessChangedEvent, () => this._renderTiles());
  }

  /**
   * Installs the document listeners that drive the menu.
   * @returns {NavMenu}
   */
  mount() {
    document.addEventListener('click', this._onDocumentClick);
    document.addEventListener('keydown', this._onKeyDown);
    return this;
  }

  /** @private @returns {HTMLElement|null} The header button, resolved on demand. */
  _button() {
    return document.getElementById('nav-menu-btn');
  }

  /** @returns {boolean} */
  isOpen() {
    return !this._dom.hasAttribute('hidden');
  }

  /** Opens the menu. */
  open() {
    this._dom.removeAttribute('hidden');
    const button = this._button();
    button?.classList.add('is-open');
    button?.setAttribute('aria-expanded', 'true');
    button?.setAttribute('aria-controls', 'nav-menu');
  }

  /** Closes the menu. */
  close() {
    this._dom.setAttribute('hidden', '');
    const button = this._button();
    button?.classList.remove('is-open');
    button?.setAttribute('aria-expanded', 'false');
  }

  /** Opens the menu when closed, closes it when open. */
  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  /** @private Rebuilds the tiles from the shortcut config, filtered by access. */
  _renderTiles() {
    this._tiles.clearChildren();
    const snapshot = FeatureAccessSystem.getInstance().getSnapshot();
    const entries = [];
    for (const shortcut of SHORTCUTS) {
      if (shortcut.requiresChampionTitle && !snapshot.championTitle) continue;
      if (shortcut.requiresMarketGate && !FeatureAccessSystem.getInstance().isMarketUnlocked()) continue;
      entries.push({ labelKey: shortcut.labelKey, icon: shortcut.icon, modalId: shortcut.modalId });
    }
    entries.push(...EXTRA_ENTRIES);
    for (const entry of entries) this._tiles.addChild(this._createTile(entry));
  }

  /**
   * @private
   * @param {{labelKey:string, icon:string, modalId:string}} entry
   * @returns {UIButton}
   */
  _createTile(entry) {
    return new UIButton({
      className: 'pw-nav-tile',
      icon: entry.icon,
      text: t(entry.labelKey),
      onClick: () => {
        this.close();
        if (entry.modalId) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(entry.modalId));
      }
    });
  }
}
