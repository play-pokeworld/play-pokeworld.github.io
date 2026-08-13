/**
 * PokeEngine — UIStateComponent
 *
 * Reactive state bag of a UI entity. setState() shallow-merges a patch,
 * marks the sibling UIRenderComponent dirty (re-render on next UISystem
 * tick) and emits an optional onChange callback — the single, traceable
 * data-flow of the design system: state → render, never manual DOM pokes.
 *
 * @module engine/components/UIStateComponent
 */
import { Component } from '../core/Component.js';
import { UIRenderComponent } from './UIRenderComponent.js';

export class UIStateComponent extends Component {
  static get type() { return 'UIState'; }

  /**
   * @param {Object} [initial] Initial state dictionary.
   * @param {(state: Object, prev: Object) => void} [onChange] Change observer.
   */
  constructor(initial = {}, onChange = null) {
    super();
    this.data = { ...initial };
    this.onChange = onChange;
  }

  /**
   * Merge a patch into the state and request a re-render.
   * @param {Object} patch
   * @param {Object} [opts]
   * @param {boolean} [opts.silent=false] Skip re-render + observer.
   */
  setState(patch, opts = {}) {
    const prev = { ...this.data };
    Object.assign(this.data, patch);
    if (opts.silent) return;
    const render = this.entity ? this.entity.get(UIRenderComponent) : undefined;
    if (render) render.markDirty();
    if (this.onChange) this.onChange(this.data, prev);
  }

  /**
   * Read a state key.
   * @param {string} key @param {*} [fallback]
   */
  get(key, fallback = undefined) {
    return key in this.data ? this.data[key] : fallback;
  }
}

