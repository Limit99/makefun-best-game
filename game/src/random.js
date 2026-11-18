// A small seeded random number generator (mulberry32): the same seed always
// deals the same spawns, which is what makes the screenshot scenes repeatable
// and a run fair to retry.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random point on the arena's edge, kept a margin away from the corners. */
export function randomEdgePoint(random, width, height, margin) {
  const side = Math.floor(random() * 4);
  const x = margin + random() * (width - margin * 2);
  const y = margin + random() * (height - margin * 2);
  if (side === 0) return { x, y: -30 };
  if (side === 1) return { x, y: height + 30 };
  if (side === 2) return { x: -30, y };
  return { x: width + 30, y };
}
