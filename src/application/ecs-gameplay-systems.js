/**
 * PokeEngine — ECS Systems Registry
 *
 * Implements the game's real gameplay and presentation systems operating on ECS
 * entities and components (EnTT-style sparse sets, src/engine/core/ECS.js):
 *
 *   - combat:tick      (live 1v1 battle loop — cooldowns, moves, weather, K.O.)
 *   - combat:attack    (damage application via domain rules)
 *   - combat:xp-reward (experience/level rewards)
 *   - combat:switch    (fainted-fighter deactivation)
 *   - world:encounter  (wild spawn cadence + spawn-table resolution, chapter §1.1)
 *   - breeding:hatch   (hatchery/daycare K.O.-count progression, chapter §1.2)
 *   - economy:market   (wallet, market stock and shop/sell operations, chapter §1.3)
 *   - ui:sync          (UIComponent state → Display DOM elements)
 *
 * World knowledge the systems need (item/pokemon data tables, factory,
 * level-up mechanics) is injected through `setGameplayPorts()` by the
 * application layer — systems never touch window/G/document directly. The
 * legacy implementations they replace were deleted; parity decisions are
 * documented in MIGRATION_STATUS.md.
 *
 * @module application/ecs-gameplay-systems
 */
import * as damageRules from '../domain/battle/damage.js';
import * as hatcheryRules from '../domain/breeding/hatchery-rules.js';
import * as marketRules from '../domain/economy/market.js';
import { canAffordPurchase, canAddToBag, canSellTreasure, computeSaleValue, mergeShopStock } from '../domain/economy/shop-rules.js';
import { battleTick as domainBattleTick } from '../domain/battle/tick.js';
import { pickWildFromTable } from '../domain/world/encounter-rules.js';
import { eventBus } from '../core/event-bus.js';

/**
 * Injectable world-knowledge providers. Set once at boot by the application
 * layer (src/application/gameplay-ports.js); tests may inject fakes.
 */
const gameplayPorts = {};

export function setGameplayPorts(ports) {
  Object.assign(gameplayPorts, ports || {});
}

export function getGameplayPorts() {
  return gameplayPorts;
}

function portRng() {
  return typeof gameplayPorts.rng === 'function' ? gameplayPorts.rng : Math.random;
}

export class ECSSystemsManager {
  /**
   * @param {Object} world - ECSWorld instance
   */
  constructor(world) {
    this.world = world;
    if (this.world) {
      this._registerComponents();
      this._registerSystems();
    }
  }

  _registerComponents() {
    const comps = [
      // battle
      'Fighter', 'Stats', 'Level', 'BattleState', 'Experience', 'Reward',
      'TeamSlot', 'Fainted', 'BattleLoop',
      // world / encounters (wave 33)
      'Position', 'WorldLocation', 'WildSpawnTable', 'EncounterCooldown',
      'WildPokemon', 'PokemonRef',
      // breeding / daycare (wave 33)
      'HatcheryProgress', 'SlotIndex',
      // economy (wave 33)
      'Wallet', 'ShopStock', 'InventoryItems', 'Marketplace',
      // ui
      'Display', 'UIComponent', 'Hierarchy', 'Scene',
    ];
    for (const c of comps) {
      this.world.register(c);
    }
  }

  /** First entity carrying `name`, or -1 (singleton component lookup). */
  _firstWith(name) {
    let found = -1;
    this.world.query([name], (eid) => { if (found < 0) found = eid; });
    return found;
  }

