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
    get() { return global.display.get_focus_window()}
})


function _switchWorkspaceDone(shellwm) {
    this._finishWorkspaceSwitch(this._switchData);
//    shellwm.completed_switch_workspace();
}

const visibleWorkspaceWindows = new Map()

function _finishWorkspaceSwitch(switchData) {
    this._switchData = null;

    for (let i = 0; i < switchData.windows.length; i++) {
        const w = switchData.windows[i];
        w.window.disconnect(w.windowDestroyId);
        w.window.get_parent().remove_child(w.window);
        w.parent.add_child(w.window);
        w.window.hide();
    }
    const visibleWindows = visibleWorkspaceWindows.get(workspaces.activeWorkspace)

    if (!focusedWindow) {
        visibleWorkspaceWindows.set(workspaces.activeWorkspace, [])
    }
    else if (!visibleWindows && focusedWindow.get_workspace() === workspaces.activeWorkspace) {
        visibleWorkspaceWindows.set(workspaces.activeWorkspace, [focusedWindow])
        maximize(focusedWindow)
        focusedWindow.get_compositor_private().show()
    }
    else {
        visibleWindows.map(show)
    }

    switchData.container.destroy();
    switchData.movingWindowBin.destroy();

    this._movingWindow = null;

}

function show(metaWindow) {
    log('showing', metaWindow.title, focusedWindow.title)
    metaWindow.get_compositor_private().show();
    return metaWindow
}



function start() {
    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('shown', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);


    Log.properties(global.window_manager)
    Main.wm._finishWorkspaceSwitch = _finishWorkspaceSwitch
    Main.wm._switchWorkspaceDone = _switchWorkspaceDone

    signals.connect(global.workspace_manager, 'active-workspace-changed', handleWorkspaceChange)

    const tabList = getActiveWorkspaceTabList()
    tabList.map(hide).map(maximize)
    focusedWindow.get_compositor_private().show()
    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [focusedWindow])
    handleWorkspaceChange()
}

function hide(metaWindow) {
    log(metaWindow.title)
    metaWindow.get_compositor_private().hide()
    return metaWindow
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
        cycleLeftWindows()
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
        cycleWindows()
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
    const [leftWindow, rightWindow] = visibleWorkspaceWindows.get(workspaces.activeWorkspace)

    if (cycling !== 'left') {
        cycling = 'left'
        windows = getActiveWorkspaceTabList().filter(mw => mw !== rightWindow)
        index = 0
    }
    index++
    if (index > windows.length - 1)
        index = 0

    log(leftWindow.title)
    let f = leftWindow.get_frame_rect()
    log('frame-rect', f.x, f.y, f.width, f.height)
    let b = leftWindow.get_buffer_rect()
    log('buffer-rect', b.x, b.y, b.width, b.height)
    let c = leftWindow.frame_rect_to_client_rect(f)
    log('client-rect',  c.x, c.y, c.width, c.height)
    let a = {}
    const mwa = leftWindow.get_compositor_private() 
    a.x = mwa.get_position()[0]
    a.y = mwa.get_position()[1]
    a.width = mwa.get_size()[0]
    a.height = mwa.get_size()[1]
    log('actor-rect',  a.x, a.y, a.width, a.height)

    let { x, y, width, height } = leftWindow.get_frame_rect()

    leftWindow.get_compositor_private().hide()

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


    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [nextWindow, rightWindow])
    nextWindow.move_resize_frame(true, x, y, width, height)
    // adjustWindowPosition(nextWindow, {x, y})
    nextWindow.get_compositor_private().show()
    nextWindow.activate(now)

}

function cycleWindows() {
    const [leftWindow, rightWindow] = visibleWorkspaceWindows.get(workspaces.activeWorkspace)

    if (cycling !== 'right') {
        cycling = 'right'
        windows = getActiveWorkspaceTabList().filter(mw => mw !== leftWindow)
        index = 0
    }
    index++
    if (index > windows.length - 1)
        index = 0

    let { x, y, width, height } = rightWindow.get_frame_rect()
    rightWindow.get_compositor_private().hide()
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


    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [leftWindow, nextWindow])
    nextWindow.move_resize_frame(true, x, y, width, height)
    // adjustWindowPosition(nextWindow, {x, y})
    nextWindow.get_compositor_private().show()
    nextWindow.activate(now)
}

