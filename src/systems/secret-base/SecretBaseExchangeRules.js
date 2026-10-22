/**
 * @file SecretBaseExchangeRules.js
 * @brief Pure, bounded secret-base import/export rules; imported files are visit-only.
 */
import { SecretBaseRules } from '../../config/SecretBaseRules.js';
import { SecretBaseData } from '../../data/save/SecretBaseData.js';
import { SecretBaseItemDB } from '../../data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../../data/base/SecretBaseLayoutDB.js';
import { SecretBasePlacementRules } from './SecretBasePlacementRules.js';

const ITEMS = () => SecretBaseItemDB.getInstance();
const LAYOUTS = () => SecretBaseLayoutDB.getInstance();

/** @param {*} value @param {number} max @returns {string} */
function cleanText(value, max) {
  return String(value ?? '').replace(/[<>`"\\]/g, '').slice(0, max);
}

/** @param {string} value @returns {number} */
function utf8ByteLength(value) {
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(value).length;
  return value.length;
}

/** @param {*} value @param {number} maximum @returns {number} */
function boundedCount(value, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, Math.floor(parsed))) : 0;
}

export class SecretBaseExchangeRules {
  /**
   * Builds the portable snapshot. Inventory, NPC stock, and flag ownership are deliberately omitted.
   * @param {SecretBaseData|Object} data
   * @param {{id:string|null,name:string}} owner
   * @param {string} exportId
   * @param {string} exportedAt
   * @returns {Object|null}
   */
  static buildExport(data, owner, exportId, exportedAt = new Date().toISOString()) {
    if (!data?.layoutId || !LAYOUTS().has(data.layoutId)) return null;
    const serial = typeof data.serialize === 'function' ? data.serialize() : data;
    return {
      kind: SecretBaseRules.EXCHANGE_KIND,
      v: SecretBaseRules.EXCHANGE_VERSION,
      id: cleanText(exportId, 64),
      ownerId: cleanText(owner?.id, 64) || null,
      name: cleanText(owner?.name, SecretBaseRules.MAX_NPC_NAME_LENGTH),
      exportedAt,
      layoutId: data.layoutId,
      spawn: serial.spawn ? { x: serial.spawn.x, y: serial.spawn.y } : null,
      items: (serial.decorations || [])
        .filter((entry) => ITEMS().has(entry.itemId))
        .map((entry) => ({ s: entry.itemId, x: entry.x, y: entry.y, rot: 0 })),
      npcs: (serial.npcs || []).map((npc) => ({
        name: cleanText(npc.name, SecretBaseRules.MAX_NPC_NAME_LENGTH),
        sprite: SecretBaseRules.NPC_SPRITES.includes(npc.sprite) ? npc.sprite : SecretBaseRules.DEFAULT_NPC_SPRITE,
        team: (npc.team || []).slice(0, SecretBaseRules.MAX_NPC_TEAM).map((pokemon) => ({
          ...(pokemon.species ? { species: pokemon.species } : {}),
          ...(pokemon.legacyDexId ? { id: pokemon.legacyDexId } : {}),
          level: pokemon.level,
          moves: [...(pokemon.moves || [])],
          talent: pokemon.talent || null,
          shiny: pokemon.shiny === true,
          ...(pokemon.heldItem ? { item: pokemon.heldItem } : {})
        })),
        msgs: {
          pre: cleanText(npc.messages?.pre, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH),
          win: cleanText(npc.messages?.win, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH),
          lose: cleanText(npc.messages?.lose, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH)
        },
        x: npc.x,
        y: npc.y
      })),
      record: {
        w: boundedCount(serial.record?.wins, Number.MAX_SAFE_INTEGER),
        l: boundedCount(serial.record?.losses, Number.MAX_SAFE_INTEGER),
        visits: boundedCount(serial.record?.visits, Number.MAX_SAFE_INTEGER)
      }
    };
  }

  /** @param {Object} data @returns {string|null} */
  static serializeExport(data) {
    const text = JSON.stringify(data, null, 1);
    return utf8ByteLength(text) <= SecretBaseRules.MAX_EXCHANGE_BYTES ? text : null;
  }

  /**
   * Validates and reconstructs a temporary base snapshot. This never mutates or grants anything to a save.
   * Unsupported or illegal items/NPC positions are dropped, as in the reference importer.
   * @param {string} text
   * @returns {{ok:boolean,reason?:string,data?:SecretBaseData,meta?:Object,droppedItems?:number}}
   */
  static validateImport(text) {
    if (typeof text !== 'string' || !text.length) return { ok: false, reason: 'err.import_empty' };
    if (utf8ByteLength(text) > SecretBaseRules.MAX_EXCHANGE_BYTES) return { ok: false, reason: 'err.import_too_big' };
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'err.import_json' };
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.kind !== SecretBaseRules.EXCHANGE_KIND) {
      return { ok: false, reason: 'err.import_kind' };
    }
    if (raw.v !== SecretBaseRules.EXCHANGE_VERSION) return { ok: false, reason: 'err.import_version' };
    if (!LAYOUTS().has(raw.layoutId)) return { ok: false, reason: 'err.import_layout' };
    if (!Array.isArray(raw.items) || raw.items.length > SecretBaseRules.MAX_EXCHANGE_ITEMS) {
      return { ok: false, reason: 'err.import_items' };
    }
    if (!Array.isArray(raw.npcs) || raw.npcs.length > SecretBaseRules.MAX_EXCHANGE_NPCS) {
      return { ok: false, reason: 'err.import_npcs' };
    }

    const state = new SecretBaseData({ layoutId: raw.layoutId, decorations: [], npcs: [], npcStock: [], stock: {}, spawn: null });
    let droppedItems = 0;
    for (const rawItem of raw.items) {
      const itemId = typeof rawItem?.s === 'string' ? rawItem.s.trim().toLowerCase() : '';
      if (!ITEMS().has(itemId)) {
        droppedItems++;
        continue;
      }
      const x = Number(rawItem.x);
      const y = Number(rawItem.y);
      const result = SecretBasePlacementRules.canPlaceDecoration(state, itemId, x, y);
      if (!result.ok) {
        droppedItems++;
        continue;
      }
      state.decorations.push({ uid: state.nextUid++, itemId, x: result.x, y: result.y, rotation: 0 });
    }

    for (const [index, rawNpc] of raw.npcs.entries()) {
      if (!rawNpc || !Array.isArray(rawNpc.team) || rawNpc.team.length === 0 || rawNpc.team.length > SecretBaseRules.MAX_NPC_TEAM) continue;
      const id = `import-npc-${index + 1}`;
      const parsedNpc = new SecretBaseData({ npcs: [{ ...rawNpc, id }] }).npcs[0];
      if (!parsedNpc?.team?.length) continue;
      const x = Number(rawNpc.x);
      const y = Number(rawNpc.y);
      const result = SecretBasePlacementRules.canPlaceNpc(state, parsedNpc, x, y);
      if (!result.ok) continue;
      state.npcs.push({ ...parsedNpc, x, y });
    }

    const record = raw.record && typeof raw.record === 'object' ? raw.record : {};
    state.record = {
      wins: boundedCount(record.w, Number.MAX_SAFE_INTEGER),
      losses: boundedCount(record.l, Number.MAX_SAFE_INTEGER),
      visits: boundedCount(record.visits, Number.MAX_SAFE_INTEGER)
    };
    state.pcMessage = cleanText(raw.pcMessage, SecretBaseRules.MAX_PC_MESSAGE_LENGTH);

    const meta = {
      id: cleanText(raw.id, 64) || null,
      ownerId: cleanText(raw.ownerId, 64) || null,
      name: cleanText(raw.name, SecretBaseRules.MAX_NPC_NAME_LENGTH),
      record: { ...state.record }
    };
    return { ok: true, data: state, meta, droppedItems };
  }
}
