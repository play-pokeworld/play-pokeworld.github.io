/**
 * PokeEngine — Public façade (agnostic engine, zero game/business imports)
 *
 * The engine contains ONLY reusable, game-agnostic building blocks:
 *   core/       ECS storage, Component/Entity/World, System, Scene, SceneManager,
 *               Input, Timer, Audio, Engine frame hub
 *   components/ TransformComponent, UIRenderComponent, UIInteractiveComponent,
 *               UILayoutComponent, UIStateComponent
 *   systems/    UIRenderSystem, UIInteractionSystem
 *   render/     vdom (h / toHTMLString / mount / renderInto)
 *   events/     EventBus
 *   resources/  ResourceManager
 *
 * Anything Pokémon (data, rules, screens, glue) lives in src/data, src/game,
 * src/domain and src/application — never here.
 *
 * @module engine
 */
export { SparseSet, ECSWorld } from './core/ECS.js';
export { Component } from './core/Component.js';
export { Entity } from './core/Entity.js';
export { World } from './core/World.js';
export { System } from './core/System.js';
export { Scene } from './core/Scene.js';
export { SceneManager } from './core/SceneManager.js';

export { TransformComponent } from './components/TransformComponent.js';
export { UIRenderComponent } from './components/UIRenderComponent.js';
export { UIInteractiveComponent } from './components/UIInteractiveComponent.js';
export { UILayoutComponent } from './components/UILayoutComponent.js';
export { UIStateComponent } from './components/UIStateComponent.js';

export { UIRenderSystem } from './systems/UIRenderSystem.js';
export { UIInteractionSystem } from './systems/UIInteractionSystem.js';

export { h, esc, isVNode, toHTMLString, mount, renderInto } from './render/vdom.js';
