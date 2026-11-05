/**
 * @file UIMapView.js
 * @brief Interactive SVG world map (C++ equivalent: class UIMapView : public UIElement).
 * Renders a background picture and one node per location (rounded zone + name pill).
 * Travel states and semantic legend colors are CSS concerns; they are carried separately as
 * `.loc-node.<state>.map-color-<status>` (see ui-map-view.css).
 */

import { UIElement } from './UIElement.js';
import { UIContainer } from './UIContainer.js';
import { UIButton } from './UIButton.js';
import { t } from '../localization/LocalizationManager.js';
import { MapInteractionRules } from '../config/MapInteractionRules.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Approximate label metrics (SVG units) used to size the name pill. */
const LABEL_CHAR_WIDTH = 7;
const LABEL_PADDING = 14;
const LABEL_MIN_WIDTH = 38;
const LABEL_HEIGHT = 18;
const NODE_RADIUS = 9;
const CURRENT_RING_MARGIN = 6;

/**
 * @typedef {Object} MapNode
 * @property {string} id
 * @property {number} x      - Center x in canvas units
 * @property {number} y      - Center y in canvas units
 * @property {number} w
 * @property {number} h
 * @property {string} label  - Localized name
 * @property {string} state  - Travel-state CSS class (e.g. 'current', 'adjacent', 'locked')
 * @property {string} [mapColorStatus] - Semantic map-color state used by the legend
 * @property {string} [tooltip]
 */

/**
 * @param {string} tag
 * @param {Object<string, string|number>} [attrs={}]
 * @returns {SVGElement}
 */
