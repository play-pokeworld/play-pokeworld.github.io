/**
 * PokeEngine — SceneManager
 *
 * Stack-based scene orchestrator. The manager owns registered Scene
 * instances, enforces single-active-scene semantics per frame, routes the
 * frame tick to the top of the stack and drives lifecycle transitions:
 *
 *   push(scene)  : exit current top, enter the new scene (stacked)
 *   pop()        : dispose current top, re-enter the exposed scene
 *   switchTo(s)  : replace the whole stack with one scene
 *   update(dt)   : forward the frame tick to the active scene
 *
 * Events emitted on the injected bus (if any):
 *   scenemanager:push|pop|switch { name }
 *
 * @module engine/core/SceneManager
 */
import { Scene } from './Scene.js';

export class SceneManager {
  /**
   * @param {Object} [options]
   * @param {{emit: Function}} [options.bus] Optional event bus (dependency injection).
   */
  constructor(options = {}) {
    this.bus = options.bus || null;
    /** @type {Scene[]} Active stack (last = current). */
    this._stack = [];
  }

  /** @returns {Scene|null} Scene currently on top of the stack. */
  get current() {
    return this._stack.length ? this._stack[this._stack.length - 1] : null;
  }

  /** @returns {Scene[]} Copy of the scene stack (bottom → top). */
  get stack() {
    return [...this._stack];
  }

  /**
   * Push a scene on the stack and activate it.
   * @param {Scene} scene
   * @returns {Scene}
   */
  push(scene) {
    if (!(scene instanceof Scene)) {
      throw new TypeError('[engine] SceneManager.push expects a Scene instance');
    }
    const top = this.current;
    if (top === scene) return scene;
    if (top) top.exit();
    this._stack.push(scene);
    scene.enter();
    this._emit('scenemanager:push', scene);
    return scene;
  }

  /**
   * Pop and dispose the current scene; re-activate the exposed one.
   * @returns {Scene|null} The scene now on top (null if stack empty).
   */
  pop() {
    const top = this._stack.pop() || null;
    if (top) {
      top.dispose();
      this._emit('scenemanager:pop', top);
    }
    const next = this.current;
    if (next) next.enter();
    return next;
  }

  /**
   * Replace the whole stack with a single scene.
   * @param {Scene} scene
   * @returns {Scene}
   */
  switchTo(scene) {
    while (this._stack.length) this.pop();
    const pushed = this.push(scene);
    this._emit('scenemanager:switch', scene);
    return pushed;
  }

  /**
   * Replace the current scene WITHOUT disposing it (wave 23).
   * switchTo() pops — and therefore DISPOSES — every stacked scene, which
   * makes it unusable for resident singleton scenes that are re-entered
   * later (PokeWorld's menu ⇄ game round trips: deleting the active
   * save returns to the save menu mid-session). replace() keeps both
   * scenes alive: exit the current one, drop the stack reference, enter
   * the new top. The replaced scene stays fully resident for a later
   * re-enter (exactly like a covered scene with push(), but the stack is
   * reset so the two scenes alternate cleanly).
   * @param {Scene} scene
   * @returns {Scene}
   */
  replace(scene) {
    if (!(scene instanceof Scene)) {
      throw new TypeError('[engine] SceneManager.replace expects a Scene instance');
    }
    const top = this.current;
    if (top === scene) return scene;
    if (top) top.exit();
    this._stack.length = 0;
    this._stack.push(scene);
    scene.enter();
    this._emit('scenemanager:switch', scene);
    return scene;
  }

  /**
   * Forward the frame tick to the active scene.
   * @param {number} dt Delta time (ms).
   */
  update(dt) {
    if (this.current) this.current.update(dt);
  }

  /** Dispose every scene and empty the stack. */
  dispose() {
    while (this._stack.length) this.pop();
  }

  _emit(event, scene) {
    if (this.bus && typeof this.bus.emit === 'function') {
      this.bus.emit(event, { name: scene.name });
    }
  }
}
