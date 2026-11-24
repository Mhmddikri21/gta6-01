// OPAL COAST — all sound is synthesized with WebAudio. No audio files.
// The context is created lazily on the first user gesture (start click).

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenTimer = null;
    this.sirenOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.engineGain) this.engineGain.gain.value = 0;
    return this.muted;
  }

  // speedNorm 0..1 while driving; 0 silences the engine.
  engine(speedNorm) {
    if (!this.ctx || this.muted || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0.02 + speedNorm * 0.05, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 130, t, 0.1);
  }

  tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) {
      /* audio is cosmetic */
    }
  }

  // Near-miss blip.
  blip() {
    this.tone(1180, 0.09, 'square', 0.06);
  }

  // Opal pickup: two ascending notes.
  chime() {
    this.tone(660, 0.16, 'sine', 0.14);
    this.tone(990, 0.28, 'sine', 0.14, 0.11);
  }

  crash() {
    this.tone(90, 0.25, 'sawtooth', 0.2);
    this.tone(55, 0.3, 'square', 0.12, 0.02);
  }

  alarm() {
    this.tone(520, 0.18, 'square', 0.08);
    this.tone(520, 0.18, 'square', 0.08, 0.22);
  }

  siren(on) {
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    if (!this.ctx) return;
    if (on) {
      let hi = false;
      this.sirenTimer = window.setInterval(() => {
        if (this.muted) return;
        hi = !hi;
        this.tone(hi ? 880 : 660, 0.32, 'triangle', 0.045);
      }, 340);
    } else if (this.sirenTimer !== null) {
      window.clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
  }
}
