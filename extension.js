const { Clutter, Meta } = imports.gi;
const Main = imports.ui.main;
const Signals = imports.signals;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const { createChrome } = Extension.imports.chrome

function init() {
    log(`***************************************************************`);
    log(`${Extension.metadata.uuid} init()`);
    Signals.addSignalMethods(Extension);
}


let lastFocusedMetaWindow
const signals = []
const metaWindows = []

function enable() {
    log(`${Extension.metadata.uuid} enable()`);
    
    const chrome = createChrome({top: 50, right: 50, bottom: 50, left: 50})


    chrome.left.connect('button_press_event',() => {
        const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null)
        const activeMetaWindow = tabList[0]
        const amwi = metaWindows.indexOf(activeMetaWindow)
        const activeMWA = activeMetaWindow.get_compositor_private();
        const clone = new Clutter.Clone({source: activeMWA});
        const { y:y1, x:x1, width } = activeMetaWindow.get_buffer_rect()
        clone.set_position(x1, y1)
        Main.uiGroup.add_child(clone)
        clone.save_easing_state()
        clone.set_easing_duration(350)
        clone.set_position(1920, y1)
        clone.connect('transition_stopped', () => {
            clone.restore_easing_state()
            clone.destroy()
        })
        const nextMetaWindow = metaWindows[amwi - 1] || metaWindows[metaWindows.length - 1]
        const clone2 = new Clutter.Clone({source: nextMetaWindow.get_compositor_private()});
        const { y, x } = nextMetaWindow.get_buffer_rect()
        clone2.set_position(-1920, y)
        Main.uiGroup.add_child(clone2)
        clone2.save_easing_state()
        clone2.set_easing_duration(350)
        clone2.set_position(x, y)
        clone2.connect('transition_stopped', () => {
            clone2.restore_easing_state()
            Main.activateWindow(nextMetaWindow)
            clone2.destroy()
        })
    })




    chrome.right.connect('button_press_event',() => {
        const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null)
        const activeMetaWindow = tabList[0]
        const amwi = metaWindows.indexOf(activeMetaWindow)
        const activeMWA = activeMetaWindow.get_compositor_private();
        const clone = new Clutter.Clone({source: activeMWA});
        const { y:y1, x:x1, width } = activeMetaWindow.get_buffer_rect()
        clone.set_position(x1, y1)
        Main.uiGroup.add_child(clone)
        clone.save_easing_state()
        clone.set_easing_duration(350)
        clone.set_position(0 - width, y1)
        clone.connect('transition_stopped', () => {
            clone.restore_easing_state()
            clone.destroy()
        })
        const nextMetaWindow = metaWindows[amwi + 1] || metaWindows[0]
        const clone2 = new Clutter.Clone({source: nextMetaWindow.get_compositor_private()});
        const { y, x } = nextMetaWindow.get_buffer_rect()
        clone2.set_position(1920, y)
        Main.uiGroup.add_child(clone2)
        clone2.save_easing_state()
        clone2.set_easing_duration(350)
        clone2.set_position(x, y)
        clone2.connect('transition_stopped', () => {
            clone2.restore_easing_state()
            Main.activateWindow(nextMetaWindow)
            clone2.destroy()
        })
    })

    signals.push(global.display.connect('window-created', (display, metaWindow) => {
        // if (metaWindow.is_client_decorated()) return;
        if (metaWindow.get_window_type() > 1) return;
        metaWindow.maximize(Meta.MaximizeFlags.BOTH)
        metaWindows.push(metaWindow)
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
