import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const phase = process.argv[2] ?? 'working', dir = `docs/proof/${phase}`;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(20000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5173/?qa=1'); await page.getByRole('button', { name: /Bắt đầu hành trình/ }).waitFor();
  await page.screenshot({ path: `${dir}/menu.png` });
  await page.getByRole('button', { name: /Bắt đầu hành trình/ }).click();
  await page.getByRole('button', { name: /Mang ánh sáng/ }).click();
  await page.waitForFunction(() => window.__lab?.mode === 'playing' && window.__lab.snapshot.tick > 5);
  const before = await page.evaluate(() => window.__lab.snapshot.player.pos);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(z => window.__lab.snapshot.player.pos[2] > z + 1, before[2]);
  await page.keyboard.up('KeyW'); await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__lab.snapshot.player.pos[1] > .2);
  await page.screenshot({ path: `${dir}/gameplay.png` });
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Tiếp tục' }).waitFor();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  assert.deepEqual(errors, []);
  writeFileSync(`${dir}/browser.json`, JSON.stringify({ generated_at: new Date().toISOString(), viewport: [1280, 720], renderer: 'Chromium / SwiftShader (software)', checks: ['menu', 'intro', 'movement', 'jump', 'pause/resume', 'no uncaught errors'], errors }, null, 2));
  process.stdout.write('Browser smoke PASS\n');
} finally { await browser.close(); }
