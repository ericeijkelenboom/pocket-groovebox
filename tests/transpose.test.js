import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { semitonesBetweenKeys, transposePatterns } from "../src/js/patterns.js";
import { strToTrack, trackToStr } from "../src/js/codec.js";
import { nameToMidi, midiToName } from "../src/js/notes.js";

const song = JSON.parse(readFileSync(new URL("../songs/default.json", import.meta.url), "utf8"));
const DRUMS = ["kick", "snare", "chat", "ohat", "clap"];

/** The shipped song, decoded into the shape the machine holds in memory. */
function shippedPatterns(){
  const out = {};
  for (const [bank, rows] of Object.entries(song.pat)) {
    out[bank] = {};
    for (const [id, row] of Object.entries(rows))
      out[bank][id] = strToTrack(DRUMS.includes(id) ? "drum" : "synth", row);
  }
  return out;
}

test("the shortest route between keys is never more than six semitones", () => {
  for (let from = 0; from < 12; from++)
    for (let to = 0; to < 12; to++) {
      const d = semitonesBetweenKeys(from, to);
      assert.ok(d >= -6 && d <= 6, `${from}->${to} moved ${d}`);
      assert.equal(((from + d) % 12 + 12) % 12, to, "and actually lands on the key");
    }
});

test("C to B goes down one, not up eleven", () => {
  assert.equal(semitonesBetweenKeys(0, 11), -1);
  assert.equal(semitonesBetweenKeys(11, 0), 1);
  assert.equal(semitonesBetweenKeys(0, 5), 5, "C to F is up a fourth");
  assert.equal(semitonesBetweenKeys(0, 0), 0);
});

test("transposing moves pitched notes and leaves drums alone", () => {
  const before = shippedPatterns();
  const after = transposePatterns(before, 5);
  for (const bank of Object.keys(before))
    for (const id of Object.keys(before[bank])) {
      if (DRUMS.includes(id)) {
        assert.deepEqual(after[bank][id], before[bank][id], `${bank}.${id} is a drum row`);
        continue;
      }
      before[bank][id].forEach((cell, i) => {
        if (!cell) return assert.equal(after[bank][id][i], null, "rests stay rests");
        cell.forEach((note, j) => {
          assert.equal(after[bank][id][i][j].n, note.n + 5, `${bank}.${id} step ${i + 1}`);
          assert.equal(after[bank][id][i][j].v, note.v, "velocity is untouched");
        });
      });
    }
});

test("transposing does not mutate what it was given", () => {
  const before = shippedPatterns();
  const snapshot = JSON.stringify(before);
  transposePatterns(before, 7);
  assert.equal(JSON.stringify(before), snapshot);
});

test("a key change and its reverse return the original", () => {
  const original = shippedPatterns();
  for (let to = 0; to < 12; to++) {
    const out = semitonesBetweenKeys(0, to);
    const back = semitonesBetweenKeys(to, 0);
    assert.deepEqual(transposePatterns(transposePatterns(original, out), back), original,
      `C -> ${to} -> C did not round-trip`);
  }
});

test("the shipped song survives every key, staying inside the MIDI range", () => {
  const original = shippedPatterns();
  for (let to = 0; to < 12; to++)
    assert.doesNotThrow(() => transposePatterns(original, semitonesBetweenKeys(0, to)),
      `transposing to key ${to} threw`);
});

test("a note that would leave the MIDI range refuses rather than clamping", () => {
  const high = { A: { lead: strToTrack("synth", "G9 " + "- ".repeat(15)) } };
  assert.equal(high.A.lead[0][0].n, 127, "G9 is the top of the range");
  assert.throws(() => transposePatterns(high, 1), RangeError);
  assert.doesNotThrow(() => transposePatterns(high, -1));
});

test("transposing C minor to F minor spells the expected notes", () => {
  const cMinor = { A: { bass: strToTrack("synth", "C3 - - - Eb3 - - - G3 - - - Bb3 - - -") } };
  const fMinor = transposePatterns(cMinor, semitonesBetweenKeys(0, 5));
  assert.equal(trackToStr("synth", fMinor.A.bass),
    "F3 - - - Ab3 - - - C4 - - - Eb4 - - -");
});

test("zero semitones is a copy, not a no-op reference", () => {
  const before = shippedPatterns();
  const after = transposePatterns(before, 0);
  assert.deepEqual(after, before);
  assert.notEqual(after.A, before.A, "banks are fresh objects");
});
