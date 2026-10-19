/**
 * @file LeagueDB.js
 * @brief Read-only repository of the Pokémon Leagues (C++: class LeagueDB : public DataRepository).
 * Source: LEAGUES_TABLE (tools/data/gen-trainers.mjs) + LEAGUES_CONTENT (hand-made, wins on same id).
 * LeagueDefinition: { id, region, badge, badgeImage|null, badgeColor|null, badgesRequired, reward, sprite, trainers[trainer ids, in order] }
 * A location `champion` is either a gym trainer id (TrainerDB) or a league id (this repository).
 * Texts: t('trainer.<id>.name' | '.title' | '.badge').
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { withContent } from '../core/ContentTables.js';
import { LEAGUES_TABLE } from '../raw/leagues-data.js';
import { LEAGUES_CONTENT } from '../content/leagues-content.js';
import { TrainerDB } from './TrainerDB.js';
import { REGIONS } from '../../config/Regions.js';

export class LeagueDB extends DataRepository {
  /** @type {LeagueDB|null} */
  static _instance = null;

  /** @returns {LeagueDB} */
  static getInstance() {
    if (!LeagueDB._instance) LeagueDB._instance = new LeagueDB();
    return LeagueDB._instance;
  }

  constructor() {
    super('LeagueDB');
  }

  /** @protected @override */
  _build() {
    for (const [id, raw] of Object.entries(withContent(LEAGUES_TABLE, LEAGUES_CONTENT))) {
      this._entries.set(id, deepFreeze({
        id,
        region: raw.region,
        badge: raw.badge || id,
        badgeImage: raw.badgeImage || null,
        badgeColor: raw.badgeColor || null,
        badgesRequired: Math.max(0, Number(raw.badgesRequired) || 0),
        reward: Math.max(0, Number(raw.reward) || 0),
        sprite: raw.sprite || null,
        trainers: [...(raw.trainers || [])]
      }));
    }
  }

  /**
   * @param {string} region
   * @returns {Readonly<Object>|null}
   */
  getByRegion(region) {
    return this.getAll().find((league) => league.region === region) || null;
  }

  /** @override */
  validate() {
    const problems = [];
    const trainers = TrainerDB.getInstance();
    for (const league of this.getAll()) {
      if (!REGIONS.some((region) => region.id === league.region)) problems.push(this._problem(league.id, 'region', league.region));
      if (!league.trainers.length) problems.push(this._problem(league.id, 'trainers', 'empty'));
      for (const id of league.trainers) if (!trainers.has(id)) problems.push(this._problem(league.id, 'trainer', id));
    }
    return problems;
  }
}
