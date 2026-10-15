// V7 · DBT-04 — dépendances explicites (ex-gardes typeof).
import { pwStatChange, pwTickBoostDurations } from './stat-mods.js';
import { berryHeld, berryLevel, berryMark, berryPowerVal, berryUsed } from './battle-attack.js';
import { getActivePlayerPoke, resetPlayerCd } from './battle-init.js';
import { pwLateLink } from '../../core/late-link.js';
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Shared async wait service (engine timer abstraction). globalThis-backed so
// concatenated VM harnesses, the offline engine's instant-wait patch and the
// classic boot all see ONE binding.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
// FIX (2026-08) — mine energy per won battle / capture (was hardcoded 15).
// Read defensively: game-config.js publishes MINE_ENERGY_PER_BATTLE on the
// global surface before this module loads, but VM harnesses may not.
function _mineEnergyPerBattle() {
  try {
    if (typeof MINE_ENERGY_PER_BATTLE === 'number') return MINE_ENERGY_PER_BATTLE;
  } catch (_) {}
  try {
    if (
      typeof GAME !== 'undefined' &&
      GAME &&
      GAME.MINE &&
      typeof GAME.MINE.ENERGY_PER_BATTLE === 'number'
    )
      return GAME.MINE.ENERGY_PER_BATTLE;
  } catch (_) {}
  return 5;
}

// V7 · DBT-05 — résolveur unique (core/late-link.js) ; alias résolus à l'appel.
function getSecretBaseBonuses(...args) {
  const f = pwLateLink('getSecretBaseBonuses');
  return f ? f(...args) : undefined;
}
if (typeof globalThis !== 'undefined' && typeof globalThis.wait !== 'function') {
  globalThis.wait = (ms) => new Promise((r) => setTimeout(r, ms));
}
function tickStatusDurations(p) {
  if (!p) return;
  if (p.statusTurns && p.statusTurns > 0) {
    p.statusTurns--;
    if (p.statusTurns <= 0) {
      const oldStatus = p.status;

      if (p.status !== 'badpoison') {
        p.status = null;
        p.statusTurns = 0;
        if (oldStatus === 'burn') addBattleLog(tr('status_burn_faded', { name: p.name }));
        else if (oldStatus === 'poison') addBattleLog(tr('status_poison_faded', { name: p.name }));
        else if (oldStatus === 'para') addBattleLog(tr('status_para_faded', { name: p.name }));
        else if (oldStatus === 'freeze') addBattleLog(tr('status_freeze_faded', { name: p.name }));
        else if (oldStatus === 'sleep') addBattleLog(tr('status_sleep_faded', { name: p.name }));
      }
    }
  }
}

