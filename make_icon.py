#!/usr/bin/env python3
"""Generate icon.png — a 180x180 home-screen icon showing four lit step rows.

Written with the standard library only: a PNG is a signature plus length-tagged,
CRC-checked chunks around zlib-compressed scanlines.
"""
import colorsys, pathlib, struct, zlib

SIZE, CELL, GAP = 180, 28, 10
BG       = (0x1b, 0x1d, 0x20)
OFF      = (0x34, 0x37, 0x3c)
HUES     = [12, 38, 196, 268]                       # kick, hat, bass, lead
LIT      = [[1, 1, 1, 1],                           # four on the floor
            [0, 1, 0, 1],                           # backbeat
            [1, 0, 1, 0],
            [0, 0, 1, 0]]

def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))

def write_png(path, pixels):
    raw = b"".join(b"\x00" + b"".join(bytes(px) for px in row) for row in pixels)
    def chunk(tag, body):
        return (struct.pack(">I", len(body)) + tag + body
                + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF))
    pathlib.Path(path).write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b""))

span  = 4 * CELL + 3 * GAP
start = (SIZE - span) // 2
grid  = [[BG] * SIZE for _ in range(SIZE)]
for r, (hue, row) in enumerate(zip(HUES, LIT)):
    on = hsl(hue, 0.72, 0.52)
    for c, is_on in enumerate(row):
        colour = on if is_on else OFF
        y0, x0 = start + r * (CELL + GAP), start + c * (CELL + GAP)
        for y in range(y0, y0 + CELL):
            for x in range(x0, x0 + CELL):
                grid[y][x] = colour

write_png("icon.png", grid)
print(f"icon.png written ({pathlib.Path('icon.png').stat().st_size:,} bytes)")
