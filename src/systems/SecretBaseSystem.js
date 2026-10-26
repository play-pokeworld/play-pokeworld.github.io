/**
 * @file SecretBaseSystem.js
 * @brief Persistent secret-base operations and isolated, transient room visits.
 * No DOM access; panels consume snapshots and call commands here.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { SecretBaseAccessSystem } from './SecretBaseAccessSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';
import { SecretBaseData } from '../data/save/SecretBaseData.js';
import { SecretBaseItemDB } from '../data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../data/base/SecretBaseLayoutDB.js';
import { SecretBasePlacementRules } from './secret-base/SecretBasePlacementRules.js';
import { SecretBaseExchangeRules } from './secret-base/SecretBaseExchangeRules.js';
import { EventBus } from '../core/EventBus.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { SecretBaseChangedEvent } from '../core/events/SecretBaseChangedEvent.js';
import { SecretBaseVisitChangedEvent } from '../core/events/SecretBaseVisitChangedEvent.js';
import { SecretBaseEstablishedEvent } from '../core/events/SecretBaseEstablishedEvent.js';
import { SecretBaseVisitedEvent } from '../core/events/SecretBaseVisitedEvent.js';
import { SecretBaseNpcBattleResolvedEvent } from '../core/events/SecretBaseNpcBattleResolvedEvent.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { PreferencesSystem } from './PreferencesSystem.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { TalentDB } from '../data/pokemon/TalentDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { t } from '../localization/LocalizationManager.js';

const ITEMS = () => SecretBaseItemDB.getInstance();
const LAYOUTS = () => SecretBaseLayoutDB.getInstance();
const CARDINALS = Object.freeze([
  Object.freeze({ x: 0, y: 1 }), Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 0 }), Object.freeze({ x: -1, y: 0 })
]);

/** @param {*} value @param {number} maximum @returns {string} */
function cleanText(value, maximum) {
  return String(value ?? '').replace(/[<>`\\]/g, '').slice(0, maximum);
}

/** @param {Object} value @returns {Object} */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** @param {Object|null} data @returns {SecretBaseData|null} */
function cloneBase(data) {
  if (!data) return null;
  return new SecretBaseData(typeof data.serialize === 'function' ? data.serialize() : data);
}

/** @param {number} x @param {number} y @returns {string} */
function cellKey(x, y) {
  return `${x},${y}`;
}

export const SecretBaseResults = Object.freeze({
  READY: 'ready',
  NO_SAVE: 'no-save',
  LOCKED: 'locked',
  WRONG_REGION: 'wrong-region',
  INVALID_LOCATION: 'invalid-location',
  INVALID_LAYOUT: 'invalid-layout',
  BASE_EXISTS: 'base-exists',
  NO_BASE: 'no-base',
  WRONG_LOCATION: 'wrong-location',
  INVALID_ITEM: 'invalid-item',
  NOT_IN_STOCK: 'not-in-stock',
  INVALID_NPC: 'invalid-npc',
  NPC_TEAM_REQUIRED: 'npc-team-required',
  VISIT_ACTIVE: 'visit-active',
  NO_VISIT: 'no-visit',
  FLAG_OWN: 'flag-own',
  FLAG_COOLDOWN: 'flag-cooldown',
  BATTLE_ACTIVE: 'battle-active',
  DEBUG_ONLY: 'debug-only'
});

export class SecretBaseSystem extends BaseSystem {
  /** @private @type {SecretBaseSystem|null} */
  static _instance = null;

  /** @private @type {Object|null} */
  _visit = null;
  /** @private @type {number} */
  _visitSequence = 0;
  /** @private @type {Function|null} */
  _onSaveContextChanged = null;
  /** @private @type {Function|null} */
  _onNpcBattleResolved = null;

  /** @returns {SecretBaseSystem} */
  static getInstance() {
    if (!SecretBaseSystem._instance) SecretBaseSystem._instance = new SecretBaseSystem();
    return SecretBaseSystem._instance;
  }

  constructor() {
    super('SecretBaseSystem', 'System');
  }

  /** @override */
  init() {
    if (this._onSaveContextChanged) return;
    this._onSaveContextChanged = () => {
      this._visit = null;
      EventBus.getInstance().dispatch(new SecretBaseVisitChangedEvent('save-context-changed', null));
    };
    this._onNpcBattleResolved = (event) => this._onBattleResolved(event);
    EventBus.getInstance().subscribe(SaveCreatedEvent, this._onSaveContextChanged);
    EventBus.getInstance().subscribe(SaveLoadedEvent, this._onSaveContextChanged);
    EventBus.getInstance().subscribe(SaveDeletedEvent, this._onSaveContextChanged);
    EventBus.getInstance().subscribe(SecretBaseNpcBattleResolvedEvent, this._onNpcBattleResolved);
  }

  /** @override */
  onDestroy() {
    if (this._onSaveContextChanged) {
      EventBus.getInstance().unsubscribe(SaveCreatedEvent, this._onSaveContextChanged);
      EventBus.getInstance().unsubscribe(SaveLoadedEvent, this._onSaveContextChanged);
      EventBus.getInstance().unsubscribe(SaveDeletedEvent, this._onSaveContextChanged);
    }
    if (this._onNpcBattleResolved) {
      EventBus.getInstance().unsubscribe(SecretBaseNpcBattleResolvedEvent, this._onNpcBattleResolved);
    }
    this._visit = null;
    this._onSaveContextChanged = null;
    this._onNpcBattleResolved = null;
    super.onDestroy();
  }

  /** @param {Object|null} [save] @returns {boolean} */
  isUnlocked(save = SaveSystem.getInstance().getCurrentSave()) {
    return SecretBaseAccessSystem.getInstance().isUnlocked(save);
  }

  /** @returns {SecretBaseData|null} */
  getBase() {
    return SaveSystem.getInstance().getCurrentSave()?.secretBase ?? null;
  }

  /** @returns {Object|null} Defensive copy of the persistent domain. */
  getBaseSnapshot() {
    const base = this.getBase();
    return base ? clone(base.serialize()) : null;
  }

  /** @param {string} locationId @returns {string[]} */
  getAlcoveLayoutIds(locationId) {
    return LAYOUTS().getIdsAtLocation(locationId);
  }

  /** @param {string} locationId @returns {boolean} */
  canUseAt(locationId) {
    const location = LocationDB.getInstance().getById(locationId);
    return this.isUnlocked() && location?.region === SecretBaseRules.REGION &&
      this.getAlcoveLayoutIds(locationId).length > 0;
  }

  /** Pure route/base facts for the Location section; no additional progression gate. @param {string} locationId */
  getLocationAlcovesSnapshot(locationId){
    if(!this.canUseAt(locationId))return null;
    const base=this.getBase(),established=base?.isEstablished?.()===true,baseLocationId=established?this.getBaseLocationId():null,here=established&&baseLocationId===locationId;
    return {saveId:SaveSystem.getInstance().getCurrentSave()?.id,locationId,established,baseLocationId,baseLayoutId:established?base.layoutId:null,here,
      rows:this.getAlcoveLayoutIds(locationId).map(id=>({id,current:here&&id===base.layoutId}))};
  }

  /** @returns {string|null} The Hoenn location that contains the established alcove. */
  getBaseLocationId() {
    const base = this.getBase();
    if (!base?.layoutId) return null;
    if (base.locationId && this.getAlcoveLayoutIds(base.locationId).includes(base.layoutId)) return base.locationId;
    return LAYOUTS().getLocationIds().find((locationId) => this.getAlcoveLayoutIds(locationId).includes(base.layoutId)) || null;
  }

  /** @returns {Object|null} Defensive visitor/session snapshot. */
  getVisitSnapshot() {
    const visit = this._visit;
    if (!visit) return null;
    return {
      id: visit.id,
      source: visit.source,
      fromLocation: Boolean(visit.fromLocation),
      own: visit.own,
      name: visit.meta.name,
      baseId: visit.meta.id,
      ownerId: visit.meta.ownerId,
      locationId: visit.locationId,
      layoutId: visit.data.layoutId,
      data: clone(visit.data.serialize()),
      position: { ...visit.position },
      direction: visit.direction,
      path: visit.path.map((step) => ({ ...step })),
      battlesWon: visit.battlesWon,
      battlesLost: visit.battlesLost,
      pendingNpcId: visit.pendingTarget?.npcId || null
    };
  }

  /** @returns {{ok:boolean,reason?:string,locationId?:string,layoutId?:string}} */
  establish(locationId, layoutId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const valid = this._validateAlcove(locationId, layoutId, save);
    if (!valid.ok) return valid;
    if (LocationSystem.getInstance().getCurrentLocationId() !== locationId) return this._failure(SecretBaseResults.WRONG_LOCATION);
    const current = save.secretBase;
    if (current?.isEstablished?.()) return this._failure(SecretBaseResults.BASE_EXISTS);
    const base = current || new SecretBaseData();
    base.layoutId = layoutId;
    base.locationId = locationId;
    base.spawn = { ...valid.layout.spawn };
    base.decorations = [];
    base.npcs = [];
    base.npcStock = [];
    if (!this._ensurePc(base)) return this._failure(SecretBaseResults.INVALID_LAYOUT);
    save.secretBase = base;
    if (this._visit?.source === 'alcove' && this._visit.locationId === locationId && this._visit.data.layoutId === layoutId) {
      this._closeVisitWithoutSaving();
    }
    EventBus.getInstance().dispatch(new SecretBaseEstablishedEvent(locationId, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.ESTABLISHED);
    this._notify('win.established', { name: t(`win.layout.${layoutId}`) }, NotificationTones.SUCCESS);
    return { ok: true, locationId, layoutId };
  }

  /**
   * Relocates an established base. Decorations are returned to owned stock; NPCs are removed,
   * matching the reference's move semantics. No new furniture is granted.
   * @param {string} locationId
   * @param {string} layoutId
   * @returns {{ok:boolean,reason?:string,locationId?:string,layoutId?:string}}
   */
  relocate(locationId, layoutId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const valid = this._validateAlcove(locationId, layoutId, save);
    if (!valid.ok) return valid;
    if (LocationSystem.getInstance().getCurrentLocationId() !== locationId) return this._failure(SecretBaseResults.WRONG_LOCATION);
    const base = save.secretBase;
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    for (const decoration of base.decorations) {
      const item = ITEMS().getById(decoration.itemId);
      if (item && item.acquisition !== 'auto') {
        base.stock[decoration.itemId] = Math.min(99, (Number(base.stock[decoration.itemId]) || 0) + 1);
      }
    }
    base.layoutId = layoutId;
    base.locationId = locationId;
    base.spawn = { ...valid.layout.spawn };
    base.decorations = [];
    base.npcs = [];
    base.npcStock = [];
    if (!this._ensurePc(base)) return this._failure(SecretBaseResults.INVALID_LAYOUT);
    this._closeVisitWithoutSaving();
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.RELOCATED);
    this._notify('win.moved', { name: t(`win.layout.${layoutId}`) }, NotificationTones.SUCCESS);
    return { ok: true, locationId, layoutId };
  }

  /** @param {string} locationId @param {string} layoutId @param {Object|null} save */
  _validateAlcove(locationId, layoutId, save) {
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    const location = LocationDB.getInstance().getById(locationId);
    if (!location) return this._failure(SecretBaseResults.INVALID_LOCATION);
    if (location.region !== SecretBaseRules.REGION) return this._failure(SecretBaseResults.WRONG_REGION);
    const layout = LAYOUTS().getById(layoutId);
    if (!layout || !this.getAlcoveLayoutIds(locationId).includes(layoutId)) return this._failure(SecretBaseResults.INVALID_LAYOUT);
    return { ok: true, layout };
  }

  /** @param {SecretBaseData} base @returns {boolean} */
  _ensurePc(base) {
    if (base.decorations.some((entry) => entry.itemId === SecretBaseRules.ITEM_IDS.PC)) return true;
    const layout = LAYOUTS().getById(base.layoutId);
    if (!layout) return false;
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        const cell = layout.cells[y]?.[x];
        if (!cell || cell.type !== SecretBaseRules.CELL_TYPES.FLOOR || cell.entrance || cell.spawnPoint || cell.stairAnchor) continue;
        const result = SecretBasePlacementRules.canPlaceDecoration(base, SecretBaseRules.ITEM_IDS.PC, x, y);
        if (!result.ok) continue;
        base.decorations.push({ uid: base.nextUid++, itemId: SecretBaseRules.ITEM_IDS.PC, x: result.x, y: result.y, rotation: 0 });
        return true;
      }
    }
    return false;
  }

  /** @param {string} itemId @param {number} x @param {number} y */
  placeDecoration(itemId, x, y) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    const item = ITEMS().getById(itemId);
    if (!item || item.acquisition === 'auto') return this._failure(SecretBaseResults.INVALID_ITEM);
    if ((Number(base.stock[itemId]) || 0) <= 0) return this._failure(SecretBaseResults.NOT_IN_STOCK);
    const result = SecretBasePlacementRules.canPlaceDecoration(base, itemId, x, y);
    if (!result.ok) return this._failure(result.reason);
    base.stock[itemId]--;
    if (base.stock[itemId] <= 0) delete base.stock[itemId];
    base.decorations.push({ uid: base.nextUid++, itemId, x: result.x, y: result.y, rotation: 0 });
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.DECORATED);
    return { ok: true, itemId, x: result.x, y: result.y };
  }

  /** @param {number|string} uid @param {number} x @param {number} y */
  moveDecoration(uid, x, y) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    const decoration = base.decorations?.find((entry) => entry.uid === uid);
    if (!decoration) return this._failure(SecretBaseResults.INVALID_ITEM);
    const item = ITEMS().getById(decoration.itemId);
    if (!item || item.acquisition === 'auto') return this._failure(SecretBaseResults.INVALID_ITEM);
    const result = SecretBasePlacementRules.canPlaceDecoration(base, decoration.itemId, x, y, { ignoreUid: uid });
    if (!result.ok) return this._failure(result.reason);
    if (decoration.x === result.x && decoration.y === result.y) return { ok: true, unchanged: true };
    decoration.x = result.x;
    decoration.y = result.y;
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.DECORATED);
    return { ok: true, itemId: decoration.itemId, x: result.x, y: result.y };
  }

  /** @param {number|string} uid */
  pickupDecoration(uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    const index = base.decorations?.findIndex((entry) => entry.uid === uid) ?? -1;
    if (index < 0) return this._failure(SecretBaseResults.INVALID_ITEM);
    const decoration = base.decorations[index];
    const item = ITEMS().getById(decoration.itemId);
    if (!item || item.acquisition === 'auto') return this._failure(SecretBaseResults.INVALID_ITEM);
    base.decorations.splice(index, 1);
    base.stock[decoration.itemId] = Math.min(99, (Number(base.stock[decoration.itemId]) || 0) + 1);
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.DECORATED);
    return { ok: true, itemId: decoration.itemId };
  }

  /** @returns {Object[]} Self-contained snapshots of the active party for an NPC editor. */
  captureCurrentTeam() {
    const team = SaveSystem.getInstance().getCurrentSave()?.team || [];
    return team.slice(0, SecretBaseRules.MAX_NPC_TEAM).map((pokemon) => ({
      species: pokemon.species,
      level: pokemon.level,
      moves: [...(pokemon.moves || [])],
      talent: pokemon.talent || null,
      shiny: pokemon.shiny === true,
      ...(pokemon.heldItem ? { heldItem: pokemon.heldItem } : {})
    }));
  }

  /** @param {string} name @param {string} sprite @param {Object[]} [team=[]] @param {Object} [messages={}] @param {number|null} [x=null] @param {number|null} [y=null] */
  createNpc({ name = '', sprite = SecretBaseRules.DEFAULT_NPC_SPRITE, team = [], messages = {}, x = null, y = null } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    if (Number.isFinite(SecretBaseRules.MAX_NPCS) && base.npcs.length >= SecretBaseRules.MAX_NPCS) {
      return this._failure('err.npc_max');
    }
    const normalizedTeam = this._normalizeNpcTeam(team);
    if (!normalizedTeam.ok) return normalizedTeam;
    const id = `base-npc-${base.nextUid++}`;
    const npc = {
      id,
      name: cleanText(name, SecretBaseRules.MAX_NPC_NAME_LENGTH),
      sprite: SecretBaseRules.NPC_SPRITES.includes(sprite) ? sprite : SecretBaseRules.DEFAULT_NPC_SPRITE,
      team: normalizedTeam.team,
      messages: this._normalizeMessages(messages),
      x: null,
      y: null
    };
    const spot = Number.isInteger(x) && Number.isInteger(y) ? { x, y } : this._findNpcSpot(base, npc);
    if (!spot) return this._failure('err.occupied');
    const placement = SecretBasePlacementRules.canPlaceNpc(base, npc, spot.x, spot.y);
    if (!placement.ok) return this._failure(placement.reason);
    npc.x = spot.x;
    npc.y = spot.y;
    base.npcs.push(npc);
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.NPC_CHANGED);
    return { ok: true, id, npc: clone(npc) };
  }

  /** @param {Object} npc @returns {Object|null} */
  _findNpcSpot(base, npc) {
    const layout = LAYOUTS().getById(base.layoutId);
    if (!layout) return null;
    const origin = base.spawn || layout.spawn;
    const candidates = [];
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        const cell = layout.cells[y]?.[x];
        if (cell?.type !== SecretBaseRules.CELL_TYPES.FLOOR || cell.entrance || cell.stairAnchor) continue;
        const result = SecretBasePlacementRules.canPlaceNpc(base, npc, x, y);
        if (result.ok) candidates.push({ x, y, distance: Math.abs(x - origin.x) + Math.abs(y - origin.y) });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
    return candidates[0] || null;
  }

  /** @param {string} npcId @param {Object} patch */
  updateNpc(npcId, patch = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    const npc = base.npcs?.find((entry) => entry.id === npcId) || base.npcStock?.find((entry) => entry.id === npcId);
    if (!npc) return this._failure(SecretBaseResults.INVALID_NPC);

    const next = clone(npc);
    if (patch.name !== undefined) {
      const name = cleanText(patch.name, SecretBaseRules.MAX_NPC_NAME_LENGTH).trim();
      if (name) next.name = name;
    }
    if (patch.sprite !== undefined) {
      next.sprite = SecretBaseRules.NPC_SPRITES.includes(patch.sprite) ? patch.sprite : SecretBaseRules.DEFAULT_NPC_SPRITE;
    }
    if (patch.team !== undefined) {
      const normalizedTeam = this._normalizeNpcTeam(patch.team);
      if (!normalizedTeam.ok) return normalizedTeam;
      next.team = normalizedTeam.team;
    }
    if (patch.messages !== undefined) next.messages = this._normalizeMessages(patch.messages, next.messages);
    if (patch.x !== undefined || patch.y !== undefined) {
      if (!Number.isInteger(patch.x) || !Number.isInteger(patch.y)) {
        return this._failure(SecretBaseResults.INVALID_LOCATION);
      }
      const placement = SecretBasePlacementRules.canPlaceNpc(base, next, patch.x, patch.y, { ignoreNpcId: npcId });
      if (!placement.ok) return this._failure(placement.reason);
      next.x = patch.x;
      next.y = patch.y;
    }
    Object.assign(npc, next);
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.NPC_CHANGED);
    return { ok: true, npc: clone(npc) };
  }

  /** @param {string} npcId */
  deleteNpc(npcId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    const index = base.npcs?.findIndex((entry) => entry.id === npcId) ?? -1;
    if (index < 0) return this._failure(SecretBaseResults.INVALID_NPC);
    base.npcs.splice(index, 1);
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.NPC_CHANGED);
    return { ok: true };
  }

  /** @param {Array<Object>} team @returns {{ok:boolean,team?:Object[],reason?:string}} */
  _normalizeNpcTeam(team) {
    if (!Array.isArray(team)) return { ok: false, reason: 'err.npc_team' };
    const normalized = [];
    for (const raw of team.slice(0, SecretBaseRules.MAX_NPC_TEAM)) {
      if (!raw || typeof raw !== 'object') continue;
      let species = typeof raw.species === 'string' ? raw.species.trim().toLowerCase() : '';
      if (!species && Number(raw.legacyDexId || raw.id) > 0) {
        const legacy = PokemonDexSpecies(Number(raw.legacyDexId || raw.id));
        species = legacy;
      }
      if (!isValidSpecies(species)) continue;
      const moves = (Array.isArray(raw.moves) ? raw.moves : [])
        .map((move) => typeof move === 'string' ? move : move?.id)
        .filter((move) => typeof move === 'string' && isValidMove(move))
        .slice(0, 4);
      const talent = isValidTalent(raw.talent) ? raw.talent : null;
      const heldItem = isValidHeldItem(raw.heldItem || raw.item) ? (raw.heldItem || raw.item) : null;
      normalized.push({
        species,
        level: Math.max(1, Math.min(100, Math.floor(Number(raw.level) || 5))),
        moves,
        talent,
        shiny: raw.shiny === true,
        ...(heldItem ? { heldItem } : {})
      });
    }
    if (team.length > 0 && normalized.length === 0) return { ok: false, reason: 'err.npc_team' };
    return { ok: true, team: normalized };
  }

  /** @param {Object} messages @param {Object} [fallback] @returns {Object} */
  _normalizeMessages(messages = {}, fallback = {}) {
    const input = messages && typeof messages === 'object' ? messages : {};
    const old = fallback && typeof fallback === 'object' ? fallback : {};
    return {
      pre: cleanText(input.pre ?? old.pre, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH),
      win: cleanText(input.win ?? old.win, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH),
      lose: cleanText(input.lose ?? old.lose, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH)
    };
  }

  /** @param {string} value */
  setPcMessage(value) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    base.pcMessage = cleanText(value, SecretBaseRules.MAX_PC_MESSAGE_LENGTH);
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.PC_MESSAGE);
    this._notify('pc.msg_saved', {}, NotificationTones.SUCCESS);
    return { ok: true };
  }

  /** Debug-only catalog fill. New saves receive no decoration stock. */
  debugGrantAll() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!PreferencesSystem.getInstance().isDebugMode()) return this._failure(SecretBaseResults.DEBUG_ONLY);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    let count = 0;
    for (const item of ITEMS().getAll()) {
      if (item.acquisition === 'auto') continue;
      base.stock[item.id] = Math.min(99, (Number(base.stock[item.id]) || 0) + 1);
      count++;
    }
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged('debug-stock');
    this._notify('debug.granted', { n: count }, NotificationTones.SUCCESS);
    return { ok: true, count };
  }

  /** Starts the interactive visit to the saved base. */
  startOwnVisit({ fromLocation = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const base = save?.secretBase;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!base?.isEstablished?.()) return this._failure(SecretBaseResults.NO_BASE);
    if (this._visit) {
      return this._visit.own ? { ok: true, alreadyActive: true } : this._failure(SecretBaseResults.VISIT_ACTIVE);
    }
    const data = cloneBase(base);
    const locationId = this.getBaseLocationId() || LocationSystem.getInstance().getCurrentLocationId();
    const owner = save.player.trainerName || '';
    const visit = this._createVisit(data, {
      source: 'own', locationId, id: `base-${save.id}`, ownerId: save.id, name: owner, fromLocation
    }, true);
    if (!visit.ok) return visit;
    base.record.visits++;
    this._visit.data.record.visits = base.record.visits;
    EventBus.getInstance().dispatch(new SecretBaseVisitedEvent(locationId, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged('visit-record');
    this._emitVisitChanged('started');
    this._notify('edit.visit_start_own', {}, NotificationTones.SUCCESS);
    return { ok: true };
  }

  /** Opens a temporary empty alcove; nothing in it is persisted to the player's base. */
  startAlcoveVisit(locationId, layoutId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const valid = this._validateAlcove(locationId, layoutId, save);
    if (!valid.ok) return valid;
    if (LocationSystem.getInstance().getCurrentLocationId() !== locationId) return this._failure(SecretBaseResults.WRONG_LOCATION);
    if (this._visit) return this._failure(SecretBaseResults.VISIT_ACTIVE);
    const data = new SecretBaseData({ layoutId, locationId, spawn: valid.layout.spawn });
    if (!this._ensurePc(data)) return this._failure(SecretBaseResults.INVALID_LAYOUT);
    const result = this._createVisit(data, {
      source: 'alcove', locationId, id: `alcove-${layoutId}`, ownerId: null, name: '', fromLocation: true
    }, false);
    if (!result.ok) return result;
    EventBus.getInstance().dispatch(new SecretBaseVisitedEvent(locationId));
    this._emitVisitChanged('started');
    return { ok: true };
  }

  /** Parses a portable file and visits its sanitized copy without importing gameplay data. */
  startImportedVisit(text) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    const result = SecretBaseExchangeRules.validateImport(text);
    if (!result.ok) return this._failure(result.reason);
    if (this._visit) return this._failure(SecretBaseResults.VISIT_ACTIVE);
    const currentLocation = LocationSystem.getInstance().getCurrentLocationId();
    const locationId = this._locationForLayout(result.data.layoutId) || currentLocation;
    let id = result.meta.id;
    if (!id) id = `import-${this._stableHash(JSON.stringify(result.data.serialize()))}`;
    const isOwnFile = !!result.meta.ownerId && result.meta.ownerId === save.id;
    const started = this._createVisit(result.data, {
      source: 'import', locationId, id, ownerId: result.meta.ownerId, name: result.meta.name
    }, false, isOwnFile);
    if (!started.ok) return started;
    EventBus.getInstance().dispatch(new SecretBaseVisitedEvent(locationId));
    this._emitVisitChanged('started');
    return { ok: true, droppedItems: result.droppedItems || 0 };
  }

  /** @private @param {SecretBaseData} data @param {Object} meta @param {boolean} own @param {boolean} [ownFile=false] */
  _createVisit(data, meta, own, ownFile = false) {
    const layout = LAYOUTS().getById(data.layoutId);
    if (!layout) return this._failure(SecretBaseResults.INVALID_LAYOUT);
    const spawn = data.spawn || layout.spawn;
    if (!spawn) return this._failure(SecretBaseResults.INVALID_LAYOUT);
    this._visit = {
      id: `visit-${Date.now()}-${++this._visitSequence}`,
      source: meta.source,
      fromLocation: Boolean(meta.fromLocation),
      own: own || ownFile,
      locationId: meta.locationId,
      meta: {
        id: meta.id,
        ownerId: meta.ownerId,
        name: cleanText(meta.name, SecretBaseRules.MAX_NPC_NAME_LENGTH)
      },
      data,
      position: { x: spawn.x, y: spawn.y, elevation: layout.cells[spawn.y]?.[spawn.x]?.elevation || 0 },
      direction: 'down',
      path: [],
      pendingTarget: null,
      broken: {},
      lit: {},
      trapsFired: {},
      battlesWon: 0,
      battlesLost: 0
    };
    return { ok: true };
  }

  /** @param {string} locationId @returns {string|null} */
  _locationForLayout(layoutId) {
    return LAYOUTS().getLocationIds().find((locationId) => this.getAlcoveLayoutIds(locationId).includes(layoutId)) || null;
  }

  /** @param {string} value @returns {string} */
  _stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  /** Ends the transient visit without changing its source save. */
  stopVisit() {
    if (!this._visit) return { ok: true, summary: null };
    const summary = { wins: this._visit.battlesWon, losses: this._visit.battlesLost, name: this._visit.meta.name };
    this._visit = null;
    this._emitVisitChanged('ended');
    this._notify('edit.visit_end', { w: summary.wins, l: summary.losses }, NotificationTones.INFO);
    return { ok: true, summary };
  }

  /** @private */
  _closeVisitWithoutSaving() {
    if (!this._visit) return;
    this._visit = null;
    this._emitVisitChanged('ended');
  }

  /**
   * Click-to-walk command for the visit view. Non-walkable targets are approached; NPCs
   * automatically open their interaction once the visitor reaches an adjacent tile.
   * @param {number} x
   * @param {number} y
   * @returns {Object}
   */
  clickVisit(x, y) {
    const visit = this._visit;
    if (!visit) return { type: 'none' };
    const data = visit.data;
    const occupants = SecretBasePlacementRules.getOccupants(data, x, y);
    const targetNpc = occupants.npc;
    const targetDecoration = this._topDecorationAt(data, x, y);
    const distance = Math.abs(visit.position.x - x) + Math.abs(visit.position.y - y);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return { type: 'blocked' };
    if (distance === 0) {
      if (targetDecoration) return { type: 'interact', interaction: this._interactAt(x, y), x, y };
      return { type: 'none' };
    }
    const blocksWalking = !!targetNpc || (!!targetDecoration && ITEMS().getById(targetDecoration.itemId)?.walkable !== true);
    if (distance === 1 && (blocksWalking || targetDecoration)) {
      const interaction = this._interactAt(x, y);
      return { type: 'interact', interaction, x, y };
    }

    let path = SecretBasePlacementRules.findPath(data, visit.position, { x, y });
    if (!path) {
      let best = null;
      for (const direction of CARDINALS) {
        const tx = x + direction.x;
        const ty = y + direction.y;
        const candidate = SecretBasePlacementRules.findPath(data, visit.position, { x: tx, y: ty });
        if (candidate && (!best || candidate.length < best.path.length)) best = { path: candidate, x: tx, y: ty };
      }
      if (!best) return { type: 'blocked', x, y };
      path = best.path;
    }
    if (targetNpc) visit.pendingTarget = { npcId: targetNpc.id, x, y };
    else if (targetDecoration) visit.pendingTarget = { decorationUid: targetDecoration.uid, x, y };
    else visit.pendingTarget = null;
    visit.path = path;
    this._emitVisitChanged('path-set');
    return { type: 'move', steps: path.length, targetNpcId: visit.pendingTarget?.npcId || null };
  }

  /** Advances the visit by one walking step. Called by the view at VISIT_STEP_MS intervals. */
  tickVisit() {
    const visit = this._visit;
    if (!visit || !visit.path.length) return { moved: false, done: true };
    const step = visit.path.shift();
    const previous = { ...visit.position };
    if (step.x > previous.x) visit.direction = 'right';
    else if (step.x < previous.x) visit.direction = 'left';
    else if (step.y > previous.y) visit.direction = 'down';
    else if (step.y < previous.y) visit.direction = 'up';
    visit.position = { x: step.x, y: step.y, elevation: step.elevation ?? previous.elevation };

    const slide = SecretBasePlacementRules.getSlideRamp(visit.data, step.x, step.y);
    let effect = null;
    if (slide) {
      const footprint = ITEMS().getFootprint(SecretBaseRules.ITEM_IDS.SLIDE);
      visit.position = { x: slide.x + 1, y: slide.y + footprint.depth - 1, elevation: 0 };
      visit.path = [];
      effect = { messageKey: 'visit.slide' };
    } else {
      const decoration = this._topDecorationAt(visit.data, step.x, step.y);
      if (decoration) effect = this._stepEffect(decoration);
    }

    const done = visit.path.length === 0;
    let interaction = null;
    const pending = visit.pendingTarget;
    if (done && pending) {
      visit.pendingTarget = null;
      const npc = pending.npcId ? visit.data.npcs.find((entry) => entry.id === pending.npcId) : null;
      const distance = Math.abs(visit.position.x - pending.x) + Math.abs(visit.position.y - pending.y);
      if (npc && distance === 1) interaction = this._interactAt(npc.x, npc.y);
      else if (pending.decorationUid) interaction = this._interactAt(pending.x, pending.y);
    }
    this._emitVisitChanged('step');
    if (effect) this._notify(effect.messageKey, effect.params || {}, NotificationTones.INFO);
    return { moved: true, done, effect, interaction };
  }

  /** @private @param {Object} decoration @returns {Object|null} */
  _stepEffect(decoration) {
    const item = ITEMS().getById(decoration.itemId);
    const effect = item?.effect;
    if (!effect) return null;
    const uid = String(decoration.uid);
    if (effect === 'burst') {
      if (this._visit.broken[uid]) return null;
      this._visit.broken[uid] = true;
      return { messageKey: 'visit.burst' };
    }
    if (effect === 'glitter') return { messageKey: 'visit.glitter' };
    if (effect === 'jump') return { messageKey: 'visit.jump' };
    if (effect === 'spin') return { messageKey: 'visit.spin' };
    if (effect.startsWith(SecretBaseRules.EFFECTS.NOTE_PREFIX)) {
      const noteId = Number(effect.slice(SecretBaseRules.EFFECTS.NOTE_PREFIX.length)) || 0;
      return { messageKey: 'visit.note', params: { note: t(`notes.${noteId}`) } };
    }
    if (effect === 'door' && !this._visit.broken[uid]) {
      this._visit.broken[uid] = true;
      return { messageKey: 'visit.door_break' };
    }
    return null;
  }

  /** @param {number} x @param {number} y */
  interactVisitAt(x, y) {
    if (!this._visit) return { type: 'none' };
    const distance = Math.abs(this._visit.position.x - x) + Math.abs(this._visit.position.y - y);
    if (distance !== 1) return { type: 'none' };
    return this._interactAt(x, y);
  }

  /** @private @param {number} x @param {number} y @returns {Object} */
  _interactAt(x, y) {
    const visit = this._visit;
    const { npc } = SecretBasePlacementRules.getOccupants(visit.data, x, y);
    if (npc) {
      if (!Array.isArray(npc.team) || npc.team.length === 0) return { type: 'npc-idle', npc: clone(npc) };
      return { type: 'npc-battle', npc: clone(npc) };
    }
    const decoration = this._topDecorationAt(visit.data, x, y);
    if (!decoration) return { type: 'nothing' };
    const item = ITEMS().getById(decoration.itemId);
    switch (item?.effect) {
      case SecretBaseRules.EFFECTS.PC:
        return { type: 'pc', pc: this.getPcViewModel() };
      case SecretBaseRules.EFFECTS.SIT:
        return { type: 'message', key: 'edit.sit' };
      case SecretBaseRules.EFFECTS.BURST: {
        const message = this._stepEffect(decoration);
        return { type: 'message', key: message?.messageKey || 'edit.punch' };
      }
      case SecretBaseRules.EFFECTS.DOOR: {
        const message = this._stepEffect(decoration);
        return message ? { type: 'message', key: message.messageKey } : { type: 'item', itemId: decoration.itemId };
      }
      case SecretBaseRules.EFFECTS.GLITTER:
        return { type: 'message', key: 'visit.glitter' };
      case SecretBaseRules.EFFECTS.JUMP:
        return { type: 'message', key: 'visit.jump' };
      case SecretBaseRules.EFFECTS.SPIN:
        return { type: 'message', key: 'visit.spin' };
      default:
        if (typeof item?.effect === 'string' && item.effect.startsWith(SecretBaseRules.EFFECTS.NOTE_PREFIX)) {
          const message = this._stepEffect(decoration);
          return { type: 'message', key: message?.messageKey, params: message?.params || {} };
        }
        return { type: 'item', itemId: decoration.itemId };
    }
  }

  /** @private @param {Object} data @param {number} x @param {number} y */
  _topDecorationAt(data, x, y) {
    const decorations = SecretBasePlacementRules.getOccupants(data, x, y).decorations;
    decorations.sort((left, right) => {
      const leftItem = ITEMS().getById(left.itemId);
      const rightItem = ITEMS().getById(right.itemId);
      const layer = (item) => item?.layer === SecretBaseRules.LAYERS.SURFACE ? 2 : item?.layer === SecretBaseRules.LAYERS.WALL ? 0 : 1;
      return layer(leftItem) - layer(rightItem) || left.y - right.y || String(left.uid).localeCompare(String(right.uid));
    });
    return decorations[decorations.length - 1] || null;
  }

  /** @param {string} npcId */
  challengeNpc(npcId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const visit = this._visit;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!visit) return this._failure(SecretBaseResults.NO_VISIT);
    const npc = visit.data.npcs.find((entry) => entry.id === npcId);
    if (!npc) return this._failure(SecretBaseResults.INVALID_NPC);
    if (!npc.team?.length) return this._failure(SecretBaseResults.NPC_TEAM_REQUIRED);
    const started = BattleSystem.getInstance().startSecretBaseNpcBattle(
      clone(npc), visit.id, visit.locationId || LocationSystem.getInstance().getCurrentLocationId()
    );
    return started ? { ok: true } : this._failure(SecretBaseResults.BATTLE_ACTIVE);
  }

  /** @returns {Object|null} */
  getPcViewModel() {
    const visit = this._visit;
    if (!visit) return null;
    const save = SaveSystem.getInstance().getCurrentSave();
    const flags = save?.secretBase?.flags;
    const count = Math.max(0, Number(flags?.count) || 0);
    const rank = SecretBaseRules.FLAG_RANKS.reduce((current, candidate) => count >= candidate.threshold ? candidate : current,
      SecretBaseRules.FLAG_RANKS[0]);
    const next = SecretBaseRules.FLAG_RANKS.find((candidate) => candidate.threshold > count) || null;
    const baseId = visit.meta.id;
    const lastTime = Number(flags?.collectedIds?.[baseId] || 0);
    const remainingMs = Math.max(0, SecretBaseRules.FLAG_COOLDOWN_MS - (Date.now() - lastTime));
    const onCooldown = !visit.own && lastTime > 0 && remainingMs > 0;
    return {
      own: visit.own,
      name: visit.meta.name,
      baseId,
      message: visit.data.pcMessage,
      record: clone(visit.data.record),
      flagCount: count,
      uniqueBases: Object.keys(flags?.collectedIds || {}).length,
      rankId: rank.id,
      rankLabelKey: `flag.rank.${rank.id}`,
      nextRankId: next?.id || null,
      nextThreshold: next?.threshold || null,
      progress: next
        ? Math.max(0, Math.min(100, Math.floor(((count - rank.threshold) / Math.max(1, next.threshold - rank.threshold)) * 100)))
        : 100,
      canCollect: !visit.own && !onCooldown,
      onCooldown,
      remainingHours: onCooldown ? Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000))) : 0
    };
  }

  /** Collects the current visitor's one-per-base-per-24-hour flag. */
  collectFlag() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const visit = this._visit;
    if (!save) return this._failure(SecretBaseResults.NO_SAVE);
    if (!this.isUnlocked(save)) return this._failure(SecretBaseResults.LOCKED);
    if (!visit) return this._failure(SecretBaseResults.NO_VISIT);
    if (visit.own || (visit.meta.ownerId && visit.meta.ownerId === save.id)) return this._failure(SecretBaseResults.FLAG_OWN);
    const flags = save.secretBase.flags;
    const now = Date.now();
    const previousTime = Number(flags.collectedIds[visit.meta.id] || 0);
    const remainingMs = Math.max(0, SecretBaseRules.FLAG_COOLDOWN_MS - (now - previousTime));
    if (previousTime > 0 && remainingMs > 0) {
      return this._failure(SecretBaseResults.FLAG_COOLDOWN, {
        remainingHours: Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)))
      });
    }
    const oldRank = this._flagRank(flags.count).id;
    flags.collectedIds[visit.meta.id] = now;
    flags.count = Math.max(0, Number(flags.count) || 0) + 1;
    const newRank = this._flagRank(flags.count);
    if (newRank.id !== oldRank) flags.lastRankNotified = newRank.id;
    SaveSystem.getInstance().saveCurrent();
    this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.FLAG_COLLECTED);
    this._notify('flag.collected', { count: flags.count }, NotificationTones.SUCCESS);
    if (newRank.id !== oldRank) {
      this._notify('flag.rank_up', { rank: t(`flag.rank.${newRank.id}`) }, NotificationTones.ACCENT);
    }
    return { ok: true, count: flags.count, rankId: newRank.id };
  }

  /** @param {number} count @returns {Object} */
  _flagRank(count) {
    let rank = SecretBaseRules.FLAG_RANKS[0];
    for (const candidate of SecretBaseRules.FLAG_RANKS) if (count >= candidate.threshold) rank = candidate;
    return rank;
  }

  /** @private @param {Object} event */
  _onBattleResolved(event) {
    const visit = this._visit;
    if (!visit || event.visitId !== visit.id) return;
    if (event.visitorWon) {
      visit.battlesWon++;
      visit.data.record.losses++;
    } else {
      visit.battlesLost++;
      visit.data.record.wins++;
    }
    if (visit.source === 'own') {
      const save = SaveSystem.getInstance().getCurrentSave();
      if (save?.secretBase?.isEstablished?.()) {
        save.secretBase.record.losses = visit.data.record.losses;
        save.secretBase.record.wins = visit.data.record.wins;
      }
      this._emitBaseChanged(SecretBaseRules.CHANGE_REASONS.VISIT_BATTLE);
    }
    const npc = event.npc || {};
    const quote = event.visitorWon ? npc.messages?.lose : npc.messages?.win;
    this._notify(event.visitorWon ? 'edit.battle_won' : 'edit.battle_lost', {
      name: npc.name || '',
      quote: quote || ''
    }, event.visitorWon ? NotificationTones.SUCCESS : NotificationTones.WARNING);
    this._emitVisitChanged('battle-resolved');
  }

  /** @private @param {string} reason */
  _emitBaseChanged(reason) {
    const base = this.getBase();
    EventBus.getInstance().dispatch(new SecretBaseChangedEvent(reason, base ? clone(base.serialize()) : null));
  }

  /** @private @param {string} reason */
  _emitVisitChanged(reason) {
    EventBus.getInstance().dispatch(new SecretBaseVisitChangedEvent(reason, this.getVisitSnapshot()));
  }

  /** @private @param {string} key @param {Object} params @param {string} [tone] */
  _notify(key, params = {}, tone = NotificationTones.INFO) {
    const message = t(key, params);
    if (!message || message === key) return;
    NotificationSystem.getInstance().notifyTemporary(message, {
      channel: NotificationChannels.GAMEPLAY,
      tone
    });
  }

  /** @private @param {string} key @param {Object} [params={}] */
  _failure(key, params = {}) {
    const resultKey = this._resultKey(key);
    if (resultKey) this._notify(resultKey, params, NotificationTones.WARNING);
    return { ok: false, reason: key, ...params };
  }

  /** @private @param {string} result @returns {string|null} */
  _resultKey(result) {
    return ({
      [SecretBaseResults.NO_SAVE]: 'no_save_loaded',
      [SecretBaseResults.LOCKED]: 'content_feature_locked',
      [SecretBaseResults.WRONG_REGION]: 'err.wrong_region',
      [SecretBaseResults.INVALID_LOCATION]: 'err.location',
      [SecretBaseResults.INVALID_LAYOUT]: 'err.import_layout',
      [SecretBaseResults.BASE_EXISTS]: 'err.already_established',
      [SecretBaseResults.NO_BASE]: 'err.no_base',
      [SecretBaseResults.WRONG_LOCATION]: 'err.wrong_location',
      [SecretBaseResults.INVALID_ITEM]: 'err.unknown',
      [SecretBaseResults.NOT_IN_STOCK]: 'err.not_in_stock',
      [SecretBaseResults.INVALID_NPC]: 'err.unknown',
      [SecretBaseResults.NPC_TEAM_REQUIRED]: 'err.npc_team',
      [SecretBaseResults.VISIT_ACTIVE]: 'err.visit_active',
      [SecretBaseResults.NO_VISIT]: 'err.no_visit',
      [SecretBaseResults.FLAG_OWN]: 'flag.own',
      [SecretBaseResults.FLAG_COOLDOWN]: 'flag.cooldown',
      [SecretBaseResults.BATTLE_ACTIVE]: 'err.battle_active',
      [SecretBaseResults.DEBUG_ONLY]: 'err.debug_only'
    })[result] || (typeof result === 'string' && result.startsWith('err.') ? result : null);
  }
}


/** @param {string} id @returns {boolean} */
function isValidSpecies(id) {
  return !!id && PokemonDB.getInstance().has(id);
}

/** @param {string} id @returns {boolean} */
function isValidMove(id) {
  return MoveDB.getInstance().has(id);
}

/** @param {string} id @returns {boolean} */
function isValidTalent(id) {
  return !!id && TalentDB.getInstance().has(id);
}

/** @param {string} id @returns {boolean} */
function isValidHeldItem(id) {
  if (!id) return false;
  const item = ITEMS().getById(id);
  return !!item && item.kind === ItemKinds.HELD;
}

/** @param {number} dex @returns {string} */
function PokemonDexSpecies(dex) {
  return PokemonDB.getInstance().getByDex(dex)?.id || '';
}
