import { pwLateLink } from '../../core/late-link.js';
// V7 · DBT-04 — dépendances explicites (ex-gardes typeof).
import {
  berryHeld,
  berryLevel,
  berryMark,
  berryPowerVal,
  berryUsed,
  heldItemPower,
} from './battle-attack.js';
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function appBattleTimer(name, callback, delay) {
  if (typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.set)
    return PokeWorldTimers.set(name, callback, delay);
  return setInterval(callback, delay);
}
function stopBattleTimer(name, id) {
  if (typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.stop) PokeWorldTimers.stop(name);
  else if (id) clearInterval(id);
}

function startBattle(enemyPoke, isChamp, champId = null, champPokeList = null) {
  if (pwLateLink('hasActiveTrainingBattle') && hasActiveTrainingBattle()) {
    notify(t('training_in_progress_no_battle'), 'var(--red)');
    return false;
  }
  // Wave 28 (user): on small screens a battle start auto-opens the Combat
  // view — tapping "Explorer" from the Adventure view must REVEAL the live
  // battle window instead of leaving it hidden behind the current view.
  try {
    if (
      typeof document !== 'undefined' &&
      document.body &&
      document.body.classList.contains('mobile-mode') &&
      pwLateLink('setMobileView')
    )
      setMobileView('combat');
  } catch (_) {
    /* mobile view helper optional — battle must start anyway */
  }
  if (pwLateLink('syncTeamSlotHeldItems')) syncTeamSlotHeldItems();
  if (!G.team.length) {
    setMsg(t('no_pokemon_in_team'));
    return;
  }
  if (
    pwLateLink('canUseCurrentTeamForRegion') &&
    !canUseCurrentTeamForRegion(G.region || 'kanto')
  ) {
    battle.isLeague = false;
    battle.leagueRegion = null;
    setMsg(regionTeamRestrictionMessage(G.region || 'kanto'));
    notify(regionTeamRestrictionMessage(G.region || 'kanto'), 'var(--red)');
    return;
  }
  if (isChamp && (!champPokeList || !champPokeList.length)) {
    setMsg(t('empty_enemy_team_error'));
    return;
  }
  if (!isChamp && !enemyPoke) {
    setMsg(t('enemy_not_found_error'));
    return;
  }
  stopBattleTimer('battle', battle.timerId);

  // PASSE 38e — DONJON : AUCUN soin en début de combat. Les PV persistent
  // d'un engagement à l'autre pendant toute l'expédition — c'est la
  // difficulté demandée (« pendant toute la durée du donjon l'équipe ne doit
  // pas être heal »). Hors donjon, l'équipe est soignée comme avant ; le
  // K.O. général reste l'échappatoire : la descente s'arrête, la moitié du
  // sac est perdue, mais l'équipe n'est jamais perdue (soignée au combat
  // suivant).
  let _dgRunNow = null;
  try {
    _dgRunNow =
      typeof globalThis.currentDungeonRun === 'function' ? globalThis.currentDungeonRun() : null;
  } catch (_) {}
  if (!(_dgRunNow && _dgRunNow.active)) {
    for (const mp of G.team) {
      mp.currentHP = mp.maxHP;
      mp.status = null;
      mp.statusTurns = 0;
    }
  }
  battle.active = true;
  // PASSE 33 — le bandeau d'expédition suit l'ouverture du combat.
  try {
    if (pwLateLink('renderBattleDungeonBar')) renderBattleDungeonBar();
  } catch (_) {}
  battle.isChamp = isChamp;
  battle.champId = champId;
  battle.lastIsChamp = isChamp;
  battle.lastChampId = champId;
  battle.champPokeIdx = 0;
  battle.escaped = false;
  battle.paused = false;
  battle.chill = !isChamp;
  const _curLoc = (typeof G !== 'undefined' && G && G.location) || null;
  const _locObj = pwLateLink('getLocObj') && _curLoc ? getLocObj(_curLoc) : null;
  const _defWeather = _locObj && _locObj.defaultWeather ? _locObj.defaultWeather : 'none';
  battle.defaultWeather = _defWeather;
  battle.weather = _defWeather;
  battle.weatherTurns = _defWeather === 'none' ? 0 : Infinity;
  battle.terrain = 'none';
  battle.terrainTurns = 0;
  battle.speed = battle.speed || 1;
  battle.playerMods = { atk: 1, def: 1, spe: 1 };
  battle.enemyMods = { atk: 1, def: 1, spe: 1 };
  battle.boostTurns = { player: {}, enemy: {} }; // DORM-04 — durées des boosts.
  battle.berryEpoch = (battle.berryEpoch || 0) + 1; // DORM-06 — drapeaux « une fois par combat ».
  battle.attacksOnCurrentEnemy = 0;
  battle.enemyTurnsOnField = 0; // balls spéciales (timer/quick).
  battle.zTurns = 0; // DORM-06b — Cristaux Z (compteur de tours).
  battle.pMoveIdx = 0;
  battle.eMoveIdx = 0;
  battle.pendingLeave = false;
  battle.pendingSwitchIdx = null;
  battle.resolvingKO = false;
  battle.trainerVisual = null;
  battle.sessionWins = 0;
  battle.sessionPlayerKOs = 0;
  battle.sessionStartedAt = Date.now();
  battle.sessionDamageByPokemon = {};
  if (!isChamp) {
    battle.sessionCatches = [];
    battle.sessionItems = {};
    // PASSE 39 — argent gagné pendant CE combat (victoire sauvage + doublons),
    // affiché dans le butin ; remis à zéro à chaque engagement.
    battle.sessionMoney = 0;
    // PASSE 39 — jetons de donjon encaissés (résumé de sortie) ; zéro en combat.
    battle.sessionTokens = 0;
    try {
      if (pwLateLink('renderBattleLoot')) renderBattleLoot();
    } catch (_) {}
    try {
      if (pwLateLink('renderBattleSummary')) renderBattleSummary();
    } catch (_) {}
  }

  if (isChamp && champPokeList && champPokeList.length) {
    battle.champTeam = champPokeList.map((p) => ({
      ...p,
      currentHP: p.maxHP,
      status: null,
      moves: (p.moves || []).map((m) => ({ ...m })),
    }));
    battle.enemyPoke = { ...battle.champTeam[0] };
  } else {
    battle.enemyPoke = enemyPoke;
  }
  if (!battle.enemyPoke) {
    battle.active = false;
    setMsg(t('enemy_not_found_error'));
    return;
  }
  battle.playerPokeIdx = firstAlive();

  const idleScreen = document.getElementById('battle-idle-screen');
  const activeScene = document.getElementById('battle-active-scene');
  if (idleScreen) idleScreen.style.display = 'none';
  // PASSE 29 (item 1) : le décor de combat suit le lieu, comme Pokechill.
  try {
    if (pwLateLink('applyLocationBackground')) applyLocationBackground();
  } catch (_) {}
  if (activeScene) {
    activeScene.style.display = 'flex';
    activeScene.classList.add('is-live');
  } // wave 17: chrome (Résumé/Quitter) only exists while a battle is live (DS2817)
  clearBattleLog();
  G.pokedex[battle.enemyPoke.id] = { ...(G.pokedex[battle.enemyPoke.id] || {}), seen: true };
  try {
    const _encId = battle.enemyPoke.id;
    const _encShiny = !!(
      battle.enemyPoke.shiny ||
      battle.enemyPoke.shinyActive ||
      battle.enemyPoke._forceShiny
    );
    if (pwLateLink('recordDexEncounter')) recordDexEncounter(_encId, _encShiny);
    if (!isChamp && pwLateLink('recordLocStat') && G.location)
      recordLocStat(G.location, 'encountered', 1);
  } catch (_) {}

  resetPlayerCd();
  resetEnemyCd();
  triggerEntryTalents('both');

  updateBattleUI();
  const eName = battle.enemyPoke?.name || 'Adversaire';
  if (battle.enemyPoke?.shiny)
    addBattleLog(`<span class="shiny-tag"></span>${tr('wild_shiny_appears', { name: eName })}`);
  else addBattleLog(tr('pokemon_appears', { name: eName }));
  if (isChamp) {
    const cName = getChampName(champId || battle.champId);
    addBattleLog(tr('trainer_sends', { trainer: cName, pokemon: eName }));
  }
  // V7-R2 · SND-02 — le bus de jeu annonce l'adversaire (audio : brillant,
  // musique de contexte) ; aucun import audio ici.
  const _ep = battle.enemyPoke;
  if (globalThis.pwEmit)
    globalThis.pwEmit('battle:enemy', {
      id: _ep.id,
      shiny: !!(_ep.shiny || _ep.shinyActive),
      roaming: !!_ep._isRoaming,
      boss: !!_ep.isDungeonBoss,
      champ: !!isChamp,
    });

  const leaveBtn = document.getElementById('leave-btn');
  leaveBtn.disabled = false;
  leaveBtn.textContent = isChamp ? t('give_up') : t('leave_battle_button');

  renderMoveButtons();
  renderEnemyMoveBars();
  renderBattleTeamRow();
  battle.timerId = appBattleTimer('battle', runBattleTick, 100); // ECS-driven loop (src/application/battle-loop.js)
  try {
    if (typeof PokeTrace !== 'undefined' && PokeTrace)
      PokeTrace.hit('battle', 'start', { via: 'battle-init' });
  } catch (_) {}
  return true;
}

