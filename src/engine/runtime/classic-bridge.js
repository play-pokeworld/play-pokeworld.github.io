// Wave 41 — native ESM module: the bridge keeps its role (engine const +
// double guards + action registry) — only this header addition and the
// terminal grouped export change.
// PokeEngine Runtime — classic bridge (boot glue + classic interop)
// Owner of: modal shell guarantee, browser save preflight, classic shared
// globals, mobile view policy, info-panel contextual navigation, static i18n
// bindings, dynamic inline styles and the debug drawer fix. Absorbed into the
// engine in wave T2 (was application/runtime-legacy-bridge.js).
// Reintegrated preflight & postboot runtime logic (application/)
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

(function () {

/** Garantit the existence of #poke-modal / #poke-modal-inner (presets, usine, enigmes). */
function ensurePokeModal(){
  try{
    let modal = document.getElementById('poke-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'poke-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      _pwSetHtmlSafe(modal, '<div id="poke-modal-inner"></div>');
      (document.body || document.documentElement).appendChild(modal);
      modal.addEventListener('click', function(e){ if(e.target === modal){ modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); modal.classList.remove('atoll-prep-modal'); modal.classList.remove('pw-info-modal'); }});
    }
    let inner = document.getElementById('poke-modal-inner');
    if(!inner){
      inner = document.createElement('div');
      inner.id = 'poke-modal-inner';
      modal.appendChild(inner);
    }
    return { modal: modal, inner: inner };
  }catch(err){
    console.error('[ensurePokeModal]', err);
    return { modal: null, inner: null };
  }
}
if (typeof window !== 'undefined') window.ensurePokeModal = ensurePokeModal;


  const SAVE_KEY = 'pokeworld_save';
  const CURRENT_SAVE_VERSION = 3;

  function quarantineBrowserSave(raw, reason) {
    if (!raw) return null;
    try {
      const key = 'pokeworld_save_recovery_' + Date.now();
      window.localStorage.setItem(key, JSON.stringify({ reason: reason, timestamp: Date.now(), raw: raw }));
      return key;
    } catch (_) { return null; }
  }

  function validateBrowserSave() {
    let raw = null;
    try {
      raw = window.localStorage && window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const compatible = !!data
        && data.version === CURRENT_SAVE_VERSION
        && !!data.G
        && typeof data.G === 'object'
        && Array.isArray(data.G.team)
        && !!data.G.collection
        && typeof data.G.collection === 'object'
        && !!data.G.inventory
        && typeof data.G.inventory === 'object';
      if (!compatible) {
        quarantineBrowserSave(raw, 'incompatible');
        window.localStorage.removeItem(SAVE_KEY);
        console.warn('[PokeWorld] Incompatible browser save moved to recovery storage.');
      }
    } catch (error) {
      quarantineBrowserSave(raw, 'corrupted-json');
      try { window.localStorage && window.localStorage.removeItem(SAVE_KEY); } catch (_) {}
      console.warn('[PokeWorld] Corrupted browser save moved to recovery storage.', error);
    }
  }

  function applyMobileWindowDragPolicy() {
    const update = function () {
      const dragEnabled = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine) and (min-width: 851px)').matches : true;
      document.documentElement.classList.toggle('window-drag-disabled', !dragEnabled);
    };
    update();
    window.addEventListener('resize', update, { passive: true });
  }



  const storage = {
    get: function (key) { try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (_) { return null; } },
    set: function (key, value) { try { if (window.localStorage) window.localStorage.setItem(key, value); return true; } catch (_) { return false; } },
    remove: function (key) { try { if (window.localStorage) window.localStorage.removeItem(key); return true; } catch (_) { return false; } }
  };
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function chancePercent(percent) { return Math.random() * 100 < percent; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  const EVENTS = Object.freeze({
    WILD_DEFEATED: 'wildDefeated',
    POKEMON_CAUGHT: 'pokemonCaught',
    MINE_SELL: 'mineSell',
    BADGE_EARNED: 'badgeEarned',
    LEAGUE_WON: 'leagueWon',
    BOSS_DEFEATED: 'bossDefeated',
    POKEMON_EVOLVED: 'pokemonEvolved',
    POKEMON_HATCHED: 'pokemonHatched',
    ITEM_OBTAINED: 'itemObtained'
  });
  const eventBus = {
    listeners: {},
    on: function (event, listener) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(listener);
      return () => this.off(event, listener);
    },
    off: function (event, listener) {
      const listeners = this.listeners[event];
      if (!listeners) return;
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    },
    emit: function (event, payload) {
      const listeners = this.listeners[event];
      if (!listeners) return;
      for (const listener of listeners.slice()) {
        try { listener(payload); } catch (error) { console.error('[EventBus]', event, error); }
      }
    }
  };
  const PokeWorldTimers = (function () {
    const timers = new Map();
    return {
      set: function (name, callback, delay) {
        if (timers.has(name)) clearInterval(timers.get(name));
        const id = setInterval(callback, delay);
        timers.set(name, id);
        return id;
      },
      stop: function (name) {
        if (!timers.has(name)) return false;
        clearInterval(timers.get(name));
        timers.delete(name);
        return true;
      },
      stopAll: function () {
        Array.from(timers.keys()).forEach(function (name) { this.stop(name); }, this);
      },
      has: function (name) { return timers.has(name); },
      size: function () { return timers.size; }
    };
  }());
