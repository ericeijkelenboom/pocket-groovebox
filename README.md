# Pocket Groovebox MF-1

A playable groovebox in a single HTML file. Eight voices, a 16-step sequencer,
eight patterns chained into a song. No dependencies, no build step, no samples —
every sound is synthesised with the Web Audio API.

Built as a way to learn how hardware grooveboxes (Korg Volca, Novation Circuit,
Roland T-8, Teenage Engineering EP-133) actually work, before deciding whether
to buy one.

## Run it

Open `index.html` in a browser. Press Play. Sound starts on the first click,
as browsers require.

## Layout

| Path | |
| --- | --- |
| `groovebox.html` | the canonical source — markup, styles and script in one file |
| `index.html` | generated standalone page; run `python3 build.py` after editing the source |
| `build.py` | wraps the source in a document skeleton |
| `songs/two-bars.json` | a saved song in the pattern-code format below |

`groovebox.html` deliberately has no `<html>`/`<head>`: it is also published as a
Claude Artifact, where the platform supplies those. `build.py` adds them so the
same page works as a plain file.

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

Work autosaves to `localStorage` on every change. Published as a Claude Artifact
it also writes to the artifact's document store, which gives named save slots
that survive across devices. Outside that environment `window.claude` is absent,
every capability call resolves to nothing, and the page falls back to
`localStorage` alone.

## Notes on the audio

Three bugs found while using it, all worth knowing if you write Web Audio:

- **`cancelScheduledValues` does not hold the current value.** It removes the
  in-flight ramp, and the parameter falls back to the last event that
  *completed* — usually the attack. Cancelling a fade-out therefore jumps the
  gain to peak. Use `cancelAndHoldAtTime`.
- **`AudioParam.value` is meaningless for automation scheduled in the future.**
  It reports the node's intrinsic value, not where the envelope will be. Reading
  it inside a release scheduled ahead of time returned `1` and gave every note a
  second attack 20-odd dB louder than the first.
- **Swing must be applied at a chosen grid.** Delaying every second 16th does
  nothing to a pattern written in 8th notes, because its notes are all on the
  first of each pair.
