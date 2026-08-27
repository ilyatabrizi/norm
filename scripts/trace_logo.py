#!/usr/bin/env python3
"""Trace the NORM lockup from the client's raster into clean SVG.

The only master we have is a phone-sized JPEG of the logo — good enough to look
at, useless at 512px for an app icon or as a 24px header mark. This thresholds
it, walks every ink boundary as a crack path, simplifies with Douglas-Peucker
and writes vector.

Three files come out:

  mark.svg      the symbol alone — two eyes, the brow sweep, the dot, and the
                two green pupils as their own paths so the loader can dilate
                them independently of the black.
  wordmark.svg  N O R M + U N I T Y, one path per letter for staggered motion.
  lockup.svg    both, stacked, for the icon and the splash.

    python3 scripts/trace_logo.py

Pure stdlib + Pillow + numpy. No potrace on this machine.
"""

import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "src-logo.jpg"
OUT = ROOT / "assets" / "brand"

WORK_W = 1500     # trace width — the pupils are thin, resolution matters
LUMA_CUT = 120    # below this = ink
EPSILON = 2.2     # Douglas-Peucker tolerance, in working pixels
MIN_AREA = 90     # drop JPEG speckle
GREEN = "#2C6650"

sys.setrecursionlimit(60000)


# ---------------------------------------------------------------- masks
def load_masks(path, width):
    im = Image.open(path).convert("RGB")
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    green = (g - r > 18) & (g - b > 6) & (g > 40) & (luma < 170)
    ink = (luma < LUMA_CUT) & ~green
    return ink, green, width, h


