const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { addChrome } = Extension.imports.chrome
const { Signals } = Extension.imports.signals
const Log = Extension.imports.logger
const { ll } = Log
const { getEventModifiers } = Extension.imports.events
const { defineGetter, values } = Extension.imports.object
const { loop } = Extension.imports.array
const { createStage } = Extension.imports.stage
const { layouts, single, centered, split, layout1, complex, grid } = Extension.imports.layouts

const { moveResizeFrame } = Extension.imports.metaWindow
const { 
    activateWorkspace, 
    moveWindowToWorkspace, 
    workspaces, 
    getActiveWorkspaceTabList 
} = Extension.imports.workspaces

const signals = new Signals()

const module = this
defineGetter(module, 'focusedWindow', () => global.display.get_focus_window())

let chrome
let showChromeSid
let hideChromeSid

const nextLayout = loop([centered, single, split, layout1, grid, complex])

function loopLayouts() {
    ll('loopLayouts')
    stage.setLayout(nextLayout())
}

function positionWindows () {
    log('layout-changed')
    const tabList = getActiveWorkspaceTabList()
    const panes = stage.getPanes()
    let i = 0
    for (; i < panes.length; i++) {
        panes[i].addVirtualChild(tabList[i], moveResizeFrame)
    }
    const rect = panes[0].getRect()
    for (; i < tabList.length; i++) {
        moveResizeFrame(tabList[i], rect )
    }

}


let stage
let newWindow

function start() {
    stage = createStage()
    stage.frame.top.onButtonPress = loopLayouts
    stage.connect('layout-changed', positionWindows)

    chrome = addChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onButtonPress = handleChromeLeftClick
    chrome.right.onButtonPress = handleChromeRightClick
    chrome.top.onButtonPress = handleChromeTopClick
    chrome.bottom.onButtonPress = handleChromeBottomClick

    hideChromeSid = Main.overview.connect('showing', hideChrome);
    showChromeSid = Main.overview.connect('hidden', showChrome);

    signals.connect(global.display, 'window-left-monitor', (display, monitorNumber, metaWindow) => {
        stage.removeMetaWindow(metaWindow)
    })
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

    const panes = stage.getPanes() 
    let pane = panes.find(pane => pane.virtualChildren.has(prevFocusedWindow))
    log('%%%%%%1', pane)
    if (!pane) {
        pane = panes.find((pane => !pane.size)) || panes[0]
    }
    log('%%%%%%2', pane)

    pane.addVirtualChild(focusedWindow, moveResizeFrame)


    pane.flash()
    prevFocusedWindow = focusedWindow
    // if (panes.length > 1) return


    pane.add_style_class_name('pane-focused')

    stage.blendWithMetaWindow(focusedWindow)
}

