/* The voice editor below the grid: wave, patch and the parameter faders,
   built from the schema in config.js. */

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
