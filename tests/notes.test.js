import { test } from "node:test";
import assert from "node:assert/strict";
import { mtof, midiToName, nameToMidi, degree, isInScale, isKeyRoot, rootNear }
  from "../src/js/notes.js";

test("mtof anchors on A4 = 440 Hz", () => {
  assert.equal(mtof(69), 440);
  assert.equal(Math.round(mtof(57)), 220);          // an octave below
  assert.equal(Math.round(mtof(36) * 10) / 10, 65.4); // C2, the song's bass root
});

test("midiToName spells notes with flats", () => {
  assert.equal(midiToName(60), "C4");
  assert.equal(midiToName(63), "Eb4");
  assert.equal(midiToName(24), "C1");
  assert.equal(midiToName(0), "C-1");
});

test("nameToMidi accepts sharps, flats and either case", () => {
  assert.equal(nameToMidi("C4"), 60);
  assert.equal(nameToMidi("Eb4"), 63);
  assert.equal(nameToMidi("D#4"), 63, "sharps and flats agree");
  assert.equal(nameToMidi("c4"), 60);
  assert.equal(nameToMidi(" Ab2 "), 44, "surrounding space is ignored");
});

test("nameToMidi rejects anything that is not a note", () => {
  for (const bad of ["H4", "", "-", "x", "C", "4", "Cb#4", null, undefined])
    assert.equal(nameToMidi(bad), null, `${bad} should not parse`);
});

test("nameToMidi stays inside the MIDI range", () => {
  assert.equal(nameToMidi("C-2"), null, "below 0");
  assert.equal(nameToMidi("C10"), null, "above 127");
  assert.equal(nameToMidi("G9"), 127, "the very top is valid");
});

test("name and number round-trip for every MIDI note", () => {
  for (let m = 0; m <= 127; m++)
    assert.equal(nameToMidi(midiToName(m)), m, `round trip failed at ${m}`);
});

test("degree measures semitones above the key's root", () => {
  assert.equal(degree(60, 0), 0);     // C in C
  assert.equal(degree(63, 0), 3);     // Eb in C is the minor third
  assert.equal(degree(60, 5), 7);     // C in F is the fifth
  assert.equal(degree(0, 11), 1, "wraps below the root without going negative");
});

test("isInScale knows C natural minor", () => {
  const inC = m => isInScale(m, 0, "Natural minor");
  for (const n of ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4"])
    assert.ok(inC(nameToMidi(n)), `${n} is in C minor`);
  for (const n of ["Db4", "E4", "Gb4", "A4", "B4"])
    assert.ok(!inC(nameToMidi(n)), `${n} is outside C minor`);
});

test("isInScale follows the key", () => {
  const a = nameToMidi("A4");
  assert.ok(isInScale(a, 9, "Natural minor"), "A is the root of A minor");
  assert.ok(!isInScale(a, 0, "Natural minor"), "A is outside C minor");
  assert.ok(isInScale(nameToMidi("Ab4"), 5, "Natural minor"), "F minor takes Ab, not A");
  assert.ok(!isInScale(a, 5, "Natural minor"), "and so excludes A");
});

test("isInScale admits everything for an unknown scale", () => {
  assert.ok(isInScale(61, 0, "Not a scale"));
});

test("minor pentatonic is a subset of natural minor", () => {
  for (let m = 0; m < 12; m++)
    if (isInScale(m, 0, "Minor pentatonic"))
      assert.ok(isInScale(m, 0, "Natural minor"), `${midiToName(m)} should be in both`);
});

test("isKeyRoot ignores octave", () => {
  for (const n of ["C1", "C2", "C4", "C7"]) assert.ok(isKeyRoot(nameToMidi(n), 0));
  assert.ok(!isKeyRoot(nameToMidi("C4"), 1));
});

test("rootNear finds the key root at or below a voice's centre", () => {
  assert.equal(midiToName(rootNear(40, 0)), "C2", "bass centre lands on C2");
  assert.equal(midiToName(rootNear(60, 0)), "C4", "lead centre is already a root");
  assert.equal(midiToName(rootNear(56, 0)), "C3", "pad centre lands on C3");
  for (let centre = 24; centre <= 96; centre++)
    for (let key = 0; key < 12; key++) {
      const r = rootNear(centre, key);
      assert.ok(isKeyRoot(r, key), "result is a root");
      assert.ok(r <= centre && centre - r < 12, "and is the nearest one at or below");
    }
});
