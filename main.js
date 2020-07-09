const { Clutter, Meta, GObject, GLib } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome

const { Signals: SignalsManager } = Extension.imports.signals

const signals = new SignalsManager()

let activeWorkspace
let chrome

let hideChromeSid
let showChromeSid

Object.defineProperty(this, 'now', { 
    get() { return global.get_current_time() }
})

function getActiveWorkspaceTabList() {
    return global.display.get_tab_list(Meta.TabList.NORMAL, activeWorkspace)
}

function start() {
    activeWorkspace = global.workspace_manager.get_active_workspace()

    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = slideLeft
    chrome.right.onButtonPress = slideRight
    chrome.top.onButtonPress = prevWorkspace
    chrome.bottom.onButtonPress = nextWorkspace

    hideChromeSid = Main.overview.connect('shown', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);
    
    handleWorkspaceChange()

    signals.connect(global.workspace_manager, 'active-workspace-changed', handleWorkspaceChange)
    signals.connect(global.display, 'notify::focus-window', focusWindow)
}

function hideChrome() {
    chrome.left.hide()
    chrome.right.hide()
}

function showChrome() {
    chrome.left.show()
    chrome.right.show()
}


function stop() {
    signals.destroy()
    Main.overview.disconnect(hideChromeSid);
    Main.overview.disconnect(showChromeSid);
    chrome.left.destroy()
    chrome.right.destroy()
    chrome.top.destroy()
    chrome.bottom.destroy()
    Extension.loaded = false
}

function prevWorkspace() {
    activeWorkspace.get_neighbor(Meta.MotionDirection.UP).activate(now);
}

function nextWorkspace() {
    activeWorkspace.get_neighbor(Meta.MotionDirection.DOWN).activate(now);
}

function handleWorkspaceChange() {
    signals.disconnectObject(activeWorkspace)

    activeWorkspace = global.workspace_manager.get_active_workspace()

    signals.connect(activeWorkspace, 'window-added', addWindow)
    // signals.connect(activeWorkspace, 'window-removed', removeWindow)
}


let reordering = false
function focusWindow(display, paramSpec) {
    if (reordering) return
    const metaWindow = getActiveWorkspaceTabList()[0]
    if (metaWindow) metaWindow.get_compositor_private().show()
}


async function addWindow(workspace, metaWindow) {
    log('add window')
    // if (metaWindow.is_client_decorated()) return;
    if (metaWindow.get_window_type() > 1) return;
    metaWindow.maximize(Meta.MaximizeFlags.BOTH)
    const tabList = getActiveWorkspaceTabList()
    await slideOutRight(tabList[1])
}

function removeWindow(metaWindow) {
    slideInFromRight(nextMetaWindow)
}

async function setTabListOrder(metaWindows = []) {
    reordering = true
    return Promise.all(
        metaWindows.map(metaWindow => new Promise(resolve => 
            GLib.idle_add(GLib.PRIORITY_HIGH_IDLE, () => {
                metaWindow.activate(now)
                reordering = false
                resolve('activated')
                return false
            })
        ))
    )
}


async function slideLeft() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    const [last, ...rest] = [...tabList].reverse()
    const focusOrder = [...rest, last]
    await Promise.all([
        slideOutRight(tabList[0]),
        slideInFromLeft(last)
    ])
    await setTabListOrder(focusOrder)
}

async function slideRight() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    await Promise.all([
        slideOutLeft(tabList[0]),
        slideInFromRight(tabList[1])
    ])
    // tabList.slice(1).reverse().map(metaWindow => {
    //     GLib.idle_add(GLib.PRIORITY_HIGH_IDLE, () => metaWindow.activate(now))
    // })
    const focusOrder = tabList.slice(1).reverse()
    await setTabListOrder(focusOrder)
}

async function slideOutLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, { to: {x: 0 - width} })
}

async function slideOutRight(metaWindow) {
    if (!metaWindow) return
    return translateMetaWindow(metaWindow, { to: {x: 1920}})
}

async function slideInFromRight(metaWindow) {
    if (!metaWindow) return
    return translateMetaWindow(metaWindow, {from: {x: 1920}})
    // Main.activateWindow(metaWindow)
    // metaWindow.activate(now())
}

async function slideInFromLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, {from: {x: 0 - width}})
    // Main.activateWindow(metaWindow)
    // metaWindow.activate(now())
}


function rectIsInViewport(x, y, width, height) {
    return (x < 1920 && y < 1200 && x + width > 0 && y + height > 0)
}

async function translateMetaWindow(metaWindow, {from, to, duration}) {
    if (!metaWindow) return;
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    const { x, y, width, height } = metaWindow.get_buffer_rect()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    clone.set_position(x0, y0)    
    Main.uiGroup.add_child(clone)
    metaWindowActor.hide()
    await translateActor(clone, {from: [x0, y0], to: [x1, y1], duration})
    if (rectIsInViewport(x1, y1, width, height))
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

