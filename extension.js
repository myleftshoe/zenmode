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

    const chrome = createChrome({ top: 50, right: 20, bottom: 20, left: 20 })

    chrome.left.connect('button_press_event', () => {
        const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null)

        new Clone(tabList[0]).slideOutRight()

        log(tabList.map(w => w.title))
        for (let i = tabList.length - 1; i > 1; i--) {
            Main.activateWindow(tabList[i])
            tabList[i].get_compositor_private().hide()
            log(tabList[i].title)
        }

        new Clone(tabList[tabList.length - 1]).slideInFromLeft()
    })

    chrome.right.connect('button_press_event', () => {
        const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null)

        new Clone(tabList[0]).slideOutLeft()

        log('Before for loop')
        tabList.map((w, i) => log(i, w.title))
        for (let i = tabList.length - 1; i > 0; i--) {
            Main.activateWindow(tabList[i])
            tabList[i].get_compositor_private().hide()
            log('--->', i, tabList[i].title)
        }
        log('After for loop')
        tabList.map((w, i) => log(i, w.title))
        new Clone(tabList[1]).slideInFromRight()
    })

    signals.push(global.display.connect('window-created', (display, metaWindow) => {
        // if (metaWindow.is_client_decorated()) return;
        if (metaWindow.get_window_type() > 1) return;
        metaWindow.maximize(Meta.MaximizeFlags.BOTH)
        metaWindows.push(metaWindow)
    }));
    // signals.push(global.display.connect('notify::focus-window', (display, paramSpec) => {
    //     const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, null)
    //     const focusedMetaWindow = tabList[0]
    //     const focusedMWA = focusedMetaWindow.get_compositor_private()
    //     focusedMWA.show()

    //     for ( let i = 1; i < tabList.length; i++) {
    //         tabList[i].get_compositor_private().hide()
    //     }
    //     log("######", tabList.map(w => w.title))
    // }));

    Extension.loaded = true;
}

function disable() {
    log(`${Extension.metadata.uuid} disable()`);
    signals.forEach(signal => signal.disconnect())
    Extension.loaded = false;
}

function Clone(metaWindow) {
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor });
    return {
        slideOutLeft() {
            const { x, y, width } = metaWindow.get_buffer_rect()
            clone.set_position(x, y)
            Main.uiGroup.add_child(clone)
            metaWindowActor.hide()
            clone.save_easing_state()
            clone.set_easing_duration(350)
            clone.set_position(0 - width, y)
            const signal = clone.connect('transition_stopped', () => {
                clone.restore_easing_state()
                clone.disconnect(signal)
                clone.destroy()
            })
        },
        slideOutRight() {
            const { x, y, width } = metaWindow.get_buffer_rect()
            clone.set_position(x, y)
            Main.uiGroup.add_child(clone)
            metaWindowActor.hide()
            clone.save_easing_state()
            clone.set_easing_duration(350)
            clone.set_position(1920, y)
            const signal = clone.connect('transition_stopped', () => {
                clone.restore_easing_state()
                clone.disconnect(signal)
                clone.destroy()
            })
        },
        slideInFromRight() {
            const { x, y } = metaWindow.get_buffer_rect()
            clone.set_position(1920, y) //TODO
            Main.uiGroup.add_child(clone)
            clone.save_easing_state()
            clone.set_easing_duration(350)
            clone.set_position(x, y)
            const signal = clone.connect('transition_stopped', () => {
                clone.restore_easing_state()
                clone.disconnect(signal)
                clone.destroy()
                metaWindowActor.show()
                Main.activateWindow(metaWindow)
            })
        },
        slideInFromLeft() {
            const { x, y, width } = metaWindow.get_buffer_rect()
            clone.set_position(0 - width, y) //TODO
            Main.uiGroup.add_child(clone)
            clone.save_easing_state()
            clone.set_easing_duration(350)
            clone.set_position(x, y)
            const signal = clone.connect('transition_stopped', () => {
                clone.restore_easing_state()
                clone.disconnect(signal)
                clone.destroy()
                metaWindowActor.show()
                Main.activateWindow(metaWindow)
            })
        }
    }
}