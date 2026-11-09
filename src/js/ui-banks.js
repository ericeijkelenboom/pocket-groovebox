/* The pattern bank: which pattern is selected, which is sounding, and which
   ones hold anything at all. */

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
