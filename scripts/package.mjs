import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
const archive = {};
function include(path) {
  const entries = readdirSync(path, { withFileTypes: true });
  for (const entry of entries) { const file = join(path, entry.name).replaceAll('\\', '/'); if (entry.isDirectory()) include(file); else archive[file] = new Uint8Array(readFileSync(file)); }
}
include('dist');
for (const file of ['scripts/run.mjs', 'src/core/leaderboard.mjs', 'LICENSE', 'THIRD_PARTY_LICENSES.txt', 'CREDITS.md', 'game.contract.json']) archive[file] = new Uint8Array(readFileSync(file));
archive['README.txt'] = strToU8('DAO DEN LONG v1.0.0\nNguyen Van Dang - 2A202603371 - L3A\n\nRequires Node.js >=22.12 and a desktop browser with WebGL2.\nUnzip, open a terminal in this folder, run:\n  node scripts/run.mjs\nThen open http://127.0.0.1:5173\nNo npm install is needed for this prebuilt release.\nLeaderboard is saved in .local/leaderboard.json.\nExport: node scripts/run.mjs --export-leaderboard out.json\n\nFull source, tests, headless, benchmark, soak and lab documents are in the GitHub repository.\n');
mkdirSync('release', { recursive: true });
const output = 'release/dao-den-long-v1.0.0-web.zip'; writeFileSync(output, zipSync(archive, { level: 9 }));
process.stdout.write(`${output} (${Object.keys(archive).length} files)\n`);
