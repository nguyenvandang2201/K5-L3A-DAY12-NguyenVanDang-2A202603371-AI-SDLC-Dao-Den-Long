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
for (const [name, c] of Object.entries(cases)) {
  const scenario = `${folder}/${name}.scenario.json`, inputs = `${folder}/${name}.inputs.json`, out = `${folder}/${name}.jsonl`;
  writeFileSync(scenario, JSON.stringify(c.scenario, null, 2)); writeFileSync(inputs, JSON.stringify({ frames: c.frames }, null, 2));
  const args = ['scripts/headless.mjs', '--seed', '42', '--night', '1', '--ticks', String(c.ticks), '--scenario', scenario, '--inputs', inputs, '--out', out, '--snapshot-every', '1'];
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' }); if (run.status !== 0) throw new Error(run.stderr);
  const first = readFileSync(out, 'utf8'); const repeat = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (repeat.status !== 0 || readFileSync(out, 'utf8') !== first) throw new Error('Nondeterministic output');
  const end = JSON.parse(first.trim().split('\n').at(-1));
  if (name === 'victory' && end.state !== 'won' || name === 'defeat' && end.state !== 'lost') throw new Error(`Unexpected ${name} outcome`);
  results.push({ name, command: `node ${args.join(' ')}`, deterministic: true, end });
}
writeFileSync(`${folder}/scenarios.json`, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
process.stdout.write(`Saved ${results.length} reproducible scenarios to ${folder}\n`);
