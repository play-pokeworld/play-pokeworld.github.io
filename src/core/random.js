export function clamp(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function randomInt(min, max) {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function chancePercent(percent) {
  const p = clamp(Number(percent), 0, 100);
  if (p <= 0) return false;
  if (p >= 100) return true;
  return Math.random() * 100 < p;
}


