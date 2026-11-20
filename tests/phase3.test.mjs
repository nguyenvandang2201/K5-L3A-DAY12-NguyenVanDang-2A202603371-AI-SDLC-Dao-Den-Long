import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, defaultInput } from '../src/core/game.mjs';
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const input = x => ({ ...defaultInput(), ...x });
test('fuel integer decay exact, out resets, ever_lit preserved', () => {
  const g = new Game({ scenario: { ...quiet, lanterns: [{ id: 'L1', lit: true, fuel: 1 }] } });
  for (let i = 0; i < 59; i++) g.step(); assert.equal(g.lanterns[0].fuelUnits, 1);
  g.step(); assert.equal(g.lanterns[0].lit, false); assert.equal(g.lanterns[0].deposited, 0); assert.equal(g.lanterns[0].ever_lit, true);
  assert.equal(g.events.filter(e => e.name === 'lantern_out').length, 1);
});
test('refuel caps100 and ceil consumption, relight5 grows capacity and scores40', () => {
  const g = new Game({ scenario: { ...quiet, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 85 }] } });
  g.step(input({ interact: true })); assert.equal(g.player.carried, 8); assert.equal(g.lanterns[0].fuelUnits, 6000); assert.equal(g.score, 10);
  const r = new Game({ scenario: { ...quiet, player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], ever_lit: true }] } });
  r.step(input({ interact: true })); assert.equal(r.lanterns[0].relit_count, 1); assert.equal(r.capacity, 12); assert.equal(r.score, 65);
  assert.equal(r.events.find(e => e.name === 'lantern_lit').data.relight, true);
});
test('scenario lit not counted; capacity clamps at20', () => {
  const g = new Game({ scenario: { ...quiet, player: { successful_lights: 9 }, lanterns: [{ id: 'L1', lit: true }] } });
  assert.equal(g.capacity, 20); assert.equal(g.score, 0); assert.equal(g.successfulLights, 9);
});
test('two draining shades consume11fuel/s and event each60, pulse drain scores15', () => {
  const g = new Game({ scenario: { ...quiet, player: { pos: [-20, 0, 0] }, lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 29 }], shades: [{ id: 'S1', pos: [20, .8, 0], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [20, .8, 0], state: 'drain', target_lantern_id: 'L1' }] } });
  for (let i = 0; i < 60; i++) g.step(); assert.equal(g.lanterns[0].fuel, 18); assert.equal(g.events.filter(e => e.name === 'fuel_drain').length, 2);
  const p = new Game({ scenario: { ...quiet, player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [4, 0, 0], lit: true, fuel: 20 }], shades: [{ pos: [4, .8, 0], state: 'drain', target_lantern_id: 'L1' }] } });
  p.step(input({ pulse: true })); assert.equal(p.score, 15); assert.equal(p.shades[0].state, 'stunned');
});
test('safe threshold30, wander picks weak nearest, refuel ejects shades', () => {
  const g = new Game({ scenario: { ...quiet, player: { pos: [-20, 0, 0] }, lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 29 }], shades: [{ pos: [21, .8, 0], state: 'wander' }] } });
  assert.equal(g.isSafe(g.lanterns[0]), false); g.step(); assert.equal(g.shades[0].state, 'drain');
  const safe = new Game({ scenario: { ...quiet, lanterns: [{ id: 'L1', lit: true, fuel: 30 }] } }); assert.equal(safe.isSafe(safe.lanterns[0]), true);
  const e = new Game({ scenario: { ...quiet, player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 29 }], shades: [{ pos: [0, .8, 0] }] } });
  e.step(input({ interact: true })); assert.equal(e.player.flames, 3); assert.ok(e.shades[0].safeTicks > 0);
  for (let i = 0; i < 29; i++) e.step(); assert.ok(Math.hypot(e.shades[0].pos[0], e.shades[0].pos[2]) >= 6 - 1e-8);
});
test('dawn applies last-tick extinguish/refuel and no_flames priority, exact bonus', () => {
  const lamps = [1, 2, 3].map(i => ({ id: `L${i}`, lit: true, fuel: 10 }));
  const g = new Game({ scenario: { ...quiet, time_left_s: 1 / 60, lanterns: lamps } }); g.step(); assert.equal(g.state, 'won'); assert.equal(g.score, 3 * (50 + 9) + 150);
  const out = new Game({ scenario: { ...quiet, time_left_s: 1 / 60, lanterns: [...lamps.slice(0, 2), { id: 'L3', lit: true, fuel: 1 / 60 }] } }); out.step(); assert.equal(out.state, 'lost');
  const dead = new Game({ scenario: { ...quiet, time_left_s: 1 / 60, lanterns: lamps, player: { flames: 0 } } }); dead.step(); assert.equal(dead.events.at(-1).data.reason, 'no_flames');
});