function svgNode(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

export class UIMapView extends UIElement {
  /**
   * @param {Object} options
   * @param {number} options.width       - Canvas width (viewBox)
   * @param {number} options.height      - Canvas height (viewBox)
   * @param {string} [options.svgId='']  - id of the inner <svg>
   * @param {string} [options.className='']
   * @param {Function} [options.onNodeClick=null] - (nodeId) => void
   */
  constructor(options) {
    super({ className: `pw-map-view ${options.className || ''}`.trim(), name: 'UIMapView' });
    this._width = options.width;
    this._height = options.height;
    this._onNodeClick = options.onNodeClick || null;
    this._zoom = MapInteractionRules.MIN_ZOOM;
    this._viewX = 0;
    this._viewY = 0;
    this._pointers = new Map();
    this._lastPinchDistance = null;
    this._dragDistance = 0;
    this._suppressClickUntil = 0;
    this._background = null;

    this._svg = svgNode('svg', {
      viewBox: `0 0 ${this._width} ${this._height}`,
      preserveAspectRatio: 'xMidYMid meet',
      class: 'pw-map-svg'
    });
    if (options.svgId) this._svg.id = options.svgId;
    this._terrain = svgNode('g', { class: 'pw-map-terrain' });
    this._nodes = svgNode('g', { class: 'pw-map-nodes' });
    this._labels = svgNode('g', { class: 'pw-map-labels' });
    this._ambushes = svgNode('g', { class: 'pw-map-ambush-layer' });
    this._player = svgNode('g', { class: 'pw-map-player-layer' });
    this._svg.append(this._terrain, this._nodes, this._labels, this._ambushes, this._player);
    this._dom.appendChild(this._svg);
    this._buildZoomControls();
    this._installCameraGestures();

    this.addDomListener('click', (event) => {
      if (performance.now() < this._suppressClickUntil) return;
      const node = event.target.closest && event.target.closest('[data-node-id]');
      if (node && this._onNodeClick) this._onNodeClick(node.getAttribute('data-node-id'));
    });
  }


  /** Builds accessible zoom controls using the canonical button widget. @private */
  _buildZoomControls() {
    const controls = new UIContainer({ className: 'pw-map-zoom-controls' });
    const makeButton = (id, symbol, labelKey, action) => {
      const button = new UIButton({ id, className: 'pw-map-zoom-btn', text: symbol, onClick: action });
      button.setAriaLabel(t(labelKey));
      button.setAttribute('title', t(labelKey));
      controls.addChild(button);
    };
    makeButton('pw-map-zoom-in', '+', 'map_zoom_in', () => this._zoomAtCenter(MapInteractionRules.BUTTON_ZOOM_STEP));
    makeButton('pw-map-zoom-out', '−', 'map_zoom_out', () => this._zoomAtCenter(1 / MapInteractionRules.BUTTON_ZOOM_STEP));
    makeButton('pw-map-zoom-reset', '↺', 'map_zoom_reset', () => this._resetCamera());
    this.addChild(controls);
  }

  /** Installs pointer and wheel gestures for mouse, pen and touch. @private */
  _installCameraGestures() {
    this.addDomListener('pointerdown', (event) => {
      if (!event.target.closest?.('#map-svg')) return;
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this._dom.setPointerCapture?.(event.pointerId);
      if (this._pointers.size === 1) this._dragDistance = 0;
      if (this._pointers.size === 2) this._lastPinchDistance = this._pointerDistance();
    });
    this.addDomListener('pointermove', (event) => {
      if (!this._pointers.has(event.pointerId)) return;
      const previous = this._pointers.get(event.pointerId);
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const rect = this._svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const bounds = this._viewBounds();
      if (this._pointers.size >= 2) {
        const distance = this._pointerDistance();
        if (this._lastPinchDistance > MapInteractionRules.PINCH_MIN_DISTANCE_PX && distance > MapInteractionRules.PINCH_MIN_DISTANCE_PX) {
          const center = this._pointerCenter();
          this._zoomAt(distance / this._lastPinchDistance, center.x - rect.left, center.y - rect.top, rect, bounds);
        }
        this._lastPinchDistance = distance;
        this._suppressClickUntil = performance.now() + MapInteractionRules.CLICK_SUPPRESSION_MS;
        event.preventDefault();
      } else if (this._pointers.size === 1) {
        this._dragDistance += Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
        if (this._zoom > MapInteractionRules.MIN_ZOOM && this._dragDistance > MapInteractionRules.DRAG_START_PX) {
          this._viewX -= (event.clientX - previous.x) * bounds.width / rect.width;
          this._viewY -= (event.clientY - previous.y) * bounds.height / rect.height;
          this._applyCamera();
          this._suppressClickUntil = performance.now() + MapInteractionRules.CLICK_SUPPRESSION_MS;
          event.preventDefault();
        }
      }
    });
    const endPointer = (event) => {
      this._pointers.delete(event.pointerId);
      if (this._pointers.size < 2) this._lastPinchDistance = null;
      if (this._pointers.size === 1) this._dragDistance = MapInteractionRules.DRAG_START_PX;
    };
    this.addDomListener('pointerup', endPointer);
    this.addDomListener('pointercancel', endPointer);
    this.addDomListener('wheel', (event) => {
      if (!event.target.closest?.('#map-svg')) return;
      event.preventDefault();
      const rect = this._svg.getBoundingClientRect();
      const factor = event.deltaY < 0 ? MapInteractionRules.WHEEL_ZOOM_STEP : 1 / MapInteractionRules.WHEEL_ZOOM_STEP;
      this._zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top, rect, this._viewBounds());
    }, { passive: false });
  }

  _pointerDistance() {
    const points = [...this._pointers.values()];
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  _pointerCenter() {
    const points = [...this._pointers.values()];
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  }

  _viewBounds() {
    return { width: this._width / this._zoom, height: this._height / this._zoom };
  }

  _zoomAt(factor, pointX, pointY, rect, bounds) {
    if (!rect.width || !rect.height) return;
    const nextZoom = Math.max(MapInteractionRules.MIN_ZOOM, Math.min(MapInteractionRules.MAX_ZOOM, this._zoom * factor));
    if (nextZoom === this._zoom) return;
    const mapX = this._viewX + pointX * bounds.width / rect.width;
    const mapY = this._viewY + pointY * bounds.height / rect.height;
    this._zoom = nextZoom;
    const nextBounds = this._viewBounds();
    this._viewX = mapX - pointX * nextBounds.width / rect.width;
    this._viewY = mapY - pointY * nextBounds.height / rect.height;
    this._applyCamera();
  }

  _zoomAtCenter(factor) {
    const rect = this._svg.getBoundingClientRect();
    this._zoomAt(factor, rect.width / 2, rect.height / 2, rect, this._viewBounds());
  }

  _resetCamera() {
    this._zoom = MapInteractionRules.MIN_ZOOM;
    this._viewX = 0;
    this._viewY = 0;
    this._applyCamera();
  }

  _applyCamera() {
    const bounds = this._viewBounds();
    this._viewX = Math.max(0, Math.min(this._width - bounds.width, this._viewX));
    this._viewY = Math.max(0, Math.min(this._height - bounds.height, this._viewY));
    this._svg.setAttribute('viewBox', `${this._viewX} ${this._viewY} ${bounds.width} ${bounds.height}`);
  }

  /** @param {string} src - Background picture covering the canvas */
  setBackground(src) {
    if (this._background !== null && this._background !== src) this._resetCamera();
    this._background = src;
    this._terrain.textContent = '';
    this._terrain.appendChild(svgNode('image', {
      href: src, x: 0, y: 0, width: this._width, height: this._height, preserveAspectRatio: 'xMidYMid meet'
    }));
    this._applyCamera();
  }

  /** @param {MapNode[]} nodes */
  setNodes(nodes) {
    this._nodes.textContent = '';
    this._labels.textContent = '';
    for (const node of nodes) {
      this._nodes.appendChild(UIMapView._buildNode(node));
      this._labels.appendChild(UIMapView._buildLabel(node));
    }
  }

  /**
   * Updates or hides the visual player avatar marker on the map.
   * Matches reference `#map-svg .pw-map-player` marker with pulsing ring and bobbing avatar.
   * @param {{x: number, y: number, spriteUrl: string, tooltip?: string}|null} player
   */
  setPlayer(player) {
    this._player.textContent = '';
    if (!player) return;

    const size = 62;
    const cx = player.x;
    const cy = player.y;
    const px = cx - size / 2;
    const py = cy - size / 2;

    const group = svgNode('g', { class: 'pw-map-player' });
    if (player.tooltip) {
      const title = svgNode('title');
      title.textContent = player.tooltip;
      group.appendChild(title);
    }

    group.appendChild(svgNode('ellipse', {
      class: 'pw-map-player-ring',
      cx,
      cy,
      rx: 26,
      ry: 26
    }));

    const bobGroup = svgNode('g', { class: 'pw-map-player-bob' });
    bobGroup.appendChild(svgNode('ellipse', {
      cx,
      cy: cy + size / 2 - 4,
      rx: 16,
      ry: 5,
      fill: '#000',
      opacity: '0.35'
    }));

    bobGroup.appendChild(svgNode('image', {
      href: player.spriteUrl,
      'xlink:href': player.spriteUrl,
      x: px,
      y: py,
      width: size,
      height: size,
      preserveAspectRatio: 'xMidYMid meet'
    }));

    group.appendChild(bobGroup);
    this._player.appendChild(group);
  }

  /**
   * Updates or hides enemy team ambush markers on the map.
   * @param {Array<{x: number, y: number, spriteUrl: string, tooltip?: string, locationId: string}>} [ambushes=[]]
   */
  setAmbushMarkers(ambushes = []) {
    this._ambushes.textContent = '';
    if (!ambushes || ambushes.length === 0) return;

    for (const ambush of ambushes) {
      const size = 56;
      const cx = ambush.x;
      const cy = ambush.y;
      const px = cx - size / 2;
      const py = cy - size / 2;

      const group = svgNode('g', {
        class: 'pw-map-team-ambush',
        'data-node-id': ambush.locationId
      });

      if (ambush.tooltip) {
        const title = svgNode('title');
        title.textContent = ambush.tooltip;
        group.appendChild(title);
      }

      group.appendChild(svgNode('circle', {
        class: 'pw-map-ambush-ring',
        cx,
        cy,
        r: 24
      }));

      group.appendChild(svgNode('image', {
        href: ambush.spriteUrl,
        'xlink:href': ambush.spriteUrl,
        x: px,
        y: py,
        width: size,
        height: size,
        preserveAspectRatio: 'xMidYMid meet'
      }));

      this._ambushes.appendChild(group);
    }
  }

  /** @private @param {MapNode} node */
  static _buildNode(node) {
    const x0 = node.x - node.w / 2;
    const y0 = node.y - node.h / 2;
    const colorStatus = node.mapColorStatus || 'complete';
    const group = svgNode('g', {
      class: `loc-node ${node.state} map-color-${colorStatus}`,
      'data-node-id': node.id,
      'data-map-color-status': colorStatus
    });
    const title = svgNode('title');
    title.textContent = node.tooltip || node.label;
    group.appendChild(title);
    group.appendChild(svgNode('rect', { class: 'loc-node-shadow', x: x0 - 2, y: y0 - 2, width: node.w + 4, height: node.h + 4, rx: NODE_RADIUS + 2 }));
    group.appendChild(svgNode('rect', { class: 'loc-node-body', x: x0, y: y0, width: node.w, height: node.h, rx: NODE_RADIUS }));
    if (node.state === 'current') {
      const m = CURRENT_RING_MARGIN;
      group.appendChild(svgNode('rect', { class: 'loc-node-ring pulse', x: x0 - m, y: y0 - m, width: node.w + 2 * m, height: node.h + 2 * m, rx: NODE_RADIUS + 4 }));
    }
    return group;
  }

  /** @private @param {MapNode} node */
  static _buildLabel(node) {
    const width = Math.max(LABEL_MIN_WIDTH, node.label.length * LABEL_CHAR_WIDTH + LABEL_PADDING);
    const group = svgNode('g', { class: `map-label ${node.state}`, 'data-node-id': node.id });
    group.appendChild(svgNode('rect', { x: node.x - width / 2, y: node.y - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT, rx: LABEL_HEIGHT / 2 }));
    const text = svgNode('text', { x: node.x, y: node.y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    text.textContent = node.label;
    group.appendChild(text);
    return group;
  }
}
