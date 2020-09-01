const { Clutter, Meta } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome, addMargins } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const { stage } = Extension.imports.sizing
const { show, hide, activate, maximize, replaceWith, defaultEasing, getActor, move, moveResize } = Extension.imports.metaWindow
const { slideOutLeft, slideOutRight } = Extension.imports.slide
const { activeWorkspace, activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces
const { Log } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async
const { exclude } = Extension.imports.functional

const signals = new Signals()

const margin = 20
const spacerWidth = 20

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


// Monkey patch Main.wm._switchWorkspaceDone
function _switchWorkspaceDone(shellwm) {
    this._finishWorkspaceSwitch(this._switchData);
    shellwm.completed_switch_workspace();
    // Added following lines:
    getActiveWorkspaceTabList().filter(exclude(visibleWindows)).map(hide)
    visibleWindows.map(show)
    show(focusedWindow)
}


function start() {

    Main.wm._switchWorkspaceDone = _switchWorkspaceDone

    addMargins(margin)

    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('shown', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);

    signals.connect(global.display, 'notify::focus-window', handleFocusWindow)
    signals.connect(global.display, 'window-created', addWindow)

    signals.connect(global.display, 'grab-op-begin', handleGrabOpBegin)
    signals.connect(global.display, 'grab-op-end', handleGrabOpEnd)
    signals.connect(workspaces.activeWorkspace, 'window-removed', () => {
        log('gggggggggggggggggggggggggggggggggggggggggggggggggggggggggg')
        const nextWindow = getActiveWorkspaceTabList()[1]
        show(nextWindow)
        visibleWindows = [nextWindow]
    })

    maximizeAndHideWindows()
    show(focusedWindow)
    visibleWindows = [focusedWindow]
}

function stop() {
    signals.destroy()
    Main.overview.disconnect(hideChromeSid);
    Main.overview.disconnect(showChromeSid);
    chrome.destroy()
}

// --------------------------------------------------------------------------------

function handleChromeLeftClick(actor, event) {
    const { RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON) {
        toggle2UpLeft()
        cycling = ''
        return
    }
    if (visibleWindows.length === 2) {
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
    if (visibleWindows.length === 2) {
        onIdle(cycleRightWindows)
        return
    }
    cycling = ''
    slideRight()
}

function handleChromeTopClick(actor, event) {
    const { SHIFT, LEFT_BUTTON, RIGHT_BUTTON } = getEventModifiers(event)
    if (SHIFT && LEFT_BUTTON)
        moveWindowToWorkspace(focusedWindow, workspaces.previousWorkspace)
    else
        activateWorkspace(workspaces.previousWorkspace)
}

function handleChromeBottomClick(actor, event) {
    const { SHIFT, LEFT_BUTTON, RIGHT_BUTTON } = getEventModifiers(event)
    if (SHIFT && LEFT_BUTTON)
        moveWindowToWorkspace(focusedWindow, workspaces.nextWorkspace)
    else
        activateWorkspace(workspaces.nextWorkspace)
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

function handleGrabOpBegin(display, screen, metaWindow, op) {
    if (!metaWindow) return
    const [leftWindow, rightWindow] = visibleWindows
    if (!rightWindow) return
    if (leftWindow === metaWindow) {
        global.display.end_grab_op(global.get_current_time())
        const [x, y] = global.get_pointer()
        global.display.begin_grab_op(
            rightWindow,
            Meta.GrabOp.RESIZING_W,
            true, /* pointer grab */
            true, /* frame action */
            null,
            null,
            global.get_current_time(),
            x, y
        ) 
        // rightWindow.begin_grab_op(Meta.GrabOp.RESIZING_W, true, global.get_current_time())
    }
    connectResizeListener(leftWindow, rightWindow)
}

function handleGrabOpEnd(display, screen, metaWindow, op) {
    signals.disconnectObject(metaWindow)
}

function connectResizeListener(leftWindow, rightWindow) {
    signals.connect(rightWindow, 'size-changed', (metaWindow) => {
        let {x, y, width, height } = leftWindow.get_work_area_current_monitor()
        const rwidth = metaWindow.get_frame_rect().width
        width = width - rwidth - spacerWidth
        leftWindow.move_resize_frame(false, x, y, width, height)
    });
}

// --------------------------------------------------------------------------------

function handleFocusWindow() {
    if (reordering) return
    if (focusedWindow && !visibleWindows.includes(focusedWindow)) {
        maximize(focusedWindow)
        visibleWindows.map(hide)
        visibleWindows = [focusedWindow]
    }
    visibleWindows.map(show)
    // show(focusedWindow)
}

// --------------------------------------------------------------------------------

function loop(array = [], startIndex = 0, endIndex = array.length - 1) {
    let index = startIndex
    function next() {
        if (index > endIndex)
            index = 0
        return array[index++]
    }
    return { next }
}

let windows
let cycling = ''

function cycleLeftWindows() {
    const [leftWindow, rightWindow] = visibleWindows
    const windows = activeWorkspace().list_windows().filter(exclude(rightWindow))
    if (windows.length < 2) return
    let i = windows.indexOf(leftWindow) + 1
    if (i < 1 || (i > windows.length - 1)) 
        i = 0
    log(i, windows[i].title)
    const nextWindow = windows[i]
    replaceWith(leftWindow, nextWindow)
    visibleWindows = [nextWindow, rightWindow]
    activate(nextWindow)
    return false
}

function cycleRightWindows() {
    const [leftWindow, rightWindow] = visibleWindows
    const windows = activeWorkspace().list_windows().filter(exclude(leftWindow))
    if (windows.length < 2) return
    let i = windows.indexOf(rightWindow) + 1
    if (i < 1 || (i > windows.length - 1)) 
        i = 0
    log(i, windows[i].title)
    const nextWindow = windows[i]
    replaceWith(rightWindow, nextWindow)
    visibleWindows = [leftWindow, nextWindow]
    activate(nextWindow)
    return false
}

// --------------------------------------------------------------------------------

function maximizeAndHideWindows({exclude: excluded = []} = {}) {
    getActiveWorkspaceTabList().filter(exclude(excluded)).map(maximize).map(hide)
}

function toggle2UpLeft() {
    const [left, right] = visibleWindows
    log('toggle2UpLeft', left && left.title, right && right.title)
    if (left && right) {
        maximize(left)
        slideOutRight(right).then(() => {
            maximizeAndHideWindows({exclude: [left]})
            visibleWindows = [left]
        })
        return
    }
    if (left.is_fullscreen()) {
        left.unmake_fullscreen()
        delete left.was_fullscreen
    }
    const next = getNextMetaWindow()
    visibleWindows = [left, next]
    easeInRight(next)
    let [ x, y, width, height ] = getTileSize(left)
    left.move_resize_frame(true, x, y, width, height)
}

function toggle2UpRight() {
    const [left, right] = visibleWindows
    if (left && right) {
        maximize(right)
        slideOutLeft(left).then(() => {
            maximizeAndHideWindows({exclude: [right]})
            visibleWindows = [right]
        })        
        return
    }
    if (left.is_fullscreen()) {
        left.unmake_fullscreen()
        delete left.was_fullscreen
    }
    const prev = getPrevMetaWindow(left)
    visibleWindows = [prev, left]
    easeInLeft(prev)
    let [ x, y, width, height ] = getTileSize(left)
    x = width + spacerWidth * 2
    left.move_resize_frame(false, x, y, width, height)
}

// --------------------------------------------------------------------------------

function getNextMetaWindow() {
    return getActiveWorkspaceTabList().find(exclude(visibleWindows))
}

function getPrevMetaWindow(ref) {
    const tabList = getActiveWorkspaceTabList()
    let ret = tabList[tabList.length - 1]
    if (ret === ref)
        ret = tabList[tabList.length - 2]
    return ret
}


let reordering = false

function addWindow(display, metaWindow) {
    if (metaWindow.get_window_type() > 0) return;
    maximize(metaWindow)
    slideOutRight(getNextMetaWindow())
}

function removeWindow(metaWindow) {
    slideInFromRight(nextMetaWindow)
}

function setTabListOrder(metaWindows = []) {
    reordering = true
    Promise.all(
        metaWindows.map(metaWindow => new Promise(resolve =>
            onIdle(() => {
                activate(metaWindow)
                resolve('activated')
            })
        ))
    ).then(() => { reordering = false })
}


function getTileSize(metaWindow) {
    let {x, y, width, height } = metaWindow.get_work_area_current_monitor()
    return [x, y, (width - spacerWidth) / 2, height]
}

function easeInRight(metaWindow) {
    let [ x, y, width, height ] = getTileSize(metaWindow)
    x += width + spacerWidth
    moveResize(metaWindow, x, y, width, height).ease(250)
}

function easeInLeft(metaWindow) {
    let [ x, y, width, height ] = getTileSize(metaWindow)
    moveResize(metaWindow, x, y, width, height).ease(-250)
}

function slideLeft() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    const visible = tabList[0]
    const pos = tabList.length - 1
    const prev = tabList[pos]
    if (visible.is_fullscreen()) {
        visible.unmake_fullscreen()
        visible.was_fullscreen = true
    }
    slideOutRight(visible)
    slideInFromLeft(prev)
    visibleWindows = [prev]
    maximize(visible)
    maximize(prev)
    const focusOrder = [...tabList.slice(0, pos).reverse(), ...tabList.slice(pos).reverse()]
    setTabListOrder(focusOrder)
    show(...focusOrder.slice(-1))
}

function slideInFromRight(metaWindow) {
    move(metaWindow, 0, 0).ease(global.screen_width)
}

function slideInFromLeft(metaWindow) {
    move(metaWindow, 0, 0).ease(-global.screen_width)
}

function slideRight() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    const [visible, next] = tabList
    if (visible.is_fullscreen()) {
        visible.unmake_fullscreen()
        visible.was_fullscreen = true
    }
    slideOutLeft(visible)
    slideInFromRight(next)
    visibleWindows = [next]
    maximize(visible)
    maximize(next)
    const focusOrder = [visible, ...tabList.slice(1).reverse()]
    setTabListOrder(focusOrder)
}

