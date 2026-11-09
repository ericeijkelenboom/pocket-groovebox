import { PC, SCALES } from "./config.js";

/* Pitch maths. Nothing here reads the live machine: key and scale are passed
   in, so each function is a plain mapping that can be tested on its own. */

/** MIDI note number to frequency in hertz (A4 = 69 = 440 Hz). */
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/** 60 -> "C4". Flats throughout, which is how minor keys are usually written. */
export function midiToName(m){
  return PC[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

/** "Eb3" | "D#3" | "c2" -> MIDI number, or null if it is not a note name. */
export function nameToMidi(s){
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(s).trim());
  if(!m) return null;
  const base = {c:0, d:2, e:4, f:5, g:7, a:9, b:11}[m[1].toLowerCase()];
  const acc  = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const n = 12 * (parseInt(m[3], 10) + 1) + base + acc;
  return (n >= 0 && n <= 127) ? n : null;
}

/** Semitones above the key's root, 0-11. */
export function degree(midi, key){
  return (((midi - key) % 12) + 12) % 12;
}

/** Is this note one of the scale's seven (or five, or twelve)? */
export function isInScale(midi, key, scaleName){
  const intervals = SCALES[scaleName];
  return intervals ? intervals.includes(degree(midi, key)) : true;
}

/** Is this note the key's root, in any octave? */
export function isKeyRoot(midi, key){
  return degree(midi, key) === 0;
}

/** The key's root note sitting at or just below a voice's own register. */
export function rootNear(center, key){
  return center - degree(center, key);
}
