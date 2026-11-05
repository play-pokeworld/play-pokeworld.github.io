/** @file UpdateBanner.js — accessible, localized global update notice. */
import { UIElement } from './UIElement.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIButton } from './UIButton.js';
import { EventBus } from '../core/EventBus.js';
import { UpdateAvailableEvent } from '../core/events/UpdateAvailableEvent.js';
import { UpdateBannerDismissedEvent } from '../core/events/UpdateBannerDismissedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class UpdateBanner extends UIElement {
  constructor() {
    super({ id: 'pw-update-banner', name: 'UpdateBanner', tagName: 'aside' });
    this.addClass('pw-update-banner');
    this.setAttribute('role', 'alert');
    this.setAttribute('aria-live', 'polite');
    this.setVisible(false);

    this.addChild(new UIText({ className: 'pw-update-banner-text', text: t('update_available') }));
    const actions = new UIContainer({ className: 'pw-update-banner-actions' });
    actions.addChild(new UIButton({
      className: 'pw-update-banner-btn',
      text: t('update_now'),
      onClick: () => { if (typeof window !== 'undefined') window.location.reload(); }
    }));
    const dismiss = new UIButton({
      className: 'pw-update-banner-close',
      icon: 'close',
      onClick: () => EventBus.getInstance().dispatch(new UpdateBannerDismissedEvent())
    });
    dismiss.setAriaLabel(t('dismiss_update'));
    actions.addChild(dismiss);
    this.addChild(actions);

    this.listen(UpdateAvailableEvent, () => this.setVisible(true));
    this.listen(UpdateBannerDismissedEvent, () => this.setVisible(false));
  }
}
