const { Clutter, Meta } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Point } = Extension.imports.point
const { logArguments } = Extension.imports.logger
const { and } = Extension.imports.functional

function show(metaWindow) {
    if (!metaWindow) return
    log('show', metaWindow.title)
    getActor(metaWindow).set_scale(1, 1)
    return metaWindow
}

function hide(metaWindow) {
    if (!metaWindow) return
    log('hide', metaWindow.title)
    getActor(metaWindow).set_scale(1, 1);
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
        await ease(actor, { translation_x, translation_y })
        actor.translation_x = 0
        actor.translation_y = 0
    }
    metaWindow.move_frame(true, to.x, to.y)
}

async function moveTo(metaWindow, { x, y }, easing) {
    const from = new Point(metaWindow.get_frame_rect())
    const to = new Point({ x, y }).merge(from)
    move(metaWindow, from, to, easing)
}

async function moveBy(metaWindow, { x, y }, easing) {
    const from = new Point(metaWindow.get_frame_rect())
    const to = new Point({ x: from.x + x, y: from.y + y }).merge(from)
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

// --------------------------------------------------------------------------------

var rectToBox = ({ x, y, width, height }) => ({ left: x, top: y, right: x + width, bottom: y + height })

var getFrameBox = (metaWindow) => rectToBox(metaWindow.get_frame_rect())

var getWorkAreaBox = (metaWindow) => rectToBox(metaWindow.get_work_area_current_monitor())

var isLeftAligned = (metaWindow) => getFrameBox(metaWindow).left === getWorkAreaBox(metaWindow).left

var isRightAligned = (metaWindow) => getFrameBox(metaWindow).right === getWorkAreaBox(metaWindow).right

function isFullHeight(metaWindow) {
    const workAreaBox = getWorkAreaBox(metaWindow)
    const frameBox = getFrameBox(metaWindow)
    return (
        frameBox.top === workAreaBox.top && 
        frameBox.bottom === workAreaBox.bottom
    )
}

function isFullSize(metaWindow) {
    const workAreaBox = getWorkAreaBox(metaWindow)
    const frameBox = getFrameBox(metaWindow)
    logArguments(workAreaBox, frameBox)
    return (
        frameBox.top === workAreaBox.top && 
        frameBox.bottom === workAreaBox.bottom && 
        frameBox.right === workAreaBox.right && 
        frameBox.left === workAreaBox.left
    )
}


function overlap(a, b) {
    const boxA = getFrameBox(a)
    const boxB = getFrameBox(a)
    return !(boxA.top < boxB.bottom || boxB.top < boxA.bottom || boxA.right < boxB.left || boxB.right < boxA.left)
}

var isTiledRight = and(isRightAligned, isFullHeight)
var isTiledLeft = and(isLeftAligned, isFullHeight)


