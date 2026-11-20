import { writeFileSync } from 'node:fs';
import { Game, defaultInput } from '../src/core/game.mjs';
import { rng } from '../src/core/math.mjs';
import { parseArgs, intOption } from './headless.mjs';
try {
  const o = parseArgs(process.argv.slice(2), ['seed', 'nights', 'out']);
  const seed = intOption(o.seed, 'seed', 7, -Number.MAX_SAFE_INTEGER), nights = intOption(o.nights, 'nights', 10, 1, 10000);
  if (!o.out) throw new Error('Missing --out');
  const start = performance.now(), results = []; let crashes = 0;
  let game = new Game({ seed, night: 1 }); global.gc?.(); const memStart = process.memoryUsage().rss / 1048576;
  for (let i = 0; i < nights; i++) {
    const random = rng(seed + i), input = defaultInput();
    if (i > 0) game = new Game({ seed: seed + i, night: i % 3 + 1 });
    try {
      const maxTicks = game.map.duration * 60;
      for (let t = 0; t < maxTicks && game.state === 'playing'; t++) {
        if (t % 30 === 0) { const angle = random() * 2 * Math.PI; input.move = [Math.cos(angle), Math.sin(angle)]; }
        input.jump = random() < .05; input.dash = random() < .03; input.pulse = random() < .02; input.interact = random() < .1;
        game.step(input);
      }
      results.push(game.state);
    } catch (e) { crashes++; results.push('crashed'); process.stderr.write(`Night ${i + 1}: ${e.message}\n`); }
    // Reset in this same process; no result retains the old world.
    game = new Game({ seed: seed + i + 1, night: (i + 1) % 3 + 1 }); global.gc?.();
  }
  const output = { nights, crashes, results, mem_start_mb: memStart, mem_end_mb: process.memoryUsage().rss / 1048576, duration_s: (performance.now() - start) / 1000 };
  writeFileSync(o.out, JSON.stringify(output, null, 2) + '\n'); process.stdout.write(JSON.stringify(output) + '\n');
  if (crashes) process.exitCode = 1;
} catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = 2; }
