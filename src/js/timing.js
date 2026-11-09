/* Pure timing maths. Everything here takes the tempo and feel explicitly so it
   can be reasoned about, and tested, without a running machine. */

/** Length of one sixteenth note, in seconds. */
export const sixteenthSeconds = bpm => 60 / bpm / 4;

/**
 * How far a step is pushed late by swing, in seconds.
 * On the 1/8 grid every second eighth moves (steps 3, 7, 11, 15 of a bar);
 * on the 1/16 grid every second sixteenth does. A pattern written entirely in
 * eighth notes therefore does not swing on the 1/16 grid — all of its notes are
 * the first of their pair.
 * @param {number} step 1-based step within the bar
 */
export function swingShiftSeconds(step, swing, swingRes, bpm){
  if(swing <= 0.5) return 0;
  const s16 = sixteenthSeconds(bpm);
  if(swingRes === 8) return ((step - 1) % 4 === 2) ? (swing - 0.5) * 4 * s16 : 0;
  return ((step - 1) % 2 === 1) ? (swing - 0.5) * 2 * s16 : 0;
}

/** The same shift in whole milliseconds, for display. */
export function swingMilliseconds(swing, swingRes, bpm){
  const span = swingRes === 8 ? 4 : 2;
  return Math.round((swing - 0.5) * span * sixteenthSeconds(bpm) * 1000);
}
