import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const phase = process.argv[process.argv.indexOf('--phase') + 1] || 'working';
if (!/^(phase-[1-4]|working)$/.test(phase)) throw new Error('Use --phase phase-1..phase-4');
const folder = join('docs', 'proof', phase); mkdirSync(folder, { recursive: true });
const checks = [
  ['tests', ['--test', ...Array.from((await import('node:fs')).readdirSync('tests')).filter(f => f.endsWith('.test.mjs')).map(f => `tests/${f}`)]],
  ['build', ['node_modules/vite/bin/vite.js', 'build']]
];
const report = { generated_at: new Date().toISOString(), phase, node: process.version, platform: process.platform, checks: [] };
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120000 });
  writeFileSync(join(folder, `${name}.txt`), `$ node ${args.join(' ')}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  report.checks.push({ name, exit_code: result.status, error: result.error?.message ?? null });
  process.stdout.write(`${name}: ${result.status === 0 ? 'PASS' : 'FAIL'}\n`);
  if (result.status !== 0) { process.exitCode = 1; break; }
}
writeFileSync(join(folder, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
