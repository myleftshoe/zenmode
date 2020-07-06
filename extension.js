const { Clutter, Meta, GObject } = imports.gi
const Main = imports.ui.main
const Signals = imports.signals
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome

const { Signals: SignalsManager } = Extension.imports.signals

const signals = new SignalsManager()

const uuid = Extension.metadata.uuid

let activeWorkspace
let metaWindows = []
let focusedMetaWindow
let chrome

let activeWorkspaceWindowAddedSid
let activeWorkspaceWindowRemovedSid

function init() {
    log(`***************************************************************`)
    log(`${uuid} init()`)
    Signals.addSignalMethods(Extension)
}

function enable() {
    log(`${uuid} enable()`)

    activeWorkspace = global.workspace_manager.get_active_workspace()

    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = slideLeft
    chrome.right.onButtonPress = slideRight
    chrome.top.onButtonPress = prevWorkspace
    chrome.bottom.onButtonPress = nextWorkspace
    
    handleWorkspaceChange()

    signals.connect(global.workspace_manager, 'active-workspace-changed', handleWorkspaceChange)
    signals.connect(global.display, 'notify::focus-window', focusWindow)

    Extension.loaded = true
}

function disable() {
    log(`${uuid} disable()`)
    signals.list()
    signals.destroy()
    chrome.left.destroy()
    chrome.right.destroy()
    chrome.top.destroy()
    chrome.bottom.destroy()
    Extension.loaded = false
}


function prevWorkspace() {
    activeWorkspace.get_neighbor(Meta.MotionDirection.UP).activate(global.get_current_time());
}

function nextWorkspace() {
    activeWorkspace.get_neighbor(Meta.MotionDirection.DOWN).activate(global.get_current_time());
}

function handleWorkspaceChange() {

    activeWorkspaceWindowAddedSid && signals.disconnect(activeWorkspaceWindowAddedSid)
    activeWorkspaceWindowRemovedSid && signals.disconnect(activeWorkspaceWindowRemovedSid)

    activeWorkspace = global.workspace_manager.get_active_workspace()
    metaWindows = global.display.get_tab_list(Meta.TabList.NORMAL, activeWorkspace)
    // focusedMetaWindow = metaWindows[0]    

    activeWorkspaceWindowAddedSid = signals.connect(activeWorkspace, 'window-added', addWindow)
    activeWorkspaceWindowRemovedSid = signals.connect(activeWorkspace, 'window-removed', removeWindow)
}


function addWindow(workspace, addedMetaWindow) {
    if (addedMetaWindow.is_client_decorated()) return;
    if (addedMetaWindow.get_window_type() > 1) return;
    addedMetaWindow.maximize(Meta.MaximizeFlags.BOTH)
    signals.connect(addedMetaWindow, 'size-changed', handleWindowSizeChange)
    metaWindows.push(addedMetaWindow)

}

function handleWindowSizeChange(metaWindow) {
    const mwi = metaWindows.indexOf(metaWindow)
    if (metaWindow.get_maximized() < 2) {
        removeWindow(activeWorkspace, metaWindow)
        Main.activateWindow(metaWindows[mwi] || metaWindows[0] || undefined)
        return
    }
    focusedMetaWindow = metaWindows[mwi] || metaWindows[mwi - 1] || metaWindows[0] || undefined
    if (mwi < 0) {
        metaWindows.push(metaWindow)
    }    
}

function removeWindow(workspace, removedMetaWindow) {
    const mwi = metaWindows.indexOf(removedMetaWindow)
    metaWindows.splice(mwi, 1)
    // metaWindows = metaWindows.filter(metaWindow => metaWindow !== removedMetaWindow)
    const nextMetaWindow = metaWindows[mwi]
    slideInFromRight(nextMetaWindow)
}

function focusWindow(display, paramSpec) {
    const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, activeWorkspace)
    if (tabList[0].is_client_decorated()) return;
    if (!tabList[0]) return;
    metaWindows.forEach((metaWindow) => metaWindow.get_compositor_private().hide())
    focusedMetaWindow = tabList[0]
    focusedMetaWindow.get_compositor_private().show()
}

function slideLeft() {
    if (metaWindows.length < 2) return;
    const nextMetaWindow =
        metaWindows[metaWindows.indexOf(focusedMetaWindow) - 1] ||
        metaWindows[metaWindows.length - 1]
    slideOutRight(focusedMetaWindow)
    slideInFromLeft(nextMetaWindow)
}

function slideRight() {
    if (metaWindows.length < 2) return;
    const nextMetaWindow =
        metaWindows[metaWindows.indexOf(focusedMetaWindow) + 1] ||
        metaWindows[0]
    slideOutLeft(focusedMetaWindow)
    slideInFromRight(nextMetaWindow)
}

function slideOutLeft(metaWindow) {
    const { width } = metaWindow.get_buffer_rect()
    translateMetaWindow(metaWindow, { to: {x: 0 - width} })
}

function slideOutRight(metaWindow) {
    translateMetaWindow(metaWindow, { to: {x: 1920}})
}

async function slideInFromRight(metaWindow) {
    await translateMetaWindow(metaWindow, {from: {x: 1920}})
    Main.activateWindow(metaWindow)
}

async function slideInFromLeft(metaWindow) {
    const { width } = metaWindow.get_buffer_rect()
    await translateMetaWindow(metaWindow, {from: {x: 0 - width}})
    Main.activateWindow(metaWindow)
}


async function translateMetaWindow(metaWindow, {from, to, duration}) {
    if (!metaWindow) return;
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    const { x, y } = metaWindow.get_buffer_rect()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    clone.set_position(x0, y0)    
    Main.uiGroup.add_child(clone)
    metaWindowActor.hide()
    await translateActor(clone, {from: [x0, y0], to: [x1, y1], duration})
    metaWindowActor.show()
    clone.destroy()
}

async function translateActor(actor, {from, to, duration = 350}) {
    const { x, y } = actor.get_position()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    actor.set_position(x0, y0)
    actor.save_easing_state()
    actor.set_easing_duration(duration)
    actor.set_position(x1, y1)
    return new Promise(resolve => {
        const signal = actor.connect('transition-stopped', () => {
            actor.restore_easing_state()
            actor.disconnect(signal)
            resolve('complete')
        })
    })
}

// accepts point in form {x}, {y}, {x, y}, [x], [,y] or [x,y]
// replaces missing values with x and y from second parameter [x, y]
// returns point in form [x,y] 
function coalesceXY(xy, [x, y]) {
    if (Array.isArray(xy)) return [xy[0] || x, xy[1] || y]
    if (typeof xy === 'object') return [xy.x || x, xy.y || y ]
    return [x,y]
}

