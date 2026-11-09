/* Every render and paint function. build* creates DOM once; paint* updates
   classes on DOM that already exists. */

function renderBanks(){
  const host = document.getElementById("banks");
  if(host.children.length !== BANKS.length){
    host.innerHTML = "";
    for(const b of BANKS){
      const el = document.createElement("button");
      el.className = "bank"; el.textContent = b; el.dataset.bank = b;
      el.setAttribute("aria-label","Pattern "+b);
      /* Choosing a pattern by hand means you want to edit it, so stop following. */
      el.addEventListener("click", ()=>{
        state.cur = b;
        if(state.mode === "song") state.follow = false;
        paintAll();
      });
      host.appendChild(el);
    }
  }
  for(const el of host.children){
    const b = el.dataset.bank;
    el.classList.toggle("sel", b === state.cur);
    el.classList.toggle("cue", playing && b === playPat);
    const pat = state.patterns[b];
    const has = TRACKS.some(t => t.type==="drum" ? pat[t.id].some(Boolean) : pat[t.id].some(c=>c&&c.length));
    el.classList.toggle("has", has);
  }
}
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
function renderEditor(){
  const t = TBY[state.sel];
  const head = document.getElementById("edName");
  head.textContent = t.name;
  head.parentElement.style.setProperty("--hue", t.hue);
  document.getElementById("edHint").textContent = t.type==="drum"
    ? "Click a step above to cycle it off → on → accent. Tune, decay and snap reshape the sound of every hit on this track."
    : "Click a cell to place a note. Shift-click adds a second note in the same step (a chord), or toggles the accent on a note already there. Play it live with A W S E D F T G Y H U J K.";
  const extra = document.getElementById("edExtra");
  extra.innerHTML = "";
  if(t.type==="synth"){
    const wrapW = document.createElement("div"); wrapW.className = "ctl";
    const lw = document.createElement("span"); lw.className = "lbl"; lw.textContent = "Wave";
    const sw = document.createElement("select"); sw.id = "p-"+t.id+"-wave";
    for(const w of ["sawtooth","square","triangle","sine"]){
      const o = document.createElement("option"); o.value = w; o.textContent = w; sw.appendChild(o);
    }
    sw.value = state.tracks[t.id].wave;
    sw.addEventListener("change", ()=>{ state.tracks[t.id].wave = sw.value; });
    wrapW.append(lw, sw);
    const wrapP = document.createElement("div"); wrapP.className = "ctl";
    const lp = document.createElement("span"); lp.className = "lbl"; lp.textContent = "Patch";
    const sp = document.createElement("select"); sp.id = "p-"+t.id+"-patch";
    const o0 = document.createElement("option"); o0.value=""; o0.textContent="— load patch —"; sp.appendChild(o0);
    for(const k of Object.keys(PATCHES)){ const o=document.createElement("option"); o.value=k; o.textContent=k; sp.appendChild(o); }
    sp.addEventListener("change", ()=>{
      const pk = PATCHES[sp.value];
      if(pk){ Object.assign(state.tracks[t.id], {glide:0}, pk); applyTrackGains(t.id); renderEditor(); flash("Patch: "+sp.value, "ok"); }
      sp.value = "";
    });
    wrapP.append(lp, sp);
    extra.style.display="flex"; extra.style.gap="14px"; extra.style.flexWrap="wrap";
    extra.append(wrapW, wrapP);
  }
  const host = document.getElementById("params");
  host.innerHTML = "";
  for(const d of PARAMS[t.type]){
    const wrap = document.createElement("div"); wrap.className = "ctl";
    const lab = document.createElement("span"); lab.className = "lbl";
    const nm = document.createElement("span"); nm.textContent = d.l;
    const val = document.createElement("span"); val.className = "val";
    lab.append(nm, val);
    const r = document.createElement("input");
    r.type = "range"; r.id = "p-"+t.id+"-"+d.k;
    r.min = d.min; r.max = d.max; r.step = d.step; r.value = state.tracks[t.id][d.k];
    val.textContent = d.fmt(+r.value);
    r.addEventListener("input", ()=>{
      state.tracks[t.id][d.k] = +r.value;
      val.textContent = d.fmt(+r.value);
      applyTrackGains(t.id);
      if(d.k === "oct") buildRoll(), paintRoll();
    });
    wrap.append(lab, r);
    host.appendChild(wrap);
  }
}
function renderSong(){
  const host = document.getElementById("slots");
  if(host.children.length !== 16){
    host.innerHTML = "";
    for(let i=0;i<16;i++){
      const b = document.createElement("button");
      b.className = "slot"; b.dataset.slot = i;
      b.addEventListener("click", ()=>{
        const cur = state.song[i];
        const idx = cur ? BANKS.indexOf(cur) + 1 : 0;
        state.song[i] = idx >= BANKS.length ? null : BANKS[idx];
        renderSong();
      });
      host.appendChild(b);
    }
  }
  for(let i=0;i<16;i++){
    const b = host.children[i], v = state.song[i];
    b.textContent = v || "–";
    b.classList.toggle("filled", !!v);
    b.classList.toggle("cue", playing && state.mode==="song" && slotIdx === i);
    b.setAttribute("aria-label", "Song slot "+(i+1)+": "+(v||"empty"));
  }
}
function renderGlobals(){
  const set = (id, v, fmt, vid)=>{
    const el = document.getElementById(id); if(el) el.value = v;
    const o = document.getElementById(vid); if(o) o.textContent = fmt;
  };
  set("bpm", state.bpm, state.bpm+" BPM", "vBpm");
  set("swing", Math.round(state.swing*100), Math.round(state.swing*100)+"% · +"+swingMs()+"ms", "vSwing");
  document.getElementById("swingRes").value = String(state.swingRes);
  document.getElementById("dlyTime").value = String(state.dlyTime);
  set("master", Math.round(state.master*100), Math.round(state.master*100)+"%", "vMaster");
  document.getElementById("key").value = String(state.key);
  document.getElementById("scale").value = state.scale;
  document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("on", b.dataset.mode === state.mode));
  const fb = document.getElementById("follow");
  fb.classList.toggle("on", state.follow);
  fb.disabled = state.mode !== "song";
  fb.style.opacity = state.mode === "song" ? "" : "0.45";
}
function paintAll(){
  renderBanks(); paintSteps(); renderEditor(); buildRoll(); paintRoll(); renderSong(); renderGlobals();
}

/* ======================= code in / out ======================= */