function applyEndOfTurnStatus(p) {
  if (!p || p.currentHP <= 0) return;
  const hasTal = (t) =>
    typeof globalThis.hasTalent === 'function' ? globalThis.hasTalent(p, t) : p.talent === t;
  // DORM-02c — orbes de statut : brûlure / poison auto-infligés.
  const heldOrb = pwLateLink('getHeldItemForPokemon') ? getHeldItemForPokemon(p) : p && p.heldItem;
  if (!p.status) {
    if (heldOrb === 'flame_orb' && p.type1 !== 'Fire' && p.type2 !== 'Fire') {
      p.status = 'burn';
      p.statusTurns = 3;
      addBattleLog(`${p.name} est brûlé par son Orbe Flamme !`);
    } else if (heldOrb === 'toxic_orb' && p.type1 !== 'Poison' && p.type2 !== 'Poison') {
      p.status = 'poison';
      p.statusTurns = 5;
      addBattleLog(`${p.name} est empoisonné par son Orbe Toxique !`);
    }
  }

  const _isPlayerSide = p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx];

  // DORM-04 — Moody : +50 % sur deux stats au hasard à chaque tour.
  if (hasTal('moody')) {
    const _side = _isPlayerSide ? 'player' : 'enemy';
    const pool = ['atk', 'def', 'spa', 'spd', 'spe'];
    const a = pool[Math.floor(Math.random() * pool.length)];
    let b = pool[Math.floor(Math.random() * pool.length)];
    if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length];
    pwStatChange(_side, a, 1.5, { poke: p });
    pwStatChange(_side, b, 1.5, { poke: p });
    addBattleLog(`${p.name} devient lunatique (Moody) !`);
  }

  // DORM-04 — fatigue de combat (PokeChill) : drain lent en combat automatique.
  if (
    battle &&
    battle.chill &&
    !battle._offlineSim &&
    _isPlayerSide &&
    p === getActivePlayerPoke()
  ) {
    try {
      const _heldFat = heldOrb;
      let fraction = 100 + (p.maxHP || 0) * 30 + (p.def || 0) * 15 + (p.spd || 0) * 15;
      let fd = (p.maxHP || 0) / Math.max(1, fraction);
      if (_heldFat === 'leftovers') fd /= 1.2;
      if (hasTal('stamina')) fd /= 2;
      if (fd > 0 && p.currentHP > 0) {
        p.currentHP = Math.max(0, p.currentHP - Math.max(0.05, fd));
      }
    } catch (_) {}
  }

  pwTickBoostDurations(_isPlayerSide ? 'player' : 'enemy');

  if (hasTal('speedboost')) {
    const mods = _isPlayerSide ? battle.playerMods : battle.enemyMods;
    if (mods) mods.spe = Math.min(3.0, (mods.spe || 1) * 1.15);
  }

  // DORM-06 — baies de soin de PV (Oran/Sitrus/Figy…) : une fois par combat,
  // quand PV < 25 % (l'objet reste équipé).
  const _bh = berryHeld(p);
  if (
    _bh &&
    _bh.itm.category === 'pinch_heal' &&
    p.currentHP > 0 &&
    p.currentHP < p.maxHP * 0.25 &&
    !berryUsed(p, '_pinchHealUsed')
  ) {
    const lvl = berryLevel(p, _bh.key, _isPlayerSide ? 'player' : 'enemy');
    const heal = Math.max(1, Math.floor(p.maxHP * berryPowerVal(_bh.key, lvl)));
    p.currentHP = Math.min(p.maxHP, p.currentHP + heal);
    berryMark(p, '_pinchHealUsed');
    addBattleLog(
      `${p.name} récupère ${heal} PV (${pwLateLink('getItemName') ? getItemName(_bh.key) : _bh.key}) !`
    );
  }

  if (hasTal('magicguard')) {
    // Immunisé aux dégâts de statut et indirects
  } else if (p.status === 'burn') {
    // DORM-04 — Brasier : la brûlure ne blesse plus, mais booste les dégâts (×1,2 côté attaque).
    if (hasTal('flareboost')) {
      tickStatusDurations(p);
    } else {
      let bd = Math.max(1, Math.floor(p.maxHP / 16));
      if (hasTal('scorch')) bd *= 2; // DORM-04 — Cramé : dégâts de brûlure doublés.
      p.currentHP = Math.max(0, p.currentHP - bd);
      try {
        spawnBattleFloat(
          p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx] ? 'player' : 'enemy',
          '-' + bd,
          'status burn',
          'bru'
        );
      } catch (_) {}
      addBattleLog(tr('burn_damage', { name: p.name, damage: bd }));
      tickStatusDurations(p);
    }
  } else if (p.status === 'poison') {
    if (hasTal('toxicboost')) {
      tickStatusDurations(p);
    } else {
      let pd = Math.max(1, Math.floor(p.maxHP / 8));
      if (hasTal('corrosion')) pd *= 2; // DORM-04 — Corrosion : dégâts de poison doublés.
      p.currentHP = Math.max(0, p.currentHP - pd);
      try {
        spawnBattleFloat(
          p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx] ? 'player' : 'enemy',
          '-' + pd,
          'status poison',
          'poi'
        );
      } catch (_) {}
      addBattleLog(tr('poison_damage', { name: p.name, damage: pd }));
      tickStatusDurations(p);
    }
  } else if (p.status === 'badpoison') {
    p.statusTurns = (p.statusTurns || 0) + 1;
    let bd = Math.max(1, Math.floor((p.maxHP * p.statusTurns) / 16));
    if (hasTal('corrosion')) bd *= 2; // DORM-04 — Corrosion : dégâts de poison doublés.
    if (hasTal('toxicboost')) {
      bd = 0;
      tickStatusDurations(p);
    } // toxine absorbée.
    if (bd > 0) {
      p.currentHP = Math.max(0, p.currentHP - bd);
      try {
        spawnBattleFloat(
          p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx] ? 'player' : 'enemy',
          '-' + bd,
          'status badpoison',
          'tox'
        );
      } catch (_) {}
      addBattleLog(tr('bad_poison_damage', { name: p.name, damage: bd }));
    }
  } else if (p.status === 'sleep') {
    tickStatusDurations(p);
  } else if (p.status === 'freeze') {
    tickStatusDurations(p);
  } else if (p.status === 'para') {
    tickStatusDurations(p);
  }

  if (
    (pwLateLink('getHeldItemForPokemon') ? getHeldItemForPokemon(p) : p.heldItem) === 'leftovers' &&
    p.currentHP > 0 &&
    p.currentHP < p.maxHP
  ) {
    const heal = Math.max(1, Math.floor(p.maxHP / 16));
    p.currentHP = Math.min(p.maxHP, p.currentHP + heal);
    try {
      const side =
        p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx] ? 'player' : 'enemy';
      visualItem(side, 'leftovers', '+PV');
      visualHeal(side, heal);
    } catch (_) {}
    addBattleLog(tr('leftovers_heal', { name: p.name, heal: heal }));
  }
}

