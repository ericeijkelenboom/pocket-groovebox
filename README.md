# Pocket Groovebox MF-1

**[Play it &rarr;](https://ericeijkelenboom.github.io/pocket-groovebox/)**

A playable groovebox in a single HTML file. Eight voices, a 16-step sequencer,
eight patterns chained into a song. No dependencies, no build step, no samples —
every sound is synthesised with the Web Audio API.

Built as a way to learn how hardware grooveboxes (Korg Volca, Novation Circuit,
Roland T-8, Teenage Engineering EP-133) actually work, before deciding whether
to buy one.

## Run it

Live at **https://ericeijkelenboom.github.io/pocket-groovebox/**, or clone the
repo and open `index.html` in a browser. Press Play; sound starts on the first
click, as browsers require.

## Layout

| Path | |
| --- | --- |
| `groovebox.html` | the canonical source — markup, styles and script in one file |
| `index.html` | generated standalone page; run `python3 build.py` after editing the source |
| `build.py` | wraps the source in a document skeleton |
| `songs/default.json` | the song the page opens on, in the pattern-code format below |
| `make_icon.py` | regenerates `icon.png`, the home-screen icon |
| `manifest.webmanifest` | web app manifest, for installing to a home screen |

`groovebox.html` deliberately has no `<html>`/`<head>`: it is also published as a
Claude Artifact, where the platform supplies those. `build.py` adds them so the
same page works as a plain file.

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

## The voices

Five drum voices (kick, snare, closed hat, open hat, clap) are synthesised from
oscillators and filtered noise. Three synth voices (bass, lead, pad) each run two
detuned oscillators through a resonant lowpass with its own envelope. A
tempo-synced delay and a procedurally generated reverb sit on sends; the master
bus has a soft clipper and a compressor.

Each synth voice declares a `center` — the MIDI note its piano roll is built
around — so its Octave control stays a true transpose and a label on the roll
always names the pitch you hear.

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

Loading a code merges it, so a code containing one drum row replaces only that
row. That makes codes easy to pass around as diffs.

## Storage

There is no backend, so a visitor's work lives in three places, each answering a
different question.

**Keep my work** — `localStorage`, written on every change and restored on load.
A song is about 790 bytes, so the ~5 MB quota holds thousands. Scoped to one
browser on one device and wiped by "clear site data", so it is convenience, not
backup. Note that `localStorage` is scoped per *origin*, not per path: every
project published under one `github.io` account shares a bucket, hence the
`mf1.` key prefix.

**Share this** — the URL hash. A song deflates to about 335 bytes and base64urls
to roughly 450 characters, which fits a link comfortably. `#s=` carries the
compressed form via the browser's own `CompressionStream('deflate-raw')`; `#j=`
is the uncompressed fallback. Opening a link loads that song over whatever was
there, putting the previous state into Undo first.

**Back it up** — Download and Open file, as plain JSON. Portable, diffable, and
the only form that survives a cleared browser.

Published as a Claude Artifact the page additionally writes to the artifact's
document store, giving named save slots that persist across devices, and uses
the `downloads` capability for saving files. Outside that environment
`window.claude` is absent, every capability call resolves to nothing, and the
page falls back to the three mechanisms above. The URL hash does not survive the
artifact viewer, which passes only a bare `#name`, so link sharing is a
GitHub Pages feature.
