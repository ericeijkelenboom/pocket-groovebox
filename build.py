#!/usr/bin/env python3
"""Wrap groovebox.html into a standalone index.html.

groovebox.html is the canonical source and is what gets published as a Claude
Artifact, where the platform supplies the document skeleton. This script adds
that skeleton so the same page also works as a plain file on disk, and carries
the home-screen metadata, which only applies to the hosted copy.
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
BODY = (ROOT / "groovebox.html").read_text(encoding="utf-8")

SKELETON = """<!doctype html>
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
{body}
</body>
</html>
"""

out = ROOT / "index.html"
out.write_text(SKELETON.format(body=BODY), encoding="utf-8")
print(f"wrote {out.name} ({out.stat().st_size:,} bytes)")