function getChampTeam(champId) {
  // Phase 19: official team instantiated (movesets/abilities/real items)
  // — the legacy built random Pokemon with no moveset.
  if (
    typeof OFFICIAL_TEAMS !== 'undefined' &&
    OFFICIAL_TEAMS[champId] &&
    pwLateLink('getOfficialTeam')
  ) {
    const team = getOfficialTeam(champId) || [];
    if (team.length) return team;
  }
  const champ = pwLateLink('getChampDef') ? getChampDef(champId) : null;
  if (!champ || !champ.team || !champ.team.length) return [];
  return champ.team;
}

function startChampBattle(champId) {
  if (pwLateLink('hasActiveTrainingBattle') && hasActiveTrainingBattle()) {
    notify(t('training_in_progress_no_battle'), 'var(--red)');
    return;
  }
  const champ = pwLateLink('getChampDef') ? getChampDef(champId) : null;
  if (!champ) {
    return;
  }
  const champRegion =
    champ.region ||
    ((typeof JOHTO_BADGES !== 'undefined' && JOHTO_BADGES.includes(champId)) ||
    champId === 'johto_elite4'
      ? 'johto'
      : 'kanto');
  const haveRegionBadges = pwLateLink('regionBadgeCount')
    ? regionBadgeCount(champRegion)
    : (G.badges || []).length;
  if ((champ.badgeReq || 0) > haveRegionBadges) {
    setMsg(
      tr('need_badges_challenge', {
        need: champ.badgeReq,
        champion: getChampName(champId || battle.champId),
      })
    );
    return;
  }
  if (!G.team.length) {
    setMsg(t('no_pokemon_in_team'));
    return;
  }
  if (
    pwLateLink('canUseCurrentTeamForRegion') &&
    !canUseCurrentTeamForRegion(G.region || 'kanto')
  ) {
    battle.isLeague = false;
    battle.leagueRegion = null;
    setMsg(regionTeamRestrictionMessage(G.region || 'kanto'));
    notify(regionTeamRestrictionMessage(G.region || 'kanto'), 'var(--red)');
    return;
  }

  if (pwLateLink('isLeagueChampionId') ? isLeagueChampionId(champId) : champId === 'elite4') {
    const leagueRegion = pwLateLink('getLeagueRegionForChampion')
      ? getLeagueRegionForChampion(champId)
      : 'kanto';
    const trainers = pwLateLink('getLeagueTrainersForRegion')
      ? getLeagueTrainersForRegion(leagueRegion)
      : [];
    battle.isLeague = true;
    battle.leagueRegion = leagueRegion;
    battle.leagueStage = 0;
    const firstTrainer = trainers[0];
    // Phase 19: full official team (Champion Blue: variant picked from the
    // player's starter via getPlayerStarterSpecies).
    const leagueStarterId = pwLateLink('getPlayerStarterSpecies')
      ? getPlayerStarterSpecies(leagueRegion)
      : null;
    const team =
      pwLateLink('getOfficialLeagueTeam') &&
      getOfficialLeagueTeam(leagueRegion, 0, leagueStarterId).length
        ? getOfficialLeagueTeam(leagueRegion, 0, leagueStarterId)
        : firstTrainer
          ? firstTrainer.team.map(([id, lv]) => createPoke(id, lv, false))
          : [];
    addBattleLog(
      tr('league_battle_challenge_region', {
        region: getRegionDisplayName(leagueRegion),
        trainer: firstTrainer.name,
      })
    );
    startBattle(null, true, champId, team);
    addBattleLog(tr('league_intro_quote', { trainer: firstTrainer.name }));
    return;
  }

  battle.isLeague = false;
  const team = getChampTeam(champId);
  if (!team || !team.length) {
    setMsg(tr('champion_team_error', { champion: getChampName(champId) }));
    return;
  }
  addBattleLog(tr('champion_battle_start', { champion: getChampName(champId || battle.champId) }));
  startBattle(null, true, champId, team);
  addBattleLog(tr('champion_intro_quote', { champion: getChampName(champId || battle.champId) }));
}

