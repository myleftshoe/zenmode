const { Clutter, Meta } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const { stage } = Extension.imports.sizing
const { show, hide, activate, maximize, getActor, createClone, replaceWith, easeIn } = Extension.imports.metaWindow
const { slideOutLeft, slideOutRight, slideInFromLeft, slideInFromRight } = Extension.imports.slide
const { activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces
const { Log } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async
const { not } = Extension.imports.functional

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
        let { x, y, width, height } = metaWindow.get_frame_rect()
        x = 0
        width = global.stage.get_width() - width
        leftWindow.move_resize_frame(true, x, y, width, height)
        adjustWindowPosition(leftWindow, { y, y })
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

function loop(array = []) {
    function* generate(array = []) {
        yield* array
    }
    let generator = generate(array)
    function next() {
        let { value, done } = generator.next()
        if (done) {
            generator = generate(array)
            value = generator.next().value
        }
        return value
    }
    return { next }
}

let windows
let cycling = ''

function cycleLeftWindows() {
    const [leftWindow, rightWindow] = visibleWindows
    
    let nextWindow

    if (cycling !== 'left') {
        cycling = 'left'
        windows = loop(getActiveWorkspaceTabList().filter(not(rightWindow)))
        nextWindow = windows.next()
    }

    nextWindow = windows.next()
    
    replaceWith(leftWindow, nextWindow)

    visibleWindows = [nextWindow, rightWindow]
    show(nextWindow)
    activate(nextWindow)
    nextWindow.raise()
    rightWindow.raise()

    return false
}

function cycleRightWindows() {
    const [leftWindow, rightWindow] = visibleWindows

    let nextWindow

    if (cycling !== 'right') {
        cycling = 'right'
        windows = loop(getActiveWorkspaceTabList().filter(not(leftWindow)))
        nextWindow = windows.next()
    }

    nextWindow = windows.next()

    replaceWith(rightWindow, nextWindow)

    visibleWindows = [leftWindow, nextWindow]
    show(nextWindow)
    activate(nextWindow)
    nextWindow.raise()
    leftWindow.raise()

    return false
}

// --------------------------------------------------------------------------------

function maximizeAndHideWindows({exclude = []} = {}) {
    getActiveWorkspaceTabList().filter(metaWindow => !exclude.includes(metaWindow)).map(maximize).map(hide)
}

async function toggle2UpLeft() {
    const [leftWindow, rightWindow] = visibleWindows
    log('toggle2UpLeft', leftWindow && leftWindow.title, rightWindow && rightWindow.title)
    if (leftWindow && rightWindow) {
        maximize(leftWindow)
        await slideOutRight(rightWindow)
        maximizeAndHideWindows({exclude: [leftWindow]})
        visibleWindows = [leftWindow]
        return
    }
    const nextMetaWindow = getNextMetaWindow()
    visibleWindows = [leftWindow, nextMetaWindow]
    easeInRight(nextMetaWindow)
    const { x, y, width, height } = getTileSize(leftWindow)
    leftWindow.move_resize_frame(true, x, y, width, height)
    adjustWindowPosition(leftWindow, { x, y })
}

async function toggle2UpRight() {
    const [leftWindow, rightWindow] = visibleWindows
    if (leftWindow && rightWindow) {
        maximize(rightWindow)
        await slideOutLeft(leftWindow)
        maximizeAndHideWindows({exclude: [rightWindow]})
        visibleWindows = [rightWindow]
        return
    }
    const prevMetaWindow = getPrevMetaWindow()
    visibleWindows = [prevMetaWindow, leftWindow]
    easeInLeft(prevMetaWindow)
    let { x, y, width, height } = getTileSize(leftWindow)
    x = x + stage.width / 2
    leftWindow.move_resize_frame(true, x, y, width, height)
    adjustWindowPosition(leftWindow, { x, y })
}

function getTileSize(metaWindow) {
    let [x, y, width, height] = [2, 27, (stage.width / 2) - 3, stage.height - 28]
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
    let { x, y, width, height } = getTileSize(metaWindow)
    x = x + stage.width / 2
    metaWindow.move_resize_frame(true, x + 250, y, width, height)
    easeIn(metaWindow, { x })
}

function easeInLeft(metaWindow) {
    let { x, y, width, height } = getTileSize(metaWindow)
    metaWindow.move_resize_frame(true, x - 250, y, width, height)
    easeIn(metaWindow, { x })
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

function addWindow(display, metaWindow) {
    log('addWindow', metaWindow.title)
    if (metaWindow.get_window_type() > 1) return;
    maximize(metaWindow)
    slideOutRight(getNextMetaWindow())
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

