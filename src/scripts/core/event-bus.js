'use strict';
// ============================================================================
// EVENT BUS — Observer pattern (découlage des systèmes de gameplay)
// Les systèmes"producteurs"(combat, mine, évolution…) ÉMETTENT des événements ;
// les systèmes"consommateurs"(quêtes, statistiques…) S'ABONNENT.
// Ainsi le combat annonce"un Pokémon sauvage a été vaincu", il ne vérifie
// JAMAIS l'avancement des quêtes — c'est au système de quêtes de réagir.
// ============================================================================
const EVENTS = Object.freeze({
 WILD_DEFEATED: 'wildDefeated', // { loc }
 POKEMON_CAUGHT: 'pokemonCaught', // { loc }
 MINE_SELL: 'mineSell', // { key, amount }
 BADGE_EARNED: 'badgeEarned', // { champId }
 LEAGUE_WON: 'leagueWon', // {}
 BOSS_DEFEATED: 'bossDefeated', // { questId, pokeId }
 POKEMON_EVOLVED: 'pokemonEvolved', // { fromId, toId }
 POKEMON_HATCHED: 'pokemonHatched', // { id, shiny }
 ITEM_OBTAINED: 'itemObtained' // { key, qty }
});

const EventBus = {
 _listeners: {},
 on(event, fn){
 if(!this._listeners[event]) this._listeners[event] = [];
 this._listeners[event].push(fn);
 return () => this.off(event, fn);
 },
 off(event, fn){
 const arr = this._listeners[event];
 if(!arr) return;
 const i = arr.indexOf(fn);
 if(i >= 0) arr.splice(i, 1);
 },
 emit(event, payload){
 const arr = this._listeners[event];
 if(!arr) return;
 // copie pour autoriser (un)subscribe pendant l'émission
 for(const fn of arr.slice()) {
 try { fn(payload); } catch(e){ console.error('[EventBus]', event, e); }
 }
 }
};


