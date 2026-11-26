# Draws the theme pictures (hud/previews/<layout>.json) and the app icon without a browser.
# These are illustrations of the layouts (scales, map window, logo), not shader renders.
# usage: python3 tools/make_previews_pil.py   (from the repo root; needs Pillow)
import base64, json, os, zlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/apps/daw_cluster/'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
THEMES = {'daw': ((240, 242, 246), (232, 36, 44)), 'daw_red': ((255, 236, 238), (255, 58, 52)),
          'daw_ice': ((226, 241, 255), (64, 170, 255)), 'daw_gold': ((255, 244, 214), (255, 196, 30))}
logo = Image.open(R + 'hud/logo/daw.json') if False else None
d0 = json.load(open(R + 'hud/logo/daw.json'))
px = zlib.decompress(base64.b64decode(d0['z']))
LOGO = Image.frombytes('RGBA', (d0['w'], d0['h']), px)

def render(lid):
    fg, acc = THEMES[lid]
    lay = json.load(open(R + 'hud/layouts/%s.json' % lid))
    mv = [w for w in lay['widgets'] if w['type'] == 'mview'][0]
    W, H = 1920, 720
    S = 2
    im = Image.new('RGB', (W * S, H * S), (0, 0, 0))
    g = ImageDraw.Draw(im)
    pts = [(x * S, y * S) for x, y in mv['path']]
    mir = [((W - x) * S, y * S) for x, y in mv['path']]
    for P, lit in ((pts, 0.55), (mir, 0.55)):
        g.line(P, fill=fg, width=5 * S, joint='curve')
        n = int(len(P) * lit)
        g.line(P[:max(2, n)], fill=acc, width=9 * S, joint='curve')
    # map window
    x, y, w, h = mv['hole']
    m = Image.new('RGB', (w * S, h * S), (8, 24, 64))
    mg = ImageDraw.Draw(m)
    for i in range(0, 60):
        a = (i * 37) % (w * S)
        mg.line([(a, h * S), (a * 0.4 + w * S * 0.3, 0)], fill=(30, 80, 190), width=3)
    for i in range(10):
        mg.line([(0, i * 52 * S), (w * S, i * 52 * S - 90 * S)], fill=(22, 60, 150), width=2 * S)
    mg.line([(w * S * 0.47, h * S), (w * S * 0.52, h * S * 0.25)], fill=(30, 200, 230), width=14 * S)
    f = ImageFont.truetype(BOLD, 34 * S)
    mg.text((w * S / 2, h * S * 0.2), 'WAZE', fill=(230, 240, 255), font=f, anchor='mm')
    mask = Image.new('L', m.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, m.size[0] - 1, m.size[1] - 1], radius=34 * S, fill=255)
    im.paste(m, (x * S, y * S), mask)
    # logo, speed, gear
    lg = LOGO.resize((110 * S, 110 * S), Image.LANCZOS)
    im.paste(lg, (905 * S, 6 * S), lg)
    fb = ImageFont.truetype(BOLD, 64 * S)
    g.text((412 * S, 590 * S), '0', fill=fg, font=fb, anchor='lm')
    g.text((1230 * S, 590 * S), 'P', fill=fg, font=fb, anchor='mm')
    fs = ImageFont.truetype(BOLD, 24 * S)
    g.text((724 * S, 608 * S), 'km/h', fill=(150, 156, 168), font=fs, anchor='lm')
    return im.resize((W, H), Image.LANCZOS)

def enc(im, size):
    im = im.resize(size, Image.LANCZOS).convert('RGBA')
    return {'w': size[0], 'h': size[1], 'z': base64.b64encode(zlib.compress(im.tobytes(), 9)).decode()}

os.makedirs(R + 'hud/previews', exist_ok=True)
for lid in THEMES:
    im = render(lid)
    json.dump({'big': enc(im, (888, 333)), 'small': enc(im, (280, 105))}, open(R + 'hud/previews/%s.json' % lid, 'w'))
    if lid == 'daw': im.save(os.environ.get('PREVIEW_PNG', '/tmp/daw_preview.png'))
# app icon: the DAW logo on black
ic = Image.new('RGBA', (140, 140), (0, 0, 0, 255))
l2 = LOGO.resize((128, 128), Image.LANCZOS)
ic.paste(l2, (6, 6), l2)
ic.save(R + 'icon.png')
print('done')
