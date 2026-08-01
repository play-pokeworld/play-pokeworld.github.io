(function () {

/** Garantit l'existence de #poke-modal / #poke-modal-inner (presets, usine, énigmes). */
function ensurePokeModal(){
  try{
    var modal = document.getElementById('poke-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'poke-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = '<div id="poke-modal-inner"></div>';
      (document.body || document.documentElement).appendChild(modal);
      modal.addEventListener('click', function(e){ if(e.target === modal){ modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); modal.classList.remove('atoll-prep-modal'); modal.classList.remove('pw-info-modal'); }});
    }
    var inner = document.getElementById('poke-modal-inner');
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
      const dragEnabled = window.matchMedia('(pointer: fine) and (min-width: 851px)').matches;
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
  window.PokeWorldCore = { storage, randomInt, chancePercent, clamp, timers: PokeWorldTimers };
  window.PokeWorldTimers = PokeWorldTimers;
  window.PokeWorldEventBus = { EVENTS, eventBus };

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
    return { location:'pallet', region:'kanto', team:[], inventory:{}, money:2000, badges:[], defeatedChamps:{}, pokedex:{}, stepsLeft:0, starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{}, teamSlotItems:[], evolvedSpecies:[], dupeCatches:{}, lang:'en', storyIdx:0, storyProgress:0, unlockedTalents:{}, activeQuests:[], repeatables:[], visitedMaps:{}, completedQuests:{}, wildWinsByLoc:{}, regionLeagueWon:{}, playTimeMs:0, saveMeta:{}, tutorial:{ enabled:true, completed:{}, dismissedTips:{}, rewards:{} }, routeEvents:{ seen:{}, active:null, history:[], cooldowns:{} } };
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
    window.TYPES = window.PokeWorldDomain.typeSystem.TYPES;
    window.TYPE_COLORS = window.PokeWorldDomain.typeSystem.TYPE_COLORS;
    window.CHART = window.PokeWorldDomain.typeSystem.TYPE_CHART;
    window.typeEff = function (attackType, defendType1, defendType2) { return window.PokeWorldDomain.typeSystem.typeEffect(attackType, defendType1, defendType2); };
    window.effText = function (multiplier) { return window.PokeWorldDomain.typeSystem.effectivenessText(multiplier, window.t); };
    window.rand = function (min, max) { return window.PokeWorldCore.randomInt(min, max); };
    window.chance = function (percent) { return window.PokeWorldCore.chancePercent(percent); };
    window.clamp = function (value, min, max) { return window.PokeWorldCore.clamp(value, min, max); };
    window.notify = function (message, color) {
      const element = document.getElementById('notif');
      if (!element) return;
      element.textContent = message;
      element.style.background = color || 'var(--green)';
      element.style.display = 'block';
      clearTimeout(element._t);
      element._t = setTimeout(function () { element.style.display = 'none'; }, 2500);
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
    var label = options.label || '';
    var icon = options.icon || '';
    var call = options.call || '';
    var args = options.args == null ? '' : String(options.args).replace(/"/g, '&quot;');
    var variant = options.variant || 'secondary';
    var active = !!options.active;
    var extraClass = options.extraClass || '';
    var disabled = !!options.disabled;
    var dataAction = options.dataAction || 'legacy-call';
    var classes = ['hbtn', 'ui-btn', 'ui-btn--' + variant];
    if (active) classes.push('is-active');
    if (extraClass) classes.push(extraClass);
    var attrs = [];
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
    var mobile = window.matchMedia('(max-width: 850px), (pointer: coarse)').matches;
    document.body.classList.toggle('mobile-mode', mobile);
    var allWins = Array.prototype.slice.call(document.querySelectorAll('#main-dashboard .dash-win'));
    if (!mobile) {
      allWins.forEach(function(win){ win.classList.remove('mobile-visible'); win.style.removeProperty('display'); });
      var subOff = document.querySelector('.mobile-subnav-bar');
      if (subOff) subOff.style.display = 'none';
      return;
    }
    var view = document.body.dataset.mobileView || 'adventure';
    var manageView = document.body.dataset.mobileManageView || 'hatchery';
    var visible = [];
    if (view === 'adventure') visible = ['win-map', 'win-tabs'];
    else if (view === 'combat') visible = ['win-battle'];
    else if (view === 'team') visible = ['win-team'];
    else if (view === 'quests') visible = ['win-story'];
    else visible = ({hatchery:['win-hatchery'], training:['win-training'], mine:['win-mine'], shortcuts:['win-shortcuts'], base:['win-base']})[manageView] || ['win-hatchery'];
    allWins.forEach(function(win){
      var show = visible.indexOf(win.id) !== -1;
      win.classList.toggle('mobile-visible', show);
      win.style.display = show ? 'flex' : 'none';
    });
    Array.prototype.slice.call(document.querySelectorAll('.mobile-nav-bar [data-mobile-view]')).forEach(function(btn){ btn.classList.toggle('active', btn.dataset.mobileView === view); });
    Array.prototype.slice.call(document.querySelectorAll('.mobile-subnav-bar [data-mobile-manage-view]')).forEach(function(btn){ btn.classList.toggle('active', btn.dataset.mobileManageView === manageView); });
    var sub = document.querySelector('.mobile-subnav-bar');
    if (sub) sub.style.display = view === 'manage' ? 'flex' : 'none';
  }
  function setMobileView(view) { document.body.dataset.mobileView = view || 'adventure'; applyMobileView(); }
  function setMobileManageView(view) { document.body.dataset.mobileView = 'manage'; document.body.dataset.mobileManageView = view || 'hatchery'; applyMobileView(); }
  window.applyMobileView = applyMobileView;
  window.setMobileView = setMobileView;
  window.setMobileManageView = setMobileManageView;
  if (!document.body.dataset.mobileView) document.body.dataset.mobileView = 'adventure';
  if (!document.body.dataset.mobileManageView) document.body.dataset.mobileManageView = 'hatchery';
  window.addEventListener('resize', applyMobileView, { passive: true });
  window.addEventListener('orientationchange', applyMobileView, { passive: true });

  function callGlobal(name) {
    const args = Array.prototype.slice.call(arguments, 1);
    const fn = window[name];
    if (typeof fn === 'function') return fn.apply(window, args);
    return undefined;
  }
  // Exposé : pwInfoBack / pwBuildInfoPanel sont définis hors de cette IIFE
  // et en ont besoin (sinon ReferenceError silencieux -> retour contextuel KO).
  window.callGlobal = callGlobal;

  function toggleDebugDrawerDirect() {
    var drawer = document.getElementById('debug-drawer');
    if (!drawer) return;
    drawer.style.display = getComputedStyle(drawer).display === 'none' ? 'flex' : 'none';
  }

  function splitLegacyArgs(raw) {
    var parts = [];
    var current = '';
    var quote = null;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw[i];
      var prev = raw[i - 1];
      if ((ch === '"' || ch === "'") && prev !== '\\') {
        if (quote === ch) quote = null;
        else if (!quote) quote = ch;
        current += ch;
        continue;
      }
      if (ch === ',' && !quote) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  function resolveLegacyArg(token, event, element) {
    var value = String(token || '').trim();
    if (!value) return undefined;
    if (value === 'event') return event;
    if (value === 'this.value' || value === 'element.value') return element && element.value;
    if (value === 'this.checked' || value === 'element.checked') return !!(element && element.checked);
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if ((value[0] === "'" && value[value.length - 1] === "'") || (value[0] === '"' && value[value.length - 1] === '"')) {
      return value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\"/g, '"');
    }
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    return value;
  }

  function parseLegacyArgs(raw, event, element) {
    if (!raw || !raw.trim()) return [];
    try { return splitLegacyArgs(raw).map(function (token) { return resolveLegacyArg(token, event, element); }); }
    catch (_) { return []; }
  }

  function closeNearestModal(closeButton) {
    if (closeButton.closest('#settings-modal')) return callGlobal('closeSettings');
    if (closeButton.closest('#unified-selector-modal')) return callGlobal('closeUnifiedSelectorModal');
    if (closeButton.closest('#battle-summary-modal')) return callGlobal('closeBattleSummary');
    if (closeButton.closest('#confirm-modal')) return callGlobal('closeConfirm');
    if (closeButton.closest('#fullscreen-panel-modal')) return callGlobal('closeFullscreenPanel');
    const pokeModal = document.getElementById('poke-modal');
    if (pokeModal && closeButton.closest('#poke-modal')) {
      pokeModal.classList.remove('open');
      pokeModal.classList.remove('atoll-prep-modal');
      // Purge de la fiche mémorisée (sinon elle devient une source « fantôme »
      // pour le prochain panneau d'info, cf. retour utilisateur passe 6).
      window._pwPokeSheet = null;
      window._pwInfoSource = null;
      window._atollPrepOpen = false; // passe 25 : préparation Usine refermée
    }
    const mapHelp = document.getElementById('map-help-modal');
    if (mapHelp && closeButton.closest('#map-help-modal')) mapHelp.classList.toggle('open');
    return undefined;
  }

  function runAction(element, event) {
    const action = element.dataset.action;
    if (!action) return false;
    if (action === 'legacy-call') { callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); return true; }
    if (action === 'legacy-call-stop') { event.stopPropagation(); callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); return true; }
    if (action === 'call-close-poke') { callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); var pm = document.getElementById('poke-modal'); if (pm) pm.classList.remove('open'); return true; }
    if (action === 'call-close-selector') { callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); callGlobal('closeUnifiedSelectorModal'); return true; }
    if (action === 'close-poke-modal') { window._moveInfoContext = element.dataset.resetMoveInfo ? null : window._moveInfoContext; window.boxMoveReplaceSlot = element.dataset.resetBoxMove ? null : window.boxMoveReplaceSlot; window.moveEditorFor = element.dataset.resetMoveEditor ? null : window.moveEditorFor; window._pwPokeSheet = null; window._pwInfoSource = null; window._atollPrepOpen = false; var pm2 = document.getElementById('poke-modal'); if (pm2) { pm2.classList.remove('open'); pm2.classList.remove('atoll-prep-modal'); } if (window._presetEditorReturn) { var _pmPk = window._presetEditorReturn; window._presetEditorReturn = null; callGlobal('openPresetEditor', _pmPk); } else { window._presetEditorOpen = null; if (pm2) pm2.classList.remove('preset-editor-modal'); } return true; }
    if (action === 'cancel-box-move-replace') { window.boxMoveReplaceSlot = null; callGlobal('openBoxPokeModal', element.dataset.boxId); return true; }
    if (action === 'cancel-move-replace') { window.moveReplaceSlot = null; callGlobal('openPokeModal', Number(element.dataset.teamIndex)); return true; }
    if (action === 'back-to-move-context') { if (window._moveInfoContext && window._moveInfoContext.boxId) callGlobal('openBoxPokeModal', window._moveInfoContext.boxId); else if (window._moveInfoContext && window._moveInfoContext.idx !== null) callGlobal('openPokeModal', window._moveInfoContext.idx); else { var pm3 = document.getElementById('poke-modal'); if (pm3) pm3.classList.remove('open'); } return true; }
    if (action === 'pw-info-back') { if (typeof window.pwInfoBack === 'function') window.pwInfoBack(); return true; }
    if (action === 'hide-element') { var target = document.getElementById(element.dataset.targetElement); if (target) target.style.display = 'none'; return true; }
    if (action === 'stop-propagation') { event.stopPropagation(); return true; }
    if (action === 'select-self') { if (typeof element.select === 'function') element.select(); return true; }
    if (action === 'set-usm-subtab') { window._usmSubTab = element.dataset.subtab; callGlobal('renderUnifiedGrid'); return true; }
    if (action === 'close-selector-show-tab') { callGlobal('closeUnifiedSelectorModal'); callGlobal('showTab', element.dataset.tab); return true; }
    if (action === 'return-inventory') { var fsM = document.getElementById('fullscreen-panel-modal'); if (fsM && fsM.style.display === 'flex') callGlobal('renderInventory', document.getElementById('fs-panel-content')); else callGlobal('showTab', 'inventory'); return true; }
    if (action === 'generate-mine-layer') { callGlobal('generateMineLayer'); callGlobal('renderMineWindow'); return true; }
    const actionMap = {
      'open-settings': ['openSettings'], 'close-settings': ['closeSettings'], 'set-language': ['setLanguage', element.dataset.lang], 'set-theme': ['setTheme', element.dataset.themeValue],
      'save-game': ['saveGame', true], 'load-game': ['loadGame', true], 'export-save': ['exportSave'], 'confirm-delete': ['confirmDelete'], 'do-delete': ['doDelete'], 'cancel-delete': ['cancelDelete'],
      'close-confirm': ['closeConfirm'], 'scroll-to-window': ['scrollToWin', element.dataset.targetWindow], 'set-mobile-view': ['setMobileView', element.dataset.mobileView], 'set-mobile-manage-view': ['setMobileManageView', element.dataset.mobileManageView], 'set-battle-speed': ['setBattleSpeed', Number(element.dataset.speed)],
      'open-battle-summary': ['openBattleSummary', false], 'leave-battle': ['doLeaveBattle'], 'show-tab': ['showTab', element.dataset.tab], 'close-unified-selector': ['closeUnifiedSelectorModal'],
      'sort-unified-grid': ['sortUnifiedGrid', element.dataset.sort], 'close-battle-summary': ['closeBattleSummary'], 'restart-last-battle': ['restartLastBattle'],
      'debug-give-money': ['debugGiveMoney'], 'debug-give-ct-cs': ['debugGiveCtCs'], 'debug-give-candies': ['debugGiveCandies'], 'debug-unlock-badges': ['debugUnlockBadges'], 'debug-fill-mine': ['debugFillMine'], 'debug-timeskip-30m': ['debugTimeSkipAfk30Minutes'],
      'toggle-battle-speed-x10': ['toggleBattleSpeedX10'], 'toggle-map-help': ['toggleMapHelp'], 'open-fullscreen-panel': ['openFullscreenPanel', element.dataset.panel], 'open-unified-selector': ['openUnifiedSelectorModal', element.dataset.panel],
      'close-fullscreen-panel': ['closeFullscreenPanel'], 'copy-export-text': ['copyExportText']
    };
    if (action === 'close-victory-screen') { var v = document.getElementById('victory-screen'); if (v) v.classList.remove('open'); return true; }
    if (actionMap[action]) { callGlobal.apply(null, actionMap[action]); return true; }
    return false;
  }

  function installRobustClickFallback() {
    function preflightClickHandler(event) {
      const target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      const closeButton = target.closest('.modal-close');
      // Une croix qui porte un data-action (ex. pw-info-back) passe par le
      // système d'actions : elle ramène au menu d'origine au lieu de fermer
      // aveuglément. Sans data-action, on garde la fermeture générique.
      if (closeButton) {
        if (closeButton.dataset && closeButton.dataset.action && runAction(closeButton, event)) { event.__pokeWorldHandled = true; return; }
        closeNearestModal(closeButton); event.__pokeWorldHandled = true; return;
      }
      if (target.closest('#debug-toggle-btn') || target.closest('[data-action="toggle-debug-menu"]')) { toggleDebugDrawerDirect(); event.__pokeWorldHandled = true; return; }
      const actionElement = target.closest('[data-action]');
      if (actionElement && runAction(actionElement, event)) { event.__pokeWorldHandled = true; return; }
      const teamCard = target.closest('#team-window-body .poke-card');
      if (teamCard && !target.closest('button, .poke-item-badge, .poke-move')) {
        const cards = Array.prototype.slice.call(document.querySelectorAll('#team-window-body .poke-card'));
        const index = cards.indexOf(teamCard);
        if (index >= 0) {
          if (typeof window.onTeamCardClick === 'function') window.onTeamCardClick(event, index);
          else { window._swapFromTeamIdx = index; callGlobal('openUnifiedSelectorModal', 'team'); }
          event.__pokeWorldHandled = true;
        }
      }
    }

    // Passe 16 : filet de sécurité anti « retour en haut » — on fige le scroll
    // des ancêtres du clic (panneaux, listes, page) avant l'action, puis on le
    // remet (synchrone + différé) quoi qu'il arrive, même si l'action a
    // provoqué un re-rendu non couvert par pwSetHtml.
    document.addEventListener('click', function (event) {
      if (event.__pokeWorldHandled) return;
      var _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(event.target) : null;
      try { preflightClickHandler(event); }
      finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
    }, true);

    document.addEventListener('contextmenu', function (event) {
      const target = event.target && event.target.closest ? event.target.closest('[data-context-call]') : null;
      if (!target) return;
      event.preventDefault();
      var _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(target) : null;
      try { callGlobal.apply(null, [target.dataset.contextCall].concat(parseLegacyArgs(target.dataset.contextArgs || '', event, target))); }
      finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
      event.__pokeWorldHandled = true;
    }, true);

    document.addEventListener('change', function (event) {
      const target = event.target && event.target.closest ? event.target.closest('[data-change-call]') : null;
      if (!target) return;
      callGlobal.apply(null, [target.dataset.changeCall].concat(parseLegacyArgs(target.dataset.changeArgs || '', event, target)));
      event.__pokeWorldHandled = true;
    }, true);
  }

  installRobustClickFallback();
  validateBrowserSave();
  applyMobileWindowDragPolicy();
  applyMobileView();
})();



