import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, defaultInput } from '../src/core/game.mjs';
import { terrainHeight, getMap } from '../src/core/maps.mjs';
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const input = x => ({ ...defaultInput(), ...x });
test('dash 12 ticks gives 2.8m and freezes altitude; cooldown start based', () => {
  const g = new Game({ scenario: { ...quiet, player: { pos: [0, 4, 0] } } });
  g.step(input({ dash: true })); for (let i = 1; i < 12; i++) g.step();
  assert.ok(Math.abs(g.player.pos[2] - 2.8) < 1e-8); assert.equal(g.player.pos[1], 4); assert.equal(g.player.dashCd, 79);
  const events = g.step(input({ dash: true })); assert.ok(!events.some(e => e.name === 'dash'));
});
test('pause advances only outer tick and holds timers/input', () => {
  const g = new Game({ scenario: { ...quiet, player: { pulse_cd_ticks: 90, charm_ticks: 50 } } });
  g.step(input({ pause: true })); for (let i = 0; i < 20; i++) g.step();
  assert.equal(g.state, 'paused'); assert.equal(g.tick, 21); assert.equal(g.simTick, 0); assert.equal(g.player.charm, 50);
  g.step(input({ pause: true })); assert.equal(g.state, 'playing'); assert.equal(g.simTick, 1); assert.equal(g.player.pulseCd, 89);
});
test('fall ignores invuln, drops all once, respawns exactly after60 ticks', () => {
  const g = new Game({ scenario: { ...quiet, player: { pos: [45, -11, 0], carried: 9, invuln_ticks: 900 } } });
  g.step(); assert.equal(g.player.flames, 2); assert.equal(g.player.carried, 0); assert.equal(g.player.respawn, 60);
  for (let i = 0; i < 59; i++) g.step(); assert.equal(g.player.respawn, 1); assert.equal(g.player.flames, 2);
  g.step(); assert.deepEqual(g.player.pos, [0, 0, 0]); assert.equal(g.player.invuln, 90);
});
test('bridge, ramps, tower barrier and standard map points', () => {
  const m2 = getMap(2), m3 = getMap(3); assert.equal(m2.lanterns.length, 6); assert.equal(m3.lanterns.length, 7);
  assert.equal(terrainHeight(m2, 35, 0), 0); assert.equal(terrainHeight(m2, 35, 2.1), -Infinity);
  assert.equal(terrainHeight(m3, 0, 7), 6); assert.equal(terrainHeight(m3, 0, 18), 3);
  assert.ok(Math.abs(terrainHeight(m3, 27 * Math.cos(Math.PI / 6), 13.5) - 1.5) < 1e-8);
  assert.equal(m3.motePoints.length, 30);
});
test('pad trajectory ignores movement until landing', () => {
  const g = new Game({ night: 2, scenario: { ...quiet, player: { pos: [20, 0, 18] } } });
  g.step(); assert.equal(g.player.launched, true); assert.equal(g.player.vel[1], 14);
  const launch = [...g.player.launchVel]; g.step(input({ move: [-1, -1] })); assert.equal(g.player.vel[0], launch[0]);
  for (let i = 0; i < 85; i++) g.step(); assert.equal(g.player.grounded, true); assert.ok(g.player.pos[0] > 42);
});
test('charm pickup accelerates run and makes repeated dash cooldown free', () => {
  const g = new Game({ night: 2, scenario: { ...quiet, player: { pos: [35, 0, 0] } } });
  g.step(); assert.equal(g.player.charm, 600); assert.equal(g.charms[0].available, false);
  const x = g.player.pos[0]; g.step(input({ move: [1, 0] })); assert.ok(Math.abs(g.player.pos[0] - x - .12) < 1e-8);
  g.step(input({ dash: true })); assert.equal(g.player.dashCd, 0);
});
test('drifter steals before shade hit and pulse returns stolen motes', () => {
  const g = new Game({ night: 2, scenario: { ...quiet, player: { carried: 9 }, drifters: [{ id: 'D1', pos: [0, .8, 0] }], shades: [{ pos: [0, .8, 0] }] } });
  const events = g.step(); assert.equal(events.find(e => e.name === 'drifter_steal').data.carried, 6);
  assert.equal(events.find(e => e.name === 'player_hit').data.dropped, 3); assert.equal(g.player.carried, 3);
  const e = g.step(input({ pulse: true })); assert.equal(e.find(e => e.name === 'drifter_drop').data.amount, 3); assert.equal(g.drifters[0].stolen, 0);
});
test('spawn exact schedule, never interacts on birth tick, pause does not spawn', () => {
  const g = new Game({ scenario: { random_motes: false } }); for (let i = 0; i < 299; i++) g.step(); assert.equal(g.shades.length, 0);
  g.step(); assert.equal(g.shades.length, 2); assert.deepEqual(g.events.filter(e => e.name === 'shade_spawned').map(e => e.data.id), ['S1', 'S2']);
});
test('night3 wind active exactly1800..2099 and off at2100', () => {
  const g = new Game({ night: 3, scenario: { ...quiet, wind_enabled: true, player: { pos: [34, 0, 0] } } });
  for (let i = 0; i < 1799; i++) g.step(); assert.equal(g.wind.active, false);
  g.step(); assert.equal(g.wind.active, true); for (let i = 0; i < 300; i++) g.step(); assert.equal(g.wind.active, false);
});
