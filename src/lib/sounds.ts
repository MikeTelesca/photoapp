"use client";

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new Ctx();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("sound-effects") !== "on") return;

  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playApproveSound() {
  // Cheerful ascending major chord
  playTone(523.25, 0.15); // C5
  setTimeout(() => playTone(659.25, 0.15), 50); // E5
  setTimeout(() => playTone(783.99, 0.2), 100); // G5
}

export function playRejectSound() {
  // Soft descending tone
  playTone(440, 0.1, "triangle"); // A4
  setTimeout(() => playTone(330, 0.15, "triangle"), 80); // E4
}

export function playFavoriteSound() {
  // Quick high ping
  playTone(880, 0.08, "sine");
  setTimeout(() => playTone(1318.51, 0.1, "sine"), 40);
}
