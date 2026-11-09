/* The step grid. buildSeq creates the rows once; paintSteps only moves
   classes around on DOM that already exists, because it runs on every edit
   and on every pattern change while the song plays. */

function buildSeq(){
  const host = document.getElementById("seq");
  host.innerHTML = "";
  const ruler = document.createElement("div");
  ruler.className = "trow ruler";
  ruler.innerHTML = '<div></div>';
  const rs = document.createElement("div"); rs.className = "steps";
  for(let i=0;i<16;i++){
    const d = document.createElement("div");
    d.className = "rk" + (i%4===0 ? " beat" : "");
    d.dataset.col = i;
    d.textContent = i%4===0 ? String(i/4+1) : "·";
    rs.appendChild(d);
  }
  ruler.appendChild(rs); host.appendChild(ruler);

  for(const t of TRACKS){
    const row = document.createElement("div");
    row.className = "trow"; row.dataset.track = t.id; row.style.setProperty("--hue", t.hue);
    const info = document.createElement("div"); info.className = "tinfo";
    const nm = document.createElement("button"); nm.className = "tname"; nm.textContent = t.name;
    nm.addEventListener("click", ()=>{ state.sel = t.id; paintAll(); });
    const mu = document.createElement("button"); mu.className = "mute"; mu.textContent = "M";
    mu.setAttribute("aria-label","Mute "+t.name);
    mu.addEventListener("click", ()=>{ state.tracks[t.id].mute = !state.tracks[t.id].mute; applyTrackGains(t.id); paintSteps(); });
    info.append(nm, mu);
    const steps = document.createElement("div"); steps.className = "steps";
    for(let i=0;i<16;i++){
      const b = document.createElement("button");
      b.className = "st"; b.dataset.col = i; b.dataset.step = i;
      b.setAttribute("aria-label", t.name+" step "+(i+1));
      b.addEventListener("click", ()=>{
        state.sel = t.id;
        if(t.type==="drum") toggleDrumStep(t.id, i); else toggleSynthStep(t.id, i);
        paintAll();
      });
      const nn = document.createElement("span"); nn.className = "nn"; b.appendChild(nn);
      steps.appendChild(b);
    }
    row.append(info, steps);
    host.appendChild(row);
  }
}
function paintSteps(){
  const pat = curPat();
  for(const t of TRACKS){
    const row = document.querySelector('.trow[data-track="'+t.id+'"]');
    row.classList.toggle("sel", state.sel === t.id);
    row.querySelector(".mute").classList.toggle("on", state.tracks[t.id].mute);
    const cells = row.querySelectorAll(".st");
    for(let i=0;i<16;i++){
      const c = cells[i], nn = c.querySelector(".nn");
      if(t.type==="drum"){
        const v = pat[t.id][i];
        c.classList.toggle("on", v>0); c.classList.toggle("acc", v===2);
        nn.textContent = "";
      } else {
        const cell = pat[t.id][i];
        c.classList.toggle("on", !!(cell && cell.length));
        c.classList.toggle("acc", !!(cell && cell.some(x=>x.v>=0.98)));
        nn.textContent = cell && cell.length ? (cell.length>1 ? cell.length+"♩" : midiToName(cell[0].n)) : "";
      }
    }
  }
}
