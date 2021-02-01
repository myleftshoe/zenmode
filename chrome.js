const Main = imports.ui.main
const { GObject, Clutter, Meta, St } = imports.gi

const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Signals, withSignals, defineListener, defineActionListener } = Extension.imports.signals

const style_class = 'chrome'
const affectsStruts = true

let primaryMonitor = global.display.get_current_monitor()
let monitor = global.display.get_monitor_geometry(primaryMonitor)


const _Chrome = GObject.registerClass({},
    class _Chrome extends St.Widget {
        _init({ affectsStruts = true, ...props }) {
            super._init({
                style_class,
                reactive: true,
                ...props,
            })
            Main.layoutManager.addChrome(this, { affectsStruts })
        }
    }
)

function composeChrome() {
    const ComposedChrome = withSignals(_Chrome)
    defineListener(ComposedChrome, 'onButtonPress', 'button-press-event')
    // defineActionListener(ComposedChrome, 'ClickAction', 'onButtonPress', 'clicked')
    return ComposedChrome
}

var Chrome = composeChrome()

function createChrome(props) {
    const edge = new Chrome({ ...props, affectsStruts: false })
    edge.connect('enter-event', () => {
        global.display.set_cursor(Meta.Cursor.POINTING_HAND)
    })
    return edge
}

var addTop = size => createChrome({
    height: size,
    width: monitor.width,
})

var addBottom = size => createChrome({
    height: size,
    width: monitor.width,
    y: monitor.height - size,
})

var addLeft = size => createChrome({
    height: monitor.height,
    width: size,
})

var addRight = size => createChrome({
    height: monitor.height,
    width: size,
    x: monitor.width - size,
})

const destroy = function () {
    for (const prop in this) {
        if (prop !== 'destroy')
            prop && this[prop].destroy()
    }
}

function addChrome(size) {
    if (typeof size !== 'object') return;
    const top = size.top && addTop(size.top)
    const bottom = size.bottom && addBottom(size.bottom)
    const left = size.left && addLeft(size.left)
    const right = size.right && addRight(size.right)
    return {
        top,
        bottom,
        left,
        right,
        destroy
    }
}

function addMargins(size = 50) {
    const aspect = 1
    const top = new Chrome({
        height: size / aspect,
        width: monitor.width,
        reactive: true,
    })
    const bottom = new Chrome({
        y: monitor.height - size / aspect,
        height: size / aspect,
        width: monitor.width,
        reactive: false,
    })
    const left = new Chrome({
        height: monitor.height,
        width: size,
        reactive: false,
    })
    const right = new Chrome({
        x: monitor.width - size,
        height: monitor.height,
        width: size,
        reactive: false,
    })
    return { top, right, bottom, left }
}

