/**
 * PokeEngine — UIInteractiveComponent
 *
 * Interaction contract of a UI entity: click/context handlers, disabled
 * state and the STRICT visibility rule of the design system — a control
 * that cannot be used right now is NOT rendered
 * (`hideWhenDisabled → display:none / not rendered at all`), never shown
 * greyed-out.
 *
 * @module engine/components/UIInteractiveComponent
 */
import { Component } from '../core/Component.js';
import { UIRenderComponent } from './UIRenderComponent.js';

export class UIInteractiveComponent extends Component {
  static get type() { return 'UIInteractive'; }

  /**
   * @param {Object} [props]
   * @param {(event: *, entity: import('../core/Entity.js').Entity) => void} [props.onClick]
   * @param {(event: *, entity: import('../core/Entity.js').Entity) => void} [props.onContext]
   * @param {boolean} [props.disabled=false]
   * @param {boolean} [props.hideWhenDisabled=true] Non-usable ⇒ hidden (design rule).
   * @param {string} [props.cursor] CSS cursor when interactable.
   * @param {string} [props.action] Attribute-dispatch action name (legacy bridge compat).
   * @param {string[]} [props.actionArgs] Attribute-dispatch arguments.
   */
  constructor(props = {}) {
    super();
    this.onClick = props.onClick || null;
    this.onContext = props.onContext || null;
    this.disabled = !!props.disabled;
    this.hideWhenDisabled = props.hideWhenDisabled !== false;
    this.cursor = props.cursor || null;
    this.action = props.action || null;
    this.actionArgs = Array.isArray(props.actionArgs) ? props.actionArgs : [];
  }

  /** @returns {boolean} True when the control can be used right now. */
  get interactable() {
    return this.enabled && !this.disabled;
  }

  /**
   * @returns {boolean} True when the control must be completely hidden
   * (disabled with hideWhenDisabled policy — the strict design rule).
   */
  get renderHidden() {
    return this.disabled && this.hideWhenDisabled;
  }

  /** Enable interaction (makes the control visible again). */
  enable() { this.disabled = false; this._dirtyRender(); }

  /** Disable interaction (hides the control when hideWhenDisabled). */
  disable() { this.disabled = true; this._dirtyRender(); }

  _dirtyRender() {
    const render = this.entity ? this.entity.get(UIRenderComponent) : undefined;
    if (render) render.markDirty();
  }
}

