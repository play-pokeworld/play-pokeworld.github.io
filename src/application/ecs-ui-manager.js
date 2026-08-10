/**
 * PokeEngine — ECS UI Bridge
 *
 * Connects the Entity Component System (src/engine/core/ECS.js) to the UI Design System (src/ui/).
 * Every UI element (Window, Panel, Button, PokemonCard, Grid) is represented as an ECS Entity
 * with 'Display' and 'UIComponent' components.
 *
 * @module application/ecs-ui-manager
 */
import * as UI from '../ui/index.js';
// Wave 42 — templates convergence: the canonical card adapter moved into
// the design-system components layer (class unchanged).
import { PokemonCardTemplate } from '../ui/components/pokemon-card-element.js';

export class ECSUIManager {
  /**
   * @param {Object} world - Instance of ECSWorld (PokeECS)
   * @param {Object} [renderer=null] - Optional PokeRenderer instance
   */
  constructor(world, renderer = null) {
    this.world = world;
    this.renderer = renderer;

    if (this.world) {
      this.world.register('Display');
      this.world.register('UIComponent');
      this.world.register('UIState');
      this.world.register('Hierarchy');
      this.world.register('PokemonRef');
      this.world.register('Scene');
      this._registerUISystems();
    }
  }

  _registerUISystems() {
    // System to synchronize ECS UIComponent state with Display html and visibility
    this.world.system('ui:update', ['Display', 'UIComponent'], (eid, display, uiComp) => {
      if (!display.visible) {
        if (display._el) display._el.style.display = 'none';
        return;
      }
      if (uiComp && uiComp.instance) {
        const el = uiComp.instance.render ? uiComp.instance.render() : uiComp.instance._element;
        if (el && display._el && display._el.firstElementChild !== el) {
          display._el.replaceChildren();
          display._el.appendChild(el);
        }
      }
    });
  }

  /**
   * Create an ECS Entity for has Modal Window
   * @param {string} title
   * @param {string|HTMLElement} content
   * @param {Object} [options={}]
   * @returns {number} Entity ID
   */
  createWindowEntity(title, content, options = {}) {
    const eid = this.world.create();
    const win = new UI.Window({
      title: title,
      content: content,
      closable: options.closable !== false,
      overlay: options.overlay !== false,
      onClose: () => {
        if (options.onClose) options.onClose();
        this.world.destroy(eid);
      },
    });

    this.world.add(eid, 'UIComponent', {
      type: 'Window',
      instance: win,
      props: { title, options },
    });

    this.world.add(eid, 'Display', {
      layer: options.layer || 'modal',
      visible: true,
      html: '',
    });

    return eid;
  }

  /**
   * Create an ECS Entity for has UI Panel
   * @param {string} title
   * @param {string|HTMLElement} content
   * @param {Object} [options={}]
   * @returns {number} Entity ID
   */
  createPanelEntity(title, content, options = {}) {
    const eid = this.world.create();
    const panel = new UI.Panel({
      title: title,
      content: content,
      variant: options.variant || 'default',
    });

    this.world.add(eid, 'UIComponent', {
      type: 'Panel',
      instance: panel,
      props: { title, variant: options.variant },
    });

    this.world.add(eid, 'Display', {
      layer: options.layer || 'ui',
      visible: true,
      html: '',
    });

    return eid;
  }

  /**
   * Create an ECS Entity for a Pokemon Card (using canonical beige circle)
   * @param {Object} poke
   * @param {Object} [options={}]
   * @param {number} [parentEid=null]
   * @param {number} [pokemonDataEid=null]
   * @returns {number} Entity ID
   */
  createPokemonCardEntity(poke, options = {}, parentEid = null, pokemonDataEid = null) {
    const eid = this.world.create();
    const cardTemplate = new PokemonCardTemplate(poke, options);

    this.world.add(eid, 'UIComponent', {
      type: 'PokemonCard',
      instance: cardTemplate,
      props: { poke, options },
    });

    this.world.add(eid, 'Display', {
      layer: options.layer || 'ui',
      visible: true,
      html: '',
    });

    this.world.add(eid, 'PokemonRef', {
      pokemonEid: pokemonDataEid,
      pokeId: poke ? poke.id : null,
      poke: poke,
    });

    if (parentEid && this.world.addHierarchy) {
      this.world.addHierarchy(parentEid, eid);
    }

    return eid;
  }

