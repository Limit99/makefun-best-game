// Between-wave upgrades. When a wave is cleared the Warden banks its XP;
// each level earned offers a choice of 1 of 3 cards drawn from this pool.
// Every upgrade rewrites one player stat (or heals), so the build visibly
// changes how the ship fights by the late waves.

export const UPGRADES = [
  {
    id: 'damage', name: 'Heavy Bolts', icon: 'DMG',
    describe: (p) => `Bolt damage ${p.bulletDamage} → ${p.bulletDamage + 5}`,
    apply(p) { p.bulletDamage += 5; },
  },
  {
    id: 'rate', name: 'Rapid Cycler', icon: 'RPM',
    describe: (p) => `Fire rate +18% (every ${p.fireInterval.toFixed(2)}s → ${(p.fireInterval * 0.85).toFixed(2)}s)`,
    apply(p) { p.fireInterval = Math.max(0.07, p.fireInterval * 0.85); },
  },
  {
    id: 'split', name: 'Split Cannon', icon: '×2',
    describe: (p) => `Bolts per shot ${p.bulletCount} → ${p.bulletCount + 1}`,
    apply(p) { p.bulletCount += 1; },
  },
  {
    id: 'pierce', name: 'Lance Rounds', icon: '»»',
    describe: (p) => `Bolts pierce +1 enemy (now ${p.pierce + 1})`,
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'hull', name: 'Reinforced Hull', icon: '+HP',
    describe: (p) => `Max health ${p.maxHp} → ${p.maxHp + 25}, heal 25`,
    apply(p) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'repair', name: 'Field Repair', icon: '✚',
    describe: (p) => `Restore 40 health (now ${Math.ceil(p.hp)})`,
    apply(p) { p.hp = Math.min(p.maxHp, p.hp + 40); },
    available(p) { return p.hp < p.maxHp; },
  },
  {
    id: 'regen', name: 'Nano Repair', icon: '↻',
    describe: (p) => `Regenerate +0.9 health/s (now ${(p.regen + 0.9).toFixed(1)}/s)`,
    apply(p) { p.regen += 0.9; },
  },
  {
    id: 'speed', name: 'Ion Thrusters', icon: '»',
    describe: (p) => `Move speed ${Math.round(p.speed)} → ${Math.round(p.speed * 1.12)}`,
    apply(p) { p.speed = Math.round(p.speed * 1.12); },
  },
  {
    id: 'magnet', name: 'Tractor Field', icon: '◎',
    describe: (p) => `XP magnet radius ${p.magnetRadius} → ${p.magnetRadius + 55}`,
    apply(p) { p.magnetRadius += 55; },
  },
];

/** Draw up to `count` distinct upgrades the player can still use. */
export function drawUpgradeChoices(random, player, count) {
  const usable = UPGRADES.filter((u) => !u.available || u.available(player));
  const picks = [];
  const deck = usable.slice();
  while (picks.length < count && deck.length > 0) {
    const index = Math.floor(random() * deck.length);
    picks.push(deck.splice(index, 1)[0]);
  }
  return picks;
}

/** The three card rectangles (field coordinates) the choice screen shows. */
export function upgradeCardRects(field) {
  const width = 300;
  const height = 210;
  const gap = 36;
  const total = width * 3 + gap * 2;
  const startX = (field.width - total) / 2;
  const y = field.height / 2 - height / 2 + 30;
  return [0, 1, 2].map((i) => ({ x: startX + i * (width + gap), y, width, height }));
}
