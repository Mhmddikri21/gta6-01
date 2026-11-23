// OPAL COAST — sound.
// One job: every sound is synthesized with WebAudio (no audio files, no
// network): engine hum, sirens, shots, blips and three looping radio
// stations. Muted until the player interacts.

function createAudio() {
  const audio = {
    ctx: null, master: null, muted: false, radioIndex: 0,
    radioTimer: null, engineOsc: null, engineGain: null, sirenOsc: null,
  };
  audio.ensure = function () {
    if (audio.ctx) return;
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
    } catch (e) { audio.ctx = null; }
  };
  audio.blip = function (freq) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq || 660;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(audio.master);
    o.start(t);
    o.stop(t + 0.2);
  };
  audio.pickup = function () {
    // Two-note ascending chime for picking up an opal shard.
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    [880, 1318].forEach(function (freq, i) {
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      const start = t + i * 0.09;
      g.gain.setValueAtTime(0.14, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      o.connect(g);
      g.connect(audio.master);
      o.start(start);
      o.stop(start + 0.24);
    });
  };
  audio.shot = function () {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(audio.master);
    o.start(t);
    o.stop(t + 0.15);
  };
  audio.crash = function () {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g);
    g.connect(audio.master);
    o.start(t);
    o.stop(t + 0.36);
  };
  audio.siren = function (on) {
    if (!audio.ctx) return;
    if (on && !audio.sirenOsc) {
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 700;
      g.gain.value = 0.03;
      const lfo = audio.ctx.createOscillator(), lg = audio.ctx.createGain();
      lfo.frequency.value = 0.9;
      lg.gain.value = 260;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(g);
      g.connect(audio.master);
      o.start();
      lfo.start();
      audio.sirenOsc = { o, lfo, g };
    } else if (!on && audio.sirenOsc) {
      try { audio.sirenOsc.o.stop(); audio.sirenOsc.lfo.stop(); } catch (e) {}
      audio.sirenOsc = null;
    }
  };
  audio.engine = function (speed01) {
    if (!audio.ctx) return;
    if (!audio.engineOsc) {
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 60;
      g.gain.value = 0.0;
      o.connect(g);
      g.connect(audio.master);
      o.start();
      audio.engineOsc = o;
      audio.engineGain = g;
    }
    audio.engineOsc.frequency.value = 55 + speed01 * 130;
    audio.engineGain.gain.value = 0.02 + speed01 * 0.05;
  };
  // Radio: a tiny step sequencer — bass + lead notes from the station scale.
  audio.startRadio = function (index) {
    audio.radioIndex = index;
    audio.stopRadio();
    if (!audio.ctx || audio.muted) return;
    const st = RADIO[index % RADIO.length];
    const scale = st.mode === 'major' ? [1, 1.125, 1.25, 1.5, 1.667] : [1, 1.189, 1.335, 1.498, 1.782];
    let step = 0;
    const stepMs = 60000 / st.bpm / 2;
    audio.radioTimer = setInterval(function () {
      if (audio.muted || !audio.ctx) return;
      const t = audio.ctx.currentTime;
      const note = st.root * scale[step % scale.length] * (step % 8 === 0 ? 2 : 1);
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = step % 4 === 0 ? 'triangle' : 'sine';
      o.frequency.value = note;
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepMs / 900);
      o.connect(g);
      g.connect(audio.master);
      o.start(t);
      o.stop(t + stepMs / 800);
      if (step % 2 === 0) {
        const b = audio.ctx.createOscillator(), bg = audio.ctx.createGain();
        b.type = 'sine';
        b.frequency.value = st.root / 2;
        bg.gain.setValueAtTime(0.09, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + stepMs / 700);
        b.connect(bg);
        bg.connect(audio.master);
        b.start(t);
        b.stop(t + stepMs / 600);
      }
      step += 1;
    }, stepMs);
  };
  audio.stopRadio = function () {
    if (audio.radioTimer) { clearInterval(audio.radioTimer); audio.radioTimer = null; }
  };
  audio.toggleMute = function () {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
    if (audio.muted) audio.stopRadio();
    return audio.muted;
  };
  return audio;
}
