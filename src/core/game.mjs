import { DT, tuning } from './tuning.mjs';
import { getMap, terrainHeight, blocked } from './maps.mjs';
import { rng, xzDistance, distance3, direction, moveDirection, naturalId, round } from './math.mjs';

export const defaultInput = () => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false });
const posOut = p => p.map(v => round(v));

export class Game {
  constructor({ seed = 42, night = 1, scenario = {} } = {}) {
    this.seed = seed; this.night = night; this.random = rng(seed); this.map = getMap(night);
    this.tick = 0; this.simTick = 0; this.state = 'playing'; this.score = 0;
    this.timeTicks = (scenario.time_left_s ?? this.map.duration) * 60;
    this.events = []; this.previous = defaultInput(); this.nextMote = 1; this.nextShade = 1;
    this.randomMotes = scenario.random_motes ?? true; this.randomShades = scenario.random_shades ?? true;
    this.player = { pos: [0, 0, 0], vel: [0, 0, 0], grounded: true,
      carried: 0, flames: tuning.flames, invuln: 0, pulseCd: 0, dashCd: 0, dashTicks: 0, charm: 0,
      dashDir: [0, 1], launched: false, launchVel: [0, 0], face: [0, 1], respawn: 0,
      ...(scenario.player ? { pos: [...(scenario.player.pos ?? [0, 0, 0])], carried: scenario.player.carried ?? 0,
        flames: scenario.player.flames ?? tuning.flames } : {}) };
    this.player.grounded = Math.abs(this.player.pos[1] - terrainHeight(this.map, this.player.pos[0], this.player.pos[2])) < 1e-6;
    for (const [key, field] of [['invuln_ticks', 'invuln'], ['dash_cd_ticks', 'dashCd'], ['pulse_cd_ticks', 'pulseCd'], ['charm_ticks', 'charm']]) this.player[field] = scenario.player?.[key] ?? 0;
    this.randomDrifters = scenario.random_drifters ?? true; this.windEnabled = scenario.wind_enabled ?? true;
    this.wind = { active: false, dir_deg: 0 }; this.nextDrifter = 1;
    this.drifters = (scenario.drifters ?? []).map((d, i) => ({ id: d.id ?? `D${i + 1}`, state: 'idle', stolen: 0, ticks: 240, ...d, pos: [...d.pos] }));
    this.nextDrifter = this.drifters.reduce((v, d) => Math.max(v, Number(d.id.match(/^D(\d+)$/)?.[1] ?? 0) + 1), 1);
    this.drifters.sort(naturalId);
    this.charms = scenario.charms ? scenario.charms.map(c => ({ available: true, respawn: c.respawn_ticks ?? 0, ...c, pos: c.pos ?? this.map.charms[Number(c.id?.slice(1)) - 1] ?? [0, 0, 0] })) : this.map.charms.map((pos, i) => ({ id: `C${i + 1}`, pos: [...pos], available: true, respawn: 0 }));
    this.lanterns = this.map.lanterns.map((pos, i) => ({ id: `L${i + 1}`, pos: [...pos], deposited: 0, lit: false }));
    for (const update of scenario.lanterns ?? []) {
      const lamp = this.lanterns.find(l => l.id === update.id);
      Object.assign(lamp, update); if (update.pos) lamp.pos = [...update.pos];
      if (lamp.lit) lamp.deposited = tuning.lantern_cost;
    }
    this.motes = [];
    if (scenario.motes) scenario.motes.forEach(pos => this.addMote(pos));
    else if (this.randomMotes) for (let i = 0; i < 20; i++) this.spawnMote();
    this.shades = (scenario.shades ?? []).map((s, i) => ({
      id: s.id ?? `S${i + 1}`, pos: [...s.pos], state: 'chase', ticks: 0,
      push: [0, 0], pushTicks: 0, safeTicks: 0, ...s, ticks: s.state_ticks_left ?? 0, pos: [...s.pos]
    }));
    this.nextShade = 1 + this.shades.reduce((m, s) => Math.max(m, Number(s.id.match(/^S(\d+)$/)?.[1] ?? 0)), 0);
    this.shades.sort(naturalId);
  }
  emit(name, data = {}) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  get timeLeft() { return Math.max(0, (this.timeTicks - this.simTick) / 60); }
  get capacity() { return tuning.carry_capacity; }
  addMote(pos, kind = 'random', ttl = null) {
    this.motes.push({ id: `M${this.nextMote++}`, pos: [...pos], kind, ttl, born: this.simTick });
  }
  spawnMote() {
    if (this.motes.length >= 30) return;
    const free = this.map.motePoints.filter(p => !this.motes.some(m => xzDistance(p, m.pos) < 0.01));
    if (free.length) this.addMote(free[Math.floor(this.random() * free.length)]);
  }
  spawnShade() {
    if (this.shades.length >= this.map.shadeCap) return;
    const points = this.map.shadePoints.filter(p => xzDistance(p, this.player.pos) >= 15 &&
      !this.lanterns.some(l => l.lit && xzDistance(p, l.pos) < tuning.safe_radius));
    if (!points.length) return;
    const pos = [...points[Math.floor(this.random() * points.length)]]; pos[1] += 0.8;
    const s = { id: `S${this.nextShade++}`, pos, state: 'wander', ticks: 0,
      push: [0, 0], pushTicks: 0, safeTicks: 0, born: this.simTick };
    this.shades.push(s); this.emit('shade_spawned', { id: s.id });
  }
  step(input = defaultInput()) {
    if (this.state !== 'playing' && this.state !== 'paused') return [];
    this.tick++; this.events = [];
    const edge = key => Boolean(input[key]) && !this.previous[key];
    if (edge('pause')) { this.state = this.state === 'paused' ? 'playing' : 'paused'; this.emit(this.state === 'paused' ? 'paused' : 'resumed'); }
    if (this.state === 'paused') { this.previous = { ...input, move: [...input.move] }; return this.events; }
    this.simTick++;
    if (this.simTick === 1) this.emit('night_start', { night: this.night });
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - 1); p.pulseCd = Math.max(0, p.pulseCd - 1);
    p.dashCd = Math.max(0, p.dashCd - 1); p.charm = Math.max(0, p.charm - 1);
    for (const c of this.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
    this.updateWind();
    for (const s of this.shades) {
      if (s.ticks > 0 && --s.ticks === 0 && (s.state === 'stunned' || s.state === 'recoil')) s.state = 'wander';
    }
    this.motes = this.motes.filter(m => m.ttl === null || --m.ttl > 0);
    this.movePlayer(input, edge);
    if (!p.respawn && p.flames > 0) {
      this.pickup(); this.pickupCharms();
      if (edge('interact')) this.interact();
      this.updateSafety();
      if (edge('pulse')) this.pulse();
    }
    this.moveShades(); this.moveDrifters(); this.drifterCollisions(); this.collisions();
    if (this.randomMotes && this.simTick % 240 === 0) this.spawnMote();
    if (this.randomShades && this.simTick === 300) { this.spawnShade(); this.spawnShade(); }
    else if (this.randomShades && this.simTick > 300 && (this.simTick - 300) % this.map.shadeInterval === 0) this.spawnShade();
    if (this.night >= 2 && this.randomDrifters && this.simTick % 1200 === 0) this.spawnDrifter();
    this.finish(); this.previous = { ...input, move: [...input.move] };
    return this.events;
  }
  movePlayer(input, edge) {
    const p = this.player;
    if (p.respawn > 0) {
      if (--p.respawn === 0 && p.flames > 0) {
        p.pos = [0, 0, 0]; p.vel = [0, 0, 0]; p.grounded = true; p.invuln = 90;
      }
      return;
    }
    const d = moveDirection(input.move, input.cam_yaw_deg);
    if (Math.hypot(...d) > 0.001) p.face = direction([0, 0, 0], [d[0], 0, d[1]]);
    if (edge('dash') && !p.dashTicks && (p.dashCd === 0 || p.charm > 0)) {
      p.dashTicks = 12; p.dashCd = p.charm > 0 ? 0 : 90; p.dashDir = [...p.face]; this.emit('dash');
    }
    const speed = p.charm > 0 ? 7.2 : tuning.player_speed;
    p.vel[0] = p.dashTicks ? p.dashDir[0] * 14 : p.launched ? p.launchVel[0] : d[0] * speed;
    p.vel[2] = p.dashTicks ? p.dashDir[1] * 14 : p.launched ? p.launchVel[1] : d[1] * speed;
    if (edge('jump') && p.grounded) { p.vel[1] = 7; p.grounded = false; }
    const old = [...p.pos], dashing = p.dashTicks > 0;
    if (!p.grounded && !dashing) p.vel[1] -= 20 * DT;
    let next = p.pos.map((v, i) => v + (i === 1 && dashing ? 0 : p.vel[i]) * DT);
    if (this.wind.active) { const a = this.wind.dir_deg * Math.PI / 180; next[0] += Math.cos(a) * 2 * DT; next[2] += Math.sin(a) * 2 * DT; }
    if (blocked(this.map, old, next)) { next[0] = old[0]; next[2] = old[2]; p.vel[0] = p.vel[2] = 0; }
    p.pos = next;
    const ground = terrainHeight(this.map, p.pos[0], p.pos[2]);
    if (p.pos[1] <= ground + (p.grounded ? .2 : 0) && p.vel[1] <= 0 && !dashing) { p.pos[1] = ground; p.vel[1] = 0; p.grounded = true; p.launched = false; }
    else if (p.pos[1] > ground + 1e-6) p.grounded = false;
    if (p.dashTicks) p.dashTicks--;
    if (p.grounded) for (const pad of this.map.pads) if (xzDistance(p.pos, pad.pos) <= 1 && Math.abs(p.pos[1] - pad.pos[1]) <= .1) {
      p.vel[1] = pad.vy; p.grounded = false; p.launched = true; const launch = direction(pad.pos, pad.target);
      p.launchVel = launch.map(v => v * pad.speed); p.vel[0] = p.launchVel[0]; p.vel[2] = p.launchVel[1]; break;
    }
    if (p.pos[1] < -10) {
      const lost = p.carried; p.carried = 0; p.flames = Math.max(0, p.flames - 1); p.respawn = 60;
      p.launched = false; p.dashTicks = 0; this.emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }
  pickup() {
    const p = this.player, remaining = [];
    for (const m of this.motes) {
      if (m.born < this.simTick && p.carried < this.capacity &&
          xzDistance(p.pos, m.pos) <= tuning.pickup_radius + 1e-9 && Math.abs(p.pos[1] - m.pos[1]) <= 1.5 + 1e-9) {
        p.carried++; this.emit('mote_picked', { carried: p.carried });
      } else remaining.push(m);
    }
    this.motes = remaining;
  }
  interact() {
    const p = this.player;
    const eligible = this.lanterns.filter(l => !l.lit && xzDistance(l.pos, p.pos) <= tuning.interact_radius + 1e-9)
      .sort((a, b) => xzDistance(a.pos, p.pos) - xzDistance(b.pos, p.pos) || naturalId(a, b));
    const l = eligible[0]; if (!l || !p.carried) return;
    const amount = Math.min(p.carried, tuning.lantern_cost - l.deposited);
    p.carried -= amount; l.deposited += amount; this.score += tuning.score.per_mote * amount;
    this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
    if (l.deposited >= tuning.lantern_cost) {
      l.lit = true; this.score += tuning.score.per_lantern; this.emit('lantern_lit', { lantern_id: l.id });
    }
  }
  updateSafety() {
    for (const s of this.shades) {
      const l = this.lanterns.find(l => l.lit && xzDistance(s.pos, l.pos) < tuning.safe_radius - 1e-9);
      if (l && !s.safeTicks) s.safeTicks = 30;
    }
  }
  pulse() {
    const p = this.player; if (p.pulseCd || p.carried < tuning.pulse_cost) return;
    p.carried -= tuning.pulse_cost; p.pulseCd = tuning.pulse_cooldown_s * 60;
    const center = [p.pos[0], p.pos[1] + 0.8, p.pos[2]], ids = [];
    for (const s of this.shades) if (distance3(center, s.pos) <= tuning.pulse_radius + 1e-9) {
      s.state = 'stunned'; s.ticks = 120; s.push = direction(p.pos, s.pos); s.pushTicks = 15;
      ids.push(s.id); this.score += tuning.score.per_stun;
    }
    this.emit('pulse', { stunned_ids: ids });
    for (const d of this.drifters) if (d.state !== 'removed' && distance3(center, d.pos) <= 5 + 1e-9) {
      if (d.state === 'chase') { d.state = 'flee'; d.ticks = 240; d.dir = direction(p.pos, d.pos); }
      else if (d.state === 'flee' && d.stolen > 0) { this.dropMotes(d.stolen, d.pos); this.emit('drifter_drop', { drifter_id: d.id, amount: d.stolen }); d.stolen = 0; d.ticks = 120; }
    }
  }
  shadeMove(s, d, amount) {
    const next = [s.pos[0] + d[0] * amount, s.pos[1], s.pos[2] + d[1] * amount];
    const oldFoot = [s.pos[0], s.pos[1] - .8, s.pos[2]], nextFoot = [next[0], next[1] - .8, next[2]];
    const height = terrainHeight(this.map, next[0], next[2]);
    if (!Number.isFinite(height) || blocked(this.map, oldFoot, nextFoot)) return;
    const oldHeight = terrainHeight(this.map, s.pos[0], s.pos[2]);
    if (Number.isFinite(oldHeight)) next[1] += height - oldHeight;
    for (const l of this.lanterns) if (l.lit && xzDistance(next, l.pos) < tuning.safe_radius - 1e-9) {
      const dir = direction(l.pos, next);
      next[0] = l.pos[0] + dir[0] * tuning.safe_radius; next[2] = l.pos[2] + dir[1] * tuning.safe_radius;
    }
    s.pos = next;
  }
  moveShades() {
    for (const s of this.shades) {
      if (s.born === this.simTick) continue;
      if (s.safeTicks > 0) {
        const l = this.lanterns.find(l => l.lit && xzDistance(s.pos, l.pos) < tuning.safe_radius - 1e-9);
        if (l) {
          const d = direction(l.pos, s.pos), gap = tuning.safe_radius - xzDistance(l.pos, s.pos);
          s.pos[0] += d[0] * gap / s.safeTicks; s.pos[2] += d[1] * gap / s.safeTicks;
        }
        s.safeTicks--; continue;
      }
      if (s.state === 'stunned') {
        if (s.pushTicks > 0) { this.shadeMove(s, s.push, tuning.pulse_push_m / 15); s.pushTicks--; }
        continue;
      }
      if (s.state === 'recoil') { this.shadeMove(s, s.push, 2 / 60); continue; }
      const dist = xzDistance(s.pos, this.player.pos);
      if (s.state === 'chase' && dist > 18) s.state = 'wander';
      if (s.state === 'wander' && dist <= 12) s.state = 'chase';
      const lamps = this.lanterns.filter(l => !l.lit).sort((a, b) => xzDistance(s.pos, a.pos) - xzDistance(s.pos, b.pos) || naturalId(a, b));
      const target = s.state === 'chase' ? this.player.pos : lamps[0]?.pos;
      if (target) this.shadeMove(s, direction(s.pos, target), this.map.shadeSpeed * DT);
    }
  }
  dropMotes(amount, pos) {
    for (let i = 0; i < amount; i++) {
      const angle = this.random() * Math.PI * 2, r = 1.5 + this.random();
      const x = pos[0] + Math.cos(angle) * r, z = pos[2] + Math.sin(angle) * r;
      const h = terrainHeight(this.map, x, z);
      this.addMote([x, Number.isFinite(h) ? h : 0, z], 'dropped', 480);
    }
  }
  collisions() {
    const p = this.player; if (p.respawn || p.invuln || !p.flames) return;
    for (const s of this.shades) {
      if (s.state === 'stunned' || s.state === 'recoil' || s.state === 'spawning' || s.safeTicks || s.born === this.simTick) continue;
      if (xzDistance(p.pos, s.pos) <= 1 + 1e-9 && Math.abs(p.pos[1] - s.pos[1]) <= 1.5 + 1e-9) {
        p.flames--; const dropped = Math.floor(p.carried * tuning.hit_drop_ratio); p.carried -= dropped;
        p.invuln = 90; s.state = 'recoil'; s.ticks = 60; s.push = direction(p.pos, s.pos);
        this.dropMotes(dropped, p.pos); this.emit('player_hit', { by: 'shade', flames: p.flames, dropped }); break;
      }
    }
  }
  finish() {
    let reason;
    if (this.player.flames <= 0) { this.state = 'lost'; reason = 'no_flames'; }
    else if (this.lanterns.every(l => l.lit)) {
      this.state = 'won'; reason = 'all_lit';
      this.score += Math.floor(this.timeLeft) * tuning.score.per_second_left + this.player.flames * tuning.score.per_flame_left;
    } else if (this.timeLeft <= 0) { this.state = 'lost'; reason = 'dawn'; }
    if (reason) this.emit('game_over', { result: this.state, reason });
  }
  snapshot() {
    return { type: 'snapshot', tick: this.tick, sim_tick: this.simTick, state: this.state,
      time_left_s: round(this.timeLeft), score: this.score, night: this.night, wind: { ...this.wind },
      player: { pos: posOut(this.player.pos), flames: this.player.flames, carried: this.player.carried,
        vel: posOut(this.player.vel), grounded: this.player.grounded, invuln: this.player.invuln > 0,
        dash_cd_s: round(this.player.dashCd / 60), pulse_cd_s: round(this.player.pulseCd / 60), charm_s: round(this.player.charm / 60) },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: posOut(l.pos), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map(s => ({ id: s.id, pos: posOut(s.pos), state: s.state })), motes_active: this.motes.length,
      motes: this.motes.map(m => ({ id: m.id, pos: posOut(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : round(m.ttl / 60) })),
      drifters: this.drifters.map(d => ({ id: d.id, pos: posOut(d.pos), state: d.state, stolen: d.stolen })),
      charms: this.charms.map(c => ({ id: c.id, available: c.available, respawn_s: round(c.respawn / 60) })) };
  }
  pickupCharms() {
    const p = this.player;
    for (const c of this.charms) if (c.available && xzDistance(p.pos, c.pos) <= 1 + 1e-9 && Math.abs(p.pos[1] - c.pos[1]) <= 1.5) {
      p.charm = 600; c.available = false; c.respawn = 2700; this.emit('charm_picked', { charm_id: c.id, charm_ticks: 600 });
    }
  }
  updateWind() {
    if (this.night !== 3 || !this.windEnabled) return;
    const t = this.simTick % 1800;
    if (t === 1680) this.wind.dir_deg = Math.floor(this.random() * 360);
    this.wind.active = this.simTick >= 1800 && t < 300;
  }
  spawnDrifter() {
    if (this.drifters.length >= 2) return;
    const pos = [...this.map.shadePoints[Math.floor(this.random() * this.map.shadePoints.length)]]; pos[1] += .8;
    this.drifters.push({ id: `D${this.nextDrifter++}`, pos, state: 'idle', stolen: 0, ticks: 0, born: this.simTick });
  }
  moveDrifters() {
    for (const d of this.drifters) {
      if (d.born === this.simTick || d.state === 'removed') continue;
      if (d.state === 'flee') {
        d.dir ??= direction(this.player.pos, d.pos); d.pos[0] += d.dir[0] * 7 * DT; d.pos[2] += d.dir[1] * 7 * DT;
        if (--d.ticks <= 0) d.state = 'removed'; continue;
      }
      const chase = this.player.carried >= 5 && xzDistance(d.pos, this.player.pos) <= 15;
      d.state = chase ? 'chase' : 'idle';
      const dir = chase ? direction(d.pos, this.player.pos) : [Math.cos(this.simTick / 120 + Number(d.id.slice(1) || 0)), Math.sin(this.simTick / 120 + Number(d.id.slice(1) || 0))];
      d.pos[0] += dir[0] * (chase ? 7 : 2) * DT; d.pos[2] += dir[1] * (chase ? 7 : 2) * DT;
    }
    this.drifters = this.drifters.filter(d => d.state !== 'removed');
  }
  drifterCollisions() {
    const p = this.player; if (p.respawn || !p.flames) return;
    for (const d of this.drifters) if (d.state === 'chase' && d.born !== this.simTick && xzDistance(d.pos, p.pos) <= 1.2 + 1e-9) {
      const amount = Math.min(3, p.carried); p.carried -= amount; d.stolen = amount; d.state = 'flee'; d.ticks = 240; d.dir = direction(p.pos, d.pos);
      this.emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
    }
  }
}
