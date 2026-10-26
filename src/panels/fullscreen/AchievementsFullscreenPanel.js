/**
 * @file AchievementsFullscreenPanel.js
 * @brief Full-screen modal for reviewing achievements, tier milestones, permanent multipliers, and pinning.
 */

import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { FilterBar } from '../components/FilterBar.js';
import { ModalIds } from '../../config/ModalIds.js';
import { AchievementDB } from '../../data/achievements/AchievementDB.js';
import { AchievementSystem } from '../../systems/AchievementSystem.js';
import { AchievementBonusProvider } from '../../systems/achievements/AchievementBonusProvider.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { AchievementUnlockedEvent } from '../../core/events/AchievementUnlockedEvent.js';
import { AchievementPinnedEvent } from '../../core/events/AchievementPinnedEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { BonusTypes } from '../../config/BonusRules.js';
import { t } from '../../localization/LocalizationManager.js';

const ALL_FAMILIES = 'all';

/**
 * Returns tier styling class and localization key.
 * @param {number} tierIdx
 * @returns {{cls: string, labelKey: string}}
 */
function getTierRankInfo(tierIdx) {
  const ranks = [
    { cls: 'rank-bronze', labelKey: 'ach_rank_bronze' },
    { cls: 'rank-silver', labelKey: 'ach_rank_silver' },
    { cls: 'rank-gold', labelKey: 'ach_rank_gold' },
    { cls: 'rank-diamond', labelKey: 'ach_rank_diamond' }
  ];
  if (tierIdx < 0) return { cls: 'rank-none', labelKey: 'ach_rank_locked' };
  const idx = Math.min(tierIdx, ranks.length - 1);
  return ranks[idx] || ranks[0];
}

export class AchievementsFullscreenPanel extends UIFullscreenPanel {
  constructor() {
    super({
      id: ModalIds.ACHIEVEMENTS,
      title: t('achievements_title'),
      name: 'AchievementsFullscreenPanel'
    });

    /** @private @type {string} */
    this._familyFilter = ALL_FAMILIES;
    /** @private @type {'all'|'in_progress'|'completed'|'pinned'} */
    this._statusFilter = 'all';
    /** @private @type {string} */
    this._search = '';

    /** @private @type {AchievementBonusProvider} */
    this._bonusProvider = new AchievementBonusProvider();

    this.listen(AchievementUnlockedEvent, () => {
      if (this.isOpen()) this._render();
    });

    this.listen(AchievementPinnedEvent, () => {
      if (this.isOpen()) this._render();
    });

    this.listen(LanguageChangedEvent, () => {
      this.setTitle(t('achievements_title'));
      if (this.isOpen()) this._render();
    });
  }

  /** @override */
  onOpen() {
    AchievementSystem.getInstance().checkAll({ notify: false });
    this._render();
  }

