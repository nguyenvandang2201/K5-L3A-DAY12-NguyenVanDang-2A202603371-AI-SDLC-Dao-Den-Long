import './style.css';
import { Game, defaultInput } from './core/game.mjs';
import { xzDistance } from './core/math.mjs';
import { WorldView } from './view/scene.mjs';
import { GameAudio } from './view/audio.mjs';
import { loadSettings, saveSettings, defaultBindings } from './view/settings.mjs';
import { readLeaderboard, addLeaderboard } from './view/leaderboard.mjs';
import { benchmarkScene, summarizeFrames } from './view/benchmark.mjs';

const $ = id => document.getElementById(id);
let game = new Game({ seed: 42 }), view, mode = 'menu', accumulator = 0, last = performance.now(), seconds = 0, captionUntil = 0;
let currentNight = 1, totalScore = 0, nightsWon = 0, lastCountdown = -1, lastWind = false;
const settings = loadSettings(), audio = new GameAudio(); audio.volume = settings.volume;
const params = new URLSearchParams(location.search);
let remapping = null, spawnWarning = null, bench = null;
const keys = new Set(), pressed = new Set(); let dragging = false;
const keyLabel = code => code.replace(/^Key/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift').replace('Escape', 'Esc');
try { view = new WorldView($('world')); view.load(game); view.applySettings(settings); }
catch (e) { $('boot-error').hidden = false; $('boot-error').textContent = `Không mở được đồ họa 3D. Hãy bật WebGL 2 trong trình duyệt.\n${e.message}`; throw e; }
function screen(html, centered = false) { $('screen').hidden = false; $('screen').className = `screen${centered ? ' center' : ''}`; $('screen').innerHTML = html; $('hud').hidden = true; }
function menu() {
  mode = 'menu'; keys.clear();
  screen(`<section class="menu-copy"><div class="brand-mark">◈</div><div class="eyebrow">MỘT HÀNH TRÌNH GIỮ ÁNH SÁNG</div><h1>Đảo<br><em>Đèn Lồng</em></h1><div class="rule"></div><p>Đêm xuống trên biển mây.<br>Gom những đốm sáng nhỏ, thắp lại đèn lồng<br>và dẫn bình minh về với đảo.</p><div class="button-row"><button class="primary" id="begin">Bắt đầu hành trình &nbsp; →</button></div><div class="controls"><kbd>W A S D</kbd> Di chuyển &nbsp; <kbd>Space</kbd> Nhảy<br><kbd>E</kbd> Nạp ánh sáng &nbsp; <kbd>Q</kbd> Tỏa sáng<br>Giữ chuột phải và kéo để xoay camera.</div></section><div class="menu-footer"><span>NGUYỄN VĂN ĐĂNG · 2A202603371 · L3A</span><span>ĐÊM 01 — ĐẢO BẾN</span></div>`);
  $('begin').onclick = () => { currentNight = 1; totalScore = 0; nightsWon = 0; audio.unlock(); intro(); };
  const button = document.createElement('button'); button.className = 'secondary'; button.textContent = 'Cài đặt'; button.onclick = () => showSettings(menu); document.querySelector('.button-row').append(button);
  const board = document.createElement('button'); board.className = 'secondary'; board.textContent = 'Bảng xếp hạng'; board.onclick = showLeaderboard; document.querySelector('.button-row').append(board);
  const b = settings.bindings; document.querySelector('.controls').innerHTML = `<kbd>${[b.forward, b.left, b.back, b.right].map(keyLabel).join(' ')}</kbd> Di chuyển &nbsp; <kbd>${keyLabel(b.jump)}</kbd> Nhảy<br><kbd>${keyLabel(b.interact)}</kbd> Nạp / châm dầu &nbsp; <kbd>${keyLabel(b.pulse)}</kbd> Tỏa sáng<br><kbd>${keyLabel(b.dash)}</kbd> Lướt · Giữ chuột phải và kéo để xoay camera.`;
}
function intro() {
  const names = ['Đảo Bến', 'Đảo Cau', 'Đảo Chuông'];
  const words = ['Gom đom đóm, giữ ít nhất ba ngọn đèn sáng tới bình minh. Nhớ châm dầu trước khi đèn tắt.', 'Hai bờ đảo nối bằng chiếc cầu tre. Hãy tin những bục nhảy, cẩn thận Gió Lạc và giữ bốn ngọn đèn.', 'Qua những tầng mây, chuông sẽ gọi bình minh. Đi theo dốc, nhìn hướng gió và giữ năm ngọn đèn.'];
  mode = 'intro'; screen(`<section class="panel"><div class="gold">ĐÊM 0${currentNight}</div><h2>${names[currentNight - 1]}</h2><p>“Mây à, mỗi đốm sáng đều có đường về.<br>${words[currentNight - 1]}”</p><div class="credit">— Ông Đăng, người giữ đèn</div><div class="button-row"><button class="primary" id="play">Mang ánh sáng về đảo →</button><button class="secondary" id="back">Về menu</button></div></section>`, true);
  $('play').onclick = start; $('back').onclick = menu;
}
function start(options = {}) {
  if (params.has('qa') && Number.isInteger(options.night) && options.night >= 1 && options.night <= 3) currentNight = options.night;
  game = new Game({ seed: 42, night: currentNight, scenario: params.has('qa') ? options.scenario ?? {} : {} });
  view.load(game); view.yaw = params.has('qa') && Number.isFinite(options.yaw) ? options.yaw : 0; mode = 'playing'; $('screen').hidden = true; $('hud').hidden = false; keys.clear(); pressed.clear(); accumulator = 0; lastCountdown = -1; audio.unlock();
  $('qa-marker')?.remove();
  if (params.has('qa') && options.scenario) { const marker = document.createElement('div'); marker.id = 'qa-marker'; marker.textContent = 'KIỂM THỬ · scenario dựng theo contract'; marker.style.cssText = 'position:fixed;bottom:0;left:0;font-size:18px;background:#101a2d;color:#ffe9b0;padding:5px;z-index:9'; document.body.append(marker); }
}
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
  if (won) document.querySelector('.panel p').textContent = 'Mây đã giữ đảo sáng tới bình minh. Một đêm nữa, hy vọng được gìn giữ.';
  if (won && currentNight < 3) { $('retry').textContent = 'Đêm kế tiếp →'; $('retry').onclick = () => { currentNight++; intro(); }; }
  if (won && currentNight === 3) { document.querySelector('.panel h2').textContent = 'Bình Minh'; document.querySelector('.panel p').textContent = `Ba hòn đảo đã sáng. Tổng điểm hành trình: ${totalScore}.`; $('retry').textContent = 'Hành trình mới'; $('retry').onclick = () => { currentNight = 1; totalScore = 0; nightsWon = 0; intro(); }; }
  if (!won || currentNight === 3) {
    const form = document.createElement('form'); form.innerHTML = `<label for="player-name">Tên người giữ đèn (3–12 ký tự A–Z, 0–9, _)</label><div class="button-row"><input id="player-name" class="name-input" autocomplete="nickname" minlength="3" maxlength="12" pattern="[A-Za-z0-9_]{3,12}" required aria-describedby="save-status"><button class="secondary" type="submit">Lưu điểm hành trình</button></div><div id="save-status" role="status" class="validation"></div>`;
    document.querySelector('.panel').append(form);
    form.onsubmit = async e => { e.preventDefault(); const button = form.querySelector('button'); button.disabled = true; try { await addLeaderboard({ name: $('player-name').value, score: totalScore, nights_won: nightsWon, achieved_at: new Date().toISOString(), seed: 42 }); $('save-status').textContent = 'Đã lưu điểm hành trình.'; } catch (e) { $('save-status').textContent = e.message; button.disabled = false; } };
  }
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
  const abilityKeys = $('abilities').querySelectorAll('kbd'); abilityKeys[0].textContent = keyLabel(settings.bindings.dash); abilityKeys[1].textContent = keyLabel(settings.bindings.pulse); document.querySelector('.pause-tip').textContent = `${keyLabel(settings.bindings.pause)} · Tạm dừng`;
  const nearby = game.lanterns.filter(l => (!l.lit || l.fuel < 100) && xzDistance(l.pos, p.pos) <= 2).sort((a, b) => xzDistance(a.pos, p.pos) - xzDistance(b.pos, p.pos))[0];
  $('interact-hint').hidden = !nearby; if (nearby) $('interact-hint').textContent = nearby.lit ? `${keyLabel(settings.bindings.interact)} — Châm dầu (${Math.floor(nearby.fuel)}/100)` : `${keyLabel(settings.bindings.interact)} — Nạp ánh sáng (${nearby.deposited}/${nearby.ever_lit ? 5 : 10})`;
  if (seconds > captionUntil) $('caption').textContent = '';
  const weak = game.lanterns.filter(l => l.lit && l.fuel < 30);
  if (weak.length && seconds > captionUntil) $('caption').textContent = `⚠ Đèn ${weak.map(l => l.id).join(', ')} sắp cạn dầu!`;
  if (sec <= 10) { if (sec !== lastCountdown) { lastCountdown = sec; audio.event('countdown'); } $('caption').textContent = `⚠ Còn ${sec} giây đến bình minh`; captionUntil = seconds + .9; }
  if (game.night === 3 && game.simTick % 1800 >= 1680 && !game.wind.active) { if (!lastWind) audio.event('wind'); $('caption').textContent = '⚠ Lá bay trong gió — gió mạnh sắp thổi!'; captionUntil = seconds + 1; lastWind = true; } else lastWind = false;
  view.updateObjective(game, $('objective-arrow'));
  $('shade-arrow').hidden = !spawnWarning || seconds > spawnWarning.until;
  if (!$('shade-arrow').hidden) view.placeEdge(spawnWarning.pos, $('shade-arrow'));
}
window.addEventListener('keydown', e => {
  if (remapping) {
    e.preventDefault(); const action = remapping;
    if (Object.entries(settings.bindings).some(([k, code]) => k !== action && code === e.code)) { $('key-error').textContent = '⚠ Phím này đang được dùng. Hãy chọn phím khác.'; return; }
    settings.bindings[action] = e.code; saveSettings(settings); remapping = null; $('key-error').textContent = 'Đã lưu phím mới.'; renderBindings(); return;
  }
  if (e.target instanceof HTMLInputElement || mode === 'settings') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === settings.bindings.pause || (settings.bindings.pause === 'Escape' && e.code === 'KeyP')) { if (mode === 'playing') pause(); else if (mode === 'paused') resume(); return; }
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
  if (mode === 'benchmark') { benchmarkFrame(now, dt); return; }
  if (mode === 'playing') {
    accumulator += dt;
    while (accumulator >= 1 / 60 && mode === 'playing') {
      const held = code => keys.has(code) || pressed.has(code);
      const b = settings.bindings;
      const input = { ...defaultInput(), move: [(keys.has(b.right) ? 1 : 0) - (keys.has(b.left) ? 1 : 0), (keys.has(b.forward) ? 1 : 0) - (keys.has(b.back) ? 1 : 0)], cam_yaw_deg: view.yaw * 180 / Math.PI, jump: held(b.jump), interact: held(b.interact), pulse: held(b.pulse), dash: held(b.dash) };
      if (input.jump && !game.previous.jump && game.player.grounded) audio.event('jump');
      const events = game.step(input);
      pressed.clear();
      for (const e of events) {
        audio.event(e.name);
        if (e.name === 'pulse') view.pulse(game.player.pos);
        if (e.name === 'shade_spawned') { $('caption').textContent = '⚠ Bóng Mực xuất hiện trong sương!'; captionUntil = seconds + 3; spawnWarning = { pos: [...game.shades.find(s => s.id === e.data.id).pos], until: seconds + 3 }; }
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
  const row = document.createElement('div'); row.className = 'settings-row'; row.innerHTML = `<label for="colorblind">Bảng màu dễ phân biệt</label><input id="colorblind" type="checkbox" ${settings.colorblind ? 'checked' : ''}>`; document.querySelector('.panel').insertBefore(row, document.querySelector('.panel .button-row'));
  $('colorblind').onchange = e => { settings.colorblind = e.target.checked; applySettings(); saveSettings(settings); };
  for (const [key, label] of [['reduceMotion', 'Giảm chuyển động'], ['largeText', 'Chữ lớn ×1.25']]) {
    const row = document.createElement('div'); row.className = 'settings-row'; row.innerHTML = `<label for="${key}">${label}</label><input id="${key}" type="checkbox" ${settings[key] ? 'checked' : ''}>`; document.querySelector('.panel').insertBefore(row, document.querySelector('.panel .button-row'));
    $(key).onchange = e => { settings[key] = e.target.checked; applySettings(); saveSettings(settings); };
  }
  const keysPanel = document.createElement('section'); keysPanel.innerHTML = '<div class="key-grid" id="key-grid"></div><div id="key-error" class="validation" role="status"></div><button class="secondary" id="reset-keys">Khôi phục mặc định</button>';
  document.querySelector('.panel').insertBefore(keysPanel, document.querySelector('.panel .button-row')); renderBindings();
  $('reset-keys').onclick = () => { settings.bindings = { ...defaultBindings }; remapping = null; saveSettings(settings); renderBindings(); $('key-error').textContent = 'Đã khôi phục phím mặc định.'; };
}
function applySettings() { audio.volume = settings.volume; view.applySettings(settings); document.documentElement.style.setProperty('--danger', settings.colorblind ? '#FFFFFF' : '#FF5A5F'); document.documentElement.style.setProperty('--ui-scale', settings.largeText ? '1.25' : '1'); document.body.classList.toggle('large', settings.largeText); document.body.classList.toggle('reduce-motion', settings.reduceMotion); }
function renderBindings() {
  const names = { forward: 'Tiến', back: 'Lùi', left: 'Trái', right: 'Phải', jump: 'Nhảy', dash: 'Lướt', interact: 'Tương tác', pulse: 'Tỏa sáng', pause: 'Tạm dừng' };
  $('key-grid').innerHTML = Object.entries(names).map(([key, name]) => `<button class="secondary" data-action="${key}">${name}: ${settings.bindings[key].replace('Key', '')}</button>`).join('');
  for (const button of $('key-grid').children) button.onclick = () => { remapping = button.dataset.action; $('key-error').textContent = `Nhấn phím mới cho ${names[remapping]}…`; };
}
async function showLeaderboard() {
  mode = 'leaderboard'; screen('<section class="panel"><h2>Bảng xếp hạng</h2><div id="board-entries">Đang đọc điểm…</div><div class="button-row"><button class="primary" id="back">Về menu</button></div></section>', true); $('back').onclick = menu;
  const entries = await readLeaderboard(); if (mode !== 'leaderboard') return;
  $('board-entries').innerHTML = entries.length ? `<table class="leaderboard"><thead><tr><th>Hạng</th><th>Người giữ đèn</th><th>Điểm</th><th>Số Đêm</th></tr></thead><tbody>${entries.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name}</td><td>${e.score}</td><td>${e.nights_won}/3</td></tr>`).join('')}</tbody></table>` : '<p>Chưa có điểm. Hãy mang ánh sáng về đảo!</p>';
}
function beginBenchmark() {
  game = benchmarkScene(Number(params.get('seed') ?? 42)); view.load(game); mode = 'benchmark'; $('screen').hidden = $('hud').hidden = true;
  bench = { first: null, previous: null, samples: [], duration: Number(params.get('duration') ?? 30), accumulator: 0 };
  window.__benchmark = { done: false };
}
function benchmarkFrame(now, dt) {
  if (bench.first === null) bench.first = now;
  const elapsed = (now - bench.first) / 1000;
  bench.accumulator += dt;
  while (bench.accumulator >= 1 / 60) { game.tick++; game.simTick++; game.updateSafety(); game.moveShades(); bench.accumulator -= 1 / 60; }
  view.update(game, elapsed, dt, { benchmark: true });
  if (bench.load === undefined) bench.load = Date.now() - Number(params.get('process_start') ?? Date.now());
  if (elapsed >= 3 && elapsed < 3 + bench.duration && bench.previous !== null && bench.previous >= bench.first + 3000) bench.samples.push(now - bench.previous);
  bench.previous = now;
  if (elapsed >= 3 + bench.duration) {
    window.__benchmark = { done: true, result: { contract_version: '1.3', ...summarizeFrames(bench.samples), load_ms: bench.load, peak_mem_mb: null, vsync_off: false, renderer: view.rendererInfo() }, scene: { night: game.night, shades: game.shades.length, motes: game.motes.length, lit: game.lanterns.filter(l => l.lit).length } }; return;
  }
  requestAnimationFrame(animate);
}
applySettings();
$('abilities').insertAdjacentHTML('afterbegin', '<span><kbd>Shift</kbd> Lướt <b id="dash-cd">Sẵn sàng</b></span>');
if (params.has('qa')) Object.defineProperty(window, '__lab', { get: () => ({ mode, snapshot: game.snapshot(), totalScore, nightsWon, restart: start }) });
$('hud').insertAdjacentHTML('beforeend', '<div id="shade-arrow" hidden>⚠ Bóng Mực</div>');
if (params.has('bench')) beginBenchmark(); else menu();
requestAnimationFrame(animate);
