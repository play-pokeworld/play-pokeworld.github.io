/**
 * @file TrainerDB.js
 * @brief Read-only repository of the trainers with a fixed team (C++: class TrainerDB : public DataRepository).
 * Source: TRAINERS_TABLE (tools/data/gen-trainers.mjs) + TRAINERS_CONTENT (hand-made, wins on same id).
 * TrainerDefinition:
 *   { id, kind, region, badge|null, badgeImage|null, badgeColor|null, badgesRequired, reward, sprite,
 *     teams: { default: Member[], byStarter: { <species>: Member[] }, rematch: Member[]|null } }
 * Member: { species, level, moves[], talent|null, item|null, ivs{}, evs{} }
 * Texts: t('trainer.<id>.name' | '.title' | '.badge' | '.intro' | '.win').
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { withContent } from '../core/ContentTables.js';
import { TRAINERS_TABLE } from '../raw/trainers-data.js';
import { TRAINERS_CONTENT } from '../content/trainers-content.js';
import { TrainerKinds } from './TrainerKinds.js';
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { MoveDB } from '../battle/MoveDB.js';
import { TalentDB } from '../pokemon/TalentDB.js';
import { ItemDB } from '../items/ItemDB.js';
import { REGIONS } from '../../config/Regions.js';

/** @returns {Object} Normalized member */
function readMember(raw) {
  return {
    species: raw.species,
    level: Math.max(1, Math.floor(Number(raw.level) || 5)),
    moves: Array.isArray(raw.moves) ? [...raw.moves] : [],
    talent: raw.talent || null,
    item: raw.item || null,
    ivs: { ...(raw.ivs || {}) },
    evs: { ...(raw.evs || {}) }
  };
}

/** @returns {Object[]} */
const readTeam = (list) => (Array.isArray(list) ? list.map(readMember) : []);

export class TrainerDB extends DataRepository {
  /** @type {TrainerDB|null} */
  static _instance = null;

  /** @returns {TrainerDB} */
  static getInstance() {
    if (!TrainerDB._instance) TrainerDB._instance = new TrainerDB();
    return TrainerDB._instance;
  }

  constructor() {
    super('TrainerDB');
  }

  /** @protected @override */
  _build() {
    for (const [id, raw] of Object.entries(withContent(TRAINERS_TABLE, TRAINERS_CONTENT))) {
      const byStarter = {};
      for (const [species, list] of Object.entries(raw.teams?.byStarter || {})) byStarter[species] = readTeam(list);
      this._entries.set(id, deepFreeze({
        id,
        kind: raw.kind,
        region: raw.region,
        badge: raw.badge || null,
        badgeImage: raw.badgeImage || null,
        badgeColor: raw.badgeColor || null,
        badgesRequired: Math.max(0, Number(raw.badgesRequired) || 0),
        reward: Math.max(0, Number(raw.reward) || 0),
        sprite: raw.sprite || null,
        teams: {
          default: readTeam(raw.teams?.default),
          byStarter,
          rematch: raw.teams?.rematch ? readTeam(raw.teams.rematch) : null
        }
      }));
    }
  }

  /**
   * Gym leaders of a region, in badge order (badgesRequired, then table order).
   * @param {string} region
   * @returns {Readonly<Object>[]}
   */
  getGyms(region) {
    return this.getAll()
      .filter((trainer) => trainer.kind === TrainerKinds.GYM && trainer.region === region)
      .sort((a, b) => a.badgesRequired - b.badgesRequired);
  }

  /**
   * Every member of every team of a trainer (validation, previews).
   * @param {Readonly<Object>} trainer
   * @returns {Readonly<Object>[]}
   */
  static allMembers(trainer) {
    return [
      ...trainer.teams.default,
      ...Object.values(trainer.teams.byStarter).flat(),
      ...(trainer.teams.rematch || [])
    ];
  }

  /** @override */
  validate() {
    const problems = [];
    const kinds = Object.values(TrainerKinds);
    const pokemon = PokemonDB.getInstance();
    const moves = MoveDB.getInstance();
    const talents = TalentDB.getInstance();
    const items = ItemDB.getInstance();
    for (const trainer of this.getAll()) {
      if (!kinds.includes(trainer.kind)) problems.push(this._problem(trainer.id, 'kind', trainer.kind));
      if (!REGIONS.some((region) => region.id === trainer.region)) problems.push(this._problem(trainer.id, 'region', trainer.region));
      if (!trainer.teams.default.length && !Object.keys(trainer.teams.byStarter).length) problems.push(this._problem(trainer.id, 'teams', 'empty'));
      if (trainer.kind === TrainerKinds.GYM && !trainer.badge) problems.push(this._problem(trainer.id, 'badge', null));
      if (trainer.kind === TrainerKinds.GYM && !trainer.badgeImage) problems.push(this._problem(trainer.id, 'badgeImage', null));
      for (const member of TrainerDB.allMembers(trainer)) {
        if (!pokemon.has(member.species)) problems.push(this._problem(trainer.id, 'species', member.species));
        for (const move of member.moves) if (!moves.has(move)) problems.push(this._problem(trainer.id, 'move', move));
        if (member.talent && !talents.has(member.talent)) problems.push(this._problem(trainer.id, 'talent', member.talent));
        if (member.item && !items.has(member.item)) problems.push(this._problem(trainer.id, 'item', member.item));
      }
    }
    return problems;
  }
}
