// OPAL COAST — tiny WebAudio synth: engine hum, blips, pickup chime.
// No audio files: every sound is synthesized at runtime.
// Written fresh, from scratch, in the recorded session (fourth rewrite).
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenTimer = 0;
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
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 52;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (err) {
      this.ctx = null;
    }
  }

  setEngine(speedNorm, muted) {
    if (!this.ctx || !this.engineOsc) return;
    const target = muted ? 0 : 0.025 + speedNorm * 0.05;
    this.engineGain.gain.value = target;
    this.engineOsc.frequency.value = 50 + speedNorm * 150;
  }

  tone(freq, dur, type, delay, vol) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  blip(freq) {
    this.tone(freq || 880, 0.09, 'square', 0, 0.16);
  }

  thud() {
    this.tone(90, 0.18, 'triangle', 0, 0.4);
  }

  // Two-note ascending synth chime for opal shard pickups.
  chime() {
    this.tone(659.25, 0.16, 'sine', 0, 0.32);
    this.tone(987.77, 0.3, 'sine', 0.13, 0.32);
  }

  sirenTick(dt, wanted) {
    if (!this.ctx || wanted <= 0) return;
    this.sirenTimer += dt;
    if (this.sirenTimer > 0.9) {
      this.sirenTimer = 0;
      this.tone(660, 0.22, 'sine', 0, 0.07);
      this.tone(520, 0.22, 'sine', 0.24, 0.07);
    }
  }
}
