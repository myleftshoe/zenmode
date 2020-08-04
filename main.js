const { Clutter, GLib, GObject, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { slide, slideOut, animatable } = Extension.imports.transition
const { Signals } = Extension.imports.signals
const { activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces
const { Log } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events

const signals = new Signals()

let chrome
let hideChromeSid
let showChromeSid
let lastFocusedWindow

Object.defineProperty(this, 'now', {
    get() { return global.get_current_time() }
})


Object.defineProperty(this, 'focusedWindow', {
    get() { return getActiveWorkspaceTabList()[0] }
})

function start() {
    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('shown', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);

    handleWorkspaceChange()
    signals.connect(global.workspace_manager, 'active-workspace-changed', handleWorkspaceChange)
}

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
    const tabList = getActiveWorkspaceTabList()
    tabList.map(maximize)
    // signals.connect(activeWorkspace, 'window-removed', removeWindow)
}

function handleChromeLeftClick(actor, event) {
    const { SHIFT,  ALT, LEFT_BUTTON, RIGHT_BUTTON  } = getEventModifiers(event)
    if (SHIFT || RIGHT_BUTTON)
        toggle2UpLeft()
    else if (ALT && LEFT_BUTTON) {
        cycleLeftWindows()
    }
    else {
        getActiveWorkspaceTabList().map(maximize)
        // getActiveWorkspaceTabList().map(mw => mw.maximize(Meta.MaximizeFlags.BOTH))
        slideLeft()
    }
}

function handleChromeRightClick(actor, event) {
    const { ALT, LEFT_BUTTON, RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON)
        toggle2UpRight()
    else if (ALT && LEFT_BUTTON) {
        cycleWindows()
    }
    else {
        getActiveWorkspaceTabList().map(maximize)
        // getActiveWorkspaceTabList().map(mw => mw.maximize(Meta.MaximizeFlags.BOTH))
        slideRight()
    }
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

function cycleLeftWindows() {
    const [ leftWindow, rightWindow ] = getTopWindows()

    if (!rightWindow) {
        toggle2UpRight()
        return
    }

    const windows = getActiveWorkspaceTabList().filter(mw => mw !== rightWindow)

    let index = windows.indexOf(leftWindow) + 1
    if (index >= windows.length)
        index = 0

    const {x, y, width, height} = leftWindow.get_frame_rect()
    leftWindow.get_compositor_private().hide()
    const nextWindow = windows[index]
    nextWindow.move_resize_frame(true, x, y, width, height)
    nextWindow.get_compositor_private().show()
    nextWindow.activate(now)
    
}

function cycleWindows() {
    const [ leftWindow, rightWindow ] = getTopWindows()

    if (!rightWindow) {
        toggle2UpLeft()
        return
    }

    const windows = getActiveWorkspaceTabList().filter(mw => mw !== leftWindow)

    let index = windows.indexOf(rightWindow) + 1
    if (index >= windows.length)
        index = 0

    const {x, y, width, height} = rightWindow.get_frame_rect()
    rightWindow.get_compositor_private().hide()
    const nextWindow = windows[index]
    nextWindow.move_resize_frame(true, x, y, width, height)
    nextWindow.get_compositor_private().show()
    nextWindow.activate(now)
}

// --------------------------------------------------------------------------------

async function toggle2UpLeft() {
    const [ metaWindow, rightWindow ] = getTopWindows()
    if (metaWindow && rightWindow) {
        expandLeft(metaWindow)
        return
    }
    const nextMetaWindow = getNextMetaWindow()
    nextMetaWindow.move_frame(true, 1000, 27)
    nextMetaWindow.get_compositor_private().show()
    tileRight(nextMetaWindow)
    metaWindow.move_resize_frame(true, 3, 27, 957, 1172)
}

async function toggle2UpRight() {
    const [metaWindow, rightMetaWindow] = getTopWindows()
    if (metaWindow && rightMetaWindow) {
        expandRight(rightMetaWindow)
        return
    }
    const prevMetaWindow = getPrevMetaWindow()
    prevMetaWindow.move_resize_frame(false, 3, 27, 957, 1172)
    prevMetaWindow.get_compositor_private().show()
    tileRight(metaWindow)
}


function maximize(metaWindow) {
    log('MAXIMIZE', metaWindow.title)
    let geometry = {
        x: 3,
        y: 27,
        width: 1917,
        height: 1172,
    }
    if (metaWindow.is_client_decorated()) {
        geometry = {
            x: 23,
            y: 47,
            width: 1876,
            height: 1132,
        }
    }
    const { x, y, width, height } = geometry
    metaWindow.move_resize_frame(false, x, y, width, height)
}


function tileLeft(metaWindow) {
    let geometry = {
        x: 3,
        y: 27,
        width: 957,
        height: 1172,
    }
    if (metaWindow.is_client_decorated()) {
        geometry = {
            x: 23,
            y: 47,
            width: 916,
            height: 1132,
        }
    }
    const { x, y, width, height } = geometry
    const actor = metaWindow.get_compositor_private()
    
    actor.remove_all_transitions()
    actor.save_easing_state()
    actor.set_easing_duration(250)
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_QUAD)

    const sid = actor.connect('transitions-completed', (a, b) => {
        actor.disconnect(sid)
        actor.restore_easing_state()
        log('COMPLETED', a, b)
        metaWindow.move_resize_frame(false, x, y, width, height)
    })

    metaWindow.move_frame(true, x, y)
}

function tileRight(metaWindow) {
    let geometry = {
        x: 963,
        y: 27,
        width: 957,
        height: 1172,
    }
    if (metaWindow.is_client_decorated()) {
        geometry = {
            x: 983,
            y: 47,
            width: 916,
            height: 1132,
        }
    }
    const { x, y, width, height } = geometry
    const actor = metaWindow.get_compositor_private()
    
    actor.remove_all_transitions()
    actor.save_easing_state()
    actor.set_easing_duration(250)
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_QUAD)

    const sid = actor.connect('transitions-completed', (a, b) => {
        actor.disconnect(sid)
        actor.restore_easing_state()
        log('COMPLETED', a, b)
        metaWindow.move_resize_frame(false, x, y, width, height)
    })

    metaWindow.move_frame(true, x, y)
}

