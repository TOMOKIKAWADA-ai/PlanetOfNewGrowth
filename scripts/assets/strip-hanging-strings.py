# 三面図を切り分けた絵（front/left/back/right）から、体の周りに垂れる細い糸を消す。
# Tripo は細い垂れ糸を「壁」にしてしまう（06 茎の生えたクラゲが円柱になった）ので、渡す前に消す。
# 傘（赤）の下から下の端まで、幅 9px 未満の線を背景色で塗る。中央の茎・触手につながる太い所と、根元の暗い根は残す。
# 使い方: python scripts/assets/strip-hanging-strings.py <切り分けた絵のフォルダ> <出力フォルダ>
import os
import sys

import numpy as np
from PIL import Image
import cv2

src, dst = sys.argv[1:3]
os.makedirs(dst, exist_ok=True)
for name in sorted(os.listdir(src)):
    if not name.endswith('.png') or name.startswith('_'):
        continue
    im = Image.open(os.path.join(src, name)).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[:, :6].reshape(-1, 3)]), axis=0)
    fg = np.abs(a - bg).sum(axis=2) > 45
    h, w = fg.shape
    rows = np.where(fg.any(axis=1))[0]
    top, bottom = rows[0], rows[-1]
    # bell: the widest red rows near the top; strings hang below its rim
    red = (a[..., 0] > 170) & (a[..., 1] < 110) & (a[..., 2] < 110)
    red_rows = np.where(red.sum(axis=1) > w * 0.12)[0]
    bell_bottom = red_rows.max() + 6
    roots_top = top + int((bottom - top) * 0.80)
    band = np.zeros_like(fg)
    band[bell_bottom:] = True
    # keep only wide parts (trunk, hair); thin vertical lines vanish under a horizontal opening
    m = fg.astype(np.uint8)
    wide = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((1, 9), np.uint8))
    wide = cv2.dilate(wide, np.ones((3, 5), np.uint8)) > 0
    # keep everything connected to the trunk/hair core in the centre
    upper = band.copy()
    upper[roots_top:] = False
    _, labels = cv2.connectedComponents((wide & upper).astype(np.uint8))
    centre = labels[bell_bottom:roots_top, w // 2 - w // 20: w // 2 + w // 20]
    keep_ids = set(np.unique(centre)) - {0}
    keep = np.isin(labels, list(keep_ids))
    # faint strings too (low threshold); below roots_top keep the dark roots and thorn curls
    faint = np.abs(a - bg).sum(axis=2) > 14
    dark = a.sum(axis=2) < 330
    roots = np.zeros_like(fg)
    roots[roots_top:] = True
    erase = band & faint & ~keep & ~(roots & dark)
    out = a.copy()
    out[erase] = bg
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(dst, name))
    print(name, 'bell_bottom', bell_bottom, 'roots_top', roots_top, 'erased', int(erase.sum()))
