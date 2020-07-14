
const { Clutter } = imports.gi


function slideIn({container = global.stage, actor}) {
    const width = container.get_width()
    const height = container.get_height()
    const [x,y] = actor.get_position()
    log('qqqqq', x, y)
    const from = { x: width, y }
    log(from.x, from.y, x, y)
    actor.set_position(from.x, from.y)
    container.add_child(actor)
    // log(actor, from.x, from.y ,to.x, to.y)
    translateActor(actor, { from, to: { x, y } } )
}

async function slideOut(actor) {
    log('slideOut')
    const width = actor.get_parent().get_width()
    const height = actor.get_parent().get_height()
    const [x,y] = actor.get_position()
    log('qqqqq', x, y, width)
    const to = { x: width, y }
    // log(from.x, from.y, x, y)
    // actor.set_position(from.x, from.y)
    // log(actor, from.x, from.y ,to.x, to.y)
    await translateActor(actor, { from: {x,y}, to } )
    log('y2yyyyyy')

    actor.get_parent().remove_child(actor)
}



async function translateActor(actor, {from, to, duration = 250}) {
    const { x, y } = actor.get_position()
    const [x0, y0] = coalesceXY(from, [x, y])
    const [x1, y1] = coalesceXY(to, [x, y])
    if (x0 === x1 && y0 === y1) return Promise.resolve()
    actor.set_position(x0, y0)
    actor.save_easing_state()
    actor.set_easing_mode(Clutter.AnimationMode.EASE_OUT_BACK)
    duration && actor.set_easing_duration(duration)
    log('yyyyyyy', x0, y0,x1, y1)
    actor.set_position(x1, y1)
    return new Promise(resolve => {
        const signal = actor.connect('transition-stopped', () => {
            log('ppppppp')
            actor.restore_easing_state()
            actor.disconnect(signal)
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

    return [rx,ry]
}

