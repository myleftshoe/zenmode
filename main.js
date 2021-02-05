const { Clutter, Cogl, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome, addMargins, createChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const Log = Extension.imports.logger
const { ll, logArguments } = Extension.imports.logger
const { getEventModifiers } = Extension.imports.events
const { onIdle } = Extension.imports.async
const { exclude } = Extension.imports.functional
const { values } = Extension.imports.object
const { loop } = Extension.imports.array
const { createStage, get_all_descendants } = Extension.imports.stage
const { layouts, single, centered, split, complex } = Extension.imports.layouts
const { getDominantColor } = Extension.imports.pixbuf

const { 
    activateWorkspace, 
    moveWindowToWorkspace, 
    workspaces, 
    getActiveWorkspaceTabList 
} = Extension.imports.workspaces
const {
    show,
    hide,
    activate,
    maximize,
    getActor,
    getFrameRect,
    getFrameBox,
    getBufferRect,
    getBufferBox,
    getPixels,
} = Extension.imports.metaWindow

const signals = new Signals()


Object.defineProperty(this, 'focusedWindow', {
    get() { return global.display.get_focus_window() }
})



let margin = 40
const spacerWidth = 40

let chrome
let hideChromeSid

const nextLayout = loop([single, split, centered])

function setLayout() {
    ll('setLayout')
    const layout = nextLayout()
    // let layout = stage.layout
    // if (layout === single) {
    //     layout = centered
    // }
    // else if (layout === centered) {
    //     const nwindows = getActiveWorkspaceTabList().length
    //     layout = values(layouts).find(layout => layout.panes === nwindows)
    // }
    // else {
    //     layout = single
    // }
    stage.setLayout(layout)
}

function positionWindows () {
    const tabList = getActiveWorkspaceTabList()
    const panes = stage.getPanes()
    panes.forEach((pane, i) => {
        log(i, pane)
        const metaWindow = tabList[i]
        pane.metaWindows = [metaWindow]
        metaWindow.move_resize_frame(false, ...pane.getRect())
    })
}


let margins
let stage


function start() {
    stage = createStage()
    margins = addMargins(margin)
    margins.top.onButtonPress = setLayout
    stage.connect('layout-changed', positionWindows)

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

    // signals.connect(global.display, 'grab-op-begin', handleGrabOpBegin)
    // signals.connect(global.display, 'grab-op-end', handleGrabOpEnd)
    signals.connect(workspaces.activeWorkspace, 'window-removed', () => { ll('window-removed') })

    signals.connect(global.display, 'in-fullscreen-changed', () => { ll('in-fullscreen-changed') })

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
    cycleWindows()
}

function handleChromeRightClick(actor, event) {
    const { ALT, SHIFT, RIGHT_BUTTON } = getEventModifiers(event)
    cycleWindows()
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
    ll('handleGrabOpBegin'. op)
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


function updateStage() {
    const fr = getFrameRect(focusedWindow)
    const br = getBufferRect(focusedWindow)
    
    const topRight = {x: br.width - (fr.x - br.x), y: fr.y - br.y}

    const sampleSize = {width: 5, height: 1}

    const pixbuf = getPixels(getActor(focusedWindow), { x: topRight.x - 50, y: topRight.y, ...sampleSize })
    
    // // DEBUG: Display sampled pixels
    // const image = new Clutter.Image()
    // image.set_data(pixbuf.get_pixels(),
    //     pixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888
    //         : Cogl.PixelFormat.RGB_888,
    //     pixbuf.get_width(),
    //     pixbuf.get_height(),
    //     pixbuf.get_rowstride());

    // const actor = new St.Bin({ 
    //     x: br.x + topRight.x - pixbuf.get_width(),
    //     y: fr.y, 
    //     height: pixbuf.get_height(), 
    //     width: pixbuf.get_width(), 
    //     backgroundColor: new Clutter.Color({ red: 255, alpha: 255 }),
    //     style: 'border: 1px solid yellow;'
    // })
    // actor.set_content(image)
    // global.stage.add_child(actor)
    // // DEBUG END: Display sampled pixels

    const dominantColor = getDominantColor(pixbuf)

    log('dominantColor', dominantColor, focusedWindow.title)

    // stage.style = `border-color: rgba(${dominantColor},1);`

    stage.setColor(dominantColor)
    // stage.style = `border-color: red;`


}


let prevFocusedWindow
function handleFocusWindow(display) {
    ll('handleFocusWindow')
    const pane = stage.getPanes().find(({metaWindows}) => metaWindows[0] === prevFocusedWindow) || stage.getPanes()[0]
    const paneRect = pane.getRect()

    focusedWindow.move_resize_frame(false, ...paneRect)
    pane.metaWindows = [focusedWindow]
    prevFocusedWindow = focusedWindow

    if (stage.layout.panes === 1) 
        updateStage()
}

function maximizeAndHideWindows({ exclude: excluded = [] } = {}) {
    getActiveWorkspaceTabList().filter(exclude(excluded)).map(maximize).map(hide)
}

function addWindow(display, metaWindow) {
    maximize(metaWindow)
}

let reordering = false
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



