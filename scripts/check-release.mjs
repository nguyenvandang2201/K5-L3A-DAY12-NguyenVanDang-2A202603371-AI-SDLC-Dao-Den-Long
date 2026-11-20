import { unzipSync } from 'fflate';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = resolve('.local', `release-check-${Date.now()}`); mkdirSync(root, { recursive: true });
const files = unzipSync(readFileSync('release/dao-den-long-v1.0.0-web.zip'));
for (const [name, bytes] of Object.entries(files)) {
  const target = resolve(root, name); if (!target.startsWith(root + sep)) throw new Error('Invalid archive path');
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes);
}
assert.equal(existsSync(resolve(root, 'node_modules')), false);
const portProbe = createServer(); await new Promise(r => portProbe.listen(0, '127.0.0.1', r)); const port = portProbe.address().port; await new Promise(r => portProbe.close(r));
const child = spawn(process.execPath, ['scripts/run.mjs', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = ''; child.stderr.on('data', b => { stderr += b; });
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Release server timeout')), 10000); child.stdout.on('data', () => { clearTimeout(timer); resolve(); }); child.on('error', e => { clearTimeout(timer); reject(e); }); child.on('exit', code => { if (code) { clearTimeout(timer); reject(new Error(stderr)); } }); });
  const base = `http://127.0.0.1:${port}`, response = await fetch(base); assert.equal(response.status, 200); const html = await response.text(); assert.ok(html.includes('Đảo Đèn Lồng'));
  for (const path of [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m => m[1])) assert.equal((await fetch(base + path)).status, 200);
  const e = { name: 'QA_Export', score: 100, nights_won: 1, achieved_at: '2026-11-21T01:00:00+07:00', seed: 42 };
  const saved = await fetch(`${base}/api/leaderboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) }); assert.equal(saved.status, 200);
  const exported = spawnSync(process.execPath, ['scripts/run.mjs', '--export-leaderboard', 'export.json'], { cwd: root }); assert.equal(exported.status, 0); assert.deepEqual(JSON.parse(readFileSync(resolve(root, 'export.json'))).entries, [e]);
  mkdirSync('docs/proof/phase-4', { recursive: true });
  writeFileSync('docs/proof/phase-4/release.json', JSON.stringify({ generated_at: new Date().toISOString(), archive: 'dao-den-long-v1.0.0-web.zip', files: Object.keys(files), node_modules_required: false, checks: ['extracted static server starts', 'index and JS/CSS assets served', 'leaderboard persists to disk', 'CLI export matches saved entry'], passed: true }, null, 2));
  process.stdout.write('Standalone ZIP PASS (no node_modules)\n');
} finally { child.kill(); }
