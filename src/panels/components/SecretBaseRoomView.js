/**
 * @file SecretBaseRoomView.js
 * @brief Pixel-art 2D room renderer used by the editor and interactive visitor.
 * Rendering lives in a UI widget; SecretBaseSystem remains DOM-free.
 */
import { UIElement } from '../../ui/UIElement.js';
import { SecretBaseItemDB } from '../../data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../../data/base/SecretBaseLayoutDB.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { t } from '../../localization/LocalizationManager.js';

const TILE = 16;
const IMAGE_CACHE = new Map();

/** @param {string} src @returns {HTMLImageElement|null} */
function loadImage(src) {
  if (IMAGE_CACHE.has(src)) return IMAGE_CACHE.get(src);
  if (typeof Image !== 'function') return null;
  const image = new Image();
  IMAGE_CACHE.set(src, image);
  image.onload = () => {
    for (const view of SecretBaseRoomView._instances) view._draw();
  };
  image.onerror = () => IMAGE_CACHE.set(src, null);
  image.src = src;
  return image;
}

/** @param {HTMLImageElement|null} image @returns {boolean} */
function ready(image) {
  return !!image && image.complete && image.naturalWidth > 0;
}

export class SecretBaseRoomView extends UIElement {
  /** @type {Set<SecretBaseRoomView>} */
  static _instances = new Set();

  /** @param {{onCellClick?:(x:number,y:number,event:MouseEvent)=>void,className?:string}} [options] */
  constructor(options = {}) {
    super({ tagName: 'canvas', className: `pw-secret-base-room ${options.className || ''}`.trim(), name: 'SecretBaseRoomView' });
    this._onCellClick = options.onCellClick || null;
    this._view = null;
    this._dom.setAttribute('role', 'img');
    this._dom.setAttribute('aria-label', t('win.title'));
    this._dom.setAttribute('tabindex', '0');
    this.addDomListener('click', (event) => this._handleClick(event));
    SecretBaseRoomView._instances.add(this);
  }

  /** @param {(x:number,y:number,event:MouseEvent)=>void} callback */
  setOnCellClick(callback) {
    this._onCellClick = callback;
  }

  /**
   * @param {Object|null} data SecretBaseData serialization or visit snapshot.data
   * @param {{mode?:'edit'|'visit',position?:Object|null,path?:Object[],playerSprite?:string,selectedUid?:string|number|null,selectedNpcId?:string|null}} [options]
   */
  setView(data, options = {}) {
    this._view = data ? {
      data,
      mode: options.mode || 'visit',
      position: options.position || null,
      path: Array.isArray(options.path) ? options.path : [],
      playerSprite: options.playerSprite || 'trainer-0',
      selectedUid: options.selectedUid ?? null,
      selectedNpcId: options.selectedNpcId ?? null
    } : null;
    const layout = this._view ? SecretBaseLayoutDB.getInstance().getById(data.layoutId) : null;
    if (!layout) {
      this._dom.width = TILE * 8;
      this._dom.height = TILE * 6;
      this._dom.setAttribute('aria-label', t('win.not_established'));
    } else {
      this._dom.width = layout.width * TILE + 8;
      this._dom.height = layout.height * TILE + 8;
      this._dom.setAttribute('aria-label', t(`win.layout.${layout.id}`));
      loadImage(AssetPaths.secretBaseBackground(layout.id));
      for (const decoration of data.decorations || []) {
        loadImage(AssetPaths.secretBaseDecoration(decoration.itemId));
      }
      for (const npc of data.npcs || []) loadImage(AssetPaths.trainerSprite(npc.sprite));
      loadImage(AssetPaths.trainerSprite(this._view.playerSprite));
    }
    this._draw();
  }

