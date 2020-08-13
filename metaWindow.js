const { Clutter } = imports.gi

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

function createClone(metaWindow) {
    return new Clutter.Clone({ source: getActor(metaWindow)})
}

function cloneActor(actor) {
    return new Clutter.Clone({ source: actor})
}



// Transitions

const fade = {
    opacity: 0
}

async function ease(actor, props) {
    return new Promise(resolve => actor.ease({
        duration: 250,
        mode: Clutter.AnimationMode.EASE_OUT_QUINT,
        ...props,
        onComplete() { resolve(actor) }, 
    }))
}

async function fadeOut(metaWindow) {
    return easeOut(metaWindow, fade)
}

async function slideOut(metaWindow) {
    const actor = getActor(metaWindow)
    const [ width ] = actor.get_size()
    return easeOut(metaWindow, { x: -width })
}

async function slideIn(metaWindow) {
    log('slideIn', metaWindow && metaWindow.title)
    const actor = getActor(metaWindow)
    const [ width ] = actor.get_size()
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
    await ease(clone, transition)
    global.stage.remove_child(clone)
    return metaWindow
}

function replaceWithClone(metaWindow) {
    const clone = createClone(metaWindow)
    alignActorWithMetaWindow(clone, metaWindow)
    global.stage.add_child(clone)
    hide(metaWindow)
    return clone
}


function replaceCloneWithMetaWindow(clone, metaWindow) {
    alignWithActor(metaWindow, clone)
    show(metaWindow)
    global.stage.remove_child(clone)
    return metaWindow
}


function actorRectToFrameRect(actor) {
    const [ x, y, width, height ] = getRect(actor)
    return [ x, y, width, height ]
}

function frameRectToActorRect(metaWindow) {
    let { x, y, width, height } = metaWindow.get_frame_rect()
    y = y - 8
    height = height + 8
    if (metaWindow.is_client_decorated()) {
        x = x - 30
        y = y - 22
        width = width + 60
        height = height + 52
    }    
    return [ x, y, width, height ]
}


function alignWithActor(metaWindow, actor) {
    metaWindow.move_resize_frame(true, ...actorRectToFrameRect(actor))
}

function alignActorWithMetaWindow(actor, metaWindow) {
    const [x, y, width, height] = frameRectToActorRect(metaWindow)
    actor.set_position(x, y)
    actor.set_size(width, height)
}

function getRect(actor) {
    const [ x, y ] = actor.get_position()
    const [ width, height ] = actor.get_size()
    return [x, y, width, height]
}


function sizeToOther(metaWindow, other) {

    let { x, y, width, height } = other.get_frame_rect()

    if (!other.is_client_decorated() && metaWindow.is_client_decorated()) {
        x += 20
        y += 20
        width -= 40
        height -= 40
    }
    else if (other.is_client_decorated() && !metaWindow.is_client_decorated()) {
        x -= 20
        y -= 20
        width += 40
        height += 40
    }

    metaWindow.move_resize_frame(true, x, y, width, height)
    return metaWindow
}