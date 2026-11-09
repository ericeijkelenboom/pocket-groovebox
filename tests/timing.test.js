import { test } from "node:test";
import assert from "node:assert/strict";
import { sixteenthSeconds, swingShiftSeconds, swingMilliseconds } from "../src/js/timing.js";

const BPM = 112;
const ms = s => Math.round(s * 1000);

test("a sixteenth is a quarter of a beat", () => {
  assert.equal(sixteenthSeconds(120), 0.125);
  assert.equal(ms(sixteenthSeconds(BPM)), 134);
  assert.equal(ms(sixteenthSeconds(BPM) * 16), 2143, "a bar at 112 BPM");
});

test("straight means straight", () => {
  for (let step = 1; step <= 16; step++) {
    assert.equal(swingShiftSeconds(step, 0.5, 8, BPM), 0);
    assert.equal(swingShiftSeconds(step, 0.5, 16, BPM), 0);
    assert.equal(swingShiftSeconds(step, 0.4, 8, BPM), 0, "below 50% is also straight");
  }
});

test("the 1/8 grid moves the second eighth of each beat", () => {
  const moved = [];
  for (let step = 1; step <= 16; step++)
    if (swingShiftSeconds(step, 0.58, 8, BPM) > 0) moved.push(step);
  assert.deepEqual(moved, [3, 7, 11, 15]);
});

test("the 1/16 grid moves the off sixteenths instead", () => {
  const moved = [];
  for (let step = 1; step <= 16; step++)
    if (swingShiftSeconds(step, 0.58, 16, BPM) > 0) moved.push(step);
  assert.deepEqual(moved, [2, 4, 6, 8, 10, 12, 14, 16]);
});

test("an eighth-note pattern does not swing on the 1/16 grid", () => {
  // The bug this exists to prevent: notes on 3, 7, 11, 15 are each the FIRST of
  // their sixteenth pair, so a 1/16 swing leaves every one of them alone.
  for (const step of [3, 7, 11, 15])
    assert.equal(swingShiftSeconds(step, 0.75, 16, BPM), 0);
});

test("two thirds of the way through is a triplet shuffle", () => {
  const s16 = sixteenthSeconds(BPM), beat = s16 * 4;
  const eighth = swingShiftSeconds(3, 2 / 3, 8, BPM) + 2 * s16;
  assert.ok(Math.abs(eighth / beat - 2 / 3) < 1e-9, "the swung eighth lands at 2/3 of the beat");
  const pair = s16 * 2;
  const sixteenth = swingShiftSeconds(2, 2 / 3, 16, BPM) + s16;
  assert.ok(Math.abs(sixteenth / pair - 2 / 3) < 1e-9, "and the same holds on the 1/16 grid");
});

test("the shift never exceeds the grid it swings", () => {
  for (const res of [8, 16])
    for (let step = 1; step <= 16; step++) {
      const span = sixteenthSeconds(BPM) * (res === 8 ? 4 : 2);
      assert.ok(swingShiftSeconds(step, 0.75, res, BPM) <= span / 2 + 1e-12);
    }
});

test("the millisecond readout matches the shift it reports", () => {
  for (const swing of [0.5, 0.55, 0.58, 2 / 3, 0.75])
    for (const res of [8, 16]) {
      const movedStep = res === 8 ? 3 : 2;
      assert.equal(swingMilliseconds(swing, res, BPM),
                   ms(swingShiftSeconds(movedStep, swing, res, BPM)));
    }
});

test("swing scales with tempo", () => {
  assert.ok(swingMilliseconds(0.58, 8, 90) > swingMilliseconds(0.58, 8, 140),
            "the same feel is more milliseconds at a slower tempo");
});
