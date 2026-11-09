import { TRACKS, BANKS, DEF_PARAMS } from "./config.js";

/* Empty patterns, a fresh machine, and the song the page opens on. */

export function emptyPattern(){
  const p = {};
  for (const t of TRACKS) p[t.id] = t.type==="drum" ? new Array(16).fill(0) : new Array(16).fill(null);
  return p;
}
export function freshState(){
  const s = {
    bpm:112, swing:0.58, swingRes:8, dlyTime:3, master:0.8, key:0, scale:"Natural minor",
    cur:"A", mode:"song", sel:"kick", follow:true,
    song:new Array(16).fill(null),
    patterns:{}, tracks:{}
  };
  for (const b of BANKS) s.patterns[b] = emptyPattern();
  for (const t of TRACKS) s.tracks[t.id] = Object.assign({mute:false}, DEF_PARAMS[t.id]);
  return s;
}
/* DEFAULT_SONG is generated into the bundle from songs/default.json, which is
   the single source for the song the page opens on. See build.py. */

/* ======================= notes ======================= */
/* The key's root note sitting in this voice's own register. */

/* ======================= audio ======================= */

/**
 * Semitones to move to get from one key to another, by the shortest route.
 * C to B is -1, not +11, so a key change does not jump the music an octave.
 */
export function semitonesBetweenKeys(fromKey, toKey){
  let d = (toKey - fromKey) % 12;
  if(d > 6) d -= 12;
  if(d < -6) d += 12;
  return d;
}

/**
 * Every pitched note in every pattern, moved by `semitones`. Drum rows are
 * copied untouched. Returns a new set of patterns; throws RangeError rather
 * than silently clamping if a note would leave the MIDI range, so a key change
 * either applies in full or not at all.
 */
export function transposePatterns(patterns, semitones){
  const pitched = new Set(TRACKS.filter(t => t.type === "synth").map(t => t.id));
  const out = {};
  for(const bank of Object.keys(patterns)){
    const rows = patterns[bank], copy = {};
    for(const id of Object.keys(rows)){
      const row = rows[id];
      if(!pitched.has(id) || !semitones){ copy[id] = row.slice(); continue; }
      copy[id] = row.map(cell => cell && cell.map(note => {
        const moved = note.n + semitones;
        if(moved < 0 || moved > 127)
          throw new RangeError(`${note.n} would leave the MIDI range`);
        return Object.assign({}, note, {n: moved});
      }));
    }
    out[bank] = copy;
  }
  return out;
}
