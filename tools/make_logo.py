# usage: python3 tools/make_logo.py logo.jpg apps/daw_cluster/hud/logo/daw.json
import json, zlib, base64
from PIL import Image
import sys
im=Image.open(sys.argv[1]).convert('RGB')
w,h=im.size
px=im.load()
out=bytearray()
# straight RGBA: alpha = brightest channel (black background becomes see-through), colour un-premultiplied
for y in range(h):
    for x in range(w):
        r,g,b=px[x,y]
        a=max(r,g,b)
        a=0 if a<14 else min(255,int(a*1.15))
        if a==0: out+=bytes((0,0,0,0)); continue
        m=max(r,g,b)
        out+=bytes((min(255,r*255//m),min(255,g*255//m),min(255,b*255//m),a))
z=base64.b64encode(zlib.compress(bytes(out),9)).decode()
json.dump({'w':w,'h':h,'z':z},open(sys.argv[2],'w'))
print(w,h,len(z))
