#!/usr/bin/env python3
"""Everything derived from the client's four source files.

    python3 scripts/build_assets.py

  * traces the logo (scripts/trace_logo.py) into assets/brand/*.svg
  * inlines the mark and the wordmark into index.html and js/brand.js, so the
    opening animation runs on the first frame with nothing left to fetch
  * crops the two photographs and keeps their own colour — the warm light in
    them is the room, and the interface is quiet enough to sit under it
  * renders every PWA icon, the maskable pair, and the share card

Pure stdlib + Pillow + headless Chrome. No ImageMagick, no cwebp.
"""

import pathlib
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts"
BRAND = ROOT / "assets" / "brand"
ICONS = ROOT / "assets" / "icons"
PHOTOS = ROOT / "assets" / "photos"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAPER = "#12100E"      # the icon matches the app: the mark in cream on black
INK = "#F4F0E9"
GREEN = "#2C6650"

ICON_SIZES = [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512]


# --------------------------------------------------------------------- trace
def run_tracer():
    subprocess.run([sys.executable, str(SRC / "trace_logo.py")], check=True)


# -------------------------------------------------------------------- photos
def graded(im, contrast=1.03):
    """The client's own colour, with the faintest contrast lift so it does not
    go flat against a dark page. No filter, no duotone, no treatment."""
    return ImageEnhance.Contrast(im.convert("RGB")).enhance(contrast)


def save_pair(im, stem, quality=84):
    PHOTOS.mkdir(parents=True, exist_ok=True)
    im.save(PHOTOS / f"{stem}.jpg", quality=quality, optimize=True, progressive=True)
    im.save(PHOTOS / f"{stem}.webp", quality=quality, method=6)
    jpg = (PHOTOS / f"{stem}.jpg").stat().st_size / 1024
    webp = (PHOTOS / f"{stem}.webp").stat().st_size / 1024
    print(f"  {stem:12} {im.width}x{im.height}  jpg {jpg:5.0f}KB  webp {webp:5.0f}KB")


def build_photos():
    # The client's matcha frame is a finished poster — the type is burnt into
    # the left third and the wordmark sits low centre. Crop past both and the
    # photograph underneath is clean.
    matcha = Image.open(SRC / "src-matcha.jpg").crop((520, 30, 1179, 1120))
    save_pair(graded(matcha), "portrait", quality=88)

    # The home hero wants as much of that frame as the burnt type allows: the
    # copy ends at x≈440 and the wordmark starts at y≈1250, so this is the
    # largest clean rectangle in the file. Tall enough to stand behind the
    # opening screen without being scaled past its own pixels on a 2× phone.
    hero = Image.open(SRC / "src-matcha.jpg").crop((445, 0, 1179, 1240))
    save_pair(graded(hero), "hero", quality=86)

    street = Image.open(SRC / "src-street.jpg")
    save_pair(graded(street), "street", quality=88)


# --------------------------------------------------------------------- icons
def render_png(html, width, height, out, scale=1):
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / "icon.html"
        page.write_text(html, encoding="utf-8")
        shot = pathlib.Path(tmp) / "shot.png"
        subprocess.run([
            CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
            f"--screenshot={shot}", f"--window-size={width},{height}",
            f"--force-device-scale-factor={scale}",
            "--default-background-color=00000000", str(page),
        ], check=True, capture_output=True)
        out.parent.mkdir(parents=True, exist_ok=True)
        Image.open(shot).convert("RGBA").save(out)


def icon_html(size, bg, fg, pad, mark=None, radius=0, pupils=True):
    art = (mark or (BRAND / "mark.svg").read_text(encoding="utf-8"))
    if not pupils:                       # silhouette variant for themed icons
        art = re.sub(r'fill="#2C6650"', 'fill="currentColor"', art)
    return f"""<!doctype html><meta charset="utf-8"><style>
      html,body{{margin:0;width:{size}px;height:{size}px}}
      body{{background:{bg};display:grid;place-items:center;border-radius:{radius}px;
            overflow:hidden}}
      .a{{width:{size - pad * 2}px;color:{fg};display:grid;place-items:center}}
      svg{{width:100%;height:auto;display:block}}
    </style><div class="a">{art}</div>"""


