(function () {
  const SAVE_KEY = 'pokeworld_save';
  const CURRENT_SAVE_VERSION = 3;

  function validateBrowserSave() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(SAVE_KEY);
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
        window.localStorage.removeItem(SAVE_KEY);
        console.warn('[PokeWorld] Incompatible browser save removed automatically.');
      }
    } catch (error) {
      try { window.localStorage && window.localStorage.removeItem(SAVE_KEY); } catch (_) {}
      console.warn('[PokeWorld] Corrupted browser save removed automatically.', error);
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
  window.PokeWorldCore = { storage, randomInt, chancePercent, clamp };
  window.PokeWorldEventBus = { EVENTS, eventBus };

  const TYPES = Object.freeze(['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']);
  const TYPE_COLORS = Object.freeze({ Normal:'#a8a878',Fire:'#f08030',Water:'#6890f0',Grass:'#78c850',Electric:'#f8d030',Ice:'#98d8d8',Fighting:'#c03028',Poison:'#a040a0',Ground:'#e0c068',Flying:'#a890f0',Psychic:'#f85888',Bug:'#a8b820',Rock:'#b8a038',Ghost:'#705898',Dragon:'#7038f8',Dark:'#705848',Steel:'#b8b8d0',Fairy:'#ee99ac' });
  const TYPE_CHART = Object.freeze({ Normal:{Rock:.5,Steel:.5,Ghost:0}, Fire:{Fire:.5,Water:.5,Rock:.5,Dragon:.5,Grass:2,Ice:2,Bug:2,Steel:2}, Water:{Water:.5,Grass:.5,Dragon:.5,Fire:2,Ground:2,Rock:2}, Grass:{Fire:.5,Grass:.5,Poison:.5,Flying:.5,Bug:.5,Dragon:.5,Steel:.5,Water:2,Ground:2,Rock:2}, Electric:{Grass:.5,Electric:.5,Dragon:.5,Ground:0,Water:2,Flying:2}, Ice:{Water:.5,Ice:.5,Fire:2,Fighting:2,Rock:2,Steel:2,Grass:2,Ground:2,Flying:2,Dragon:2}, Fighting:{Poison:.5,Bug:.5,Psychic:.5,Flying:.5,Fairy:.5,Ghost:0,Normal:2,Ice:2,Rock:2,Dark:2,Steel:2}, Poison:{Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Grass:2,Fairy:2}, Ground:{Grass:.5,Bug:.5,Flying:0,Fire:2,Electric:2,Poison:2,Rock:2,Steel:2}, Flying:{Electric:.5,Rock:.5,Steel:.5,Grass:2,Fighting:2,Bug:2}, Psychic:{Psychic:.5,Steel:.5,Dark:0,Fighting:2,Poison:2}, Bug:{Fire:.5,Fighting:.5,Flying:.5,Ghost:.5,Steel:.5,Fairy:.5,Grass:2,Psychic:2,Dark:2}, Rock:{Fighting:.5,Ground:.5,Steel:.5,Fire:2,Ice:2,Flying:2,Bug:2}, Ghost:{Normal:0,Fighting:0,Ghost:2,Psychic:2}, Dragon:{Steel:.5,Fairy:0,Dragon:2}, Dark:{Fighting:.5,Dark:.5,Fairy:.5,Psychic:2,Ghost:2}, Steel:{Fire:.5,Water:.5,Electric:.5,Steel:.5,Ice:2,Rock:2,Fairy:2}, Fairy:{Fire:.5,Poison:.5,Steel:.5,Fighting:2,Dragon:2,Dark:2} });
  function typeEffect(attackType, defendType1, defendType2) { const first = (TYPE_CHART[attackType] || {})[defendType1] ?? 1; const second = defendType2 ? ((TYPE_CHART[attackType] || {})[defendType2] ?? 1) : 1; return first * second; }
  function effectivenessText(multiplier) { const tr = typeof window.t === 'function' ? window.t : function (key) { return key; }; if(multiplier===0) return tr('eff_immune'); if(multiplier>=4) return tr('eff_super_x4'); if(multiplier>=2) return tr('eff_super'); if(multiplier<=0.25) return tr('eff_very_weak'); if(multiplier<=0.5) return tr('eff_weak'); return ''; }
  
  const MARKET_STOCK = Object.freeze({ kanto: Object.freeze([1,4,7,133,137,106,107,122]), johto: Object.freeze([152,155,158,172,173,174,175,236,196,197,199,213,238,239,240]) });
  function getPokemonPrice(id, pokemonData) { if(id===151) return 100000; if(id===150) return 75000; if([144,145,146].includes(id)) return 50000; const d=pokemonData[id]; if(!d) return 999999; const bst=d[3]+d[4]+d[5]+d[6]; if([1,4,7,152,155,158].includes(id)) return 5000; if([2,5,8].includes(id)) return 8000; if([3,6,9].includes(id)) return 12000; if([138,140].includes(id)) return 8000; if([139,141].includes(id)) return 12000; if([142].includes(id)) return 15000; if([147].includes(id)) return 10000; if([148].includes(id)) return 15000; if([149].includes(id)) return 25000; let mult=12; if(bst>=350) mult=22; else if(bst>=300) mult=18; else if(bst>=250) mult=15; else if(bst>=200) mult=13; return Math.max(1500, Math.floor(bst*mult)); }
  const MINE_ITEMS = Object.freeze([{key:'firestone',name:'firestone',shape:[[1,1,1],[1,1,1],[1,1,1]]},{key:'waterstone',name:'waterstone',shape:[[1,1,1],[1,1,1],[1,1,0]]},{key:'thunderstone',name:'thunderstone',shape:[[0,1,0],[1,1,1],[0,1,0]]},{key:'leafstone',name:'leafstone',shape:[[0,1,0],[1,1,1],[1,1,1]]},{key:'moonstone',name:'moonstone',shape:[[1,1],[1,1]]},{key:'sunstone',name:'sunstone',shape:[[1,0,1],[0,1,0],[1,0,1]]},{key:'nugget',name:'nugget',shape:[[1,1,1],[1,1,1]]},{key:'stardust',name:'stardust',shape:[[1,1],[1,1]]},{key:'helix_fossil',name:'helix_fossil',shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},{key:'dome_fossil',name:'dome_fossil',shape:[[1,1,1],[1,1,1],[0,1,0]]},{key:'old_amber',name:'old_amber',shape:[[1,1],[1,1],[1,1]]},{key:'root_fossil',name:'root_fossil',shape:[[1,1,0],[1,1,1],[0,1,1]]},{key:'claw_fossil',name:'claw_fossil',shape:[[1,0,1],[1,1,1],[1,0,1]]},{key:'fossil',name:'fossil',shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]}]);
  const FOSSIL_REVIVE_MAP = Object.freeze({fossil:138,helix_fossil:138,dome_fossil:140,old_amber:142,root_fossil:138,claw_fossil:140});

  function calculateBaseDamage(params) { return Math.max(1, Math.floor(((2 * params.level / 5 + 2) * params.power * params.attack / params.defense / 50 + 2) * params.stab * params.effectiveness * params.critical * params.random * params.item)); }
  window.PokeWorldDomain = { typeSystem: { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText }, damage: { calculateBaseDamage }, market: { MARKET_STOCK, getPokemonPrice }, mineData: { MINE_WIDTH: 10, MINE_HEIGHT: 8, MINE_ITEMS }, fossils: { FOSSIL_REVIVE_MAP } };



  function createInitialGameState() {
    return { location:'pallet', region:'kanto', team:[], inventory:{}, money:2000, badges:[], defeatedChamps:{}, pokedex:{}, stepsLeft:0, starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{}, teamSlotItems:[], evolvedSpecies:[], dupeCatches:{}, lang:'fr', storyIdx:0, storyProgress:0, unlockedTalents:{}, activeQuests:[], repeatables:[], visitedMaps:{}, completedQuests:{}, wildWinsByLoc:{}, playTimeMs:0, saveMeta:{} };
  }
  function createInitialBattleState() {
    return { active:false, enemy:null, enemyPoke:null, playerPokeIdx:0, isChamp:false, champId:null, champPokeIdx:0, turnLocked:false, escaped:false, chill:false, playerMods:{atk:1,def:1,spe:1}, enemyMods:{atk:1,def:1,spe:1}, log:[], sessionCatches:[], sessionItems:{}, pendingLeave:false, pendingSwitchIdx:null };
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

  function callGlobal(name) {
    const args = Array.prototype.slice.call(arguments, 1);
    const fn = window[name];
    if (typeof fn === 'function') return fn.apply(window, args);
    return undefined;
  }

  function toggleDebugDrawerDirect() {
    var drawer = document.getElementById('debug-drawer');
    if (!drawer) return;
    drawer.style.display = getComputedStyle(drawer).display === 'none' ? 'flex' : 'none';
  }

  function parseLegacyArgs(raw, event, element) {
    if (!raw || !raw.trim()) return [];
    try { return Function('event', 'element', 'return [' + raw + '];').call(element, event, element); }
    catch (_) { return []; }
  }

  function closeNearestModal(closeButton) {
    if (closeButton.closest('#settings-modal')) return callGlobal('closeSettings');
    if (closeButton.closest('#unified-selector-modal')) return callGlobal('closeUnifiedSelectorModal');
    if (closeButton.closest('#battle-summary-modal')) return callGlobal('closeBattleSummary');
    if (closeButton.closest('#confirm-modal')) return callGlobal('closeConfirm');
    if (closeButton.closest('#fullscreen-panel-modal')) return callGlobal('closeFullscreenPanel');
    const pokeModal = document.getElementById('poke-modal');
    if (pokeModal && closeButton.closest('#poke-modal')) pokeModal.classList.remove('open');
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
    if (action === 'close-poke-modal') { window._moveInfoContext = element.dataset.resetMoveInfo ? null : window._moveInfoContext; window.boxMoveReplaceSlot = element.dataset.resetBoxMove ? null : window.boxMoveReplaceSlot; window.moveEditorFor = element.dataset.resetMoveEditor ? null : window.moveEditorFor; var pm2 = document.getElementById('poke-modal'); if (pm2) pm2.classList.remove('open'); return true; }
    if (action === 'cancel-box-move-replace') { window.boxMoveReplaceSlot = null; callGlobal('openBoxPokeModal', element.dataset.boxId); return true; }
    if (action === 'cancel-move-replace') { window.moveReplaceSlot = null; callGlobal('openPokeModal', Number(element.dataset.teamIndex)); return true; }
    if (action === 'back-to-move-context') { if (window._moveInfoContext && window._moveInfoContext.boxId) callGlobal('openBoxPokeModal', window._moveInfoContext.boxId); else if (window._moveInfoContext && window._moveInfoContext.idx !== null) callGlobal('openPokeModal', window._moveInfoContext.idx); else { var pm3 = document.getElementById('poke-modal'); if (pm3) pm3.classList.remove('open'); } return true; }
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
      'close-confirm': ['closeConfirm'], 'scroll-to-window': ['scrollToWin', element.dataset.targetWindow], 'set-battle-speed': ['setBattleSpeed', Number(element.dataset.speed)],
      'open-battle-summary': ['openBattleSummary', false], 'leave-battle': ['doLeaveBattle'], 'show-tab': ['showTab', element.dataset.tab], 'close-unified-selector': ['closeUnifiedSelectorModal'],
      'sort-unified-grid': ['sortUnifiedGrid', element.dataset.sort], 'close-battle-summary': ['closeBattleSummary'], 'restart-last-battle': ['restartLastBattle'],
      'debug-give-money': ['debugGiveMoney'], 'debug-give-candies': ['debugGiveCandies'], 'debug-unlock-badges': ['debugUnlockBadges'], 'debug-fill-mine': ['debugFillMine'], 'debug-timeskip-10m': ['debugTimeSkipAfk10Minutes'],
      'toggle-battle-speed-x10': ['toggleBattleSpeedX10'], 'toggle-map-help': ['toggleMapHelp'], 'open-fullscreen-panel': ['openFullscreenPanel', element.dataset.panel], 'open-unified-selector': ['openUnifiedSelectorModal', element.dataset.panel],
      'close-fullscreen-panel': ['closeFullscreenPanel'], 'copy-export-text': ['copyExportText']
    };
    if (action === 'close-victory-screen') { var v = document.getElementById('victory-screen'); if (v) v.classList.remove('open'); return true; }
    if (actionMap[action]) { callGlobal.apply(null, actionMap[action]); return true; }
    return false;
  }

  function installRobustClickFallback() {
    document.addEventListener('click', function (event) {
      if (event.__pokeWorldHandled) return;
      const target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      const closeButton = target.closest('.modal-close');
      if (closeButton) { closeNearestModal(closeButton); event.__pokeWorldHandled = true; return; }
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
    }, true);

    document.addEventListener('contextmenu', function (event) {
      const target = event.target && event.target.closest ? event.target.closest('[data-context-call]') : null;
      if (!target) return;
      event.preventDefault();
      callGlobal.apply(null, [target.dataset.contextCall].concat(parseLegacyArgs(target.dataset.contextArgs || '', event, target)));
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
})();
