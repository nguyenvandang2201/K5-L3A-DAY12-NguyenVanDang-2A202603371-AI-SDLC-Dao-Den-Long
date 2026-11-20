import { getMap } from './maps.mjs';

export class FormatError extends Error {}
const fail = (path, text) => { throw new FormatError(`${path}: ${text}`); };
const object = (v, p) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p, 'expected object'); };
const number = (v, p, min = -Infinity, max = Infinity, integer = false) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isSafeInteger(v))) fail(p, `invalid ${integer ? 'integer' : 'number'}`);
};
const optionalNumber = (o, k, min = 0, max = Infinity, integer = false) => { if (k in o) number(o[k], k, min, max, integer); };
const bool = (o, k) => { if (k in o && typeof o[k] !== 'boolean') fail(k, 'expected boolean'); };
const vector = (v, p, length = 3, bound = Infinity) => {
  if (!Array.isArray(v) || v.length !== length) fail(p, `expected ${length}-element array`);
  v.forEach((n, i) => number(n, `${p}[${i}]`, -bound, bound));
};
const array = (v, p) => { if (!Array.isArray(v)) fail(p, 'expected array'); };
export function validateInputs(data) {
  object(data, 'inputs'); array(data.frames, 'frames'); let previous = -1;
  for (const [i, f] of data.frames.entries()) {
    object(f, `frames[${i}]`); number(f.tick, 'tick', 0, Infinity, true);
    if (f.tick <= previous) fail('frames.tick', 'must increase strictly'); previous = f.tick;
    if ('move' in f) vector(f.move, 'move', 2, 1);
    optionalNumber(f, 'cam_yaw_deg', -Infinity);
    for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) bool(f, key);
  }
  return data;
}
export function validateScenario(data, night = 1) {
  object(data, 'scenario');
  const map = getMap(night);
  if ('player' in data) {
    object(data.player, 'player'); const p = data.player;
    if ('pos' in p) vector(p.pos, 'player.pos');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) optionalNumber(p, k, 0, Infinity, true);
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) bool(data, k);
  optionalNumber(data, 'time_left_s');
  for (const k of ['motes', 'shades', 'lanterns', 'drifters', 'charms']) if (k in data) array(data[k], k);
  for (const m of data.motes ?? []) vector(m, 'mote');
  for (const type of ['shades', 'drifters', 'lanterns', 'charms']) {
    const ids = new Set();
    for (const [i, e] of (data[type] ?? []).entries()) {
      object(e, `${type}[${i}]`);
      if ('id' in e) {
        if (typeof e.id !== 'string' || !e.id.length || ids.has(e.id)) fail(`${type}.id`, 'invalid or duplicate id');
        ids.add(e.id);
      }
      if (type === 'lanterns' && !map.lanterns.some((_, i) => e.id === `L${i + 1}`)) fail('lantern.id', 'unknown lantern');
      if (type === 'shades' || type === 'drifters') vector(e.pos, `${type}.pos`);
      else if ('pos' in e) vector(e.pos, `${type}.pos`);
      for (const k of ['lit', 'ever_lit', 'available']) bool(e, k);
      for (const k of ['deposited', 'state_ticks_left', 'stolen', 'respawn_ticks', 'relit_count']) optionalNumber(e, k, 0, Infinity, true);
      optionalNumber(e, 'fuel', 0, 100);
      if ('state' in e) {
        const states = type === 'shades' ? ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'] : ['idle', 'chase', 'flee', 'removed'];
        if (!states.includes(e.state)) fail(`${type}.state`, 'unknown state');
      }
    }
  }
  // Resolve implicit ids too, so an explicit S2 cannot collide with the second implicit shade.
  for (const [type, prefix] of [['shades', 'S'], ['drifters', 'D']]) {
    const ids = (data[type] ?? []).map((e, i) => e.id ?? `${prefix}${i + 1}`);
    if (new Set(ids).size !== ids.length) fail(`${type}.id`, 'duplicate resolved id');
  }
  return data;
}
