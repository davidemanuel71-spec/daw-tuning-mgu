#!/usr/bin/env python3
"""Offline renderer for the DAW FULL MAP OEM layout: reads studio/layers/*.json in order and writes
a native 1920x720 preview (out/preview.png), one PNG per layer (out/layers/) and a debug view with the
BMW zones (out/debug.png). No firmware, no car: only a picture. Usage: python3 studio/render.py"""
import json, glob, os, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
W, H = 1920, 720
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
L = lambda n: json.load(open(os.path.join(HERE, 'layers', n + '.json')))
OUT = os.path.join(HERE, 'out'); os.makedirs(os.path.join(OUT, 'layers'), exist_ok=True)
def font(s):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',):
        if os.path.exists(p): return ImageFont.truetype(p, s)
    return ImageFont.load_default()
def bezier(path, n=24):
    pts = []; cur = None
    for seg in path:
        if seg[0] == 'M': cur = (seg[1], seg[2]); pts.append(cur)
        elif seg[0] == 'L': cur = (seg[1], seg[2]); pts.append(cur)
        elif seg[0] == 'C':
            p0 = cur; p1 = (seg[1], seg[2]); p2 = (seg[3], seg[4]); p3 = (seg[5], seg[6])
            for i in range(1, n + 1):
                t = i / n; a = (1 - t) ** 3; b = 3 * (1 - t) ** 2 * t; c = 3 * (1 - t) * t * t; d = t ** 3
                pts.append((a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0], a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]))
            cur = p3
    return pts
def blank(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))
def save(img, name): img.save(os.path.join(OUT, 'layers', name + '.png'))
layers = {}
# 03 viewport (placeholder map: grid streets, aspect kept)
vp = L('03_navigation_viewport'); x, y, w, h = vp['rect']
m = Image.new('RGBA', (w, h), (20, 52, 98, 255)); d = ImageDraw.Draw(m)
for i in range(-h, w + h, 70): d.line([(i, 0), (i - h * .6, h)], fill=(52, 93, 155, 255), width=2)
for j in range(0, h, 60): d.line([(0, j), (w, j)], fill=(52, 93, 155, 255), width=2)
d.line([(w*.46, 0), (w*.5, h*.5), (w*.55, h)], fill=(0, 201, 245, 255), width=11)
d.text((w*.5, h*.45), 'WAZE (placeholder)', fill=(255, 255, 255, 255), font=font(34), anchor='mm')
nav = blank(); nav.paste(m, (x, y)); layers['03'] = nav
# 04 mask (superellipse) + 05 edge blend
mk = L('04_adaptive_mask'); x, y, w, h = mk['rect']; n = mk['n']
mask = Image.new('L', (W, H), 0); px = mask.load()
for yy in range(max(0, y - 2), min(H, y + h + 2)):
    for xx in range(max(0, x - 2), min(W, x + w + 2)):
        u = abs((xx - x - w / 2) / (w / 2)); v = abs((yy - y - h / 2) / (h / 2))
        if u ** n + v ** n <= 1: px[xx, yy] = 255
fe = L('05_edge_blend')['feather_px']
mask = mask.filter(ImageFilter.GaussianBlur(fe / 2.5))
nav2 = nav.copy(); nav2.putalpha(Image.composite(nav.getchannel('A'), Image.new('L', (W, H), 0), mask).point(lambda v: v) if False else Image.eval(mask, lambda v: v))
r, g, b, a = nav.split(); nav2 = Image.merge('RGBA', (r, g, b, Image.composite(mask, Image.new('L', (W, H), 0), a)))
layers['04'] = Image.merge('RGBA', (Image.new('L', (W, H), 255),) * 3 + (mask,)); layers['05'] = nav2
# 01 geometry (guide only) and 02 scale
gg = blank(); gd = ImageDraw.Draw(gg); geo = L('01_gauge_geometry')
for c in geo['curves']: gd.line(bezier(c['path']), fill=tuple(c.get('stroke', (245, 245, 245, 255))), width=c.get('width', 5))
layers['01'] = gg
sc = blank(); sd = ImageDraw.Draw(sc)
for it in L('02_gauge_scale')['items']: sd.text((it['x'], it['y']), it['text'], fill=(255, 255, 255, 255), font=font(it.get('size', 34)), anchor='mm')
layers['02'] = sc
# 06 instruments, 07 branding
ins = blank(); idr = ImageDraw.Draw(ins)
for it in L('06_dynamic_instruments')['items']: idr.text((it['x'], it['y'] + it['h'] / 2), it['demo'], fill=(255, 255, 255, 255), font=font(int(it['h'] * .7)), anchor='lm')
layers['06'] = ins
br = L('07_daw_branding'); lg = blank()
try:
    import zlib, base64
    j = json.load(open(os.path.join(ROOT, br['logo']))); raw = zlib.decompress(base64.b64decode(j['z']))
    li = Image.frombytes('RGBA', (j['w'], j['h']), raw).resize((br['w'], br['h']), Image.LANCZOS); lg.alpha_composite(li, (br['x'], br['y']))
except Exception as e: print('logo skipped:', e)
layers['07'] = lg
names = {'01': '01_gauge_geometry', '02': '02_gauge_scale', '03': '03_navigation_viewport', '04': '04_adaptive_mask', '05': '05_edge_blend', '06': '06_dynamic_instruments', '07': '07_daw_branding'}
for k, v in layers.items(): save(v, names[k])
final = Image.new('RGBA', (W, H), (0, 0, 0, 255))
for k in ('05', '01', '02', '06', '07'): final.alpha_composite(layers[k])
final.convert('RGB').save(os.path.join(OUT, 'preview.png'))
dbg = final.copy(); dd = ImageDraw.Draw(dbg, 'RGBA')
for k in geo['guide']: dd.line(bezier(k['path']), fill=(255, 200, 0, 150), width=3)
for z in L('08_bmw_safety')['zones']:
    if 'rect' in z: a, b, c, d2 = z['rect']; dd.rectangle([a, b, a + c, b + d2], outline=(255, 80, 80, 255), width=3, fill=(255, 80, 80, 40))
    else: cx, cy, rr = z['circle']; dd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(255, 80, 80, 255), width=3, fill=(255, 80, 80, 40))
dbg.convert('RGB').save(os.path.join(OUT, 'debug.png'))
print('ok', final.size)
