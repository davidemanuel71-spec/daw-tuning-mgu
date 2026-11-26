'use strict';
/**
 * logo.js - an image widget of type "logo": a picture shipped in hud/logo/<image>.json ({ w, h, z }: z = base64 of the
 * zlib-deflated straight RGBA rows, made by tools/make_logo.py), drawn to fit the widget's box, centred, area-averaged
 * so a big picture shrinks cleanly. Plain Node 8, no dependencies.
 */
const zlib = require('zlib');
const data = require('./hud_data');

const cache = Object.create(null);

function load(name) {
    if (cache[name] !== undefined) return cache[name];
    let out = null;
    try {
        const p = data.json('logo/' + name + '.json') || {};
        if (p.z) {
            const px = zlib.inflateSync(Buffer.from(p.z, 'base64'));
            if (px.length === p.w * p.h * 4) out = { w: p.w, h: p.h, px };
        }
    } catch (e) { out = null; }
    cache[name] = out;
    return out;
}

/** RGBA pixels (straight alpha) of widget w (w.w x w.h), the picture "w.image" (default "daw") fitted inside it. */
function paintLogo(w) {
    const out = Buffer.alloc(w.w * w.h * 4, 0);
    const src = load(w.image || 'daw');
    if (!src) return out;
    const s = Math.min(w.w / src.w, w.h / src.h);          // dest px per source px
    const dw = Math.max(1, Math.round(src.w * s)), dh = Math.max(1, Math.round(src.h * s));
    const ox = Math.floor((w.w - dw) / 2), oy = Math.floor((w.h - dh) / 2);
    for (let y = 0; y < dh; y++) {
        const y0 = y / s, y1 = Math.min(src.h, (y + 1) / s);
        for (let x = 0; x < dw; x++) {
            const x0 = x / s, x1 = Math.min(src.w, (x + 1) / s);
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let sy = Math.floor(y0); sy < Math.max(Math.floor(y0) + 1, Math.ceil(y1)) && sy < src.h; sy++) {
                for (let sx = Math.floor(x0); sx < Math.max(Math.floor(x0) + 1, Math.ceil(x1)) && sx < src.w; sx++) {
                    const o = (sy * src.w + sx) * 4, al = src.px[o + 3];
                    r += src.px[o] * al; g += src.px[o + 1] * al; b += src.px[o + 2] * al; a += al; n++;
                }
            }
            if (!n || a === 0) continue;
            const d = ((oy + y) * w.w + ox + x) * 4;
            out[d] = Math.round(r / a); out[d + 1] = Math.round(g / a); out[d + 2] = Math.round(b / a);
            out[d + 3] = Math.round(a / n);
        }
    }
    return out;
}

module.exports = { paintLogo };
