'use strict';
/**
 * tree.js - the DAW Christmas decorations, image widgets of type "tree": "kind": "tree" (a fir with a star and bulbs
 * whose colours run round) or "flake" (a snowflake that pulses). Pixels are drawn here on the CPU (straight alpha),
 * the whole widget is resent about once a second (a small picture, so cheap). Plain Node 8, no dependencies.
 *
 *   paint(w, phase)   RGBA pixels of widget w at colour phase `phase` (a whole number, +1 per step)
 *   Cycle             per widget: step(now) -> true when the picture changed
 */
const PALETTE = [[255, 45, 45], [255, 200, 40], [70, 200, 255], [90, 255, 130], [255, 110, 220]];
const STEP_MS = 800;

function blend(out, w, x, y, c, a) {
    if (x < 0 || y < 0 || x >= w.w || y >= w.h || a <= 0) return;
    const o = (y * w.w + x) * 4, ea = out[o + 3] / 255, na = Math.min(1, a);
    const ra = na + ea * (1 - na);
    if (ra <= 0) return;
    for (let k = 0; k < 3; k++) out[o + k] = Math.round((c[k] * na + out[o + k] * ea * (1 - na)) / ra);
    out[o + 3] = Math.round(ra * 255);
}

function disc(out, w, cx, cy, r, c, glow) {
    const R = Math.ceil(r + (glow || 0));
    for (let y = Math.floor(cy - R); y <= cy + R; y++) {
        for (let x = Math.floor(cx - R); x <= cx + R; x++) {
            const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
            const core = Math.max(0, Math.min(1, r + 0.5 - d));
            const halo = glow ? Math.max(0, 1 - Math.max(0, d - r) / glow) * 0.35 : 0;
            blend(out, w, x, y, c, Math.max(core, halo));
        }
    }
}

function seg(out, w, x0, y0, x1, y1, th, c) {
    const L = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= L * 2; i++) {
        const t = i / (L * 2);
        disc(out, w, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th / 2, c, 0);
    }
}

function star(out, w, cx, cy, r, c) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    for (let i = 0; i < 10; i++) {
        const a = pts[i], b = pts[(i + 1) % 10];
        seg(out, w, a[0], a[1], b[0], b[1], 1.6, c);
    }
    disc(out, w, cx, cy, r * 0.35, c, 0);
}

function paintTree(w, phase, out) {
    const W = w.w, H = w.h, cx = W / 2;
    const green = w.green || [40, 190, 90], pal = w.palette || PALETTE;
    star(out, w, cx, H * 0.09, Math.min(W, H) * 0.09, w.starColor || [255, 214, 60]);
    // three stacked tiers, drawn as outlines
    const tiers = [[0.17, 0.46, 0.30], [0.36, 0.68, 0.42], [0.56, 0.90, 0.52]];     // top y, bottom y, half-width (of W)
    const bulbs = [];
    tiers.forEach((t) => {
        const y0 = H * t[0], y1 = H * t[1], hw = W * t[2];
        seg(out, w, cx, y0, cx - hw, y1, 2.2, green);
        seg(out, w, cx, y0, cx + hw, y1, 2.2, green);
        seg(out, w, cx - hw, y1, cx + hw, y1, 2.2, green);
        for (let i = 0; i < 4; i++) {
            const f = (i + 0.5) / 4;
            bulbs.push([cx - hw + 2 * hw * f, y1 - ((i % 2) ? 5 : 0) * (H / 100)]);
        }
    });
    seg(out, w, cx, H * 0.91, cx, H * 0.99, 4, [150, 100, 50]);
    bulbs.forEach((b, i) => disc(out, w, b[0], b[1], Math.max(2, W * 0.035), pal[(i + phase) % pal.length], 2.5));
}

function paintFlake(w, phase, out) {
    const cx = w.w / 2, cy = w.h / 2, R = Math.min(w.w, w.h) * 0.46, col = w.color || [210, 235, 255];
    const pulse = 0.78 + 0.22 * Math.abs(Math.sin(phase * 0.7));
    const c = [Math.round(col[0] * pulse), Math.round(col[1] * pulse), Math.round(col[2] * pulse)];
    for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3, ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
        seg(out, w, cx, cy, ex, ey, 2.2, c);
        [0.5, 0.75].forEach((f) => {
            const bx = cx + Math.cos(a) * R * f, by = cy + Math.sin(a) * R * f, L = R * 0.22;
            seg(out, w, bx, by, bx + Math.cos(a + 0.8) * L, by + Math.sin(a + 0.8) * L, 1.8, c);
            seg(out, w, bx, by, bx + Math.cos(a - 0.8) * L, by + Math.sin(a - 0.8) * L, 1.8, c);
        });
    }
    disc(out, w, cx, cy, 2.6, c, 3);
}

function paint(w, phase) {
    const out = Buffer.alloc(w.w * w.h * 4, 0);
    if (w.kind === 'flake') paintFlake(w, phase, out); else paintTree(w, phase, out);
    return out;
}

class Cycle {
    constructor(w) { this.w = w; this.phase = 0; this.at = 0; }
    step(now) {
        if (now - this.at < (this.w.stepMs || STEP_MS)) return false;
        this.at = now; this.phase++;
        return true;
    }
}

module.exports = { paint, Cycle };