/* Marque le poke-modal comme "panneau d'information" (attaque/objet/talent)
   afin que #poke-modal-inner adopte la largeur canonique unifiée. */
window.pwModalInfo = function pwModalInfo(on) {
  var m = document.getElementById('poke-modal');
  if (m) m.classList.toggle('pw-info-modal', !!on);
};

// ─── Navigation contextuelle des panneaux d'info (attaque / objet / talent) ──
// Chaque panneau d'info mémorise d'où il a été ouvert ("dernier menu visité")
// pour que la croix ET le bouton du bas ramènent à ce menu, avec un libellé
// adapté (ex. « ← Retour au Dictionnaire », « ← Retour au Sac »…).
window._pwInfoSource = null;

// Mapping panneau plein écran -> clé i18n du bouton retour
window.PW_FS_BACK_KEYS = {
  inventory: 'back_to_inventory',
  shop: 'back_to_shop',
  market: 'back_to_market',
  pokedex: 'back_to_pokedex',
  dictionary: 'back_to_dictionary',
  guide: 'back_to_guide',
  atoll: 'back_to_atoll',
  presets: 'back_to_presets'
};

// Déduit la source courante au moment où un panneau d'info s'ouvre.
window.pwInfoCaptureSource = function pwInfoCaptureSource() {
  // 0) Passe 25 : fiche objet ouverte depuis le sélecteur d'ÉQUIPEMENT
  // (indication posée par openItemInfoFromEquip juste avant) — le retour doit
  // rouvrir ce sélecteur, pas le sac global (le sac EST le fsPanel courant).
  if (window._pwEquipInfoFrom != null) {
    return { kind: 'equip-select', teamIdx: Number(window._pwEquipInfoFrom) };
  }
  // 1) Ouvert depuis une fiche Pokémon (équipe ou box) — uniquement si le
  // modal est réellement ouvert sur cette fiche. Sinon, après fermeture d'une
  // fiche box, window._pwPokeSheet resterait « fantôme » et un panneau d'info
  // ouvert ensuite (ex. depuis la fenêtre d'équipe) ramènerait à tort vers
  // cette ancienne fiche box (retour utilisateur, passe 6).
  var pm = document.getElementById('poke-modal');
  var sheetOpen = !!(pm && pm.classList && pm.classList.contains('open'));
  if (sheetOpen && window._pwPokeSheet && (window._pwPokeSheet.kind === 'team' || window._pwPokeSheet.kind === 'box')) {
    return { kind: window._pwPokeSheet.kind, idx: window._pwPokeSheet.idx, boxId: window._pwPokeSheet.boxId };
  }
  // 1b) Passe 25 : ouvert depuis le panneau de préparation Usine (atoll) —
  // le panneau atoll plein écran reste ouvert derrière, mais le retour doit
  // rouvrir la PRÉPARATION, pas l'atoll générique.
  if (window._atollPrepOpen) {
    return { kind: 'atoll-prep' };
  }
  // 1c) Passe 27 : ouvert depuis l'éditeur d'équipe (preset)
  if (window._presetEditorOpen) {
    return { kind: 'preset-editor', presetKey: window._presetEditorOpen };
  }
  // 2) Ouvert depuis un panneau plein écran (dictionnaire, sac, pokédex…)
  if (window._fsCurrentPanel) {
    return { kind: 'fs', panel: window._fsCurrentPanel };
  }
  return null;
};