  /** @private */
  _render() {
    const db = AchievementDB.getInstance();
    const sys = AchievementSystem.getInstance();
    const save = SaveSystem.getInstance().getCurrentSave();
    const summary = sys.getSummary(save);

    // 1. Calculate status counts across all achievements
    const allAchievements = db.getAll();
    let completedCount = 0;
    let inProgressCount = 0;
    let pinnedCount = 0;

    for (const ach of allAchievements) {
      const prog = sys.getProgress(ach, save);
      if (prog.isCompleted) completedCount++;
      else inProgressCount++;
      if (sys.isPinned(ach.id, save)) pinnedCount++;
    }

    // 2. Filter bar (matching Box and Bag patterns)
    const families = db.getFamilies();
    const familyOptions = [
      { value: ALL_FAMILIES, label: t('ach_filter_all') },
      ...families.map((fam) => ({ value: fam.id, label: db.getLocalizedFamilyName(fam) }))
    ];

    const filterBar = new FilterBar({
      className: 'pw-ach-filterbar',
      mobileDrawer: true,
      chips: [
        {
          text: t('ach_filter_all'),
          count: allAchievements.length,
          active: this._statusFilter === 'all',
          onClick: () => {
            this._statusFilter = 'all';
            this._render();
          }
        },
        {
          text: t('ach_in_progress'),
          count: inProgressCount,
          active: this._statusFilter === 'in_progress',
          onClick: () => {
            this._statusFilter = 'in_progress';
            this._render();
          }
        },
        {
          text: t('ach_completed'),
          count: completedCount,
          active: this._statusFilter === 'completed',
          onClick: () => {
            this._statusFilter = 'completed';
            this._render();
          }
        },
        {
          text: t('ach_filter_pinned'),
          count: pinnedCount,
          active: this._statusFilter === 'pinned',
          onClick: () => {
            this._statusFilter = 'pinned';
            this._render();
          }
        }
      ],
      fields: [
        {
          label: t('ach_filter_family'),
          options: familyOptions,
          value: this._familyFilter,
          onChange: (val) => {
            this._familyFilter = val;
            this._render();
          }
        }
      ],
      search: {
        value: this._search,
        placeholder: t('ach_search_placeholder'),
        onInput: (val) => {
          this._search = String(val || '');
          this._render();
        }
      },
      reset: {
        text: t('box_filter_reset'),
        onClick: () => {
          this._familyFilter = ALL_FAMILIES;
          this._statusFilter = 'all';
          this._search = '';
          this._render();
        }
      }
    });

    this.setFilters([filterBar]);

    // 3. Bonuses section (structured clean grid)
    const contributions = this._bonusProvider.getContributions({ save });
    const bonusCards = [];

    for (const contrib of contributions) {
      let label = '';
      let valStr = '';
      if (contrib.type === BonusTypes.MONEY) {
        valStr = `+${contrib.value}%`;
        label = contrib.scope?.region
          ? `${t('ach_rank_gold') === 'Gold' ? 'Money' : 'Pokédollars'} (${contrib.scope.region.toUpperCase()})`
          : (t('ach_rank_gold') === 'Gold' ? 'Money' : 'Pokédollars');
      } else if (contrib.type === BonusTypes.XP) {
        valStr = `+${contrib.value}%`;
        label = 'XP';
      } else if (contrib.type === BonusTypes.CAPTURE) {
        valStr = `+${contrib.value}`;
        label = t('ach_rank_gold') === 'Gold' ? 'Catch Rate' : 'Taux de capture';
      } else if (contrib.type === BonusTypes.LOOT) {
        valStr = `+${contrib.value}`;
        label = t('ach_rank_gold') === 'Gold' ? 'Loot' : 'Butin';
      } else if (contrib.type === BonusTypes.SHINY_MULTIPLIER) {
        valStr = `×${contrib.value.toFixed(2)}`;
        label = 'Shiny Rate';
      } else if (contrib.value > 0) {
        valStr = `+${contrib.value}${contrib.unit ? ' ' + contrib.unit : ''}`;
        label = contrib.type;
      }

      if (valStr) {
        bonusCards.push(new UIContainer({
          className: 'pw-ach-bonus-card',
          children: [
            new UIText({ className: 'pw-ach-bonus-card-val', text: valStr }),
            new UIText({ className: 'pw-ach-bonus-card-label', text: label })
          ]
        }));
      }
    }

    if (bonusCards.length === 0) {
      bonusCards.push(new UIText({ className: 'pw-light2', text: t('ach_none_yet') }));
    }

    const bonusesSection = new UIContainer({
      className: 'pw-ach-bonuses-section',
      children: [
        new UIContainer({
          className: 'pw-ach-bonuses-header',
          children: [
            new UIText({ className: 'pw-ach-bonuses-title', text: t('ach_active_multipliers') }),
            new UIText({
              className: 'pw-ach-progress-text',
              text: `${summary.totalTiers} / ${summary.maxTiers} ${t('ach_tiers_unlocked')} (${summary.progressPct}%)`
            })
          ]
        }),
        new UIProgressBar({
          value: summary.progressPct,
          max: 100,
          trackClassName: 'pw-ach-progress-bar-bg',
          fillClassName: 'pw-ach-progress-bar-fill'
        }),
        new UIContainer({
          className: 'pw-ach-bonuses-grid',
          children: bonusCards
        })
      ]
    });

    // 4. Filter and build achievement cards
    const term = this._search.trim().toLowerCase();
    const cards = [];

    for (const ach of allAchievements) {
      // Family filter
      if (this._familyFilter !== ALL_FAMILIES && ach.family !== this._familyFilter) {
        continue;
      }

      const prog = sys.getProgress(ach, save);
      const isPinned = sys.isPinned(ach.id, save);

      // Status filter
      if (this._statusFilter === 'completed' && !prog.isCompleted) continue;
      if (this._statusFilter === 'in_progress' && prog.isCompleted) continue;
      if (this._statusFilter === 'pinned' && !isPinned) continue;

      // Search filter
      const name = db.getLocalizedName(ach);
      const desc = db.getLocalizedDesc(ach);
      if (term) {
        const matchesName = name.toLowerCase().includes(term);
        const matchesDesc = desc.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc) continue;
      }

      const fam = db.getFamily(ach.family) || {};
      const tierInfo = getTierRankInfo(prog.currentTier);

      // Status badge
      let statusBadge;
      if (prog.isCompleted) {
        statusBadge = new UIText({ className: 'pw-badge pw-badge-success', text: t('ach_completed') });
      } else if (prog.currentTier >= 0) {
        statusBadge = new UIText({ className: 'pw-badge pw-badge-info', text: t('ach_tier_n', { n: prog.currentTier + 1, total: ach.tiers.length }) });
      } else {
        statusBadge = new UIText({ className: 'pw-badge pw-badge-muted', text: t('ach_in_progress') });
      }

      // Tier dots
      const tierDots = ach.tiers.map((target, idx) => {
        const dot = new UIContainer({
          className: 'pw-tier-dot ' + (prog.currentTier >= idx ? 'unlocked' : 'locked')
        });
        dot.setTooltip(t('ach_tier_title', { n: idx + 1, target }));
        return dot;
      });

      // Bonus text
      const bonusText = ach.bonus ? db.getLocalizedBonusLabel(ach, Math.max(0, prog.currentTier)) : '';

      // Card is clickable to toggle pin (no separate pin button)
      const card = new UIContainer({
        className: 'pw-card pw-ach-card' + (prog.isCompleted ? ' is-completed' : '') + (isPinned ? ' is-pinned' : ''),
        children: [
          // Header
          new UIContainer({
            className: 'pw-ach-card-header',
            children: [
              new UIContainer({
                className: 'pw-ach-card-title-group',
                children: [
                  new UIContainer({
                    className: 'pw-ach-icon',
                    children: [new UIIcon({ name: fam.icon || 'trophy' })]
                  }),
                  new UIContainer({
                    children: [
                      new UIText({ className: 'pw-ach-title', text: name }),
                      new UIText({ className: 'pw-ach-desc', text: desc })
                    ]
                  })
                ]
              }),
              new UIContainer({
                className: 'pw-ach-status',
                children: [
                  isPinned ? new UIText({ className: 'pw-ach-pinned-badge', text: t('ach_pinned') }) : null,
                  new UIText({ className: `pw-rank-chip ${tierInfo.cls}`, text: t(tierInfo.labelKey) }),
                  statusBadge
                ].filter(Boolean)
              })
            ]
          }),

          // Progress
          new UIContainer({
            className: 'pw-ach-progress-row',
            children: [
              new UIProgressBar({
                value: prog.progressPct,
                max: 100,
                trackClassName: 'pw-ach-progress-bar-bg',
                fillClassName: 'pw-ach-progress-bar-fill'
              }),
              new UIText({
                className: 'pw-ach-progress-text',
                text: `${prog.metricValue} / ${prog.nextTarget} (${prog.progressPct}%)`
              })
            ]
          }),

          // Footer
          new UIContainer({
            className: 'pw-ach-card-footer',
            children: [
              new UIContainer({ className: 'pw-ach-tiers-dots', children: tierDots }),
              bonusText ? new UIText({ className: 'pw-ach-bonus-pill', text: bonusText }) : null
            ].filter(Boolean)
          })
        ]
      });

      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setTooltip(t('ach_card_click_to_pin'));
      card.addDomListener('click', () => {
        sys.togglePinned(ach.id);
      });

      cards.push(card);
    }

    const grid = cards.length > 0
      ? new UIContainer({ className: 'pw-ach-grid', children: cards })
      : new UIText({ className: 'pw-empty-state-md', text: t('ach_no_found') });

    this.setContent([
      new UIContainer({
        className: 'pw-ach-container',
        children: [
          bonusesSection,
          grid
        ]
      })
    ]);
  }
}
