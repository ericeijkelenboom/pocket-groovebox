/* Where a song lives: a rolling autosave plus named save slots, backed by the
   artifact's document store when there is one and this browser otherwise. */

const LS_KEY = "mf1.autosave.v1";
let dbRef = null, lastCode = null, dbTimer = null, writing = false, pendingCode = null;

function saveLocal(code){
  try{ localStorage.setItem(LS_KEY, JSON.stringify({code:code, savedAt:Date.now()})); }catch(e){}
}
function loadLocal(){
  try{ const raw = localStorage.getItem(LS_KEY); const o = raw ? JSON.parse(raw) : null;
       return (o && typeof o.code === "string") ? o : null; }catch(e){ return null; }
}
function saveMsg(text, kind){
  const el = document.getElementById("saveMsg");
  if(el){ el.textContent = text || ""; el.className = "msg " + (kind || ""); }
}
async function writeAutosave(code){
  if(!dbRef) return;
  if(writing){ pendingCode = code; return; }
  writing = true;
  try{
    await dbRef.doc("autosave/current").set({code:code, savedAt:new Date().toISOString()});
    saveMsg("Autosaved", "ok");
  }catch(e){
    const c = (e && e.code) || "error";
    saveMsg(c === "invalid_argument" ? "This view cannot save to storage" : "Autosave failed (" + c + ")", "err");
    if(c === "revoked" || c === "not_granted") dbRef = null;
  }
  writing = false;
  if(pendingCode){ const nxt = pendingCode; pendingCode = null; writeAutosave(nxt); }
}
/* One watcher instead of a hook on every control: it writes only when the
   machine's state has actually changed, never on an unchanged tick. */
/* Which pattern is on screen is not an edit — and with Follow on it changes
   every bar — so it is left out of the change test. */
function fingerprint(code){
  try{ const o = JSON.parse(code); delete o.cur; return JSON.stringify(o); }
  catch(e){ return code; }
}
function startAutosave(){
  lastCode = fingerprint(dumpCode());
  setInterval(()=>{
    const code = dumpCode(), fp = fingerprint(code);
    if(fp === lastCode) return;
    lastCode = fp;
    saveLocal(code);
    clearTimeout(dbTimer);
    dbTimer = setTimeout(()=>writeAutosave(code), 1500);
  }, 2000);
}
const slugify = s => (String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40) || "song");
function ago(iso){
  const t = Date.parse(iso);
  if(!t) return "";
  const s = (Date.now() - t)/1000;
  if(s < 90) return "just now";
  if(s < 3600) return Math.round(s/60) + " min ago";
  if(s < 86400) return Math.round(s/3600) + " h ago";
  return new Date(t).toLocaleDateString();
}
/* Named slots in this browser, for when there is no cloud store — the hosted
   copy has no window.claude, so db never resolves there. */
const LS_SONGS = "mf1.songs.v1";
function lsSongs(){
  try{ const o = JSON.parse(localStorage.getItem(LS_SONGS) || "{}"); return (o && typeof o === "object") ? o : {}; }
  catch(e){ return {}; }
}
function lsSongsWrite(o){
  try{ localStorage.setItem(LS_SONGS, JSON.stringify(o)); return true; }catch(e){ return false; }
}
function localSaveList(){
  const o = lsSongs();
  return Object.keys(o)
    .map(id=>({id, name:o[id].name, code:o[id].code, savedAt:o[id].savedAt}))
    .sort((a,b)=>(Date.parse(b.savedAt)||0) - (Date.parse(a.savedAt)||0));
}
async function saveNamed(name){
  const id = slugify(name);
  const doc = {name:name.trim() || id, code:dumpCode(), savedAt:new Date().toISOString()};
  if(dbRef){
    try{
      await dbRef.doc("songs/" + id).set(doc);
      saveMsg("Saved “" + doc.name + "”", "ok");
      document.getElementById("saveName").value = "";
    }catch(e){ saveMsg("Could not save (" + ((e && e.code) || "error") + ")", "err"); }
    return;
  }
  const all = lsSongs();
  all[id] = doc;
  if(!lsSongsWrite(all)) return saveMsg("This browser refused to store it. Use Download", "err");
  saveMsg("Saved “" + doc.name + "” in this browser", "ok");
  document.getElementById("saveName").value = "";
  renderSaves(localSaveList());
}
/* A live subscription, not a one-shot read: saves made in another window —
   or written for you while this page sits open — appear without a reload.
   Subscribe once, keep the unsubscribe, never re-subscribe to recover. */
