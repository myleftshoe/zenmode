const { Clutter, Meta } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const { stage } = Extension.imports.sizing
const { show, hide, activate, maximize, getActor, createClone, replaceWith, easeIn } = Extension.imports.metaWindow
const { slideOutLeft, slideOutRight, slideInFromLeft, slideInFromRight } = Extension.imports.slide
const { activeWorkspace, activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces
const { Log } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async
const { exclude } = Extension.imports.functional

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

function start() {
    chrome = addChrome({ top: 50, right: 50, bottom: 50, left: 50 })
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
        rightWindow.begin_grab_op(Meta.GrabOp.RESIZING_W, true, global.get_current_time())
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
        width = width - rwidth
        if (metaWindow.is_client_decorated()) {
            width = width - 40
            // height = height - 20
        }
        if (leftWindow.is_client_decorated()) {
            x = x + 20
            y = y + 20
            width = width - 40
            height = height - 40
        }
        leftWindow.move_resize_frame(false, x, y, width, height)
        // adjustWindowPosition(leftWindow, { x, y })
    });
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
    const next = getNextMetaWindow()
    visibleWindows = [left, next]
    easeInRight(next)
    const { x, y, width, height } = getTileSize(left)
    const [nx,ny] = adjustWindowPosition(left, { x, y })
    left.move_resize_frame(false, nx, ny, width, height)
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
    const prev = getPrevMetaWindow(left)
    visibleWindows = [prev, left]
    easeInLeft(prev)
    let { x, y, width, height } = getTileSize(left)
    x = x + stage.width / 2
    const [nx,ny] = adjustWindowPosition(left, { x, y })
    left.move_resize_frame(false, nx, ny, width, height)
}

function getTileSize(metaWindow) {
    const wa = metaWindow.get_work_area_current_monitor()
    let [x, y, width, height] = [wa.x, wa.y, (wa.width / 2), wa.height]
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
        y = y + 20
    }
    return [x, y]
}

function easeInRight(metaWindow) {
    let { x, y, width, height } = getTileSize(metaWindow)
    x = x + metaWindow.get_work_area_current_monitor().width / 2
    metaWindow.move_resize_frame(false, x + 250, y, width, height)
    easeIn(metaWindow, { x })
}

function easeInLeft(metaWindow) {
    let { x, y, width, height } = getTileSize(metaWindow)
    metaWindow.move_resize_frame(false, x - 250, y, width, height)
    easeIn(metaWindow, { x })
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
    log('addWindow', metaWindow.title)
    if (metaWindow.get_window_type() > 1) return;
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

function slideLeft() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    const visible = tabList[0]
    const pos = tabList.length - 1
    const prev = tabList[pos]
    slideOutRight(visible)
    onIdle(() => {
        slideInFromLeft(prev).then(() => {
            visibleWindows = [prev]
            maximize(visible)
            maximize(prev)
            const focusOrder = [...tabList.slice(0, pos).reverse(), ...tabList.slice(pos).reverse()]
            setTabListOrder(focusOrder)
            show(...focusOrder.slice(-1))
        })
    })
}

function slideRight() {
    const tabList = getActiveWorkspaceTabList()
    if (tabList.length < 2) return
    const [visible, next] = tabList
    slideOutLeft(visible)
    onIdle(() => {
        slideInFromRight(next).then(() => {
            visibleWindows = [next]
            maximize(visible)
            maximize(next)
            const focusOrder = [visible, ...tabList.slice(1).reverse()]
            setTabListOrder(focusOrder)
            show(...focusOrder.slice(-1))
        })
    })
}

