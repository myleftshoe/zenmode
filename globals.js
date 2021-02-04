const globals = {
    get focusedWindow() { return global.display.get_focus_window() },
}

var { focusedWindow } = globals
