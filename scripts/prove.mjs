import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PHASE } from '../src/core/tuning.mjs';
const phase = process.argv[2] ?? `phase-${PHASE}`;
if (!/^phase-[1-4]$/.test(phase)) throw new Error('Invalid phase');
const folder = `docs/proof/${phase}`; mkdirSync(folder, { recursive: true });
const allLit = Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: true }));
const cases = {
  victory: { scenario: { random_motes: false, random_shades: false, player: { carried: 10 }, lanterns: [...allLit.slice(0, 4), { id: 'L5', pos: [0, 0, 0] }], ...(PHASE >= 3 ? { time_left_s: 1 / 60 } : {}) }, frames: [{ tick: 0, interact: true }], ticks: 10 },
  defeat: { scenario: { random_motes: false, random_shades: false, player: { flames: 1 }, shades: [{ pos: [0, .8, 0] }] }, frames: [], ticks: 10 },
  movement: { scenario: { random_motes: false, random_shades: false }, frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }], ticks: 60 }
};
const results = [];
if (PHASE >= 2) Object.assign(cases, {
  dash: { scenario: { random_motes: false, random_shades: false }, frames: [{ tick: 0, dash: true }], ticks: 12 },
  pause: { scenario: { random_motes: false, random_shades: false }, frames: [{ tick: 0, pause: true }, { tick: 1, pause: false }, { tick: 20, pause: true }], ticks: 21 },
  charm: { night: 2, scenario: { random_motes: false, random_shades: false, player: { pos: [35, 0, 0] } }, frames: [], ticks: 1 },
  drifter: { night: 2, scenario: { random_motes: false, random_shades: false, player: { carried: 9 }, drifters: [{ id: 'D1', pos: [0, .8, 0] }] }, frames: [{ tick: 1, pulse: true }], ticks: 3 },
  pad: { night: 2, scenario: { random_motes: false, random_shades: false, player: { pos: [20, 0, 18] } }, frames: [], ticks: 90 },
  fall: { scenario: { random_motes: false, random_shades: false, player: { pos: [45, -11, 0], carried: 8 } }, frames: [], ticks: 61 },
  wind: { night: 3, scenario: { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [34, 0, 0] } }, frames: [], ticks: 2100, every: 60 }
});
if (PHASE >= 3) Object.assign(cases, {
  fuel_out: { scenario: { random_motes: false, random_shades: false, lanterns: [{ id: 'L1', lit: true, fuel: 1 }] }, frames: [], ticks: 60 },
  refuel: { scenario: { random_motes: false, random_shades: false, player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 85 }] }, frames: [{ tick: 0, interact: true }], ticks: 1 },
  relight: { scenario: { random_motes: false, random_shades: false, player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], ever_lit: true }] }, frames: [{ tick: 0, interact: true }], ticks: 1 },
  drain: { scenario: { random_motes: false, random_shades: false, player: { pos: [-20, 0, 0] }, lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 29 }], shades: [{ id: 'S1', pos: [20, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }, frames: [], ticks: 60 }
});
for (const [name, c] of Object.entries(cases)) {
  const scenario = `${folder}/${name}.scenario.json`, inputs = `${folder}/${name}.inputs.json`, out = `${folder}/${name}.jsonl`;
  writeFileSync(scenario, JSON.stringify(c.scenario, null, 2)); writeFileSync(inputs, JSON.stringify({ frames: c.frames }, null, 2));
  const args = ['scripts/headless.mjs', '--seed', '42', '--night', String(c.night ?? 1), '--ticks', String(c.ticks), '--scenario', scenario, '--inputs', inputs, '--out', out, '--snapshot-every', String(c.every ?? 1)];
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' }); if (run.status !== 0) throw new Error(run.stderr);
  const first = readFileSync(out, 'utf8'); const repeat = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (repeat.status !== 0 || readFileSync(out, 'utf8') !== first) throw new Error('Nondeterministic output');
  const end = JSON.parse(first.trim().split('\n').at(-1));
  if (name === 'victory' && end.state !== 'won' || name === 'defeat' && end.state !== 'lost') throw new Error(`Unexpected ${name} outcome`);
  results.push({ name, command: `node ${args.join(' ')}`, deterministic: true, end });
}
writeFileSync(`${folder}/scenarios.json`, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
process.stdout.write(`Saved ${results.length} reproducible scenarios to ${folder}\n`);