  _registerSystems() {
    // 1. battle Tick System — the game's real-time battle loop, ECS-driven:
    //    a) per-Entity Fighter cooldowns (standalone / simulated battles);
    //    b) the live 1v1 battle loop itself: every entity carrying the
    //       `BattleLoop` component (exactly one in the application, spawned
    //       by src/application/battle-loop.js) advances the REAL domain tick
    //       (src/domain/battle/tick.js) — cooldowns, player/enemy moves,
    //       weather/terrain decay, K.O. resolution. This is the code path
    //       the shipped game runs on; the retired classic loop
    //       (src/game/combat/battle-tick.js) was deleted once this system
    //       reached strict parity (offline fast-forward VM suites passe28,
    //       passe30 and passe32 replay it tick by tick).
    this.world.system('combat:tick', [], (dt = 16) => {
      this.world.query(['Fighter', 'Stats'], (eid, fighter, _stats) => {
        if (!fighter.active || fighter.currentHP <= 0) return;
        fighter.cooldown = Math.max(0, (fighter.cooldown || 0) - dt);
        if (fighter.cooldown <= 0) {
          fighter.readyToAttack = true;
          fighter.cooldown = fighter.maxCooldown || 2000;
        }
      });
      this.world.query(['BattleLoop'], (eid, loop) => {
        if (loop && loop.paused) return;
        domainBattleTick();
        if (loop) loop.ticks = (loop.ticks || 0) + 1;
      });
    });

    // 2. battle Attack & Damage System (using src/domain/battle/damage.js)
    this.world.system('combat:attack', ['Fighter', 'Stats'], (eid, fighter, stats) => {
      if (!fighter.readyToAttack || !fighter.targetEid) return;
      const targetStats = this.world.get(fighter.targetEid, 'Stats');
      const targetFighter = this.world.get(fighter.targetEid, 'Fighter');
      if (!targetStats || !targetFighter || targetFighter.currentHP <= 0) {
        fighter.readyToAttack = false;
        return;
      }

      // Calculate damage using domain rules (move, attacker, defender)
      const dmg = damageRules.calculateDamage(
        fighter.currentMove || { power: 60, category: 'phys', type: 'Normal' },
        { level: stats.level || 50, atk: stats.atk || 100, spa: stats.spa || 100 },
        { defense: targetStats.def || 10, spDefense: targetStats.spd || 10, type1: targetStats.type1 || 'Normal' }
      );

      const actualDmg = Math.max(1, typeof dmg === 'number' ? dmg : (dmg.damage || 10));
      targetFighter.currentHP = Math.max(0, targetFighter.currentHP - actualDmg);
      fighter.readyToAttack = false;

      // Emit bidirectional observer event for UI updates
      eventBus.emit('OnPokemonTakeDamage', {
        pokemonEid: fighter.targetEid,
        damage: actualDmg,
        currentHP: targetFighter.currentHP,
        maxHP: targetStats.maxHP || 100,
        hpRatio: targetFighter.currentHP / (targetStats.maxHP || 100),
      });

      if (targetFighter.currentHP <= 0) {
        targetFighter.active = false;
        eventBus.emit('combat:faint', { eid: fighter.targetEid });
      }
    });

    // 3. battle XP Reward System
    this.world.system('combat:xp-reward', ['Fighter', 'Level', 'Experience'], (eid, fighter, levelComp, exp) => {
      if (!fighter.active || fighter.currentHP <= 0 || !fighter.pendingExpReward) return;
      const gain = Number(fighter.pendingExpReward) || 0;
      fighter.pendingExpReward = 0;
      exp.currentExp = (exp.currentExp || 0) + gain;
      while (exp.currentExp >= (exp.expToNextLevel || 1000) && (levelComp.level || 1) < 100) {
        exp.currentExp -= (exp.expToNextLevel || 1000);
        levelComp.level = (levelComp.level || 1) + 1;
        exp.expToNextLevel = Math.round((exp.expToNextLevel || 1000) * 1.2);
        eventBus.emit('pokemon:level-up', { eid, level: levelComp.level });
      }
    });

    // 4. battle Fighter Switch System
    this.world.system('combat:switch', ['Fighter', 'Stats'], (eid, fighter, _stats) => {
      if (fighter.active && fighter.currentHP <= 0) {
        fighter.active = false;
        eventBus.emit('combat:fighter-fainted', { eid });
      }
    });

    // 5. World Encounter System (wave 33 §1.1 — REAL ECS migration).
    //
    //    Entities: the player world-presence entity carries `WorldLocation`
    //    (current route), `WildSpawnTable` (that route's spawn table, plus the
    //    roaming legendary id when one is active) and `EncounterCooldown`
    //    (timer + pending spawn request). Every spawn creates a NEW entity
    //    carrying `WildPokemon` + `PokemonRef` + `Stats` — the wild pokemon is
    //    a real ECS entity handed to the battle orchestration, not an
    //    anonymous object read from a global table.
    //
    //    Cadence decision (documented in MIGRATION_STATUS.md): strict parity
    //    with the shipped game — after an enemy K.O. in a "chill" battle the
    //    next wild pokemon spawns IMMEDIATELY (intervalMs = 0), because the
    //    whole idle-loop is balanced around continuous K.O. chains. The
    //    `EncounterCooldown` component still records the cadence explicitly so
    //    a timed mode can be tuned by data, not by code.
    this.world.system('world:encounter', ['WorldLocation', 'WildSpawnTable', 'EncounterCooldown'], (eid, loc, table, cd, dt = 16) => {
      cd.elapsedMs = (cd.elapsedMs || 0) + Math.max(0, Number(dt) || 0);
      if (!cd.pendingSpawn) return;
      if (cd.elapsedMs < (cd.intervalMs || 0)) return;

      const pick = pickWildFromTable(table.entries || [], {
        roamingId: table.roamingId || 0,
        rng: portRng(),
      });
      cd.pendingSpawn = false;
      cd.elapsedMs = 0;
      if (!pick) { cd.lastSpawnEid = -1; cd.lastOutcome = 'empty-table'; return; }

      const createPoke = gameplayPorts.createPoke;
      if (typeof createPoke !== 'function') { cd.lastSpawnEid = -1; cd.lastOutcome = 'no-factory'; return; }
      const isShiny = (typeof globalThis.rollShiny === 'function') ? globalThis.rollShiny(pick.speciesId) : false;
      const poke = createPoke(pick.speciesId, pick.level, isShiny);
      if (!poke) { cd.lastSpawnEid = -1; cd.lastOutcome = 'factory-null'; return; }
      if (pick.isRoaming) poke._isRoaming = true;
      if (isShiny) {
        poke.shiny = true;
        poke.shinyActive = true;
        poke.shinyUnlocked = true;
      }

      const wildEid = this.world.create();
      this.world.add(wildEid, 'WildPokemon', {
        speciesId: pick.speciesId,
        level: pick.level,
        bucket: pick.bucket,
        isRoaming: !!pick.isRoaming,
        locationId: loc.id || null,
        reason: cd.pendingReason || 'ko-chain',
      });
      this.world.add(wildEid, 'PokemonRef', { poke });
      this.world.add(wildEid, 'Stats', {
        level: poke.level || pick.level,
        maxHP: poke.maxHP || 100,
        atk: poke.atk || 50, def: poke.def || 50,
        spa: poke.spa || 50, spd: poke.spd || 50, spe: poke.spe || 50,
      });
      cd.lastSpawnEid = wildEid;
      cd.lastOutcome = 'spawned';
      eventBus.emit('world:encounter-spawned', {
        locationId: loc.id || null,
        wildEid,
        speciesId: pick.speciesId,
        level: pick.level,
        bucket: pick.bucket,
        isRoaming: !!pick.isRoaming,
        reason: cd.pendingReason || 'ko-chain',
      });
    });

    // 6. Breeding & Hatchery System (wave 33 §1.2 — REAL ECS migration).
    //
    //    One entity per occupied hatchery slot, carrying `HatcheryProgress`
    //    (mode 'incubate' | 'daycare', K.O. counter, requirement), `SlotIndex`
    //    and `PokemonRef`. Each battle K.O. runs this system with
    //    `world.run('breeding:hatch', koCount)` from the battle resolution
    //    path (application layer) — the system applies the domain rules
    //    (src/domain/breeding/hatchery-rules.js) to component data, performs
    //    daycare level-ups through the injected port, and settles fees on the
    //    player `Wallet` component. Evictions (insufficient funds / level 100)
    //    and hatching are recorded as component outcomes consumed by the
    //    application layer (persistence + UI boundaries).
    //
    //    Cadence decision (documented in MIGRATION_STATUS.md): strict parity —
    //    progression stays K.O.-count based (10 K.O. = 1 daycare level;
    //    25–100 K.O. to hatch/revive), modelled on components, not switched to
    //    the step counter of the mainline games.
    this.world.system('breeding:hatch', ['HatcheryProgress', 'SlotIndex', 'PokemonRef'], (eid, progress, slotIdx, ref, koCount = 1) => {
      const count = Math.max(1, Math.floor(Number(koCount) || 1));
      progress.lastOutcome = null;

      if (progress.mode === 'incubate') {
        const res = hatcheryRules.applyIncubationKills(
          { stepsKo: progress.stepsKo, requiredKos: progress.requiredKos },
          count,
          { autoHatch: !!progress.autoHatch }
        );
        progress.stepsKo = res.stepsKo;
        if (res.hatchReady && !progress.hatchPending) {
          progress.hatchPending = true;
          progress.lastOutcome = { kind: 'hatch-ready', slotIndex: slotIdx.index };
          eventBus.emit('breeding:hatch-ready', { slotIndex: slotIdx.index, eid });
        }
        return;
      }

      // daycare ('exp') mode
      const poke = ref && ref.poke ? ref.poke : null;
      if (!poke || (poke.level || 1) >= 100) { progress.lastOutcome = { kind: 'noop' }; return; }
      const res = hatcheryRules.applyDaycareKills(
        { stepsKo: progress.stepsKo, level: poke.level || 1 },
        count,
        { kosPerLevel: progress.kosPerLevel || hatcheryRules.DAYCARE_KOS_PER_LEVEL, maxLevel: 100 }
      );
      progress.stepsKo = res.stepsKo;
      if (res.levelsGained <= 0) { progress.lastOutcome = { kind: 'progress' }; return; }

      const levelUp = gameplayPorts.levelUpPokemon;
      if (typeof levelUp === 'function') {
        for (let i = 0; i < res.levelsGained; i++) levelUp(poke);
      } else {
        poke.level = res.level;
      }

      const feePerLevel = typeof gameplayPorts.getDaycareLevelUpFee === 'function' ? gameplayPorts.getDaycareLevelUpFee() : 0;
      const totalFee = hatcheryRules.computeDaycareFee(res.levelsGained, feePerLevel);
      const walletEid = this._firstWith('Wallet');
      const wallet = walletEid >= 0 ? this.world.get(walletEid, 'Wallet') : null;
      const funds = wallet ? (Number(wallet.money) || 0) : Infinity;

      if (!canAffordPurchase(funds, totalFee)) {
        progress.lastOutcome = { kind: 'evict', reason: 'insufficient-funds', slotIndex: slotIdx.index, levelsGained: res.levelsGained, fee: totalFee };
        eventBus.emit('breeding:daycare-evict', { slotIndex: slotIdx.index, reason: 'insufficient-funds', fee: totalFee, pokemonName: poke.name });
        return;
      }
      if (wallet && totalFee > 0) wallet.money = (Number(wallet.money) || 0) - totalFee;

      const reachedHundred = (poke.level || 1) >= 100;
      progress.lastOutcome = {
        kind: 'daycare-levelup',
        slotIndex: slotIdx.index,
        levelsGained: res.levelsGained,
        fee: totalFee,
        reachedHundred,
      };
      eventBus.emit('breeding:daycare-levelup', {
        slotIndex: slotIdx.index, levels: res.levelsGained, fee: totalFee, pokemonName: poke.name, newLevel: poke.level,
      });
      if (reachedHundred) {
        progress.lastOutcome = { kind: 'evict', reason: 'max-level', slotIndex: slotIdx.index, levelsGained: res.levelsGained, fee: totalFee };
        eventBus.emit('breeding:daycare-evict', { slotIndex: slotIdx.index, reason: 'max-level', fee: 0, pokemonName: poke.name });
      }
    });

    // 7. Economy System (wave 33 §1.3 — REAL ECS migration).
    //
    //    Entities: the player presence carries `Wallet` + `InventoryItems`;
    //    a marketplace entity carries `Marketplace` + `ShopStock`. Operations
    //    arrive as system arguments (`world.run('economy:market', {op, ...})`)
    //    from the shop/market/bag UI through the application layer; the
    //    system mutates component data only (money, stock, counts) using the
    //    domain rules (src/domain/economy/*) and emits events. The
    //    application layer persists the outcome (G.money, inventory pokes,
    //    saves) and refreshes the UI.
    this.world.system('economy:market', ['Marketplace', 'ShopStock'], (eid, market, stock, op = {}) => {
      const walletEid = this._firstWith('Wallet');
      const wallet = walletEid >= 0 ? this.world.get(walletEid, 'Wallet') : null;
      const inventory = walletEid >= 0 ? this.world.get(walletEid, 'InventoryItems') : null;
      market.lastOutcome = null;

      if (op.op === 'refresh-market') {
        const region = op.region || stock.region || 'kanto';
        stock.region = region;
        const ctx = {
          wildSpeciesIds: typeof gameplayPorts.getWildSpeciesIds === 'function' ? gameplayPorts.getWildSpeciesIds(region) : new Set(),
          evoTargetIds: typeof gameplayPorts.getEvoTargetIds === 'function' ? gameplayPorts.getEvoTargetIds() : new Set(),
          pokemonData: typeof gameplayPorts.getPokemonData === 'function' ? gameplayPorts.getPokemonData() : {},
        };
        stock.items = marketRules.computeMarketStock(region, ctx);
        market.lastOutcome = { ok: true, op: 'refresh-market', count: stock.items.length };
        return;
      }

      if (op.op === 'refresh-shop') {
        // Shop stock rule (domain): static stock + generated TM/HM stock,
        // deduplicated. The shop UI reads `ShopStock.shopItems` as its model.
        const shopId = String(op.shopId || stock.shopId || '');
        stock.shopId = shopId;
        const base = typeof gameplayPorts.getShopBaseStock === 'function' ? gameplayPorts.getShopBaseStock(shopId) : [];
        const generated = typeof gameplayPorts.getShopGeneratedStock === 'function' ? gameplayPorts.getShopGeneratedStock(shopId) : [];
        stock.shopItems = mergeShopStock(base, generated);
        market.lastOutcome = { ok: true, op: 'refresh-shop', shopId, count: stock.shopItems.length };
        return;
      }

      if (op.op === 'buy-pokemon') {
        const id = Number(op.speciesId);
        const entry = (stock.items || []).find((it) => it.id === id);
        if (!entry) { market.lastOutcome = { ok: false, op: 'buy-pokemon', reason: 'not-listed', speciesId: id }; return; }
        if (!wallet) { market.lastOutcome = { ok: false, op: 'buy-pokemon', reason: 'no-wallet', speciesId: id }; return; }
        if (!canAffordPurchase(wallet.money, entry.price)) {
          market.lastOutcome = { ok: false, op: 'buy-pokemon', reason: 'insufficient-funds', speciesId: id, price: entry.price };
          eventBus.emit('economy:purchase-denied', { kind: 'pokemon', speciesId: id, price: entry.price, money: wallet.money });
          return;
        }
        wallet.money = (Number(wallet.money) || 0) - entry.price;
        market.lastOutcome = { ok: true, op: 'buy-pokemon', speciesId: id, price: entry.price, moneyAfter: wallet.money };
        eventBus.emit('economy:pokemon-bought', { speciesId: id, price: entry.price, moneyAfter: wallet.money });
        return;
      }

      if (op.op === 'buy-item') {
        const key = String(op.itemKey || '');
        const itemDef = typeof gameplayPorts.getItemDef === 'function' ? gameplayPorts.getItemDef(key) : null;
        if (!itemDef || !itemDef.price) { market.lastOutcome = { ok: false, op: 'buy-item', reason: 'unknown-item', itemKey: key }; return; }
        const owned = inventory && inventory.counts ? (inventory.counts[key] || 0) : 0;
        if (!canAddToBag(itemDef, owned)) {
          market.lastOutcome = { ok: false, op: 'buy-item', reason: 'bag-full', itemKey: key };
          eventBus.emit('economy:purchase-denied', { kind: 'item', itemKey: key, reason: 'bag-full' });
          return;
        }
        if (!wallet) { market.lastOutcome = { ok: false, op: 'buy-item', reason: 'no-wallet', itemKey: key }; return; }
        const price = Number(itemDef.price) || 0;
        if (!canAffordPurchase(wallet.money, price)) {
          market.lastOutcome = { ok: false, op: 'buy-item', reason: 'insufficient-funds', itemKey: key, price };
          eventBus.emit('economy:purchase-denied', { kind: 'item', itemKey: key, price, money: wallet.money });
          return;
        }
        wallet.money = (Number(wallet.money) || 0) - price;
        if (inventory) {
          if (!inventory.counts) inventory.counts = {};
          inventory.counts[key] = (inventory.counts[key] || 0) + 1;
        }
        market.lastOutcome = { ok: true, op: 'buy-item', itemKey: key, price, moneyAfter: wallet.money };
        eventBus.emit('economy:item-bought', { itemKey: key, price, moneyAfter: wallet.money });
        return;
      }

      if (op.op === 'sell-treasure') {
        const key = String(op.itemKey || '');
        const itemDef = typeof gameplayPorts.getItemDef === 'function' ? gameplayPorts.getItemDef(key) : null;
        const owned = inventory && inventory.counts ? (inventory.counts[key] || 0) : 0;
        if (!canSellTreasure(itemDef, owned)) {
          market.lastOutcome = { ok: false, op: 'sell-treasure', reason: 'not-sellable', itemKey: key };
          eventBus.emit('economy:sale-denied', { itemKey: key });
          return;
        }
        const count = Math.min(Math.max(1, Math.floor(Number(op.count) || 1)), owned);
        const gain = computeSaleValue(itemDef, count);
        inventory.counts[key] = owned - count;
        if (inventory.counts[key] <= 0) delete inventory.counts[key];
        if (wallet) wallet.money = (Number(wallet.money) || 0) + gain;
        market.lastOutcome = { ok: true, op: 'sell-treasure', itemKey: key, count, gain, moneyAfter: wallet ? wallet.money : null };
        eventBus.emit('economy:item-sold', { itemKey: key, count, gain });
        return;
      }

      // unknown op — no silent success
      market.lastOutcome = { ok: false, op: op.op || 'none', reason: 'unknown-op' };
    });

    // 8. UI Synchronization System
    this.world.system('ui:sync', ['Display', 'UIComponent'], (eid, display, uiComp) => {
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
   * Run all gameplay and UI systems for one frame tick
   * @param {number} dt - Delta time in ms
   */
  update(dt = 16) {
    if (!this.world) return;
    this.world.run('combat:tick', dt);
    this.world.run('combat:attack');
    this.world.run('combat:xp-reward');
    this.world.run('combat:switch');
    this.world.run('world:encounter', dt);
    this.world.run('ui:sync');
  }
}

if (typeof window !== 'undefined') {
  window.PokeECSSystemsManager = ECSSystemsManager;
}
