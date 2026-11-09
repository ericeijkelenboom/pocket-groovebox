import { freshState } from "./patterns.js";

/* The live machine. One mutable object the UI renders from and the transport
   reads; every module below touches it, which is why it sits on its own. */
export let state = freshState();
export let clipboard = null, undoSnap = null;
export const setState = v => { state = v; };
export const setClipboard = v => { clipboard = v; };
export const setUndo = v => { undoSnap = v; };
