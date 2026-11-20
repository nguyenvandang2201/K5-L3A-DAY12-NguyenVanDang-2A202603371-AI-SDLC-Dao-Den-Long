import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeServer } from './run.mjs';
const phase = process.argv[2] ?? 'working', dir = `docs/proof/${phase}`;
mkdirSync(dir, { recursive: true });
const server = makeServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(20000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/?qa=1`); await page.getByRole('button', { name: /Bắt đầu hành trình/ }).waitFor();
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
  const fps = await page.evaluate(() => new Promise(resolve => { const samples = []; let previous; function frame(t) { if (previous !== undefined) samples.push(t - previous); previous = t; if (samples.length === 120) resolve(1000 * samples.length / samples.reduce((a, b) => a + b, 0)); else requestAnimationFrame(frame); } requestAnimationFrame(frame); }));
  if (phase === 'phase-4') {
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cài đặt' }).click();
    await page.getByLabel('Bảng màu dễ phân biệt').check(); await page.getByLabel('Giảm chuyển động').check(); await page.getByLabel('Chữ lớn ×1.25').check();
    await page.getByRole('button', { name: /^Nhảy:/ }).click(); await page.keyboard.press('KeyW');
    await page.getByText('⚠ Phím này đang được dùng. Hãy chọn phím khác.').waitFor(); await page.keyboard.press('KeyJ');
    await page.getByRole('button', { name: 'Nhảy: J', exact: true }).waitFor();
    await page.screenshot({ path: `${dir}/accessibility.png`, fullPage: true });
    await page.getByRole('button', { name: 'Lưu và trở lại' }).click(); await page.getByRole('button', { name: 'Tiếp tục' }).click();
    const bindings = await page.evaluate(() => JSON.parse(localStorage.getItem('dao-den-long.settings')).bindings); assert.equal(bindings.jump, 'KeyJ');
    for (const night of [2, 3]) {
      await page.evaluate(night => window.__lab.restart({ night, yaw: night === 3 ? -2.1 : Math.PI / 2, scenario: { random_shades: false, random_drifters: false, player: { pos: night === 3 ? [18, 3, 10] : [30, 0, 0] } } }), night);
      await page.waitForFunction(n => window.__lab.snapshot.night === n && window.__lab.snapshot.tick > 3, night);
      await page.screenshot({ path: `${dir}/night-${night}.png` });
    }
    await page.evaluate(() => window.__lab.restart({ night: 1, scenario: { time_left_s: 1 / 60, random_shades: false } }));
    await page.getByLabel('Tên người giữ đèn (3–12 ký tự A–Z, 0–9, _)').fill('QA_Dang');
    await page.getByRole('button', { name: 'Lưu điểm hành trình' }).click(); await page.getByText('Đã lưu điểm hành trình.').waitFor();
    await page.getByRole('button', { name: 'Về menu', exact: true }).click(); await page.getByRole('button', { name: 'Bảng xếp hạng', exact: true }).click(); await page.getByRole('cell', { name: 'QA_Dang' }).first().waitFor();
    await page.screenshot({ path: `${dir}/leaderboard.png` });
    await page.reload(); await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); assert.equal(await page.getByLabel('Chữ lớn ×1.25').isChecked(), true);
    await page.getByRole('button', { name: 'Khôi phục mặc định' }).click(); await page.getByRole('button', { name: 'Nhảy: Space' }).waitFor();
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${dir}/browser.json`, JSON.stringify({ generated_at: new Date().toISOString(), viewport: [1280, 720], normal_play_avg_fps_120_frames: fps, renderer: 'Chromium / automatic GPU selection', checks: ['menu', 'intro', 'movement', 'jump', 'pause/resume', ...(phase === 'phase-4' ? ['remap/conflict/reset', 'saved accessibility settings after reload', 'maps2/3 screenshots (explicit QA scenarios)', 'loss → save name → persistent leaderboard'] : []), 'no uncaught errors'], errors }, null, 2));
  process.stdout.write('Browser smoke PASS\n');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
