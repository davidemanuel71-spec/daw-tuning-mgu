'use strict';
/**
 * waze_opts.js - the Waze on Cluster map options in the DAW app's settings (where the map shows, BMW's turn box,
 * the HUD map's size, place and pop-up behaviour), the same commands dwz365365/id7f's control page sends
 * (id7f 0.1.3, waze_cluster_control.js, read Nov 27 2026). Written here from that protocol; no id7f code copied.
 *
 *   render control socket (/dev/shm/waze-on-cluster/ctl.sock): changes the running map at once
 *     {"cmd":"cluster"|"hud","on":"0"|"1"}   {"cmd":"guide","hide":0|1}
 *     {"cmd":"hud","hud_width_pct":"n"}  {"cmd":"hud","hud_x":"x","hud_y":"y"}  {"cmd":"hud","hud_keep_shown":"0"|"1"}
 *   patch daemon socket (/dev/shm/waze-on-cluster/patch.sock, group tm_oap_app): saves them for the next start
 *     {"cmd":"cluster"|"hud","on":0|1}  {"cmd":"hud-size","hud_width_pct":n}  {"cmd":"hud-pos","hud_x":x,"hud_y":y}
 *     {"cmd":"hud-keep-shown","on":0|1}
 *   ("guide" is saved by the render itself, in its state file.)
 *
 * Every setting starts at "keep" (Lasa cum e): nothing is sent, so installing this changes nothing. A value picked
 * is sent once, then remembered in <data>/waze_opts.json, so it isn't sent again at every start; picking "keep"
 * again only stops managing it. Both sockets hold one owner at a time (the Waze app's page while it is open): a
 * "busy" answer, a missing socket or an error is retried every RETRY_MS. Never sent: "start" (waze.js moves the
 * map), "apply"/"revert"/"reboot" (the CarPlay patch itself).
 * Plain Node 8 (the car's 8.16.2).
 */
const fs = require('fs');
const net = require('net');
const path = require('path');

const CONTROL_PATH = '/dev/shm/waze-on-cluster/ctl.sock';
const PATCH_PATH = '/dev/shm/waze-on-cluster/patch.sock';
const RETRY_MS = 5000;
const LINGER_MS = 800;
const KEEP_NUM = 9999;           // the numeric settings' "keep"
const HUD_MIN = 30, HUD_MAX = 85;
const MOVE_MAX = 400;

/** The settings, by key: what each value asks for, as { id, render: [cmd...], patch: [cmd...] }, or null for keep. */
function wanted(get) {
    const out = [];
    const shownOn = get('wzShowOn');
    if (['cluster', 'hud', 'both', 'off'].indexOf(shownOn) >= 0) {
        const c = shownOn === 'cluster' || shownOn === 'both', h = shownOn === 'hud' || shownOn === 'both';
        // the display turned on goes first, so a switch never passes through neither (as id7f does)
        const order = c && !h ? ['cluster', 'hud'] : ['hud', 'cluster'];
        const want = { cluster: c, hud: h };
        out.push({ id: 'showOn=' + shownOn,
            render: order.map((d) => ({ cmd: d, on: want[d] ? '1' : '0' })),
            patch: order.map((d) => ({ cmd: d, on: want[d] ? 1 : 0 })) });
    }
    const guide = get('wzGuide');
    if (guide === 'hide' || guide === 'show') {
        out.push({ id: 'guide=' + guide, render: [{ cmd: 'guide', hide: guide === 'hide' ? 1 : 0 }], patch: [] });
    }
    const size = Number(get('wzHudSize'));
    if (size === 0 || (size >= HUD_MIN && size <= HUD_MAX)) {
        out.push({ id: 'hudSize=' + size, render: [{ cmd: 'hud', hud_width_pct: String(size) }], patch: [{ cmd: 'hud-size', hud_width_pct: size }] });
    }
    const x = Number(get('wzHudX')), y = Number(get('wzHudY'));
    const ok = (v) => isFinite(v) && v !== KEEP_NUM && Math.abs(v) <= MOVE_MAX;
    if (ok(x) || ok(y)) {
        const px = ok(x) ? x : 0, py = ok(y) ? y : 0;
        out.push({ id: 'hudPos=' + px + ',' + py, render: [{ cmd: 'hud', hud_x: String(px), hud_y: String(py) }], patch: [{ cmd: 'hud-pos', hud_x: px, hud_y: py }] });
    }
    const keep = get('wzHudKeep');
    if (keep === 'on' || keep === 'off') {
        const k = keep === 'on' ? 1 : 0;
        out.push({ id: 'hudKeep=' + keep, render: [{ cmd: 'hud', hud_keep_shown: String(k) }], patch: [{ cmd: 'hud-keep-shown', on: k }] });
    }
    return out;
}