async function onEnemyFaint() {
  if (!battle || !battle.enemyPoke) return;
  // Phase 30: shared K.O. counter for the hatchery — each K.O. feeds
  // incubation and daycare according to each slot's mode (single function).
  try {
    if (pwLateLink('hatcheryRegisterBattleKills')) hatcheryRegisterBattleKills(1);
  } catch (_) {}
  battle.paused = true;
  const e = battle.enemyPoke;
  // DORM-04 — Moxie / Turbo : bonus du Pokémon actif quand il met K.O. l'ennemi.
  const _koPoke = getActivePlayerPoke();
  if (_koPoke && _koPoke.currentHP > 0) {
    const _ht = (t) => (pwLateLink('hasTalent') ? hasTalent(_koPoke, t) : _koPoke.talent === t);
    if (_ht('moxie') && battle.playerMods) {
      battle.playerMods.atk = Math.min(3.0, (battle.playerMods.atk || 1) * 1.5);
      addBattleLog(`${_koPoke.name} gagne en Attaque (Moxie) !`);
    }
    if (_ht('strategist') && battle.playerMods) {
      battle.playerMods.spa = Math.min(3.0, (battle.playerMods.spa || 1) * 1.5);
      addBattleLog(`${_koPoke.name} gagne en Attaque Spéciale (Stratège) !`);
    }
    if (_ht('beastboost') && battle.playerMods) {
      const _useSpa = Number(_koPoke.spa || 0) > Number(_koPoke.atk || 0);
      battle.playerMods[_useSpa ? 'spa' : 'atk'] = Math.min(
        3.0,
        (battle.playerMods[_useSpa ? 'spa' : 'atk'] || 1) * 1.5
      );
      addBattleLog(`${_koPoke.name} booste sa meilleure stat (Beast Boost) !`);
    }
    if (_ht('speedboost') && battle.playerMods) {
      battle.playerMods.spe = Math.min(3.0, (battle.playerMods.spe || 1) * 1.5);
      resetPlayerCd();
      addBattleLog(`${_koPoke.name} gagne en Vitesse (Turbo) !`);
    }
  }
  if (!battle.isChamp) battle.sessionWins = (battle.sessionWins || 0) + 1;
  // PASSE 32 — donjons : une victoire remplit le sac d'expédition. Le gardien
  // du dernier palier clôt la session et verse le bonus de complétion.
  try {
    if (
      !battle.isChamp &&
      !battle.isTraining &&
      pwLateLink('currentDungeonRun') &&
      currentDungeonRun()
    ) {
      if (e && e.isDungeonBoss && pwLateLink('dungeonOnBossDefeated')) {
        const _res = dungeonOnBossDefeated();
        if (_res)
          addBattleLog(
            `<span class="pw-green">${tr('dungeon_log_cleared', { tokens: String(_res.gained.tokens), money: String(_res.gained.money) })}</span>`
          );
      } else if (pwLateLink('dungeonOnWin')) {
        const _run = dungeonOnWin();
        if (_run && pwLateLink('dungeonFloorCleared') && dungeonFloorCleared()) {
          addBattleLog(
            `<span class="pw-green">${tr('dungeon_log_floor_cleared', { floor: String(_run.floor) })}</span>`
          );
        }
      }
      if (pwLateLink('refreshDungeonPanel')) refreshDungeonPanel();
    }
  } catch (_) {}
  addBattleLog(tr('pokemon_fainted', { name: e.name }));
  updateBattleUI();
  await wait(500);

  if (battle.isChamp) {
    battle.champPokeIdx++;
    if (battle.champTeam && battle.champPokeIdx < battle.champTeam.length) {
      const next = battle.champTeam[battle.champPokeIdx];
      battle.enemyPoke = next;
      battle.eMoveIdx = 0;
      battle.attacksOnCurrentEnemy = 0;
      battle.enemyTurnsOnField = 0; // DORM-06 — balls spéciales
      battle.zTurns = 0; // DORM-06b — Cristaux Z (réinitialisé à chaque nouvel ennemi).
      if (battle.isTraining && battle.trainee) {
        battle.trainingStage = battle.champPokeIdx;
        battle.trainee.currentHP = battle.trainee.maxHP;
        addBattleLog(
          tr('training_room_round', { round: battle.champPokeIdx + 1, pokemon: next.name })
        );
      } else {
        addBattleLog(
          tr('champion_sends', { champion: getChampName(battle.champId), pokemon: next.name })
        );
      }
      G.pokedex[next.id] = { ...(G.pokedex[next.id] || {}), seen: true };
      resetEnemyCd();
      updateBattleUI();
      renderMoveButtons();
      renderEnemyMoveBars();
      renderBattleTeamRow();
      await wait(1000);
      resumeBattleActions();
      return;
    } else {
      if (battle.isLeague && typeof battle.leagueStage === 'number') {
        const leagueTrainers = pwLateLink('getLeagueTrainersForRegion')
          ? getLeagueTrainersForRegion(battle.leagueRegion || 'kanto')
          : [];
        if (battle.leagueStage < leagueTrainers.length - 1) {
          battle.leagueStage++;
          const trainer = leagueTrainers[battle.leagueStage];
          for (const p of G.team) {
            p.currentHP = p.maxHP;
            p.status = null;
            p.statusTurns = 0;
          }
          addBattleLog(
            `<span class="pw-green">${tr('league_stage_victory', { trainer: leagueTrainers[battle.leagueStage - 1].name })}</span>`
          );
          notify(
            tr('league_stage_success', { stage: battle.leagueStage, trainer: trainer.name }),
            'var(--green)'
          );
          updateBattleUI();
          renderBattleTeamRow();
          await wait(2200);

          if (!battle.active) return;
          // Phase 19: official team for the stage (Champion Blue variant resolved)
          const leagueStarterId = pwLateLink('getPlayerStarterSpecies')
            ? getPlayerStarterSpecies(battle.leagueRegion || 'kanto')
            : null;
          const officialStage = pwLateLink('getOfficialLeagueTeam')
            ? getOfficialLeagueTeam(
                battle.leagueRegion || 'kanto',
                battle.leagueStage,
                leagueStarterId
              )
            : [];
          battle.champTeam = officialStage.length
            ? officialStage
            : trainer.team.map(([id, lv]) => createPoke(id, lv, false));
          battle.champPokeIdx = 0;
          const nextPoke = battle.champTeam[0];
          battle.enemyPoke = nextPoke;
          battle.eMoveIdx = 0;
          addBattleLog(
            tr('league_next_battle_region', {
              region: getRegionDisplayName(battle.leagueRegion || 'kanto'),
              stage: battle.leagueStage + 1,
              trainer: trainer.name,
              pokemon: nextPoke.name,
            })
          );
          G.pokedex[nextPoke.id] = { ...(G.pokedex[nextPoke.id] || {}), seen: true };
          resetPlayerCd();
          resetEnemyCd();
          updateBattleUI();
          renderMoveButtons();
          renderEnemyMoveBars();
          renderBattleTeamRow();
          await wait(400);
          resumeBattleActions();
          return;
        }
      }
      await champVictory();
      return;
    }
  }

  const questLoc = battle.questDefeatLoc || G.location;
  const isQuestRewardBattle = battle.questRewardQuestId != null;
  const xp = gainXP(e);
  addBattleLog(tr('team_gains_xp', { xp: xp }));

  if (!isQuestRewardBattle) {
    // P0 — chaque victoire sauvage rapporte des Pokédollars (formule PokéClicker).
    // PASSE 39 — le montant est mémorisé dans la session : le butin de combat
    // affiche « les monnaies obtenues pendant ce combat » (retour joueur).
    if (pwLateLink('awardWildVictoryMoney')) {
      const _wildMoney = awardWildVictoryMoney() || 0;
      if (_wildMoney > 0) battle.sessionMoney = (battle.sessionMoney || 0) + _wildMoney;
    }
    G.totalWildWins = (G.totalWildWins || 0) + 1;
    if (!G.wildWinsByLoc) G.wildWinsByLoc = {};
    G.wildWinsByLoc[questLoc] = (G.wildWinsByLoc[questLoc] || 0) + 1;
    try {
      const _defShiny = !!(e && (e.shiny || e.shinyActive || e._forceShiny));
      if (pwLateLink('recordDexDefeat') && e) recordDexDefeat(e.id, _defShiny);
      if (pwLateLink('recordLocStat') && questLoc) recordLocStat(questLoc, 'beaten', 1);
    } catch (_) {}
    if (G.mine && typeof G.mine.energy === 'number') {
      const maxE = G.mine.maxEnergy || 100;
      // FIX (2026-08): mine energy granted per won battle rebalanced 15 -> 5.
      G.mine.energy = Math.min(maxE, G.mine.energy + _mineEnergyPerBattle());
    }
  }

  let caughtNow = false;
  if (!battle.noAutoCatch) caughtNow = attemptAutoCatch(e) === true;
  if (isQuestRewardBattle && pwLateLink('completeQuestRewardBattle')) {
    const completedQuestId = battle.questRewardQuestId;
    const completedCat = battle.questRewardCat || 'main';
    battle.questRewardQuestId = null;
    battle.questRewardCat = null;
    battle.questRewardRegion = null;
    battle.questRewardDefId = null;
    // V7 · LEG-01 (D13) — la quête n'est terminée QUE si la capture a réussi.
    // Sinon elle reste « rencontre disponible » : on relance depuis le journal
    // (la Ball consommée est le seul coût).
    if (caughtNow) completeQuestRewardBattle(completedQuestId, completedCat);
    else {
      try {
        notify(tr('legendary_quest_escaped', { name: e.name }), 'var(--red)');
      } catch (_) {}
    }
  }
  if (!isQuestRewardBattle) {
    EventBus.emit(EVENTS.WILD_DEFEATED, { loc: questLoc });
    try {
      if (document.getElementById('map-svg')) renderMap();
    } catch (_) {}
  }

  const drops = isQuestRewardBattle ? null : ROUTE_DROPS[questLoc];
  const _dropBonus =
    typeof pwLateLink('getSecretBaseBonuses') === 'function'
      ? Number(getSecretBaseBonuses().dropBonus) || 0
      : 0;
  let _talentDropBonus = 0;
  if (typeof G !== 'undefined' && G && Array.isArray(G.team)) {
    for (const p of G.team) {
      if (
        p &&
        p.currentHP > 0 &&
        ((pwLateLink('hasTalent') &&
          (hasTalent(p, 'pickup') || hasTalent(p, 'pickpocket') || hasTalent(p, 'hoarder'))) ||
          p.talent === 'pickup' ||
          p.talent === 'pickpocket' ||
          p.talent === 'hoarder')
      ) {
        _talentDropBonus += 1;
      }
    }
  }
  // DORM-02g — Encens Veine : +1 taux de butin (1 % → 2 %).
  let _incenseBonus = 0;
  try {
    if (Array.isArray(G.team))
      for (const tp of G.team) {
        if (tp && tp.currentHP > 0 && pwLateLink('getHeldItemForPokemon')) {
          const hk = getHeldItemForPokemon(tp);
          if (hk === 'luck_incense') _incenseBonus += 1;
          else if (hk === 'hopo_berry') _incenseBonus += 1; // DORM-06 — Baie Hopo : +1 butin
        }
      }
  } catch (_) {}
  const _dropChance = Math.min(6, 1 + _dropBonus + _talentDropBonus + _incenseBonus); // base 1 % ; max 6 %
  if (drops && drops.length && chance(_dropChance)) {
    const drop = drops[rand(0, drops.length - 1)];
    const reward = pwLateLink('grantRewardItem')
      ? grantRewardItem(drop, 1)
      : (addToInventory(drop, 1), { added: 1, money: 0 });
    if (reward.added) {
      if (!battle.sessionItems) battle.sessionItems = {};
      battle.sessionItems[drop] = (battle.sessionItems[drop] || 0) + reward.added;
      try {
        if (pwLateLink('renderBattleLoot')) renderBattleLoot();
      } catch (_) {}
      addBattleLog(tr('item_found_log', { icon: itemIcon(drop, 16), item: getItemName(drop) }));
    } else if (reward.money) {
      // PASSE 39 — l'argent des doublons entre dans le butin de combat affiché.
      battle.sessionMoney = (battle.sessionMoney || 0) + Number(reward.money || 0);
      addBattleLog(
        tr('duplicate_item_money_log', {
          item: getItemName(drop),
          money: formatNumber(reward.money),
        })
      );
    }
  }

  updateHeader();

  // Attend la fin de l'animation de capture si elle est en cours (le combat ne
  // repart pas pendant qu'elle joue).
  let _baseWait = 700;
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__pwCaptureAnimUntil &&
      Date.now() < globalThis.__pwCaptureAnimUntil
    )
      _baseWait = Math.max(_baseWait, globalThis.__pwCaptureAnimUntil - Date.now());
  } catch (_) {}
  await wait(_baseWait);

  // PASSE 33 — donjons : la chaîne de combats est BORNÉE par le palier.
  // Sans ce garde-fou, `spawnNextWild()` relançait à l'infini. Issues :
  //   · palier final purgé, gardien non vaincu → on ENVOIE LE GARDIEN ;
  //   · palier courant purgé                   → on ARRÊTE le combat ;
  //   · sinon                                  → adversaire suivant.
  // PASSE 35 — quota non atteint : la chaîne continue seule ; quota atteint :
  // arrêt UNE FOIS (palier normal) ou gardien sans coupure (palier final).
  // PASSE 39 — CARTE : le gardien ne s'engage QUE depuis sa case (clic sur la
  // tuile boss). Une victoire sur le plateau rend TOUJOURS la main à la carte
  // (retour joueur : « on me lance le combat de boss au hasard après un combat
  // normal, sans que je me sois déplacé »). Le « N combats puis le boss » de
  // la chaîne historique n'existe plus en grille.
  let _dgStop = false;
  try {
    if (
      battle.chill &&
      battle.active &&
      !battle.isChamp &&
      !battle.isTraining &&
      pwLateLink('currentDungeonRun') &&
      currentDungeonRun() &&
      pwLateLink('dungeonFloorCleared') &&
      dungeonFloorCleared()
    ) {
      const _run = currentDungeonRun();
      const _bossFloor = pwLateLink('dungeonIsBossFloor') && dungeonIsBossFloor();
      if (_run && _run.map) {
        _dgStop = true;
      } else if (_bossFloor && _run && !_run.bossDone) {
        // On N'ARRÊTE PAS : le gardien est le prochain adversaire de la chaîne.
        battle.pendingDungeonBoss = true;
        addBattleLog(`<span class="pw-green">${tr('dungeon_bar_boss_next')}</span>`);
      } else if (!_bossFloor) {
        _dgStop = true;
        addBattleLog(`<span class="pw-green">${tr('dungeon_log_floor_done')}</span>`);
      }
    }
  } catch (_) {}

  // PASSE 36 — carte : 1 case = 1 engagement, on rend la main à la carte.
  let _dgMapPause = false;
  try {
    const _mr = currentDungeonRun();
    if (
      battle.chill &&
      battle.active &&
      !battle.isChamp &&
      !battle.isTraining &&
      _mr &&
      _mr.map &&
      !battle.pendingDungeonBoss
    ) {
      if (_mr.auto)
        setTimeout(() => {
          try {
            _dgAutoStep();
          } catch (_) {}
        }, 650);
      else _dgMapPause = true;
    }
  } catch (_) {}

  if (_dgStop && battle.active) {
    endBattle();
  } else if (_dgMapPause && battle.active) {
    endBattle();
  } else if (battle.chill && battle.active && aliveCount() > 0) {
    spawnNextWild();
  } else if (battle.active) {
    endBattle();
  }
}

// --- Migrated to ES module, globals exposed ---
if (typeof tickStatusDurations !== 'undefined') {
  if (typeof window !== 'undefined') window.tickStatusDurations = tickStatusDurations;
  if (typeof globalThis !== 'undefined') globalThis.tickStatusDurations = tickStatusDurations;
}
if (typeof applyEndOfTurnStatus !== 'undefined') {
  if (typeof window !== 'undefined') window.applyEndOfTurnStatus = applyEndOfTurnStatus;
  if (typeof globalThis !== 'undefined') globalThis.applyEndOfTurnStatus = applyEndOfTurnStatus;
}
// FIX (2026-08, crash on first K.O.): onEnemyFaint MUST be exposed — the
// ECS-driven battle loop (src/application/battle-loop.js, domain tick)
// calls it via `typeof onEnemyFaint === 'function'`; without exposure, K.O.
// resolution never started (battle.paused stayed true => frozen battle).
if (typeof onEnemyFaint !== 'undefined') {
  if (typeof window !== 'undefined') window.onEnemyFaint = onEnemyFaint;
  if (typeof globalThis !== 'undefined') globalThis.onEnemyFaint = onEnemyFaint;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export { tickStatusDurations, applyEndOfTurnStatus, onEnemyFaint };
