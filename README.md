# Pocket Groovebox MF-1

**[Play it &rarr;](https://ericeijkelenboom.github.io/pocket-groovebox/)**

A groovebox that runs in a browser. Eight voices, a 16-step sequencer, and eight
patterns chained into a song. No samples and no libraries — every sound is
synthesised with the Web Audio API, and the page ships as one self-contained
file with nothing to install.

Built to learn how hardware grooveboxes (Korg Volca, Novation Circuit, Roland
T-8, Teenage Engineering EP-133) actually work, before deciding whether to buy
one.

## Run it

Open [the live site](https://ericeijkelenboom.github.io/pocket-groovebox/), or
clone the repo and open `index.html` directly — it needs no server. Press Play;
sound starts on the first click, as browsers require.

## The voices

Five drum voices (kick, snare, closed hat, open hat, clap) are synthesised from
oscillators and filtered noise. Three synth voices (bass, lead, pad) each run two
detuned oscillators through a resonant lowpass with its own envelope. A
tempo-synced delay and a procedurally generated reverb sit on sends; the master
bus has a soft clipper and a compressor.

Each synth voice declares a `center` — the MIDI note its piano roll is built
around — so its Octave control stays a true transpose and a label on the roll
always names the pitch you hear.

Changing Key transposes the whole song by the shortest route — C to B goes down
one semitone, not up eleven — and applies while the transport is running. Scale
does not transpose: moving between, say, minor and major has no single correct
mapping for the notes that fall outside the new scale, so it stays a guide,
shading the piano roll rather than quietly rewriting the music.

Swing applies at a grid you choose. On the 1/8 grid every second eighth is
pushed late; on the 1/16 grid every second sixteenth is. A pattern written in
eighth notes will not swing on the 1/16 grid, because each of its notes is the
first of its pair.

## Pattern codes

The whole machine serialises to JSON. Drum rows are 16 characters: `.` rest,
`x` hit, `X` accent. Synth rows are 16 whitespace-separated tokens: a note name,
`-` for a rest, `+` to stack notes into a chord, `!` for an accent.

```json
{
  "bpm": 112,
  "swing": 0.55,
  "swingRes": 8,
  "pat": {
    "A": {
      "kick": "x...x...x...x...",
      "bass": "C3 - - - - - C3 - Ab2 - - - F2 - C2 -",
      "pad":  "Eb3+G3 - - - - - - - - - - - - - - -"
    }
  }
}
```

Pasting a code into the box merges it, so a code containing one drum row
replaces only that row — which makes codes easy to pass around as diffs. The
Load, Open file and link-sharing paths replace the whole machine instead.

## Storage

There is no backend, so a visitor's work lives in three places, each answering a
different question.

**Keep my work** — `localStorage`, both as an autosave written on every change
and restored on load, and as named slots to save, load and delete. The shipped
song is about 1 kB, so the usual 5 MB quota holds a few thousand. It is scoped
to one browser on one device and wiped by "clear site data", so it is
convenience, not backup. Note that `localStorage` is scoped per *origin*, not
per path: every project published under one `github.io` account shares a bucket,
hence the `mf1.` key prefix.

**Share this** — the URL hash. The shipped song deflates from 1,032 bytes to 362
and base64urls to 485 characters, which fits a link comfortably. `#s=` carries
the compressed form via the browser's own `CompressionStream('deflate-raw')`;
`#j=` is the uncompressed fallback. Opening a link loads that song over whatever
was there, putting the previous state into Undo first, then drops the fragment
so a later reload resumes your own autosave.

**Back it up** — Download and Open file, as plain JSON. Portable, diffable, and
the only form that survives a cleared browser.

Published as a Claude Artifact the named slots move to the artifact's document
store instead, so they persist across devices, and file saving uses the
`downloads` capability. Outside that environment `window.claude` is absent,
every capability call resolves to nothing, and the page falls back to the three
mechanisms above. The URL hash does not survive the artifact viewer, which
passes only a bare `#name`, so link sharing is a GitHub Pages feature.

## On a tablet

Open the site in Safari and use **Share &rarr; Add to Home Screen**. It then
launches without browser chrome, which suits a step sequencer, and the screen
stays awake while the transport runs.

Doing so also protects your work: Safari clears script-writable storage after
seven days without a visit, but a page installed to the home screen is exempt.
Export to a file if a song matters.

Touch targets grow under `(pointer: coarse)` — step buttons to 40px, piano roll
rows to 26px, pattern banks to 44px — and a fast double tap on the grid will not
be read as a zoom gesture. Note that iOS silences Web Audio entirely while the
device is in silent mode.

Pinch-zoom and the rubber-band bounce are suppressed only in an installed,
standalone launch, decided at runtime rather than in the markup. In a browser tab
zoom stays available, which is what it is there for — and iOS ignores the request
in a tab regardless, while Android Chrome would honour it.

## Development

```
npm test        # 51 tests, no dependencies
npm run build   # regenerate index.html and groovebox.html
```

Both need only Node and Python 3; there is nothing to install.

Everything under `src/` is source. The two HTML files at the repo root are built
from it and committed, so the site can be served without a build step in CI.

| Path | |
| --- | --- |
| `src/head.html` | title and web font |
| `src/body.html` | the markup |
| `src/styles.css` | the stylesheet |
| `src/js/*.js` | 22 modules, one concern each |
| `songs/default.json` | the song the page opens on — the only place it is defined |
| `tests/*.test.js` | the pure modules, and the build itself |
| `build.py` | assembles the two pages |
| `make_icon.py` | regenerates `icon.png` |
| `index.html` | **generated** — the standalone page |
| `groovebox.html` | **generated** — the Claude Artifact source |

### How the build works

`build.py` concatenates `src/js/*.js` in a declared order into a single classic
script, so the modules share one scope and that order is what resolves them.
`LOAD_ORDER` in `build.py` is that order, annotated with what each file owns, and
is the quickest map of the codebase.

A single file is a requirement rather than a preference: the page is also
published as a Claude Artifact, where external scripts are blocked. The same
constraint is why `groovebox.html` carries no `<html>` or `<head>` — the platform
supplies them. `build.py` adds them for `index.html`, along with the home-screen
metadata, which only applies to the hosted copy.

`songs/default.json` is inlined by the build rather than duplicated in
JavaScript, so the song that ships, the song in the repo and the song under test
are the same bytes.

### What is tested, and what is not

`notes.js`, `timing.js`, `codec.js` and the data in `config.js` and `patterns.js`
are written as real ES modules with imports and exports, so `node --test` loads
them directly. They take tempo, key and scale as arguments rather than reading
the live machine, which is what makes them testable; `bindings.js` binds them to
the current state in one place, so the rest of the app can keep asking about the
machine as it is. The build strips the module syntax on the way in.

That split is deliberate: the logic worth testing is pure and tested, and the
code that can only be judged with a browser and a pair of ears does not pretend
otherwise. Covered: pitch spelling, note parsing, scale membership, swing offsets
at both grids, and the pattern-code format, including a round-trip over every row
of the shipped song.

The browser code is covered indirectly, by testing what actually breaks when it
is rearranged. `tests/build.test.js` checks that the load order lists every
module and no module twice, that no name is declared in two of them — they share
one scope once concatenated, so a collision shadows silently — that no module
syntax survives into the bundle, that both pages are built from the same source,
and that the committed pages were built from the current `songs/default.json`
rather than a stale copy.

Those are structural checks, not behavioural ones. A change that alters *when*
something runs can still pass the whole suite and break the page, so changes to
the UI modules want a look in a browser.
