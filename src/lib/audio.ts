// One shared AudioContext for the whole app. Mobile browsers only let a context play
// after it was created or resumed inside a user gesture, so call unlockAudio() from the
// tap that starts navigation — not later from an effect.

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = getAudioContext();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function playTones(tones: Array<{ freq: number; dur: number; t?: number }>) {
  const c = getAudioContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  tones.forEach(({ freq, dur, t = 0 }) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = c.currentTime + t;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.5, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  });
}

export const playApproach = () => playTones([{ freq: 880, dur: 0.28 }]);

// Hazard ahead: three quick, lower beeps that sound clearly different from a normal approach
export const playDanger = () =>
  playTones([
    { freq: 660, dur: 0.12 },
    { freq: 660, dur: 0.12, t: 0.18 },
    { freq: 660, dur: 0.12, t: 0.36 },
  ]);

export const playCrossed = () =>
  playTones([
    { freq: 1100, dur: 0.15 },
    { freq: 1100, dur: 0.15, t: 0.22 },
  ]);
