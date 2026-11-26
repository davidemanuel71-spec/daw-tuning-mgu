# Turns bench screenshots of the cluster (1920x720 aspect) into hud/previews/<layout>.json.
# usage: python3 tools/previews_from_png.py daw=shot1.png daw_red=shot2.png ...
import base64, json, os, sys, zlib
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/apps/daw_cluster/hud/previews/'
os.makedirs(R, exist_ok=True)
def enc(im, size):
    im = im.resize(size, Image.LANCZOS).convert('RGBA')
    return {'w': size[0], 'h': size[1], 'z': base64.b64encode(zlib.compress(im.tobytes(), 9)).decode()}
for a in sys.argv[1:]:
    lid, png = a.split('=')
    im = Image.open(png).convert('RGB')
    json.dump({'big': enc(im, (888, 333)), 'small': enc(im, (280, 105))}, open(R + lid + '.json', 'w'))
print('ok')