// --------------------------------------------------------------------------------

async function toggle2UpLeft() {
    const [metaWindow, rightWindow] = visibleWorkspaceWindows.get(workspaces.activeWorkspace)
    if (metaWindow && rightWindow) {
        maximize(metaWindow)
        await slideOutRight(rightWindow)
        maximize(rightWindow)
        rightWindow.get_compositor_private().hide()
        twoUp = false
        visibleWorkspaceWindows.set(workspaces.activeWorkspace, [metaWindow])
        return
    }
    const nextMetaWindow = getNextMetaWindow()
    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [metaWindow, nextMetaWindow])
    easeInRight(nextMetaWindow)
    const { x, y, width, height } = getTileSize(metaWindow)
    metaWindow.move_resize_frame(true, x, y, width, height)
    adjustWindowPosition(metaWindow, {x, y})
    twoUp = true
}

async function toggle2UpRight() {
    const [metaWindow, rightMetaWindow] = visibleWorkspaceWindows.get(workspaces.activeWorkspace)
    log('***********1', metaWindow.title)
    rightMetaWindow && log('***********2', rightMetaWindow.title)
    if (metaWindow && rightMetaWindow) {
        maximize(rightMetaWindow)
        await slideOutLeft(metaWindow)
        maximize(metaWindow)
        metaWindow.get_compositor_private().hide()
        twoUp = false
        visibleWorkspaceWindows.set(workspaces.activeWorkspace, [rightMetaWindow])
        return
    }
    const prevMetaWindow = getPrevMetaWindow()
    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [prevMetaWindow, metaWindow])
    easeInLeft(prevMetaWindow)
    let { x, y, width, height } = getTileSize(metaWindow)
    x = x + 960
    metaWindow.move_resize_frame(true, x, y, width, height)
    adjustWindowPosition(metaWindow, {x, y})
    twoUp = true
}

function getTileSize(metaWindow) {
    let [ x, y, width, height ] = [ 2, 27, 957, 1172 ]
    if (metaWindow.is_client_decorated()) {
        x = x - 10
        y = y - 2 
        width = width - 40
        height = height - 40
    }
    return { x, y, width, height }
}

function adjustWindowPosition(metaWindow, {x, y}) {
    if (metaWindow.is_client_decorated()) {
        x = x + 30
        y = y + 22
    }
    metaWindow.move_frame(true, x, y)
}


function easeInRight(metaWindow) {
    const mwa = metaWindow.get_compositor_private()
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
            adjustWindowPosition(metaWindow, {x, y})
            mwa.show()
            global.stage.remove_child(clone) 
        }
    })
}

function easeInLeft(metaWindow) {
    const mwa = metaWindow.get_compositor_private()
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
            adjustWindowPosition(metaWindow, {x, y})
            mwa.show()
            global.stage.remove_child(clone)            
        }
    })
}

function maximize(metaWindow) {
    log('MAXIMIZE', metaWindow.title)
    metaWindow.unmaximize(Meta.MaximizeFlags.BOTH)
    metaWindow.raise()
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
            width: 1876,
            height: 1132,
        }
    }
    const { x, y, width, height } = geometry
    metaWindow.move_resize_frame(false, x, y, width, height)
    return metaWindow
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

async function slideLeft() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    slideOutRight(tabList[0])
    const pos = tabList.length - 1
    await slideInFromLeft(tabList[pos])
    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [tabList[pos]])
    maximize(tabList[0])
    maximize(tabList[pos])
    const focusOrder = [...tabList.slice(0, pos).reverse(), ...tabList.slice(pos).reverse()]
    await setTabListOrder(focusOrder)
    focusOrder.slice(-1).get_compositor_private().show()
}

async function slideRight() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    slideOutLeft(tabList[0])
    await slideInFromRight(tabList[1])
    visibleWorkspaceWindows.set(workspaces.activeWorkspace, [tabList[1]])
    const focusOrder = [...tabList.slice(0, 1).reverse(), ...tabList.slice(1).reverse()]
    await setTabListOrder(focusOrder)
    focusOrder.slice(-1).get_compositor_private().show()
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
    metaWindowActor.show()
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

