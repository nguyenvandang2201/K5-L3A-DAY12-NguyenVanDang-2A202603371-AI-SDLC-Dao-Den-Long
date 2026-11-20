import { rankEntries } from '../core/leaderboard.mjs';
const KEY = 'dao-den-long.leaderboard';
export async function readLeaderboard() {
  try { const r = await fetch('/api/leaderboard'); if (r.ok && r.headers.get('content-type')?.includes('application/json')) return rankEntries((await r.json()).entries); } catch { /* Static release uses localStorage. */ }
  try { return rankEntries(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return []; }
}
export async function addLeaderboard(entry) {
  const entries = rankEntries([...(await readLeaderboard()), entry]);
  let saved = false;
  try { localStorage.setItem(KEY, JSON.stringify(entries)); saved = true; } catch { /* Try disk bridge. */ }
  try { const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }); if (r.ok) saved = true; } catch { /* Offline/static fallback. */ }
  if (!saved) throw new Error('Trình duyệt chặn lưu cục bộ. Hãy cho phép lưu trữ hoặc chạy qua npm start.');
  return entries;
}