function calcAttackCd(spe) {
  const base = 1900;
  const cd = base * (100 / (100 + Math.min(spe, 180)));
  return Math.round(clamp(cd, 500, 2600));
}

function effectiveSpeed(poke, mods) {
  if (!poke) return 50;
  let s = poke.spe * (mods?.spe || 1);
  try {
    const b = getHeldBuff(poke);
    if (b && b.spe) s *= 1 + b.spe;
  } catch (_) {}
  if (poke.status === 'para') s *= 0.5;
  try {
    const w = typeof battle !== 'undefined' && battle ? battle.weather : null;
    const hasTal = (t) => (pwLateLink('hasTalent') ? hasTalent(poke, t) : poke.talent === t);
    if (hasTal('chlorophyll') && (w === 'sunny' || w === 'sun')) s *= 1.35;
    else if (hasTal('swiftswim') && (w === 'rainy' || w === 'rain')) s *= 1.5;
    else if (hasTal('sandrush') && (w === 'sand' || w === 'sandstorm')) s *= 1.5;
    else if (hasTal('slushrush') && (w === 'hail' || w === 'snow')) s *= 1.5;
    else if (hasTal('moltshed') && (w === 'sunny' || w === 'sun')) s *= 1.5;
    else if (hasTal('intangible') && w === 'somber') s *= 1.5;
    else if (
      hasTal('faerush') &&
      typeof battle !== 'undefined' &&
      battle &&
      battle.terrain === 'misty'
    )
      s *= 1.5;
    else if (
      hasTal('hyperconductor') &&
      typeof battle !== 'undefined' &&
      battle &&
      battle.terrain === 'electric'
    )
      s *= 1.5;
    else if (hasTal('quickfeet') && poke.status) s *= 1.5;
    else if (hasTal('unburden') && !poke.heldItem) s *= 1.5;
  } catch (_) {}
  return Math.max(5, Math.floor(s));
}

