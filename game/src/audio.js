// OPAL COAST — synthesized sound, no audio files.
// Everything is WebAudio oscillators and filtered noise, built lazily on
// the first user gesture so headless runs (self-test, screenshots) stay
// silent and never throw.

let ctx = null;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;

export const AudioSys = {
  // Call from the first click / keypress. Safe to call repeatedly.
  ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  },

  // A short sine blip, used for near-misses and UI ticks.
  blip(freq = 880, dur = 0.09, vol = 0.12) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  // The opal shard pickup: two ascending notes, E5 then A5.
  chime() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [659.25, 880.0].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t + i * 0.12);
      g.gain.setValueAtTime(0.0001, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.55);
    });
  },

  // A dull thud for collisions, made from filtered noise.
  crash(strength = 1) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  },

  // A rising alarm for the hull-critical warning.
  alarm() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(freq, t + i * 0.14);
      g.gain.setValueAtTime(0.06, t + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.14);
      o.stop(t + i * 0.14 + 0.18);
    });
  },

  // Engine hum: a sawtooth whose pitch follows speed. Call every frame.
  engine(speed, topSpeed) {
    if (!ctx) return;
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      engineOsc.connect(f).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
    }
    const ratio = Math.min(1, Math.abs(speed) / topSpeed);
    engineOsc.frequency.setTargetAtTime(55 + ratio * 165, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.02 + ratio * 0.045, ctx.currentTime, 0.1);
  },

  // Two-tone police siren while any interceptor is active.
  siren(on) {
    if (!ctx) return;
    if (on && !sirenTimer) {
      let high = false;
      sirenTimer = window.setInterval(() => {
        high = !high;
        this.blip(high ? 960 : 720, 0.28, 0.045);
      }, 300);
    } else if (!on && sirenTimer) {
      window.clearInterval(sirenTimer);
      sirenTimer = null;
    }
  },

  // Stop all continuous sound (engine + siren) when paused.
  quiet() {
    if (engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    this.siren(false);
  },
};
