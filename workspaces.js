const { Meta } = imports.gi
const Main = imports.ui.main


// private
const _switchToWorkspace = function _switchWorkspace(workspace) {
    const id = workspace.index() + 1
    Main.wm._showWorkspaceSwitcher(global.display, null, { get_name: () => `switch---${id}` })    
} 

const _activateWorkspace = function _activateWorkspace(workspace) {
    workspace.activate(global.get_current_time())
}

const _moveWindowToWorkspace = function _moveWindowToWorkspace(window, workspace) {
    const id = workspace.index() + 1
    Main.wm._showWorkspaceSwitcher(global.display, window, { get_name: () => `move---${id}` })    
} 

const _workspaces = {
    get activeWorkspace() { return activeWorkspace() },
    get previousWorkspace() { return previousWorkspace() },
    get nextWorkspace() { return nextWorkspace() },
}


// exported

// accepts workspace object, function that returns a workspace object, or
// a workspace index and return a workspace object
function getWorkspace(workspace) {
    switch (typeof workspace) {
        case 'function': return workspace()
        case 'number': return getWorkspaceByIndex(workspace)
        default: return workspace
    }
}

// switches to workspace and shows workspace switcher popup
function switchToWorkspace(workspace) {
    _switchToWorkspace(getWorkspace(workspace))
}

// switches to workspace without workspace switcher popup
function activateWorkspace(workspace) {
    _activateWorkspace(getWorkspace(workspace))
}

function moveWindowToWorkspace(window, workspace) {
    _moveWindowToWorkspace(window, getWorkspace(workspace))
}

function getWorkspaceTabList(workspace) {
    return global.display.get_tab_list(Meta.TabList.NORMAL, getWorkspace(workspace))
}

function getActiveWorkspaceTabList() {
    return getWorkspaceTabList(workspaces.activeWorkspace)
}

var workspaces = new Proxy({}, {
    get(target, property, receiver) {
        if (Number.isInteger(Number(property))) {
            return getWorkspace(parseInt(property))
        }
        return _workspaces[property]
    }
}) 

function activeWorkspace() { 
    return global.workspace_manager.get_active_workspace() 
}

function nextWorkspace() { 
    return activeWorkspace().get_neighbor(Meta.MotionDirection.DOWN) 
}

function previousWorkspace() { 
    return activeWorkspace().get_neighbor(Meta.MotionDirection.UP) 
}

function switchToNextWorkspace() {
    switchWorkspace(getNextWorkspace())
}

function switchToPreviousWorkspace() {
    switchWorkspace(getPreviousWorkspace())
}

function getWorkspaceByIndex(index) {
    return global.workspace_manager.get_workspace_by_index(index)
}