function getMoveCooldownMultiplier(mv) {
  if (!mv) return 1.0;
  const mvId = String(mv.id || '').toLowerCase();
  const desc = String(mv.desc || '').toLowerCase();
  // Fidèle PokeChill : « Attacks x1.2/x1.5 slower/faster than usual ».
  const m = desc.match(/x([\d.]+)\s+(slower|faster)/);
  if (m) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v) && v > 0) return m[2] === 'faster' ? 1 / v : v;
  }
  // Capacités à charge / recharge (deux temps) : ×2.
  if (mv.recharge || mv.charge) return 2.0;
  // Capacités prioritaires : demi-cooldown.
  if (
    mv.prio > 0 ||
    mvId === 'quickattack' ||
    mvId === 'extremespeed' ||
    mvId === 'machpunch' ||
    mvId === 'iceshard' ||
    mvId === 'aquajet'
  )
    return 0.5;
  return 1.0; // Normal move
}

// DORM-04 — talents de vitesse par famille de capacités (PokeChill) :
// « exécutées ×1,5 plus vite » → cooldown divisé par 1,5.
function moveSpeedTalentMult(poke, mv) {
  if (!poke || !mv) return 1;
  const mvId = String(mv.id || '').toLowerCase();
  const hasTal = (t) => (pwLateLink('hasTalent') ? hasTalent(poke, t) : poke.talent === t);
  const SOUND = [
    'alluring_voice',
    'bug_buzz',
    'chatter',
    'disarming_voice',
    'echoed_voice',
    'growl',
    'hyper_voice',
    'metal_sound',
    'noble_roar',
    'relic_song',
    'roar_of_time',
    'screech',
    'snarl',
    'sparkling_aria',
  ];
  const DANCE = [
    'dragon_dance',
    'feather_dance',
    'fiery_dance',
    'quiver_dance',
    'revelation_dance',
    'swords_dance',
  ];
  const WIND = [
    'fairy_wind',
    'gust',
    'hurricane',
    'icy_wind',
    'ominous_wind',
    'silver_wind',
    'tailwind',
  ];
  const SHARP = [
    'bitter_blade',
    'cut',
    'fury_cutter',
    'leaf_blade',
    'night_slash',
    'psycho_cut',
    'razor_leaf',
    'razor_shell',
    'razor_talons',
    'slash',
    'solar_blade',
    'x_scissor',
  ];
  const type = typeof MOVES !== 'undefined' && MOVES[mvId] ? MOVES[mvId].type : mv.type || '';
  if (hasTal('galewings') && (type === 'Flying' || type === 'Bug')) return 1 / 1.5;
  if (hasTal('prankster') && (type === 'Ghost' || type === 'Dark')) return 1 / 1.5;
  if (hasTal('neuroforce') && (type === 'Psychic' || type === 'Fairy')) return 1 / 1.5;
  if (hasTal('cacophony') && SOUND.indexOf(mvId) >= 0) return 1 / 1.5;
  if (hasTal('dancer') && DANCE.indexOf(mvId) >= 0) return 1 / 1.5;
  if (hasTal('windrider') && WIND.indexOf(mvId) >= 0) return 1 / 1.5;
  if (hasTal('iaido') && SHARP.indexOf(mvId) >= 0) return 1 / 1.5;
  return 1;
}

