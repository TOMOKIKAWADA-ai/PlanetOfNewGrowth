# B4-3 key visual drafts (2026-11-25). No image generation: composes the existing promo art
# (assets/promo/three-soldiers.png, world-awakening.png) with the title lettering redrawn in Yu Mincho,
# coloured like the title screen (assets/ui/title/title-main.png): white letters, a yellow-green-to-sky-blue
# offset shadow, and the "Planet of New Growth" subtitle between two thin rules.
# Usage: python scripts/assets/compose-keyvisual.py <out_dir>
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOLDIERS = ROOT / 'assets/promo/three-soldiers.png'
WORLD = ROOT / 'assets/promo/world-awakening.png'
TITLE_FONT = 'C:/Windows/Fonts/yumindb.ttf'
SUB_FONT = 'C:/Windows/Fonts/yumin.ttf'
TITLE = '芽吹きの惑星'
SUBTITLE = 'Planet of New Growth'
TAGLINE = '見下ろし型サバイバル　開発中'  # factual line, not story copy (story lines need the user's OK)
# Shadow colours sampled from the title screen lettering, left (芽) to right (星).
SHADOW_STOPS = [(201, 176, 18), (126, 170, 96), (98, 178, 214)]


def cover(img, size):
    w, h = size
    scale = max(w / img.width, h / img.height)
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def lerp_colour(t):
    t = max(0.0, min(1.0, t)) * (len(SHADOW_STOPS) - 1)
    i = min(int(t), len(SHADOW_STOPS) - 2)
    f = t - i
    a, b = SHADOW_STOPS[i], SHADOW_STOPS[i + 1]
    return tuple(round(a[k] + (b[k] - a[k]) * f) for k in range(3))


def draw_title(canvas, x, y, size, vertical_gap=0.0):
    """Title with a per-character gradient offset shadow and a soft dark glow for legibility."""
    font = ImageFont.truetype(TITLE_FONT, size)
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    g = ImageDraw.Draw(glow)
    widths = [font.getlength(ch) for ch in TITLE]
    total = sum(widths)
    off = max(3, size // 16)
    cx = x
    for i, ch in enumerate(TITLE):
        colour = lerp_colour((cx - x + widths[i] / 2) / total)
        g.text((cx, y), ch, font=font, fill=(20, 30, 30, 150))
        d.text((cx + off, y + off), ch, font=font, fill=colour + (255,))
        d.text((cx, y), ch, font=font, fill=(255, 255, 255, 255))
        cx += widths[i]
    glow = glow.filter(ImageFilter.GaussianBlur(size / 7))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)
    return total


def draw_subtitle(canvas, centre_x, y, size, rule):
    font = ImageFont.truetype(SUB_FONT, size)
    d = ImageDraw.Draw(canvas)
    w = font.getlength(SUBTITLE)
    sx = centre_x - w / 2
    d.text((sx + 2, y + 2), SUBTITLE, font=font, fill=(60, 80, 80, 160))
    d.text((sx, y), SUBTITLE, font=font, fill=(255, 255, 255, 255))
    mid = y + size * 0.62
    gap = size * 0.9
    d.line((sx - gap - rule, mid, sx - gap, mid), fill=(255, 255, 255, 230), width=2)
    d.line((sx + w + gap, mid, sx + w + gap + rule, mid), fill=(255, 255, 255, 230), width=2)


def draw_tagline(canvas, centre_x, y, size):
    font = ImageFont.truetype(SUB_FONT, size)
    d = ImageDraw.Draw(canvas)
    w = font.getlength(TAGLINE)
    x = centre_x - w / 2
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((x, y), TAGLINE, font=font, fill=(10, 20, 20, 200))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(size / 5)))
    d.text((x, y), TAGLINE, font=font, fill=(255, 255, 255, 255))


def vertical_fade(size, top_alpha, bottom_alpha, start, end, colour=(245, 248, 244)):
    w, h = size
    grad = Image.new('L', (1, h))
    for yy in range(h):
        t = 0 if yy <= start else 1 if yy >= end else (yy - start) / (end - start)
        grad.putpixel((0, yy), round(top_alpha + (bottom_alpha - top_alpha) * t))
    mask = grad.resize((w, h))
    layer = Image.new('RGBA', (w, h), colour + (0,))
    layer.putalpha(mask)
    return layer


def landscape(out):
    W, H = 1920, 1080
    canvas = cover(Image.open(SOLDIERS).convert('RGBA'), (W, H))
    # A pale haze over the sky so the white title reads on the bright clouds.
    canvas.alpha_composite(vertical_fade((W, H), 110, 0, 0, 300))
    # Top left, over the sky, like the title screen: centred lettering covered the middle one's face.
    tw = ImageFont.truetype(TITLE_FONT, 118).getlength(TITLE)
    draw_title(canvas, 56, 36, 118)
    draw_subtitle(canvas, 56 + tw / 2, 186, 38, 80)
    # Dark foot for the tagline.
    canvas.alpha_composite(vertical_fade((W, H), 0, 150, H - 260, H, colour=(12, 22, 22)))
    draw_tagline(canvas, W / 2, H - 120, 52)
    canvas.convert('RGB').save(out / 'keyvisual-16x9-draft.jpg', quality=90)


def portrait(out):
    W, H = 1080, 1920
    canvas = cover(Image.open(WORLD).convert('RGBA'), (W, H)).filter(ImageFilter.GaussianBlur(6))
    canvas.alpha_composite(Image.new('RGBA', (W, H), (240, 244, 238, 70)))
    # The three, cropped from the waist up so all three faces stay in the 1080 width.
    soldiers = Image.open(SOLDIERS).convert('RGBA')
    crop = soldiers.crop((300, 0, 1500, 941))
    crop = crop.resize((W, round(crop.height * W / crop.width)), Image.LANCZOS)
    top = 600
    # Soft top and bottom edges so the cut-out melts into the world behind it.
    mask = Image.new('L', crop.size, 255)
    md = ImageDraw.Draw(mask)
    feather = 140
    for yy in range(feather):
        a = round(255 * yy / feather)
        md.line((0, yy, crop.width, yy), fill=a)
        md.line((0, crop.height - 1 - yy, crop.width, crop.height - 1 - yy), fill=a)
    crop.putalpha(mask)
    canvas.alpha_composite(crop, (0, top))
    tw = ImageFont.truetype(TITLE_FONT, 150).getlength(TITLE)
    draw_title(canvas, (W - tw) / 2, 200, 150)
    draw_subtitle(canvas, W / 2, 390, 44, 70)
    canvas.alpha_composite(vertical_fade((W, H), 0, 170, H - 420, H, colour=(12, 22, 22)))
    draw_tagline(canvas, W / 2, H - 230, 54)
    canvas.convert('RGB').save(out / 'keyvisual-9x16-draft.jpg', quality=90)


if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'promo/keyvisual')
    out.mkdir(parents=True, exist_ok=True)
    landscape(out)
    portrait(out)
    print('wrote', out)
