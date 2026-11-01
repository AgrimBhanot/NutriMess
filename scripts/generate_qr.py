"""Generate NutriMess QR codes and printable posters.

Usage (from the repo root):
    pip install -r scripts/requirements.txt
    python scripts/generate_qr.py --url https://nutrimess.vercel.app

Writes to qr/:
    nutrimess-qr.png / .svg       app QR (opens the app; login or dashboard)
    nutrimess-poster.png          general A5 poster
    posters/nutrimess-<CODE>.png  one poster per bhawan, linking to
                                  /register?bhawan=<CODE> so it's preselected
Rerun with your real URL if the Vercel deployment name differs.
"""

import argparse
import io
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

PINE = (36, 78, 61)
TERRA = (186, 93, 56)
INK = (17, 24, 39)
MUTED = (75, 85, 99)
PORCELAIN = (249, 250, 251)

BHAWANS = [
    ("VB", "Vivekanand Bhawan"),
    ("RB", "Rajiv Bhawan"),
    ("GB", "Govind Bhawan"),
    ("JB", "Jawahar Bhawan"),
    ("HB", "Himalaya Bhawan"),
]

FONT_DIRS = [
    "/usr/share/fonts/truetype/liberation",
    "/usr/share/fonts/truetype/dejavu",
    "/Library/Fonts",
    "C:/Windows/Fonts",
]
FONT_FILES = {
    "bold": ["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"],
    "regular": ["LiberationSans-Regular.ttf", "DejaVuSans.ttf", "Arial.ttf", "arial.ttf"],
}


def font(weight: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for d in FONT_DIRS:
        for name in FONT_FILES[weight]:
            path = Path(d) / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def qr_image(url: str, size: int) -> Image.Image:
    """QR with high error correction and a brand mark in the centre
    (H level tolerates ~30% damage, the mark covers far less)."""
    qr = segno.make(url, error="h")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=20, border=2, dark=PINE, light="white")
    img = Image.open(buf).convert("RGB").resize((size, size), Image.NEAREST)

    mark = size // 5
    badge = Image.new("RGBA", (mark, mark), (0, 0, 0, 0))
    d = ImageDraw.Draw(badge)
    d.rounded_rectangle([0, 0, mark - 1, mark - 1], radius=mark // 4, fill="white")
    inset = mark // 10
    d.rounded_rectangle([inset, inset, mark - inset - 1, mark - inset - 1], radius=mark // 5, fill=PINE)
    f = font("bold", int(mark * 0.5))
    l, t, r, b = d.textbbox((0, 0), "N", font=f)
    d.text(((mark - (r - l)) / 2 - l, (mark - (b - t)) / 2 - t), "N", font=f, fill="white")
    img.paste(badge, ((size - mark) // 2, (size - mark) // 2), badge)
    return img


def centered(d: ImageDraw.ImageDraw, y: int, text: str, f, fill, width: int) -> int:
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text(((width - (r - l)) / 2 - l, y), text, font=f, fill=fill)
    return y + (b - t)


def poster(url: str, subtitle: str, out: Path) -> None:
    """A5 at 150 dpi (874 x 1240), print-friendly."""
    w, h = 874, 1240
    img = Image.new("RGB", (w, h), PORCELAIN)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, w, 14], fill=PINE)
    y = centered(d, 72, "NutriMess", font("bold", 76), PINE, w) + 44
    y = centered(d, y, subtitle, font("bold", 36), INK, w) + 16
    centered(d, y, "Mess menu · Plate scanner · Bhawan chat · AI nutrition", font("regular", 22), MUTED, w)

    qr_size = 560
    card = [(w - qr_size) // 2 - 24, 330, (w + qr_size) // 2 + 24, 330 + qr_size + 48]
    d.rounded_rectangle(card, radius=32, fill="white", outline=(229, 231, 235), width=2)
    img.paste(qr_image(url, qr_size), ((w - qr_size) // 2, 354))

    y = card[3] + 40
    y = centered(d, y, "Scan with your phone camera", font("bold", 32), INK, w) + 30
    steps = ["1  Scan the code", "2  Sign up with your IITR email", "3  Add to Home Screen"]
    for step in steps:
        y = centered(d, y, step, font("regular", 26), MUTED, w) + 16

    centered(d, h - 70, url.replace("https://", ""), font("bold", 24), TERRA, w)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, dpi=(150, 150))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="https://nutrimess.vercel.app", help="Deployed app URL")
    parser.add_argument("--out", default="qr", help="Output directory")
    args = parser.parse_args()

    base = args.url.rstrip("/")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    qr_image(base, 1200).save(out / "nutrimess-qr.png")
    segno.make(base, error="h").save(out / "nutrimess-qr.svg", scale=10, border=2, dark="#244E3D")
    poster(base, "Your IIT Roorkee mess, in your pocket", out / "nutrimess-poster.png")
    for code, name in BHAWANS:
        poster(f"{base}/register?bhawan={code}", name, out / "posters" / f"nutrimess-{code}.png")

    print(f"QR codes for {base} written to {out.resolve()}")


if __name__ == "__main__":
    main()