function getActivePlayerPoke() {
  // Simple fallback — no self-recursion
  const g = typeof G !== 'undefined' ? G : null;
  const b = typeof battle !== 'undefined' ? battle : null;
  if (g && g.team && b && b.playerPokeIdx !== undefined && g.team[b.playerPokeIdx])
    return g.team[b.playerPokeIdx];
  if (g && g.team && g.team.length) return g.team[0] || null;
  return null;
}
function resetPlayerCd() {
  const p = getActivePlayerPoke();
  let baseCd = calcAttackCd(effectiveSpeed(p, battle.playerMods));
  const lastId = battle && battle.lastPlayerMoveId ? battle.lastPlayerMoveId : null;
  const usedMv =
    p && lastId && typeof MOVES !== 'undefined' && MOVES[lastId] ? MOVES[lastId] : null;
  if (usedMv) {
    baseCd *= getMoveCooldownMultiplier(usedMv);
    // DORM-02h — Vive Griffe : les capacités rapides s'exécutent encore
    // plus vite (PokeChill).
    const held = pwLateLink('getHeldItemForPokemon') ? getHeldItemForPokemon(p) : p && p.heldItem;
    if (held === 'quick_claw' && getMoveCooldownMultiplier(usedMv) < 1) {
      const pow = heldItemPower('quick_claw');
      baseCd = Math.max(1, baseCd / Math.max(1, pow));
    }
    // DORM-04 — talents de vitesse par famille (galewings, prankster…).
    baseCd *= moveSpeedTalentMult(p, usedMv);
    // DORM-02h — Herbe Pouvoir : les capacités lentes s'exécutent aussitôt.
    if (held === 'power_herb' && getMoveCooldownMultiplier(usedMv) > 1)
      baseCd /= getMoveCooldownMultiplier(usedMv);
    // DORM-06 — baies de vitesse : Mepo (skip CD), Micle (×2 rapide), Chaipô (1er).
    const _bv = berryHeld(p);
    if (_bv) {
      if (_bv.itm.category === 'skip_cd') {
        const lvl = berryLevel(p, _bv.key, 'player');
        const skipChance = berryPowerVal(_bv.key, lvl);
        if (pwLateLink('chance') ? chance(skipChance * 100) : Math.random() < skipChance)
          baseCd = 100;
      }
      if (
        _bv.itm.category === 'pinch_fast' &&
        p.currentHP < p.maxHP * 0.25 &&
        !berryUsed(p, '_micleUsed')
      ) {
        baseCd = Math.max(100, baseCd / 2);
        berryMark(p, '_micleUsed');
      }
      if (
        _bv.itm.category === 'pinch_first' &&
        p.currentHP < p.maxHP * 0.25 &&
        !berryUsed(p, '_custapUsed')
      ) {
        baseCd = 100;
        berryMark(p, '_custapUsed');
      }
    }
  }
  battle.pCd = Math.round(baseCd);
  battle.pCdMax = battle.pCd;
}

