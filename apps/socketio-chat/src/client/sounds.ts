// Notification sounds using Web Audio API — no external files needed.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// Short "pop" for incoming private messages
export function playMessageSound() {
  playTone(880, 0.12, "sine", 0.12);
  setTimeout(() => playTone(1100, 0.1, "sine", 0.08), 80);
}

// Gentle chime for notifications (join/leave/system)
export function playNotificationSound() {
  playTone(660, 0.15, "triangle", 0.1);
}

// Lower tone for group messages
export function playGroupMessageSound() {
  playTone(520, 0.1, "sine", 0.08);
}
