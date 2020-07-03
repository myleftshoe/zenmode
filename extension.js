const { Clutter, Meta } = imports.gi
const Main = imports.ui.main
const Signals = imports.signals
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { createChrome } = Extension.imports.chrome

const uuid = Extension.metadata.uuid

let activeWorkspace
let metaWindows = []
let focusedMetaWindow

let activeWorkspaceChangedSid
let activeWorkspaceWindowAddedSid
let activeWorkspaceWindowRemovedSid
let displayFocusWindowSid

function init() {
    log(`***************************************************************`)
    log(`${uuid} init()`)
    Signals.addSignalMethods(Extension)
}

function enable() {
    log(`${uuid} enable()`)

    activeWorkspace = global.workspace_manager.get_active_workspace()

    const chrome = createChrome({ top: 1, right: 1, bottom: 1, left: 1 })
    chrome.left.onClick = slideLeft
    chrome.right.onClick = slideRight
    chrome.top.onClick = prevWorkspace
    chrome.bottom.onClick = nextWorkspace
    
    handleWorkspaceChange()

    activeWorkspaceChangedSid = global.workspace_manager.connect('active-workspace-changed', handleWorkspaceChange)
    displayFocusWindowSid = global.display.connect('notify::focus-window', focusWindow)

    Extension.loaded = true
}

function disable() {
    log(`${uuid} disable()`)
    signals.forEach(signal => signal.disconnect())

    global.workspace_manager.disconnect(activeWorkspaceChangedSid)
    activeWorkspace.disconnect(activeWorkspaceWindowAddedSid)
    activeWorkspace.disconnect(activeWorkspaceWindowRemovedSid)
    global.display.disconnect(displayFocusWindowSid)

    Extension.loaded = false
}


function prevWorkspace() {
    activeWorkspace.get_neighbor(Meta.MotionDirection.UP).activate(global.get_current_time());
}

function nextWorkspace() {
    activeWorkspace.get_neighbor(Meta.MotionDirection.DOWN).activate(global.get_current_time());
}

function handleWorkspaceChange() {

    activeWorkspaceWindowAddedSid && activeWorkspace.disconnect(activeWorkspaceWindowAddedSid)
    activeWorkspaceWindowRemovedSid && activeWorkspace.disconnect(activeWorkspaceWindowRemovedSid)

    activeWorkspace = global.workspace_manager.get_active_workspace()
    metaWindows = global.display.get_tab_list(Meta.TabList.NORMAL, activeWorkspace)
    // focusedMetaWindow = metaWindows[0]    

    activeWorkspaceChangedSid = activeWorkspace.connect('window-added', addWindow)
    activeWorkspaceWindowRemovedSid = activeWorkspace.connect('window-removed', removeWindow)
}


function addWindow(workspace, addedMetaWindow) {
    if (addedMetaWindow.is_client_decorated()) return;
    if (addedMetaWindow.get_window_type() > 1) return;
    addedMetaWindow.maximize(Meta.MaximizeFlags.BOTH)
    addedMetaWindow.connect('size-changed', handleWindowSizeChange)
    metaWindows.push(addedMetaWindow)

}

function handleWindowSizeChange(metaWindow) {
    const mwi = metaWindows.indexOf(metaWindow)
    if (metaWindow.get_maximized() < 2) {
        removeWindow(activeWorkspace, metaWindow)
        Main.activateWindow(metaWindows[mwi] || metaWindows[0] || undefined)
        return
    }
    focusedMetaWindow = metaWindows[mwi] || metaWindows[mwi - 1] || metaWindows[0] || undefined
    if (mwi < 0) {
        metaWindows.push(metaWindow)
    }    
}

function removeWindow(workspace, removedMetaWindow) {
    const mwi = metaWindows.indexOf(removedMetaWindow)
    metaWindows.splice(mwi, 1)
    // metaWindows = metaWindows.filter(metaWindow => metaWindow !== removedMetaWindow)
    const nextMetaWindow = metaWindows[mwi]
    slideInFromRight(nextMetaWindow)
}

function focusWindow(display, paramSpec) {
    const tabList = global.display.get_tab_list(Meta.TabList.NORMAL, activeWorkspace)
    if (tabList[0].is_client_decorated()) return;
    if (!tabList[0]) return;
    metaWindows.forEach((metaWindow) => metaWindow.get_compositor_private().hide())
    focusedMetaWindow = tabList[0]
    focusedMetaWindow.get_compositor_private().show()
}

function slideLeft() {
    if (metaWindows.length < 2) return;
    const nextMetaWindow =
        metaWindows[metaWindows.indexOf(focusedMetaWindow) - 1] ||
        metaWindows[metaWindows.length - 1]
    slideOutRight(focusedMetaWindow)
    slideInFromLeft(nextMetaWindow)
}

function slideRight() {
    if (metaWindows.length < 2) return;
    const nextMetaWindow =
        metaWindows[metaWindows.indexOf(focusedMetaWindow) + 1] ||
        metaWindows[0]
    slideOutLeft(focusedMetaWindow)
    slideInFromRight(nextMetaWindow)
}

function slideOutLeft(metaWindow) {
    if (!metaWindow) return;
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    const { x, y, width } = metaWindow.get_buffer_rect()
    clone.set_position(x, y)
    Main.uiGroup.add_child(clone)
    metaWindowActor.hide()
    clone.save_easing_state()
    clone.set_easing_duration(350)
    clone.set_position(0 - width, y)
    const signal = clone.connect('transition-stopped', () => {
        clone.restore_easing_state()
        clone.disconnect(signal)
        clone.destroy()
    })
}

function slideOutRight(metaWindow) {
    if (!metaWindow) return;
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    const { x, y, width } = metaWindow.get_buffer_rect()
    clone.set_position(x, y)
    Main.uiGroup.add_child(clone)
    metaWindowActor.hide()
    clone.save_easing_state()
    clone.set_easing_duration(350)
    clone.set_position(1920, y)
    const signal = clone.connect('transition-stopped', () => {
        clone.restore_easing_state()
        clone.disconnect(signal)
        clone.destroy()
    })
}

function slideInFromRight(metaWindow) {
    if (!metaWindow) return;
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    const { x, y } = metaWindow.get_buffer_rect()
    clone.set_position(1920, y) //TODO
    Main.uiGroup.add_child(clone)
    clone.save_easing_state()
    clone.set_easing_duration(350)
    clone.set_position(x, y)
    const signal = clone.connect('transition-stopped', () => {
        clone.restore_easing_state()
        clone.disconnect(signal)
        clone.destroy()
        metaWindowActor.show()
        Main.activateWindow(metaWindow)
    })
}

function slideInFromLeft(metaWindow) {
    if (!metaWindow) return;
    const metaWindowActor = metaWindow.get_compositor_private()
    const clone = new Clutter.Clone({ source: metaWindowActor })
    const { x, y, width } = metaWindow.get_buffer_rect()
    clone.set_position(0 - width, y) //TODO
    Main.uiGroup.add_child(clone)
    clone.save_easing_state()
    clone.set_easing_duration(350)
    clone.set_position(x, y)
    const signal = clone.connect('transition-stopped', () => {
        clone.restore_easing_state()
        clone.disconnect(signal)
        clone.destroy()
        metaWindowActor.show()
        Main.activateWindow(metaWindow)
    })
}
