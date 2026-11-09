/* The piano roll, for the three pitched voices. Its row range covers the
   voice's own register plus any note already written outside it. */

function rollRange(id){
  const p = state.tracks[id];
  const c = (TBY[id].center || 60) + p.oct*12;
  let lo = c - 12, hi = c + 12;
  for(const b of BANKS) for(const cell of state.patterns[b][id]) if(cell) for(const n of cell){
    lo = Math.min(lo, n.n); hi = Math.max(hi, n.n);
  }
  return [lo, hi];
}
/* Which roll is on screen, so a repaint can tell itself from a rebuild. */
let rollShowing = null;

function buildRoll(){
  const t = TBY[state.sel];
  const wrap = document.getElementById("rollwrap"), host = document.getElementById("roll");
  if(t.type !== "synth"){ wrap.hidden = true; host.innerHTML = ""; return; }
  wrap.hidden = false;
  host.style.setProperty("--hue", t.hue);
  const [lo, hi] = rollRange(t.id);
  /* Rebuilding wipes the scroll position. Keep it when the same roll is simply
     being repainted, which is what happens on every edit, and only recentre when
     the roll is genuinely a different one. */
  const same = rollShowing && rollShowing.id === t.id
            && rollShowing.lo === lo && rollShowing.hi === hi;
  const keepAt = same ? wrap.scrollTop : null;
  rollShowing = {id: t.id, lo: lo, hi: hi};
  host.innerHTML = "";
  for(let m = hi; m >= lo; m--){
    const k = document.createElement("button");
    k.className = "keylbl" + (inScale(m) ? " inscale" : "") + (isRoot(m) ? " root" : "");
    k.textContent = midiToName(m);
    k.addEventListener("click", ()=>auditionNote(t.id, m));
    host.appendChild(k);
    for(let i=0;i<16;i++){
      const c = document.createElement("button");
      c.className = "cell" + (inScale(m) ? " inscale" : "") + (i%4===0 ? " beat" : "");
      c.dataset.col = i; c.dataset.note = m;
      c.setAttribute("aria-label", midiToName(m)+" step "+(i+1));
      c.addEventListener("click", ev=>{ rollClick(t.id, i, m, ev.shiftKey); });
      host.appendChild(c);
    }
  }
  /* Never scrollIntoView here: it scrolls the page as well as the roll's own
     box, which yanks you half a screen away every time you clear or paste.
     Setting scrollTop moves only the container. */
  if(keepAt !== null){
    wrap.scrollTop = keepAt;
    return;
  }
  /* Centre the root nearest this voice's own register, not whichever root
     happens to be highest. Rows run from hi down to lo, so the index is the
     distance from the top. */
  const home = rootNear((TBY[t.id].center || 60) + state.tracks[t.id].oct * 12, state.key);
  const rows = host.querySelectorAll(".keylbl");
  const row = rows[hi - home];
  if(!row) return;
  try{
    const box = wrap.getBoundingClientRect(), target = row.getBoundingClientRect();
    wrap.scrollTop += (target.top - box.top) - (box.height - target.height) / 2;
  }catch(e){}
}
function paintRoll(){
  const t = TBY[state.sel];
  if(t.type !== "synth") return;
  const pat = curPat()[t.id];
  document.querySelectorAll("#roll .cell").forEach(c=>{
    const i = +c.dataset.col, m = +c.dataset.note, cell = pat[i];
    const hit = cell && cell.find(x=>x.n===m);
    c.classList.toggle("on", !!hit);
    c.classList.toggle("acc", !!(hit && hit.v>=0.98));
  });
}
