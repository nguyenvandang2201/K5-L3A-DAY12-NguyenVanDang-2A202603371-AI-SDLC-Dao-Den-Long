import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { makeServer } from './run.mjs';
const ffmpegIndex = process.argv.indexOf('--ffmpeg');
const ffmpeg = ffmpegIndex >= 0 ? process.argv[ffmpegIndex + 1] : 'ffmpeg';
mkdirSync('docs/demo', { recursive: true }); mkdirSync('.local/video', { recursive: true });
const server = makeServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: false, channel: 'chromium', args: ['--window-size=1280,720'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: '.local/video', size: { width: 1280, height: 720 } } });
const page = await context.newPage(); page.setDefaultTimeout(20000); const errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = `http://127.0.0.1:${server.address().port}`;
const wait = ms => page.waitForTimeout(ms);
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const held = new Set();
async function release() { for (const key of held) await page.keyboard.up(key); held.clear(); }
async function walk(target, limit = 7000) {
  const began = Date.now();
  while (Date.now() - began < limit) {
    const data = await page.evaluate(() => window.__lab); if (data.mode !== 'playing') break;
    const p = data.snapshot.player.pos, dx = target[0] - p[0], dz = target[2] - p[2]; if (Math.hypot(dx, dz) < .6) break;
    const want = new Set(); if (Math.abs(dx) > .3) want.add(dx > 0 ? 'KeyD' : 'KeyA'); if (Math.abs(dz) > .3) want.add(dz > 0 ? 'KeyW' : 'KeyS');
    for (const key of held) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
    await wait(90);
  }
  await release();
}
let video;
try {
  await page.goto(`${base}/?qa=1`); await page.getByRole('button', { name: /Bắt đầu hành trình/ }).waitFor(); await wait(2500);
  await page.getByRole('button', { name: /Bắt đầu hành trình/ }).click(); await wait(2500);
  await page.getByRole('button', { name: /Mang ánh sáng/ }).click(); await wait(500);
  const began = Date.now();
  while (Date.now() - began < 38000) {
    const { mode, snapshot: s } = await page.evaluate(() => window.__lab); if (mode !== 'playing') break;
    if (s.player.carried >= 10) break;
    const target = [...s.motes].sort((a, b) => Math.hypot(a.pos[0] - s.player.pos[0], a.pos[2] - s.player.pos[2]) - Math.hypot(b.pos[0] - s.player.pos[0], b.pos[2] - s.player.pos[2]))[0]; if (!target) break;
    await walk(target.pos, 6500);
  }
  let state = await page.evaluate(() => window.__lab);
  if (state.mode === 'playing') {
    const s = state.snapshot, lamp = [...s.lanterns].sort((a, b) => Math.hypot(a.pos[0] - s.player.pos[0], a.pos[2] - s.player.pos[2]) - Math.hypot(b.pos[0] - s.player.pos[0], b.pos[2] - s.player.pos[2]))[0];
    await walk(lamp.pos, 8000); await page.keyboard.press('KeyE'); await wait(1500);
    await page.keyboard.press('Space'); await wait(300); await page.keyboard.press('ShiftLeft'); await wait(1000);
    await page.keyboard.press('KeyQ'); await wait(800); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click(); await page.getByLabel('Bảng màu dễ phân biệt').check(); await wait(1800);
    await page.getByRole('button', { name: 'Lưu và trở lại' }).click(); await page.getByRole('button', { name: 'Tiếp tục' }).click(); await wait(1000);
  }
  const tests = readFileSync('docs/proof/phase-4/tests.txt', 'utf8'), headless = readFileSync('docs/proof/phase-4/victory.jsonl', 'utf8').trim().split('\n').slice(-3).join('\n');
  const proof = (title, content, subtitle) => `<html lang="vi"><meta charset="UTF-8"><body style="margin:0;background:#0e1430;color:#f5f1e6;font:20px Segoe UI;padding:45px"><div style="color:#f2c14e;font-size:18px">ĐẢO ĐÈN LỒNG · NGUYỄN VĂN ĐĂNG · 2A202603371</div><h1 style="font-size:36px">${title}</h1><p style="color:#a8bdc8">${subtitle}</p><pre style="white-space:pre-wrap;word-break:break-word;background:#142539;padding:24px;border:1px solid #53716e;font:18px Consolas;line-height:1.6">${escape(content)}</pre></body></html>`;
  await page.goto('about:blank');
  await page.setContent(proof('Kiểm chứng bằng test chạy thật', tests.trim().split('\n').slice(-14).join('\n'), 'Trích nguyên văn docs/proof/phase-4/tests.txt · không chỉnh sửa kết quả.')); await wait(6500);
  await page.setContent(proof('Headless · bình minh theo scenario', headless, 'Scenario kiểm thử có thời gian ngắn và đèn dựng sẵn, không phải chiến thắng từ lượt chơi vừa quay.')); await wait(6500);
  await page.goto(`${base}/?bench=1&seed=42&duration=30&process_start=${Date.now()}`); await page.waitForFunction(() => window.__benchmark?.done, null, { timeout: 60000 });
  const demoBench = await page.evaluate(() => window.__benchmark.result); writeFileSync('docs/proof/phase-4/demo-bench.json', JSON.stringify(demoBench, null, 2));
  await page.goto('about:blank');
  await page.setContent(proof('Benchmark · 30 giây đo sau 3 giây khởi động', JSON.stringify(demoBench, null, 2), 'Cảnh chuẩn 200 Bóng Mực / 100 đom đóm / 3 đèn · có chi phí quay video.')); await wait(7000);
  await page.setContent(proof('Soak · 10 Đêm, một tiến trình', readFileSync('soak.json', 'utf8'), 'Bộ nhớ RSS thực đo; seed 7+i; xoay Đêm 1 → 2 → 3.')); await wait(6000);
  if (errors.length) throw new Error(errors.join('\n'));
  video = page.video(); await context.close();
  const source = await video.path(); renameSync(source, '.local/video/demo.webm');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
const encoded = spawnSync(ffmpeg, ['-y', '-i', '.local/video/demo.webm', '-t', '299', '-c:v', 'libx264', '-crf', '24', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'docs/demo/demo.mp4'], { encoding: 'utf8', timeout: 120000 });
if (encoded.status !== 0) throw new Error(encoded.error?.message ?? encoded.stderr);
const metadata = spawnSync(ffmpeg, ['-i', 'docs/demo/demo.mp4', '-f', 'null', '-'], { encoding: 'utf8', timeout: 60000 });
if (metadata.status !== 0) throw new Error('Video decode verification failed');
writeFileSync('docs/demo/encoding.txt', metadata.stderr);
process.stdout.write('Saved docs/demo/demo.mp4 (real browser recording)\n');
