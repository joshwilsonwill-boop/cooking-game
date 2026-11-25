// All sound is synthesized with the Web Audio API: short oscillator blips
// and a filtered noise burst for the grill. No audio files, no network.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0) {
  if (muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, freq) {
  if (muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

export const sfx = {
  pickup() { tone(660, 0.09, 'sine', 0.12); },
  place() { tone(440, 0.08, 'triangle', 0.12); },
  chop() { noiseBurst(0.07, 0.25, 1800); tone(180, 0.06, 'square', 0.08); },
  chopped() { tone(520, 0.08, 'sine', 0.12); tone(780, 0.1, 'sine', 0.1, 0.07); },
  sizzle() { noiseBurst(0.25, 0.12, 4200); },
  grilled() { tone(700, 0.1, 'sine', 0.12); tone(1050, 0.12, 'sine', 0.1, 0.08); },
  serve() { tone(880, 0.12, 'sine', 0.14); tone(1174, 0.16, 'sine', 0.14, 0.1); tone(1568, 0.2, 'sine', 0.1, 0.2); },
  reject() { tone(160, 0.18, 'sawtooth', 0.1); },
  expire() { tone(320, 0.25, 'sawtooth', 0.1); tone(220, 0.3, 'sawtooth', 0.1, 0.15); },
  tick() { tone(980, 0.05, 'square', 0.06); },
  bell() { tone(1244, 0.3, 'sine', 0.14); tone(1866, 0.35, 'sine', 0.08, 0.02); },
  start() { tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.1); tone(784, 0.2, 'sine', 0.12, 0.2); },
};
