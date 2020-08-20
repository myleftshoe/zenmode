const { Clutter, Meta } = imports.gi

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

function maximize(metaWindow) {
    log('maximize', metaWindow.title)
    metaWindow.unmaximize(Meta.MaximizeFlags.BOTH)
    let { x, y, width, height } = metaWindow.get_work_area_current_monitor()
    if (metaWindow.is_client_decorated()) {
        x += 20
        // y += 20
        width -= 40
        // height -= 40
    }
    metaWindow.move_resize_frame(true, x, y, width, height)
    return metaWindow
}

function getActor(metaWindow) {
    return metaWindow.get_compositor_private()
}

function createClone(metaWindow) {
    return new Clutter.Clone({ source: getActor(metaWindow) })
}

function cloneActor(actor) {
    return new Clutter.Clone({ source: actor })
}



// Transitions

const fade = {
    opacity: 0,
    // duration: 0
}

function ease(actor, props) {
    return new Promise(resolve => actor.ease({
        duration: 250,
        // delay:2000,
        mode: Clutter.AnimationMode.EASE_OUT_QUINT,
        ...props,
        onComplete() { resolve(actor) },
    }))
}

function fadeOut(metaWindow) {
    return easeOut(metaWindow, fade)
}

function slideOut(metaWindow) {
    const actor = getActor(metaWindow)
    const [width] = actor.get_size()
    return easeOut(metaWindow, { x: -width })
}

function slideIn(metaWindow) {
    log('slideIn', metaWindow && metaWindow.title)
    const actor = getActor(metaWindow)
    const [width] = actor.get_size()
    actor.set_x(-width)
    return easeIn(metaWindow, { x: 0 })
}

async function easeIn(metaWindow, transition = fade) {
    const clone = replaceWithClone(metaWindow)
    await ease(clone, transition)
    replaceCloneWithMetaWindow(clone, metaWindow)
    return metaWindow
}


async function easeOut(metaWindow, transition = fade) {
    const clone = replaceWithClone(metaWindow)
    if (metaWindow.is_client_decorated())
        clone.y -=22 // TODO: Work out why this is necessary
    await ease(clone, transition)
    global.stage.remove_child(clone)
    return metaWindow
}

function replaceWithClone(metaWindow) {
    const clone = createClone(metaWindow)
    alignActorWithMetaWindow(clone, metaWindow)
    hide(metaWindow)
    global.stage.add_child(clone)
    return clone
}


function replaceCloneWithMetaWindow(clone, metaWindow) {
    // alignWithActor(metaWindow, clone)
    show(metaWindow)
    global.stage.remove_child(clone)
    return metaWindow
}


function _actorRectToFrameRect(actor) {
    const [x, y, width, height] = getRect(actor)
    return [x, y + 8, width, height - 8]
}

function actorRectToFrameRect(actor, metaWindow) {
    let [x, y, width, height] = getRect(actor)
    y += 8
    height -= 18
    if (metaWindow.is_client_decorated()) {
        x += 20
        y += 2
        width -= 40
        // height += 40
    }
    return [x, y, width, height]
}

function frameRectToActorRect(metaWindow) {
    let { x, y, width, height } = metaWindow.get_frame_rect()
    y -= 8
    height += 18
    if (metaWindow.is_client_decorated()) {
        x -= 30
        y += 20
        width += 60
        // height += 40
    }
    return [x, y, width, height]
}


function alignWithActor(metaWindow, actor) {
    metaWindow.move_resize_frame(false, ...actorRectToFrameRect(actor, metaWindow))
}

function alignActorWithMetaWindow(actor, metaWindow) {
    const [x, y, width, height] = frameRectToActorRect(metaWindow)
    actor.set_position(x, y)
    actor.set_size(width, height)
}

function getRect(actor) {
    const [x, y] = actor.get_position()
    const [width, height] = actor.get_size()
    return [x, y, width, height]
}

function replaceWith(metaWindow, other) {
    colocate(other, metaWindow)
    hide(metaWindow)
    // fadeOut(metaWindow)
    return metaWindow
}

function colocate(metaWindow, other) {
    let { x, y, width, height } = other.get_frame_rect()
    if (!other.is_client_decorated() && metaWindow.is_client_decorated()) {
        x += 20
        // y += 20
        width -= 40
        // height -= 40
    }
    else if (other.is_client_decorated() && !metaWindow.is_client_decorated()) {
        x -= 20
        // y -= 20
        width += 40
        // height += 40
    }
    metaWindow.move_resize_frame(false, x, y, width, height)
    return metaWindow
}



