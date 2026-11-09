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
function buildRoll(){
  const t = TBY[state.sel];
  const wrap = document.getElementById("rollwrap"), host = document.getElementById("roll");
  if(t.type !== "synth"){ wrap.hidden = true; host.innerHTML = ""; return; }
  wrap.hidden = false;
  host.style.setProperty("--hue", t.hue);
  host.innerHTML = "";
  const [lo, hi] = rollRange(t.id);
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
  const row = host.querySelector('.keylbl.root');
  if(row) setTimeout(()=>{ try{ row.scrollIntoView({block:"center"}); }catch(e){} }, 0);
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
