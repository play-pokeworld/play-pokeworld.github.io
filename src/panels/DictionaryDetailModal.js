/**
 * @file DictionaryDetailModal.js
 * @brief Modal detail view for a dictionary entry (item, move or talent).
 * Matches the canonical layout and appearance of the main reference's info sheets.
 */

import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIImage } from '../ui/UIImage.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ModalIds } from '../config/ModalIds.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { DictionaryCatalog } from '../systems/dictionary/DictionaryCatalog.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export class DictionaryDetailModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.DICTIONARY_DETAIL,
      title: '',
      size: 'custom',
      hasHeader: false,
      showCloseBtn: false,
      className: 'pw-info-modal',
      bodyClassName: 'pw-info-body',
      overlayId: 'pw-dictionary-detail-overlay',
      name: 'DictionaryDetailModal',
    });
    this._kind = null;
    this._id = null;
    this._backLabel = null;
  }

  /** @override @param {{kind?: string, id?: string, backLabel?: string}} [params={}] */
  onEnter(params = {}) {
    super.onEnter(params);
    this._kind = params.kind || null;
    this._id = params.id || null;
    this._backLabel = params.backLabel || null;
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._kind = null;
    this._id = null;
    this._backLabel = null;
  }

  /** @private */
  _render() {
    this.clearChildren();
    if (!this._kind || !this._id) return;

    if (this._kind === 'item') this._renderItem();
    else if (this._kind === 'move') this._renderMove();
    else if (this._kind === 'talent') this._renderTalent();
  }

  /** @private */
  _renderItem() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const detail = DictionaryCatalog.getItemDetail(this._id, save);
    if (!detail) return;

    const icon = new UIContainer({
      className: 'pw-info-icon',
      children: [
        new UIImage({
          src: ItemDB.getInstance().getImagePath(this._id),
          alt: detail.name,
          className: 'pw-info-item-img',
          pixelated: true,
        }),
      ],
    });
    const name = new UIText({
      tagName: 'div',
      className: 'pw-info-name',
      text: detail.name,
    });
    const subtitle = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1',
      text: detail.typeLabel,
    });
    const textWrap = new UIContainer({
      className: 'pw-info-head-text',
      children: [name, subtitle],
    });
    const row = new UIContainer({
      className: 'pw-row',
      children: [icon, textWrap],
    });
    const closeBtn = new UIButton({
      className: 'modal-close',
      text: '✕',
      onClick: () => this.close(),
    });
    closeBtn.setAriaLabel(t('modal_close_btn'));
    const header = new UIContainer({
      className: 'modal-title pw-info-head',
      children: [row, closeBtn],
    });

    const priceVal =
      detail.price > 0 ? `${TextFormatter.formatNumber(detail.price)}₽` : '—';
    const priceCard = new UIContainer({
      className: 'pw-card-dark pw-center',
      children: [
        new UIText({ className: 'pw-text-sm pw-light1', text: t('price') }),
        new UIText({ className: 'pw-text-lg pw-bold', text: priceVal }),
      ],
    });
    const ownedCard = new UIContainer({
      className: 'pw-card-dark pw-center',
      children: [
        new UIText({ className: 'pw-text-sm pw-light1', text: t('owned') }),
        new UIText({
          className: 'pw-text-lg pw-bold pw-info-value-green',
          text: `×${detail.ownedQty}`,
        }),
      ],
    });
    const statCards = new UIContainer({
      className: 'pw-info-stat-cards',
      children: [priceCard, ownedCard],
    });

    const descBody = new UIText({
      className: 'pw-info-section-body',
      richText: detail.desc || t('dict_description_unavailable'),
    });
    const descSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({ className: 'pw-section-title', text: t('description') }),
        descBody,
      ],
    });

    const srcList = new UIContainer({
      className: 'pw-src-list',
      children: detail.sources.map(
        (s) =>
          new UIContainer({
            className: 'pw-src-line',
            children: [
              new UIIcon({ name: s.icon || 'help', className: 'pw-src-icon' }),
              new UIText({ text: s.text }),
            ],
          }),
      ),
    });
    const srcSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({ className: 'pw-section-title', text: t('found_in_lbl') }),
        srcList,
      ],
    });

    const backBtn = new UIButton({
      className: 'hbtn pw-info-back-btn',
      text: this._backLabel || t('back_to_dictionary'),
      onClick: () => this.close(),
    });
    const actions = new UIContainer({
      className: 'pw-info-actions',
      children: [backBtn],
    });

    this.addChildren([header, statCards, descSection, srcSection, actions]);
  }

  /** @private */
  _renderMove() {
    const detail = DictionaryCatalog.getMoveDetail(this._id);
    if (!detail) return;

    const icon = new UIContainer({
      className: 'pw-info-icon',
      children: [
        new UIText({
          tagName: 'span',
          className: `type-badge type-${detail.type} pw-type-info`,
          text: t(`type.${detail.type}`),
        }),
      ],
    });
    const name = new UIText({
      tagName: 'div',
      className: 'pw-info-name',
      text: detail.name,
    });
    const subtitle = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1',
      text: detail.categoryLabel,
    });
    const textWrap = new UIContainer({
      className: 'pw-info-head-text',
      children: [name, subtitle],
    });
    const row = new UIContainer({
      className: 'pw-row',
      children: [icon, textWrap],
    });
    const closeBtn = new UIButton({
      className: 'modal-close',
      text: '✕',
      onClick: () => this.close(),
    });
    closeBtn.setAriaLabel(t('modal_close_btn'));
    const header = new UIContainer({
      className: 'modal-title pw-info-head',
      children: [row, closeBtn],
    });

    const powVal = detail.power > 0 ? String(detail.power) : '—';
    const powCard = new UIContainer({
      className: 'pw-card-dark pw-center',
      children: [
        new UIText({
          className: 'pw-text-sm pw-light1',
          text: t('item_power'),
        }),
        new UIText({ className: 'pw-text-lg pw-bold', text: powVal }),
      ],
    });
    const catCard = new UIContainer({
      className: 'pw-card-dark pw-center',
      children: [
        new UIText({
          className: 'pw-text-sm pw-light1',
          text: t('sort_category'),
        }),
        new UIText({
          className: 'pw-text-lg pw-bold',
          text: detail.categoryLabel,
        }),
      ],
    });
    const statCards = new UIContainer({
      className: 'pw-info-stat-cards',
      children: [powCard, catCard],
    });

    const descSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({ className: 'pw-section-title', text: t('description') }),
        new UIText({
          className: 'pw-info-section-body',
          richText: detail.desc || t('dict_description_unavailable'),
        }),
      ],
    });

    const effChildren = [];
    for (const eff of detail.effects) {
      const line = new UIContainer({ className: 'pw-move-effect-line' });
      if (eff.badge) {
        line.addChild(
          new UIText({
            tagName: 'span',
            className: `status-badge ${eff.badge}`,
            text:
              t(`status_${eff.badge}_label`) ||
              t(`status_${eff.badge}`) ||
              eff.badge,
          }),
        );
      } else {
        line.addChild(
          new UIIcon({ name: 'sparkle', className: 'pw-effect-bullet-icon' }),
        );
      }
      line.addChild(
        new UIText({ className: 'pw-effect-text', text: eff.text }),
      );
      effChildren.push(line);
    }
    const effSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({ className: 'pw-section-title', text: t('effects') }),
        new UIContainer({
          className: 'pw-info-section-body',
          children: effChildren,
        }),
      ],
    });

    const learnerCategories = [
      {
        key: 'level',
        labelKey: 'learners_level',
        species: detail.learners.level,
      },
      { key: 'ctcs', labelKey: 'learners_ctcs', species: detail.learners.ctcs },
      {
        key: 'training',
        labelKey: 'learners_training',
        species: detail.learners.training,
      },
    ];
    const learnerLines = [];
    const cap = 24;
    for (const cat of learnerCategories) {
      if (cat.species.length === 0) continue;
      const chips = cat.species.slice(0, cap).map(
        (s) =>
          new UIText({
            tagName: 'span',
            className: 'dict-chip',
            text: `#${s.dex} ${t(s.getNameKey())}`,
          }),
      );
      if (cat.species.length > cap) {
        chips.push(
          new UIText({
            tagName: 'span',
            className: 'dict-muted',
            text: t('dict_and_n_more', { count: cat.species.length - cap }),
          }),
        );
      }
      learnerLines.push(
        new UIContainer({
          className: 'dict-chip-line',
          children: [
            new UIText({ tagName: 'b', text: t(cat.labelKey) }),
            new UIContainer({ className: 'dict-chip-list', children: chips }),
          ],
        }),
      );
    }
    const learnersSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({
          className: 'pw-section-title',
          text: t('learners_title'),
        }),
        new UIContainer({
          className: 'pw-info-section-body',
          children: learnerLines.length
            ? learnerLines
            : [
                new UIText({
                  className: 'dict-muted',
                  text: t('dict_move_users_none'),
                }),
              ],
        }),
      ],
    });

    const backBtn = new UIButton({
      className: 'hbtn pw-info-back-btn',
      text: this._backLabel || t('back_to_dictionary'),
      onClick: () => this.close(),
    });
    const actions = new UIContainer({
      className: 'pw-info-actions',
      children: [backBtn],
    });

    this.addChildren([
      header,
      statCards,
      descSection,
      effSection,
      learnersSection,
      actions,
    ]);
  }

  /** @private */
  _renderTalent() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const detail = DictionaryCatalog.getAbilityDetail(this._id, save);
    if (!detail) return;

    const icon = new UIContainer({
      className: 'pw-info-icon',
      children: [
        new UIIcon({ name: 'dumbbell', className: 'pw-dict-talent-icon' }),
      ],
    });
    const name = new UIText({
      tagName: 'div',
      className: 'pw-info-name',
      text: detail.name,
    });
    const subtitle = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1',
      text: detail.rarityLabel,
    });
    const textWrap = new UIContainer({
      className: 'pw-info-head-text',
      children: [name, subtitle],
    });
    const row = new UIContainer({
      className: 'pw-row',
      children: [icon, textWrap],
    });
    const closeBtn = new UIButton({
      className: 'modal-close',
      text: '✕',
      onClick: () => this.close(),
    });
    closeBtn.setAriaLabel(t('modal_close_btn'));
    const header = new UIContainer({
      className: 'modal-title pw-info-head',
      children: [row, closeBtn],
    });

    const descSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({ className: 'pw-section-title', text: t('description') }),
        new UIText({
          className: 'pw-info-section-body',
          richText: detail.desc || t('dict_description_unavailable'),
        }),
      ],
    });

    const cap = 24;
    const carrierChips = detail.carriers.slice(0, cap).map(
      (s) =>
        new UIText({
          tagName: 'span',
          className: 'dict-chip',
          text: `#${s.dex} ${t(s.getNameKey())}`,
        }),
    );
    if (detail.carriers.length > cap) {
      carrierChips.push(
        new UIText({
          tagName: 'span',
          className: 'dict-muted',
          text: t('dict_and_n_more', { count: detail.carriers.length - cap }),
        }),
      );
    }
    const carriersSection = new UIContainer({
      className: 'pw-panel pw-info-section',
      children: [
        new UIText({
          className: 'pw-section-title',
          text: t('dict_affected_pokemon'),
        }),
        new UIContainer({
          className: 'pw-info-section-body',
          children: [
            new UIContainer({
              className: 'dict-chip-list',
              children: carrierChips.length
                ? carrierChips
                : [
                    new UIText({
                      className: 'dict-muted',
                      text: t('dict_no_pokemon_listed'),
                    }),
                  ],
            }),
          ],
        }),
      ],
    });

    const hiddenSections = [];
    if (detail.hiddenCarriers.length > 0) {
      const hiddenChips = detail.hiddenCarriers.slice(0, cap).map(
        (s) =>
          new UIText({
            tagName: 'span',
            className: 'dict-chip dict-chip-hidden',
            text: `#${s.dex} ${t(s.getNameKey())}`,
          }),
      );
      if (detail.hiddenCarriers.length > cap) {
        hiddenChips.push(
          new UIText({
            tagName: 'span',
            className: 'dict-muted',
            text: t('dict_and_n_more', {
              count: detail.hiddenCarriers.length - cap,
            }),
          }),
        );
      }
      hiddenSections.push(
        new UIContainer({
          className: 'pw-panel pw-info-section',
          children: [
            new UIText({
              className: 'pw-section-title',
              text: t('hidden_carriers'),
            }),
            new UIContainer({
              className: 'pw-info-section-body',
              children: [
                new UIContainer({
                  className: 'dict-chip-list',
                  children: hiddenChips,
                }),
              ],
            }),
          ],
        }),
      );
    }

    const rarityRow = new UIContainer({
      className: 'pw-info-row-between',
      children: [
        new UIText({
          className: 'pw-text-sm pw-light1',
          text: t('dict_rarity'),
        }),
        new UIText({
          className: 'pw-light2 pw-bold',
          text: detail.rarityLabel,
        }),
      ],
    });

    const backBtn = new UIButton({
      className: 'hbtn pw-info-back-btn',
      text: this._backLabel || t('back_to_dictionary'),
      onClick: () => this.close(),
    });
    const actions = new UIContainer({
      className: 'pw-info-actions',
      children: [backBtn],
    });

    this.addChildren([
      header,
      descSection,
      carriersSection,
      ...hiddenSections,
      rarityRow,
      actions,
    ]);
  }
}
