import './style.css';
import { Game, defaultInput } from './core/game.mjs';
import { xzDistance } from './core/math.mjs';
import { WorldView } from './view/scene.mjs';

const $ = id => document.getElementById(id);
let game = new Game({ seed: 42 }), view, mode = 'menu', accumulator = 0, last = performance.now(), seconds = 0, captionUntil = 0;
const keys = new Set(), pressed = new Set(); let dragging = false;
try { view = new WorldView($('world')); view.load(game); }
catch (e) { $('boot-error').hidden = false; $('boot-error').textContent = `Không mở được đồ họa 3D. Hãy bật WebGL 2 trong trình duyệt.\n${e.message}`; throw e; }
function screen(html, centered = false) { $('screen').hidden = false; $('screen').className = `screen${centered ? ' center' : ''}`; $('screen').innerHTML = html; $('hud').hidden = true; }
function menu() {
  mode = 'menu'; keys.clear();
  screen(`<section class="menu-copy"><div class="brand-mark">◈</div><div class="eyebrow">MỘT HÀNH TRÌNH GIỮ ÁNH SÁNG</div><h1>Đảo<br><em>Đèn Lồng</em></h1><div class="rule"></div><p>Đêm xuống trên biển mây.<br>Gom những đốm sáng nhỏ, thắp lại đèn lồng<br>và dẫn bình minh về với đảo.</p><div class="button-row"><button class="primary" id="begin">Bắt đầu hành trình &nbsp; →</button></div><div class="controls"><kbd>W A S D</kbd> Di chuyển &nbsp; <kbd>Space</kbd> Nhảy<br><kbd>E</kbd> Nạp ánh sáng &nbsp; <kbd>Q</kbd> Tỏa sáng<br>Giữ chuột phải và kéo để xoay camera.</div></section><div class="menu-footer"><span>NGUYỄN VĂN ĐĂNG · 2A202603371 · L3A</span><span>ĐÊM 01 — ĐẢO BẾN</span></div>`);
  $('begin').onclick = intro;
}
function intro() {
  mode = 'intro'; screen(`<section class="panel"><div class="gold">ĐÊM 01</div><h2>Đảo Bến</h2><p>“Mây à, mỗi đốm sáng đều có đường về.<br>Hãy gom đom đóm, thắp cả năm ngọn đèn.<br>Và nhớ: bóng tối cũng biết sợ ánh sáng.”</p><div class="credit">— Ông Đăng, người giữ đèn</div><div class="button-row"><button class="primary" id="play">Mang ánh sáng về đảo →</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('play').onclick = start; $('back').onclick = menu;
}
function start() { game = new Game({ seed: 42 }); view.load(game); mode = 'playing'; $('screen').hidden = true; $('hud').hidden = false; keys.clear(); accumulator = 0; }
function pause() {
  if (mode !== 'playing') return; mode = 'paused'; keys.clear();
  screen(`<section class="panel"><div class="gold">ÁNH SÁNG VẪN Ở ĐÂY</div><h2>Một chút nghỉ chân</h2><div class="button-row"><button class="primary" id="resume">Tiếp tục</button><button class="secondary" id="retry">Chơi lại Đêm</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('resume').onclick = resume; $('retry').onclick = start; $('back').onclick = menu;
}
function resume() { mode = 'playing'; $('screen').hidden = true; $('hud').hidden = false; keys.clear(); }
function result() {
  mode = 'result'; keys.clear(); const won = game.state === 'won';
  screen(`<section class="panel"><div class="gold">${won ? 'ĐẢO ĐÃ SÁNG LẠI' : 'MỘT ĐÊM CHƯA TRỌN'}</div><h2>${won ? 'Ánh sáng trở về' : 'Đừng để tắt hy vọng'}</h2><p>${won ? 'Năm ngọn đèn đã sáng. Mây đã giữ được lời hẹn với bình minh.' : 'Nghỉ một chút rồi cùng Mây thử lại nhé.'}</p><div class="gold" style="font-size:42px">${game.score.toLocaleString('vi-VN')} điểm</div><div class="button-row"><button class="primary" id="retry">Chơi lại Đêm</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('retry').onclick = start; $('back').onclick = menu;
}
function updateHUD() {
  const p = game.player, sec = Math.ceil(game.timeLeft), lit = game.lanterns.filter(l => l.lit).length;
  $('health').textContent = `${'◆ '.repeat(p.flames)}${'◇ '.repeat(Math.max(0, 3 - p.flames))}`;
  $('timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; $('timer').classList.toggle('danger', sec <= 30);
  $('lamps').textContent = `ĐÈN LỒNG ${lit} / ${game.lanterns.length}`; $('score').innerHTML = `${game.score} <small>ĐIỂM</small>`;
  $('carry-label').textContent = `ĐOM ĐÓM · ${p.carried} / ${game.capacity}`;
  $('carry-slots').innerHTML = Array.from({ length: game.capacity }, (_, i) => `<i class="${i < p.carried ? 'filled' : ''}"></i>`).join('');
  $('pulse-cd').textContent = p.pulseCd ? `${(p.pulseCd / 60).toFixed(1)}s` : '3 đom đóm';
  const nearby = game.lanterns.filter(l => !l.lit && xzDistance(l.pos, p.pos) <= 2).sort((a, b) => xzDistance(a.pos, p.pos) - xzDistance(b.pos, p.pos))[0];
  $('interact-hint').hidden = !nearby; if (nearby) $('interact-hint').textContent = `E — Nạp ánh sáng (${nearby.deposited}/10)`;
  if (seconds > captionUntil) $('caption').textContent = '';
}
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'playing') pause(); else if (mode === 'paused') resume(); return; }
  keys.add(e.code); pressed.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); if (mode === 'playing') pause(); });
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('pointerdown', e => { if (e.button === 2) dragging = true; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', e => { if (dragging && mode === 'playing') view.yaw -= e.movementX * .004; });
function animate(now) {
  const dt = Math.min((now - last) / 1000, .1); last = now; seconds += dt;
  if (mode === 'playing') {
    accumulator += dt;
    while (accumulator >= 1 / 60 && mode === 'playing') {
      const held = code => keys.has(code) || pressed.has(code);
      const input = { ...defaultInput(), move: [(keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)], cam_yaw_deg: view.yaw * 180 / Math.PI, jump: held('Space'), interact: held('KeyE'), pulse: held('KeyQ') };
      const events = game.step(input);
      pressed.clear();
      for (const e of events) {
        if (e.name === 'pulse') view.pulse(game.player.pos);
        if (e.name === 'shade_spawned') { $('caption').textContent = '⚠ Bóng Mực xuất hiện trong sương!'; captionUntil = seconds + 3; }
      }
      accumulator -= 1 / 60; if (game.state !== 'playing') result();
    }
    updateHUD();
  }
  view.update(game, seconds, dt, { menu: mode === 'menu' || mode === 'intro' }); requestAnimationFrame(animate);
}
if (new URLSearchParams(location.search).has('qa')) Object.defineProperty(window, '__lab', { get: () => ({ mode, snapshot: game.snapshot() }) });
menu(); requestAnimationFrame(animate);
