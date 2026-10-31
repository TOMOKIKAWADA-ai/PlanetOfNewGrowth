# Weekly progress image (backlog B6-2): tiles devlog screenshots with a caption under each.
#
#   python scripts/promo/weekly-grid.py promo/YYYY-MM-DD/weekly-grid.png "見出し" img1.png "名前|一言" img2.png "名前|一言" ...
#
# Each tile is cropped to 16:10 from the center, 2 columns. Font: Yu Gothic Bold from the Windows font folder.
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = 'C:/Windows/Fonts/YuGothB.ttc'
TILE_W, TILE_H = 800, 500
GAP, PAD, HEAD_H, CAP_H = 16, 32, 120, 96
BG, FG, SUB, ACCENT = (24, 30, 27), (240, 240, 232), (176, 196, 178), (231, 166, 255)


def tile(path):
    image = Image.open(path).convert('RGB')
    w, h = image.size
    target = TILE_W / TILE_H
    if w / h > target:
        nw = int(h * target)
        image = image.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / target)
        image = image.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return image.resize((TILE_W, TILE_H), Image.LANCZOS)


def main():
    out, heading, *rest = sys.argv[1:]
    items = list(zip(rest[0::2], rest[1::2]))
    cols = 2
    rows = (len(items) + cols - 1) // cols
    width = PAD * 2 + TILE_W * cols + GAP * (cols - 1)
    height = PAD * 2 + HEAD_H + rows * (TILE_H + CAP_H) + GAP * (rows - 1)
    canvas = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(canvas)
    head_font = ImageFont.truetype(FONT, 52)
    name_font = ImageFont.truetype(FONT, 34)
    line_font = ImageFont.truetype(FONT, 26)
    draw.text((PAD, PAD + 20), heading, font=head_font, fill=FG)
    for index, (path, caption) in enumerate(items):
        name, _, line = caption.partition('|')
        x = PAD + (index % cols) * (TILE_W + GAP)
        y = PAD + HEAD_H + (index // cols) * (TILE_H + CAP_H + GAP)
        canvas.paste(tile(path), (x, y))
        draw.rectangle((x, y + TILE_H, x + 8, y + TILE_H + CAP_H - 12), fill=ACCENT)
        draw.text((x + 22, y + TILE_H + 10), name, font=name_font, fill=FG)
        draw.text((x + 22, y + TILE_H + 54), line, font=line_font, fill=SUB)
    canvas.save(out)


if __name__ == '__main__':
    main()
