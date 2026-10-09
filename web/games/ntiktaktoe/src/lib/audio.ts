let audioCtx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

export const playPlopSound = (): void => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.15);
  } catch {
    // ignore audio errors
  }
};

export const playVictorySound = (): void => {
  try {
    const c = getCtx();
    const freqs = [523.25, 659.25, 783.99]; // C5 E5 G5
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = "triangle";
      const t = c.currentTime + i * 0.2;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch {
    // ignore audio errors
  }
};

export const playDrawSound = (): void => {
  try {
    const c = getCtx();
    [330, 294].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = "square";
      const t = c.currentTime + i * 0.28;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch {
    // ignore audio errors
  }
};
