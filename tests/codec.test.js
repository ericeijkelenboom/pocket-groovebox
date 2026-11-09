import { test } from "node:test";
import assert from "node:assert/strict";
import { trackToStr, strToTrack } from "../src/js/codec.js";
import { nameToMidi } from "../src/js/notes.js";
import { readFileSync } from "node:fs";

/* The same file the build inlines, so these assertions cover what ships. */
const DEFAULT_SONG = JSON.parse(
  readFileSync(new URL("../songs/default.json", import.meta.url), "utf8"));

const DRUMS = ["kick", "snare", "chat", "ohat", "clap"];
const isDrum = id => DRUMS.includes(id);

test("a drum row reads rest, hit and accent", () => {
  assert.deepEqual(strToTrack("drum", "x...X..........."),
    [1,0,0,0, 2,0,0,0, 0,0,0,0, 0,0,0,0]);
});

test("a drum row is always 16 steps", () => {
  assert.equal(strToTrack("drum", "x").length, 16, "short input is padded");
  assert.equal(strToTrack("drum", "x".repeat(40)).length, 16, "long input is cut");
  assert.deepEqual(strToTrack("drum", ""), new Array(16).fill(0));
});

test("- and _ are rests too", () => {
  assert.deepEqual(strToTrack("drum", "x-x_x...x...x..."),
                   strToTrack("drum", "x.x.x...x...x..."));
});

test("a synth row reads notes, rests, chords and accents", () => {
  const row = strToTrack("synth", "C4 - Eb4+G4 - - - - - - - - - - - - Bb3!");
  assert.deepEqual(row[0], [{ n: nameToMidi("C4"), v: 0.85 }]);
  assert.equal(row[1], null);
  assert.deepEqual(row[2].map(x => x.n), [nameToMidi("Eb4"), nameToMidi("G4")]);
  assert.equal(row[15][0].v, 1.0, "! is an accent");
});

test("unparseable tokens become rests rather than throwing", () => {
  const row = strToTrack("synth", "H9 - zzz - - - - - - - - - - - - -");
  assert.equal(row[0], null);
  assert.equal(row[2], null);
});

test("a synth row is 16 steps however many tokens arrive", () => {
  assert.equal(strToTrack("synth", "C4").length, 16);
  assert.equal(strToTrack("synth", ("C4 ").repeat(40)).length, 16);
});

test("drum rows round-trip", () => {
  for (const s of ["x...x...x...x...", "..x...X...x...x.", "................",
                   "XXXXXXXXXXXXXXXX", "..............x."])
    assert.equal(trackToStr("drum", strToTrack("drum", s)), s);
});

test("synth rows round-trip, with chord notes ordered low to high", () => {
  for (const s of ["C4 - - - - - - - - - - - - - - -",
                   "Eb3+G3 - - - - - - - - - - - - - - -",
                   "- - G4 - - - Ab4 - - - Bb4 - G4 - - -",
                   "Bb3! - - - - - - - - - - - - - - -"])
    assert.equal(trackToStr("synth", strToTrack("synth", s)), s);
  assert.equal(trackToStr("synth", strToTrack("synth", "G3+Eb3 " + "- ".repeat(15))).trim(),
               ("Eb3+G3 " + "- ".repeat(15)).trim(), "a chord is written low note first");
});

test("every row of the shipped song survives a round-trip", () => {
  for (const [bar, rows] of Object.entries(DEFAULT_SONG.pat))
    for (const [id, row] of Object.entries(rows)) {
      const type = isDrum(id) ? "drum" : "synth";
      assert.equal(trackToStr(type, strToTrack(type, row)), row, `${bar}.${id}`);
    }
});

test("the shipped song is sixteen steps everywhere", () => {
  for (const [bar, rows] of Object.entries(DEFAULT_SONG.pat))
    for (const [id, row] of Object.entries(rows)) {
      const len = isDrum(id) ? row.length : row.trim().split(/\s+/).length;
      assert.equal(len, 16, `${bar}.${id} has ${len} steps`);
    }
});

test("every pattern the song chains actually exists", () => {
  for (const letter of DEFAULT_SONG.song.trim().split(/\s+/))
    assert.ok(DEFAULT_SONG.pat[letter], `pattern ${letter} is chained but missing`);
});
