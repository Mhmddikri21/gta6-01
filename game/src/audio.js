// OPAL COAST — all sound is WebAudio synth, no audio files.
// A tiny synth: engine hum, near-miss blip, two-note opal chime, crash, hull alarm, siren.

import { S } from './state.js';

let ctx = null;
let engineOsc = null;
let engineGain = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function initAudio() {
  try {
    ac();
  } catch (e) {
    // No audio in headless runs; the game plays on silently.
  }
}

function tone(freq, dur, type = 'sine', vol = 0.15, when = 0) {
  if (S.muted || !ctx) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// The opal pickup: two ascending notes.
export function chime() {
  tone(660, 0.18, 'sine', 0.18);
  tone(990, 0.3, 'sine', 0.18, 0.12);
}

export function blip() {
  tone(1200, 0.08, 'square', 0.08);
}

export function crash() {
  tone(90, 0.25, 'sawtooth', 0.25);
  tone(55, 0.3, 'triangle', 0.2, 0.02);
}

export function alarm() {
  tone(520, 0.15, 'square', 0.12);
  tone(392, 0.15, 'square', 0.12, 0.16);
}

export function sirenTick() {
  tone(720, 0.12, 'sine', 0.05);
  tone(960, 0.12, 'sine', 0.05, 0.13);
}

// Engine hum follows speed; call every frame.
export function engine(speed, top) {
  if (S.muted || !ctx) return;
  if (!engineOsc) {
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain.gain.value = 0.03;
    engineOsc.connect(engineGain).connect(ctx.destination);
    engineOsc.start();
  }
  const ratio = Math.abs(speed) / top;
  engineOsc.frequency.value = 55 + ratio * 140;
  engineGain.gain.value = S.started && !S.paused ? 0.02 + ratio * 0.05 : 0.0;
}
