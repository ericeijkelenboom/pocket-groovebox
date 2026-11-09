/* The one entry point the rest of the app calls after it changes something.
   Ordered so structure is built before the classes that decorate it. */

function paintAll(){
  renderBanks(); paintSteps(); renderEditor(); buildRoll(); paintRoll(); renderSong(); renderGlobals();
}

/* ======================= code in / out ======================= */
