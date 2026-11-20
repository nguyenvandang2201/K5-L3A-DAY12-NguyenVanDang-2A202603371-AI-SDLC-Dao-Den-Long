import { ring } from './math.mjs';
export function getMap(night = 1) {
  if (night === 1) return {
    night, name: 'Đảo Bến', duration: 240,
    islands: [{ x: 0, z: 0, radius: 40 }], pads: [], charms: [],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motePoints: [...ring(0, 0, 12, 8), ...ring(0, 0, 33, 16)],
    shadePoints: ring(0, 0, 37, 12, 15), shadeInterval: 480, shadeCap: 6, shadeSpeed: 4
  };
  if (night === 2) return {
    night, name: 'Đảo Cau', duration: 270,
    islands: [{ x: 0, z: 0, radius: 28 }, { x: 70, z: 0, radius: 28 }],
    bridge: { x0: 26, x1: 44, z0: -2, z1: 2 },
    pads: [{ pos: [20, 0, 18], vy: 14, speed: 24, target: [70, 0, 0] }, { pos: [50, 0, -18], vy: 14, speed: 24, target: [0, 0, 0] }],
    charms: [[35, 0, 0]],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motePoints: [0, 70].flatMap(x => [...ring(x, 0, 10, 4), ...ring(x, 0, 22, 8)]),
    shadePoints: [0, 70].flatMap(x => ring(x, 0, 26, 8, 22.5)), shadeInterval: 420, shadeCap: 8, shadeSpeed: 4
  };
  if (night === 3) return {
    night, name: 'Đảo Chuông', duration: 300,
    islands: [{ x: 0, z: 0, radius: 45 }],
    pads: [{ pos: [0, 3, 13], vy: 12, speed: 8, target: [0, 3, -10] }],
    charms: [[30, 0, 25], [-30, 0, 25]],
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motePoints: [...ring(0, 0, 34, 18), ...Array.from({ length: 8 }, (_, i) => { const a = (20 + i * 20) * Math.PI / 180; return [18 * Math.cos(a), 3, 18 * Math.sin(a)]; }), ...ring(0, 0, 5, 4, 45, 6)],
    shadePoints: ring(0, 0, 43, 16), shadeInterval: 360, shadeCap: 10, shadeSpeed: 4.5
  };
  throw new Error('night must be 1, 2 or 3');
}
export function terrainHeight(map, x, z) {
  if (map.bridge && x >= 26 && x <= 44 && Math.abs(z) <= 2) return 0;
  if (!map.islands.some(i => Math.hypot(x - i.x, z - i.z) <= i.radius + 1e-9)) return -Infinity;
  if (map.night !== 3) return 0;
  const r = Math.hypot(x, z);
  if (r <= 8) return 6;
  if (r >= 12 && r <= 24 && z > 0) return 3;
  for (const a of [Math.PI / 6, 5 * Math.PI / 6]) {
    const along = x * Math.cos(a) + z * Math.sin(a), across = -x * Math.sin(a) + z * Math.cos(a);
    if (along >= 24 && along <= 30 && Math.abs(across) <= 1.5) return (30 - along) / 2;
  }
  return 0;
}
export function blocked(map, old, next, maxRise = .2) {
  if (map.night === 3 && Math.hypot(next[0], next[2]) < 2 && Math.hypot(old[0], old[2]) >= 2 && next[1] < 14) return true;
  const ground = terrainHeight(map, next[0], next[2]);
  return ground > old[1] + maxRise;
}
