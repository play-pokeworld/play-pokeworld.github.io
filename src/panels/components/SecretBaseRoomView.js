/**
 * @file SecretBaseRoomView.js
 * @brief Pixel-art 2D room renderer used by the editor and interactive visitor.
 * Renders 32px GBA native tiles (2x scaled), baked Emerald backgrounds, contact shadows, and overlays.
 */
import { UIElement } from '../../ui/UIElement.js';
import { SecretBaseItemDB } from '../../data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../../data/base/SecretBaseLayoutDB.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { t } from '../../localization/LocalizationManager.js';

const TILE = 32;
const SHADOW_CATEGORIES = new Set(['desks', 'chairs', 'plants', 'objects']);
const SHADOW_SKIP_ITEMS = new Set(['solid_board', 'stairs']);
const IMAGE_CACHE = new Map();

/** @param {string} src @returns {HTMLImageElement|null} */
function loadImage(src) {
  if (!src) return null;
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

  /**
   * @param {Object} [options]
   * @param {(x:number,y:number,event:MouseEvent)=>void} [options.onCellClick]
   * @param {(x:number,y:number)=>void} [options.onCellHover]
   * @param {()=>void} [options.onCellLeave]
   * @param {string} [options.className]
   * @param {string} [options.id]
   */
  constructor(options = {}) {
    super({
      tagName: 'canvas',
      id: options.id || 'base-canvas-2d',
      className: `pw-secret-base-room ${options.className || ''}`.trim(),
      name: 'SecretBaseRoomView'
    });
    this._onCellClick = options.onCellClick || null;
    this._onCellHover = options.onCellHover || null;
    this._onCellLeave = options.onCellLeave || null;
    this._view = null;
    this._dom.setAttribute('role', 'img');
    this._dom.setAttribute('aria-label', t('win.title'));
    this._dom.setAttribute('tabindex', '0');

    this.addDomListener('click', (event) => this._handleClick(event));
    this.addDomListener('mousemove', (event) => this._handleMouseMove(event));
    this.addDomListener('mouseleave', () => this._handleMouseLeave());
    SecretBaseRoomView._instances.add(this);
  }

  /** @param {(x:number,y:number,event:MouseEvent)=>void} callback */
  setOnCellClick(callback) {
    this._onCellClick = callback;
  }

  /** @param {(x:number,y:number)=>void} callback */
  setOnCellHover(callback) {
    this._onCellHover = callback;
  }

  /** @param {()=>void} callback */
  setOnCellLeave(callback) {
    this._onCellLeave = callback;
  }

  /**
   * @param {Object|null} data SecretBaseData serialization or visit snapshot.data
   * @param {Object} [options]
   */
  setView(data, options = {}) {
    this._view = data ? {
      data,
      mode: options.mode || 'visit',
      position: options.position || null,
      path: Array.isArray(options.path) ? options.path : [],
      playerSprite: options.playerSprite || 'trainer-0',
      selectedUid: options.selectedUid ?? null,
      selectedNpcId: options.selectedNpcId ?? null,
      ghost: options.ghost || null,
      hover: options.hover || null
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
      for (const npc of data.npcs || []) {
        loadImage(AssetPaths.trainerSprite(npc.sprite));
      }
      loadImage(AssetPaths.trainerSprite(this._view.playerSprite));
      if (this._view.ghost?.itemId) {
        loadImage(AssetPaths.secretBaseDecoration(this._view.ghost.itemId));
      }
    }
    this._draw();
  }

  /**
   * Updates only transient overlay parameters and triggers a repaint.
   * @param {{ghost?: Object|null, hover?: Object|null, path?: Object[], position?: Object|null, selectedUid?: any, selectedNpcId?: any}} patch
   */
  updateOverlay(patch = {}) {
    if (!this._view) return;
    if ('ghost' in patch) this._view.ghost = patch.ghost;
    if ('hover' in patch) this._view.hover = patch.hover;
    if ('path' in patch) this._view.path = patch.path;
    if ('position' in patch) this._view.position = patch.position;
    if ('selectedUid' in patch) this._view.selectedUid = patch.selectedUid;
    if ('selectedNpcId' in patch) this._view.selectedNpcId = patch.selectedNpcId;
    this._draw();
  }

  /** @private @param {MouseEvent} event @returns {{x:number,y:number}|null} */
  _getCellFromEvent(event) {
    if (!this._view) return null;
    const bounds = this._dom.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const ox = 4;
    const oy = 4;
    const scaleX = this._dom.width / bounds.width;
    const scaleY = this._dom.height / bounds.height;
    const canvasX = (event.clientX - bounds.left) * scaleX - ox;
    const canvasY = (event.clientY - bounds.top) * scaleY - oy;
    const x = Math.floor(canvasX / TILE);
    const y = Math.floor(canvasY / TILE);
    const layout = SecretBaseLayoutDB.getInstance().getById(this._view.data.layoutId);
    if (!layout || x < 0 || y < 0 || x >= layout.width || y >= layout.height) return null;
    return { x, y };
  }

  /** @private @param {MouseEvent} event */
  _handleClick(event) {
    const cell = this._getCellFromEvent(event);
    if (cell && this._onCellClick) {
      this._onCellClick(cell.x, cell.y, event);
    }
  }

  /** @private @param {MouseEvent} event */
  _handleMouseMove(event) {
    const cell = this._getCellFromEvent(event);
    if (cell && this._onCellHover) {
      this._onCellHover(cell.x, cell.y);
    }
  }

  /** @private */
  _handleMouseLeave() {
    if (this._onCellLeave) {
      this._onCellLeave();
    }
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

    // Helper: calculate carrier foot row for surface items (dolls/cushions)
    const carrierFootRow = (x, y) => {
      let row = y;
      for (const decoration of view.data.decorations || []) {
        const item = items.getById(decoration.itemId);
        if (!item || item.layer !== 'floor') continue;
        if (!item.surface && !item.walkable) continue;
        const fp = items.getFootprint(item);
        if (x >= decoration.x && x < decoration.x + fp.width && y >= decoration.y && y < decoration.y + fp.depth) {
          row = Math.max(row, decoration.y + fp.depth - 1);
        }
      }
      return row;
    };

    for (const decoration of view.data.decorations || []) {
      const item = items.getById(decoration.itemId);
      if (!item) continue;
      const footprint = items.getFootprint(item);
      if (item.layer === 'wall') {
        draws.push({ z: -100, kind: 'decoration', decoration, item, footprint });
        continue;
      }
      const foot = item.layer === 'surface'
        ? carrierFootRow(decoration.x, decoration.y)
        : decoration.y + footprint.depth - 1;
      const layerOffset = item.layer === 'surface' ? 1 : 0;
      draws.push({ z: foot * 10 + layerOffset, kind: 'decoration', decoration, item, footprint });
    }

    for (const npc of view.data.npcs || []) {
      if (!Number.isInteger(npc.x) || !Number.isInteger(npc.y)) continue;
      draws.push({ z: npc.y * 10 + 2, kind: 'npc', npc });
    }

    if (view.position) {
      draws.push({ z: view.position.y * 10 + 2, kind: 'player', position: view.position });
    }

    draws.sort((left, right) => left.z - right.z);

    for (const entry of draws) {
      if (entry.kind === 'decoration') {
        this._drawDecoration(ctx, entry, ox, oy);
      } else if (entry.kind === 'npc') {
        this._drawPerson(ctx, entry.npc.x, entry.npc.y, entry.npc.sprite, ox, oy, '#3074b8');
        if (String(view.selectedNpcId) === String(entry.npc.id)) {
          this._drawSelectionBox(ctx, ox + entry.npc.x * TILE, oy + entry.npc.y * TILE, TILE, TILE);
        }
      } else {
        this._drawPerson(ctx, entry.position.x, entry.position.y, view.playerSprite, ox, oy, '#b82f32');
      }
    }

    // Overlays: ghost, selection, hover, and visitor path
    this._drawOverlays(ctx, ox, oy, view);
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
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (cell.entrance) {
          ctx.fillStyle = '#f2d990';
          ctx.beginPath();
          ctx.moveTo(px + TILE / 2, py + TILE - 6);
          ctx.lineTo(px + TILE / 2 - 6, py + TILE - 14);
          ctx.lineTo(px + TILE / 2 + 6, py + TILE - 14);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {Object} entry @param {number} ox @param {number} oy */
  _drawDecoration(ctx, entry, ox, oy) {
    const { decoration, item, footprint } = entry;
    const x = ox + decoration.x * TILE;
    const y = oy + decoration.y * TILE;
    const boxWidth = footprint.width * TILE;
    const boxHeight = footprint.depth * TILE;

    // Contact shadow under floor furniture
    if (item.layer !== 'wall' && SHADOW_CATEGORIES.has(item.category) && !SHADOW_SKIP_ITEMS.has(decoration.itemId)) {
      ctx.beginPath();
      ctx.ellipse(
        x + boxWidth / 2,
        y + boxHeight - Math.max(2, TILE * 0.1),
        Math.min(boxWidth * 0.46, TILE * 0.9),
        Math.max(2.5, TILE * 0.13),
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(20, 12, 6, 0.30)';
      ctx.fill();
    }

    const image = loadImage(AssetPaths.secretBaseDecoration(decoration.itemId));
    if (ready(image)) {
      const k = 2; // GBA 16px to 32px
      const dw = image.naturalWidth * k;
      const dh = image.naturalHeight * k;
      const dx = item.layer === 'wall' ? x + (boxWidth - dw) / 2 : x + (boxWidth - dw) / 2;
      const dy = item.layer === 'wall' ? y + (TILE - dh) / 2 : y + boxHeight - dh;
      ctx.drawImage(image, Math.round(dx), Math.round(dy), dw, dh);
    } else {
      ctx.fillStyle = '#8a5fbf';
      ctx.fillRect(x + 4, y + 4, boxWidth - 8, boxHeight - 8);
    }

    const selected = String(this._view?.selectedUid) === String(decoration.uid);
    if (selected) {
      this._drawSelectionBox(ctx, x, y, boxWidth, boxHeight);
    }
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} h */
  _drawSelectionBox(ctx, x, y, w, h) {
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x - 1, y - 1, 5, 5);
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {string} sprite @param {number} ox @param {number} oy @param {string} fallbackColor */
  _drawPerson(ctx, x, y, sprite, ox, oy, fallbackColor) {
    const px = ox + x * TILE;
    const py = oy + y * TILE;
    const image = loadImage(AssetPaths.trainerSprite(sprite));
    if (ready(image)) {
      const h = Math.round(TILE * 1.3);
      const w = Math.round(image.naturalWidth * (h / image.naturalHeight));
      ctx.drawImage(image, Math.round(px + (TILE - w) / 2), Math.round(py + TILE - h), w, h);
      return;
    }
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2 - 4, TILE / 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2 - 3, TILE / 6.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(px + TILE / 2 - TILE / 4, py + TILE / 2 + 2, TILE / 2, TILE / 3.4);
  }

  /** @private @param {CanvasRenderingContext2D} ctx @param {number} ox @param {number} oy @param {Object} view */
  _drawOverlays(ctx, ox, oy, view) {
    // 1. Placement ghost
    const gh = view.ghost;
    if (gh) {
      const gx = ox + gh.x * TILE;
      const gy = oy + gh.y * TILE;
      const gw = gh.w * TILE;
      const gd = gh.d * TILE;

      ctx.fillStyle = gh.ok ? 'rgba(105, 220, 120, 0.30)' : 'rgba(244, 67, 54, 0.32)';
      ctx.fillRect(gx, gy, gw, gd);
      ctx.strokeStyle = gh.ok ? '#69dc78' : '#f44336';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + 1, gy + 1, gw - 2, gd - 2);

      if (gh.itemId) {
        const image = loadImage(AssetPaths.secretBaseDecoration(gh.itemId));
        if (ready(image)) {
          const k = 2;
          const dw = image.naturalWidth * k;
          const dh = image.naturalHeight * k;
          ctx.save();
          ctx.globalAlpha = 0.62;
          ctx.drawImage(image, Math.round(gx + (gw - dw) / 2), Math.round(gy + gd - dh), dw, dh);
          ctx.restore();
        }
      } else if (gh.isNpc) {
        ctx.save();
        ctx.globalAlpha = 0.62;
        this._drawPerson(ctx, gh.x, gh.y, 'trainer-0', ox, oy, '#3074b8');
        ctx.restore();
      }
    }

    // 2. Hover outline (when no ghost is displayed)
    if (!gh && view.hover) {
      const hx = ox + view.hover.x * TILE;
      const hy = oy + view.hover.y * TILE;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx + 0.5, hy + 0.5, TILE - 1, TILE - 1);
    }

    // 3. Visitor path (pale yellow dots)
    if (view.mode === 'visit' && view.path?.length) {
      ctx.fillStyle = 'rgba(255, 238, 140, 0.9)';
      for (const step of view.path) {
        ctx.beginPath();
        ctx.arc(ox + step.x * TILE + TILE / 2, oy + step.y * TILE + TILE / 2 + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** @override */
  onDestroy() {
    SecretBaseRoomView._instances.delete(this);
    super.onDestroy();
  }
}
