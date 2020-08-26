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
    return new Clutter.Clone({ source: getActor(metaWindow) })
}

function cloneActor(actor) {
    return new Clutter.Clone({ source: actor })
}


// --------------------------------------------------------------------------------

const defaultProps = {
    duration: 250,
    mode: Clutter.AnimationMode.EASE_OUT_QUINT,
}


function move(actor, from, to, easing) {
    actor.translation_x = from.x - to.x
    actor.translation_y = from.y - to.y
    return ease(actor, {
        translation_x: 0,
        translation_y: 0,
        ...easing
    })
}

function moveTo(metaWindow, { x, y }) {
    const from = new Point(metaWindow.get_frame_rect())
    const to = new Point({x, y}).merge(from)
    metaWindow.move_frame(true, to.x, to.y)
    return {
        ease(easing) {
            const actor = getActor(metaWindow)
            return move(actor, from, to, easing)
        }
    }
}

function moveBy(metaWindow, { x, y }) {
    const from = new Point(metaWindow.get_frame_rect())
    const to = from.add({x, y}).merge(from)
    metaWindow.move_frame(true, to.x, to.y)
    return { 
        ease(easing) {
            const actor = getActor(metaWindow)
            return move(actor, from, to, easing)
        }
    }
}

function ease(actor, props = defaultProps) {
    return new Promise(resolve => actor.ease({
        ...props, 
        onComplete() { resolve(actor) }
    }))
}

// --------------------------------------------------------------------------------

function getRect(actor) {
    const [x, y] = actor.get_position()
    const [width, height] = actor.get_size()
    return [x, y, width, height]
}

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



