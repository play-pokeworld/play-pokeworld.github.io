/**
 * @file UIMapView.js
 * @brief Interactive SVG world map (C++ equivalent: class UIMapView : public UIElement).
 * Renders a background picture and one node per location (rounded zone + name pill).
 * Travel states and semantic legend colors are CSS concerns; they are carried separately as
 * `.loc-node.<state>.map-color-<status>` (see ui-map-view.css).
 */

import { UIElement } from './UIElement.js';

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

    this.addDomListener('click', (event) => {
      const node = event.target.closest && event.target.closest('[data-node-id]');
      if (node && this._onNodeClick) this._onNodeClick(node.getAttribute('data-node-id'));
    });
  }

  /** @param {string} src - Background picture covering the canvas */
  setBackground(src) {
    this._terrain.textContent = '';
    this._terrain.appendChild(svgNode('image', {
      href: src, x: 0, y: 0, width: this._width, height: this._height, preserveAspectRatio: 'xMidYMid meet'
    }));
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
