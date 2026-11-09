/* The clock. Steps are scheduled ahead of time against the audio clock, and
   the playhead is driven from a queue so the display follows what is audible
   rather than what has merely been queued. */

let playing=false, stepIdx=0, nextTime=0, slotIdx=0, playPat="E", timer=null;
const uiQueue = [];

function filledSlots(){ return state.song.map((p,i)=>p?i:-1).filter(i=>i>=0); }
function resolvePattern(){
  if(state.mode==="song"){
    const fs = filledSlots();
    if(!fs.length) return state.cur;
    return state.song[slotIdx] || state.cur;
  }
  return state.cur;
}
function startTransport(){
  initAudio();
  if(ctx.state==="suspended") ctx.resume();
  if(playing) return;
  playing = true;
  stepIdx = 0;
  const fs = filledSlots();
  slotIdx = state.mode==="song" && fs.length ? fs[0] : 0;
  playPat = resolvePattern();
  nextTime = ctx.currentTime + 0.08;
  timer = setInterval(scheduler, 25);
  scheduler();
  keepAwake(true);
  document.getElementById("play").classList.add("on");
}
function stopTransport(){
  playing = false;
  if(timer) clearInterval(timer);
  timer = null;
  openHat = null;
  keepAwake(false);
  uiQueue.length = 0;
  document.getElementById("play").classList.remove("on");
  document.querySelectorAll(".st.cue,.cell.cue,.rk.cue").forEach(e=>e.classList.remove("cue"));
  setPos(null);
}
function scheduler(){
  while(nextTime < ctx.currentTime + 0.12){
    const swungBy = swingShift(stepIdx);
    scheduleStep(stepIdx, nextTime + swungBy, playPat);
    uiQueue.push({step:stepIdx, pat:playPat, at:nextTime + swungBy});
    nextTime += sixteenth();
    stepIdx = (stepIdx + 1) % 16;
    if(stepIdx === 0){
      if(state.mode === "song"){
        const fs = filledSlots();
        if(fs.length){
          const i = fs.indexOf(slotIdx);
          slotIdx = fs[(i + 1) % fs.length];
        }
      }
      playPat = resolvePattern();
    }
  }
}
function scheduleStep(i, t, patName){
  const pat = state.patterns[patName];
  if(!pat) return;
  for(const tr of TRACKS){
    const p = state.tracks[tr.id];
    if(p.mute) continue;
    if(tr.type === "drum"){
      const v = pat[tr.id][i];
      if(v) playDrum(tr.id, t, v===2 ? 1.0 : 0.72);
    } else {
      const cell = pat[tr.id][i];
      if(cell && cell.length){
        const gate = sixteenth() * p.gate;
        for(const n of cell){
          const h = voiceOn(tr.id, n.n, t, n.v);
          if(h) h.release(t + gate);
        }
        lastNote[tr.id] = cell[0].n;
      }
    }
  }
}
function drawLoop(){
  if(ctx){
    while(uiQueue.length && uiQueue[0].at <= ctx.currentTime + 0.005){
      const e = uiQueue.shift();
      highlight(e.step, e.pat);
    }
  }
  requestAnimationFrame(drawLoop);
}
function highlight(i, pat){
  /* Follow-play: bring the editor to whichever pattern is sounding, at the
     moment it starts sounding. Only when the song actually moved on, so this
     is not a repaint every sixteenth. */
  if(state.follow && state.mode === "song" && pat !== state.cur && state.patterns[pat]){
    state.cur = pat;
    paintSteps(); paintRoll();
  }
  document.querySelectorAll(".st.cue,.cell.cue,.rk.cue").forEach(e=>e.classList.remove("cue"));
  document.querySelectorAll('[data-col="'+i+'"]').forEach(e=>e.classList.add("cue"));
  setPos(pat, i);
  renderBanks();
  renderSong();
}
function setPos(pat, i){
  const el = document.getElementById("pos");
  if(!pat){ el.textContent = state.mode==="song" ? "song · —" : state.cur + " · —"; return; }
  const beat = Math.floor(i/4)+1, sub = (i%4)+1;
  el.textContent = pat + " · " + beat + "." + sub;
}

/* ======================= editing ======================= */
/* The whole machine, so Undo also covers voice settings and a loaded file. */
