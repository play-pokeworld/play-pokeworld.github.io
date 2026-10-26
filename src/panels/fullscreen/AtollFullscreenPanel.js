/**
 * @file AtollFullscreenPanel.js
 * @brief Full-screen modal for Battle Atoll: Home hub, Battle Tower, Factory, Arena, Dome, and shop.
 */

import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { UIItemSprite } from '../../ui/UIItemSprite.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { AtollSystem } from '../../systems/AtollSystem.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { AtollStateChangedEvent } from '../../core/events/AtollStateChangedEvent.js';
import { RoamingRotationTickEvent } from '../../core/events/RoamingRotationTickEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

const TABS = Object.freeze([
  { id: 'menu', labelKey: 'atoll_home' },
  { id: 'tower', labelKey: 'atoll_tower' },
  { id: 'factory', labelKey: 'atoll_factory' },
  { id: 'arena', labelKey: 'atoll_arena' },
  { id: 'dome', labelKey: 'atoll_dome' },
  { id: 'shop', labelKey: 'atoll_shop' }
]);

const HOME_CATEGORIES = Object.freeze([
  { id: 'tower', icon: 'swords', labelKey: 'atoll_tower', modes: ['tower_e', 'tower_d', 'tower_c', 'tower_b', 'tower_a', 'tower_s', 'tower_free'] },
  { id: 'factory', icon: 'settings', labelKey: 'atoll_factory', modes: ['factory_c', 'factory_a'] },
  { id: 'arena', icon: 'battle', labelKey: 'atoll_arena', modes: ['arena_three', 'arena_no_item', 'arena_type'] },
  { id: 'dome', icon: 'trophy', labelKey: 'atoll_dome', modes: ['dome_quarter', 'dome_final'] }
]);

const MODES_BY_TAB = Object.freeze({
  tower: ['tower_e', 'tower_d', 'tower_c', 'tower_b', 'tower_a', 'tower_s', 'tower_free'],
  factory: ['factory_c', 'factory_a'],
  arena: ['arena_three', 'arena_no_item', 'arena_type'],
  dome: ['dome_quarter', 'dome_final']
});

export class AtollFullscreenPanel extends UIFullscreenPanel {
  constructor() {
    super({
      id: ModalIds.ATOLL,
      title: t('battle_atoll_title'),
      name: 'AtollFullscreenPanel'
    });

    /** @private @type {string} */
    this._currentTab = 'menu';

    /** @private @type {UIText|null} */
    this._timerChip = null;

    this.listen(AtollStateChangedEvent, () => {
      if (this.isOpen()) this._render();
    });

    this.listen(RoamingRotationTickEvent, () => {
      if (this.isOpen() && this._timerChip) {
        const time = AtollSystem.getInstance().formatCountdown(AtollSystem.getInstance().getTimeUntilRotation());
        this._timerChip.setText(t('atoll_rotation_timer', { time }));
      }
    });

    this.listen(LanguageChangedEvent, () => {
      this.setTitle(t('battle_atoll_title'));
      if (this.isOpen()) this._render();
    });
  }

  /** @override */
  onOpen(params = {}) {
    if (params?.tab) this._currentTab = params.tab;
    this._render();
  }

  /** @private */
  _setTab(tabId) {
    this._currentTab = tabId;
    this._render();
  }

