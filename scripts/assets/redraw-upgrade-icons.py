# Redraws the thin upgrade icons (backlog B4-2) in the same flat style as the rest of
# assets/ui/upgrade-icons (white shapes with a cyan accent, transparent 512x512).
# No image generation: shapes are drawn with Pillow at 4x and scaled down for smooth edges.
#
#   python scripts/assets/redraw-upgrade-icons.py <out_dir>
#
# Writes speed-bold.png and pierce-bold.png. src/ui.js uses them while Config.visuals.cleanedUpgradeIcons is true.
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512
SCALE = 4
WHITE = (255, 255, 255, 255)
CYAN = (24, 238, 255, 255)  # sampled from hp.png / speed.png accents


def canvas():
    image = Image.new('RGBA', (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def s(*values):
    return [v * SCALE for v in values]


def lens(cx, cy, length, width, tail_notch=0.0):
    """Pointed seed shape facing right: two circular arcs meeting at the tip, optional notch at the tail."""
    half_l, half_w = length / 2, width / 2
    # Circle through (±half_l, 0) and (0, half_w): radius r with center at (0, half_w - r).
    r = (half_l ** 2 + half_w ** 2) / (2 * half_w)
    points = []
    steps = 64
    start = math.atan2(0 - (half_w - r), -half_l)
    end = math.atan2(0 - (half_w - r), half_l)
    for i in range(steps + 1):  # upper arc, tail -> tip
        a = start + (end - start) * i / steps
        points.append((r * math.cos(a), (half_w - r) + r * math.sin(a)))
    for x, y in reversed(points[1:-1]):  # lower arc, mirrored
        points.append((x, -y))
    pts = []
    for x, y in points:
        # Round the tail a little more than the tip, like the original seed.
        if x < 0:
            x *= 0.82
        pts.append((cx + x, cy - y))
    if tail_notch:
        pts.append((cx - half_l * 0.82 + tail_notch, cy))
    return [(x * SCALE, y * SCALE) for x, y in pts]


def rounded_line(draw, x0, y0, x1, y1, width, fill):
    draw.line(s(x0, y0, x1, y1), fill=fill, width=width * SCALE)
    r = width / 2
    for x, y in ((x0, y0), (x1, y1)):
        draw.ellipse(s(x - r, y - r, x + r, y + r), fill=fill)


def finish(image):
    return image.resize((SIZE, SIZE), Image.LANCZOS)


def draw_speed():
    """Attack speed: a big seed flying right with three cyan speed lines behind it."""
    image, draw = canvas()
    draw.polygon(lens(322, 256, 300, 164), fill=WHITE)
    # V-shaped notch at the tail, like the original seed.
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).polygon(s(176, 204, 226, 256, 176, 308), fill=255)
    image.paste(Image.new('RGBA', image.size, (0, 0, 0, 0)), (0, 0), mask)
    draw = ImageDraw.Draw(image)
    rounded_line(draw, 70, 180, 160, 180, 28, CYAN)
    rounded_line(draw, 44, 256, 150, 256, 28, CYAN)
    rounded_line(draw, 70, 332, 160, 332, 28, CYAN)
    return finish(image)


def draw_pierce():
    """Pierce: a thick arrow passing through two seeds-enemies (ovals), with a cyan head."""
    image, draw = canvas()
    # Shaft first, then the two bodies on top, then the shaft segments between/after them so it reads as passing through.
    draw.rectangle(s(92, 240, 392, 272), fill=WHITE)
    for cx in (196, 300):
        draw.ellipse(s(cx - 48, 256 - 88, cx + 48, 256 + 88), fill=WHITE)
    # Fletching at the tail.
    draw.polygon(s(48, 180, 108, 180, 138, 256, 108, 332, 48, 332, 80, 256), fill=WHITE)
    # Cyan head.
    draw.polygon(s(376, 170, 474, 256, 376, 342, 398, 256), fill=CYAN)
    # Cut a transparent notch between shaft and bodies so the ovals read as separate shapes.
    clear = Image.new('RGBA', image.size, (0, 0, 0, 0))
    mask = Image.new('L', image.size, 0)
    mdraw = ImageDraw.Draw(mask)
    for cx in (196, 300):
        mdraw.ellipse(s(cx - 56, 256 - 96, cx + 56, 256 + 96), outline=255, width=8 * SCALE)
    image.paste(clear, (0, 0), mask)
    # Re-draw the shaft inside the gaps so the arrow stays continuous.
    draw = ImageDraw.Draw(image)
    draw.rectangle(s(92, 240, 392, 272), fill=WHITE)
    return finish(image)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/ui/upgrade-icons')
    out.mkdir(parents=True, exist_ok=True)
    draw_speed().save(out / 'speed-bold.png')
    draw_pierce().save(out / 'pierce-bold.png')
    print(f'wrote {out / "speed-bold.png"}, {out / "pierce-bold.png"}')


if __name__ == '__main__':
    main()
