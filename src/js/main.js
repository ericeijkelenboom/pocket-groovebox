/* Wiring and boot. */

function wire(){
  document.getElementById("play").addEventListener("click", ()=>{ playing ? stopTransport() : startTransport(); });
  document.getElementById("stop").addEventListener("click", stopTransport);
  document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click", ()=>{
    state.mode = b.dataset.mode;
    if(playing && state.mode==="song"){ const fs = filledSlots(); if(fs.length) slotIdx = fs[0]; }
    renderGlobals(); renderSong();
  }));
  const bpm = document.getElementById("bpm");
  const showSwing = ()=>{ document.getElementById("vSwing").textContent = Math.round(state.swing*100)+"% · +"+swingMs()+"ms"; };
  bpm.addEventListener("input", ()=>{ state.bpm = +bpm.value; document.getElementById("vBpm").textContent = state.bpm+" BPM"; setDelayTime(); showSwing(); });
  const sw = document.getElementById("swing");
  sw.addEventListener("input", ()=>{ state.swing = +sw.value/100; showSwing(); });
  const swr = document.getElementById("swingRes");
  swr.addEventListener("change", ()=>{ state.swingRes = +swr.value; showSwing(); });
  const dlt = document.getElementById("dlyTime");
  dlt.addEventListener("change", ()=>{ state.dlyTime = +dlt.value; setDelayTime(); });
  const ma = document.getElementById("master");
  ma.addEventListener("input", ()=>{ state.master = +ma.value/100; document.getElementById("vMaster").textContent = ma.value+"%"; if(ctx) master.gain.value = state.master; });

  const key = document.getElementById("key");
  PC.forEach((n,i)=>{ const o = document.createElement("option"); o.value = i; o.textContent = n; key.appendChild(o); });
  /* Changing the key transposes the whole song by the shortest route, which is
     what you expect of a Key control and works while the transport runs — the
     next scheduled step picks it up. Scale cannot do the same: moving between,
     say, minor and major has no one correct mapping for notes that leave the
     scale, so it stays a guide. */
  key.addEventListener("change", ()=>{
    const want = +key.value;
    const by = semitonesBetweenKeys(state.key, want);
    try{
      const moved = transposePatterns(state.patterns, by);
      snapshot();
      state.patterns = moved;
      state.key = want;
      paintAll();
      document.getElementById("code").value = dumpCode();
      flash(by === 0 ? "Key set to " + PC[want]
                     : "Transposed to " + PC[want] + " (" + (by > 0 ? "+" : "") + by + " semitones)", "ok");
    }catch(e){
      key.value = String(state.key);
      flash("That key would push a note out of range. Move the line first", "err");
    }
  });
  const sc = document.getElementById("scale");
  Object.keys(SCALES).forEach(n=>{ const o = document.createElement("option"); o.value = n; o.textContent = n; sc.appendChild(o); });
  sc.addEventListener("change", ()=>{ state.scale = sc.value; buildRoll(); paintRoll(); });

  document.getElementById("clrTrack").addEventListener("click", ()=>{
    snapshot();
    const t = TBY[state.sel];
    curPat()[t.id] = t.type==="drum" ? new Array(16).fill(0) : new Array(16).fill(null);
    paintAll(); flash("Cleared "+t.name+" in pattern "+state.cur, "ok");
  });
  document.getElementById("clrPat").addEventListener("click", ()=>{
    snapshot(); state.patterns[state.cur] = emptyPattern();
    paintAll(); flash("Cleared pattern "+state.cur, "ok");
  });
  document.getElementById("copyPat").addEventListener("click", ()=>{
    clipboard = JSON.parse(JSON.stringify(curPat())); flash("Copied pattern "+state.cur, "ok");
  });
  document.getElementById("pastePat").addEventListener("click", ()=>{
    if(!clipboard) return flash("Copy a pattern first", "err");
    snapshot(); state.patterns[state.cur] = JSON.parse(JSON.stringify(clipboard));
    paintAll(); flash("Pasted into pattern "+state.cur, "ok");
  });
  /* Both replace the whole machine rather than merging, and both go through
     snapshot() first, so Undo brings your song straight back. */
  document.getElementById("clrAll").addEventListener("click", ()=>{
    snapshot();
    const sel = state.sel;
    state = freshState();
    state.sel = sel; state.mode = "pattern"; state.cur = "A";
    paintAll();
    document.getElementById("code").value = dumpCode();
    flash("Everything cleared. Undo brings it back", "ok");
  });
  document.getElementById("loadDemo").addEventListener("click", ()=>{
    snapshot();
    state = freshState();
    try{ loadCode(JSON.stringify(DEFAULT_SONG)); }catch(e){}
    paintAll();
    document.getElementById("code").value = dumpCode();
    flash("Demo song loaded. Undo brings yours back", "ok");
  });
  document.getElementById("undo").addEventListener("click", doUndo);
  document.getElementById("follow").addEventListener("click", ()=>{
    state.follow = !state.follow;
    if(state.follow && playing && state.mode === "song") state.cur = playPat;
    paintAll();
  });

  const nameIn = document.getElementById("saveName");
  document.getElementById("saveBtn").addEventListener("click", ()=>{
    const n = nameIn.value.trim();
    if(!n) { nameIn.focus(); return saveMsg("Give it a name first", "err"); }
    saveNamed(n);
  });
  nameIn.addEventListener("keydown", ev=>{ if(ev.key === "Enter") document.getElementById("saveBtn").click(); });

  document.getElementById("dump").addEventListener("click", ()=>{
    document.getElementById("code").value = dumpCode(); flash("Written out below", "ok");
  });
  document.getElementById("load").addEventListener("click", ()=>{
    const txt = document.getElementById("code").value.trim();
    if(!txt) return flash("Paste a code first", "err");
    try{ snapshot(); loadCode(txt); paintAll(); flash("Loaded", "ok"); }
    catch(err){ flash("Could not read that code: " + err.message, "err"); }
  });
  document.getElementById("copyCode").addEventListener("click", async ()=>{
    const ta = document.getElementById("code");
    if(!ta.value) ta.value = dumpCode();
    try{ await navigator.clipboard.writeText(ta.value); flash("Copied to clipboard", "ok"); }
    catch(e){ ta.focus(); ta.select(); flash("Selected. Press copy on your keyboard", ""); }
  });

  document.getElementById("shareLink").addEventListener("click", copyShareLink);
  /* A link pasted into an already-open tab is a same-document navigation, so
     boot never runs again — pick it up here instead. */
  addEventListener("hashchange", ()=>{
    const frag = (location.hash || "").replace(/^#/, "");
    if(frag && frag === ownFragment) return;
    applyHash();
  });
  document.getElementById("dlSong").addEventListener("click", downloadSong);
  const fileIn = document.getElementById("songFile");
  document.getElementById("openSong").addEventListener("click", ()=>fileIn.click());
  fileIn.addEventListener("change", ()=>{ openSongFile(fileIn.files && fileIn.files[0]); fileIn.value = ""; });

  const KEYMAP = {a:0,w:1,s:2,e:3,d:4,f:5,t:6,g:7,y:8,h:9,u:10,j:11,k:12,o:13,l:14,p:15};
  addEventListener("keydown", ev=>{
    const tag = (ev.target && ev.target.tagName) || "";
    if(/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if(ev.code === "Space"){ ev.preventDefault(); playing ? stopTransport() : startTransport(); return; }
    const k = ev.key.toLowerCase();
    if(ev.repeat || !(k in KEYMAP)) return;
    const t = TBY[state.sel];
    if(t.type !== "synth") return;
    initAudio(); if(ctx.state==="suspended") ctx.resume();
    const note = rootFor(t.id) + KEYMAP[k];
    if(liveVoices.has(k)) return;
    const h = voiceOn(t.id, note, ctx.currentTime + 0.005, 0.9);
    if(h) liveVoices.set(k, h);
  });
  addEventListener("keyup", ev=>{
    const k = ev.key.toLowerCase();
    const h = liveVoices.get(k);
    if(h){ h.release(ctx ? ctx.currentTime : 0); liveVoices.delete(k); }
  });
}

/* Pinch-zoom is suppressed ONLY when launched from a home screen, never in a
   browser tab, where zoom is an accessibility affordance and iOS ignores the
   request anyway while Android Chrome honours it. Updating the meta at runtime
   rather than in the markup is what makes that distinction possible. */
function isInstalled(){
  try{
    if(window.navigator && window.navigator.standalone === true) return true;
    return !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  }catch(e){ return false; }
}
function applyInstalledChrome(){
  if(!isInstalled()) return false;
  document.documentElement.classList.add("installed");
  const m = document.querySelector('meta[name="viewport"]');
  if(m) m.setAttribute("content",
    "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");
  return true;
}

/* ======================= boot ======================= */
function boot(initial){
  state = freshState();
  try{ loadCode(JSON.stringify(DEFAULT_SONG)); }catch(e){}
  /* A live reload hands its own state back; otherwise pick up where this
     browser left off, so a refresh never costs you the bar you just built. */
  const resume = (initial && initial.code) ? initial.code : (loadLocal() || {}).code;
  if(resume){ try{ state = freshState(); loadCode(resume); }catch(e){ state = freshState(); try{ loadCode(JSON.stringify(DEFAULT_SONG)); }catch(e2){} } }
  applyInstalledChrome();
  buildSeq(); wire(); paintAll(); drawLoop();
  document.getElementById("code").value = dumpCode();
  setPos(null);
  startAutosave();
  initStorage();
  applyHash();
}
try{
  if(window.claude && window.claude.hot){
    window.claude.hot.snapshot(()=>({code:dumpCode()}));
    window.claude.hot.ready ? window.claude.hot.ready(boot) : boot(window.claude.hot.data);
  } else boot(null);
}catch(e){ boot(null); }
