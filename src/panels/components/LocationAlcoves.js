/** @file LocationAlcoves.js @brief Route-specific secret-base rows below encounters/drops, with stable live confirmation. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { ConfirmDialog } from '../../ui/ConfirmDialog.js';
import { SecretBaseSystem } from '../../systems/SecretBaseSystem.js';
import { LocationSystem } from '../../systems/LocationSystem.js';
import { SecretBaseRules } from '../../config/SecretBaseRules.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { SecretBaseChangedEvent } from '../../core/events/SecretBaseChangedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class LocationAlcoves extends UIContainer {
  constructor() {
    super({ className: 'pw-location-alcoves', name: 'LocationAlcoves' });
    this._locationId = '';
    this._signature = '';
    this._title = new UIText({
      tagName: 'div',
      className: 'pw-loc-section-title',
    });
    this._description = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1',
    });
    this._rows = new UIContainer({ className: 'pw-loc-alcove-list' });
    this._confirm = new ConfirmDialog({
      id: SecretBaseRules.LOCATION_CONFIRM_ID,
    });
    this.addChildren([
      this._title,
      this._description,
      this._rows,
      this._confirm,
    ]);
    this.listen(SecretBaseChangedEvent, () => this.refresh());
    for (const type of [SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent])
      this.listen(type, () => {
        this._confirm.close();
        this._signature = '';
        this.setLocation(LocationSystem.getInstance().getCurrentLocationId());
      });
  }
  /** @param {string} locationId */
  setLocation(locationId) {
    if (locationId !== this._locationId) {
      this._confirm.close();
      this._signature = '';
      this._locationId = locationId;
    }
    this.refresh();
  }
  /** Only a route/base change rebuilds these controls, never a KO or roster refresh. */
  refresh() {
    const state = SecretBaseSystem.getInstance().getLocationAlcovesSnapshot(
        this._locationId,
      ),
      signature = JSON.stringify(state);
    if (signature === this._signature) return;
    this._signature = signature;
    this.setVisible(!!state);
    if (!state) {
      this._confirm.close();
      return;
    }
    const location = t(`location.${state.locationId}`),
      layout = state.baseLayoutId ? t(`win.layout.${state.baseLayoutId}`) : '';
    this._title.setText(
      t(state.here ? 'location_alcoves_here_title' : 'location_alcoves_title', {
        location,
      }),
    );
    this._description.setText(
      !state.established
        ? t('location_alcoves_none')
        : state.here
          ? t('location_alcoves_here', { layout })
          : state.baseLocationId
            ? t('location_alcoves_elsewhere', {
                location: t(`location.${state.baseLocationId}`),
              })
            : t('location_alcoves_elsewhere_unknown'),
    );
    this._description.toggleClass('pw-text-positive', state.here);
    this._rows.clearChildren();
    for (const room of state.rows) {
      const row = new UIContainer({
        className: 'pw-loc-alcove-row',
        children: [
          new UIText({
            className: 'pw-text-sm pw-loc-alcove-name',
            text: t(`win.layout.${room.id}`),
          }),
        ],
      });
      row.setData('secretBaseLayout', room.id);
      if (room.current)
        row.addChildren([
          new UIText({
            className: 'pw-text-sm pw-text-positive',
            text: t('location_alcoves_current'),
          }),
          new UIButton({
            className: 'hbtn',
            text: t('location_alcoves_enter'),
            onClick: () => this._visit(room.id, true),
          }),
        ]);
      else
        row.addChildren([
          new UIButton({
            className: 'hbtn',
            text: t('location_alcoves_visit'),
            onClick: () => this._visit(room.id, false),
          }),
          new UIButton({
            className: 'hbtn',
            text: t('location_alcoves_establish'),
            onClick: () => this._establish(room.id),
          }),
        ]);
      this._rows.addChild(row);
    }
  }
  /** @private */
  _visit(layoutId, own) {
    const system = SecretBaseSystem.getInstance(),
      result = own
        ? system.startOwnVisit({ fromLocation: true })
        : system.startAlcoveVisit(this._locationId, layoutId);
    if (result.ok)
      EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_VISIT),
      );
  }
  /** @private Domain commands revalidate progression, route, layout and current save. */
  _establish(layoutId) {
    const system = SecretBaseSystem.getInstance(),
      state = system.getLocationAlcovesSnapshot(this._locationId);
    if (!state) return;
    if (!state.established) {
      system.establish(state.locationId, layoutId);
      return;
    }
    this._confirm.ask({
      title: t('action.move_confirm_title'),
      message: t('action.move_confirm_message'),
      confirmLabel: t('action.move_confirm'),
      danger: true,
      onConfirm: () => {
        if (
          system.getLocationAlcovesSnapshot(state.locationId)?.saveId ===
          state.saveId
        )
          system.relocate(state.locationId, layoutId);
      },
    });
  }
}
