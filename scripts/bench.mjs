import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { makeServer } from './run.mjs';
import { parseArgs, intOption } from './headless.mjs';
const started = Date.now() - process.uptime() * 1000; let browser, server;
try {
  const o = parseArgs(process.argv.slice(2), ['seed', 'duration', 'out', 'headless', 'software']);
  const seed = intOption(o.seed, 'seed', 42, -Number.MAX_SAFE_INTEGER), duration = Number(o.duration ?? 30);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600 || !o.out) throw new Error('Use --duration positive_seconds --out bench.json');
  server = makeServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ headless: o.headless === 'true', channel: 'chromium', args: ['--window-size=1280,720', '--enable-webgl', ...(o.software === 'true' ? ['--use-angle=swiftshader', '--ignore-gpu-blocklist'] : [])] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => process.stderr.write(`${e.message}\n`));
  await page.goto(`http://127.0.0.1:${server.address().port}/?bench=1&seed=${seed}&duration=${duration}&process_start=${started}`);
  await page.waitForFunction(() => window.__benchmark?.done, null, { timeout: (duration + 40) * 1000 });
  const { result, scene } = await page.evaluate(() => window.__benchmark);
  if (scene.shades !== 200 || scene.motes !== 100 || scene.lit !== 3) throw new Error('Benchmark scene mismatch');
  result.os = `${os.platform()} ${os.release()} ${os.arch()}`;
  writeFileSync(o.out, JSON.stringify(result, null, 2) + '\n');
  await page.screenshot({ path: o.out.replace(/\.json$/, '') + '.png' });
  writeFileSync(o.out.replace(/\.json$/, '') + '.environment.json', JSON.stringify({ cpu: os.cpus()[0]?.model, ram_gb: os.totalmem() / 1073741824, node: process.version, seed, warmup_s: 3, duration_s: duration, viewport: [1280, 720], software_requested: o.software === 'true', headless: o.headless === 'true', scene, thresholds: { avg_fps: result.avg_fps >= 60, p1_low_fps: result.p1_low_fps >= 30, load_ms: result.load_ms <= 10000 } }, null, 2));
  process.stdout.write(JSON.stringify(result) + '\n');
} catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = 1; }
finally { await browser?.close(); server?.close(); }
