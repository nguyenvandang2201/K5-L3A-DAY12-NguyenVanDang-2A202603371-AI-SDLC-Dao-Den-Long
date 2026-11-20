export function validEntry(e) {
  return !!e && typeof e === 'object' && typeof e.name === 'string' && /^[A-Za-z0-9_]{3,12}$/.test(e.name) &&
    Number.isSafeInteger(e.score) && e.score >= 0 && Number.isInteger(e.nights_won) && e.nights_won >= 0 && e.nights_won <= 3 &&
    typeof e.achieved_at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(e.achieved_at) && Number.isFinite(Date.parse(e.achieved_at)) && Number.isSafeInteger(e.seed);
}
export function rankEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(validEntry).map(e => ({ name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed }))
    .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, 10);
}