// T2-C (wave 38): values carried by the engine (local consts) — the classic
// surface is kept under double guard (browser window / VM globalThis).
const PokeWorldCore = { storage, randomInt, chancePercent, clamp, timers: PokeWorldTimers };
const PokeWorldEventBus = { EVENTS, eventBus };
if (typeof window !== 'undefined') {
  window.PokeWorldCore = PokeWorldCore;
  window.PokeWorldTimers = PokeWorldTimers;
  window.PokeWorldEventBus = PokeWorldEventBus;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PokeWorldCore = PokeWorldCore;
  globalThis.PokeWorldTimers = PokeWorldTimers;
  globalThis.PokeWorldEventBus = PokeWorldEventBus;
}

  const TYPES = Object.freeze(['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']);
  const TYPE_COLORS = Object.freeze({ Normal:'#a8a878',Fire:'#f08030',Water:'#6890f0',Grass:'#78c850',Electric:'#f8d030',Ice:'#98d8d8',Fighting:'#c03028',Poison:'#a040a0',Ground:'#e0c068',Flying:'#a890f0',Psychic:'#f85888',Bug:'#a8b820',Rock:'#b8a038',Ghost:'#705898',Dragon:'#7038f8',Dark:'#705848',Steel:'#b8b8d0',Fairy:'#ee99ac' });
  const TYPE_CHART = Object.freeze({ Normal:{Rock:.5,Steel:.5,Ghost:0}, Fire:{Fire:.5,Water:.5,Rock:.5,Dragon:.5,Grass:2,Ice:2,Bug:2,Steel:2}, Water:{Water:.5,Grass:.5,Dragon:.5,Fire:2,Ground:2,Rock:2}, Grass:{Fire:.5,Grass:.5,Poison:.5,Flying:.5,Bug:.5,Dragon:.5,Steel:.5,Water:2,Ground:2,Rock:2}, Electric:{Grass:.5,Electric:.5,Dragon:.5,Ground:0,Water:2,Flying:2}, Ice:{Water:.5,Ice:.5,Fire:2,Fighting:2,Rock:2,Steel:2,Grass:2,Ground:2,Flying:2,Dragon:2}, Fighting:{Poison:.5,Bug:.5,Psychic:.5,Flying:.5,Fairy:.5,Ghost:0,Normal:2,Ice:2,Rock:2,Dark:2,Steel:2}, Poison:{Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Grass:2,Fairy:2}, Ground:{Grass:.5,Bug:.5,Flying:0,Fire:2,Electric:2,Poison:2,Rock:2,Steel:2}, Flying:{Electric:.5,Rock:.5,Steel:.5,Grass:2,Fighting:2,Bug:2}, Psychic:{Psychic:.5,Steel:.5,Dark:0,Fighting:2,Poison:2}, Bug:{Fire:.5,Fighting:.5,Flying:.5,Ghost:.5,Steel:.5,Fairy:.5,Grass:2,Psychic:2,Dark:2}, Rock:{Fighting:.5,Ground:.5,Steel:.5,Fire:2,Ice:2,Flying:2,Bug:2}, Ghost:{Normal:0,Fighting:0,Ghost:2,Psychic:2}, Dragon:{Steel:.5,Fairy:0,Dragon:2}, Dark:{Fighting:.5,Dark:.5,Fairy:.5,Psychic:2,Ghost:2}, Steel:{Fire:.5,Water:.5,Electric:.5,Steel:.5,Ice:2,Rock:2,Fairy:2}, Fairy:{Fire:.5,Poison:.5,Steel:.5,Fighting:2,Dragon:2,Dark:2} });
  function typeEffect(attackType, defendType1, defendType2) { const first = (TYPE_CHART[attackType] || {})[defendType1] ?? 1; const second = defendType2 ? ((TYPE_CHART[attackType] || {})[defendType2] ?? 1) : 1; return first * second; }
  function effectivenessText(multiplier) { const tr = typeof window.t === 'function' ? window.t : function (key) { return key; }; if(multiplier===0) return tr('eff_immune'); if(multiplier>=4) return tr('eff_super_x4'); if(multiplier>=2) return tr('eff_super'); if(multiplier<=0.25) return tr('eff_very_weak'); if(multiplier<=0.5) return tr('eff_weak'); return ''; }
  
  const MARKET_STOCK = Object.freeze({ kanto: Object.freeze([1,4,7,133,137,106,107,122]), johto: Object.freeze([152,155,158,172,173,174,175,236,196,197,199,213,238,239,240]), hoenn: Object.freeze([252,255,258,298,351]) });
  function getPokemonPrice(id, pokemonData) { if(id===151) return 100000; if(id===150) return 75000; if([144,145,146].includes(id)) return 50000; const d=pokemonData[id]; if(!d) return 999999; const bst=d[3]+d[4]+d[5]+d[6]; if([1,4,7,152,155,158].includes(id)) return 5000; if([2,5,8].includes(id)) return 8000; if([3,6,9].includes(id)) return 12000; if([138,140].includes(id)) return 8000; if([139,141].includes(id)) return 12000; if([142].includes(id)) return 15000; if([147].includes(id)) return 10000; if([148].includes(id)) return 15000; if([149].includes(id)) return 25000; let mult=12; if(bst>=350) mult=22; else if(bst>=300) mult=18; else if(bst>=250) mult=15; else if(bst>=200) mult=13; return Math.max(1500, Math.floor(bst*mult)); }
  const MINE_ITEMS = Object.freeze([{key:'firestone',name:'firestone',shape:[[1,1,1],[1,1,1],[1,1,1]]},{key:'waterstone',name:'waterstone',shape:[[1,1,1],[1,1,1],[1,1,0]]},{key:'thunderstone',name:'thunderstone',shape:[[0,1,0],[1,1,1],[0,1,0]]},{key:'leafstone',name:'leafstone',shape:[[0,1,0],[1,1,1],[1,1,1]]},{key:'moonstone',name:'moonstone',shape:[[1,1],[1,1]]},{key:'sunstone',name:'sunstone',shape:[[1,0,1],[0,1,0],[1,0,1]]},{key:'nugget',name:'nugget',shape:[[1,1,1],[1,1,1]]},{key:'stardust',name:'stardust',shape:[[1,1],[1,1]]},{key:'helix_fossil',name:'helix_fossil',shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},{key:'dome_fossil',name:'dome_fossil',shape:[[1,1,1],[1,1,1],[0,1,0]]},{key:'old_amber',name:'old_amber',shape:[[1,1],[1,1],[1,1]]},{key:'root_fossil',name:'root_fossil',shape:[[1,1,0],[1,1,1],[0,1,1]]},{key:'claw_fossil',name:'claw_fossil',shape:[[1,0,1],[1,1,1],[1,0,1]]},{key:'fossil',name:'fossil',shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]}]);
  const FOSSIL_REVIVE_MAP = Object.freeze({fossil:138,helix_fossil:138,dome_fossil:140,old_amber:142,root_fossil:345,claw_fossil:347});

  function calculateBaseDamage(params) { return Math.max(1, Math.floor(((2 * params.level / 5 + 2) * params.power * params.attack / params.defense / 50 + 2) * params.stab * params.effectiveness * params.critical * params.random * params.item)); }
  window.PokeWorldDomain = { typeSystem: { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText }, damage: { calculateBaseDamage }, market: { MARKET_STOCK, getPokemonPrice }, mineData: { MINE_WIDTH: 10, MINE_HEIGHT: 8, MINE_ITEMS }, fossils: { FOSSIL_REVIVE_MAP } };



  function createInitialGameState() {
    return { location:'pallet', region:'kanto', team:[], inventory:{}, money:2000, badges:[], defeatedChamps:{}, pokedex:{}, stepsLeft:0, starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{}, teamSlotItems:[], evolvedSpecies:[], dupeCatches:{}, lang:'fr', storyIdx:0, storyProgress:0, unlockedTalents:{}, activeQuests:[], repeatables:[], visitedMaps:{}, completedQuests:{}, wildWinsByLoc:{}, regionLeagueWon:{}, playTimeMs:0, saveMeta:{}, tutorial:{ enabled:true, completed:{}, dismissedTips:{}, rewards:{} }, routeEvents:{ seen:{}, active:null, history:[], cooldowns:{} } };
  }
  function createInitialBattleState() {
    return { active:false, enemy:null, enemyPoke:null, playerPokeIdx:0, isChamp:false, champId:null, champPokeIdx:0, turnLocked:false, escaped:false, chill:false, playerMods:{atk:1,def:1,spe:1}, enemyMods:{atk:1,def:1,spe:1}, log:[], sessionCatches:[], sessionItems:{}, sessionWins:0, sessionPlayerKOs:0, sessionStartedAt:0, sessionDamageByPokemon:{}, pendingLeave:false, pendingSwitchIdx:null, weather:'none', terrain:'none', weatherTurns:0, terrainTurns:0 };
  }
  window.PokeWorldState = { gameState: createInitialGameState(), createInitialGameState };
  window.PokeWorldBattleState = { battleState: createInitialBattleState(), createInitialBattleState };


  function installLegacyGlobalsClassic() {
    window.safeStorage = window.PokeWorldCore.storage;
    window.G = window.PokeWorldState.gameState;
    window.battle = window.PokeWorldBattleState.battleState;
    window.EVENTS = window.PokeWorldEventBus.EVENTS;
    window.EventBus = window.PokeWorldEventBus.eventBus;
    if (typeof globalThis !== 'undefined') { globalThis.EVENTS = window.EVENTS; globalThis.EventBus = window.EventBus; } // absorbs retired src/game/core/event-bus.js (wave 33)
    window.TYPES = window.PokeWorldDomain.typeSystem.TYPES;
    window.TYPE_COLORS = window.PokeWorldDomain.typeSystem.TYPE_COLORS;
    window.CHART = window.PokeWorldDomain.typeSystem.TYPE_CHART;
    window.typeEff = function (attackType, defendType1, defendType2) { return window.PokeWorldDomain.typeSystem.typeEffect(attackType, defendType1, defendType2); };
    window.effText = function (multiplier) { return window.PokeWorldDomain.typeSystem.effectivenessText(multiplier, window.t); };
    window.rand = function (min, max) { return window.PokeWorldCore.randomInt(min, max); };
    window.chance = function (percent) { return window.PokeWorldCore.chancePercent(percent); };
    window.clamp = function (value, min, max) { return window.PokeWorldCore.clamp(value, min, max); };
    window.notify = function (message, color) {
      // Wave 19 (ECS DS): same DS toast as util.js — the kind mapping is
      // delegated to the single pwToastKind helper (success ≈ historical
      // default when the helper is not loaded yet).
      const element = document.getElementById('notif');
      if (!element) return;
      const kind = (typeof window.pwToastKind === 'function') ? window.pwToastKind(color) : (color ? 'neutral' : 'success');
      element.textContent = message;
      element.className = 'pw-toast pw-toast--' + kind;
      void element.offsetWidth; // restart the entrance animation
      element.classList.add('is-visible');
      element.style.display = 'block';
      clearTimeout(element._t);
      element._t = setTimeout(function () { element.style.display = 'none'; element.classList.remove('is-visible'); }, 2500);
    };
    window.setMsg = function (message) { window.notify(message); };
    window.addBattleLog = function (message) {
      if (!window.battle.log) window.battle.log = [];
      window.battle.log.push(message);
      if (window.battle.log.length > 60) window.battle.log.shift();
      const modal = document.getElementById('battle-summary-modal');
      if (modal && modal.classList.contains('open') && typeof window.renderBattleSummary === 'function') window.renderBattleSummary();
    };
    window.clearBattleLog = function () { window.battle.log = []; };
    window.typeClass = function (type) { return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
    window.typeSpan = function (type) { return '<span class="type-badge ' + window.typeClass(type) + '">' + type + '</span>'; };
    window.hpColor = function (percent) { if (percent > 0.5) return 'var(--green)'; if (percent > 0.25) return 'var(--light2)'; return 'var(--red)'; };
  }


  installLegacyGlobalsClassic();

  function uiIconHtml(name, size, fallback) {
    if (typeof window.getIcon === 'function') return window.getIcon(name, size || 14);
    return fallback || '';
  }
  function uiButtonHtml(options) {
    options = options || {};
    const label = options.label || '';
    const icon = options.icon || '';
    const call = options.call || '';
    const args = options.args == null ? '' : String(options.args).replace(/"/g, '&quot;');
    const variant = options.variant || 'secondary';
    const active = !!options.active;
    const extraClass = options.extraClass || '';
    const disabled = !!options.disabled;
    const dataAction = options.dataAction || 'legacy-call';
    const classes = ['hbtn', 'ui-btn', 'ui-btn--' + variant];
    if (active) classes.push('is-active');
    if (extraClass) classes.push(extraClass);
    const attrs = [];
    if (disabled) attrs.push('disabled');
    if (dataAction) attrs.push('data-action="' + dataAction + '"');
    if (call) attrs.push('data-call="' + call + '"');
    if (args !== '') attrs.push('data-call-args="' + args + '"');
    return '<button class="' + classes.join(' ') + '" ' + attrs.join(' ') + '>' + (icon ? '<span class="ui-btn-icon">' + icon + '</span>' : '') + '<span class="ui-btn-label">' + label + '</span></button>';
  }
  function uiTabButtonHtml(options) {
    options = options || {};
    options.variant = 'tab';
    options.extraClass = ((options.extraClass || '') + ' ui-tab-btn').trim();
    return uiButtonHtml(options);
  }
  function uiStatChipHtml(label, value) {
    return '<span class="ui-stat-chip"><b>' + value + '</b><small>' + label + '</small></span>';
  }
  window.uiIconHtml = uiIconHtml;
  window.uiButtonHtml = uiButtonHtml;
  window.uiTabButtonHtml = uiTabButtonHtml;
  window.uiStatChipHtml = uiStatChipHtml;

  function applyMobileView() {
    const mobile = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 850px), (pointer: coarse)').matches : false;
    document.body.classList.toggle('mobile-mode', mobile);
    const allWins = Array.prototype.slice.call(document.querySelectorAll('#main-dashboard .dash-win'));
    if (!mobile) {
      allWins.forEach(function(win){ win.classList.remove('mobile-visible'); win.style.removeProperty('display'); });
      const subOff = document.querySelector('.mobile-subnav-bar');
      if (subOff) subOff.style.display = 'none';
      return;
    }
    const view = document.body.dataset.mobileView || 'adventure';
    const manageView = document.body.dataset.mobileManageView || 'hatchery';
    let visible = [];
    // Wave 15 (user feedback): quests live with adventure (under the lieu
    // window), and shortcuts are their own top-level view, out of Gestion.
    if (view === 'adventure') visible = ['win-map', 'win-tabs', 'win-story'];
    else if (view === 'combat') visible = ['win-battle'];
    else if (view === 'team') visible = ['win-team'];
    else if (view === 'quests') visible = ['win-map', 'win-tabs', 'win-story']; // legacy saved state → adventure
    else if (view === 'shortcuts') visible = ['win-shortcuts'];
    else visible = ({hatchery:['win-hatchery'], training:['win-training'], mine:['win-mine'], base:['win-base']})[manageView] || ['win-hatchery'];
    allWins.forEach(function(win){
      const show = visible.indexOf(win.id) !== -1;
      win.classList.toggle('mobile-visible', show);
      win.style.display = show ? 'flex' : 'none';
    });
    Array.prototype.slice.call(document.querySelectorAll('.mobile-nav-bar [data-mobile-view]')).forEach(function(btn){ btn.classList.toggle('active', btn.dataset.mobileView === view); });
    Array.prototype.slice.call(document.querySelectorAll('.mobile-subnav-bar [data-mobile-manage-view]')).forEach(function(btn){ btn.classList.toggle('active', btn.dataset.mobileManageView === manageView); });
    const sub = document.querySelector('.mobile-subnav-bar');
    if (sub) sub.style.display = view === 'manage' ? 'flex' : 'none';
  }
  // Wave 29 (user): switching the mobile view presents the window AT THE TOP
  // — before, the page kept whatever scroll depth the previous view had, so
  // the freshly shown window could land anywhere but the top.
  function pwScrollTopForMobileView() {
    if (document.body.classList.contains('mobile-mode')) {
      try { window.scrollTo(0, 0); } catch (_) {}
    }
  }
  function setMobileView(view) { document.body.dataset.mobileView = view || 'adventure'; applyMobileView(); pwScrollTopForMobileView(); }
  function setMobileManageView(view) { document.body.dataset.mobileView = 'manage'; document.body.dataset.mobileManageView = view || 'hatchery'; applyMobileView(); pwScrollTopForMobileView(); }
  window.applyMobileView = applyMobileView;
  window.setMobileView = setMobileView;
  window.setMobileManageView = setMobileManageView;
  // Wave 42 — engine-registry absorption (same template as pwInfoBack below):
  // registry-first dispatcher, window surface kept.
  try { if (typeof PokeActions !== 'undefined' && PokeActions) PokeActions.register('setMobileView', setMobileView); } catch (_) {}
  try { if (typeof PokeActions !== 'undefined' && PokeActions) PokeActions.register('setMobileManageView', setMobileManageView); } catch (_) {}
  if (!document.body.dataset.mobileView) document.body.dataset.mobileView = 'adventure';
  if (!document.body.dataset.mobileManageView) document.body.dataset.mobileManageView = 'hatchery';
  window.addEventListener('resize', applyMobileView, { passive: true });
  window.addEventListener('orientationchange', applyMobileView, { passive: true });

  validateBrowserSave();
  applyMobileWindowDragPolicy();
  applyMobileView();
})();



