'use strict';
/**
 * DAW Tuning Cluster: redraws the iDrive 7 instrument cluster (the 1920x720 "panel" target) through cluster-render.
 *
 * The center screen is the app's own page (shared/page.js, a canvas screen): the themes with their
 * pictures, which drive mode shows which, and the settings. Each choice is saved in the app's data/settings.json
 * by the kit; the shared engine (hud.js) listens and redraws at once. It keeps running after the page is
 * closed (OAP apps stay up in the background), so the page is only needed for changes. The kit's own
 * settings list stays one tap away (the bar's All settings).
 */
const mgu = require('./kit/mgu');
const HudApp = require('./hud');
const Page = require('./page');

/** The engine, started once: by background() when the car starts the app (app.json "autostart", issue #16), or by
 * start() when it was opened first. null when it failed (nothing drawn, but the app stays up: an exit here would
 * count as a crash on the car). */
function startHud(ctx) {
    try {
        const hud = new HudApp(ctx);
        hud.start();
        process.on('exit', () => { try { hud.stop(); } catch (e) { /* exiting anyway */ } });
        return hud;
    } catch (e) {
        ctx.log.error('Cluster failed to start: ' + (e && e.stack || e));
        return null;
    }
}

mgu.run({
    background(bg) {
        // "Start with the car" off: nothing drawn until the app is opened (start() then starts the engine)
        if (bg.settings.get('autoStart') === false) { bg.log.info('Start with the car is off: waiting to be opened'); return null; }
        return startHud(bg);
    },
    start(ctx) {
        const hud = ctx.background || startHud(ctx);
        if (!hud) return;
        new Page(ctx, hud, {
            title: ctx.spec.title, what: 'cluster',
            look: { name: 'Themes', style: 'hero', tags: { daw: 'DAW Tuning', daw_red: 'Craciun · rosu', daw_ice: 'Craciun · gheata', daw_gold: 'Craciun · auriu', daw_blue: 'albastru', daw_green: 'verde', daw_violet: 'mov', daw_amber: 'portocaliu', daw_stock: 'ceasul BMW + logo', daw_xtree: 'brad · beculete', daw_xlights: 'luminite colorate', daw_silver: 'fulgi', daw_stock_xmas: 'ceasul BMW + brad', daw_stock_flake: 'ceasul BMW + fulgi', daw_stock_waze: 'ceasul BMW + Waze', daw_stock_mix: 'brad + fulg', daw_stock_trees: '4 brazi', daw_stock_flakes4: '4 fulgi', daw_stock_xmas_only: 'brad fara harta' } },
            tabs: ['look', 'map', 'settings'],
            settings: ['units', 'tempUnits', 'pressureUnits', 'clock', 'timeZone', 'tankLitres', 'redline', 'shiftBefore', 'coldGuard', 'showBoost', 'nightDim', 'cameraNotch', 'keepStrip', 'autoStart', 'holiday', 'demo'],
            // the drive mode check's candidates this app's app.json listens to (issue #8; shared/hud.js modeDiagLines)
            modeCheck: ['HMI', 'MDrive', 'Engine', 'Sport2'],
        }).start();
    },
});