function resetEnemyCd() {
  const e = battle.enemyPoke;
  let baseCd = calcAttackCd(effectiveSpeed(e, battle.enemyMods));
  const lastId = battle && battle.lastEnemyMoveId ? battle.lastEnemyMoveId : null;
  const usedMv =
    e && lastId && typeof MOVES !== 'undefined' && MOVES[lastId] ? MOVES[lastId] : null;
  if (usedMv) {
    baseCd *= getMoveCooldownMultiplier(usedMv);
    // DORM-02h — Vive Griffe : idem côté ennemi (effet symétrique, aucune
    // dépendance à l'inventaire du joueur).
    const held = pwLateLink('getHeldItemForPokemon') ? getHeldItemForPokemon(e) : e && e.heldItem;
    if (held === 'quick_claw' && getMoveCooldownMultiplier(usedMv) < 1) {
      const pow = 1.15; // valeur canonique NPC (jamais l'inventaire du joueur)
      baseCd = Math.max(1, baseCd / Math.max(1, pow));
    }
    // DORM-04 — talents de vitesse par famille (symétrique côté ennemi).
    baseCd *= moveSpeedTalentMult(e, usedMv);
    // DORM-02h — Herbe Pouvoir : idem côté ennemi.
    if (held === 'power_herb' && getMoveCooldownMultiplier(usedMv) > 1)
      baseCd /= getMoveCooldownMultiplier(usedMv);
    // DORM-06 — baies de vitesse (côté ennemi, valeur canonique NPC).
    const _bv = berryHeld(e);
    if (_bv) {
      if (_bv.itm.category === 'skip_cd') {
        const lvl = berryLevel(e, _bv.key, 'enemy');
        const skipChance = berryPowerVal(_bv.key, lvl);
        if (pwLateLink('chance') ? chance(skipChance * 100) : Math.random() < skipChance)
          baseCd = 100;
      }
      if (
        _bv.itm.category === 'pinch_fast' &&
        e.currentHP < e.maxHP * 0.25 &&
        !berryUsed(e, '_micleUsed')
      ) {
        baseCd = Math.max(100, baseCd / 2);
        berryMark(e, '_micleUsed');
      }
      if (
        _bv.itm.category === 'pinch_first' &&
        e.currentHP < e.maxHP * 0.25 &&
        !berryUsed(e, '_custapUsed')
      ) {
        baseCd = 100;
        berryMark(e, '_custapUsed');
      }
    }
  }
  battle.eCd = Math.round(baseCd);
  battle.eCdMax = battle.eCd;
}

