const { Meta } = imports.gi;
const Main = imports.ui.main;
const Signals = imports.signals;
const Extension = imports.misc.extensionUtils.getCurrentExtension();

function init() {
    log(`***************************************************************`);
    log(`${Extension.metadata.uuid} init()`);
    Signals.addSignalMethods(Extension);
}


let lastFocusedMetaWindow
const signals = []

function enable() {
    log(`${Extension.metadata.uuid} enable()`);
    
    signals.push(global.display.connect('window-created', (display, metaWindow) => {
        if (metaWindow.is_client_decorated()) return;
        if (metaWindow.get_window_type() > 1) return;
        metaWindow.maximize(Meta.MaximizeFlags.BOTH)
    }));        
    signals.push(global.display.connect('notify::focus-window', (display, paramSpec) => {
        const tabList = display.get_tab_list(Meta.TabList.NORMAL, null)
        const focusedMetaWindow = tabList[0]

        if (!focusedMetaWindow) return;
        if (focusedMetaWindow === lastFocusedMetaWindow) return;
        lastFocusedMetaWindow = focusedMetaWindow
        if (focusedMetaWindow.maximized_horizontally) return;

        const { x: fmwX, width: fmwW } = focusedMetaWindow.get_frame_rect()

        for (let i = 1; i < tabList.length; i++) {
            const metaWindow = tabList[i]
            const { x, y, width, height } = metaWindow.get_frame_rect()
            if (x === fmwW || x === 0 && fmwX === width) {
                Main.activateWindow(metaWindow)
                lastFocusedMetaWindow = focusedMetaWindow
                break;
            }
        };
        Main.activateWindow(focusedMetaWindow)
    }));

    Extension.loaded = true;
}

function disable() {
    log(`${Extension.metadata.uuid} disable()`);
    signals.forEach(signal => signal.disconnect())
    Extension.loaded = false;
}
