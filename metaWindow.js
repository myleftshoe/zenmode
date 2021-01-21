const { Clutter, Meta } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Point } = Extension.imports.point

function show(metaWindow) {
    if (!metaWindow) return
    log('show', metaWindow.title)
    getActor(metaWindow).set_scale(1,1)
    return metaWindow
}

function hide(metaWindow) {
    if (!metaWindow) return
    log('hide', metaWindow.title)
    getActor(metaWindow).set_scale(1,1);
    return metaWindow
}

function activate(metaWindow) {
    if (!metaWindow) return
    log('activate', metaWindow.title)
    metaWindow.activate(global.get_current_time())
    return metaWindow
}

const mx = 100
const my = mx / 1.6

function maximize(metaWindow) {
    if (!metaWindow) return
    log('maximize', metaWindow.title)
    // metaWindow.maximize(Meta.MaximizeFlags.BOTH)

    metaWindow.unmaximize(Meta.MaximizeFlags.BOTH)
    let { x, y, width, height } = metaWindow.get_work_area_current_monitor()
    metaWindow.move_resize_frame(false, 0, 0, width, height)
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

var defaultEasing = {
    duration: 250,
    mode: Clutter.AnimationMode.EASE_OUT_QUINT,
}

async function move(metaWindow, from, to, easing) {
    if (easing) {
        const actor = getActor(metaWindow)
        const translation_x = to.x - from.x
        const translation_y = to.y - from.y
        await ease(actor, {translation_x, translation_y})
        actor.translation_x = 0
        actor.translation_y = 0
    }
    metaWindow.move_frame(true, to.x, to.y)
}

async function moveTo(metaWindow, { x, y }, easing) {
    const from = new Point(metaWindow.get_frame_rect())
    const to = new Point({x, y}).merge(from)
    move(metaWindow, from, to, easing)
}

async function moveBy(metaWindow, { x, y }, easing) {
    const from = new Point(metaWindow.get_frame_rect())
    const to = new Point({x: from.x + x, y: from.y + y}).merge(from)
    move(metaWindow, from, to, easing)
}

function ease(actor, props = defaultEasing) {
    return new Promise(resolve => actor.ease({
        ...defaultEasing,
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



