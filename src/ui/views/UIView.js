/**
 * PokéWorld UI — UIView
 *
 * A VIEW (window / panel opened ON TOP of the game scene) — explicitly NOT
 * a Scene. The game owns exactly two scenes (MainMenuScene save selection
 * and GameScene); every other display (bag, box, dictionary, pokédex,
 * quests, training...) is a UIView layered above the GameScene.
 *
 * A UIView composes its own ECS World (entities = design-system base
 * objects), renders ONE virtual tree from those entities and materializes
 * it either as an HTML string (toHTML — DOM-free, used by classic adapters
 * and tests) or as live DOM (mount — browser). Lifecycle: open → update →
 * refresh → close, mirroring the window it represents.
 *
 * Interaction model: ONE delegated click listener on the mounted root
 * resolves `[data-pw-eid]` targets back to their entity's
 * UIInteractiveComponent (ECS-truthful routing); legacy `[data-action]`
 * attributes keep flowing through the game's global dispatcher untouched.
 *
 * @module ui/views/UIView
 */
import { World } from '../../engine/core/World.js';
import { System } from '../../engine/core/System.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { UIRenderSystem } from '../../engine/systems/UIRenderSystem.js';
import { UIInteractionSystem } from '../../engine/systems/UIInteractionSystem.js';
import { h, toHTMLString, renderInto, mount } from '../../engine/render/vdom.js';
import { renderChildren } from '../components/component-utils.js';

export class UIView {
  /**
   * @param {Object} [options]
   * @param {string} [options.name] Stable view name.
   * @param {Object} [options.model] View-model consumed by buildView().
   * @param {{emit: Function}} [options.bus] Optional event bus (injected).
   */
  constructor(options = {}) {
    /** @type {string} */
    this.name = options.name || this.constructor.name;
    /** @type {Object} */
    this.model = options.model || {};
    /** @type {{emit: Function}|null} */
    this.bus = options.bus || null;
    /** @type {World} Entities/components owned by this view. */
    this.world = options.world || new World();
    /** @type {System[]} */
    this._systems = [];
    /** @type {import('../../engine/core/Entity.js').Entity|null} */
    this.rootEntity = null;
    /** @type {Element|null} Mounted host element (browser only). */
    this.hostElement = null;
    /** @type {boolean} True between open() and close(). */
    this.open = false;
    this._disposed = false;
    this._opened = false;
    this._delegatedBound = false;
    /** @type {Set<Element>} Wave 42 — hosts already carrying the delegated listener (multi-region views: DS Window content + footer slots). */
    this._delegatedHosts = new Set();
  }

  // ─── Entity spawning (same semantics as engine Scene.spawn) ─────────────

  /**
   * Spawn an entity inside this view (hung under the view root by default).
   * @param {string} [name]
   * @param {Component[]} [components]
   * @param {import('../../engine/core/Entity.js').Entity|null|undefined} [parent]
   * @returns {import('../../engine/core/Entity.js').Entity}
   */
  spawn(name = '', components = [], parent = undefined) {
    const entity = this.world.spawn(name, components);
    entity.scene = null; // views are not scenes: entities carry no scene ref
    entity.view = this;
    const effectiveParent = parent === undefined ? this.rootEntity : parent;
    if (effectiveParent && entity !== effectiveParent) {
      this.world.addHierarchy(effectiveParent.id, entity.id);
    }
    return entity;
  }

  /**
   * @template {System} T
   * @param {T} system
   * @returns {T}
   */
  addSystem(system) {
    if (!(system instanceof System)) {
      throw new TypeError('[ui] UIView.addSystem expects a System instance');
    }
    system.world = this.world;
    this._systems.push(system);
    return system;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /** Open the view (build entities once via onOpen). Idempotent. */
  enter() {
    if (this._disposed) throw new Error(`[ui] View "${this.name}" was disposed`);
    if (this.open) return;
    if (!this._opened) {
      this._opened = true;
      this.rootEntity = this.spawn(`${this.name}:root`, [], null);
      this.onLoad();
    }
    this.open = true;
    this.onEnter();
    this._emit('view:open');
  }

  /**
   * Frame tick (live-mounted views): run systems then the user hook.
   * @param {number} dt
   */
  update(dt) {
    if (!this.open || this._disposed) return;
    for (const system of this._systems) system._run(dt);
    this.onUpdate(dt);
  }

  /** Close the view (entities stay resident for a fast re-open). */
  exit() {
    if (!this.open) return;
    this.open = false;
    this.onExit();
    this._emit('view:close');
  }

  /** Terminal cleanup: dispose the whole entity tree + systems. */
  dispose() {
    if (this._disposed) return;
    this.exit();
    this._disposed = true;
    this.onDispose();
    if (this.rootEntity) {
      this.world.destroyRecursive(this.rootEntity.id);
      this.rootEntity = null;
    }
    for (const system of this._systems) system.world = null;
    this._systems.length = 0;
    this._opened = false;
    this.hostElement = null;
    this._emit('view:dispose');
  }

  // ─── User hooks (overridable) ────────────────────────────────────────────

  onLoad() {}
  onEnter() {}
  /** @param {number} _dt */
  onUpdate(_dt) {}
  onExit() {}
  onDispose() {}

  // ─── Rendering ───────────────────────────────────────────────────────────

  /**
   * Single root template: renders the view-root entity children.
   * Subclasses override onLoad() to build their entity tree from the model.
   * @returns {*} vnode
   */
  buildView() {
    return h('div', { class: 'pw-view', dataset: { view: this.name } }, renderChildren(this.rootEntity));
  }

  /**
   * Render the whole view as an HTML string (DOM-free).
   * @returns {string}
   */
  toHTML() {
    this.enter();
    return toHTMLString(this.buildView());
  }

  /**
   * Mount the view into a live host element (browser runtime).
   * @param {Element} host
   * @returns {Element}
   */
  mount(host) {
    this.enter();
    this.hostElement = host;
    renderInto(this.buildView(), host);
    this._bindDelegation(host);
    // After composition, let the render/interaction systems handle updates.
    this.addSystem(new UIRenderSystem());
    this.addSystem(new UIInteractionSystem());
    this.world.query(['UIRender'], (eid, render) => {
      if (!render.renderer) render.renderer = (vnode) => mount(vnode, host.ownerDocument);
    });
    return host;
  }

  /** Live refresh of the mounted view (state → render single data-flow). */
  refresh() {
    if (!this.hostElement) return;
    renderInto(this.buildView(), this.hostElement);
  }

  /**
   * Delegated click routing: one listener PER HOST for every interactive
   * entity. Wave 42: multi-host capable (a view materialized across several
   * DS Window slots — content + footer — binds each region once).
   * @param {Element} host
   */
  _bindDelegation(host) {
    if (!host || this._delegatedHosts.has(host)) return;
    this._delegatedHosts.add(host);
    this._delegatedBound = true;
    host.addEventListener('click', (event) => {
      const target = event.target && event.target.closest
        ? event.target.closest('[data-pw-eid]')
        : null;
      if (!target || !host.contains(target)) return;
      const entity = this.world.entity(Number(target.dataset.pwEid));
      if (!entity || !entity.active) return;
      const interactive = entity.get(UIInteractiveComponent);
      if (!interactive || !interactive.interactable) return;
      if (typeof interactive.onClick === 'function') interactive.onClick(event, entity);
    });
  }

  _emit(event) {
    if (this.bus && typeof this.bus.emit === 'function') {
      this.bus.emit(event, { name: this.name });
    }
  }

  /** Unmount + dispose the view. */
  unmount() {
    this.dispose();
  }
}

