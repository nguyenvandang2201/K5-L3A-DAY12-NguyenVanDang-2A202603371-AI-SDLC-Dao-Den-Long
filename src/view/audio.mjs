// Original procedural audio: no downloaded recordings or network requests.
export class GameAudio {
  constructor() { this.volume = .35; this.context = null; this.lastNote = 0; }
  unlock() { this.context ??= new (window.AudioContext || window.webkitAudioContext)(); this.context.resume(); }
  tone(frequency, duration = .12, shape = 'sine', gain = .1, delay = 0) {
    const c = this.context; if (!c || this.volume <= 0 || c.state !== 'running') return;
    const oscillator = c.createOscillator(), envelope = c.createGain(), t = c.currentTime + delay;
    oscillator.type = shape; oscillator.frequency.setValueAtTime(frequency, t); envelope.gain.setValueAtTime(.0001, t);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, this.volume * gain), t + .015);
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(envelope); envelope.connect(c.destination); oscillator.start(t); oscillator.stop(t + duration + .01);
  }
  event(name) {
    const notes = { mote_picked: [880, .12], lantern_lit: [523, .5], pulse: [196, .3], player_hit: [110, .25], jump: [330, .14], dash: [660, .15], won: [784, .7], lost: [147, .7], shade_spawned: [82, .5], countdown: [440, .09], charm_picked: [1046, .3], wind: [220, .6] };
    const n = notes[name]; if (n) { this.tone(...n); if (['lantern_lit', 'won'].includes(name)) this.tone(n[0] * 1.5, .6, 'sine', .08, .12); }
  }
  music(seconds, enabled) {
    const beat = Math.floor(seconds / 2.5);
    if (enabled && beat !== this.lastNote) { this.lastNote = beat; const f = [130.81, 164.81, 196, 146.83, 174.61, 196][beat % 6]; this.tone(f, 2, 'sine', .04); this.tone(f * 2, 1.7, 'sine', .015); }
  }
}
