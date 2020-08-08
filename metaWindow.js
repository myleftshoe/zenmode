function show(metaWindow) {
    log('show', metaWindow.title)
    getActor(metaWindow).show();
    return metaWindow
}

function hide(metaWindow) {
    log('hide', metaWindow.title)
    getActor(metaWindow).hide();
    return metaWindow
}

function activate(metaWindow) {
    log('activate', metaWindow.title)
    metaWindow.activate(global.get_current_time())
    return metaWindow
}

function getActor(metaWindow) {
    return metaWindow.get_compositor_private()
}
