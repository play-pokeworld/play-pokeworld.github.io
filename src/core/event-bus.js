export const EVENTS = Object.freeze({
  WILD_DEFEATED: 'wildDefeated',
  POKEMON_CAUGHT: 'pokemonCaught',
  MINE_SELL: 'mineSell',
  BADGE_EARNED: 'badgeEarned',
  LEAGUE_WON: 'leagueWon',
  BOSS_DEFEATED: 'bossDefeated',
  POKEMON_EVOLVED: 'pokemonEvolved',
  POKEMON_HATCHED: 'pokemonHatched',
  ITEM_OBTAINED: 'itemObtained',
});

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.delete(listener);
    if (!listeners.size) this.listeners.delete(event);
  }

  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      try {
        listener(payload);
      } catch (error) {
        console.error('[EventBus]', event, error);
      }
    }
  }

  clear(event) {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();