  /** @private */
  _render() {
    const atollSys = AtollSystem.getInstance();
    const save = SaveSystem.getInstance().getCurrentSave();

    if (!atollSys.isUnlocked(save)) {
      this.setFilters([]);
      const hero = new UIContainer({ className: 'pw-atoll-hero' });
      const textBlock = new UIContainer({ className: 'pw-atoll-hero-text' });
      textBlock.addChild(new UIText({ tagName: 'h2', text: t('battle_atoll_title') }));
      textBlock.addChild(new UIText({ tagName: 'p', text: t('atoll_locked_desc') }));
      hero.addChild(textBlock);

      this.setContent([
        new UIContainer({
          className: 'pw-atoll-panel',
          children: [hero]
        })
      ]);
      return;
    }

    // Top navigation bar
    const tabButtons = TABS.map((tab) => {
      const btn = new UIButton({
        variant: 'hbtn',
        text: t(tab.labelKey),
        onClick: () => this._setTab(tab.id)
      });
      btn.setActive(tab.id === this._currentTab);
      return btn;
    });

    this.setFilters([
      new UIContainer({
        className: 'pw-badges-tabs',
        children: tabButtons
      })
    ]);

    const state = atollSys.getState(save);
    const tokensCount = state?.tokens || 0;
    const streak = state?.streak || 0;
    const bestStreak = state?.bestStreak || 0;

    // Header Hero
    const hero = new UIContainer({ className: 'pw-atoll-hero' });
    const heroText = new UIContainer({ className: 'pw-atoll-hero-text' });
    heroText.addChild(new UIText({ tagName: 'h2', text: t('battle_atoll_title') }));
    heroText.addChild(new UIText({ tagName: 'p', text: t('battle_atoll_desc') }));
    hero.addChild(heroText);

    const tokenBox = new UIContainer({ className: 'pw-atoll-token-box' });
    tokenBox.addChild(new UIText({ tagName: 'b', text: String(tokensCount) }));
    tokenBox.addChild(new UIText({ tagName: 'span', text: t('atoll_tokens') }));
    tokenBox.addChild(new UIText({ tagName: 'small', text: t('atoll_streak', { streak, best: bestStreak }) }));
    hero.addChild(tokenBox);

    const bodyChildren = [hero];

    if (this._currentTab === 'menu') {
      this._timerChip = null;
      this._renderHomeTab(bodyChildren, state);
    } else if (this._currentTab === 'shop') {
      this._timerChip = null;
      this._renderShopTab(bodyChildren, save);
    } else {
      this._renderChallengeTab(bodyChildren, this._currentTab, state);
    }

    this.setContent([
      new UIContainer({
        className: 'pw-atoll-panel',
        children: bodyChildren
      })
    ]);
  }

