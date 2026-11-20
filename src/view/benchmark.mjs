import { Game } from '../core/game.mjs';
import { rng } from '../core/math.mjs';
export function benchmarkScene(seed) {
  const random = rng(seed), point = y => { const r = Math.sqrt(random()) * 39, a = random() * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  const game = new Game({ seed, scenario: { random_motes: false, random_shades: false,
    motes: Array.from({ length: 100 }, () => point(0)), shades: Array.from({ length: 200 }, (_, i) => ({ id: `S${i + 1}`, pos: point(.8), state: 'wander' })),
    lanterns: [1, 2, 3].map(i => ({ id: `L${i}`, lit: true, fuel: 100 })) } });
  game.benchmark = true; return game;
}
export function summarizeFrames(samples) {
  if (!samples.length) throw new Error('No measured frames');
  const sorted = [...samples].sort((a, b) => a - b), k = Math.max(1, Math.ceil(samples.length * .01));
  return { avg_fps: 1000 * samples.length / samples.reduce((a, b) => a + b, 0),
    p1_low_fps: 1000 / (sorted.slice(-k).reduce((a, b) => a + b, 0) / k),
    frame_ms_p95: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)], frames: samples.length };
}
