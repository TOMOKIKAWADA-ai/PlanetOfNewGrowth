# Draws the carry-over reward icons (backlog B4-2) that have no matching upgrade icon, in the same flat
# style as assets/ui/upgrade-icons (white shapes with a cyan accent, transparent 512x512).
# No image generation: shapes are drawn with Pillow at 4x and scaled down for smooth edges.
#
#   python scripts/assets/draw-reward-icons.py <out_dir>
#
# Writes pumpGuard / shirayuriRecord / leftProcedure / carriedWater / firmSteps / seeingEye .png.
# The other nine rewards reuse upgrade icons (REWARD_ICON_URLS in src/ui.js).
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512
SCALE = 4
WHITE = (255, 255, 255, 255)
CYAN = (24, 238, 255, 255)  # same accent as redraw-upgrade-icons.py
CLEAR = (0, 0, 0, 0)


def canvas():
    image = Image.new('RGBA', (SIZE * SCALE, SIZE * SCALE), CLEAR)
    return image, ImageDraw.Draw(image)


def s(*values):
    return [v * SCALE for v in values]


def rounded_line(draw, x0, y0, x1, y1, width, fill):
    draw.line(s(x0, y0, x1, y1), fill=fill, width=width * SCALE)
    r = width / 2
    for x, y in ((x0, y0), (x1, y1)):
        draw.ellipse(s(x - r, y - r, x + r, y + r), fill=fill)


def cut(image, shape, *args, **kwargs):
    """Makes the given shape transparent (draws it on a mask and pastes clear pixels through it)."""
    mask = Image.new('L', image.size, 0)
    getattr(ImageDraw.Draw(mask), shape)(*args, fill=255, **kwargs)
    image.paste(Image.new('RGBA', image.size, CLEAR), (0, 0), mask)
    return ImageDraw.Draw(image)


def drop_shape(cx, cy, r, steps=64):
    """Water drop: a circle of radius r around (cx, cy) with a point 2r above the center."""
    # Seen from the center, the tangent points from the tip sit 60 degrees either side of straight up.
    pts = [(cx, cy - r * 2.0)]
    a0, a1 = math.radians(-30), math.radians(210)
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return [(x * SCALE, y * SCALE) for x, y in pts]


def egg(cx, cy, w, h, steps=96):
    """Egg outline: narrower at the top."""
    pts = []
    for i in range(steps):
        a = 2 * math.pi * i / steps
        x = math.cos(a)
        y = math.sin(a)
        scale = 0.82 if y < 0 else 1.0  # top half narrower
        pts.append((cx + x * w / 2 * scale, cy + y * h / 2))
    return [(x * SCALE, y * SCALE) for x, y in pts]


def finish(image):
    return image.resize((SIZE, SIZE), Image.LANCZOS)


def draw_pump_guard():
    """Pump guard: a white shield with a cyan water drop in the middle."""
    image, draw = canvas()
    draw.polygon(s(256, 52, 430, 112, 418, 270, 256, 462, 94, 270, 82, 112), fill=WHITE)
    draw = cut(image, 'polygon', s(256, 100, 386, 144, 376, 262, 256, 408, 136, 262, 126, 144))
    draw.polygon(s(256, 128, 362, 164, 354, 256, 256, 378, 158, 256, 150, 164), fill=WHITE)
    draw = cut(image, 'polygon', drop_shape(256, 278, 56))
    draw.polygon(drop_shape(256, 272, 44), fill=CYAN)
    return finish(image)


def draw_shirayuri_record():
    """Shirayuri's record: an open notebook with a cyan bookmark."""
    image, draw = canvas()
    # Two pages leaning outwards.
    draw.polygon(s(64, 132, 244, 156, 244, 420, 64, 396), fill=WHITE)
    draw.polygon(s(268, 156, 448, 132, 448, 396, 268, 420), fill=WHITE)
    # Writing lines cut out of each page.
    for i in range(4):
        y = 214 + i * 46
        draw = cut(image, 'rounded_rectangle', s(96, y - 9, 214, y + 9), radius=9 * SCALE)
        draw = cut(image, 'rounded_rectangle', s(298, y - 9, 416, y + 9), radius=9 * SCALE)
    # Bookmark hanging from the spine.
    draw.polygon(s(232, 70, 280, 70, 280, 250, 256, 222, 232, 250), fill=CYAN)
    return finish(image)


