const { Meta } = imports.gi;
const Main = imports.ui.main;
const Extension = imports.misc.extensionUtils.getCurrentExtension();


let lastFocusedMetaWindow

var TwoUp = class TwoUp {

    constructor() {
        this.signals = []
        this.signals.push(global.display.connect('window-created', (display, metaWindow) => {
            metaWindow.maximize(Meta.MaximizeFlags.BOTH)
        }));        
        this.signals.push(global.display.connect('notify::focus-window', (display, paramSpec) => {
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
    }

    destroy() {
        this.signals.forEach(signal => signal.disconnect())
    }
}


