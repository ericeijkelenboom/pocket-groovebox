#!/usr/bin/env python3
"""Assemble the groovebox from src/ into the two pages it ships as.

    groovebox.html  the Claude Artifact source: content only, because the
                    platform supplies the document skeleton
    index.html      a standalone page for static hosting, with the skeleton and
                    the home-screen metadata

The JavaScript in src/js is concatenated in LOAD_ORDER into a single classic
script, so every module shares one scope and declaration order is what matters.
The pure modules at the top of that list are additionally written as real ES
modules — with imports and exports — so the tests can load them directly; this
script strips that syntax on the way in. See tests/ and the README.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"

#: Concatenation order. Dependencies first; the pure, individually testable
#: modules lead, then the live machine, then everything that touches the DOM.
LOAD_ORDER = [
    "config.js",      # static description of the machine: voices, scales, ranges
    "patterns.js",    # empty patterns, a fresh machine, the default song
    "notes.js",       # pitch maths            (pure, tested)
    "timing.js",      # tempo and swing maths  (pure, tested)
    "codec.js",       # the pattern-code format (pure, tested)
    "runtime.js",     # the one mutable state object
    "bindings.js",    # binds the pure functions to that state
    "engine.js",      # audio graph, buses, envelopes, noise
    "drums.js",       # the five drum voices
    "synth.js",       # the three synth voices, and the screen wake lock
    "transport.js",   # scheduler, playhead, follow-play
    "editing.js",     # placing and clearing steps and notes
    "render.js",      # every render and paint function
    "serialize.js",   # whole-machine read and write
    "storage.js",     # autosave and named save slots
    "share.js",       # links, file import and export
    "main.js",        # wiring and boot
]

IMPORT_LINE = re.compile(r"^\s*import\b[^;\n]*;\s*$", re.M)
EXPORT_KEYWORD = re.compile(r"^export\s+", re.M)


def as_classic_script(source: str) -> str:
    """Drop ES module syntax so the file can be concatenated into one scope."""
    return EXPORT_KEYWORD.sub("", IMPORT_LINE.sub("", source))


def bundle_js() -> str:
    parts = []
    for name in LOAD_ORDER:
        body = as_classic_script((SRC / "js" / name).read_text(encoding="utf-8"))
        parts.append(f"/* ---------- {name} ---------- */\n{body.strip()}\n")
        if name == "patterns.js":
            parts.append(default_song_module())
    return "\n".join(parts)


def default_song_module() -> str:
    """Inline songs/default.json as a constant.

    The song the page opens on is defined once, as data, in songs/default.json.
    The tests read that same file, so the shipped song and the song under test
    cannot drift apart.
    """
    song = (ROOT / "songs" / "default.json").read_text(encoding="utf-8").strip()
    return (
        "/* ---------- songs/default.json (generated) ---------- */\n"
        f"const DEFAULT_SONG = {song};\n"
    )


HEAD = (SRC / "head.html").read_text(encoding="utf-8").strip()
CSS = (SRC / "styles.css").read_text(encoding="utf-8").strip()
BODY = (SRC / "body.html").read_text(encoding="utf-8").strip()
JS = bundle_js()

CONTENT = f'{HEAD}\n<style>\n{CSS}\n</style>\n\n{BODY}\n\n<script>\n"use strict";\n{JS}</script>\n'

# The Artifact platform wraps this in its own document and sets the viewport, so
# the page declares only that it opts into the side safe-area handling.
ARTIFACT = CONTENT.replace(
    "<title>", '<meta name="claude:viewport-fit-sides" content="cover">\n<title>', 1
)

STANDALONE = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="MF-1">
<meta name="theme-color" content="#1b1d20">
<link rel="apple-touch-icon" href="icon.png">
<link rel="icon" type="image/png" href="icon.png">
<link rel="manifest" href="manifest.webmanifest">
<style>
:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0;font:14px system-ui,sans-serif}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
</head>
<body>
{CONTENT}</body>
</html>
"""

for path, text in (("groovebox.html", ARTIFACT), ("index.html", STANDALONE)):
    (ROOT / path).write_text(text, encoding="utf-8")
    print(f"{path:16} {(ROOT / path).stat().st_size:>7,} bytes")
