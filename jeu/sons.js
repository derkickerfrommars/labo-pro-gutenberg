/* Labo Pro : effets sonores synthétisés (aucun fichier audio). Coupables, préférence mémorisée. */
let ctx = null;
let actif = (() => { try { return localStorage.getItem('lp-son') !== '0'; } catch (e) { return true; } })();

function audio() {
  if (!actif) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function note(freq, debut, duree, { type = 'sine', volume = 0.12, glisse = null } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + debut;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, t + duree);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + duree + 0.02);
}

export const sons = {
  get actif() { return actif; },
  basculer() {
    actif = !actif;
    try { localStorage.setItem('lp-son', actif ? '1' : '0'); } catch (e) {}
    if (actif) this.clic();
    return actif;
  },
  clic() { note(660, 0, 0.06, { type: 'triangle', volume: 0.08 }); },
  pas() { note(220, 0, 0.05, { type: 'triangle', volume: 0.04 }); },
  carte() { note(420, 0, 0.08, { type: 'triangle', volume: 0.07, glisse: 700 }); },
  pose() { note(520, 0, 0.07, { type: 'square', volume: 0.04 }); note(780, 0.05, 0.08, { type: 'triangle', volume: 0.06 }); },
  juste() { [523, 659, 784].forEach((f, i) => note(f, i * 0.07, 0.18, { type: 'triangle', volume: 0.1 })); },
  pari() { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.06, 0.2, { type: 'square', volume: 0.06 })); },
  faux() { note(196, 0, 0.28, { type: 'sawtooth', volume: 0.07, glisse: 110 }); },
  coeur() { note(150, 0, 0.18, { type: 'square', volume: 0.06, glisse: 90 }); },
  piece() { note(988, 0, 0.07, { type: 'square', volume: 0.05 }); note(1319, 0.07, 0.16, { type: 'square', volume: 0.05 }); },
  combo(n) { note(440 * Math.pow(2, Math.min(n, 12) / 12), 0, 0.12, { type: 'triangle', volume: 0.08 }); },
  niveau() { [392, 523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.1, 0.3, { type: 'triangle', volume: 0.11 })); },
  victoire() { [523, 523, 523, 698, 880].forEach((f, i) => note(f, [0, 0.12, 0.24, 0.36, 0.6][i], i === 4 ? 0.5 : 0.1, { type: 'square', volume: 0.06 })); },
  defaite() { [392, 370, 349, 330].forEach((f, i) => note(f, i * 0.18, 0.25, { type: 'triangle', volume: 0.08 })); },
};

export function vibrer(motif) {
  try { if (actif && navigator.vibrate) navigator.vibrate(motif); } catch (e) {}
}
