/* Placing, cycling and clearing steps and notes, and the one-step undo. */

function snapshot(){ try{ undoSnap = dumpCode(); }catch(e){ undoSnap = null; } }
function doUndo(){
  if(!undoSnap) return flash("Nothing to undo", "err");
  const code = undoSnap; undoSnap = null;
  try{
    state = freshState();
    loadCode(code);
    paintAll();
    document.getElementById("code").value = dumpCode();
    flash("Undone", "ok");
  }catch(e){ flash("Could not undo", "err"); }
}
function curPat(){ return state.patterns[state.cur]; }
function auditionNote(id, note, vel){
  initAudio();
  if(ctx.state==="suspended") ctx.resume();
  const h = voiceOn(id, note, ctx.currentTime + 0.01, vel || 0.85);
  if(h) h.release(ctx.currentTime + 0.01 + Math.max(0.25, sixteenth()*state.tracks[id].gate));
}
function toggleDrumStep(id, i){
  snapshot();
  const arr = curPat()[id];
  arr[i] = (arr[i] + 1) % 3;
  if(arr[i]){ initAudio(); if(ctx.state==="suspended") ctx.resume(); playDrum(id, ctx.currentTime+0.01, arr[i]===2?1:0.72); }
  paintSteps();
}
function toggleSynthStep(id, i){
  snapshot();
  const arr = curPat()[id];
  if(arr[i] && arr[i].length){ arr[i] = null; }
  else {
    const base = rootFor(id);
    arr[i] = [{n:base, v:0.85}];
    auditionNote(id, base);
  }
  paintSteps(); paintRoll();
}
function rollClick(id, i, note, additive){
  snapshot();
  const arr = curPat()[id];
  const cell = arr[i];
  if(cell && cell.some(x=>x.n===note)){
    if(additive){
      const nn = cell.find(x=>x.n===note);
      nn.v = nn.v >= 0.98 ? 0.85 : 1.0;
      auditionNote(id, note, nn.v);
    } else {
      const rest = cell.filter(x=>x.n!==note);
      arr[i] = rest.length ? rest : null;
    }
  } else if(additive && cell && cell.length){
    cell.push({n:note, v:0.85});
    auditionNote(id, note);
  } else {
    arr[i] = [{n:note, v:0.85}];
    auditionNote(id, note);
  }
  paintSteps(); paintRoll();
}

/* ======================= render ======================= */
