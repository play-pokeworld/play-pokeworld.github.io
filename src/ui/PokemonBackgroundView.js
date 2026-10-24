/** @file PokemonBackgroundView.js @brief Bounded decorative collection pool; CSS flies, a quiet view poll schedules offscreen journeys. */
import { UIContainer } from './UIContainer.js';
import { UIImage } from './UIImage.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { SeededRandom } from '../core/SeededRandom.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { PokemonBackgroundRules as R } from '../config/PokemonBackgroundRules.js';
import { PokemonFlightRules } from './background/PokemonFlightRules.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
export class PokemonBackgroundView extends UIContainer {
  constructor({
    random = null,
    clock = () => performance.now(),
    viewport = () => ({ width: window.innerWidth, height: window.innerHeight }),
  } = {}) {
    super({
      id: 'pw-background-pokemon-layer',
      className: 'pw-background-pokemon-layer',
      name: 'PokemonBackgroundView',
    });
    this._clock = clock;
    this._viewportSource = viewport;
    this._random = random || new SeededRandom(Date.now() ^ Math.floor(clock()));
    this._roster = [];
    this._walkers = [];
    this._save = null;
    this._signature = '';
    this._viewport = { width: 0, height: 0 };
    this._nextSpawn = 0;
    this._nextPoll = 0;
    this._pageActive = true;
    this._media = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._resize = () => this.refresh(true);
    this._motionChange = () => this.refresh(true);
    this._visibility = () => this.refresh(true);
    window.addEventListener('resize', this._resize);
    this._media.addEventListener?.('change', this._motionChange);
    document.addEventListener('visibilitychange', this._visibility);
    this.setAttribute('aria-hidden', 'true');
    for (const type of [
      PokedexChangedEvent,
      SaveLoadedEvent,
      SaveCreatedEvent,
      SaveDeletedEvent,
    ])
      this.listen(type, () => this.refresh());
    this.refresh();
  }
  /** Reconcile captured species without interrupting journeys on ordinary Dex updates. */
  refresh(reset = false) {
    const save = SaveSystem.getInstance().getCurrentSave(),
      roster = save?.pokedex.getCaughtSpecies() || [],
      viewport = this._viewportSource();
    const signature = roster
      .map((p) => `${p.species}:${p.shiny ? 1 : 0}`)
      .join('|');
    const resized =
      viewport.width !== this._viewport.width ||
      viewport.height !== this._viewport.height;
    const changed = signature !== this._signature || save !== this._save;
    if (!reset && !resized && !changed) return;
    if (reset || resized || save !== this._save) this._resetFlights();
    this._save = save;
    this._roster = roster;
    this._signature = signature;
    this._viewport = viewport;
    const count = PokemonFlightRules.count(roster.length, viewport);
    while (this._walkers.length > count) {
      const walker = this._walkers.pop();
      this.removeChild(walker.root);
      walker.root.destroy();
    }
    while (this._walkers.length < count) this._createWalker();
    this.toggleClass('has-walkers', count > 0);
    this._nextPoll = 0;
    this._poll();
  }
  /** @private */
  _createWalker() {
    const root = new UIContainer({
      className: 'pw-background-pokemon-walker',
      name: 'BackgroundPokemonWalker',
    });
    const image = new UIImage({
      className: 'pw-background-pokemon-sprite',
      alt: '',
      pixelated: true,
      loading: 'eager',
    });
    root.addChild(image);
    this.addChild(root);
    this._walkers.push({
      root,
      image,
      flight: null,
      retryAt: 0,
      cycle: false,
      previousSpecies: null,
      committedAt: 0,
    });
  }
  /** @private */
  _resetFlights() {
    for (const walker of this._walkers) {
      walker.root.removeClass('is-flying');
      walker.flight = null;
      walker.retryAt = 0;
    }
    this._nextSpawn = this._clock();
  }
  /** @private */
  _motionAllowed() {
    return (
      this._pageActive &&
      !this._media.matches &&
      document.visibilityState !== 'hidden'
    );
  }
  /** @private */
  _poll() {
    if (!this._motionAllowed()) return;
    const now = this._clock();
    if (now < this._nextPoll) return;
    this._nextPoll = now + R.POLL_MS;
    for (const walker of this._walkers) {
      if (walker.flight && now >= walker.flight.endAt) {
        walker.flight = null;
        walker.root.removeClass('is-flying');
      }
      if (walker.flight || now < walker.retryAt || !this._roster.length)
        continue;
      const startAt = Math.max(now, this._nextSpawn);
      const peers = this._walkers
        .filter((other) => other !== walker)
        .map((other) => other.flight)
        .filter(Boolean);
      const flight = PokemonFlightRules.plan(
        this._random,
        this._viewport,
        peers,
        startAt,
      );
      if (!flight) {
        walker.retryAt = now + R.RETRY_MS;
        continue;
      }
      const alternate = this._roster.filter(
          (p) => p.species !== walker.previousSpecies,
        ),
        entry = this._random.pick(alternate.length ? alternate : this._roster);
      walker.image.setSource(
        AssetPaths.pokemonSprite(entry.species, '', entry.shiny),
      );
      walker.image.toggleClass('is-shiny', entry.shiny);
      walker.previousSpecies = entry.species;
      walker.flight = flight;
      walker.committedAt = now;
      walker.cycle = !walker.cycle;
      this._nextSpawn = flight.startAt + this._random.int(...R.SPAWN_GAP_MS);
      for (const [key, value] of Object.entries({
        x0: flight.from.x,
        y0: flight.from.y,
        x1: flight.to.x,
        y1: flight.to.y,
        size: flight.size,
      }))
        walker.root._setCssVariable(
          `--pw-background-${key}`,
          `${value.toFixed(3)}px`,
        );
      walker.root._setCssVariable(
        '--pw-background-duration',
        `${flight.duration}ms`,
      );
      walker.root._setCssVariable(
        '--pw-background-delay',
        `${Math.max(0, flight.startAt - now)}ms`,
      );
      walker.root.toggleClass(
        'pw-background-pokemon-walker--facing-left',
        flight.to.x < flight.from.x,
      );
      walker.root.toggleClass(
        'pw-background-pokemon-walker--facing-right',
        flight.to.x >= flight.from.x,
      );
      walker.root.toggleClass('flight-a', walker.cycle);
      walker.root.toggleClass('flight-b', !walker.cycle);
      walker.root.addClass('is-flying');
    }
  }
  /** @override */
  onUpdate() {
    this._poll();
  }
  /** @override */
  onEnter() {
    this._pageActive = true;
    this.refresh(true);
    super.onEnter();
  }
  /** @override */
  onExit() {
    this._pageActive = false;
    this._resetFlights();
    super.onExit();
  }
  /** @override */
  onDestroy() {
    window.removeEventListener('resize', this._resize);
    this._media.removeEventListener?.('change', this._motionChange);
    document.removeEventListener('visibilitychange', this._visibility);
    this._resetFlights();
    super.onDestroy();
  }
}
