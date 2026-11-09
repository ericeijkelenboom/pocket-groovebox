/* The five drum voices, synthesised from oscillators and filtered noise. */

function playDrum(id, t, vel){
  if(!ctx) return;
  const p = state.tracks[id], out = bus[id].g, k = Math.pow(2, p.tune/12);
  if(id==="kick"){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type="sine"; const f0 = 48*k;
    o.frequency.setValueAtTime(f0*5.5, t);
    o.frequency.exponentialRampToValueAtTime(f0, t+0.035+0.05*(1-p.snap));
    env(g, t, vel, p.decay, 0.003);
    o.connect(g); g.connect(out); o.start(t); o.stop(t+p.decay+0.1);
    if(p.snap>0.02){
      const n = noiseSrc(t,0.02), hp = ctx.createBiquadFilter(), ng = ctx.createGain();
      hp.type="highpass"; hp.frequency.value=2200;
      env(ng, t, vel*p.snap*0.5, 0.012, 0.001);
      n.connect(hp); hp.connect(ng); ng.connect(out);
    }
  } else if(id==="snare"){
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type="triangle"; o.frequency.setValueAtTime(185*k, t);
    o.frequency.exponentialRampToValueAtTime(130*k, t+0.08);
    env(og, t, vel*0.55, p.decay*0.6, 0.002);
    o.connect(og); og.connect(out); o.start(t); o.stop(t+p.decay+0.1);
    const n = noiseSrc(t,p.decay), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    bp.type="bandpass"; bp.frequency.value=(1400+p.snap*3200)*k; bp.Q.value=0.8;
    env(ng, t, vel*0.75, p.decay, 0.001);
    n.connect(bp); bp.connect(ng); ng.connect(out);
  } else if(id==="chat" || id==="ohat"){
    const n = noiseSrc(t,p.decay), hp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type="highpass"; hp.frequency.value=(5200+p.snap*3500)*k;
    bp.type="peaking"; bp.frequency.value=9000*k; bp.gain.value=6; bp.Q.value=1.2;
    env(g, t, vel, p.decay, 0.001);
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out);
    if(id==="ohat"){
      if(openHat) chokeTo(openHat.gain, t, 0.005);   /* an open hat closes the previous one too */
      openHat = g;
    } else if(openHat){
      chokeTo(openHat.gain, t, 0.005);
      openHat = null;                                 /* choked once; don't re-choke a dead voice */
    }
  } else if(id==="clap"){
    const bp = ctx.createBiquadFilter(); bp.type="bandpass";
    bp.frequency.value=(1000+p.snap*1400)*k; bp.Q.value=1.4;
    bp.connect(out);
    [0,0.009,0.019,0.030].forEach((off,i)=>{
      const n = noiseSrc(t+off,0.03), g = ctx.createGain();
      env(g, t+off, vel*(i===3?0.9:0.6), i===3?p.decay:0.028, 0.001);
      n.connect(g); g.connect(bp);
    });
  }
}
