import { ring } from './math.mjs';
export function getMap(night = 1) {
  if (night !== 1) throw new Error('Phase 1 supports night 1 only');
  return {
    night, name: 'Đảo Bến', duration: 300,
    islands: [{ x: 0, z: 0, radius: 40 }], pads: [], charms: [],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motePoints: [...ring(0, 0, 12, 8), ...ring(0, 0, 33, 16)],
    shadePoints: ring(0, 0, 37, 12, 15), shadeInterval: 480, shadeCap: 6, shadeSpeed: 4
  };
}
export function terrainHeight(map, x, z) {
  return map.islands.some(i => Math.hypot(x - i.x, z - i.z) <= i.radius + 1e-9) ? 0 : -Infinity;
}