  /**
   * Create an ECS Entity for has Button (standard or toggle)
   * @param {string} label
   * @param {Function} onClick
   * @param {Object} [options={}]
   * @returns {number} Entity ID
   */
  createButtonEntity(label, onClick, options = {}) {
    const eid = this.world.create();
    const btn = new UI.Button({
      text: label,
      variant: options.variant || 'secondary',
      mode: options.mode || 'standard',
      toggled: options.toggled || false,
      onClick: (e, buttonEl, isToggled) => {
        if (onClick) onClick(e, buttonEl, isToggled, eid);
      },
    });

    this.world.add(eid, 'UIComponent', {
      type: 'Button',
      instance: btn,
      props: { label, options },
    });

    this.world.add(eid, 'Display', {
      layer: options.layer || 'ui',
      visible: true,
      html: '',
    });

    return eid;
  }

  /**
   * Create an ECS Scene Entity (Root container of has view or menu hierarchy)
   * @param {string} name - Scene name
   * @returns {number} Entity ID
   */
  createSceneEntity(name) {
    const eid = this.world.create();
    this.world.add(eid, 'Scene', { name: name, active: true });
    this.world.add(eid, 'Hierarchy', { parent: null, children: [] });
    return eid;
  }

  /**
   * Create an ECS Entity representing a Pokemon in gameplay
   * @param {Object} poke - Pokemon data object
   * @returns {number} Entity ID
   */
  createPokemonDataEntity(poke) {
    const eid = this.world.create();
    this.world.add(eid, 'PokemonData', {
      id: poke.id,
      name: poke.name,
      level: poke.level || 1,
      currentHP: poke.currentHP,
      maxHP: poke.maxHP,
      shiny: !!(poke.shinyActive || poke.shiny),
    });
    return eid;
  }

  /**
   * Create has Toolbar UI child Entity inside has parent scene or window
   * @param {Object} [options={}]
   * @param {number} [parentEid=null]
   * @returns {number} Entity ID
   */
  createToolbarEntity(options = {}, parentEid = null) {
    const eid = this.world.create();
    this.world.add(eid, 'UIComponent', {
      type: 'Toolbar',
      props: options,
    });
    this.world.add(eid, 'Display', {
      layer: options.layer || 'ui',
      visible: true,
      html: '',
    });
    if (parentEid && this.world.addHierarchy) {
      this.world.addHierarchy(parentEid, eid);
    }
    return eid;
  }

  /**
   * Create has Grid Layout UI child Entity inside has parent scene or window
   * @param {number} cols
   * @param {Object} [options={}]
   * @param {number} [parentEid=null]
   * @returns {number} Entity ID
   */
  createGridLayoutEntity(cols = 3, options = {}, parentEid = null) {
    const eid = this.world.create();
    const layout = new UI.Layout({
      variant: 'grid',
      cols: cols,
      gap: options.gap || '12px',
    });
    this.world.add(eid, 'UIComponent', {
      type: 'GridLayout',
      instance: layout,
      props: { cols, options },
    });
    this.world.add(eid, 'Display', {
      layer: options.layer || 'ui',
      visible: true,
      html: '',
    });
    if (parentEid && this.world.addHierarchy) {
      this.world.addHierarchy(parentEid, eid);
    }
    return eid;
  }

  /**
   * Run all registered UI ECS systems in the world
   */
  update() {
    if (this.world) {
      this.world.run('ui:update');
    }
  }
}