window.pwInfoBackLabel = function pwInfoBackLabel() {
  var src = window._pwInfoSource;
  if (!src) return (typeof t === 'function' ? (t('close') || 'Fermer') : 'Fermer');
  var key = null;
  if (src.kind === 'fs') key = window.PW_FS_BACK_KEYS[src.panel] || null;
  // Le retour rouvre la FICHE du Pokémon (pas la fenêtre équipe/box elle-même) :
  // le libellé doit donc être « ← Retour au Pokémon » (retour utilisateur, passe 6).
  else if (src.kind === 'team' || src.kind === 'box') key = 'back_to_pokemon';
  // Passe 25 : fiche objet ouverte depuis le sélecteur d'équipement → retour
  // au choix d'objet ; panneau d'info ouvert depuis la préparation Usine →
  // retour à la préparation.
  else if (src.kind === 'equip-select') key = 'back_to_equip_selector';
  else if (src.kind === 'atoll-prep') key = 'back_to_atoll_prep';
  else if (src.kind === 'preset-editor') key = 'back_to_preset_editor';
  var fallback = '← Retour';
  if (key && typeof t === 'function') { var v = t(key); if (v && v !== key) return v; }
  return fallback;
};

window.pwInfoClearSource = function pwInfoClearSource() {
  window._pwInfoSource = null;
};

