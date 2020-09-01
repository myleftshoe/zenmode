const { Clutter, Meta } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Point } = Extension.imports.point

function show(metaWindow) {
    if (!metaWindow) return
    log('show', metaWindow.title)
    getActor(metaWindow).show();
    return metaWindow
}

function hide(metaWindow) {
    if (!metaWindow) return
    log('hide', metaWindow.title)
    getActor(metaWindow).hide();
    return metaWindow
}

function activate(metaWindow) {
    if (!metaWindow) return
    log('activate', metaWindow.title)
    metaWindow.activate(global.get_current_time())
    return metaWindow
}

function maximize(metaWindow) {
    if (!metaWindow) return
    log('maximize', metaWindow.title)
    metaWindow.unmaximize(Meta.MaximizeFlags.BOTH)
    let { x, y, width, height } = metaWindow.get_work_area_current_monitor()
    metaWindow.move_resize_frame(true, x, y, width, height)
    return metaWindow
}

function getActor(metaWindow) {
    if (!metaWindow) return
    return metaWindow.get_compositor_private()
}

function createClone(metaWindow) {
    if (!metaWindow) return
    return cloneActor(getActor(metaWindow))
}

function cloneActor(actor) {
    return new Clutter.Clone({ source: actor })
}

function slideFrom(metaWindow, x) {
    const actor = getActor(metaWindow)
    actor.translation_x = x
    actor.show()
    actor.ease({ translation_x: 0, ...defaultEasing }) 
}

function move(metaWindow, x, y) {
    metaWindow.move_frame(true, x, y)
    return {
        ease(x) {
            slideFrom(metaWindow, x)
        }
    }
}

function moveResize(metaWindow, x, y, width, height) {
    metaWindow.move_resize_frame(true, x, y, width, height)
    return {
        ease(x) {
            slideFrom(metaWindow, x)
        }
    }
}



// --------------------------------------------------------------------------------

var defaultEasing = {
    duration: 250,
    mode: Clutter.AnimationMode.EASE_OUT_QUINT,
}

// --------------------------------------------------------------------------------

function replaceWith(metaWindow, other) {
    colocate(other, metaWindow)
    hide(metaWindow)
    return metaWindow
}

function colocate(metaWindow, other) {
    let { x, y, width, height } = other.get_frame_rect()
    metaWindow.move_resize_frame(false, x, y, width, height)
    return metaWindow
}



