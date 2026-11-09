# Pocket Groovebox MF-1

**[Play it](https://ericeijkelenboom.github.io/pocket-groovebox/)**

A groovebox that runs in a browser. Eight voices, a 16-step sequencer, eight
patterns you can chain into a song. No samples and no libraries: every sound is
made with the Web Audio API, and the whole thing ships as one self-contained
file.

I built it to find out how hardware grooveboxes actually work before deciding
whether to buy one.

## Run it

Open [the live site](https://ericeijkelenboom.github.io/pocket-groovebox/), or
clone the repo and open `index.html`. No server needed. Press Play; sound starts
on your first click, because browsers insist on that.

## The voices

Five drum voices: kick, snare, closed hat, open hat, clap. All built from
oscillators and filtered noise rather than samples. Three synth voices (bass,
lead, pad) each run two detuned oscillators into a resonant lowpass with its own
envelope. A tempo-synced delay and a generated reverb sit on sends. The master
bus gets a soft clipper and a compressor.

Each synth voice has a `center`, the MIDI note its piano roll is built around.
The roll opens in that voice's own register instead of somewhere arbitrary, and
Octave stays a true transpose. Labels name the written pitch, so at Octave 0
they name what you hear too. At Octave −1 a note written A2 sounds A1.

Key transposes the whole song by the shortest route, so C to B goes down a
semitone rather than up eleven, and it works while the sequencer is running.
Scale does not transpose. There is no single right way to move notes that fall
outside a new scale, so Scale only shades the piano roll and leaves the music
alone.

Swing applies at a grid you pick. On the 1/8 grid every second eighth is pushed
late; on the 1/16 grid every second sixteenth is. Write a pattern in eighth
notes and the 1/16 setting does nothing whatsoever, because each of its notes is
the first of its pair. That one caught me out for a while.

## Pattern codes

The machine serialises to JSON. A drum row is 16 characters: `.` rest, `x` hit,
`X` accent. A synth row is 16 tokens separated by spaces, where a token is a
note name, `-` for a rest, `+` to stack notes into a chord, or `!` for an
accent.

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

Paste a code into the box and it merges, so a code holding one drum row
replaces only that row. Handy for passing patterns around as diffs. Load, Open
file and shared links replace everything instead.

## Storage

There is no backend, so a visitor's work lives in three places.

Browser storage keeps your work between visits. A rolling autosave is written on
every change, and named slots let you save, load and delete whole songs. A song
runs to about a kilobyte, so the usual 5 MB quota holds thousands of them. It is
one browser on one device, and "clear site data" wipes it, so treat it as
convenience rather than backup. One trap worth knowing: localStorage is scoped
per origin, not per path, so every project on a `github.io` account shares a
bucket. Hence the `mf1.` prefix on every key.

The URL hash handles sharing. The shipped song is 1,032 bytes of JSON, 362 once
deflated, 485 characters after base64url, which fits inside a link with room to
spare. `#s=` carries the compressed form through the browser's own
`CompressionStream`; `#j=` is the plain fallback. Opening a link loads that song
over whatever you had and puts the old state into Undo, then drops the fragment,
so a later reload resumes your own autosave instead of importing again.

Download and Open file are the real backup, as plain JSON. That is the only form
that survives a cleared browser.

Published as a Claude Artifact, the named slots move into the artifact's own
document store and persist across devices, and saving files goes through the
`downloads` capability. Everywhere else `window.claude` is absent, every
capability call resolves to nothing, and the page falls back to the three
mechanisms above. The URL hash does not survive the artifact viewer, which
passes only a bare `#name`, so link sharing is a GitHub Pages feature.

## On a tablet

Open the site in Safari, then Share and Add to Home Screen. It launches with no
browser chrome, which suits a step sequencer, and the screen stays awake while
the sequencer runs.

That also protects your work. Safari clears script-writable storage after seven
days without a visit, but a page installed to the home screen is exempt. Export
anything you would be sad to lose.

Touch targets grow under `(pointer: coarse)`: step buttons to 40px, piano roll
rows to 26px, pattern banks to 44px. A fast double tap on the grid is not read
as a zoom. Also worth knowing, since it will catch you once: iOS silences Web
Audio completely while the device is in silent mode, with no warning.

Pinch-zoom and the rubber-band bounce are suppressed only in an installed
launch, decided at runtime rather than written into the markup. Zoom stays
available in a browser tab, which is what it is there for. iOS ignores the
request in a tab anyway, while Android Chrome would honour it, and that is the
whole reason for the distinction.

## Development

```
npm test        # 51 tests, no dependencies
npm run build   # regenerate index.html and groovebox.html
```

Node and Python 3. Nothing to install.

Everything under `src/` is source. The two HTML files at the root are built from
it and committed, so the site needs no build step in CI.

| Path | |
| --- | --- |
| `src/head.html` | title and web font |
| `src/body.html` | the markup |
| `src/styles.css` | the stylesheet |
| `src/js/*.js` | 22 modules, one concern each |
| `songs/default.json` | the song the page opens on, defined here and nowhere else |
| `tests/*.test.js` | the pure modules, and the build itself |
| `build.py` | assembles the two pages |
| `make_icon.py` | regenerates `icon.png` |
| `index.html` | generated: the standalone page |
| `groovebox.html` | generated: the Claude Artifact source |

### How the build works

`build.py` concatenates `src/js/*.js` in a declared order into one classic
script. The modules share a single scope, and that order is what resolves them.
`LOAD_ORDER` in `build.py` is the order itself, annotated with what each file
owns, and it is the quickest way to get your bearings in the codebase.

One file is a requirement rather than a preference. The page is also published as
a Claude Artifact, where external scripts are blocked. Same reason
`groovebox.html` carries no `<html>` or `<head>`: the platform supplies them.
`build.py` adds them for `index.html`, along with the home-screen metadata, which
only applies to the hosted copy.

`songs/default.json` is inlined by the build instead of being copied into
JavaScript. The song that ships, the song in the repo and the song under test
are the same bytes. They were not always, which is how this arrangement came
about.

### What is tested, and what is not

`notes.js`, `timing.js`, `codec.js` and the data in `config.js` and
`patterns.js` are real ES modules with imports and exports, so `node --test`
loads them directly. They take tempo, key and scale as arguments instead of
reading the live machine, which is what makes them testable. `bindings.js` ties
them to the current state in one place, so everything else can go on asking
about the machine as it is. The build strips the module syntax on the way in.

Covered: pitch spelling, note parsing, scale membership, transposition, swing
offsets at both grids, and the pattern-code format, including a round-trip over
every row of the shipped song.

The browser code has no DOM to test against, so the build gets tested instead.
`tests/build.test.js` checks that the load order lists every module and no
module twice, that no name is declared in two of them (they share one scope once
concatenated, so a collision shadows in silence), that no module syntax survives
into the bundle, that both pages come from the same source, and that the
committed pages were built from the current `songs/default.json`.

Those are structural checks and they say nothing about behaviour. A change that
alters when something runs will pass the whole suite and still break the page,
so anything touching the UI modules wants a look in a browser.
