const { Clutter, Cogl, Gdk, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome, addMargins, createChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const Log = Extension.imports.logger
const { ll, logArguments } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async
const { exclude } = Extension.imports.functional
const { getDominantColor } = Extension.imports.pixbuf
const { LayoutManager, single, split, centered } = Extension.imports.layoutManager
const { 
    activeWorkspace, 
    activateWorkspace, 
    moveWindowToWorkspace, 
    workspaces, 
    getActiveWorkspaceTabList 
} = Extension.imports.workspaces
const {
    augment,
    show,
    hide,
    activate,
    maximize,
    replaceWith,
    moveBy,
    moveTo,
    getActor,
    getImage,
    getPixels,
    isTiledLeft,
    isTiledRight,
    isFullSize,
    intersects,
    rectToBox,
    alignLeft,
    getFrameBox,
    alignToActor,
} = Extension.imports.metaWindow

const signals = new Signals()

let margin = 40
const spacerWidth = 40

let chrome
let hideChromeSid
let showChromeSid
let lastFocusedWindow


function getTileMatch(metaWindow) {
    let match = null
    if (isTiledLeft(metaWindow)) {
        const tabList = getActiveWorkspaceTabList()
        match = tabList.find(mw => isTiledRight(mw) && !intersects(mw, metaWindow))
    }
    if (isTiledRight(metaWindow)) {
        const tabList = getActiveWorkspaceTabList()
        match = tabList.find(mw => isTiledLeft(mw) && !intersects(mw, metaWindow))
    }
    return match
}


Object.defineProperty(this, 'focusedWindow', {
    get() { return global.display.get_focus_window() }
})


let margins
let layout

function positionWindows() {
    const tabList = getActiveWorkspaceTabList()
    layout.get_children().forEach((actor, i) => {
        const metaWindow = tabList[i]
        log(i, metaWindow.title, ...Object.values(actor.getSize()))
        metaWindow.move_resize_frame(false, ...Object.values(actor.getSize()))
    })
}



function start() {
    layout = new LayoutManager()
    layout.connect('layout-changed', positionWindows)
    layout.setLayout(single)
    global.stage.add_child(layout)
    margins = addMargins(margin)
    margins.top.onButtonPress = () => layout.toggleSplitLayout()

    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('shown', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);

    signals.connect(global.display, 'notify::focus-window', handleFocusWindow)
    signals.connect(global.display, 'window-created', addWindow)
    signals.connect(global.display, 'restacked', () => { ll('restacked') })

    signals.connect(global.display, 'grab-op-begin', handleGrabOpBegin)
    signals.connect(global.display, 'grab-op-end', handleGrabOpEnd)
    signals.connect(workspaces.activeWorkspace, 'window-removed', () => {
        const nextWindow = getActiveWorkspaceTabList()[1]
        nextWindow && show(nextWindow)
    })

    Main.overview.connect('showing', () => {
        ll('overview showing')
        margins.left.add_style_class_name('chrome-transparent')
        margins.right.add_style_class_name('chrome-transparent')
        margins.top.add_style_class_name('chrome-transparent')
        margins.bottom.add_style_class_name('chrome-transparent')
        spine && Main.layoutManager.removeChrome(spine)
    })

    Main.overview.connect('hiding', () => {
        ll('overview hiding')
        margins.left.remove_style_class_name('chrome-transparent')
        margins.right.remove_style_class_name('chrome-transparent')
        margins.top.remove_style_class_name('chrome-transparent')
        margins.bottom.remove_style_class_name('chrome-transparent')
        spine && Main.layoutManager.addChrome(spine)
    })

    signals.connect(global.display, 'in-fullscreen-changed', (display) => {
        ll('in-fullscreen-changed', `${focusedWindow.title} is fullscreen: ${focusedWindow.is_fullscreen()}`)
        if (focusedWindow.is_fullscreen()) {
            // margins.left.width = 0
            margins.left.add_style_class_name('chrome-transparent')
            margins.right.add_style_class_name('chrome-transparent')
            margins.top.add_style_class_name('chrome-transparent')
            margins.bottom.add_style_class_name('chrome-transparent')
            spine && Main.layoutManager.removeChrome(spine)
        }
        else {
            margins.left.remove_style_class_name('chrome-transparent')
            margins.right.remove_style_class_name('chrome-transparent')
            margins.top.remove_style_class_name('chrome-transparent')
            margins.bottom.remove_style_class_name('chrome-transparent')
            if (!isFullSize(focusedWindow)) {
                const [left, right] = getTiles()
                if (right) {
                    const { x, y, width, height } = left.get_work_area_current_monitor()
                    spine = createChrome({
                        x: (width + mx) / 2,
                        y: my,
                        width: mx,
                        height
                    })
                }
            }
        }
    })

    maximizeAndHideWindows()
    show(focusedWindow)
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
    const [left, right] = getTiles()
    if (left && right) {
        onIdle(cycleLeftWindows)
        return
    }
    cycling = ''
}

function handleChromeRightClick(actor, event) {

    const { ALT, SHIFT, RIGHT_BUTTON } = getEventModifiers(event)
    if (ALT) {
        const tabList = getActiveWorkspaceTabList()
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

    const [left, right] = getTiles()
    const t0 = augment(left)
    
    if (left && right) {
        const tilesIntersect = right.intersects(left)
        log('YYYYYYYYYYYYYYYYYYYYYYYYYY', `${left.title} and ${right.title} ${tilesIntersect && "DO NOT "}intersect`)
        if (!tilesIntersect) {
            if (SHIFT) {
                let { width: leftWidth } = left.get_frame_rect()
                const { width: workAreaWidth } = left.get_work_area_current_monitor()
                leftWindow.move_frame(false, workAreaWidth - leftWidth + margin, 0)
                rightWindow.move_frame(false, 0, 0)
                return
            }
            onIdle(cycleRightWindows)
            return
        }
    }
    cycleWindows()
}

function handleChromeTopClick(actor, event) {
    const { SHIFT, LEFT_BUTTON, RIGHT_BUTTON } = getEventModifiers(event)
    if (RIGHT_BUTTON) {
        moveTo(focusedWindow, { x: 200 })
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
        moveBy(focusedWindow, { x: 200 })
        return
    }
    if (SHIFT && LEFT_BUTTON)
        moveWindowToWorkspace(focusedWindow, workspaces.nextWorkspace)
    else
        activateWorkspace(workspaces.nextWorkspace)
}

function hideChrome() {
    ll('overview hidden')
    margins.top.show()
    margins.bottom.show()
    margins.left.show()
    margins.right.show()
    chrome.left.show()
    chrome.right.show()
}

function showChrome() {
    ll('overview shown')
    margins.top.hide()
    margins.bottom.hide()
    margins.left.hide()
    margins.right.hide()
    chrome.left.hide()
    chrome.right.hide()
}

// --------------------------------------------------------------------------------

let grabbed = false;
let spinegrab = false
function handleGrabOpBegin(display, screen, metaWindow, op) {
    if (!metaWindow) return
    if (!spinegrab) {
        global.display.end_grab_op(global.get_current_time())
        global.sync_pointer()
        return
    }
    if (grabbed) return
    const [leftWindow, rightWindow] = getTiles()
    if (!rightWindow) return
    global.display.end_grab_op(global.get_current_time())
    grabbed = true
    const [x, y] = global.get_pointer()
    global.display.begin_grab_op(
        rightWindow,
        Meta.GrabOp.RESIZING_W,
        false, /* pointer grab */
        false, /* frame action */
        null,
        null,
        global.get_current_time(),
        x, y
    )
    connectResizeListener(leftWindow, rightWindow)
}

let savedPointerPosition
function handleGrabOpEnd(_display, _screen, metaWindow, op) {
    ll('handleGrabOpEnd', op)
    if (op !== Meta.GrabOp.RESIZING_W) return
    if (spinegrab)
        savedPointerPosition = global.get_pointer()
    if (grabbed) {
        grabbed = false
        spinegrab = false
    }
    signals.disconnectObject(metaWindow)
}

function connectResizeListener(leftWindow, rightWindow) {
    signals.connect(rightWindow, 'size-changed', (metaWindow) => {
        let { x, y, width, height } = leftWindow.get_work_area_current_monitor()
        const rwidth = metaWindow.get_frame_rect().width
        width = width - rwidth - spacerWidth
        leftWindow.move_resize_frame(false, x, y, width, height)
    });
}

// --------------------------------------------------------------------------------

function handleFocusWindow(display) {
    ll('handleFocusWindow')
}

// --------------------------------------------------------------------------------


let windows
let cycling = ''

function getTiles() {
    const tabList = getActiveWorkspaceTabList()
    const left = tabList.find(isTiledLeft)
    const right = tabList.find(isTiledRight)
    return [left, right]
}

function cycleWindows() {
    const window = focusedWindow

    const windows = activeWorkspace().list_windows()

    let i = windows.indexOf(window) + 1
    if (i < 1 || (i > windows.length - 1))
        i = 0

    const nextWindow = windows[i]
    replaceWith(window, nextWindow)
    activate(nextWindow)

    const leftWindow = getActiveWorkspaceTabList()[0]

    const { top, right } = getFrameBox(leftWindow)

    const pixbuf = getPixels(getActor(leftWindow), { x: right - 100, y: top + 1, width: 5, height: 1 })
    
    const image = new Clutter.Image()
    // Log.properties(image)

    // START: Sampled pixels location for debugging
    image.set_data(pixbuf.get_pixels(),
        pixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888
            : Cogl.PixelFormat.RGB_888,
        pixbuf.get_width(),
        pixbuf.get_height(),
        pixbuf.get_rowstride());

    const actor = new Clutter.Actor({ x: right - 100, y: top + 1, height: 1, width: 5, backgroundColor: new Clutter.Color({ red: 255, alpha: 255 }) })
    // actor.set_content(image)
    global.stage.add_child(actor)
    // END: Sampled pixels location for debugging


    const dominantColor = getDominantColor(pixbuf)

    log('dominantColor', dominantColor)

    margins.top.style = `background-color: rgba(${dominantColor},1);`
    margins.bottom.style = `background-color: rgba(${dominantColor},1);`
    margins.left.style = `background-color: rgba(${dominantColor},1);`
    margins.right.style = `background-color: rgba(${dominantColor},1);`
    spine && (spine.style = `background-color: rgba(${dominantColor},1);`)
    return false
}



function cycleLeftWindows() {
    const [leftWindow, rightWindow] = getTiles()
    const windows = activeWorkspace().list_windows().filter(exclude(rightWindow))
    if (windows.length < 2) return
    let i = windows.indexOf(leftWindow) + 1
    if (i < 1 || (i > windows.length - 1))
        i = 0
    log(i, windows[i].title)
    const nextWindow = windows[i]
    replaceWith(leftWindow, nextWindow)
    activate(nextWindow)
    log(nextWindow.title, isTiledLeft(nextWindow), isTiledRight(nextWindow))
    log(rightWindow.title, isTiledLeft(rightWindow), isTiledRight(rightWindow))

    return false
}

function cycleRightWindows() {
    const [leftWindow, rightWindow] = getTiles()
    const windows = activeWorkspace().list_windows().filter(exclude(leftWindow))
    if (windows.length < 2) return
    let i = windows.indexOf(rightWindow) + 1
    if (i < 1 || (i > windows.length - 1))
        i = 0
    log(i, windows[i].title)
    const nextWindow = windows[i]
    replaceWith(rightWindow, nextWindow)
    activate(nextWindow)

    return false
}

// --------------------------------------------------------------------------------

function maximizeAndHideWindows({ exclude: excluded = [] } = {}) {
    getActiveWorkspaceTabList().filter(exclude(excluded)).map(maximize).map(hide)
}


const mx = margin
const my = mx / 1
let spine


function toggle2UpLeft() {

    const [leftWindow] = getTiles()

    const { top, right } = getFrameBox(leftWindow)
    const pixbuf = getPixels(getActor(leftWindow), { x: right - 100, y: top + 1, width: 5, height: 1 })
    const dominantColor = getDominantColor(pixbuf)

    margins.top.style = `background-color: rgba(${dominantColor},1);`
    margins.bottom.style = `background-color: rgba(${dominantColor},1);`
    margins.left.style = `background-color: rgba(${dominantColor},1);`
    margins.right.style = `background-color: rgba(${dominantColor},1);`
    spine.style = `background-color: rgba(${dominantColor},1);`

    return

}

let sc0
let sc

function toggle2UpRight() {
    let [left, right] = getTiles()
    const { x, y, width, height } = left.get_work_area_current_monitor()
    const tabList = getActiveWorkspaceTabList()

    if (isFullSize(left)) {

        spine = createChrome({
            x: (width + mx) / 2,
            y: my,
            width: mx,
            height,
            // style: 'background-color: red;'
        })



        spine.connect('button-press-event', () => {
            spinegrab = true
            handleGrabOpBegin(_, _, right)
        })
        spine.connect('leave-event', () => {
            if (!savedPointerPosition) return
            let display = Gdk.Display.get_default();
            let deviceManager = display.get_device_manager();
            let pointer = deviceManager.get_client_pointer();
            let [screen, pointerX, pointerY] = pointer.get_position();
            pointer.warp(screen, savedPointerPosition[0], savedPointerPosition[1]);
            savedPointerPosition = null
            log('LEFT SPNE')
        })

        // const bc = new Clutter.BindConstraint()
        // bc.set_source(getActor(tabList[1]))
        // bc.set_coordinate(Clutter.BindCoordinate.X)
        // bc.set_offset(-40)

        // const bc2 = new Clutter.BindConstraint()
        // bc2.set_source(getActor(tabList[1]))
        // bc2.set_coordinate(Clutter.BindCoordinate.WIDTH)
        // bc2.set_offset(-40)

        const lbr = left.get_buffer_rect()
        const lfr = left.get_frame_rect()
        const loffset = lfr.x - lbr.x

        const rbr = right.get_buffer_rect()
        const rfr = right.get_frame_rect()
        const roffset = rfr.x - rbr.x


        sc0 = new Clutter.SnapConstraint()
        sc0.set_source(getActor(left))
        sc0.set_edges(Clutter.SnapEdge.LEFT, Clutter.SnapEdge.RIGHT)
        sc0.set_offset(-loffset)

        sc = new Clutter.SnapConstraint()
        sc.set_source(getActor(right))
        sc.set_edges(Clutter.SnapEdge.RIGHT, Clutter.SnapEdge.LEFT)
        sc.set_offset(roffset)

        spine.add_constraint(sc0)
        spine.add_constraint(sc)


        tabList.forEach(metaWindow => {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(true, width / 2 + 1.5 * mx, 0, width / 2 - mx / 2, height)
        })
        left.move_resize_frame(true, x, 0, width / 2 - mx / 2, height)
        ll('((((((((((((((((((((((((((((((', getTileMatch(left).title)
    }
    else {
        spine.remove_constraint(sc)
        spine.remove_constraint(sc0)
        Main.layoutManager.removeChrome(spine)
        tabList.forEach(metaWindow => metaWindow.move_resize_frame(false, 0, 0, width, height))

    }
}

function getTileSize(metaWindow) {
    let { x, y, width, height } = metaWindow.get_work_area_current_monitor()
    return [x, y, (width - spacerWidth) / 2, height]
}




// --------------------------------------------------------------------------------

let reordering = false

function addWindow(display, metaWindow) {
    const { width, height } = focusedWindow.get_work_area_current_monitor()
    const [left, right] = getTiles()
    if (metaWindow.get_window_type() > 0) return;
    if (right) {
        if (left.has_focus()) {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(false, 0, 0, width / 2, height)
        }
        if (right.has_focus()) {
            metaWindow.maximize(Meta.MaximizeFlags.VERTICAL)
            metaWindow.move_resize_frame(false, 0, 0, width / 2, height)
        }

    }
    maximize(metaWindow)
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



