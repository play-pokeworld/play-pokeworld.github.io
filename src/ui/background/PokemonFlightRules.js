/** @file PokemonFlightRules.js @brief DOM-free decorative trajectories with offscreen entries and analytical peer clearance. */
import { PokemonBackgroundRules as R } from '../../config/PokemonBackgroundRules.js';
export class PokemonFlightRules {
  /** @param {number} caught @param {{width:number,height:number}} viewport @returns {number} */
  static count(caught, viewport) {
    if (!caught || !(viewport.width > 0 && viewport.height > 0)) return 0;
    const target =
      R.MIN_WALKERS + Math.floor(caught / R.CAUGHT_PER_EXTRA_WALKER);
    const cap =
      viewport.width <= R.MOBILE_WIDTH ? R.MOBILE_MAX_WALKERS : R.MAX_WALKERS;
    return Math.min(
      target,
      cap,
      Math.max(
        1,
        Math.floor((viewport.width * viewport.height) / R.PIXELS_PER_WALKER),
      ),
    );
  }
  /** @param {Object} random @param {Object} viewport @param {Object[]} peers @param {number} startAt @returns {Object|null} */
  static plan(random, viewport, peers, startAt) {
    const { width, height } = viewport;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      !Number.isFinite(startAt)
    )
      return null;
    const active = peers.filter((f) => f && f.endAt > startAt);
    const counts = Object.fromEntries(
      R.EDGES.map((edge) => [
        edge,
        active.filter((f) => f.fromEdge === edge).length,
      ]),
    );
    const least = Math.min(...Object.values(counts)),
      entries = R.EDGES.filter((edge) => counts[edge] === least);
    for (let attempt = 0; attempt < R.MAX_ATTEMPTS; attempt++) {
      const size = random.int(
        ...(width <= R.MOBILE_WIDTH ? R.MOBILE_SIZE : R.DESKTOP_SIZE),
      );
      const fromEdge = random.pick(entries),
        destinations = R.EDGES.filter((edge) => edge !== fromEdge);
      const toEdge = random.pick([...destinations, R.OPPOSITE[fromEdge]]);
      const from = PokemonFlightRules._edgePoint(
          fromEdge,
          size,
          viewport,
          random,
        ),
        to = PokemonFlightRules._edgePoint(toEdge, size, viewport, random);
      if (!PokemonFlightRules._crossesInterior(from, to, size, viewport))
        continue;
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const duration = Math.max(
        R.MIN_DURATION_MS,
        Math.min(
          R.MAX_DURATION_MS,
          (distance / random.int(...R.SPEED)) * R.MILLISECONDS_PER_SECOND,
        ),
      );
      const flight = {
        fromEdge,
        toEdge,
        from,
        to,
        size,
        startAt,
        duration,
        endAt: startAt + duration,
      };
      if (active.every((peer) => PokemonFlightRules.clears(flight, peer)))
        return flight;
    }
    return null;
  }
  /** @param {Object} flight @param {number} at @returns {{x:number,y:number}} Top-left coordinates. */
  static position(flight, at) {
    const t = Math.max(0, Math.min(1, (at - flight.startAt) / flight.duration));
    return {
      x: flight.from.x + (flight.to.x - flight.from.x) * t,
      y: flight.from.y + (flight.to.y - flight.from.y) * t,
    };
  }
  /** @param {Object} a @param {Object} b @returns {boolean} Encasing circles never overlap during shared lifetime. */
  static clears(a, b) {
    const begin = Math.max(a.startAt, b.startAt),
      end = Math.min(a.endAt, b.endAt);
    if (begin >= end) return true;
    const p = PokemonFlightRules.position(a, begin),
      q = PokemonFlightRules.position(b, begin);
    const rx = p.x + a.size / 2 - q.x - b.size / 2,
      ry = p.y + a.size / 2 - q.y - b.size / 2;
    const vx =
        (a.to.x - a.from.x) / a.duration - (b.to.x - b.from.x) / b.duration,
      vy = (a.to.y - a.from.y) / a.duration - (b.to.y - b.from.y) / b.duration;
    const square = vx * vx + vy * vy,
      t =
        square > 0
          ? Math.max(0, Math.min(end - begin, -(rx * vx + ry * vy) / square))
          : 0;
    return (
      Math.hypot(rx + vx * t, ry + vy * t) >=
      (a.size + b.size) * Math.SQRT1_2 + R.SEPARATION
    );
  }
  /** @private */
  static _edgePoint(edge, size, { width, height }, random) {
    const x = random.next() * width - size / 2,
      y = random.next() * height - size / 2;
    if (edge === 'left') return { x: -size - R.OFFSCREEN_MARGIN, y };
    if (edge === 'right') return { x: width + R.OFFSCREEN_MARGIN, y };
    if (edge === 'top') return { x, y: -size - R.OFFSCREEN_MARGIN };
    return { x, y: height + R.OFFSCREEN_MARGIN };
  }
  /** @private Reject corner skims that barely enter the view. */
  static _crossesInterior(from, to, size, { width, height }) {
    const x = from.x + size / 2,
      y = from.y + size / 2,
      dx = to.x - from.x,
      dy = to.y - from.y;
    const bounds = [
      [-dx, x - width * R.INTERIOR_INSET],
      [dx, width * (1 - R.INTERIOR_INSET) - x],
      [-dy, y - height * R.INTERIOR_INSET],
      [dy, height * (1 - R.INTERIOR_INSET) - y],
    ];
    let low = 0,
      high = 1;
    for (const [p, q] of bounds) {
      if (Math.abs(p) < R.EPSILON) {
        if (q < 0) return false;
        continue;
      }
      const t = q / p;
      if (p < 0) low = Math.max(low, t);
      else high = Math.min(high, t);
      if (low > high) return false;
    }
    return (
      (high - low) * Math.hypot(dx, dy) >=
      Math.min(width, height) * R.MIN_CHORD_RATIO
    );
  }
}
