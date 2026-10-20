/**
 * @file BadgesPanel.js
 * @brief Gym badges & leagues full-screen panel (original ui/game/badges-panel.js): header with
 * the counters, region tabs, badge grid, league grid.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIBadgeCard, BadgeCardLayouts } from '../../ui/UIBadgeCard.js';
import { ModalIds } from '../../config/ModalIds.js';
import { REGIONS } from '../../config/Regions.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { TrainerDB } from '../../data/trainers/TrainerDB.js';
import { LeagueDB } from '../../data/trainers/LeagueDB.js';
import { LocationDB } from '../../data/world/LocationDB.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { BadgesChangedEvent } from '../../core/events/BadgesChangedEvent.js';
import { TrainerDefeatedEvent } from '../../core/events/TrainerDefeatedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

/** Tab showing every region. */
const ALL_REGIONS = 'all';

export class BadgesPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.BADGES, title: t('panel_badges_title'), name: 'BadgesPanel' });
    /** @private */
    this._region = ALL_REGIONS;
    this.listen(BadgesChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
    this.listen(TrainerDefeatedEvent, (event) => {
      if (this.isOpen() && LeagueDB.getInstance().getById(event.trainerId)) this._render();
    });
  }

  /** @override */
  onOpen() {
    this._render();
  }

  /** @private */
  _render() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const player = save?.player;
    const has = (id) => !!player?.hasBadge(id);
    const hasLeague = (league) => !!save?.statistics.hasWonLeague(league.region);
    const regions = REGIONS.filter((region) => region.available);
    const gyms = regions.flatMap((region) => TrainerDB.getInstance().getGyms(region.id));
    const leagues = LeagueDB.getInstance().getAll();
    const shown = (entry) => this._region === ALL_REGIONS || entry.region === this._region;
    const placeOf = (id) => {
      const location = LocationDB.getInstance().getByChampion(id);
      return location ? t(`location.${location.id}`) : '';
    };

    this.setFilters([new UIContainer({
      className: 'pw-badges-tabs',
      children: [{ id: ALL_REGIONS, labelKey: 'badges_tab_all' }, ...regions].map((region) => {
        const tab = new UIButton({ variant: 'hbtn', text: t(region.labelKey), onClick: () => this._setRegion(region.id) });
        tab.setActive(region.id === this._region);
        return tab;
      })
    })]);

    const badgeGrid = new UIContainer({ className: 'pw-badges-grid' });
    for (const gym of gyms.filter(shown)) {
      badgeGrid.addChild(new UIBadgeCard({
        image: AssetPaths.badge(gym.badgeImage),
        title: t(`trainer.${gym.id}.badge`),
        lines: [t(`trainer.${gym.id}.name`), placeOf(gym.id)],
        obtained: has(gym.id),
        color: gym.badgeColor
      }));
    }
    const leagueGrid = new UIContainer({ className: 'pw-leagues-grid' });
    for (const league of leagues.filter(shown)) {
      const beaten = hasLeague(league);
      leagueGrid.addChild(new UIBadgeCard({
        image: AssetPaths.badge(league.badgeImage),
        title: t(`trainer.${league.id}.name`),
        lines: [placeOf(league.id)],
        status: t(beaten ? 'league_beaten' : 'league_not_beaten'),
        obtained: beaten,
        color: league.badgeColor,
        layout: BadgeCardLayouts.LEAGUE
      }));
    }

    this.setContent([new UIContainer({
      className: 'pw-badges-panel-container',
      children: [
        new UIContainer({
          className: 'pw-badges-header',
          children: [
            new UIContainer({
              className: 'pw-badges-title-block',
              children: [
                new UIText({ tagName: 'h2', className: 'pw-badges-heading', text: t('panel_badges_title') }),
                new UIText({ tagName: 'div', className: 'pw-badges-subtitle', text: t('badges_subtitle') })
              ]
            }),
            new UIContainer({
              className: 'pw-badges-counters',
              children: [
                new UIText({ tagName: 'div', className: 'pw-badges-count', text: t('badges_count', { n: gyms.filter((gym) => has(gym.id)).length, total: gyms.length }) }),
                new UIText({ tagName: 'div', className: 'pw-leagues-count', text: t('leagues_count', { n: leagues.filter(hasLeague).length, total: leagues.length }) })
              ]
            })
          ]
        }),
        badgeGrid,
        leagueGrid
      ]
    })]);
  }

  /** @private */
  _setRegion(region) {
    this._region = region;
    this._render();
  }
}
