const { Clutter, GObject, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { slide, slideOut, animatable } = Extension.imports.transition
const { Signals } = Extension.imports.signals
const { show, hide, activate, getActor } = Extension.imports.metaWindow
const { activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces
const { Log } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async

const signals = new Signals()

let chrome
let hideChromeSid
let showChromeSid
let lastFocusedWindow


Object.defineProperty(this, 'focusedWindow', {
    get() { return global.display.get_focus_window() }
})

const visibleWorkspaceWindows = new Map()

Object.defineProperty(this, 'visibleWindows', {
    get() { return visibleWorkspaceWindows.get(workspaces.activeWorkspace) || [] },
    set(arr = []) { visibleWorkspaceWindows.set(workspaces.activeWorkspace, arr.filter(Boolean)) }
})

// Monkey patch
function _switchWorkspaceDone(shellwm) {
    this._finishWorkspaceSwitch(this._switchData);
    //    shellwm.completed_switch_workspace();
}

// Monkey patch
function _finishWorkspaceSwitch(switchData) {
    this._switchData = null;

    for (let i = 0; i < switchData.windows.length; i++) {
        const w = switchData.windows[i];
        w.window.disconnect(w.windowDestroyId);
        w.window.get_parent().remove_child(w.window);
        w.parent.add_child(w.window);
        w.window.hide();
    }

    if (!focusedWindow) {
        visibleWindows = []
    }
    else if (!visibleWindows && focusedWindow.get_workspace() === workspaces.activeWorkspace) {
        visibleWindows = [focusedWindow]
        maximize(focusedWindow)
        show(focusedWindow)
    }
    else {
        visibleWindows.map(show)
    }

    switchData.container.destroy();
    switchData.movingWindowBin.destroy();

    this._movingWindow = null;

}

function start() {
    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('shown', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);

    Main.wm._finishWorkspaceSwitch = _finishWorkspaceSwitch
    Main.wm._switchWorkspaceDone = _switchWorkspaceDone

    signals.connect(global.workspace_manager, 'active-workspace-changed', handleWorkspaceChange)

    signals.connect(global.display, 'notify::focus-window', handleFocusWindow)

    const tabList = getActiveWorkspaceTabList()
    tabList.map(hide).map(maximize)
    show(focusedWindow)
    visibleWindows = [focusedWindow]
    handleWorkspaceChange()
}

// --------------------------------------------------------------------------------

function handleFocusWindow() {
    if (reordering) return
    if (focusedWindow && !visibleWindows.includes(focusedWindow)) {
        visibleWindows.map(hide)
        maximize(focusedWindow)
        visibleWindows = [focusedWindow]
    }
    visibleWindows.map(show)
    // show(focusedWindow)
}

// --------------------------------------------------------------------------------

function stop() {
    signals.destroy()
    Main.overview.disconnect(hideChromeSid);
    Main.overview.disconnect(showChromeSid);
    chrome.left.destroy()
    chrome.right.destroy()
    chrome.top.destroy()
    chrome.bottom.destroy()
}

function hideChrome() {
    chrome.left.hide()
    chrome.right.hide()
}

function showChrome() {
    chrome.left.show()
    chrome.right.show()
}

// --------------------------------------------------------------------------------

function handleWorkspaceChange() {
    signals.disconnectObject(workspaces.activeWorkspace)
    signals.connect(workspaces.activeWorkspace, 'window-added', addWindow)
    // signals.connect(activeWorkspace, 'window-removed', removeWindow)
}

let twoUp = false

function handleChromeLeftClick(actor, event) {
    const { RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON) {
        toggle2UpLeft()
        cycling = ''
        return
    }
    if (twoUp) {
        onIdle(cycleLeftWindows)
        return
    }
    cycling = ''
    slideLeft()
}

function handleChromeRightClick(actor, event) {
    const { RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON) {
        toggle2UpRight()
        cycling = ''
        return
    }
    if (twoUp) {
        onIdle(cycleRightWindows)
        return
    }
    cycling = ''
    slideRight()
}

function handleChromeTopClick(actor, event) {
    const { SHIFT, LEFT_BUTTON } = getEventModifiers(event)
    if (SHIFT && LEFT_BUTTON)
        moveWindowToWorkspace(focusedWindow, workspaces.previousWorkspace)
    else
        activateWorkspace(workspaces.previousWorkspace)
}

function handleChromeBottomClick(actor, event) {
    const { SHIFT, LEFT_BUTTON } = getEventModifiers(event)
    if (SHIFT && LEFT_BUTTON)
        moveWindowToWorkspace(focusedWindow, workspaces.nextWorkspace)
    else
        activateWorkspace(workspaces.nextWorkspace)
}

// --------------------------------------------------------------------------------
let index = 0
let windows
let cycling = ''
function cycleLeftWindows() {
    const [leftWindow, rightWindow] = visibleWindows

    if (cycling !== 'left') {
        cycling = 'left'
        windows = getActiveWorkspaceTabList().filter(mw => mw !== rightWindow)
        index = 0
    }
    index++
    if (index > windows.length - 1)
        index = 0

    let { x, y, width, height } = leftWindow.get_frame_rect()
    hide(leftWindow)
    maximize(leftWindow)
    const nextWindow = windows[index]

    if (!leftWindow.is_client_decorated() && nextWindow.is_client_decorated()) {
        x = x + 20
        y = y + 20
        width = width - 40
        height = height - 40
    }
    if (leftWindow.is_client_decorated() && !nextWindow.is_client_decorated()) {
        x = x - 20
        y = y - 20
        width = width + 40
        height = height + 40
    }

    visibleWindows = [nextWindow, rightWindow]
    nextWindow.move_resize_frame(true, x, y, width, height)
    // adjustWindowPosition(nextWindow, {x, y})
    show(nextWindow)
    activate(nextWindow)
    nextWindow.raise()
    rightWindow.raise()
    return false
}

function cycleRightWindows() {
    const [leftWindow, rightWindow] = visibleWindows

    if (cycling !== 'right') {
        cycling = 'right'
        windows = getActiveWorkspaceTabList().filter(mw => mw !== leftWindow)
        index = 0
    }
    index++
    if (index > windows.length - 1)
        index = 0

    let { x, y, width, height } = rightWindow.get_frame_rect()
    hide(rightWindow)
    maximize(rightWindow)
    const nextWindow = windows[index]

    if (!rightWindow.is_client_decorated() && nextWindow.is_client_decorated()) {
        x = x + 20
        y = y + 20
        width = width - 40
        height = height - 40
    }
    if (rightWindow.is_client_decorated() && !nextWindow.is_client_decorated()) {
        x = x - 20
        y = y - 20
        width = width + 40
        height = height + 40
    }


    visibleWindows = [leftWindow, nextWindow]
    nextWindow.move_resize_frame(true, x, y, width, height)
    // adjustWindowPosition(nextWindow, {x, y})
    show(nextWindow)
    activate(nextWindow)
    nextWindow.raise()
    leftWindow.raise()
    return false
}

// --------------------------------------------------------------------------------

async function toggle2UpLeft() {
    const [leftWindow, rightWindow] = visibleWindows
    log('toggle2UpLeft', leftWindow && leftWindow.title, rightWindow && rightWindow.title)
    if (leftWindow && rightWindow) {
        twoUp = false
        maximize(leftWindow)
        await slideOutRight(rightWindow)
        maximize(rightWindow)
        hide(rightWindow)
        visibleWindows = [leftWindow]
        return
    }
    const nextMetaWindow = getNextMetaWindow()
    visibleWindows = [leftWindow, nextMetaWindow]
    easeInRight(nextMetaWindow)
    const { x, y, width, height } = getTileSize(leftWindow)
    leftWindow.move_resize_frame(true, x, y, width, height)
    adjustWindowPosition(leftWindow, { x, y })
    twoUp = true
}

async function toggle2UpRight() {
    const [leftWindow, rightWindow] = visibleWindows
    if (leftWindow && rightWindow) {
        twoUp = false
        maximize(rightWindow)
        await slideOutLeft(leftWindow)
        maximize(leftWindow)
        hide(leftWindow)
        visibleWindows = [rightWindow]
        return
    }
    const prevMetaWindow = getPrevMetaWindow()
    visibleWindows = [prevMetaWindow, leftWindow]
    easeInLeft(prevMetaWindow)
    let { x, y, width, height } = getTileSize(leftWindow)
    x = x + 960
    leftWindow.move_resize_frame(true, x, y, width, height)
    adjustWindowPosition(leftWindow, { x, y })
    twoUp = true
}

function getTileSize(metaWindow) {
    let [x, y, width, height] = [2, 27, 957, 1172]
    if (metaWindow.is_client_decorated()) {
        x = x - 10
        y = y - 2
        width = width - 40
        height = height - 40
    }
    return { x, y, width, height }
}

function adjustWindowPosition(metaWindow, { x, y }) {
    if (metaWindow.is_client_decorated()) {
        x = x + 30
        y = y + 22
    }
    metaWindow.move_frame(true, x, y)
}


function easeInRight(metaWindow) {
    const mwa = getActor(metaWindow)
    mwa.hide()
    let { x, y, width, height } = getTileSize(metaWindow)
    x = x + 960
    metaWindow.move_resize_frame(true, x, y, width, height)
    const clone = new Clutter.Clone({ source: mwa })
    clone.set_position(x, y - 8)
    clone.translation_x = 250
    global.stage.add_child(clone)
    clone.ease({
        translation_x: 0,
        duration: 250,
        mode: Clutter.AnimationMode.EASE_OUT_QUINT,
        onComplete() {
            adjustWindowPosition(metaWindow, { x, y })
            mwa.show()
            global.stage.remove_child(clone)
        }
    })
}

function easeInLeft(metaWindow) {
    const mwa = getActor(metaWindow)
    mwa.hide()
    let { x, y, width, height } = getTileSize(metaWindow)
    metaWindow.move_resize_frame(true, x, y, width, height)
    const clone = new Clutter.Clone({ source: mwa })
    clone.set_position(x, y - 8)
    clone.translation_x = -250
    global.stage.add_child(clone)
    clone.ease({
        translation_x: 0,
        duration: 250,
        mode: Clutter.AnimationMode.EASE_OUT_QUINT,
        onComplete() {
            adjustWindowPosition(metaWindow, { x, y })
            mwa.show()
            global.stage.remove_child(clone)
        }
    })
}

function maximize(metaWindow) {
    log('maximize', metaWindow.title)
    metaWindow.unmaximize(Meta.MaximizeFlags.BOTH)
    let geometry = {
        x: 3,
        y: 27,
        width: 1917,
        height: 1172,
    }
    if (metaWindow.is_client_decorated()) {
        geometry = {
            x: 22,
            y: 47,
            width: 1877,
            height: 1132,
        }
    }
    const { x, y, width, height } = geometry
    metaWindow.move_resize_frame(false, x, y, width, height)
    return metaWindow
}



// --------------------------------------------------------------------------------

function getNextMetaWindow() {
    return getActiveWorkspaceTabList().find(metaWindow => !visibleWindows.includes(metaWindow))
}

function getPrevMetaWindow() {
    const tabList = getActiveWorkspaceTabList()
    return tabList[tabList.length - 1]
}


let reordering = false

async function addWindow(workspace, metaWindow) {
    log('addWindow', metaWindow.title)
    if (metaWindow.get_window_type() > 1) return;
    maximize(metaWindow)
    const tabList = getActiveWorkspaceTabList()
    await slideOutRight(tabList[1])
}

function removeWindow(metaWindow) {
    slideInFromRight(nextMetaWindow)
}

async function setTabListOrder(metaWindows = []) {
    reordering = true
    await Promise.all(
        metaWindows.map(metaWindow => new Promise(resolve =>
            onIdle(() => {
                activate(metaWindow)
                resolve('activated')
            })
        ))
    )
    reordering = false
}

async function slideLeft() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    slideOutRight(tabList[0])
    const pos = tabList.length - 1
    onIdle(() => {
        slideInFromLeft(tabList[pos]).then(() => {
            visibleWindows = [tabList[pos]]
            maximize(tabList[0])
            maximize(tabList[pos])
            const focusOrder = [...tabList.slice(0, pos).reverse(), ...tabList.slice(pos).reverse()]
            setTabListOrder(focusOrder)
            show(focusOrder.slice(-1))
        })
    })
}

async function slideRight() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    slideOutLeft(tabList[0])
    onIdle(() => {
        slideInFromRight(tabList[1]).then(() => {
            visibleWindows = [tabList[1]]
            maximize(tabList[0])
            maximize(tabList[1])
            const focusOrder = [...tabList.slice(0, 1).reverse(), ...tabList.slice(1).reverse()]
            setTabListOrder(focusOrder)
            show(focusOrder.slice(-1))
        })
    })
}