  /** @private @param {MouseEvent} event */
  _handleClick(event) {
    if (!this._view || !this._onCellClick) return;
    const bounds = this._dom.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * this._dom.width / TILE);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * this._dom.height / TILE);
    const layout = SecretBaseLayoutDB.getInstance().getById(this._view.data.layoutId);
    if (!layout || x < 0 || y < 0 || x >= layout.width || y >= layout.height) return;
    this._onCellClick(x, y, event);
  }

  /** @private */
  _draw() {
    const ctx = this._dom.getContext?.('2d');
    if (!ctx) return;
    const width = this._dom.width;
    const height = this._dom.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    const view = this._view;
    const layout = view ? SecretBaseLayoutDB.getInstance().getById(view.data.layoutId) : null;
    if (!view || !layout) {
      ctx.fillStyle = '#171b1f';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const ox = 4;
    const oy = 4;
    const background = loadImage(AssetPaths.secretBaseBackground(layout.id));
    if (ready(background)) {
      ctx.drawImage(background, ox, oy, layout.width * TILE, layout.height * TILE);
    } else {
      this._drawFallback(ctx, layout, ox, oy);
    }

    const items = SecretBaseItemDB.getInstance();
    const draws = [];
    for (const decoration of view.data.decorations || []) {
      const item = items.getById(decoration.itemId);
      if (!item) continue;
      const footprint = items.getFootprint(item);
      const layer = item.layer === 'wall' ? -100 : item.layer === 'surface' ? 2 : 0;
      draws.push({ z: item.layer === 'wall' ? -100 : (decoration.y + footprint.depth - 1) * 10 + layer, kind: 'decoration', decoration, item, footprint });
    }
    for (const npc of view.data.npcs || []) {
      if (!Number.isInteger(npc.x) || !Number.isInteger(npc.y)) continue;
      draws.push({ z: npc.y * 10 + 5, kind: 'npc', npc });
    }
    if (view.position) draws.push({ z: view.position.y * 10 + 5, kind: 'player', position: view.position });
    draws.sort((left, right) => left.z - right.z);

    for (const entry of draws) {
      if (entry.kind === 'decoration') this._drawDecoration(ctx, entry, ox, oy, items);
      else if (entry.kind === 'npc') {
        this._drawPerson(ctx, entry.npc.x, entry.npc.y, entry.npc.sprite, ox, oy, '#3074b8');
        if (String(view.selectedNpcId) === String(entry.npc.id)) {
          ctx.strokeStyle = '#fff27a';
          ctx.lineWidth = 1;
          ctx.strokeRect(ox + entry.npc.x * TILE + 1, oy + entry.npc.y * TILE + 1, TILE - 2, TILE - 2);
        }
      } else this._drawPerson(ctx, entry.position.x, entry.position.y, view.playerSprite, ox, oy, '#b82f32');
    }

    if (view.mode === 'visit') {
      ctx.fillStyle = 'rgba(255,238,140,.9)';
      for (const step of view.path) {
        ctx.beginPath();
        ctx.arc(ox + step.x * TILE + TILE / 2, oy + step.y * TILE + TILE / 2 + 4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {Object} layout @param {number} ox @param {number} oy */
  _drawFallback(ctx, layout, ox, oy) {
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        const cell = layout.cells[y]?.[x];
        const px = ox + x * TILE;
        const py = oy + y * TILE;
        if (!cell || cell.type === 'void') continue;
        ctx.fillStyle = cell.type === 'wall' ? '#483b32'
          : cell.type === 'cliff' ? '#786246'
            : cell.type === 'hole' ? '#18151c'
              : cell.elevation ? '#8b7854' : '#776548';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(24,18,14,.28)';
        ctx.strokeRect(px + .5, py + .5, TILE - 1, TILE - 1);
        if (cell.entrance) {
          ctx.fillStyle = '#f2d990';
          ctx.fillRect(px + 6, py + 11, 4, 3);
        }
      }
    }
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {Object} entry @param {number} ox @param {number} oy @param {SecretBaseItemDB} items */
  _drawDecoration(ctx, entry, ox, oy, items) {
    const { decoration, item, footprint } = entry;
    const x = ox + decoration.x * TILE;
    const y = oy + decoration.y * TILE;
    const boxWidth = footprint.width * TILE;
    const boxHeight = footprint.depth * TILE;
    const image = loadImage(AssetPaths.secretBaseDecoration(decoration.itemId));
    if (ready(image)) {
      const drawWidth = image.naturalWidth;
      const drawHeight = image.naturalHeight;
      const dx = item.layer === 'wall' ? x + (boxWidth - drawWidth) / 2 : x + (boxWidth - drawWidth) / 2;
      const dy = item.layer === 'wall' ? y + (TILE - drawHeight) / 2 : y + boxHeight - drawHeight;
      ctx.drawImage(image, Math.round(dx), Math.round(dy));
    } else {
      ctx.fillStyle = '#c78c41';
      ctx.fillRect(x + 3, y + 3, Math.max(6, boxWidth - 6), Math.max(6, boxHeight - 6));
    }
    const selected = String(this._view?.selectedUid) === String(decoration.uid);
    if (selected) {
      ctx.strokeStyle = '#fff27a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y + .5, boxWidth - 1, boxHeight - 1);
    }
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {string} sprite @param {number} ox @param {number} oy @param {string} fallbackColor */
  _drawPerson(ctx, x, y, sprite, ox, oy, fallbackColor) {
    const px = ox + x * TILE;
    const py = oy + y * TILE;
    const image = loadImage(AssetPaths.trainerSprite(sprite));
    if (ready(image)) {
      ctx.drawImage(image, Math.round(px + (TILE - image.naturalWidth) / 2), Math.round(py + TILE - image.naturalHeight));
      return;
    }
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + 5, py + TILE / 2, 6, 7);
  }

  /** @override */
  onDestroy() {
    SecretBaseRoomView._instances.delete(this);
    super.onDestroy();
  }
}
