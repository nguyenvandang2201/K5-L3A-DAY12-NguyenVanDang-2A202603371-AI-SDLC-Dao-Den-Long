export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const round = (v, n = 3) => Number(v.toFixed(n));
export const xzDistance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const naturalId = (a, b) => {
  const aa = String(a.id ?? a), bb = String(b.id ?? b);
  const ma = aa.match(/^(.*?)(\d+)$/), mb = bb.match(/^(.*?)(\d+)$/);
  if (ma && mb && ma[1] === mb[1]) return Number(ma[2]) - Number(mb[2]);
  return aa < bb ? -1 : aa > bb ? 1 : 0;
};
export function direction(a, b) {
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz);
  return len > 1e-10 ? [dx / len, dz / len] : [1, 0];
}
export function moveDirection(move, yaw) {
  let [x, z] = move;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  const a = yaw * Math.PI / 180;
  return [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
}
export function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let t = Math.imul(value ^ value >>> 15, value | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function ring(cx, cz, radius, count, offset = 0, height = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = (offset + i * 360 / count) * Math.PI / 180;
    return [cx + radius * Math.cos(a), height, cz + radius * Math.sin(a)];
  });
}
