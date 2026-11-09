/* Carrying a song elsewhere: a link with the song in its hash, and plain JSON
   files in and out. */

const B64U = {
  enc(bytes){
    let s = "";
    for(let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  },
  dec(str){
    const bin = atob(str.replace(/-/g,"+").replace(/_/g,"/"));
    const out = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return out;
  }
};
async function encodeShare(json){
  if(typeof CompressionStream === "function"){
    try{
      const buf = await new Response(
        new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"))
      ).arrayBuffer();
      return "s=" + B64U.enc(new Uint8Array(buf));
    }catch(e){ /* fall through to the uncompressed form */ }
  }
  return "j=" + B64U.enc(new TextEncoder().encode(json));
}
async function decodeShare(frag){
  const m = /^#?([sj])=([A-Za-z0-9\-_]+)$/.exec(frag || "");
  if(!m) return null;
  const bytes = B64U.dec(m[2]);
  if(m[1] === "j") return new TextDecoder().decode(bytes);
  if(typeof DecompressionStream !== "function") return null;
  const buf = await new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  ).arrayBuffer();
  return new TextDecoder().decode(buf);
}
let ownFragment = null;   /* so our own Copy link does not look like an arriving one */
async function copyShareLink(){
  let url;
  try{
    const frag = await encodeShare(dumpCode());
    url = location.origin + location.pathname + location.search + "#" + frag;
    ownFragment = frag;
    try{ location.hash = frag; }catch(e){}
  }catch(e){ return flash("Could not build a link", "err"); }
  try{
    await navigator.clipboard.writeText(url);
    flash("Link copied, " + url.length + " characters", "ok");
  }catch(e){
    const ta = document.getElementById("code");
    ta.value = url; ta.focus(); ta.select();
    flash("Link is in the box below, ready to copy", "");
  }
}
function songFilename(){
  const typed = (document.getElementById("saveName").value || "").trim();
  return ((typed || "groovebox-song").replace(/[^\w.-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48)
          || "groovebox-song") + ".json";
}
async function downloadSong(){
  const name = songFilename(), json = dumpCode();
  try{
    const dl = (window.claude && window.claude.use) ? await window.claude.use("downloads") : null;
    if(dl){ await dl.save({filename:name, data:json}); flash("Saved " + name, "ok"); return; }
  }catch(e){ /* viewer declined or unavailable; try the ordinary link */ }
  try{
    const url = URL.createObjectURL(new Blob([json], {type:"application/json"}));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} }, 2000);
    flash("Requested " + name + ". If nothing arrived, use Copy instead", "");
  }catch(e){ flash("Downloads are not available here. Use Copy", "err"); }
}
function openSongFile(file){
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      snapshot();
      state = freshState();
      loadCode(String(r.result));
      paintAll();
      document.getElementById("code").value = dumpCode();
      flash("Loaded " + file.name, "ok");
    }catch(e){ flash("Could not read that file: " + e.message, "err"); }
  };
  r.onerror = ()=>flash("Could not read that file", "err");
  r.readAsText(file);
}
/* A shared link wins over this browser's autosave — that is the point of the
   link — but the previous state goes into Undo first. */
async function applyHash(){
  if(!/^#[sj]=/.test(location.hash || "")) return;
  try{
    const json = await decodeShare(location.hash);
    if(!json) return flash("This browser cannot unpack that link", "err");
    snapshot();
    state = freshState();
    loadCode(json);
    paintAll();
    document.getElementById("code").value = dumpCode();
    flash("Loaded from the link. Undo restores what you had", "ok");
    /* The hash is a delivery mechanism, not state: once the song is in, drop it
       so a later reload resumes this browser's autosave instead of re-importing
       over whatever the visitor has since changed. Copy link rebuilds it. */
    try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){}
  }catch(e){ flash("That link's song could not be read", "err"); }
}

let msgTimer = null;
function flash(text, kind){
  const el = document.getElementById("msg");
  el.textContent = text; el.className = "msg " + (kind || "");
  clearTimeout(msgTimer); msgTimer = setTimeout(()=>{ el.textContent = ""; }, 3200);
}

/* ======================= wiring ======================= */
