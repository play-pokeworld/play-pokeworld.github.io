/**
 * PokeEngine — TransformComponent
 *
 * Spatial properties of an entity: position, size, scale, rotation, z-order.
 * Pure data + math: applyTo() maps the transform onto a host element's
 * style when a UI layer requests it (the component itself never touches a
 * global document).
 *
 * @module engine/components/TransformComponent
 */
import { Component } from '../core/Component.js';

export class TransformComponent extends Component {
  static get type() { return 'Transform'; }

  /**
   * @param {Object} [props]
   * @param {number} [props.x=0] @param {number} [props.y=0]
   * @param {number|string} [props.width='auto'] @param {number|string} [props.height='auto']
   * @param {number} [props.scale=1] @param {number} [props.rotation=0]
   * @param {number} [props.zIndex=0]
   * @param {string} [props.position='relative'] CSS position mode.
   */
  constructor(props = {}) {
    super();
    this.x = props.x ?? 0;
    this.y = props.y ?? 0;
    this.width = props.width ?? 'auto';
    this.height = props.height ?? 'auto';
    this.scale = props.scale ?? 1;
    this.rotation = props.rotation ?? 0;
    this.zIndex = props.zIndex ?? 0;
    this.position = props.position ?? 'relative';
  }

  /** @returns {string} CSS transform value. */
  get cssTransform() {
    const parts = [];
    if (this.x || this.y) parts.push(`translate(${this.x}px, ${this.y}px)`);
    if (this.scale !== 1) parts.push(`scale(${this.scale})`);
    if (this.rotation) parts.push(`rotate(${this.rotation}deg)`);
    return parts.join(' ') || 'none';
  }

  /** @returns {Object} Style dictionary of the transform. */
  style() {
    return {
      position: this.position,
      width: typeof this.width === 'number' ? `${this.width}px` : this.width,
      height: typeof this.height === 'number' ? `${this.height}px` : this.height,
      transform: this.cssTransform === 'none' ? '' : this.cssTransform,
      zIndex: this.zIndex || '',
    };
  }

  /**
   * Apply the transform on a host element's inline style.
   * @param {{style: Object}} el
   */
  applyTo(el) {
    const s = this.style();
    el.style.position = s.position;
    if (s.width !== 'auto') el.style.width = s.width;
    if (s.height !== 'auto') el.style.height = s.height;
    if (s.transform) el.style.transform = s.transform;
    if (s.zIndex !== '') el.style.zIndex = String(s.zIndex);
    return el;
  }
}

