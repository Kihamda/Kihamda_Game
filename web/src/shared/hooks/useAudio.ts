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

  // ── プリセット (基本) ──

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

  // ── プリセット (追加: ドーパミン演出用) ──

  /** 成功音 (軽快なピコン) */
  const playSuccess = useCallback(() => {
    playTone(880, 0.08, "sine", 0.2);
    playTone(1320, 0.12, "sine", 0.25, 0.06);
  }, [playTone]);

  /** コンボ音 (コンボ数に応じて音程上昇, 1-10) */
  const playCombo = useCallback(
    (comboCount: number) => {
      const baseFreq = 440;
      const semitones = Math.min(comboCount - 1, 12);
      const freq = baseFreq * Math.pow(2, semitones / 12);
      playTone(freq, 0.1, "square", 0.15);
      playTone(freq * 1.5, 0.15, "sine", 0.2, 0.05);
    },
    [playTone],
  );

  /** レベルアップ音 (華やかなアルペジオ) */
  const playLevelUp = useCallback(() => {
    playArpeggio([523, 659, 784, 1047], 0.15, "sine", 0.2, 0.08);
    playArpeggio([659, 784, 1047, 1319], 0.2, "triangle", 0.18, 0.08);
  }, [playArpeggio]);

  /** ゲームオーバー音 (重厚な下降音) */
  const playGameOver = useCallback(() => {
    playSweep(400, 100, 0.5, "sawtooth", 0.25);
    playNoise(0.3, 0.15, 500);
    playTone(110, 0.8, "sine", 0.2, 0.3);
  }, [playSweep, playNoise, playTone]);

  /** 爆発音 (ノイズ + 低音) */
  const playExplosion = useCallback(() => {
    playNoise(0.25, 0.5, 800);
    playTone(80, 0.3, "sine", 0.35);
    playSweep(200, 50, 0.2, "sawtooth", 0.2);
  }, [playNoise, playTone, playSweep]);

  /** ボーナス獲得音 */
  const playBonus = useCallback(() => {
    playTone(660, 0.1, "sine", 0.2);
    playTone(880, 0.1, "sine", 0.22, 0.08);
    playTone(1100, 0.15, "triangle", 0.25, 0.16);
    playTone(1320, 0.2, "sine", 0.2, 0.24);
  }, [playTone]);

  /** 警告音 (緊張感のある音) */
  const playWarning = useCallback(() => {
    playTone(440, 0.15, "square", 0.2);
    playTone(440, 0.15, "square", 0.2, 0.2);
    playTone(440, 0.15, "square", 0.2, 0.4);
  }, [playTone]);

  /** カウントダウン音 */
  const playCountdown = useCallback(
    (remaining: number) => {
      if (remaining === 0) {
        // Go!
        playArpeggio([523, 659, 784], 0.15, "sine", 0.3, 0.05);
      } else {
        // 3, 2, 1
        playTone(660, 0.15, "sine", 0.25);
      }
    },
    [playTone, playArpeggio],
  );

  /** パーフェクト音 (最高評価) */
  const playPerfect = useCallback(() => {
    playArpeggio([784, 988, 1175, 1568], 0.12, "sine", 0.22, 0.06);
    playTone(1568, 0.3, "triangle", 0.18, 0.3);
  }, [playArpeggio, playTone]);

  return {
    // 基本
    playTone,
    playSweep,
    playArpeggio,
    playNoise,
    getAudioCtx,
    // プリセット (基本)
    playFanfare,
    playCelebrate,
    playMiss,
    playClick,
    // プリセット (追加)
    playSuccess,
    playCombo,
    playLevelUp,
    playGameOver,
    playExplosion,
    playBonus,
    playWarning,
    playCountdown,
    playPerfect,
  };
}
