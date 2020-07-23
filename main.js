const { Clutter, GLib, GObject, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { slide, slideOut, animatable, setTransition, setAddTransition } = Extension.imports.transition
const { Signals } = Extension.imports.signals
const { activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces

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
    signals.connect(global.display, 'notify::focus-window', focusWindow)




    // global.display.connect('grab-op-begin', (display, screen, metaWindow, op) => {
    //     if (!metaWindow) return;
    //     if (grabOpIsResizingHorizontally(op)) {
    //         const { width: startWidth } = metaWindow.get_frame_rect();
    //         const nmwa = getNextMetaWindow()
    //         metaWindow.connect('size-changed', () => {
    //             const { x, y, width, height } = metaWindow.get_frame_rect();
    //             nmwa.move_resize_frame(true, width, y, 1920 - width, height)
    //         });
    //     }
    //     else
    //         display.end_grab_op(display);
    // });


}

function grabOpIsResizingHorizontally(op) {
    return (op === Meta.GrabOp.RESIZING_E || op === Meta.GrabOp.RESIZING_W);

}

function handleChromeLeftClick(actor, event) {
    if (event.get_state() & (Clutter.ModifierType.BUTTON3_MASK | Clutter.ModifierType.SHIFT_MASK))
        toggle2UpLeft()
    else {
        getActiveWorkspaceTabList().map(mw => mw.maximize(Meta.MaximizeFlags.BOTH))
        slideLeft()
    }
}


function handleChromeRightClick(actor, event) {
    if (event.get_state() & (Clutter.ModifierType.BUTTON3_MASK | Clutter.ModifierType.SHIFT_MASK))
        toggle2UpRight()
    else {
        getActiveWorkspaceTabList().map(mw => mw.maximize(Meta.MaximizeFlags.BOTH))
        slideRight()
    }
}


async function toggle2UpLeft() {
    const [metaWindow] = getVisibleWindows()
    if (metaWindow.get_maximized() !== Meta.MaximizeFlags.BOTH) {
        expandLeft(metaWindow)
        return
    }
    // if (right) {
    //     log('RIGHT')
    //     expand(right)
    //     return
    // }
    // const metaWindow = left
    metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
    metaWindow.move_resize_frame(true, 0, 0, 960, 500)
    const nextMetaWindow = getNextMetaWindow()
    nextMetaWindow.get_compositor_private().hide()
    nextMetaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
    nextMetaWindow.move_resize_frame(true, 960, 0, 960, 500)
    await slideInFromRight(nextMetaWindow)
    nextMetaWindow.get_compositor_private().show()
    // metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)

}



async function toggle2UpRight() {
    const [metaWindow] = getVisibleWindows()
    if (metaWindow.get_maximized() !== Meta.MaximizeFlags.BOTH) {
        expandRight(metaWindow)
        return
    }
    // if (right) {
    //     log('RIGHT')
    //     expand(right)
    //     return
    // }
    // const metaWindow = left
    metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
    metaWindow.move_resize_frame(true, 960, 0, 960, 500)
    const prevMetaWindow = getPrevMetaWindow()
    prevMetaWindow.get_compositor_private().hide()
    prevMetaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
    prevMetaWindow.move_resize_frame(true, 0, 0, 960, 500)
    await slideInFromLeft(prevMetaWindow)
    prevMetaWindow.get_compositor_private().show()
    // metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
}

async function expandLeft(metaWindow) {
    metaWindow.maximize(Meta.MaximizeFlags.BOTH)
    const nextMetaWindow = getNextMetaWindow()
    await slideOutRight(nextMetaWindow)
    nextMetaWindow.get_compositor_private().hide()
    nextMetaWindow.maximize(Meta.MaximizeFlags.BOTH)
}

async function expandRight(metaWindow) {
    metaWindow.maximize(Meta.MaximizeFlags.BOTH)
    const prevMetaWindow = getPrevMetaWindow()
    await slideOutLeft(prevMetaWindow)
    prevMetaWindow.get_compositor_private().hide()
    prevMetaWindow.maximize(Meta.MaximizeFlags.BOTH)
}

function getNextMetaWindow() {
    const tabList = getActiveWorkspaceTabList()
    return tabList[1]
}

function getPrevMetaWindow() {
    const tabList = getActiveWorkspaceTabList()
    return tabList[tabList.length - 1]
}

function getVisibleWindows() {
    const tabList = getActiveWorkspaceTabList()
    const visibleWindows = tabList.filter(metaWindow => {
        const { x, y, width, height } = metaWindow.get_buffer_rect()
        const mwa = metaWindow.get_compositor_private()
        return mwa.is_visible() && rectIsInViewport(x, y, width, height)
    })
    return visibleWindows
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
}

function handleChromeTopClick(actor, event) {
    if (event.get_state() & (Clutter.ModifierType.BUTTON3_MASK | Clutter.ModifierType.SHIFT_MASK))
        moveWindowToWorkspace(focusedWindow, workspaces.previousWorkspace)
    else
        activateWorkspace(workspaces.previousWorkspace)
}

function handleChromeBottomClick(actor, event) {
    if (event.get_state() & (Clutter.ModifierType.BUTTON3_MASK | Clutter.ModifierType.SHIFT_MASK))
        moveWindowToWorkspace(focusedWindow, workspaces.nextWorkspace)
    else
        activateWorkspace(workspaces.nextWorkspace)
}

function handleWorkspaceChange() {
    signals.disconnectObject(workspaces.activeWorkspace)
    signals.connect(workspaces.activeWorkspace, 'window-added', addWindow)
    // signals.connect(activeWorkspace, 'window-removed', removeWindow)
}


let reordering = false
function focusWindow(display, paramSpec) {
    if (reordering) return
    lastFocusedWindow && lastFocusedWindow.get_compositor_private().hide()
    focusedWindow.get_compositor_private().show()
    lastFocusedWindow = focusedWindow
    // const tabList = getActiveWorkspaceTabList()
    // tabList.map(metaWindow => metaWindow.get_compositor_private().hide())
    // const metaWindow = tabList[0]
    // if (metaWindow) {
    //     metaWindow.get_compositor_private().show()
    //     if (metaWindow.get_maximized() !== Meta.MaximizeFlags.BOTH) {
    //         const [otherMetaWindow] = tabList.filter(mw => {
    //             return mw.get_maximized() !== Meta.MaximizeFlags.BOTH && mw !== metaWindow
    //         })
    //         otherMetaWindow.get_compositor_private().show()
    //     }
    // }
}


async function addWindow(workspace, metaWindow) {
    log('add window')
    // if (metaWindow.is_client_decorated()) return;
    if (metaWindow.get_window_type() > 1) return;
    metaWindow.maximize(Meta.MaximizeFlags.BOTH)
    // metaWindow.move_resize_frame(true,0,0,global.stage.get_width(), global.stage.get_height())
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
        tabList[0].maximize(Meta.MaximizeFlags.BOTH)
        tabList[tabList.length - 1].maximize(Meta.MaximizeFlags.BOTH)
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
    // Main.activateWindow(metaWindow)
    // metaWindow.activate(now())
}

async function slideInFromLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, { from: { x: 0 - width } })
    // Main.activateWindow(metaWindow)
    // metaWindow.activate(now())
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
    // const clone = animatable(new Clutter.Clone({ source: metaWindowActor }))
    const clone = new Clutter.Clone({ source: metaWindowActor })
    setTransition(clone, slide, {duration: 1000, delay: 2000, onComplete: () => {
        metaWindowActor.show()
        clone.destroy()
    }})
    // setAddTransition(clone, slide)
    // setRemoveTransition(clone, slide)
    // clone.inTransition = slide
    clone.set_position(x1, y1)
    Main.uiGroup.add_child(clone)
    metaWindowActor.hide()
    // await translateActor(clone, { from: [x0, y0], to: [x1, y1], duration })
    // if (rectIsInViewport(x1, y1, width, height)) {
    //     metaWindowActor.set_position(x1, y1)
    //     metaWindowActor.show()
    // }
    // clone.destroy()
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