/* Mark the poke-modal as an "info panel" (move/item/talent)
   so #poke-modal-inner uses the unified canonical width. */
function pwModalInfo(on) {
  const m = document.getElementById('poke-modal');
  if (m) m.classList.toggle('pw-info-modal', !!on);
  // Wave 29: every info sheet (move / item / ability) passes here — clear
  // the stale management-shell class so their canonical pill header spans
  // the REAL content box (backdrop/Escape closes of a management menu left
  // "management-inner" stuck on the shared shell, padding it at 16px).
  if (on) {
    const i = document.getElementById('poke-modal-inner');
    if (i) i.classList.remove('management-inner');
  }
};

// ─── Contextual navigation of the info panels (move / item / ability) ──
// Each info panel remembers where it was opened from ("last visited menu")
// so that the close cross and the bottom button lead back to that menu, with an
// adapted label (e.g. "<- back to the Dictionary", "<- back to the Bag"…).
// Shared global cell (the dispatcher and the sheets write/read it) —
// “one slot in the global object” semantics kept exactly.
if (typeof window !== 'undefined') window._pwInfoSource = null;
if (typeof globalThis !== 'undefined') globalThis._pwInfoSource = null;

// Fullscreen panel mapping -> i18n key of the back button
const PW_FS_BACK_KEYS = {
  inventory: 'back_to_inventory',
  shop: 'back_to_shop',
  market: 'back_to_market',
  pokedex: 'back_to_pokedex',
  dictionary: 'back_to_dictionary',
  guide: 'back_to_guide',
  atoll: 'back_to_atoll',
  presets: 'back_to_presets'
};

