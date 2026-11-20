import './style.css';
import { Game, defaultInput } from './core/game.mjs';
import { xzDistance } from './core/math.mjs';
import { WorldView } from './view/scene.mjs';
import { GameAudio } from './view/audio.mjs';
import { loadSettings, saveSettings } from './view/settings.mjs';

const $ = id => document.getElementById(id);
let game = new Game({ seed: 42 }), view, mode = 'menu', accumulator = 0, last = performance.now(), seconds = 0, captionUntil = 0;
let currentNight = 1, totalScore = 0, nightsWon = 0, lastCountdown = -1, lastWind = false;
const settings = loadSettings(), audio = new GameAudio(); audio.volume = settings.volume;
const keys = new Set(), pressed = new Set(); let dragging = false;
try { view = new WorldView($('world')); view.load(game); }
catch (e) { $('boot-error').hidden = false; $('boot-error').textContent = `Không mở được đồ họa 3D. Hãy bật WebGL 2 trong trình duyệt.\n${e.message}`; throw e; }
function screen(html, centered = false) { $('screen').hidden = false; $('screen').className = `screen${centered ? ' center' : ''}`; $('screen').innerHTML = html; $('hud').hidden = true; }
function menu() {
  mode = 'menu'; keys.clear();
  screen(`<section class="menu-copy"><div class="brand-mark">◈</div><div class="eyebrow">MỘT HÀNH TRÌNH GIỮ ÁNH SÁNG</div><h1>Đảo<br><em>Đèn Lồng</em></h1><div class="rule"></div><p>Đêm xuống trên biển mây.<br>Gom những đốm sáng nhỏ, thắp lại đèn lồng<br>và dẫn bình minh về với đảo.</p><div class="button-row"><button class="primary" id="begin">Bắt đầu hành trình &nbsp; →</button></div><div class="controls"><kbd>W A S D</kbd> Di chuyển &nbsp; <kbd>Space</kbd> Nhảy<br><kbd>E</kbd> Nạp ánh sáng &nbsp; <kbd>Q</kbd> Tỏa sáng<br>Giữ chuột phải và kéo để xoay camera.</div></section><div class="menu-footer"><span>NGUYỄN VĂN ĐĂNG · 2A202603371 · L3A</span><span>ĐÊM 01 — ĐẢO BẾN</span></div>`);
  $('begin').onclick = () => { currentNight = 1; totalScore = 0; nightsWon = 0; audio.unlock(); intro(); };
  const button = document.createElement('button'); button.className = 'secondary'; button.textContent = 'Cài đặt'; button.onclick = () => showSettings(menu); document.querySelector('.button-row').append(button);
}
function intro() {
  const names = ['Đảo Bến', 'Đảo Cau', 'Đảo Chuông'];
  const words = ['Gom đom đóm, thắp cả năm ngọn đèn. Bóng tối cũng biết sợ ánh sáng.', 'Hai bờ đảo nối bằng chiếc cầu tre. Hãy tin những bục nhảy, nhưng cẩn thận Gió Lạc.', 'Qua những tầng mây, chuông sẽ gọi bình minh. Đi theo dốc và nhớ nhìn hướng gió.'];
  mode = 'intro'; screen(`<section class="panel"><div class="gold">ĐÊM 0${currentNight}</div><h2>${names[currentNight - 1]}</h2><p>“Mây à, mỗi đốm sáng đều có đường về.<br>${words[currentNight - 1]}”</p><div class="credit">— Ông Đăng, người giữ đèn</div><div class="button-row"><button class="primary" id="play">Mang ánh sáng về đảo →</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('play').onclick = start; $('back').onclick = menu;
}
function start() { game = new Game({ seed: 42, night: currentNight }); view.load(game); view.yaw = 0; mode = 'playing'; $('screen').hidden = true; $('hud').hidden = false; keys.clear(); pressed.clear(); accumulator = 0; lastCountdown = -1; audio.unlock(); }
function pause() {
  if (mode !== 'playing') return; if (game.state !== 'paused') game.step({ ...defaultInput(), pause: true }); mode = 'paused'; keys.clear(); pressed.clear();
  screen(`<section class="panel"><div class="gold">ÁNH SÁNG VẪN Ở ĐÂY</div><h2>Một chút nghỉ chân</h2><div class="button-row"><button class="primary" id="resume">Tiếp tục</button><button class="secondary" id="retry">Chơi lại Đêm</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('resume').onclick = resume; $('retry').onclick = start; $('back').onclick = menu;
  const button = document.createElement('button'); button.className = 'secondary'; button.textContent = 'Cài đặt'; button.onclick = () => showSettings(() => { mode = 'playing'; pausePanel(); }); document.querySelector('.button-row').append(button);
}
function pausePanel() { mode = 'playing'; pause(); }
function resume() { game.step(defaultInput()); game.step({ ...defaultInput(), pause: true }); game.previous = defaultInput(); mode = 'playing'; $('screen').hidden = true; $('hud').hidden = false; keys.clear(); pressed.clear(); }
function result() {
  mode = 'result'; keys.clear(); const won = game.state === 'won';
  if (won) { totalScore += game.score; nightsWon++; } audio.event(won ? 'won' : 'lost');
  screen(`<section class="panel"><div class="gold">${won ? 'ĐẢO ĐÃ SÁNG LẠI' : 'MỘT ĐÊM CHƯA TRỌN'}</div><h2>${won ? 'Ánh sáng trở về' : 'Đừng để tắt hy vọng'}</h2><p>${won ? 'Năm ngọn đèn đã sáng. Mây đã giữ được lời hẹn với bình minh.' : 'Nghỉ một chút rồi cùng Mây thử lại nhé.'}</p><div class="gold" style="font-size:42px">${game.score.toLocaleString('vi-VN')} điểm</div><div class="button-row"><button class="primary" id="retry">Chơi lại Đêm</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('retry').onclick = start; $('back').onclick = menu;
  if (won && currentNight < 3) { $('retry').textContent = 'Đêm kế tiếp →'; $('retry').onclick = () => { currentNight++; intro(); }; }
  if (won && currentNight === 3) { document.querySelector('.panel h2').textContent = 'Bình Minh'; document.querySelector('.panel p').textContent = `Ba hòn đảo đã sáng. Tổng điểm hành trình: ${totalScore}.`; $('retry').textContent = 'Hành trình mới'; $('retry').onclick = () => { currentNight = 1; totalScore = 0; nightsWon = 0; intro(); }; }
}
function updateHUD() {
  const p = game.player, sec = Math.ceil(game.timeLeft), lit = game.lanterns.filter(l => l.lit).length;
  $('health').textContent = `${'◆ '.repeat(p.flames)}${'◇ '.repeat(Math.max(0, 3 - p.flames))}`;
  $('timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; $('timer').classList.toggle('danger', sec <= 30);
  $('lamps').textContent = `ĐÈN LỒNG ${lit} / ${game.lanterns.length}`; $('score').innerHTML = `${game.score} <small>ĐIỂM</small>`;
  $('carry-label').textContent = `ĐOM ĐÓM · ${p.carried} / ${game.capacity}`;
  $('carry-slots').innerHTML = Array.from({ length: game.capacity }, (_, i) => `<i class="${i < p.carried ? 'filled' : ''}"></i>`).join('');
  $('pulse-cd').textContent = p.pulseCd ? `${(p.pulseCd / 60).toFixed(1)}s` : '3 đom đóm';
  $('night-label').textContent = `ĐÊM 0${currentNight} · ${game.map.name.toLocaleUpperCase('vi-VN')}`;
  $('dash-cd').textContent = p.charm > 0 ? `Bùa ${(p.charm / 60).toFixed(0)}s` : p.dashCd ? `${(p.dashCd / 60).toFixed(1)}s` : 'Sẵn sàng';
  const nearby = game.lanterns.filter(l => !l.lit && xzDistance(l.pos, p.pos) <= 2).sort((a, b) => xzDistance(a.pos, p.pos) - xzDistance(b.pos, p.pos))[0];
  $('interact-hint').hidden = !nearby; if (nearby) $('interact-hint').textContent = `E — Nạp ánh sáng (${nearby.deposited}/10)`;
  if (seconds > captionUntil) $('caption').textContent = '';
  if (sec <= 10 && sec !== lastCountdown) { lastCountdown = sec; audio.event('countdown'); $('caption').textContent = `⚠ Còn ${sec} giây đến bình minh`; captionUntil = seconds + .9; }
  if (game.night === 3 && game.simTick % 1800 >= 1680 && !game.wind.active) { if (!lastWind) audio.event('wind'); $('caption').textContent = '⚠ Lá bay trong gió — gió mạnh sắp thổi!'; captionUntil = seconds + 1; lastWind = true; } else lastWind = false;
  view.updateObjective(game, $('objective-arrow'));
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
window.addEventListener('pointermove', e => { if (dragging && mode === 'playing') view.yaw -= e.movementX * .004 * settings.sensitivity; });
function animate(now) {
  const dt = Math.min((now - last) / 1000, .1); last = now; seconds += dt;
  if (mode === 'playing') {
    accumulator += dt;
    while (accumulator >= 1 / 60 && mode === 'playing') {
      const held = code => keys.has(code) || pressed.has(code);
      const input = { ...defaultInput(), move: [(keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)], cam_yaw_deg: view.yaw * 180 / Math.PI, jump: held('Space'), interact: held('KeyE'), pulse: held('KeyQ'), dash: held('ShiftLeft') || held('ShiftRight') };
      if (input.jump && !game.previous.jump && game.player.grounded) audio.event('jump');
      const events = game.step(input);
      pressed.clear();
      for (const e of events) {
        audio.event(e.name);
        if (e.name === 'pulse') view.pulse(game.player.pos);
        if (e.name === 'shade_spawned') { $('caption').textContent = '⚠ Bóng Mực xuất hiện trong sương!'; captionUntil = seconds + 3; }
      }
      accumulator -= 1 / 60; if (game.state !== 'playing') result();
    }
    updateHUD();
  }
  view.update(game, seconds, dt, { menu: mode === 'menu' || mode === 'intro' }); requestAnimationFrame(animate);
  audio.music(seconds, mode === 'playing');
}
function showSettings(back) {
  mode = 'settings'; screen(`<section class="panel"><h2>Cài đặt</h2><div class="settings-row"><label for="volume">Âm lượng</label><input id="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></div><div class="settings-row"><label for="sensitivity">Độ nhạy chuột</label><input id="sensitivity" type="range" min="0.2" max="3" step="0.1" value="${settings.sensitivity}"></div><div class="button-row"><button class="primary" id="settings-back">Lưu và trở lại</button></div></section>`, true);
  $('volume').oninput = e => { settings.volume = Number(e.target.value); audio.volume = settings.volume; saveSettings(settings); };
  $('sensitivity').oninput = e => { settings.sensitivity = Number(e.target.value); saveSettings(settings); };
  $('settings-back').onclick = back;
}
$('abilities').insertAdjacentHTML('afterbegin', '<span><kbd>Shift</kbd> Lướt <b id="dash-cd">Sẵn sàng</b></span>');
if (new URLSearchParams(location.search).has('qa')) Object.defineProperty(window, '__lab', { get: () => ({ mode, snapshot: game.snapshot() }) });
menu(); requestAnimationFrame(animate);