async function expandLeft(metaWindow) {
    log('iii',metaWindow.title)
    maximize(metaWindow)
    const nextMetaWindow = getNextMetaWindow()
    await slideOutRight(nextMetaWindow)
    maximize(nextMetaWindow)
    nextMetaWindow.get_compositor_private().hide()
}

async function expandRight(metaWindow) {
    let geometry = {
        x: 3,
        y: 27,
        width: 1917,
        height: 1172,
    }
    if (metaWindow.is_client_decorated()) {
        geometry = {
            x: 23,
            y: 47,
            width: 1876,
            height: 1132,
        }
    }
    const { x, y, width, height } = geometry
    const actor = metaWindow.get_compositor_private()
    
    actor.remove_all_transitions()
    actor.save_easing_state()
    actor.set_easing_duration(250)
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_QUAD)

    const sid = actor.connect('transitions-completed', (a, b) => {
        actor.disconnect(sid)
        actor.restore_easing_state()
        log('COMPLETED', a, b)
        metaWindow.move_resize_frame(false, x, y, width, height)
        const prevMetaWindow = getPrevMetaWindow()
        maximize(prevMetaWindow)
        prevMetaWindow.get_compositor_private().hide()
    })

    metaWindow.move_resize_frame(false, x, y, width, height)
}


// --------------------------------------------------------------------------------

function getNextMetaWindow() {
    const tabList = getActiveWorkspaceTabList()
    return tabList[1]
}

function getPrevMetaWindow() {
    const tabList = getActiveWorkspaceTabList()
    return tabList[tabList.length - 1]
}


function getLeftMetaWindow() {
    return getActiveWorkspaceTabList().find(metaWindow => {
        const { x } = metaWindow.get_buffer_rect()
        return (x === 1 && metaWindow.get_compositor_private().is_visible())
    })
}

function getTopWindows() {
    const tabList = getActiveWorkspaceTabList()
    const mwas = tabList
        .map(metaWindow => metaWindow.get_compositor_private())
        .filter(mwa => mwa.is_visible())
        .sort((a,b) => a.x > b.x)
        .map(mwa => mwa.meta_window)
    log('YYYY>')
    mwas.map(mw => log(mw.title))
    log('<YYYY>')
    if (!mwas.length)
        return [focusedWindow]
    return mwas
}

let reordering = false

async function addWindow(workspace, metaWindow) {
    log('add window')
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
            GLib.idle_add(GLib.PRIORITY_HIGH_IDLE, () => {
                metaWindow.activate(now)
                resolve('activated')
                return false
            })
        ))
    )
    reordering = false
}

let tabList = []
let clicks = 0
let pendingTransitions = 0


async function slideLeft() {
    if (!clicks) {
        tabList = getActiveWorkspaceTabList()
        if (tabList.length < 2) return
        tabList.map(metaWindow => metaWindow.get_compositor_private().hide())
        slideOutRight(tabList[0])
    }
    clicks++
    if (clicks >= tabList.length)
        clicks = 1
    pendingTransitions++
    const pos = tabList.length - clicks
    await slideInFromLeft(tabList[pos])
    pendingTransitions--
    if (pendingTransitions === 0) {
        maximize(tabList[0])
        maximize(tabList[tabList.length - 1])
        const focusOrder = [...tabList.slice(0, pos).reverse(), ...tabList.slice(pos).reverse()]
        clicks = 0
        await setTabListOrder(focusOrder)
        focusOrder.slice(-1).get_compositor_private().show()
    }
}

async function slideRight() {
    if (!clicks) {
        tabList = getActiveWorkspaceTabList()
        if (tabList.length < 2) return
        tabList.map(metaWindow => metaWindow.get_compositor_private().hide())
        slideOutLeft(tabList[0])
    }
    clicks++
    if (clicks >= tabList.length)
        clicks = 0
    pendingTransitions++
    await slideInFromRight(tabList[clicks])
    pendingTransitions--
    if (pendingTransitions === 0) {
        const focusOrder = [...tabList.slice(0, clicks).reverse(), ...tabList.slice(clicks).reverse()]
        clicks = 0
        await setTabListOrder(focusOrder)
        focusOrder.slice(-1).get_compositor_private().show()
    }
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
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    clone.set_position(x0, y0)
    Main.uiGroup.add_child(clone)
    metaWindowActor.hide()
    await translateActor(clone, { from: [x0, y0], to: [x1, y1], duration })
    if (rectIsInViewport(x1, y1, width, height)) {
        metaWindowActor.set_position(x1, y1)
        metaWindowActor.show()
    }
    clone.destroy()
}

async function translateActor(actor, { from, to, duration = 350 }) {
    const { x, y } = actor.get_position()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    if (x0 === x1 && y0 === y1) return Promise.resolve()
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

