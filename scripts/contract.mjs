import { writeFileSync } from 'node:fs';
import { CONTRACT_VERSION, tuning, PHASE } from '../src/core/tuning.mjs';
export const contract = {
  contract_version: CONTRACT_VERSION, team: '2A202603371-Nguyen-Van-Dang',
  build_cmd: 'npm ci && npm run build', run_cmd: 'node scripts/run.mjs',
  headless_cmd: 'node scripts/headless.mjs',
  ...(PHASE >= 4 ? { bench_cmd: 'node scripts/bench.mjs', soak_cmd: 'node --expose-gc scripts/soak.mjs' } : {}), tuning
};
if (process.argv.includes('--write')) writeFileSync('game.contract.json', JSON.stringify(contract, null, 2) + '\n');