class WazeOpts {
    /** opts: { control, patch, dataDir }; env WAZE_CTL / WAZE_PATCH override the paths (the bench's fakes). */
    constructor(opts, log) {
        opts = opts || {};
        this.controlPath = process.env.WAZE_CTL || opts.control || CONTROL_PATH;
        this.patchPath = process.env.WAZE_PATCH || opts.patch || PATCH_PATH;
        this.memo = opts.dataDir ? path.join(opts.dataDir, 'waze_opts.json') : null;
        this.log = log;
        this.done = {};              // group ("showOn", "guide", ...) -> the id last applied
        try { this.done = JSON.parse(fs.readFileSync(this.memo, 'utf8')) || {}; } catch (e) { /* first run */ }
        this.todo = [];
        this.busy = false;
        this.timer = null;
        this.problem = null;
    }

    /** get(key): the app's setting. Queues what was picked and not yet applied. */
    apply(get) {
        const list = wanted(get), groups = list.map((w) => w.id.split('=')[0]);
        let forgot = false;
        Object.keys(this.done).forEach((g) => { if (groups.indexOf(g) < 0) { delete this.done[g]; forgot = true; } });   // back to "keep"
        if (forgot) this._save();
        this.todo = list.filter((w) => this.done[w.id.split('=')[0]] !== w.id);
        this._next();
    }

    /** For the status row: '' when there's nothing to do. */
    info() {
        if (!this.todo.length) return '';
        return 'Waze options waiting' + (this.problem ? ' (' + this.problem + ')' : '');
    }

    stop() { clearTimeout(this.timer); this.timer = null; }

    _next() {
        if (this.busy || this.timer || !this.todo.length) return;
        const w = this.todo[0];
        this.busy = true;
        this._send(this.controlPath, w.render, (err) => {
            if (err) return this._failed(w, 'Waze on Cluster: ' + err);
            if (!w.patch.length) return this._applied(w);
            this._send(this.patchPath, w.patch, (err2) => {
                // the map changed already; only saving it failed: say so, and try the whole step again later
                if (err2) return this._failed(w, 'saving it: ' + err2);
                this._applied(w);
            });
        });
    }

    _applied(w) {
        this.busy = false;
        this.problem = null;
        this.done[w.id.split('=')[0]] = w.id;
        this._save();
        this.log.info('waze options: applied ' + w.id);
        this.todo.shift();
        this._next();
    }

    _save() {
        if (!this.memo) return;
        try { fs.writeFileSync(this.memo, JSON.stringify(this.done)); } catch (e) { this.log.warn('waze options: cannot save ' + this.memo + ' (' + e.message + ')'); }
    }

    _failed(w, why) {
        this.busy = false;
        if (why !== this.problem) this.log.info('waze options: ' + w.id + ' not applied (' + why + '), retrying every ' + RETRY_MS / 1000 + ' s');
        this.problem = why;
        this.timer = setTimeout(() => { this.timer = null; this._next(); }, RETRY_MS);
    }

    /** One short connection: the commands, one per line, then closed. cb(err) — 'busy' when the socket has an owner. */
    _send(where, cmds, cb) {
        let answer = '', done = false;
        const sock = net.connect(where);
        const finish = (err) => {
            if (done) return;
            done = true;
            clearTimeout(t);
            try { sock.destroy(); } catch (e) { /* closed */ }
            if (!err && /"reason"\s*:\s*"busy"/.test(answer)) err = 'busy';
            if (!err && /"ev"\s*:\s*"refused"/.test(answer)) err = 'refused';
            cb(err || null);
        };
        const t = setTimeout(() => finish(null), LINGER_MS + 1500);
        sock.setEncoding('utf8');
        sock.on('data', (d) => { if (answer.length < 8192) answer += d; });
        sock.on('error', (e) => finish(e.code || e.message));
        sock.on('close', () => finish(null));
        sock.on('connect', () => {
            sock.write(cmds.map((c) => JSON.stringify(c) + '\n').join(''));
            setTimeout(() => { try { sock.end(); } catch (e) { /* closed */ } }, LINGER_MS);
        });
    }
}

WazeOpts.wanted = wanted;
module.exports = WazeOpts;
