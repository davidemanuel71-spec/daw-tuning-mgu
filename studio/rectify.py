#!/usr/bin/env python3
"""Rectify a photo of the cluster to the native 1920x720 panel, using the "Masurare (4 colturi)" theme.
  python3 studio/rectify.py photo_marks.jpg            -> studio/out/rectified.png + studio/calib_H.json
  python3 studio/rectify.py photo_other.jpg --use-h    -> rectify another photo taken from the SAME camera position
The four 60x60 squares (red TL, green TR, blue BL, yellow BR) sit at known panel coordinates; their centres in the
photo give the homography. Output carries a 100 px ruler so positions of BMW's numbers can be read in panel px."""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
CENTRES = {'red': (90, 70), 'green': (1830, 70), 'blue': (90, 650), 'yellow': (1830, 650)}
RULES = {'red': lambda r, g, b: (r > 190) & (g < 90) & (b < 90), 'green': lambda r, g, b: (g > 170) & (r < 110) & (b < 130),
         'blue': lambda r, g, b: (b > 190) & (r < 100) & (g < 140), 'yellow': lambda r, g, b: (r > 190) & (g > 180) & (b < 110)}
def find(arr):
    r, g, b = [arr[..., i].astype(int) for i in range(3)]; pts = {}
    for k, f in RULES.items():
        ys, xs = np.nonzero(f(r, g, b))
        if len(xs) < 30: raise SystemExit('marker not found: ' + k + ' (is the square visible and not over-exposed?)')
        mx, my = np.median(xs), np.median(ys)
        keep = (abs(xs - mx) < 150) & (abs(ys - my) < 150)          # drop stray pixels
        pts[k] = (float(xs[keep].mean()), float(ys[keep].mean()))
    return pts
def homography(src, dst):
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y, -u], [0, 0, 0, x, y, 1, -v * x, -v * y, -v]]
    _, _, vt = np.linalg.svd(np.array(A, float)); h = vt[-1].reshape(3, 3); return h / h[2, 2]
def main():
    photo = sys.argv[1]; img = Image.open(photo).convert('RGB')
    hp = os.path.join(HERE, 'calib_H.json')
    if '--use-h' in sys.argv: H = np.array(json.load(open(hp))['photo_to_panel'])
    else:
        p = find(np.asarray(img)); keys = list(CENTRES)
        H = homography([p[k] for k in keys], [CENTRES[k] for k in keys])
        json.dump({'photo_to_panel': H.tolist(), 'found': p}, open(hp, 'w'), indent=1); print('markers', p)
    Hi = np.linalg.inv(H)                                   # panel -> photo, what PIL's transform wants
    coeffs = (Hi[0, 0], Hi[0, 1], Hi[0, 2], Hi[1, 0], Hi[1, 1], Hi[1, 2], Hi[2, 0], Hi[2, 1])
    out = img.transform((1920, 720), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    out.save(os.path.join(OUT, 'rectified.png'))
    d = ImageDraw.Draw(out)
    for x in range(0, 1920, 100): d.line([(x, 0), (x, 720)], fill=(0, 255, 120), width=1); d.text((x + 3, 3), str(x), fill=(255, 220, 0))
    for y in range(0, 720, 100): d.line([(0, y), (1920, y)], fill=(0, 255, 120), width=1); d.text((3, y + 3), str(y), fill=(255, 220, 0))
    out.save(os.path.join(OUT, 'rectified_ruler.png')); print('ok -> studio/out/rectified_ruler.png')
main()
