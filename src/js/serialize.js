/* Reading and writing the whole machine as a pattern code. */

function dumpCode(){
  const o = {v:1, bpm:state.bpm, swing:+state.swing.toFixed(2), swingRes:state.swingRes, dlyTime:state.dlyTime, key:state.key, scale:state.scale,
             mode:state.mode, cur:state.cur, follow:state.follow,
             song:state.song.filter(Boolean).join(" "), pat:{}, trk:{}};
  for(const b of BANKS){
    const pat = state.patterns[b], row = {};
    for(const t of TRACKS){
      const s = trackToStr(t.type, pat[t.id]);
      if(t.type==="drum" ? /[xX]/.test(s) : /[A-G]/.test(s)) row[t.id] = s;
    }
    if(Object.keys(row).length) o.pat[b] = row;
  }
  for(const t of TRACKS){
    const p = state.tracks[t.id], d = DEF_PARAMS[t.id], row = {};
    for(const k of Object.keys(d)) if(p[k] !== d[k]) row[k] = p[k];
    if(p.mute) row.mute = true;
    if(Object.keys(row).length) o.trk[t.id] = row;
  }
  return JSON.stringify(o, null, 1);
}
const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
function loadCode(txt){
  const o = JSON.parse(txt);
  if(typeof o !== "object" || !o) throw new Error("not an object");
  if(typeof o.bpm === "number") state.bpm = clamp(Math.round(o.bpm), 60, 180);
  if(typeof o.swing === "number") state.swing = clamp(o.swing > 1 ? o.swing/100 : o.swing, 0.5, 0.75);
  if(o.swingRes === 8 || o.swingRes === 16) state.swingRes = o.swingRes;
  if([1,2,3,4,6,8].includes(o.dlyTime)) state.dlyTime = o.dlyTime;
  if(typeof o.master === "number") state.master = clamp(o.master > 1 ? o.master/100 : o.master, 0, 1);
  if(typeof o.key === "number") state.key = clamp(Math.round(o.key), 0, 11);
  if(typeof o.key === "string"){ const i = PC.indexOf(o.key); if(i >= 0) state.key = i; }
  if(typeof o.scale === "string" && SCALES[o.scale]) state.scale = o.scale;
  if(o.mode === "song" || o.mode === "pattern") state.mode = o.mode;
  if(typeof o.cur === "string" && state.patterns[o.cur]) state.cur = o.cur;
  if(typeof o.follow === "boolean") state.follow = o.follow;
  if(typeof o.sel === "string" && TBY[o.sel]) state.sel = o.sel;
  if(o.song){
    const list = (typeof o.song === "string" ? o.song.trim().split(/[\s,]+/) : o.song)
      .map(x => (x && state.patterns[x]) ? x : null);
    state.song = new Array(16).fill(null);
    for(let i=0;i<Math.min(16, list.length);i++) state.song[i] = list[i];
  }
  if(o.pat) for(const b of Object.keys(o.pat)){
    if(!state.patterns[b]) continue;
    const row = o.pat[b];
    if(row === null || row._clear) state.patterns[b] = emptyPattern();
    if(!row || typeof row !== "object") continue;
    for(const tid of Object.keys(row)){
      const t = TBY[tid]; if(!t) continue;
      const val = row[tid];
      if(typeof val === "string") state.patterns[b][tid] = strToTrack(t.type, val);
      else if(Array.isArray(val)) state.patterns[b][tid] = val.slice(0,16);
    }
  }
  if(o.trk) for(const tid of Object.keys(o.trk)){
    if(!state.tracks[tid]) continue;
    const row = o.trk[tid];
    for(const k of Object.keys(row)) if(k in state.tracks[tid] || k === "wave") state.tracks[tid][k] = row[k];
    applyTrackGains(tid);
  }
  if(ctx){ master.gain.value = state.master; setDelayTime(); }
}
/* ======================= persistence =======================
   Two layers. localStorage is the instant, per-browser safety net so a
   refresh never loses work. The db capability holds the autosave and the
   named save slots, so they survive across devices and sessions. */