async function slideOutLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, { to: { x: 0 - width } })
}

async function slideOutRight(metaWindow) {
    if (!metaWindow) return
    return translateMetaWindow(metaWindow, { to: { x: 1920 } })
}

async function slideInFromRight(metaWindow) {
    if (!metaWindow) return
    return translateMetaWindow(metaWindow, { from: { x: 1920 } })
}

async function slideInFromLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, { from: { x: 0 - width } })
}


function rectIsInViewport(x, y, width, height) {
    return (x < 1920 && y < 1200 && x + width > 0 && y + height > 0)
}

async function translateMetaWindow(metaWindow, { from, to, duration }) {
    if (!metaWindow) return;
    const { x, y, width, height } = metaWindow.get_buffer_rect()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    // if (x0 === x1 && y0 === y1) return
    const mwa = getActor(metaWindow)
    mwa.show()
    const clone = new Clutter.Clone({ source: mwa })
    clone.set_position(x0, y0)
    Main.uiGroup.add_child(clone)
    mwa.hide()
    await translateActor(clone, { from: [x0, y0], to: [x1, y1], duration })
    if (rectIsInViewport(x1, y1, width, height)) {
        mwa.set_position(x1, y1)
        mwa.show()
    }
    clone.destroy()
}

async function translateActor(actor, { from, to, duration = 250 }) {
    const { x, y } = actor.get_position()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    if (x0 === x1 && y0 === y1) return Promise.resolve()
    actor.set_position(x0, y0)
    actor.save_easing_state()
    actor.set_easing_duration(duration)
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_QUINT)
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
    let nx = x
    let ny = y
    if (Array.isArray(xy)) {
        nx = xy[0]
        ny = xy[1]
    }
    else if (typeof xy === 'object') {
        nx = xy.x
        ny = xy.y
    }
    const ix = parseInt(nx)
    const iy = parseInt(ny)
    const rx = isNaN(ix) ? x : ix
    const ry = isNaN(iy) ? y : iy

    return [rx, ry]
}

