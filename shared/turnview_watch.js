'use strict';
/**
 * turnview_watch.js - whether IterioDev's Turn View (the front camera in the cluster's central map area) is switched
 * on with its picture in the cluster, so a DAW theme with a map window can open it for the camera while the Waze map
 * isn't showing (hud.js "camFree").
 *
 * Turn View's tool keeps a control socket, /run/iteriodev-turnview/ctl.sock (0666, newline JSON): {"op":"get"} is
 * answered with { state: { settings, status } } (IterioDev/car-apps tools/iteriodev-turnview/turnview.js, tool 0.11.0,
 * read Nov 27 2026; nothing of it copied here). On: settings.enabled true and settings.picture not "hu" (the picture
 * on the head unit instead). We only ask; nothing is ever set. No socket (Turn View not installed): off, quietly.
 *
 * Big camera (0.26.0): Turn View 0.11.0 draws in a theme's window when cluster-render tells it that `map` is hosted
 * into `panel` (the host DAW already sends for Waze) and the slot file /dev/shm/iteriodev-clusterdesign/slot says
 * `turnview` (the interface it has for IterioDev's cluster design): the camera then fills the host's rect, cropped,
 * instead of BMW's small central map area. With the map hosted and the file saying anything else it draws nothing,
 * which leaves the cluster's videos to Waze. slot(on) writes `turnview` or an empty file, and removes it at stop().
 * Plain Node 8 (the car's 8.16.2).
 */
const fs = require('fs');
const net = require('net');
const path = require('path');

const CTL = '/run/iteriodev-turnview/ctl.sock';
const SLOT_FILE = '/dev/shm/iteriodev-clusterdesign/slot';
const POLL_MS = 5000;          // (each ask is a short connection; Turn View logs every client)
const WAIT_MS = 1500;

class TurnViewWatch {
    /** opts: { control }; env TURNVIEW_CTL overrides it (the bench). onChange(on) when "on" changes. */
    constructor(opts, log, onChange) {
        opts = opts || {};
        this.path = process.env.TURNVIEW_CTL || opts.control || CTL;
        this.slotPath = process.env.TURNVIEW_SLOT_FILE || opts.slot || SLOT_FILE;
        this.slotSaid = null;        // what we last wrote to the slot file: 'turnview', '' or null (nothing of ours there)
        this.log = log;
        this.onChange = onChange || (() => {});
        this.on = false;
        this.camera = null;          // Turn View's status.camera, for the log
        this.asking = false;
        this.timer = null;
        this.lastErr = null;
    }

    start() {
        this.timer = setInterval(() => this._ask(), POLL_MS);
        this._ask();
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;
        if (this.slotSaid !== null) { try { fs.unlinkSync(this.slotPath); } catch (e) { /* gone */ } this.slotSaid = null; }
    }

    /** The camera in the theme's window (true) or not (false: Turn View draws nothing while the map is hosted). Written
     *  only while Turn View is there, and only when it changes. */
    slot(on) {
        const want = on ? 'turnview' : '';
        if (!this.on && this.slotSaid === null) return;
        if (want === this.slotSaid) return;
        try {
            fs.mkdirSync(path.dirname(this.slotPath));
        } catch (e) { /* there */ }
        try {
            fs.writeFileSync(this.slotPath + '.new', want + '\n');
            fs.chmodSync(this.slotPath + '.new', 0o644);
            fs.renameSync(this.slotPath + '.new', this.slotPath);
            this.slotSaid = want;
            this.log.info('turn view: ' + (on ? 'its camera in the theme\'s window' : 'no camera in the theme\'s window (Waze\'s turn)'));
        } catch (e) { this.log.warn('turn view: cannot write ' + this.slotPath + ' (' + e.message + ')'); }
    }

    _ask() {
        if (this.asking) return;
        this.asking = true;
        let buf = '', done = false;
        const sock = net.connect(this.path);
        const finish = (state, err) => {
            if (done) return;
            done = true;
            clearTimeout(t);
            try { sock.destroy(); } catch (e) { /* closed */ }
            this.asking = false;
            if (err && err !== this.lastErr && err !== 'ENOENT') this.log.info('turn view: ' + err);
            this.lastErr = err || null;
            this._set(state);
        };
        const t = setTimeout(() => finish(null, 'no answer'), WAIT_MS);
        sock.setEncoding('utf8');
        sock.on('error', (e) => finish(null, e.code || e.message));
        sock.on('close', () => finish(null, null));
        sock.on('data', (d) => {
            buf += d;
            let i;
            while ((i = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, i);
                buf = buf.slice(i + 1);
                try {
                    const j = JSON.parse(line);
                    if (j && j.state) return finish(j.state, null);
                } catch (e) { /* not ours */ }
            }
            if (buf.length > 65536) finish(null, 'answer too long');
        });
        sock.on('connect', () => sock.write(JSON.stringify({ op: 'get' }) + '\n'));
    }

    _set(state) {
        const s = state && state.settings, st = state && state.status;
        const on = !!(s && s.enabled === true && s.picture !== 'hu');
        this.camera = st && st.camera ? String(st.camera) : null;
        if (on === this.on) return;
        this.on = on;
        this.log.info('turn view: ' + (on ? 'on, camera in the cluster (' + (this.camera || '?') + ')' : 'off'));
        this.onChange(on);
    }
}

module.exports = TurnViewWatch;
