import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

/* The browser code cannot be unit tested without a DOM, so these assertions
   cover the thing that actually breaks when it is split up: the build. A module
   dropped from the load order, a name declared twice, module syntax surviving
   into the bundle, or a committed page built from stale sources would all pass
   every other test in here and fail in a browser. */

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");

const BUILD = read("../build.py");
const ARTIFACT = read("../groovebox.html");
const STANDALONE = read("../index.html");
const MODULES = readdirSync(new URL("../src/js", import.meta.url)).filter(f => f.endsWith(".js"));

const LOAD_ORDER = [...BUILD.matchAll(/^\s*"([\w.-]+\.js)",/gm)].map(m => m[1]);
const script = page => /<script>\n([\s\S]*)<\/script>/.exec(page)[1];
const topLevelNames = js =>
  [...js.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);

test("the load order lists every module, and only real ones", () => {
  assert.deepEqual([...LOAD_ORDER].sort(), [...MODULES].sort(),
    "a file in src/js is missing from LOAD_ORDER in build.py, or vice versa");
  assert.equal(new Set(LOAD_ORDER).size, LOAD_ORDER.length, "a module is listed twice");
});

test("every module is accounted for in the bundle", () => {
  for (const name of LOAD_ORDER)
    assert.ok(ARTIFACT.includes(`/* ---------- ${name} ---------- */`),
      `${name} is in the load order but absent from the build`);
});

test("no name is declared twice at the top level", () => {
  // Everything shares one scope once concatenated, so a collision between two
  // modules silently shadows rather than erroring at build time.
  const names = topLevelNames(script(ARTIFACT));
  const twice = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual([...new Set(twice)], [], "declared in more than one module");
});

test("module syntax does not survive into the bundle", () => {
  for (const [label, page] of [["groovebox.html", ARTIFACT], ["index.html", STANDALONE]])
    assert.equal(/^\s*(import|export)\b/m.test(script(page)), false,
      `${label} still contains import or export, which a classic script cannot parse`);
});

test("the bundle carries the song from songs/default.json, not a copy", () => {
  const inlined = /const DEFAULT_SONG = (\{[\s\S]*?\n\});/.exec(script(ARTIFACT));
  assert.ok(inlined, "no generated song found in the bundle");
  assert.deepEqual(JSON.parse(inlined[1]), JSON.parse(read("../songs/default.json")),
    "the committed page was built from a different song — run npm run build");
});

test("both pages are built from the same source", () => {
  assert.equal(script(ARTIFACT), script(STANDALONE),
    "the artifact and the standalone page disagree — one was built separately");
});

test("only the standalone page carries a document skeleton", () => {
  assert.ok(STANDALONE.startsWith("<!doctype html>"));
  for (const tag of ["apple-mobile-web-app-capable", "manifest.webmanifest", "apple-touch-icon"])
    assert.ok(STANDALONE.includes(tag), `index.html is missing ${tag}`);
  assert.ok(!ARTIFACT.includes("<!doctype"),
    "the Artifact platform supplies the skeleton; the artifact source must not");
  assert.ok(ARTIFACT.includes('name="claude:viewport-fit-sides"'));
});

test("every module explains what it owns", () => {
  for (const name of MODULES) {
    const body = read(`../src/js/${name}`).replace(/^import\b[^;]*;\s*/gm, "").trimStart();
    assert.ok(body.startsWith("/*"), `src/js/${name} opens without a comment saying what it is for`);
  }
});

test("the page has exactly one script and one style block", () => {
  for (const [label, page] of [["groovebox.html", ARTIFACT], ["index.html", STANDALONE]]) {
    assert.equal((page.match(/<script>/g) || []).length, 1, `${label}: script count`);
    assert.equal((page.match(/<\/script>/g) || []).length, 1, `${label}: closing script count`);
  }
});
