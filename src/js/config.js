/* Static description of the machine: its voices, banks, scales and the
   parameter ranges the editor renders. Data only, no behaviour. */

export const TRACKS = [
  {id:"kick", name:"Kick",   type:"drum",  hue:12},
  {id:"snare",name:"Snare",  type:"drum",  hue:38},
  {id:"chat", name:"Cl Hat", type:"drum",  hue:58},
  {id:"ohat", name:"Op Hat", type:"drum",  hue:80},
  {id:"clap", name:"Clap",   type:"drum",  hue:150},
  /* center = where this voice's piano roll sits, so Octave stays a true
     transpose and a label on the roll always names the pitch you hear. */
  {id:"bass", name:"Bass",   type:"synth", hue:196, center:40},
  {id:"lead", name:"Lead",   type:"synth", hue:268, center:60},
  {id:"pad",  name:"Pad",    type:"synth", hue:320, center:56}
];
export const TBY = Object.fromEntries(TRACKS.map(t=>[t.id,t]));
export const BANKS = ["A","B","C","D","E","F","G","H"];
export const PC = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
export const SCALES = {
  "Natural minor":[0,2,3,5,7,8,10],
  "Major":[0,2,4,5,7,9,11],
  "Dorian":[0,2,3,5,7,9,10],
  "Phrygian":[0,1,3,5,7,8,10],
  "Minor pentatonic":[0,3,5,7,10],
  "Blues":[0,3,5,6,7,10],
  "Chromatic":[0,1,2,3,4,5,6,7,8,9,10,11]
};
export const DEF_PARAMS = {
  kick :{tune:0,decay:0.45,snap:0.35,level:1.00,dly:0.00,rev:0.05},
  snare:{tune:0,decay:0.26,snap:0.52,level:0.78,dly:0.05,rev:0.18},
  chat :{tune:0,decay:0.07,snap:0.50,level:0.50,dly:0.00,rev:0.06},
  ohat :{tune:0,decay:0.40,snap:0.50,level:0.42,dly:0.08,rev:0.12},
  clap :{tune:0,decay:0.34,snap:0.50,level:0.62,dly:0.12,rev:0.26},
  bass :{wave:"sawtooth",oct: 0,detune:8, cutoff:700, res:7.0,fenv:0.55,atk:0.004,dec:0.18,sus:0.25,rel:0.10,gate:0.9,glide:0,level:0.90,dly:0.00,rev:0.03},
  lead :{wave:"square",  oct: 0,detune:10,cutoff:2200,res:4.0,fenv:0.40,atk:0.006,dec:0.25,sus:0.30,rel:0.25,gate:0.9,glide:0,level:0.60,dly:0.30,rev:0.20},
  pad  :{wave:"sawtooth",oct: 0,detune:16,cutoff:1400,res:2.0,fenv:0.25,atk:0.35, dec:0.60,sus:0.70,rel:1.20,gate:3.5,glide:0,level:0.45,dly:0.20,rev:0.55}
};
export const PATCHES = {
  "Deep sub":    {wave:"sine",    detune:0, cutoff:900, res:1.0,fenv:0.3,atk:0.004,dec:0.2,sus:0.5,rel:0.12,gate:0.9},
  "Acid":        {wave:"sawtooth",detune:0, cutoff:450, res:14, fenv:0.8,atk:0.002,dec:0.16,sus:0.05,rel:0.08,gate:0.7,glide:0.045},
  "Reese bass":  {wave:"sawtooth",detune:22,cutoff:620, res:5,  fenv:0.35,atk:0.01,dec:0.4,sus:0.6,rel:0.2,gate:1.0},
  "Pluck":       {wave:"square",  detune:6, cutoff:2600,res:6,  fenv:0.6,atk:0.003,dec:0.18,sus:0.0,rel:0.18,gate:0.6},
  "Glass lead":  {wave:"triangle",detune:12,cutoff:4200,res:2,  fenv:0.25,atk:0.01,dec:0.3,sus:0.45,rel:0.4,gate:0.9},
  "Soft pad":    {wave:"sawtooth",detune:18,cutoff:1300,res:1.5,fenv:0.2,atk:0.5,dec:0.8,sus:0.75,rel:1.6,gate:3.5},
  "Brass stab":  {wave:"sawtooth",detune:9, cutoff:1800,res:3,  fenv:0.55,atk:0.02,dec:0.3,sus:0.35,rel:0.25,gate:0.8}
};
export const pct = v=>Math.round(v*100)+"%";
export const secs= v=>v<1?Math.round(v*1000)+"ms":v.toFixed(2)+"s";
export const sgn = v=>(v>0?"+":"")+v;
export const PARAMS = {
  drum:[
    {k:"tune", l:"Tune", min:-12,max:12,  step:1,   fmt:sgn},
    {k:"decay",l:"Decay",min:0.03,max:1.6,step:0.01,fmt:secs},
    {k:"snap", l:"Snap", min:0,  max:1,   step:0.01,fmt:pct},
    {k:"level",l:"Level",min:0,  max:1.3, step:0.01,fmt:pct},
    {k:"dly",  l:"Delay",min:0,  max:1,   step:0.01,fmt:pct},
    {k:"rev",  l:"Reverb",min:0, max:1,   step:0.01,fmt:pct}
  ],
  synth:[
    {k:"oct",   l:"Octave", min:-2,max:2,    step:1,    fmt:sgn},
    {k:"detune",l:"Detune", min:0, max:30,   step:1,    fmt:v=>v+" ct"},
    {k:"cutoff",l:"Cutoff", min:120,max:9000,step:10,   fmt:v=>Math.round(v)+" Hz"},
    {k:"res",   l:"Reso",   min:0.5,max:18,  step:0.1,  fmt:v=>v.toFixed(1)},
    {k:"fenv",  l:"Filt env",min:0,max:1,    step:0.01, fmt:pct},
    {k:"atk",   l:"Attack", min:0.002,max:1.2,step:0.002,fmt:secs},
    {k:"dec",   l:"Decay",  min:0.02,max:1.5,step:0.01, fmt:secs},
    {k:"sus",   l:"Sustain",min:0, max:1,    step:0.01, fmt:pct},
    {k:"rel",   l:"Release",min:0.02,max:2,  step:0.01, fmt:secs},
    {k:"gate",  l:"Gate",   min:0.1,max:4,   step:0.1,  fmt:v=>v.toFixed(1)+"×"},
    {k:"glide", l:"Glide",  min:0, max:0.2,  step:0.005,fmt:secs},
    {k:"level", l:"Level",  min:0, max:1.3,  step:0.01, fmt:pct},
    {k:"dly",   l:"Delay",  min:0, max:1,    step:0.01, fmt:pct},
    {k:"rev",   l:"Reverb", min:0, max:1,    step:0.01, fmt:pct}
  ]
};
