/* The song chain and the global controls across the header. */

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
