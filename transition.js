
const { Clutter } = imports.gi

const defaultOptions = {
    duration: 3500,
    delay: 0,
}


function setTransition(actor, transition, options = defaultOptions) {
    setAddTransition(actor, transition, options)
    return actor
}

function setAddTransition(actor, transition, options = defaultOptions) {
    actor.connect('parent-set', async (actor, oldParent) => {
        if (!oldParent) {
            transition.in(actor)
            if (options.onComplete) {
                await transitionComplete(actor)
                options.onComplete(actor)
            }
            return
        }
    })
    return actor
}


function animatable(actor) {
    actor.hide()
    Object.defineProperty(actor, 'inTransition', {
        set(transition) {
            actor.easeIn = () => transition.in(actor)
        }
    })
    actor.connect('parent-set', (actor, oldParent) => {
        if (!oldParent) {
            actor.easeIn(actor)
            return
        }
        // if (!actor.get_parent()) {
        //     actor.easeOut()
        //     return
        // }

    })
    return actor
}


async function transitionComplete(actor) {
    return new Promise(resolve => {
        const signal = actor.connect('transition-stopped', () => {
            actor.restore_easing_state()
            actor.disconnect(signal)
            resolve('complete')
        })
    })
}


var slide = {
    in(actor) {
        const [width, height] = actor.get_parent().get_size()
        const [x, y] = actor.get_position()
        const from = { x: width, y }
        actor.set_position(from.x, from.y)
        actor.show()

        // container.add_child(actor)
        // log(actor, from.x, from.y ,to.x, to.y)
        translateActor(actor, { from, to: { x, y } })
    }
}



function slideIn(actor) {
    const container = actor.get_parent()
    const width = container.get_width()
    const height = container.get_height()
    const [x, y] = actor.get_position()
    const from = { x: width, y }
    actor.set_position(from.x, from.y)
    actor.show()

    // container.add_child(actor)
    // log(actor, from.x, from.y ,to.x, to.y)
    translateActor(actor, { from, to: { x, y } })
}

async function slideOut(actor) {
    const width = actor.get_parent().get_width()
    const height = actor.get_parent().get_height()
    const [x, y] = actor.get_position()
    const to = { x: width, y }
    // log(from.x, from.y, x, y)
    // actor.set_position(from.x, from.y)
    // log(actor, from.x, from.y ,to.x, to.y)
    await translateActor(actor, { from: { x, y }, to })
    actor.get_parent().remove_child(actor)
}



function translateActor(actor, { from, to, duration = 2500 }) {
    const { x, y } = actor.get_position()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    if (x0 === x1 && y0 === y1) return Promise.resolve()
    actor.set_position(x0, y0)
    actor.save_easing_state()
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_BACK)
    duration && actor.set_easing_duration(duration)
    actor.set_position(x1, y1)
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

