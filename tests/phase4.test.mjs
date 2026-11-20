import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { rankEntries, validEntry } from '../src/core/leaderboard.mjs';
import { summarizeFrames, benchmarkScene } from '../src/view/benchmark.mjs';
import { Game, defaultInput } from '../src/core/game.mjs';
import { tuning } from '../src/core/tuning.mjs';
import { contract } from '../scripts/contract.mjs';
import { makeServer } from '../scripts/run.mjs';

const entry = (name, score, date = '2026-11-21T12:00:00+07:00') => ({ name, score, nights_won: 1, achieved_at: date, seed: 42 });
test('leaderboard validates names, preserves fields, top10 score/time order', () => {
  assert.equal(validEntry(entry('NguyenDang', 12)), true); assert.equal(validEntry(entry('<script>', 12)), false); assert.equal(validEntry(entry('ab', 12)), false);
  assert.equal(validEntry(entry('Dang', 12, '2026-11-21T12:00:00')), false);
  const ranked = rankEntries([entry('Later', 100, '2026-11-21T12:00:01+07:00'), entry('Earlier', 100), ...Array.from({ length: 12 }, (_, i) => entry(`User_${i}`, i))]);
  assert.equal(ranked.length, 10); assert.equal(ranked[0].name, 'Earlier'); assert.equal(ranked[1].name, 'Later');
});
test('benchmark frame statistics use worst1percent and nearest-rank95', () => {
  const samples = [...Array(99).fill(10), 100]; const s = summarizeFrames(samples);
  assert.equal(s.frames, 100); assert.equal(s.avg_fps, 100000 / 1090); assert.equal(s.p1_low_fps, 10); assert.equal(s.frame_ms_p95, 10);
  assert.throws(() => summarizeFrames([]));
});
test('benchmark fixed scene remains200shades/100motes/3lit100 without gameplay side effects', () => {
  const g = benchmarkScene(42); for (let t = 0; t < 120; t++) { g.simTick++; g.updateSafety(); g.moveShades(); }
  assert.equal(g.shades.length, 200); assert.equal(g.motes.length, 100); assert.equal(g.player.flames, 3); assert.equal(g.player.carried, 0);
  assert.equal(g.lanterns.filter(l => l.lit && l.fuel === 100).length, 3); assert.ok(g.shades.every(s => s.state === 'wander'));
});
test('contract file exactly matches runtime tuning', () => {
  const file = JSON.parse(readFileSync('game.contract.json', 'utf8')); assert.deepEqual(file, contract); assert.deepEqual(file.tuning, tuning);
});
test('headless full final night meets30second budget without GPU', () => {
  const start = performance.now(), g = new Game({ night: 3, scenario: { player: { pos: [34, 0, 0], invuln_ticks: 30000 }, random_drifters: false, wind_enabled: false } });
  for (let i = 0; i < 21600 && g.state === 'playing'; i++) g.step(defaultInput());
  assert.equal(g.simTick, 18000); assert.equal(g.state, 'lost'); assert.ok(performance.now() - start < 30000);
});
test('soak CLI runs10 worlds in one process and writes genuine RSS/results', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-soak-'));
  try {
    const out = join(dir, 'soak.json'), r = spawnSync(process.execPath, ['--expose-gc', 'scripts/soak.mjs', '--seed', '7', '--nights', '10', '--out', out], { timeout: 30000 });
    assert.equal(r.status, 0); const report = JSON.parse(readFileSync(out)); assert.equal(report.crashes, 0); assert.equal(report.results.length, 10); assert.ok(report.mem_start_mb > 0); assert.ok(report.duration_s > 0);
  } finally { rmSync(dir, { recursive: true }); }
});
test('server rejects cross-origin leaderboard writes and serves production index', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'lantern-static-')); writeFileSync(join(folder, 'index.html'), '<title>Đảo Đèn Lồng</title>');
  const server = makeServer(folder); await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const index = await fetch(base); assert.equal(index.status, 200); assert.ok((await index.text()).includes('Đảo Đèn Lồng'));
    const r = await fetch(`${base}/api/leaderboard`, { method: 'POST', headers: { Origin: 'http://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify(entry('Dang', 1)) }); assert.equal(r.status, 403);
    const invalid = await fetch(`${base}/api/leaderboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(invalid.status, 400);
  } finally { await new Promise(r => server.close(r)); rmSync(folder, { recursive: true }); }
});
test('recoil moves full2m over60ticks; pulse pushes4m over15 and stuns120ticks', () => {
  const quiet = { random_motes: false, random_shades: false };
  const g = new Game({ scenario: { ...quiet, shades: [{ pos: [0, .8, 0] }] } }); g.step();
  const x = g.shades[0].pos[0]; for (let i = 0; i < 60; i++) g.step(); assert.ok(Math.abs(g.shades[0].pos[0] - x - 2) < 1e-8);
  const p = new Game({ scenario: { ...quiet, player: { carried: 3 }, shades: [{ pos: [1, .8, 0] }] } });
  p.step({ ...defaultInput(), pulse: true }); for (let i = 1; i < 15; i++) p.step(); assert.ok(Math.abs(p.shades[0].pos[0] - 5) < 1e-8);
  for (let i = 15; i < 120; i++) p.step(); assert.equal(p.shades[0].state, 'stunned'); p.step(); assert.notEqual(p.shades[0].state, 'stunned');
});
test('drifter pulse drops at its location, not the player-hit ring', () => {
  const g = new Game({ night: 2, scenario: { random_motes: false, random_shades: false, player: { carried: 3 }, drifters: [{ id: 'D1', pos: [3, .8, 0], state: 'flee', stolen: 3 }] } });
  g.step({ ...defaultInput(), pulse: true }); assert.equal(g.motes.length, 3); assert.ok(g.motes.every(m => m.pos[0] === 3 && m.pos[2] === 0 && m.ttl === 480));
});
test('scenario shade centerY0 still chases, arbitrary drifter ids stay finite', () => {
  const g = new Game({ night: 2, scenario: { random_motes: false, random_shades: false, shades: [{ id: 'Shade_A', pos: [10, 0, 0] }], drifters: [{ id: 'Custom', pos: [15, 0, 0] }] } });
  g.step(); assert.ok(Math.abs(g.shades[0].pos[0] - (10 - 4 / 60)) < 1e-8); assert.equal(g.shades[0].pos[1], 0);
  assert.ok(g.drifters[0].pos.every(Number.isFinite));
});
