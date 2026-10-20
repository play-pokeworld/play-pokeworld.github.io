/**
 * @file GuidePanel.js
 * @brief Localized, data-driven guide opened from the shortcut bar and dashboard help buttons.
 * UI only: progression gates are queried from FeatureAccessSystem; no access rules are duplicated here.
 */

import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';
import {
  GUIDE_SECTION_DEFINITIONS,
  GUIDE_TYPE_EFFECT_KEYS,
  GuideGateKinds,
  GuideSectionIds
} from '../../config/GuideSections.js';
import { ModalIds } from '../../config/ModalIds.js';
import { ContentAccessChangedEvent } from '../../core/events/ContentAccessChangedEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { TutorialProgressChangedEvent } from '../../core/events/TutorialProgressChangedEvent.js';
import { FeatureAccessSystem } from '../../systems/FeatureAccessSystem.js';
import { TutorialSystem } from '../../systems/TutorialSystem.js';
import { EffectivenessTiers, TYPE_IDS, TypeChart } from '../../data/core/TypeChart.js';
import { t } from '../../localization/LocalizationManager.js';

export class GuidePanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.GUIDE, title: t('guide_title'), name: 'GuidePanel' });
    this.addClass('pw-guide-panel');
    this._sectionId = null;

    this.listen(LanguageChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
    this.listen(ContentAccessChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
    this.listen(TutorialProgressChangedEvent, () => {
      if (this.isOpen() && !this._sectionId) this._renderHome();
    });
  }

  /** @override @param {{section?:string|null}} [params] */
  onOpen(params = {}) {
    this.setTitle(t('guide_title'));
    this._sectionId = params.section || null;
    this._render();
  }

  /** @private @returns {Object[]} */
  _visibleSections() {
    const access = FeatureAccessSystem.getInstance();
    return GUIDE_SECTION_DEFINITIONS.filter((section) => {
      if (!section.gate) return true;
      if (section.gate.kind === GuideGateKinds.FEATURE) return access.isFeatureUnlocked(section.gate.id);
      if (section.gate.kind === GuideGateKinds.LOCATION_KIND) return access.hasUnlockedLocationKind(section.gate.id);
      return false;
    });
  }

  /** @private */
  _render() {
    const sections = this._visibleSections();
    const section = sections.find((entry) => entry.id === this._sectionId);
    if (section) this._renderDetail(section);
    else {
      this._sectionId = null;
      this._renderHome(sections);
    }
  }

  /** @private @param {Object[]} [visibleSections] */
  _renderHome(visibleSections = this._visibleSections()) {
    const intro = new UIText({ tagName: 'p', className: 'pw-guide-sub', text: t('guide_intro') });
    const actions = new UIContainer({ className: 'pw-guide-actions' });
    const tutorialsEnabled = TutorialSystem.getInstance().isTutorialEnabled();
    const enableButton = new UIButton({
      variant: 'secondary',
      size: 'sm',
      icon: 'sparkle',
      text: t('tutorial_enable'),
      disabled: tutorialsEnabled,
      onClick: () => TutorialSystem.getInstance().setEnabled(true)
    });
    enableButton.setData('tutorialAction', 'enable');
    const disableButton = new UIButton({
      variant: 'ghost',
      size: 'sm',
      text: t('tutorial_disable_all'),
      disabled: !tutorialsEnabled,
      onClick: () => TutorialSystem.getInstance().setEnabled(false)
    });
    disableButton.setData('tutorialAction', 'disable');
    actions.addChildren([enableButton, disableButton]);

    const grid = new UIContainer({ className: 'pw-guide-grid' });
    for (const section of visibleSections) grid.addChild(this._sectionCard(section));

    const count = new UIText({
      tagName: 'p',
      className: 'pw-guide-section-count',
      text: t('guide_sections_count', { count: visibleSections.length })
    });
    this.setContent([intro, actions, count, grid]);
  }

  /** @private @param {Object} section @returns {UIButton} */
  _sectionCard(section) {
    const title = t(section.titleKey);
    const button = new UIButton({
      className: 'pw-guide-card',
      variant: 'secondary',
      align: 'left',
      icon: section.icon,
      text: title,
      onClick: () => {
        this._sectionId = section.id;
        this._render();
      }
    });
    button.setData('guideSection', section.id);
    button.setAriaLabel(t('guide_section_card_aria', { section: title }));
    button.addChild(new UIText({
      className: 'pw-guide-card-meta',
      text: t('guide_pages_info', { count: section.pages.length })
    }));
    return button;
  }

  /** @private @param {Object} section */
  _renderDetail(section) {
    const header = new UIContainer({ className: 'pw-guide-detail-head' });
    const titleGroup = new UIContainer({ className: 'pw-guide-detail-title-group' });
    titleGroup.addChildren([
      new UIText({ tagName: 'h2', className: 'pw-guide-title', text: t(section.titleKey) }),
      new UIText({ className: 'pw-guide-detail-sub', text: t('guide_detail') })
    ]);
    const backButton = new UIButton({
      className: 'pw-guide-back',
      variant: 'ghost',
      size: 'sm',
      icon: 'chevronLeft',
      text: t('guide_back_to_sections'),
      onClick: () => {
        this._sectionId = null;
        this._renderHome();
      }
    });
    header.addChildren([titleGroup, backButton]);

    const pages = new UIContainer({ className: 'pw-guide-pages' });
    section.pages.forEach((entry, index) => {
      const card = new UIContainer({ className: 'pw-guide-page' });
      card.setData('guidePage', String(index + 1));
      card.addChild(new UIText({ tagName: 'h3', className: 'pw-guide-page-title', text: t(entry.titleKey) }));
      if (entry.typeChart) {
        card.addChild(this._renderTypeChart());
      } else {
        card.addChild(new UIText({
          tagName: 'div',
          className: 'pw-guide-page-text',
          richText: t(entry.bodyKey)
        }));
      }
      pages.addChild(card);
    });
    this.setContent([header, pages]);
  }

  /** @private @returns {UIContainer} */
  _renderTypeChart() {
    const wrap = new UIContainer({ className: 'pw-guide-type-chart-wrap' });
    const legend = new UIContainer({ className: 'pw-guide-type-legend' });
    legend.addChildren([
      this._legendEntry('guide_type_double_short', 'guide_type_supereffective', 'double'),
      this._legendEntry('guide_type_half_short', 'guide_type_notveryeffective', 'half'),
      this._legendEntry('guide_type_immune_short', 'guide_type_noeffect', 'immune'),
      this._legendEntry('guide_type_neutral_short', 'guide_type_normal', 'neutral')
    ]);

    const grid = new UIContainer({ className: 'pw-guide-type-grid' });
    grid.addChild(new UIText({ className: 'pw-guide-type-corner', text: t('guide_type_chart_corner') }));
    for (const defender of TYPE_IDS) grid.addChild(this._typeHeader(defender, 'column'));

    for (const attack of TYPE_IDS) {
      grid.addChild(this._typeHeader(attack, 'row'));
      for (const defender of TYPE_IDS) {
        const multiplier = TypeChart.effectiveness(attack, [defender]);
        const tier = TypeChart.tierOf(multiplier);
        const valueKey = GUIDE_TYPE_EFFECT_KEYS[multiplier];
        const value = t(valueKey);
        const tooltipValue = tier === EffectivenessTiers.NEUTRAL ? t('guide_type_normal') : value;
        const cell = new UIText({
          className: `pw-guide-type-cell pw-guide-type-cell--${tier}`,
          text: t(valueKey)
        });
        cell.setTooltip(t('guide_type_cell_tooltip', {
          attack: t(`type.${attack}`),
          defense: t(`type.${defender}`),
          value: tooltipValue
        }));
        cell.setAriaLabel(t('guide_type_cell_tooltip', {
          attack: t(`type.${attack}`),
          defense: t(`type.${defender}`),
          value: tooltipValue
        }));
        cell.setData('effectiveness', String(multiplier));
        grid.addChild(cell);
      }
    }

    wrap.addChildren([legend, grid]);
    return wrap;
  }

  /** @private @param {string} valueKey @param {string} labelKey @param {string} modifier */
  _legendEntry(valueKey, labelKey, modifier) {
    const entry = new UIContainer({ className: 'pw-guide-type-legend-entry' });
    entry.addChildren([
      new UIText({ className: `pw-guide-type-cell pw-guide-type-cell--${modifier}`, text: t(valueKey) }),
      new UIText({ text: t(labelKey) })
    ]);
    return entry;
  }

  /** @private @param {string} type @param {'row'|'column'} axis */
  _typeHeader(type, axis) {
    const header = new UIText({
      className: `pw-guide-type-header type-badge type-${type} pw-guide-type-header--${axis}`,
      text: t(`type.${type}`)
    });
    header.setTooltip(t(`type.${type}`));
    header.setAriaLabel(t(`type.${type}`));
    return header;
  }
}