def draw_left_procedure():
    """Left procedure (burst cooldown): an hourglass with cyan sand."""
    image, draw = canvas()
    rounded_line(draw, 116, 70, 396, 70, 40, WHITE)
    rounded_line(draw, 116, 442, 396, 442, 40, WHITE)
    draw.polygon(s(148, 92, 364, 92, 276, 256, 364, 420, 148, 420, 236, 256), fill=WHITE)
    draw = cut(image, 'polygon', s(186, 120, 326, 120, 248, 256, 326, 392, 186, 392, 264, 256))
    draw = cut(image, 'polygon', s(186, 120, 326, 120, 256, 248, 186, 120))
    # Sand: small heap in the top bulb, stream, bigger heap at the bottom.
    draw.polygon(s(214, 160, 298, 160, 256, 222), fill=CYAN)
    rounded_line(draw, 256, 236, 256, 330, 12, CYAN)
    draw.polygon(s(256, 318, 316, 392, 196, 392), fill=CYAN)
    return finish(image)


def draw_carried_water():
    """Carried water (damage to the mother egg): a white egg with a cyan crack running down it."""
    image, draw = canvas()
    draw.polygon(egg(256, 268, 300, 380), fill=WHITE)
    crack = s(250, 78, 226, 170, 286, 228, 222, 312, 270, 372, 252, 460)
    draw = cut(image, 'line', crack, width=46 * SCALE, joint='curve')
    draw.line(crack, fill=CYAN, width=22 * SCALE, joint='curve')
    return finish(image)


def draw_firm_steps():
    """Firm steps (less shockwave damage): a boot planted on the ground; the cyan shockwave stops at its heel."""
    image, draw = canvas()
    # Boot seen from the side, toe to the right: shaft, heel, rounded toe.
    draw.polygon(s(176, 72, 290, 72, 290, 236, 372, 252, 372, 344, 176, 344), fill=WHITE)
    draw.ellipse(s(300, 236, 440, 344), fill=WHITE)
    draw.rounded_rectangle(s(160, 60, 306, 108), radius=18 * SCALE, fill=WHITE)  # cuff
    draw = cut(image, 'rectangle', s(176, 108, 290, 124))  # gap under the cuff
    draw = cut(image, 'rectangle', s(176, 322, 440, 336))  # sole line
    # Ground under the boot.
    rounded_line(draw, 150, 384, 450, 384, 22, WHITE)
    # Cyan shockwave rings coming from the left, ending at the heel.
    for r in (44, 92):
        draw.arc(s(150 - r, 384 - r, 150 + r, 384 + r), start=180, end=270, fill=CYAN, width=24 * SCALE)
    rounded_line(draw, 52, 384, 120, 384, 22, CYAN)
    return finish(image)


def draw_seeing_eye():
    """Seeing eye (shorter mimic stun): a white eye with a cyan iris."""
    image, draw = canvas()
    # Almond shape from two arcs.
    pts = []
    steps = 64
    for i in range(steps + 1):
        x = 52 + (460 - 52) * i / steps
        t = (x - 256) / 204
        pts.append((x, 256 - 150 * (1 - t * t)))
    for i in range(steps, -1, -1):
        x = 52 + (460 - 52) * i / steps
        t = (x - 256) / 204
        pts.append((x, 256 + 150 * (1 - t * t)))
    draw.polygon([(x * SCALE, y * SCALE) for x, y in pts], fill=WHITE)
    draw = cut(image, 'ellipse', s(256 - 104, 256 - 104, 256 + 104, 256 + 104))
    draw.ellipse(s(256 - 82, 256 - 82, 256 + 82, 256 + 82), fill=CYAN)
    draw = cut(image, 'ellipse', s(256 - 34, 256 - 34, 256 + 34, 256 + 34))
    return finish(image)


DRAWINGS = {
    'pumpGuard': draw_pump_guard,
    'shirayuriRecord': draw_shirayuri_record,
    'leftProcedure': draw_left_procedure,
    'carriedWater': draw_carried_water,
    'firmSteps': draw_firm_steps,
    'seeingEye': draw_seeing_eye,
}


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/ui/reward-icons')
    out.mkdir(parents=True, exist_ok=True)
    for name, draw in DRAWINGS.items():
        draw().save(out / f'{name}.png')
    print('wrote', ', '.join(f'{name}.png' for name in DRAWINGS), 'to', out)


if __name__ == '__main__':
    main()