let savesUnsub = null, savesTimer = null, savesLoaded = false;
function watchSaves(){
  if(!dbRef || savesUnsub) return;
  const list = document.getElementById("saveList");
  list.innerHTML = '<p class="hint" style="margin:8px 0 0">Loading saved songs…</p>';
  savesTimer = setTimeout(()=>{
    if(!savesLoaded) list.innerHTML = '<p class="hint" style="margin:8px 0 0">Cannot reach storage yet. Your work is still autosaving in this browser.</p>';
  }, 10000);
  savesUnsub = dbRef.collection("songs").orderBy("savedAt","desc").limit(40).onSnapshot(
    snap=>{
      if(!snap.metadata.fromCache){ savesLoaded = true; clearTimeout(savesTimer); }
      renderSaves(snap.docs.map(d=>{ const v = d.data() || {}; return {id:d.id, name:v.name, code:v.code, savedAt:v.savedAt}; }));
    },
    err=>{
      clearTimeout(savesTimer); savesUnsub = null;
      saveMsg("Save list unavailable (" + (err && err.code || "error") + ")", "err");
    }
  );
}
function renderSaves(items){
  const host = document.getElementById("saveList");
  host.innerHTML = "";
  if(!items.length){
    const p = document.createElement("p");
    p.className = "hint"; p.style.margin = "8px 0 0";
    p.textContent = "No saved songs yet. Type a name above and press Save.";
    host.appendChild(p);
    return;
  }
  for(const it of items){
    const row = document.createElement("div"); row.className = "saveitem";
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = it.name || it.id;
    const wh = document.createElement("span"); wh.className = "when"; wh.textContent = ago(it.savedAt);
    const ld = document.createElement("button"); ld.className = "btn"; ld.textContent = "Load";
    ld.addEventListener("click", ()=>{
      if(!it.code) return saveMsg("That save is empty", "err");
      try{ snapshot(); state = freshState(); loadCode(it.code); paintAll();
           document.getElementById("code").value = dumpCode();
           saveMsg("Loaded “" + (it.name || it.id) + "”", "ok"); }
      catch(err){ saveMsg("Could not load that save", "err"); }
    });
    const dl = document.createElement("button"); dl.className = "btn"; dl.textContent = "Delete";
    let armed = false, armTimer = null;
    dl.addEventListener("click", async ()=>{
      if(!armed){
        armed = true; dl.textContent = "Sure?"; dl.classList.add("on");
        armTimer = setTimeout(()=>{ armed = false; dl.textContent = "Delete"; dl.classList.remove("on"); }, 4000);
        return;
      }
      clearTimeout(armTimer);
      if(dbRef){
        try{ await dbRef.doc("songs/" + it.id).delete(); saveMsg("Deleted “" + (it.name || it.id) + "”", "ok"); }
        catch(e){ saveMsg("Could not delete (" + ((e && e.code) || "error") + ")", "err"); }
      } else {
        const all = lsSongs();
        delete all[it.id];
        lsSongsWrite(all);
        saveMsg("Deleted “" + (it.name || it.id) + "”", "ok");
        renderSaves(localSaveList());
      }
    });
    row.append(nm, wh, ld, dl);
    host.appendChild(row);
  }
}
function offerRestore(code, when){
  const host = document.getElementById("saveList");
  const row = document.createElement("div"); row.className = "saveitem";
  const nm = document.createElement("span"); nm.className = "nm";
  nm.textContent = "Newer autosave from another window (" + ago(when) + ")";
  const b = document.createElement("button"); b.className = "btn on"; b.textContent = "Restore";
  b.addEventListener("click", ()=>{
    try{ snapshot(); state = freshState(); loadCode(code); paintAll();
         document.getElementById("code").value = dumpCode(); row.remove();
         saveMsg("Restored", "ok"); }
    catch(e){ saveMsg("Could not restore", "err"); }
  });
  row.append(nm, b);
  host.prepend(row);
}
async function initStorage(){
  const stateEl = document.getElementById("saveState");
  /* Usable straight away, backed by this browser. use("db") can take up to ten
     seconds to answer, and saving should not wait on it. */
  document.getElementById("saveRow").hidden = false;
  stateEl.textContent = "Saved in this browser, and your work autosaves as you go. Download keeps a copy that survives a cleared browser.";
  renderSaves(localSaveList());

  let db = null;
  try{ db = window.claude && window.claude.use ? await window.claude.use("db") : null; }catch(e){ db = null; }
  if(!db) return;
  dbRef = db;
  stateEl.textContent = "Saved to your account, so these songs follow you between devices. Your work autosaves as you go.";
  watchSaves();
  try{
    const snap = await db.doc("autosave/current").get();
    if(snap.exists){
      const d = snap.data() || {}, local = loadLocal();
      const remote = Date.parse(d.savedAt) || 0, mine = local ? local.savedAt : 0;
      if(typeof d.code === "string" && remote > mine + 5000) offerRestore(d.code, d.savedAt);
    }
  }catch(e){ /* nothing newer to offer */ }
}

/* The shipped song is 1,032 bytes of JSON, 362 once deflated and 485 characters
   after base64url, small enough to carry in a link. "s=" is the compressed form,
   "j=" the plain one, for browsers without CompressionStream. */
