import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Game, defaultInput } from '../src/core/game.mjs';
import { validateInputs, validateScenario, FormatError } from '../src/core/validation.mjs';
const quiet = { random_motes: false, random_shades: false };
const input = changes => ({ ...defaultInput(), ...changes });

test('one second motion, yaw rotation, normalized diagonal and tick zero', () => {
  for (const [move, yaw, expected] of [[[0, 1], 0, [0, 0, 6]], [[0, 1], 90, [6, 0, 0]], [[1, 1], 0, [Math.sqrt(18), 0, Math.sqrt(18)]]]) {
    const g = new Game({ scenario: quiet }); assert.equal(g.snapshot().tick, 0);
    for (let i = 0; i < 60; i++) g.step(input({ move, cam_yaw_deg: yaw }));
    g.player.pos.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-8)); assert.equal(g.timeLeft, 239); // Ticket-03: shorter night.
  }
});
test('pickup inclusive boundary and capacity', () => {
  const g = new Game({ scenario: { ...quiet, player: { carried: 9 }, motes: [[1, 0, 0], [0, 0, 0]] } });
  const events = g.step(); assert.equal(g.player.carried, 10); assert.equal(g.motes.length, 1);
  assert.equal(events.filter(e => e.name === 'mote_picked').length, 1);
});
test('deposit is edge triggered, remembers progress, nearest ties use id', () => {
  const g = new Game({ scenario: { ...quiet, player: { carried: 4 }, lanterns: [{ id: 'L2', pos: [0, 0, 1] }, { id: 'L1', pos: [0, 0, -1] }] } });
  g.step(input({ interact: true })); assert.equal(g.lanterns[0].deposited, 4); assert.equal(g.score, 20); // Ticket-03: +5 per deposited mote.
  g.player.carried = 6; g.step(input({ interact: true })); assert.equal(g.lanterns[0].deposited, 4);
  g.step(); g.step(input({ interact: true })); assert.equal(g.lanterns[0].lit, true); assert.equal(g.score, 150);
});
test('pulse locks targets by 3D distance, costs once and prevents hit', () => {
  const g = new Game({ scenario: { ...quiet, player: { carried: 3 }, shades: [{ id: 'S1', pos: [1, 0.8, 0] }, { id: 'S2', pos: [0, 7, 0] }] } });
  const e = g.step(input({ pulse: true })); assert.equal(g.player.flames, 3); assert.equal(g.player.carried, 0);
  assert.deepEqual(e.find(e => e.name === 'pulse').data.stunned_ids, ['S1']); assert.equal(g.shades[0].state, 'stunned');
});
test('shade hit only once per tick, drops half and grants invulnerability', () => {
  const g = new Game({ scenario: { ...quiet, player: { carried: 7 }, shades: [{ pos: [0, 0.8, 0] }, { pos: [0, 0.8, 0] }] } });
  g.step(); assert.equal(g.player.flames, 2); assert.equal(g.player.carried, 4); assert.equal(g.motes.length, 3);
  for (let i = 0; i < 10; i++) g.step(); assert.equal(g.player.flames, 2);
});
test('scenario never scores, all-lit waits for dawn; no flames has higher priority (Ticket-03)', () => {
  const lanterns = Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: true }));
  const g = new Game({ scenario: { ...quiet, lanterns } }); assert.equal(g.score, 0); assert.equal(g.events.length, 0);
  g.step(); assert.equal(g.state, 'playing'); assert.equal(g.score, 0);
  const dawn = new Game({ scenario: { ...quiet, lanterns, time_left_s: 1 / 60 } }); dawn.step();
  assert.equal(dawn.state, 'won'); assert.equal(dawn.events.at(-1).data.reason, 'dawn_survived');
  const dead = new Game({ scenario: { ...quiet, lanterns, player: { flames: 0 } } }); dead.step(); assert.equal(dead.state, 'lost');
});
test('invalid frames/scenario rejected, including duplicate implicit ids', () => {
  for (const f of [{ frames: [{ tick: 2 }, { tick: 2 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, pulse: 1 }] }]) assert.throws(() => validateInputs(f), FormatError);
  assert.throws(() => validateScenario({ lanterns: [{ id: 'L6' }] }), FormatError);
  assert.throws(() => validateScenario({ shades: [{ id: 'S2', pos: [0, 0, 0] }, { pos: [0, 0, 0] }] }), FormatError);
});
test('CLI is byte deterministic, emits final end and invalid JSON exits 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-test-'));
  try {
    const out = join(dir, 'out.jsonl'), frames = join(dir, 'inputs.json');
    writeFileSync(frames, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 2, move: [0, 0] }] }));
    const args = ['scripts/headless.mjs', '--seed', '42', '--ticks', '600', '--inputs', frames, '--out', out];
    assert.equal(spawnSync(process.execPath, args).status, 0); const a = readFileSync(out, 'utf8');
    assert.equal(spawnSync(process.execPath, args).status, 0); assert.equal(readFileSync(out, 'utf8'), a);
    const rows = a.trim().split('\n').map(JSON.parse); assert.equal(rows[0].tick, 0); assert.equal(rows.at(-1).type, 'end');
    writeFileSync(frames, '{bad'); assert.equal(spawnSync(process.execPath, args).status, 2);
  } finally { rmSync(dir, { recursive: true }); }
});