// Deduce the current source at the moment an info panel opens.
function pwInfoCaptureSource() {
  // Phase 25 — legacy feature update
  // (marker set by openItemInfoFromEquip just before) — the back action must
  // return to the equipment selector.
  if (window._pwEquipInfoFrom != null) {
    return { kind: 'equip-select', teamIdx: Number(window._pwEquipInfoFrom) };
  }
  // 1) Opened from a Pokemon sheet (team or box) — only if the
  // modal is actually open on this sheet. Otherwise, after closing a
  // box sheet, window._pwPokeSheet would stay a "ghost" and an info panel
  // then opened (e.g. from the team window) would wrongly lead back to
  // Phase 6 — legacy feature update
  const pm = document.getElementById('poke-modal');
  const sheetOpen = !!(pm && pm.classList && pm.classList.contains('open'));
  if (sheetOpen && window._pwPokeSheet && (window._pwPokeSheet.kind === 'team' || window._pwPokeSheet.kind === 'box')) {
    return { kind: window._pwPokeSheet.kind, idx: window._pwPokeSheet.idx, boxId: window._pwPokeSheet.boxId };
  }
  // Phase 25 — legacy feature update
  // the fullscreen atoll panel stays open behind, but the back action must
  // return to the atoll preparation.
  if (window._atollPrepOpen) {
    return { kind: 'atoll-prep' };
  }
  // Phase 27 — legacy feature update
  if (window._presetEditorOpen) {
    return { kind: 'preset-editor', presetKey: window._presetEditorOpen };
  }
  // 2) Opened from a fullscreen panel (dictionary, bag, pokedex…)
  if (window._fsCurrentPanel) {
    return { kind: 'fs', panel: window._fsCurrentPanel };
  }
  return null;
};

