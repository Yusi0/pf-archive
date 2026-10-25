// Numbers for the :::compare table. Pure functions, no DOM.

export const HP = 100;

/** Lower-case letters, digits and Hangul only: "VZ. 808" and "vz.808" give the same key, "장전 속도" and "장전속도" too. */
export function foldName(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

/** Damage of one bullet at `distance` studs: linear between the curve's points, flat before the first and after the last. */
export function damageAt(graph, distance) {
  if (!graph || !graph.length) return null;
  if (distance <= graph[0].distance) return graph[0].damage;
  for (let i = 1; i < graph.length; i++) {
    const a = graph[i - 1];
    const b = graph[i];
    if (distance <= b.distance) {
      if (b.distance === a.distance) return b.damage;
      const t = (distance - a.distance) / (b.distance - a.distance);
      return a.damage + (b.damage - a.damage) * t;
    }
  }
  return graph[graph.length - 1].damage;
}

/** Damage per trigger pull: a shotgun lands every pellet (best case), anything else lands one bullet. */
export function damagePerShot(stats, distance, multiplier = 1) {
  const bullet = damageAt(stats.damageGraph, distance);
  if (bullet === null) return null;
  return bullet * (stats.pellets && stats.pellets > 1 ? stats.pellets : 1) * multiplier;
}

/** Bullets to kill; a small tolerance keeps 33.3333... x3 = 100 from needing a fourth bullet. */
export function bulletsToKill(damage, hp = HP) {
  if (!damage || damage <= 0) return null;
  return Math.ceil(hp / damage - 1e-9);
}

/** Milliseconds from the first to the last bullet. */
export function timeToKillMs(bullets, rpm) {
  if (!bullets || !rpm) return null;
  return ((bullets - 1) * 60000) / rpm;
}

export function round(value, digits = 1) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** The damage curve's first drop: where falloff starts and where it ends. */
export function rangeOf(graph) {
  if (!graph || !graph.length) return { start: null, end: null };
  return { start: graph.length > 1 ? graph[1].distance : graph[0].distance, end: graph[graph.length - 1].distance };
}

/** Base stats with an attachment's changes laid over them. */
export function mergeStats(base, delta) {
  return delta ? { ...base, ...delta } : base;
}

/** Relative change in percent, null when it cannot be told. */
export function percentChange(from, to) {
  if (typeof from !== 'number' || typeof to !== 'number' || from === 0) return null;
  return round(((to - from) / from) * 100, 1);
}
