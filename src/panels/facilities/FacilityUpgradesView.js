/** @file FacilityUpgradesView.js @brief Shared keyed upgrade list; currency changes do not replace cards. */
import { UIContainer } from '../../ui/UIContainer.js';
import { FacilityUpgradeCard } from './FacilityUpgradeCard.js';
import { FacilityManagementSystem } from '../../systems/FacilityManagementSystem.js';

export class FacilityUpgradesView extends UIContainer {
  /** @param {string} feature */
  constructor(feature) {
    super({ className: 'upgrade-grid', name: 'FacilityUpgradesView' });
    this._feature = feature;
    this._cards = new Map();
    this.refresh();
  }
  /** Updates values in place; only buying an extra slot can add a new upgrade card. */
  refresh() {
    const system = FacilityManagementSystem.getInstance();
    const models = system.getUpgrades(this._feature);
    const ids = new Set(models.map((model) => model.id));
    for (const [id, card] of this._cards)
      if (!ids.has(id)) {
        this.removeChild(card);
        card.destroy();
        this._cards.delete(id);
      }
    for (const model of models) {
      if (!this._cards.has(model.id)) {
        const card = new FacilityUpgradeCard(model, () =>
          system.purchase(this._feature, model.id),
        );
        this._cards.set(model.id, card);
        this.addChild(card);
      } else this._cards.get(model.id).setModel(model);
    }
  }
}
