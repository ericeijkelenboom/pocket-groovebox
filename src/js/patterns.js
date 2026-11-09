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