  /** @private */
  _renderHomeTab(container, state) {
    const atollSys = AtollSystem.getInstance();
    const save = SaveSystem.getInstance().getCurrentSave();
    const isEn = save?.player?.lang === 'en';

    // 4 Category Hub Cards
    const hubGrid = new UIContainer({ className: 'pw-atoll-home-grid' });
    for (const cat of HOME_CATEGORIES) {
      const wins = cat.modes.reduce((acc, mk) => acc + (state?.winsByMode?.[mk] || 0), 0);
      const card = new UIButton({
        className: 'pw-atoll-home-card',
        onClick: () => this._setTab(cat.id)
      });
      card.addChild(new UIIcon({ name: cat.icon, className: 'pw-atoll-home-icon' }));
      card.addChild(new UIText({ tagName: 'b', text: t(cat.labelKey) }));
      if (wins > 0) {
        card.addChild(new UIText({
          tagName: 'small',
          className: 'pw-text-sm pw-light1',
          text: isEn ? `${wins} win(s)` : `${wins} victoire(s)`
        }));
      }
      hubGrid.addChild(card);
    }
    container.push(hubGrid);

    // Legend Fragments Card
    const fragmentsCount = state?.fragments || 0;
    const pendingId = state?.pendingFragmentLegendary || 0;

    const fragCard = new UIContainer({ className: 'pw-atoll-run-card pw-atoll-fragments-card' });
    const head = new UIContainer({ className: 'pw-atoll-run-head' });
    head.addChild(new UIText({ tagName: 'b', text: t('legend_fragments_title') }));
    head.addChild(new UIText({
      tagName: 'span',
      className: 'pw-text-sm pw-light1',
      text: t('legend_fragments_count', { n: fragmentsCount, cost: 50 })
    }));
    fragCard.addChild(head);

    fragCard.addChild(new UIText({
      tagName: 'p',
      className: 'pw-text-sm pw-light1',
      text: t('legend_fragments_desc', { cost: 50, boss: 3, pct: 100 })
    }));

    if (pendingId) {
      const pendingRow = new UIContainer({ className: 'pw-atoll-fragment-pending' });
      const species = PokemonDB.getInstance().getByDex(pendingId);
      const name = species ? t(species.getNameKey()) : `#${pendingId}`;
      if (species) {
        pendingRow.addChild(new UIPokemonSprite({ species: species.id, size: 'standard' }));
      }
      pendingRow.addChild(new UIText({
        tagName: 'span',
        className: 'pw-text-sm',
        text: t('legend_fragment_pending', { pokemon: name })
      }));
      pendingRow.addChild(new UIButton({
        variant: 'hbtn pw-btn-positive',
        text: t('leg_challenge_btn', { pokemon: name }),
        onClick: () => atollSys.startFragmentLegendaryBattle()
      }));
      fragCard.addChild(pendingRow);
    } else if (fragmentsCount >= 50) {
      fragCard.addChild(new UIText({
        tagName: 'div',
        className: 'pw-atoll-section-title',
        text: t('legend_fragment_choose')
      }));

      const choices = atollSys.getFragmentLegendaryChoices(save);
      const choicesGrid = new UIContainer({ className: 'pw-atoll-shop-grid' });
      for (const dex of choices) {
        const species = PokemonDB.getInstance().getByDex(dex);
        if (!species) continue;
        const caught = save?.pokedex?.isCaught?.(species.id) === true;
        const cCard = new UIContainer({ className: 'pw-atoll-shop-card' });
        const cInfo = new UIContainer({ className: 'pw-atoll-shop-info' });
        cInfo.addChild(new UIPokemonSprite({ species: species.id, size: 'standard' }));

        const cText = new UIContainer({ className: 'pw-atoll-shop-text' });
        cText.addChild(new UIText({ tagName: 'b', text: t(species.getNameKey()) }));
        if (caught) {
          cText.addChild(new UIText({ tagName: 'span', className: 'pw-text-sm pw-green', text: '✓' }));
        }
        cInfo.addChild(cText);
        cCard.addChild(cInfo);

        cCard.addChild(new UIButton({
          variant: 'hbtn pw-btn-positive',
          text: t('legend_fragment_summon_btn', { cost: 50 }),
          onClick: () => atollSys.summon(dex)
        }));
        choicesGrid.addChild(cCard);
      }
      fragCard.addChild(choicesGrid);
    } else {
      fragCard.addChild(new UIText({
        tagName: 'span',
        className: 'pw-atoll-shop-locked',
        text: t('legend_fragment_missing', { n: 50 - fragmentsCount, cost: 50 })
      }));
    }

    container.push(fragCard);
  }

  /** @private */
  _renderShopTab(container, save) {
    const atollSys = AtollSystem.getInstance();
    container.push(new UIText({
      tagName: 'div',
      className: 'pw-atoll-section-title',
      text: t('atoll_shop')
    }));

    const offers = atollSys.getShopOffers(save);
    const grid = new UIContainer({ className: 'pw-atoll-shop-grid' });
    for (const offer of offers) {
      const card = new UIContainer({ className: 'pw-atoll-shop-card' });
      const info = new UIContainer({ className: 'pw-atoll-shop-info' });
      info.addChild(new UIItemSprite({ itemId: offer.key }));

      const textCol = new UIContainer({ className: 'pw-atoll-shop-text' });
      textCol.addChild(new UIText({ tagName: 'b', text: offer.name }));
      textCol.addChild(new UIText({
        tagName: 'span',
        className: 'pw-text-sm pw-light1',
        text: `${offer.price} ${t('atoll_tokens')}`
      }));
      info.addChild(textCol);
      card.addChild(info);

      if (offer.affordable) {
        card.addChild(new UIButton({
          variant: 'hbtn pw-btn-positive',
          text: t('buy_btn'),
          onClick: () => atollSys.buyItem(offer.key)
        }));
      } else {
        card.addChild(new UIText({
          tagName: 'span',
          className: 'pw-atoll-shop-locked',
          text: t('atoll_not_enough_tokens')
        }));
      }
      grid.addChild(card);
    }
    container.push(grid);
  }

