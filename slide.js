const { Clutter, Meta } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { show, hide, maximize, getActor, cloneActor } = Extension.imports.metaWindow

const stageWidth = global.stage.get_width()
const stageHeight = global.stage.get_height()

async function slideOutLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, { to: { x: 0 - width } })
}

async function slideOutRight(metaWindow) {
    if (!metaWindow) return
    return translateMetaWindow(metaWindow, { to: { x: stageWidth } })
}

async function slideInFromRight(metaWindow) {
    if (!metaWindow) return
    return translateMetaWindow(metaWindow, { from: { x: stageWidth } })
}

async function slideInFromLeft(metaWindow) {
    if (!metaWindow) return
    const { width } = metaWindow.get_buffer_rect()
    return translateMetaWindow(metaWindow, { from: { x: 0 - width } })
}


function rectIsInViewport(x, y, width, height) {
    return (x < stageWidth && y < stageHeight && x + width > 0 && y + height > 0)
}

async function translateMetaWindow(metaWindow, { from, to, duration }) {
    if (!metaWindow) return;
    const { x, y, width, height } = metaWindow.get_buffer_rect()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    // if (x0 === x1 && y0 === y1) return
    const actor = getActor(metaWindow)
    actor.show()
    const clone = cloneActor(actor)
    clone.set_position(x0, y0)
    Main.uiGroup.add_child(clone)
    actor.hide()
    await translateActor(clone, { from: [x0, y0], to: [x1, y1], duration })
    if (rectIsInViewport(x1, y1, width, height)) {
        actor.set_position(x1, y1)
        actor.show()
    }
    clone.destroy()
}

async function translateActor(actor, { from, to, duration = 250 }) {
    const { x, y } = actor.get_position()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    if (x0 === x1 && y0 === y1) return Promise.resolve()
    actor.set_position(x0, y0)
    actor.save_easing_state()
    actor.set_easing_duration(duration)
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_QUINT)
    actor.set_position(x1, y1)
    return new Promise(resolve => {
        const sid = actor.connect('transition-stopped', (actor) => {
            actor.disconnect(sid)
            actor.restore_easing_state()
            resolve('complete')
        })
    })
}

// accepts point in form {x}, {y}, {x, y}, [x], [,y] or [x,y]
// replaces missing values with x and y from second parameter [x, y]
// returns point in form [x,y] 
function coalesceXY(xy, [x, y]) {
    let nx = x
    let ny = y
    if (Array.isArray(xy)) {
        nx = xy[0]
        ny = xy[1]
    }
    else if (typeof xy === 'object') {
        nx = xy.x
        ny = xy.y
    }
    const ix = parseInt(nx)
    const iy = parseInt(ny)
    const rx = isNaN(ix) ? x : ix
    const ry = isNaN(iy) ? y : iy

    return [rx, ry]
}
