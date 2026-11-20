export const defaultBindings = Object.freeze({ forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyQ', pause: 'Escape' });
export const defaults = () => ({ volume: .35, sensitivity: 1, colorblind: false, reduceMotion: false, largeText: false, bindings: { ...defaultBindings } });
export function loadSettings() {
  const result = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem('dao-den-long.settings') || 'null');
    if (saved && typeof saved === 'object') {
      if (Number.isFinite(saved.volume)) result.volume = Math.max(0, Math.min(1, saved.volume));
      if (Number.isFinite(saved.sensitivity)) result.sensitivity = Math.max(.2, Math.min(3, saved.sensitivity));
      for (const key of ['colorblind', 'reduceMotion', 'largeText']) if (typeof saved[key] === 'boolean') result[key] = saved[key];
      if (saved.bindings && Object.keys(defaultBindings).every(k => typeof saved.bindings[k] === 'string') && new Set(Object.values(saved.bindings)).size === 9) result.bindings = { ...saved.bindings };
    }
  } catch { /* Corrupt/blocked storage uses defaults and never prevents playing. */ }
  return result;
}
export function saveSettings(settings) {
  try { localStorage.setItem('dao-den-long.settings', JSON.stringify(settings)); return true; } catch { return false; }
}
