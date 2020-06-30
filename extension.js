const { GLib } = imports.gi;
const Main = imports.ui.main;
const Signals = imports.signals;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const { TwoUp } = Extension.imports.main;
const { Log } = Extension.imports.utils.logger;

function init() {
    log(`***************************************************************`);
    log(`${Extension.metadata.uuid} init()`);
    Signals.addSignalMethods(Extension);
}

function enable() {
    log(`${Extension.metadata.uuid} enable()`);
    global.twoUp = new TwoUp();
    Extension.loaded = true;
}

function disable() {
    log(`${Extension.metadata.uuid} disable()`);
    global.twoUp.destroy();
    delete global.twoUp;
    Extension.loaded = false;
}
