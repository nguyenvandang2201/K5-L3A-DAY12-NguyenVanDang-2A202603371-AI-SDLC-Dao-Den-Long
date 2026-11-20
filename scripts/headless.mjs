import { readFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Game, defaultInput } from '../src/core/game.mjs';
import { validateInputs, validateScenario, FormatError } from '../src/core/validation.mjs';

export function parseArgs(args, allowed) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!key.startsWith('--') || !allowed.includes(key.slice(2)) || args[i + 1] === undefined || key.slice(2) in options)
      throw new FormatError(`Invalid argument: ${key}`);
    options[key.slice(2)] = args[i + 1];
  }
  return options;
}
export function intOption(value, name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max)
    throw new FormatError(`Invalid --${name}`);
  return Number(value);
}
function jsonFile(path) {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }
  catch (e) { if (e instanceof SyntaxError) throw new FormatError(`${path}: invalid JSON`); throw e; }
}
export function runHeadless(args) {
  const o = parseArgs(args, ['seed', 'night', 'ticks', 'out', 'scenario', 'inputs', 'snapshot-every']);
  const seed = intOption(o.seed, 'seed', 42, -Number.MAX_SAFE_INTEGER), night = intOption(o.night, 'night', 1, 1, 1);
  const ticks = intOption(o.ticks, 'ticks', undefined), every = intOption(o['snapshot-every'], 'snapshot-every', 10, 1);
  if (!o.out) throw new FormatError('Missing --out');
  const scenario = o.scenario ? validateScenario(jsonFile(o.scenario), night) : {};
  const frames = o.inputs ? validateInputs(jsonFile(o.inputs)).frames : [];
  const game = new Game({ seed, night, scenario }); let cursor = 0, input = defaultInput();
  const fd = openSync(o.out, 'w');
  const write = obj => writeSync(fd, `${JSON.stringify(obj)}\n`);
  try {
    write(game.snapshot());
    for (let k = 0; k < ticks && (game.state === 'playing' || game.state === 'paused'); k++) {
      if (frames[cursor]?.tick === k) { const { tick, ...changes } = frames[cursor++]; input = { ...input, ...changes }; }
      for (const event of game.step(input)) write(event);
      if (game.tick % every === 0) write(game.snapshot());
    }
    write({ type: 'end', ticks: game.tick, state: game.state, score: game.score });
  } finally { closeSync(fd); }
  return game;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { runHeadless(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = e instanceof FormatError ? 2 : 1; }
}
