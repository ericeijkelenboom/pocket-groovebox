/* The three synth voices, and the screen wake lock that keeps a tablet from
   dimming mid-loop. */

function voiceOn(id, note, t, vel){
  if(!ctx) return null;
  const p = state.tracks[id], out = bus[id].g;
  const f = mtof(note + p.oct*12);
  const vca = ctx.createGain(); vca.gain.setValueAtTime(0.0001, t);
  const filt = ctx.createBiquadFilter(); filt.type="lowpass"; filt.Q.value = p.res;
  const oscs = [];
  const spread = p.detune > 0 ? [-p.detune, p.detune] : [0];
  for(const d of spread){
    const o = ctx.createOscillator();
    o.type = p.wave; o.detune.value = d;
    const prev = lastNote[id];
    if(p.glide > 0 && prev != null && prev !== note){
      o.frequency.setValueAtTime(mtof(prev + p.oct*12), t);
      o.frequency.exponentialRampToValueAtTime(f, t + p.glide);
    } else {
      o.frequency.setValueAtTime(f, t);
    }
    o.connect(filt); o.start(t); oscs.push(o);
  }
  const amp = vel * 0.34 / Math.sqrt(spread.length);
  const sustain = Math.max(0.0001, amp * p.sus);
  vca.gain.linearRampToValueAtTime(amp, t + p.atk);
  vca.gain.setTargetAtTime(sustain, t + p.atk, Math.max(0.01,p.dec/3));
  const lo = Math.max(60, p.cutoff), hi = Math.min(16000, p.cutoff + p.fenv*7500*vel);
  filt.frequency.setValueAtTime(lo, t);
  if(p.fenv > 0.01){
    filt.frequency.linearRampToValueAtTime(hi, t + Math.max(0.004,p.atk));
    filt.frequency.setTargetAtTime(lo, t + Math.max(0.004,p.atk), Math.max(0.02,p.dec/2.5));
  }
  filt.connect(vca); vca.connect(out);
  let released = false;
  return {
    release(rt){
      if(released) return; released = true;
      const r = p.rel;
      fadeOut(vca.gain, rt, Math.max(0.01, r/3), sustain);
      for(const o of oscs){ try{ o.stop(rt + r + 0.12); }catch(e){} }
    }
  };
}
const lastNote = {};

/* Hold the screen awake while the transport runs — a tablet dimming mid-loop
   is the main annoyance of using this away from a desk. The lock is dropped
   whenever the page is hidden, so re-take it when it comes back. */
let wakeLock = null;
async function keepAwake(on){
  try{
    if(on){
      if(!wakeLock && navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen");
    }else if(wakeLock){
      const w = wakeLock; wakeLock = null; await w.release();
    }
  }catch(e){ wakeLock = null; }
}
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible" && playing) keepAwake(true);
});

/* ======================= transport ======================= */