  /** @private */
  _renderChallengeTab(container, tabKey, state) {
    const atollSys = AtollSystem.getInstance();
    const cycle = atollSys.getCycleInfo();
    const timeRemaining = atollSys.formatCountdown(atollSys.getTimeUntilRotation());

    // Group Description
    const groupDesc = new UIContainer({ className: 'pw-atoll-group-desc' });
    groupDesc.addChild(new UIText({ tagName: 'b', text: t(`atoll_${tabKey}`) }));
    groupDesc.addChild(new UIText({
      tagName: 'p',
      text: t(`atoll_${tabKey}_desc`, { pct: 25 })
    }));
    container.push(groupDesc);

    // Rotation Metadata
    const rotationMeta = new UIContainer({ className: 'pw-atoll-rotation-meta' });
    this._timerChip = new UIText({
      tagName: 'span',
      className: 'pw-atoll-timer-chip',
      text: t('atoll_rotation_timer', { time: timeRemaining })
    });
    this._timerChip.setAttribute('data-rotation-timer', 'atoll');

    const cycleChip = new UIText({
      tagName: 'span',
      className: 'pw-atoll-cycle-chip',
      text: t('atoll_cycle_info', { n: cycle.team, total: cycle.teamCount, day: cycle.day, days: cycle.dayCount })
    });

    rotationMeta.addChildren([this._timerChip, cycleChip]);
    container.push(rotationMeta);

    // Factory Run Card if applicable
    if (tabKey === 'factory') {
      const run = atollSys.getFactoryRun();
      if (run) {
        const runCard = new UIContainer({ className: 'pw-atoll-run-card' });
        const rHead = new UIContainer({ className: 'pw-atoll-run-head' });
        rHead.addChild(new UIText({ tagName: 'b', text: t('atoll_factory_run_title') }));
        rHead.addChild(new UIText({
          tagName: 'span',
          className: 'pw-text-sm pw-light1',
          text: t('atoll_factory_run_streak', { streak: run.streak || 0, mode: t(run.modeKey) })
        }));
        runCard.addChild(rHead);

        // Team sprite chips
        const chipRow = new UIContainer({ className: 'pw-atoll-chip-row' });
        for (const p of run.team || []) {
          const chip = new UIContainer({ className: 'pw-atoll-chip' });
          chip.addChild(new UIPokemonSprite({ species: p.species, size: 'context' }));
          chipRow.addChild(chip);
        }
        runCard.addChild(chipRow);

        const actions = new UIContainer({ className: 'pw-atoll-run-actions' });
        actions.addChild(new UIButton({
          variant: 'hbtn',
          text: t('atoll_factory_prep_open'),
          onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.ATOLL_FACTORY_PREP))
        }));
        actions.addChild(new UIButton({
          variant: 'hbtn pw-btn-danger',
          text: t('atoll_factory_abandon'),
          onClick: () => atollSys.abandonFactoryRun()
        }));
        runCard.addChild(actions);

        runCard.addChild(new UIText({
          tagName: 'small',
          className: 'pw-text-sm pw-light1',
          text: t('atoll_factory_reorg_hint', { pct: 25 })
        }));
        container.push(runCard);
      }
    }

    // Modes Grid
    const modeKeys = MODES_BY_TAB[tabKey] || [];
    const modeGrid = new UIContainer({ className: 'pw-atoll-mode-grid' });

    for (const key of modeKeys) {
      const mode = atollSys.getMode ? atollSys.getMode(key) : null;
      if (!mode) continue;

      const rankCls = mode.maxRank ? `rank-${mode.maxRank.toLowerCase()}` : 'rank-free';
      const mCard = new UIContainer({ className: `pw-atoll-mode-card ${rankCls}` });

      const mInfo = new UIContainer({ className: 'pw-atoll-mode-info' });
      mInfo.addChild(new UIText({
        tagName: 'span',
        className: `pw-atoll-rank-badge ${mode.maxRank ? `rank-${mode.maxRank.toLowerCase()}` : 'free'}`,
        text: mode.maxRank ? t('atoll_max_rank', { rank: mode.maxRank }) : t('atoll_rank_free')
      }));

      mInfo.addChild(new UIText({ tagName: 'b', className: 'pw-atoll-mode-title', text: t(mode.label) }));
      mInfo.addChild(new UIText({
        tagName: 'span',
        className: 'pw-atoll-mode-rule',
        text: t(mode.borrowed ? 'atoll_mode_rule_factory' : 'atoll_mode_rule', {
          level: mode.level,
          size: mode.size,
          reward: mode.reward
        })
      }));

      mInfo.addChild(new UIText({
        tagName: 'small',
        className: 'pw-text-sm pw-light1',
        text: t(mode.borrowed ? 'atoll_rental_preview' : 'atoll_enemy_preview')
      }));

      // Species preview chips
      const kind = mode.borrowed ? 'rental' : 'enemy';
      const previewDexes = atollSys.getSpeciesList(mode.key, undefined, kind);
      const pRow = new UIContainer({ className: 'pw-atoll-chip-row' });
      for (const dex of previewDexes) {
        const species = PokemonDB.getInstance().getByDex(dex);
        if (species) {
          const chip = new UIContainer({ className: 'pw-atoll-chip' });
          chip.addChild(new UIPokemonSprite({ species: species.id, size: 'context' }));
          pRow.addChild(chip);
        }
      }
      mInfo.addChild(pRow);

      // Banned Legendaries Row
      const banned = (mode.key === 'tower_s' || mode.key === 'dome_final') ? atollSys.getBannedLegendaries(mode.key) : [];
      if (banned.length > 0) {
        const banRow = new UIContainer({ className: 'pw-atoll-ban-row' });
        banRow.addChild(new UIText({ tagName: 'span', className: 'pw-text-sm', text: t('atoll_banned_row') }));
        const bChips = new UIContainer({ className: 'pw-atoll-chip-row' });
        for (const dex of banned) {
          const species = PokemonDB.getInstance().getByDex(dex);
          if (species) {
            const chip = new UIContainer({ className: 'pw-atoll-chip' });
            chip.addChild(new UIPokemonSprite({ species: species.id, size: 'context' }));
            bChips.addChild(chip);
          }
        }
        banRow.addChild(bChips);
        mInfo.addChild(banRow);
      }

      if (mode.key === 'tower_free') {
        mInfo.addChild(new UIText({ tagName: 'span', className: 'pw-atoll-free-note', text: t('atoll_ban_free_note') }));
      }

      mCard.addChild(mInfo);

      // CTA Button
      const ctaLabel = mode.borrowed ? t('atoll_factory_continue') : t('atoll_start');
      const ctaBtn = new UIButton({
        className: 'hbtn pw-atoll-mode-cta',
        text: ctaLabel,
        onClick: () => {
          if (mode.borrowed) {
            const run = atollSys.getFactoryRun();
            if (!run) {
              atollSys.createFactoryRun(mode.key);
              EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.ATOLL_FACTORY_PREP));
            } else if (run.modeKey === mode.key) {
              atollSys.startBattle(mode.key);
            } else {
              atollSys.startBattle(mode.key); // will trigger notification of wrong mode
            }
          } else {
            atollSys.startBattle(mode.key);
          }
        }
      });
      mCard.addChild(ctaBtn);
      modeGrid.addChild(mCard);
    }

    container.push(modeGrid);
  }
}
