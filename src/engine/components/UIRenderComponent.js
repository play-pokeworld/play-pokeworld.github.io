/**
 * PokeEngine — UIRenderComponent
 *
 * Rendering contract of a UI entity: a `template` function producing a
 * virtual node tree (see engine/render/vdom.js), a visibility flag and a
 * dirty flag consumed by UIRenderSystem to re-materialize the entity.
 *
 * The component is renderer-agnostic: a concrete `renderer` (vnode → DOM
 * element) is injected by the UI layer; the stored `element` reference is
 * opaque to the engine.
 *
 * @module engine/components/UIRenderComponent
 */
import { Component } from '../core/Component.js';

export class UIRenderComponent extends Component {
  static get type() { return 'UIRender'; }

  /**
   * @param {Object} [props]
   * @param {(entity: import('../core/Entity.js').Entity) => *} [props.template] Virtual tree factory.
   * @param {boolean} [props.visible=true]
   * @param {(vnode: *) => *} [props.renderer] vnode → element materializer (UI layer).
   * @param {string} [props.layer='ui'] Logical layer name (ui, modal, overlay...).
   */
  constructor(props = {}) {
    super();
    this.template = props.template || null;
    this.visible = props.visible !== false;
    this.renderer = props.renderer || null;
    this.layer = props.layer || 'ui';
    /** @type {boolean} True → UIRenderSystem re-materializes on next tick. */
    this.dirty = true;
    /** @type {*} Opaque rendered element reference (owned by the UI layer). */
    this.element = null;
  }

  /** Request a re-render on the next UISystem tick. */
  markDirty() {
    this.dirty = true;
  }

  /**
   * Produce the current virtual tree.
   * @returns {*}
   */
  renderTemplate() {
    return this.template ? this.template(this.entity) : null;
  }
}

