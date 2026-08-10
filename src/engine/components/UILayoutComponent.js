/**
 * PokeEngine — UILayoutComponent
 *
 * Layout contract of a container entity. Supported directions:
 *   - 'vertical'   : stacked children
 *   - 'horizontal' : inline children
 *   - 'grid'       : N-columns grid
 *
 * FIXED REGIONS (hard design rule): a container MAY declare named fixed
 * regions (`fixedRegions`, e.g. the filters/sorts toolbar). Fixed regions
 * live OUTSIDE the scrollable body: they never scroll away with the
 * content. The UI layer renders them as flex siblings, with only the body
 * region scrolling.
 *
 * @module engine/components/UILayoutComponent
 */
import { Component } from '../core/Component.js';

export class UILayoutComponent extends Component {
  static get type() { return 'UILayout'; }

  /** @returns {string[]} */
  static get DIRECTIONS() { return ['vertical', 'horizontal', 'grid']; }

  /**
   * @param {Object} [props]
   * @param {'vertical'|'horizontal'|'grid'} [props.direction='vertical']
   * @param {number} [props.cols=3] Columns in grid mode.
   * @param {number|string} [props.gap=12] Gap between children (px or CSS size).
   * @param {boolean} [props.scrollable=true] Body region scrolls when overflowing.
   * @param {string[]} [props.fixedRegions=[]] Named fixed regions ('top'/'bottom' anchors).
   * @param {number|string} [props.padding=0]
   * @param {string} [props.align] CSS align-items.
   * @param {string} [props.justify] CSS justify-content.
   */
  constructor(props = {}) {
    super();
    this.direction = props.direction || 'vertical';
    if (!UILayoutComponent.DIRECTIONS.includes(this.direction)) {
      throw new Error(`[engine] Unknown layout direction "${this.direction}"`);
    }
    this.cols = Math.max(0, props.cols ?? 3); // 0 ⇒ columns are CSS-driven
    this.gap = props.gap ?? 12;
    this.scrollable = props.scrollable !== false;
    this.fixedRegions = Array.isArray(props.fixedRegions) ? [...props.fixedRegions] : [];
    this.padding = props.padding ?? 0;
    // gap/padding are written to the INLINE body style ONLY when the caller
    // explicitly set them. Otherwise the themed CSS classes (e.g. .dex-grid)
    // stay in control — an inline `padding:0` would silently beat the
    // stylesheet and clip the absolutely-positioned badges of the first row
    // (regression fixed 2026-08-04: Pokédex first line half-hidden).
    this._gapInline = props.gap !== undefined;
    this._paddingInline = props.padding !== undefined;
    this.align = props.align || null;
    this.justify = props.justify || null;
  }

  /** @returns {boolean} True when this layout owns fixed (non-scrolling) regions. */
  get hasFixedRegions() {
    return this.fixedRegions.length > 0;
  }

  /**
   * Style dictionary for the BODY (scrollable) region of the layout.
   * @returns {Object}
   */
  bodyStyle() {
    const style = { flex: '1 1 auto', minHeight: '0' };
    if (this._gapInline) style.gap = typeof this.gap === 'number' ? `${this.gap}px` : this.gap;
    if (this._paddingInline) style.padding = typeof this.padding === 'number' ? `${this.padding}px` : this.padding;
    if (this.scrollable) style['overflow-y'] = 'auto';
    if (this.direction === 'grid') {
      style.display = 'grid';
      // cols <= 0: columns are CSS-driven (responsive auto-fill by class).
      if (this.cols > 0) style['grid-template-columns'] = `repeat(${this.cols}, minmax(0, 1fr))`;
      style['align-content'] = 'start';
    } else {
      style.display = 'flex';
      style['flex-direction'] = this.direction === 'horizontal' ? 'row' : 'column';
      if (this.align) style['align-items'] = this.align;
      if (this.justify) style['justify-content'] = this.justify;
    }
    return style;
  }
}
