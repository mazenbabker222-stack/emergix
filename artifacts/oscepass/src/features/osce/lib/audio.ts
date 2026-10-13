/** Short audible cues for phase warnings. Failure-tolerant: storage and audio may be unavailable. */
const KEY = 'osce.sound';

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null;

/** Beep `count` times. Browsers only allow audio after a user gesture; errors are swallowed. */
export function beep(count = 1, frequency = 880): void {
  if (!soundEnabled()) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    const audio = ctx;
    for (let i = 0; i < count; i++) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = frequency;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(audio.destination);
      const start = audio.currentTime + i * 0.28;
      osc.start(start);
      osc.stop(start + 0.18);
    }
  } catch {
    /* ignore */
  }
}
