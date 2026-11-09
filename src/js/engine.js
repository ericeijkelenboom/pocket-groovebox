/* The audio graph: master chain, per-track buses with delay and reverb sends,
   a generated impulse response, and the envelope helpers every voice uses. */

let ctx=null, master, revIn, dlyIn, dlyNode, dlyFb, dlyLp, noiseBuf, bus={}, openHat=null;
const liveVoices = new Map();

function softCurve(){
  const n=1024, c=new Float32Array(n);
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(x*1.7)/Math.tanh(1.7); }
  return c;
}
function makeNoise(sec){
  const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  return b;
}
function makeIR(sec,decay){
  const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(2,n,ctx.sampleRate);
  for(let c=0;c<2;c++){
    const d=b.getChannelData(c);
    for(let i=0;i<n;i++){
      const x=i/n, atk=Math.min(1,i/(ctx.sampleRate*0.012));
      d[i]=(Math.random()*2-1)*Math.pow(1-x,decay)*atk;
    }
  }
  return b;
}
function initAudio(){
  if(ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = state.master;
  const shaper = ctx.createWaveShaper(); shaper.curve = softCurve(); shaper.oversample = "2x";
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value=-9; comp.knee.value=8; comp.ratio.value=4; comp.attack.value=0.004; comp.release.value=0.14;
  master.connect(shaper); shaper.connect(comp); comp.connect(ctx.destination);

  dlyNode = ctx.createDelay(2.0);
  dlyFb = ctx.createGain(); dlyFb.gain.value = 0.36;
  dlyLp = ctx.createBiquadFilter(); dlyLp.type="lowpass"; dlyLp.frequency.value=2800;
  dlyIn = ctx.createGain();
  dlyIn.connect(dlyNode); dlyNode.connect(dlyLp); dlyLp.connect(dlyFb); dlyFb.connect(dlyNode);
  const dlyOut = ctx.createGain(); dlyOut.gain.value=0.75; dlyLp.connect(dlyOut); dlyOut.connect(master);
  setDelayTime();

  const conv = ctx.createConvolver(); conv.buffer = makeIR(2.2, 2.8);
  revIn = ctx.createGain(); revIn.connect(conv);
  const revOut = ctx.createGain(); revOut.gain.value=0.85; conv.connect(revOut); revOut.connect(master);

  noiseBuf = makeNoise(2);

  for(const t of TRACKS){
    const g = ctx.createGain(), d = ctx.createGain(), r = ctx.createGain();
    g.connect(master); g.connect(d); g.connect(r);
    d.connect(dlyIn); r.connect(revIn);
    bus[t.id] = {g,d,r};
    applyTrackGains(t.id);
  }
}
function applyTrackGains(id){
  if(!ctx) return;
  const p = state.tracks[id], b = bus[id];
  b.g.gain.value = p.mute ? 0 : p.level;
  b.d.gain.value = p.dly;
  b.r.gain.value = p.rev;
}
function setDelayTime(){
  if(!ctx) return;
  const sixteenth = 60/state.bpm/4;
  dlyNode.delayTime.setTargetAtTime(Math.min(1.9, sixteenth*state.dlyTime), ctx.currentTime, 0.05);
}
/* How far the swung step is pushed late, in seconds. On the 1/8 grid every second
   eighth moves (steps 3, 7, 11, 15); on the 1/16 grid every second sixteenth does. */

function noiseSrc(t, dur){
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  s.playbackRate.value = 0.8 + Math.random()*0.4;
  s.start(t, Math.random()*1.5); s.stop(t+dur+0.05);
  return s;
}
/* Silence a ringing voice without the classic Web Audio jump-to-peak:
   cancelScheduledValues drops the in-flight ramp and the param falls back to
   the last COMPLETED event (the attack), so it must be re-anchored at its
   current value first. cancelAndHoldAtTime does exactly that where it exists. */
function fadeOut(param, t, tau, anchor){
  try{
    if(typeof param.cancelAndHoldAtTime === "function"){
      /* Keeps the curve's real value at t. Never read param.value for this:
         for automation scheduled in the future it reports the node's initial
         value (1 for a fresh GainNode), which jams the gain to full scale and
         gives the note a second, louder attack. */
      param.cancelAndHoldAtTime(t);
    } else {
      param.cancelScheduledValues(t);
      param.setValueAtTime(Math.max(0.0001, anchor), t);
    }
    param.setTargetAtTime(0.0001, t, tau);
  }catch(e){}
}
function chokeTo(param, t, tau){ fadeOut(param, t, tau, 0.0001); }
function env(g, t, peak, dec, atk){
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002,peak), t+(atk||0.002));
  g.gain.exponentialRampToValueAtTime(0.0001, t+(atk||0.002)+dec);
}
