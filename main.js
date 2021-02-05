const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const Log = Extension.imports.logger
const { ll, logArguments } = Log
const { getEventModifiers } = Extension.imports.events
const { values } = Extension.imports.object
const { loop } = Extension.imports.array
const { createStage } = Extension.imports.stage
const { layouts, single, centered, split, complex } = Extension.imports.layouts

const { 
    activateWorkspace, 
    moveWindowToWorkspace, 
    workspaces, 
    getActiveWorkspaceTabList 
} = Extension.imports.workspaces

const signals = new Signals()


Object.defineProperty(this, 'focusedWindow', {
    get() { return global.display.get_focus_window() }
})


let chrome
let showChromeSid
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


let stage


function start() {
    stage = createStage()
    stage.frame.top.onButtonPress = setLayout
    stage.connect('layout-changed', positionWindows)

    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('showing', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);

    signals.connect(global.display, 'notify::focus-window', handleFocusWindow)
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
    stage.hide()
    chrome.left.hide()
    chrome.right.hide()
}

function showChrome() {
    ll('overview shown')
    stage.show()
    chrome.left.show()
    chrome.right.show()
}

let prevFocusedWindow
function handleFocusWindow(display) {
    ll('handleFocusWindow')
    const pane = stage.getPanes().find(({metaWindows}) => metaWindows[0] === prevFocusedWindow) || stage.getPanes()[0]
    const paneRect = pane.getRect()

    focusedWindow.move_resize_frame(false, ...paneRect)
    pane.metaWindows = [focusedWindow]
    prevFocusedWindow = focusedWindow

    stage.blendWithMetaWindow(focusedWindow)
}