function pwInfoBackLabel() {
  const src = window._pwInfoSource;
  if (!src) return (typeof t === 'function' ? (t('close') || 'Fermer') : 'Fermer');
  let key = null;
  if (src.kind === 'fs') key = window.PW_FS_BACK_KEYS[src.panel] || null;
  // back reopens the Pokemon SHEET (not the team/box window itself):
  // Phase 6 — legacy feature update
  else if (src.kind === 'team' || src.kind === 'box') key = 'back_to_pokemon';
  // Phase 25: item sheet opened from the equipment selector → back
  // to the item choice; info panel opened from the Factory preparation →
  // back to the preparation.
  else if (src.kind === 'equip-select') key = 'back_to_equip_selector';
  else if (src.kind === 'atoll-prep') key = 'back_to_atoll_prep';
  else if (src.kind === 'preset-editor') key = 'back_to_preset_editor';
  const fallback = '← Retour';
  if (key && typeof t === 'function') { const v = t(key); if (v && v !== key) return v; }
  return fallback;
};

function pwInfoClearSource() {
  window._pwInfoSource = null;
};

// ─── Shared builder for info panels (move / item / talent) ───
// SINGLE structure: canonical header + framed .pw-panel sections
// + .pw-info-row-between rows + contextual back button.
function pwBuildInfoPanel(opts) {
  opts = opts || {};
  // Wave 9 (ECS DS): the shell is rendered from zero by InfoPanelView —
  // this remains the single integration point used by the move/item/talent
  // panels (same signature, same returned HTML string, same contracts:
  // exactly two [data-action="pw-info-back"] controls, pw-info-* classes).
  const views = (window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if (!views || typeof views.InfoPanelView !== 'function') throw new Error('[ui] PokeUI views not loaded (InfoPanelView)');
  const backLabel = window.pwInfoBackLabel();
  return views.InfoPanelView.toHTML({
    iconHtml: opts.icon || '',
    title: opts.title || '',
    subtitle: opts.subtitle || '',
    statCards: opts.statCards || [],
    sections: opts.sections || [],
    rows: opts.rows || [],
    rowsTitle: opts.rowsTitle || '',
    backLabel: backLabel,
  });
};

function pwInfoBack() {
  const src = window._pwInfoSource;
  window._pwInfoSource = null;
  try {
    if (src && src.kind === 'fs') { callGlobal('openFullscreenPanel', src.panel); return; }
    if (src && src.kind === 'team' && src.idx != null) { callGlobal('openPokeModal', src.idx); return; }
    if (src && src.kind === 'box' && src.boxId != null) { callGlobal('openBoxPokeModal', src.boxId); return; }
    // Phase 25: return to the equipment selector (bag "equip") and to the
    // atoll Factory preparation panel.
    if (src && src.kind === 'equip-select' && src.teamIdx != null) { callGlobal('openItemSelector', src.teamIdx); return; }
    if (src && src.kind === 'atoll-prep') { callGlobal('openAtollFactoryPrep'); return; }
    if (src && src.kind === 'preset-editor' && src.presetKey != null) { callGlobal('openPresetEditor', src.presetKey); return; }
  } catch (_) {}
  const pm = document.getElementById('poke-modal');
  if (pm) pm.classList.remove('open');
};

// T2-C (wave 38): the info-panel helpers no longer write onto window in the
// clear — surface kept under double guard (browser / VM harness).
if (typeof window !== 'undefined') {
  window.pwModalInfo = pwModalInfo; window.pwInfoCaptureSource = pwInfoCaptureSource;
  window.pwInfoBackLabel = pwInfoBackLabel; window.pwInfoClearSource = pwInfoClearSource;
  window.pwBuildInfoPanel = pwBuildInfoPanel; window.pwInfoBack = pwInfoBack;
  window.PW_FS_BACK_KEYS = PW_FS_BACK_KEYS;
}
if (typeof globalThis !== 'undefined') {
  globalThis.pwModalInfo = pwModalInfo; globalThis.pwInfoCaptureSource = pwInfoCaptureSource;
  globalThis.pwInfoBackLabel = pwInfoBackLabel; globalThis.pwInfoClearSource = pwInfoClearSource;
  globalThis.pwBuildInfoPanel = pwBuildInfoPanel; globalThis.pwInfoBack = pwInfoBack;
  globalThis.PW_FS_BACK_KEYS = PW_FS_BACK_KEYS;
}

// T2-C phase 2 (wave 39): pwInfoBack is also an engine registry ACTION —
// the dispatcher resolves it registry-first; window stays the documented
// fallback for registry-less VM harnesses.
try { if (typeof PokeActions !== 'undefined' && PokeActions) PokeActions.register('pwInfoBack', pwInfoBack); } catch (_) {}



(function () {
  function installStaticI18nBindings() {
    const bindings = [
      ['#settings-title','settings_title'], ['#settings-inner .settings-section:nth-of-type(1) h3','lang_title'],
      ['#settings-inner .settings-section:nth-of-type(2) h3','theme_title'], ['[data-theme-btn="dark"]','theme_dark'],
      ['[data-theme-btn="light"]','theme_light'], ['[data-theme-btn="gameboy"]','theme_gameboy'], ['[data-theme-btn="fire"]','theme_fire'],
      ['#settings-inner .settings-section:nth-of-type(4) h3','save_title'], ['[data-action="save-game"]','save_btn'],
      ['[data-action="load-game"]','load_btn'], ['[data-action="export-save"]','export_btn'], ['label[for="import-file"]','import_btn'],
      ['[data-action="confirm-delete"]','delete_save_btn'], ['[data-action="do-delete"]','confirm_delete_btn'], ['[data-action="cancel-delete"]','cancel_btn'],
      ['#confirm-yes','confirm_btn'], ['[data-action="close-confirm"]','cancel_btn'], ['.mobile-nav-bar [data-mobile-view="adventure"]','adventure_tab'],
      ['#mine-win-title','mine_window_title'], ['#map-region-select option[value="kanto"]','map_region_kanto'], ['#map-region-select option[value="johto"]','map_region_johto'],
      ['#usm-search','search_by_name:placeholder'], ['#battle-summary-title','battle_summary_title'],
      ['#loot-restart-btn','loot_restart_btn'], ['#loot-continue-btn','loot_continue_btn'], ['#debug-drawer .pw-static-068 span','debug_menu_title_short'],
      ['#debug-drawer [data-action="debug-give-money"]','debug_money'], ['#debug-drawer [data-action="debug-give-candies"]','debug_candies'],
      ['#debug-drawer [data-action="debug-unlock-badges"]','debug_badges'], ['#debug-drawer [data-action="debug-fill-mine"]','debug_mine'],
      ['#debug-drawer [data-action="debug-give-ct-cs"]','debug_ctcs'], ['#debug-drawer [data-call="debugTimeSkip30Minutes"]','debug_afk'],
      ['#debug-toggle-btn','debug_toggle_btn'], ['#victory-title','victory_title'], ['#victory-msg','victory_message'], ['#victory-screen [data-action="close-victory-screen"]','continue_btn']
    ];
    bindings.forEach(function(pair){
      const selector = pair[0];
      const parts = pair[1].split(':');
      const key = parts[0];
      const attr = parts[1];
      document.querySelectorAll(selector).forEach(function(el){
        if (attr === 'placeholder') el.dataset.i18nPlaceholder = key;
        else el.dataset.i18n = key;
      });
    });
    try { if (typeof updateI18nLabels === 'function') updateI18nLabels(); } catch(_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installStaticI18nBindings);
  else installStaticI18nBindings();


  // --- Dynamic styles for file:// mode (data-pct, data-grid-cols, etc.) ---
  function applyDynamicStylesFile(root) {
    root = root || document;
    if (!root.querySelectorAll) return;
    root.querySelectorAll('[data-pct]').forEach(function(el){
      const pct = el.dataset.pct;
      if (pct != null) {
        el.style.setProperty('--pct', pct + '%');
        if (el.classList.contains('stat-fill') || el.classList.contains('location-progress-bar') || el.classList.contains('hatchery-progress') || el.classList.contains('mine-energy-fill') || el.classList.contains('quest-progress-bar') || el.classList.contains('xp-fill') || el.classList.contains('hp-fill') || el.classList.contains('battle-damage-fill')) {
          el.style.width = pct + '%';
        }
      }
      if (el.dataset.bg) {
        el.style.setProperty('--bg', el.dataset.bg);
        el.style.background = el.dataset.bg;
      }
    });
    root.querySelectorAll('[data-grid-cols]').forEach(function(el){
      el.style.gridTemplateColumns = 'repeat(' + el.dataset.gridCols + ', 1fr)';
    });
    root.querySelectorAll('[data-bg]').forEach(function(el){
      if (!el.dataset.pct) { // avoid double handling
        // Only set if not already handled
        if (el.classList.contains('mine-tile') || el.classList.contains('mine-revealed-item') || el.classList.contains('starter-card--custom') || el.classList.contains('poke-sprite--custom') || el.classList.contains('starter-choose-btn')) {
          el.style.background = el.dataset.bg;
        }
      }
    });
    root.querySelectorAll('[data-type-color]').forEach(function(el){
      const color = el.dataset.typeColor;
      if (color) {
        el.style.setProperty('--type-color', color);
        if (el.classList.contains('type-badge') || el.classList.contains('move-desc-badge') || el.classList.contains('status-badge')) el.style.background = color;
      }
    });
  }
  // FIX (2026-08): several modules (training.js, fullscreen-panel.js,
  // poke-modal.js) call applyDynamicStyles(el) as a free identifier under a
  // `typeof === 'function'` guard — never exposed, the dynamic styles
  // (--pct bars, width, grids) were therefore NEVER applied on those
  // panels. Canonical exposure below.
  function applyDynamicStyles(root){ applyDynamicStylesFile(root || document); }
  if (typeof window !== 'undefined') window.applyDynamicStyles = applyDynamicStyles;
  if (typeof globalThis !== 'undefined') globalThis.applyDynamicStyles = applyDynamicStyles;

  // Initial apply and observer
  try {
    applyDynamicStylesFile(document);
    if (typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if (m.type === 'childList') {
          m.addedNodes.forEach(function(node){
            if (node.nodeType === 1) applyDynamicStylesFile(node);
          });
        }
        if (m.type === 'attributes' && (m.attributeName === 'data-pct' || m.attributeName === 'data-grid-cols' || m.attributeName === 'data-type-color')) {
          applyDynamicStylesFile(m.target.parentElement || m.target);
        }
      });
    });
    obs.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['data-pct','data-bg','data-grid-cols','data-type-color']});
  } catch(_){}

  // Fix debug toggle to use class open
  function fixDebugToggle() {
    const btn = document.getElementById('debug-toggle-btn');
    const drawer = document.getElementById('debug-drawer');
    if (!btn || !drawer) return;
    // Ensure drawer hidden initially
    if (!drawer.classList.contains('open') && drawer.style.display !== 'flex') {
      // keep hidden via CSS, nothing
    }
    btn.addEventListener('click', function(e){
      e.preventDefault();
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) {
        drawer.style.display = 'flex';
      } else {
        drawer.style.display = 'none';
      }
    });
  }
  // Try to fix after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixDebugToggle);
  } else {
    fixDebugToggle();
  }

  // no more Proxy – deduplication handled at init in save.js via deduplicateCollectionAndFixBox()
})();


// Wave 41 — native ESM module WITHOUT touching the internal IIFEs: re-reading
// the kept surfaces the bridge places on the global object (T2-C double guards) —
// boot order and closure scopes strictly unchanged.
const __pwrb = (n) => (typeof globalThis !== 'undefined' && globalThis[n] !== undefined) ? globalThis[n] : undefined;
const PokeWorldCore = __pwrb('PokeWorldCore');
const PokeWorldEventBus = __pwrb('PokeWorldEventBus');
const PokeWorldTimers = __pwrb('PokeWorldTimers');
export {
  PokeWorldCore, PokeWorldEventBus, PokeWorldTimers,
  pwModalInfo, PW_FS_BACK_KEYS,
  pwInfoCaptureSource, pwInfoBackLabel, pwInfoClearSource,
  pwBuildInfoPanel, pwInfoBack,
};