// --- Migrated to ES module, globals exposed ---
if (typeof startBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.startBattle = startBattle;
  if (typeof globalThis !== 'undefined') globalThis.startBattle = startBattle;
}
if (typeof getChampTeam !== 'undefined') {
  if (typeof window !== 'undefined') window.getChampTeam = getChampTeam;
  if (typeof globalThis !== 'undefined') globalThis.getChampTeam = getChampTeam;
}
if (typeof startChampBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.startChampBattle = startChampBattle;
  if (typeof globalThis !== 'undefined') globalThis.startChampBattle = startChampBattle;
}
if (typeof calcAttackCd !== 'undefined') {
  if (typeof window !== 'undefined') window.calcAttackCd = calcAttackCd;
  if (typeof globalThis !== 'undefined') globalThis.calcAttackCd = calcAttackCd;
}
if (typeof effectiveSpeed !== 'undefined') {
  if (typeof window !== 'undefined') window.effectiveSpeed = effectiveSpeed;
  if (typeof globalThis !== 'undefined') globalThis.effectiveSpeed = effectiveSpeed;
}
if (typeof resetPlayerCd !== 'undefined') {
  if (typeof window !== 'undefined') window.resetPlayerCd = resetPlayerCd;
  if (typeof globalThis !== 'undefined') globalThis.resetPlayerCd = resetPlayerCd;
}
if (typeof resetEnemyCd !== 'undefined') {
  if (typeof window !== 'undefined') window.resetEnemyCd = resetEnemyCd;
  if (typeof globalThis !== 'undefined') globalThis.resetEnemyCd = resetEnemyCd;
}

// --- Exported globals ---
if (typeof appBattleTimer !== 'undefined') {
  if (typeof window !== 'undefined') window.appBattleTimer = appBattleTimer;
  if (typeof globalThis !== 'undefined') globalThis.appBattleTimer = appBattleTimer;
}
if (typeof getActivePlayerPoke !== 'undefined') {
  if (typeof window !== 'undefined') window.getActivePlayerPoke = getActivePlayerPoke;
  if (typeof globalThis !== 'undefined') globalThis.getActivePlayerPoke = getActivePlayerPoke;
}
if (typeof getMoveCooldownMultiplier !== 'undefined') {
  if (typeof window !== 'undefined') window.getMoveCooldownMultiplier = getMoveCooldownMultiplier;
  if (typeof globalThis !== 'undefined')
    globalThis.getMoveCooldownMultiplier = getMoveCooldownMultiplier;
}
if (typeof stopBattleTimer !== 'undefined') {
  if (typeof window !== 'undefined') window.stopBattleTimer = stopBattleTimer;
  if (typeof globalThis !== 'undefined') globalThis.stopBattleTimer = stopBattleTimer;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  startBattle,
  getChampTeam,
  startChampBattle,
  calcAttackCd,
  effectiveSpeed,
  resetPlayerCd,
  resetEnemyCd,
  appBattleTimer,
  getActivePlayerPoke,
  getMoveCooldownMultiplier,
  stopBattleTimer,
};
