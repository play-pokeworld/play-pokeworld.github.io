/**
 * @file FacilityQueueCard.js
 * @brief Shared FIFO editor. Only queue membership/order rebuilds the list, never battle or KO ticks.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { UIItemSprite } from '../../ui/UIItemSprite.js';
import { t } from '../../localization/LocalizationManager.js';

export class FacilityQueueCard extends UIContainer {
  /** @param {{index:number,onAdd:Function,onClear:Function,onRemove:Function,onFossil?:Function,onBuild?:Function}} options */
  constructor(options) {
    super({
      className: 'automation-card pw-facility-queue-card',
      name: 'FacilityQueueCard',
    });
    this._onRemove = options.onRemove;
    this._signature = null;
    this._title = new UIText({
      tagName: 'h3',
      text: t('training_slot_title', { slot: options.index + 1 }),
    });
    this._summary = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this._capacity = new UIText({ className: 'pw-facility-subtle' });
    this._options = new UIContainer({ className: 'pw-facility-queue-options' });
    this._empty = new UIText({
      text: t('queue_empty'),
      className: 'pw-facility-subtle',
    });
    this._list = new UIContainer({ className: 'pw-facility-queue-list' });
    this._add = new UIButton({
      text: t('training_slot_choose'),
      icon: 'box',
      className: 'hbtn queue-action-btn',
      size: 'sm',
      onClick: options.onAdd,
    });
    this._fossil = options.onFossil
      ? new UIButton({
          text: t('hatchery_select_fossil'),
          size: 'sm',
          variant: 'secondary',
          onClick: options.onFossil,
        })
      : null;
    this._clear = new UIButton({
      text: t('queue_clear'),
      className: 'hbtn queue-action-btn',
      variant: 'secondary',
      size: 'sm',
      onClick: options.onClear,
    });
    this._filters = new UIContainer({ className: 'pw-facility-queue-filters' });
    this._queueBox = new UIContainer({
      className: 'hatchery-queue-box pw-facility-queue-box',
      children: [
        this._capacity,
        this._empty,
        this._list,
        new UIContainer({
          className: 'queue-actions',
          children: [
            this._add,
            this._fossil,
            options.onBuild &&
              new UIButton({
                text: t('queue_build'),
                className: 'hbtn queue-action-btn',
                variant: 'secondary',
                size: 'sm',
                onClick: options.onBuild,
              }),
            this._clear,
          ],
        }),
      ],
    });
    this.addChildren([
      this._title,
      this._summary,
      this._options,
      this._filters,
      this._queueBox,
    ]);
  }
  /** @param {import('../../ui/UIElement.js').UIElement} element */
  addFilter(element) {
    this._filters.addChild(element);
  }
  /** @param {import('../../ui/UIElement.js').UIElement} element */
  addOption(element) {
    this._options.addChild(element);
  }
  /** @param {{summary:string,queue:Object[],limit:number,fossilsAllowed?:boolean}} model */
  setModel(model) {
    this._summary.setText(model.summary);
    this._capacity.setText(
      t('queue_capacity', { count: model.queue.length, max: model.limit }),
    );
    this._empty.setVisible(!model.queue.length);
    this._clear.setVisible(model.queue.length > 0);
    this._add.setEnabled(model.queue.length < model.limit);
    this._fossil?.setVisible(model.fossilsAllowed === true);
    this._fossil?.setEnabled(model.queue.length < model.limit);
    const signature = JSON.stringify(
      model.queue.map((entry) =>
        entry.pokemon
          ? [
              entry.uid,
              entry.pokemon.species,
              entry.pokemon.form,
              entry.pokemon.shiny,
            ]
          : [entry.itemId],
      ),
    );
    if (signature === this._signature) return;
    this._signature = signature;
    this._list.clearChildren();
    for (const [index, entry] of model.queue.entries()) {
      const label =
        entry.pokemon?.getDisplayName() || t(`item.${entry.itemId}.name`);
      const media = entry.pokemon
        ? new UIPokemonSprite({
            loading: 'eager',
            species: entry.pokemon.species,
            form: entry.pokemon.form,
            shiny: entry.pokemon.shiny,
            alt: label,
          })
        : new UIItemSprite({
            loading: 'eager',
            itemId: entry.itemId,
            alt: label,
          });
      const remove = new UIButton({
        text: t('facility_remove'),
        icon: 'close',
        variant: 'ghost',
        size: 'sm',
        onClick: () => this._onRemove(entry, index),
      });
      remove.setAriaLabel(t('facility_remove_named', { name: label }));
      this._list.addChild(
        new UIContainer({
          className: 'pw-facility-queue-entry',
          children: [media, new UIText({ text: label }), remove],
        }),
      );
    }
  }
}
