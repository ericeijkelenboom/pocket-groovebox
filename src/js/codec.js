/* The pattern-code format. A drum row is 16 characters: "." rest, "x" hit,
   "X" accent. A synth row is 16 whitespace-separated tokens: a note name,
   "-" rest, "+" to stack notes into a chord, "!" for an accent. */

import { midiToName, nameToMidi } from "./notes.js";

export function trackToStr(type, arr){
  if(type === "drum") return arr.map(v => v===2 ? "X" : v===1 ? "x" : ".").join("");
  return arr.map(c => (!c || !c.length) ? "-" :
    c.slice().sort((a,b)=>a.n-b.n).map(n => midiToName(n.n) + (n.v>=0.98 ? "!" : "")).join("+")).join(" ");
}
export function strToTrack(type, s){
  if(type === "drum"){
    const chars = String(s).replace(/[^.xX_\-]/g, "").split("");
    const out = new Array(16).fill(0);
    for(let i=0;i<16;i++){ const c = chars[i]; out[i] = c==="X" ? 2 : c==="x" ? 1 : 0; }
    return out;
  }
  const toks = String(s).trim().split(/\s+/);
  const out = new Array(16).fill(null);
  for(let i=0;i<16;i++){
    const t = toks[i];
    if(!t || t==="-" || t===".") continue;
    const notes = t.split("+").map(x=>{
      const acc = x.endsWith("!");
      const m = nameToMidi(acc ? x.slice(0,-1) : x);
      return m==null ? null : {n:m, v:acc ? 1.0 : 0.85};
    }).filter(Boolean);
    out[i] = notes.length ? notes : null;
  }
  return out;
}