def components(mask, drop_border=True):
    """4-connected blobs. Anything touching the frame is the phone screenshot's
    rounded corner, not the logo."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    blobs = []
    for sy in range(h):
        row = mask[sy]
        for sx in range(w):
            if not row[sx] or seen[sy][sx]:
                continue
            stack = [(sx, sy)]
            seen[sy][sx] = True
            cells = []
            touches = False
            while stack:
                x, y = stack.pop()
                cells.append((x, y))
                if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                    touches = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and mask[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if len(cells) >= MIN_AREA and not (drop_border and touches):
                blobs.append(cells)
    return blobs


# ------------------------------------------------------------- outlines
def trace_outline(cells):
    """Every closed ring bounding a blob — outer edge plus its counters.

    Walks the unit cracks between ink and space, directed so the interior stays
    on one side, then chains them head to tail. Exact where a Moore walk has to
    guess, and this mark is all thin diagonal pinches."""
    cellset = set(cells)
    edges = {}
    for x, y in cells:
        if (x, y - 1) not in cellset:
            edges.setdefault((x, y), []).append((x + 1, y))
        if (x + 1, y) not in cellset:
            edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if (x, y + 1) not in cellset:
            edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if (x - 1, y) not in cellset:
            edges.setdefault((x, y + 1), []).append((x, y))
    rings = []
    while edges:
        start = next(iter(edges))
        ring, node = [start], start
        while True:
            outs = edges.get(node)
            if not outs:
                break
            nxt = outs.pop()
            if not outs:
                del edges[node]
            if nxt == start:
                break
            ring.append(nxt)
            node = nxt
        if len(ring) >= 8:
            rings.append(ring)
    return rings


def _rdp_open(pts, eps):
    if len(pts) < 3:
        return pts
    x1, y1 = pts[0]
    x2, y2 = pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5
    worst, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        dist = (((px - x1) ** 2 + (py - y1) ** 2) ** 0.5 if norm < 1e-9
                else abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm)
        if dist > worst:
            worst, idx = dist, i
    if worst > eps:
        return _rdp_open(pts[:idx + 1], eps)[:-1] + _rdp_open(pts[idx:], eps)
    return [pts[0], pts[-1]]


def rdp(ring, eps):
    """Douglas-Peucker on a closed ring: split at the two farthest points first,
    or every distance is measured against a zero-length line."""
    if len(ring) < 6:
        return ring
    far = max(range(len(ring)),
              key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
    return _rdp_open(ring[:far + 1], eps)[:-1] + _rdp_open(ring[far:] + [ring[0]], eps)[:-1]


def smooth(ring, rounds=2):
    """Chaikin-ish corner cut. The logo is drawn with a brush — every outline is
    a curve, and RDP leaves them faceted."""
    for _ in range(rounds):
        out = []
        n = len(ring)
        for i in range(n):
            (x0, y0), (x1, y1) = ring[i], ring[(i + 1) % n]
            out.append((x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25))
            out.append((x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75))
        ring = out
    return ring


def to_path(rings, scale, ox, oy, prec=1):
    """Quadratic through the midpoints — smooth curves at a fraction of the
    bytes a polygon of the same fidelity would cost."""
    out = []
    for ring in rings:
        if len(ring) < 4:
            continue
        p = [((x - ox) * scale, (y - oy) * scale) for x, y in ring]
        n = len(p)
        mid = lambda i: (((p[i][0] + p[(i + 1) % n][0]) / 2), ((p[i][1] + p[(i + 1) % n][1]) / 2))
        sx, sy = mid(0)
        d = f"M{sx:.{prec}f} {sy:.{prec}f}"
        for i in range(1, n + 1):
            cx, cy = p[i % n]
            mx, my = mid(i % n)
            d += f"Q{cx:.{prec}f} {cy:.{prec}f} {mx:.{prec}f} {my:.{prec}f}"
        out.append(d + "Z")
    return "".join(out)


def paths_for(blob, scale, ox, oy):
    """Simplify hard, round the corners the simplification left, then drop the
    points the rounding made redundant. Two passes keep the curve and the bytes."""
    rings = []
    for ring in trace_outline(blob):
        ring = smooth(rdp(ring, EPSILON), rounds=1)
        rings.append(rdp(ring, EPSILON * 0.28))
    return to_path(rings, scale, ox, oy)


def as_circle(cells, scale, ox, oy):
    """The dot over the mark is a true circle in the original art; the JPEG puts
    a gloss highlight on it that traces as a notch. Fill area against bounding
    box says circle, so draw one and lose the artefact."""
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    if abs(w - h) > 0.08 * max(w, h) or len(cells) / (w * h) < 0.70:
        return None
    r = ((w + h) / 4)
    cx, cy = (min(xs) + max(xs) + 1) / 2, (min(ys) + max(ys) + 1) / 2
    return ((cx - ox) * scale, (cy - oy) * scale, r * scale)


def bounds(blobs):
    xs = [x for b in blobs for x, _ in b]
    ys = [y for b in blobs for _, y in b]
    return min(xs), min(ys), max(xs), max(ys)


def wrap(body, vw, vh, label, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.1f} {vh:.1f}" '
            f'fill="currentColor" role="img" aria-label="{label}"{extra}>{body}</svg>\n')


# ------------------------------------------------------------------ main
def main():
    ink, green, w, h = load_masks(SRC, WORK_W)
    ink_blobs = components(ink)
    pupils = components(green, drop_border=False)
    print(f"  {len(ink_blobs)} ink blobs, {len(pupils)} pupils from {w}x{h}")

    # The wordmark sits under the symbol with clear air between them; split on
    # the widest empty band in the lower half of the frame.
    rows = ink.sum(axis=1)
    lo, hi = int(h * 0.35), int(h * 0.75)
    band, run, best = None, None, 0
    for y in range(lo, hi):
        if rows[y] == 0:
            run = y if run is None else run
        elif run is not None:
            if y - run > best:
                best, band = y - run, (run + y) // 2
            run = None
    split = band if band else int(h * 0.6)
    symbol = [b for b in ink_blobs if sum(y for _, y in b) / len(b) < split]
    word = [b for b in ink_blobs if sum(y for _, y in b) / len(b) >= split]
    word.sort(key=lambda b: min(x for x, _ in b))
    print(f"  split at y={split}: {len(symbol)} symbol parts, {len(word)} letters")

    OUT.mkdir(parents=True, exist_ok=True)

    # --- the symbol -------------------------------------------------------
    ox, oy, mx, my = bounds(symbol + pupils)
    sw, sh = mx - ox + 1, my - oy + 1
    s = 1000 / sw
    # Big first: the brow sweep is the shape, the dot is punctuation.
    symbol.sort(key=len, reverse=True)
    pupils.sort(key=lambda b: min(x for x, _ in b))
    body = ""
    for i, b in enumerate(symbol):
        circ = as_circle(b, s, ox, oy)
        body += (f'<circle class="mk mk-{i}" cx="{circ[0]:.1f}" cy="{circ[1]:.1f}" '
                 f'r="{circ[2]:.1f}"/>' if circ else
                 f'<path class="mk mk-{i}" fill-rule="evenodd" '
                 f'd="{paths_for(b, s, ox, oy)}"/>')
    body += "".join(
        f'<path class="pupil pupil-{i}" fill="{GREEN}" d="{paths_for(b, s, ox, oy)}"/>'
        for i, b in enumerate(pupils))
    (OUT / "mark.svg").write_text(wrap(body, 1000, sh * s, "NORM"), encoding="utf-8")

    # --- the wordmark -----------------------------------------------------
    wox, woy, wmx, wmy = bounds(word)
    ws = 1000 / (wmx - wox + 1)
    letters = "".join(
        f'<path class="ch ch-{i}" fill-rule="evenodd" d="{paths_for(b, ws, wox, woy)}"/>'
        for i, b in enumerate(word))
    (OUT / "wordmark.svg").write_text(
        wrap(letters, 1000, (wmy - woy + 1) * ws, "NORM UNITY"), encoding="utf-8")

    # --- the two together, as drawn ---------------------------------------
    lox, loy, lmx, lmy = bounds(ink_blobs + pupils)
    ls = 1000 / (lmx - lox + 1)
    full = ""
    for b in ink_blobs:
        circ = as_circle(b, ls, lox, loy)
        full += (f'<circle cx="{circ[0]:.1f}" cy="{circ[1]:.1f}" r="{circ[2]:.1f}"/>'
                 if circ else f'<path fill-rule="evenodd" d="{paths_for(b, ls, lox, loy)}"/>')
    full += "".join(
        f'<path fill="{GREEN}" d="{paths_for(b, ls, lox, loy)}"/>' for b in pupils)
    (OUT / "lockup.svg").write_text(
        wrap(full, 1000, (lmy - loy + 1) * ls, "NORM UNITY"), encoding="utf-8")

    for f in ("mark.svg", "wordmark.svg", "lockup.svg"):
        print(f"  {f:14} {(OUT / f).stat().st_size / 1024:5.1f} KB")


if __name__ == "__main__":
    main()
