const { Clutter, Gdk, GdkX11, GdkPixbuf, Meta, Wnck } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome, addMargins, createChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const { stage } = Extension.imports.sizing
const { show, hide, activate, maximize, replaceWith, moveBy, moveTo, defaultEasing, getActor, colocate } = Extension.imports.metaWindow
const { slideOutLeft, slideOutRight, slideInFromLeft, slideInFromRight } = Extension.imports.slide
const { activeWorkspace, activateWorkspace, moveWindowToWorkspace, workspaces, getActiveWorkspaceTabList } = Extension.imports.workspaces
const { Log } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async
const { exclude } = Extension.imports.functional

const signals = new Signals()

let margin = 50
const spacerWidth = 50

let chrome
let hideChromeSid
let showChromeSid
let lastFocusedWindow



const screen = Wnck.Screen.get_default()
Log.properties(screen)



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

let margins
function start() {

    Main.wm._switchWorkspaceDone = _switchWorkspaceDone

    margins = addMargins(margin)

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

    signals.connect(global.display, 'in-fullscreen-changed', (a, b) => {
        log('>>>>>>>>>>>>>>>>>>>>>>>>>>', a, b)
        if (focusedWindow.is_fullscreen()) {
            // margins.left.width = 0
            margins.left.add_style_class_name('chrome-transparent')
            margins.right.add_style_class_name('chrome-transparent')
            margins.top.add_style_class_name('chrome-transparent')
            margins.bottom.add_style_class_name('chrome-transparent')
            Main.layoutManager.removeChrome(spine)
        }
        else {
            margins.left.remove_style_class_name('chrome-transparent')
            margins.right.remove_style_class_name('chrome-transparent')
            margins.top.remove_style_class_name('chrome-transparent')
            margins.bottom.remove_style_class_name('chrome-transparent')
            if (twoUp) {
                const tabList = getActiveWorkspaceTabList()
                const { x, y, width, height } = tabList[0].get_work_area_current_monitor()
                spine = createChrome({x: (width + mx) / 2, y: my, width: mx, height})
            }
        }
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




    const { ALT, SHIFT, RIGHT_BUTTON } = getEventModifiers(event)
    if (ALT) {
        // margin = 200
        // margins.left.save_easing_state()
        // margins.left.set_easing_duration(1000)
        // margins.right.set_easing_duration(1000)
        // margins.right.save_easing_state()
        // margins.left.width = margin
        // margins.left.restore_easing_state()
        // margins.right.restore_easing_state()
        // margins.right.width = margin
        // margins.right.x = 1920 - margin
        const tabList = getActiveWorkspaceTabList()
        // const { x, y, width, height } = tabList[0].get_work_area_current_monitor()

        tabList.forEach(metaWindow => {
            metaWindow.move_resize_frame(false, 460, 0, 1000, 1000)
            if (metaWindow.maximized_horizontally) {
                metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
                metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
            }
            else {
                metaWindow.maximize(Meta.MaximizeFlags.BOTH)
            }
        })
    
        return
    }
    if (RIGHT_BUTTON) {
        toggle2UpRight()
        cycling = ''
        return
    }
    if (visibleWindows.length === 2) {
        if (SHIFT) {
            // let [ x, y, width, height ] = getTileSize(visibleWindows[0])
            // log('@@@@@@@@@@@@@@@@@@@@', x, y, width, height)
            const mw0 = visibleWindows[0] 
            const mw1 = visibleWindows[1] 
            let fr0 = mw0.get_frame_rect()
            let fr1 = mw1.get_frame_rect()
            const {x,y, width, height} = mw0.get_work_area_current_monitor()             
            mw1.move_frame(false, 0, 0)
            mw0.move_frame(false, width - fr0.width + margin, 0)
            visibleWindows = visibleWindows.reverse()
            return
        }
        onIdle(cycleRightWindows)
        return
    }
    cycleWindows()
    return
    cycling = ''
    slideRight()
}

function handleChromeTopClick(actor, event) {
    const { SHIFT, LEFT_BUTTON, RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON) {
        moveTo(focusedWindow, {x: 200})
        return
    }
    if (SHIFT && LEFT_BUTTON)
        moveWindowToWorkspace(focusedWindow, workspaces.previousWorkspace)
    else
        activateWorkspace(workspaces.previousWorkspace)
}

function handleChromeBottomClick(actor, event) {
    const { SHIFT, LEFT_BUTTON, RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON) {
        moveBy(focusedWindow, {x: 200})
        return
    }
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

function handleFocusWindow(display) {


    const tabList = getActiveWorkspaceTabList()
    tabList.forEach(mw => {
        getActor(mw).set_scale(0, 0)
    })
    getActor(focusedWindow).set_scale(1, 1)




    // let wins = screen.get_windows()
    // log(wins.length)
    // wins.forEach(w => {
    //     log(w.get_xid(), w.get_name())
    // })


    // const t = GdkX11.X11Window.foreign_new_for_display(Gdk.Display.get_default(), wins[7].get_xid())
    // log("RRRRRR",t)
    // const pixbuf = Gdk.pixbuf_get_from_window(t, 100, 100, 5, 5)
    // const pxs = pixbuf.get_pixels()
    // log('pixbuf length' , pxs.length)

    // const colors = new Map()
    // for (let i = 0; i < pxs.length; i += 4) {
    //     const rgba = `${pxs[i]},${pxs[i+1]},${pxs[i+2]},${pxs[i+3]}`
    //     let count = colors.get(rgba) || 0
    //     colors.set(rgba, ++count)
            
    // }
    // colors.forEach((v, k) => {
    //     log(k,v)
    // })



    // pxs.forEach(p => log(p))
    // log('gggggggggggg', pixbuf.get_pixels())
    // Log.properties(pixbuf)
    // if (reordering) return
    // if (focusedWindow && !visibleWindows.includes(focusedWindow)) {
    //     maximize(focusedWindow)
    //     visibleWindows.map(hide)
    //     visibleWindows = [focusedWindow]
    // }
    // visibleWindows.map(show)
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


function cycleWindows() {
    const [window] = visibleWindows
    const windows = activeWorkspace().list_windows()
    let i = windows.indexOf(window) + 1
    if (i < 1 || (i > windows.length - 1)) 
        i = 0
    log(i, windows[i].title)
    const nextWindow = windows[i]
    replaceWith(window, nextWindow)
    visibleWindows = [nextWindow]
    activate(nextWindow)
    return false
}



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


let twoUp = false

const mx = margin
const my = mx / 1.6
let spine


function toggle2UpLeft() {
    const tabList = getActiveWorkspaceTabList()
    const { x, y, width, height } = tabList[0].get_work_area_current_monitor()

    if (!twoUp) {
        spine = createChrome({
            x: (width + mx) / 2, 
            y: my, 
            width: mx, 
            height, 
            // style: 'background-color: red;'
        })

        tabList.forEach(metaWindow => {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(true, width / 2 + 1.5 * mx, y, width / 2 - mx / 2, height)
        })
        tabList[0].move_resize_frame(true, x, y, width / 2 - mx / 2, height)
        visibleWindows = [tabList[0], tabList[1]]
    }
    else {
        Main.layoutManager.removeChrome(spine)
        tabList.forEach(metaWindow => metaWindow.move_resize_frame(false, 0, 0, width, height))

        visibleWindows = [tabList[0]]
    }
    twoUp = !twoUp
}



function toggle2UpRight() {
    const tabList = getActiveWorkspaceTabList()
    const { x, y, width, height } = tabList[0].get_work_area_current_monitor()

    if (!twoUp) {
        spine = createChrome({
            x: (width + mx) / 2, 
            y: my, 
            width: mx, 
            height, 
            // style: 'background-color: red;'
        })

        // clutter_bind_constraint_new (layer_a, CLUTTER_BIND_X, 0.0));
        const bc = new Clutter.BindConstraint()
        bc.set_source(getActor(tabList[1]))
        bc.set_coordinate(Clutter.BindCoordinate.X)
        bc.set_offset(-40)
        spine.add_constraint(bc)
        

        tabList.forEach(metaWindow => {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(true, width / 2 + 1.5 * mx, y, width / 2 - mx / 2, height)
        })
        tabList[0].move_resize_frame(true, x, y, width / 2 - mx / 2, height)
        visibleWindows = [tabList[0], tabList[1]]
    }
    else {
        Main.layoutManager.removeChrome(spine)
        tabList.forEach(metaWindow => metaWindow.move_resize_frame(false, 0, 0, width, height))

        visibleWindows = [tabList[0]]
    }
    twoUp = !twoUp
}

function getTileSize(metaWindow) {
    let {x, y, width, height } = metaWindow.get_work_area_current_monitor()
    return [x, y, (width - spacerWidth) / 2, height]
}

function easeInRight(metaWindow) {
    let [ x, y, width, height ] = getTileSize(metaWindow)
    x += width + spacerWidth + 250
    metaWindow.move_resize_frame(true, x, y, width, height)
    show(metaWindow)
    moveBy(metaWindow, {x: -250}, defaultEasing)
}

function easeInLeft(metaWindow) {
    let [ x, y, width, height ] = getTileSize(metaWindow)
    x += -250
    metaWindow.move_resize_frame(true, x, y, width, height)
    show(metaWindow)
    moveBy(metaWindow, {x: 250}, defaultEasing)
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
    const tabList = getActiveWorkspaceTabList()
    const { x, y, width, height } = tabList[0].get_work_area_current_monitor()

    if (metaWindow.get_window_type() > 0) return;
    if (twoUp) {
        if (visibleWindows[0].has_focus()) {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(false, 0, 0, width / 2, height)
        }
        if (visibleWindows[1].has_focus()) {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(false, 0, 0, width / 2, height)
        }

    }
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
    if (visible.is_fullscreen()) {
        visible.unmake_fullscreen()
        visible.was_fullscreen = true
    }
    slideOutRight(visible)
    onIdle(() => {
        if (prev.was_fullscreen) {
            prev.make_fullscreen()
            delete prev.was_fullscreen
        }
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
    if (visible.is_fullscreen()) {
        visible.unmake_fullscreen()
        visible.was_fullscreen = true
    }
    slideOutLeft(visible)
    onIdle(() => {
        if (next.was_fullscreen) {
            next.make_fullscreen()
            delete next.was_fullscreen
        }
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

