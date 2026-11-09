/* Adapters. The pure modules take tempo, key and scale as arguments so they can
   be reasoned about and tested on their own; the rest of the app asks about the
   machine as it currently is. Binding them in one place keeps the pure core
   pure without threading state through several hundred call sites. */

const sixteenth  = () => sixteenthSeconds(state.bpm);
const swingShift = i  => swingShiftSeconds(i + 1, state.swing, state.swingRes, state.bpm);
const swingMs    = () => swingMilliseconds(state.swing, state.swingRes, state.bpm);

const inScale = m  => isInScale(m, state.key, state.scale);
const isRoot  = m  => isKeyRoot(m, state.key);
const rootFor = id => rootNear((TBY[id] && TBY[id].center) || 60, state.key);