def build_icons():
    for size in ICON_SIZES:
        pad = max(6, round(size * 0.17))
        render_png(icon_html(size, PAPER, INK, pad), size, size,
                   ICONS / f"icon-{size}.png")
    # iOS applies its own mask, so the art needs air but not a safe circle.
    render_png(icon_html(180, PAPER, INK, 30), 180, 180, ICONS / "apple-touch-icon.png")
    # Android maskable: everything must survive a circle crop at 80%.
    for size in (192, 512):
        render_png(icon_html(size, PAPER, INK, round(size * 0.26)), size, size,
                   ICONS / f"maskable-{size}.png")
    # Themed / monochrome: one flat silhouette, no green.
    render_png(icon_html(512, "transparent", "#000", 90, pupils=False), 512, 512,
               ICONS / "icon-mono-512.png")
    print(f"  {len(ICON_SIZES) + 4} icons")


def build_og():
    lockup = (BRAND / "lockup.svg").read_text(encoding="utf-8")
    html = f"""<!doctype html><meta charset="utf-8"><style>
      html,body{{margin:0;width:1200px;height:630px}}
      body{{background:{PAPER};color:{INK};display:grid;place-items:center;
            font-family:-apple-system,system-ui,sans-serif;position:relative}}
      .glow{{position:absolute;left:50%;top:46%;width:680px;height:680px;
        transform:translate(-50%,-50%);border-radius:50%;
        background:radial-gradient(circle,rgba(46,108,84,.34),transparent 64%)}}
      .a{{width:420px;position:relative}}
      svg{{width:100%;height:auto}}
      .cap{{position:absolute;bottom:54px;left:0;right:0;text-align:center;
        font-size:15px;letter-spacing:.42em;text-transform:uppercase;color:#A29A91}}
    </style><div class="glow"></div><div class="a">{lockup}</div>
    <div class="cap">Tabriz · Valiasr</div>"""
    render_png(html, 1200, 630, BRAND / "og.png")
    Image.open(BRAND / "og.png").convert("RGB").save(
        BRAND / "og.jpg", quality=88, optimize=True)
    (BRAND / "og.png").unlink()
    print("  og.jpg")


# ------------------------------------------------------------------- inline
def inline_brand():
    """The boot screen cannot wait for a network round trip, and neither can the
    header mark on a cold load. Both get written straight into the files."""
    mark = (BRAND / "mark.svg").read_text(encoding="utf-8").strip()
    word = (BRAND / "wordmark.svg").read_text(encoding="utf-8").strip()
    lock = (BRAND / "lockup.svg").read_text(encoding="utf-8").strip()

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = re.sub(r"<!--MARK-->.*?<!--/MARK-->", f"<!--MARK-->{mark}<!--/MARK-->",
                  html, flags=re.S)
    html = re.sub(r"<!--WORDMARK-->.*?<!--/WORDMARK-->",
                  f"<!--WORDMARK-->{word}<!--/WORDMARK-->", html, flags=re.S)
    (ROOT / "index.html").write_text(html, encoding="utf-8")

    js = ("// Generated by scripts/build_assets.py — do not edit by hand.\n"
          "// The traced logo, inline, so any view can draw it without a fetch.\n"
          f"export const MARK = `{mark}`;\n\n"
          f"export const WORDMARK = `{word}`;\n\n"
          f"export const LOCKUP = `{lock}`;\n")
    (ROOT / "js" / "brand.js").write_text(js, encoding="utf-8")
    print(f"  inlined mark ({len(mark)//1024}KB) + wordmark ({len(word)//1024}KB)")


def main():
    run_tracer()
    build_photos()
    build_icons()
    build_og()
    inline_brand()
    print("done")


if __name__ == "__main__":
    main()
