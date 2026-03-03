import { useRef, useCallback } from "react";

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  /** 単音再生 (delay で開始タイミングをずらせる) */
  const playTone = useCallback(
    (
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      gainVal = 0.3,
      delay = 0,
    ) => {
      try {
        const ctx = getAudioCtx();
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(gainVal, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.start(t);
        osc.stop(t + duration);
      } catch {
        /* audio unavailable */
      }
    },
    [getAudioCtx],
  );

  /** 周波数スイープ (start→end) */
  const playSweep = useCallback(
    (
      startFreq: number,
      endFreq: number,
      duration: number,
      type: OscillatorType = "sine",
      gainVal = 0.3,
      delay = 0,
    ) => {
      try {
        const ctx = getAudioCtx();
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(endFreq, 1),
          t + duration,
        );
        g.gain.setValueAtTime(gainVal, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.start(t);
        osc.stop(t + duration);
      } catch {
        /* audio unavailable */
      }
    },
    [getAudioCtx],
  );

  /** アルペジオ再生 (周波数配列を等間隔で鳴らす) */
  const playArpeggio = useCallback(
    (
      freqs: number[],
      noteDur: number,
      type: OscillatorType = "sine",
      gainVal = 0.25,
      interval = 0.1,
    ) => {
      freqs.forEach((f, i) => {
        playTone(f, noteDur, type, gainVal, i * interval);
      });
    },
    [playTone],
  );

  /** ノイズ再生 (爆発音など) */
  const playNoise = useCallback(
    (duration: number, gainVal = 0.4, filterFreq?: number) => {
      try {
        const ctx = getAudioCtx();
        const sr = ctx.sampleRate;
        const len = sr * duration;
        const buf = ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        if (filterFreq !== undefined) {
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = filterFreq;
          src.connect(filter);
          filter.connect(g);
        } else {
          src.connect(g);
        }
        g.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + duration);
      } catch {
        /* audio unavailable */
      }
    },
    [getAudioCtx],
  );

  // ── プリセット ──

  /** ファンファーレ (C-E-G) */
  const playFanfare = useCallback(
    () => playArpeggio([523, 659, 784], 0.2, "triangle", 0.28, 0.13),
    [playArpeggio],
  );

  /** 大勝利 (C-E-G-C'-E') */
  const playCelebrate = useCallback(
    () => playArpeggio([523, 659, 784, 1047, 1319], 0.25, "sine", 0.25, 0.1),
    [playArpeggio],
  );

  /** ミス/ゲームオーバー */
  const playMiss = useCallback(
    () => playSweep(200, 80, 0.35, "sawtooth", 0.3),
    [playSweep],
  );

  /** タップ/クリック */
  const playClick = useCallback(
    () => playTone(880, 0.1, "sine", 0.2),
    [playTone],
  );

  return {
    playTone,
    playSweep,
    playArpeggio,
    playNoise,
    playFanfare,
    playCelebrate,
    playMiss,
    playClick,
    getAudioCtx,
  };
}