// ─── Builder commun des panneaux d'info (attaque / objet / talent) ───
// Structure UNIQUE : en-tête canonique + sections encadrées .pw-panel
// + rangées .pw-info-row-between + bouton retour contextuel.
window.pwBuildInfoPanel = function pwBuildInfoPanel(opts) {
  opts = opts || {};
  var backLabel = window.pwInfoBackLabel();
  var html = '<div class="modal-title pw-info-head"><div class="pw-row">'
    + (opts.icon ? '<span class="pw-info-icon">' + opts.icon + '</span>' : '')
    + '<div class="pw-info-head-text"><div class="pw-info-name">' + (opts.title || '') + '</div>'
    + (opts.subtitle ? '<div class="pw-text-sm pw-light1">' + opts.subtitle + '</div>' : '')
    + '</div></div>'
    + '<span class="modal-close" data-action="pw-info-back"></span></div>';
  if (opts.statCards && opts.statCards.length) {
    html += '<div class="pw-info-stat-cards">' + opts.statCards.map(function (c) {
      return '<div class="pw-card-dark pw-center"><div class="pw-text-sm pw-light1">' + c.label + '</div><div class="pw-text-lg pw-bold">' + c.value + '</div></div>';
    }).join('') + '</div>';
  }
  (opts.sections || []).forEach(function (s) {
    html += '<div class="pw-panel pw-info-section">'
      + (s.title ? '<div class="pw-section-title">' + s.title + '</div>' : '')
      + '<div class="pw-info-section-body">' + s.body + '</div></div>';
  });
  if (opts.rows && opts.rows.length) {
    html += '<div class="pw-panel pw-info-section">'
      + (opts.rowsTitle ? '<div class="pw-section-title">' + opts.rowsTitle + '</div>' : '')
      + opts.rows.map(function (r) {
          return '<div class="pw-info-row-between"><span class="pw-text-sm pw-light1">' + r.label + '</span><span class="' + (r.valueClass || 'pw-light2 pw-bold') + '">' + r.value + '</span></div>';
        }).join('')
      + '</div>';
  }
  html += '<div class="pw-flex-center pw-gap-sm pw-info-actions"><button class="hbtn pw-info-back-btn" data-action="pw-info-back">' + backLabel + '</button></div>';
  return html;
};

window.pwInfoBack = function pwInfoBack() {
  var src = window._pwInfoSource;
  window._pwInfoSource = null;
  try {
    if (src && src.kind === 'fs') { callGlobal('openFullscreenPanel', src.panel); return; }
    if (src && src.kind === 'team' && src.idx != null) { callGlobal('openPokeModal', src.idx); return; }
    if (src && src.kind === 'box' && src.boxId != null) { callGlobal('openBoxPokeModal', src.boxId); return; }
    // Passe 25 : retour au sélecteur d'équipement (sac « équiper ») et au
    // panneau de préparation Usine de l'atoll.
    if (src && src.kind === 'equip-select' && src.teamIdx != null) { callGlobal('openItemSelector', src.teamIdx); return; }
    if (src && src.kind === 'atoll-prep') { callGlobal('openAtollFactoryPrep'); return; }
    if (src && src.kind === 'preset-editor' && src.presetKey != null) { callGlobal('openPresetEditor', src.presetKey); return; }
  } catch (_) {}
  var pm = document.getElementById('poke-modal');
  if (pm) pm.classList.remove('open');
};

