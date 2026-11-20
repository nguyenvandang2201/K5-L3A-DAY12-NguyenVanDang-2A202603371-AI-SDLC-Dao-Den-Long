import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, extname, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rankEntries, validEntry } from '../src/core/leaderboard.mjs';
export const boardPath = resolve(process.env.DAO_DEN_LONG_DATA_DIR || '.local', 'leaderboard.json');
export function diskEntries() {
  try { return rankEntries(JSON.parse(readFileSync(boardPath, 'utf8')).entries); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
export function makeServer(root = resolve('dist')) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
  return createServer(async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/leaderboard') {
        if (req.method === 'GET') return json(200, { entries: diskEntries() });
        if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(403, { error: 'Origin not allowed' });
        let body = ''; for await (const chunk of req) { body += chunk.toString(); if (body.length > 65536) return json(413, { error: 'Request too large' }); }
        let entry; try { entry = JSON.parse(body); } catch { return json(400, { error: 'Invalid JSON' }); }
        if (!validEntry(entry)) return json(400, { error: 'Invalid leaderboard entry' });
        const entries = rankEntries([...diskEntries(), entry]); mkdirSync(dirname(boardPath), { recursive: true });
        writeFileSync(`${boardPath}.tmp`, JSON.stringify({ entries }, null, 2)); renameSync(`${boardPath}.tmp`, boardPath);
        return json(200, { entries });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
      let path = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
      if (path !== root && !path.startsWith(`${root}${sep}`)) { res.writeHead(403); res.end(); return; }
      if (!existsSync(path)) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : readFileSync(path));
    } catch (e) { if (!res.headersSent) json(500, { error: 'Local server error' }); else res.end(); process.stderr.write(`${e.message}\n`); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === '--export-leaderboard' && args.length === 2) {
    try { writeFileSync(args[1], JSON.stringify({ entries: diskEntries() }, null, 2) + '\n'); }
    catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = 1; }
  } else {
    const port = args[0] === '--port' && args.length === 2 ? Number(args[1]) : args.length ? NaN : 5173;
    if (!Number.isInteger(port) || port < 1 || port > 65535) { process.stderr.write('Usage: node scripts/run.mjs [--port N | --export-leaderboard out.json]\n'); process.exitCode = 2; }
    else if (!existsSync('dist/index.html')) { process.stderr.write('Run npm run build first.\n'); process.exitCode = 1; }
    else { const server = makeServer(); server.on('error', e => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; }); server.listen(port, '127.0.0.1', () => process.stdout.write(`Đảo Đèn Lồng: http://127.0.0.1:${port}\n`)); }
  }
}
