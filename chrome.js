const Main = imports.ui.main
const { GObject, Clutter, Meta, St } = imports.gi

const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { connect, disconnectObject, defineListener, /*defineActionListener*/ } = Extension.imports.signals

const style_class = 'chrome'
const affectsStruts = true

let primaryMonitor = global.display.get_current_monitor()
let monitor = global.display.get_monitor_geometry(primaryMonitor)


const Chrome = GObject.registerClass({},
    class _Chrome extends St.Widget {
        _init(props) {
            super._init({
                style_class,
                reactive: true,
                ...props,
            })
            Main.layoutManager.addChrome(this, { affectsStruts })
            connect(this, 'enter-event', () => {
                global.display.set_cursor(Meta.Cursor.POINTING_HAND)
            })
        }
        set onButtonPress(callback) {
            return connect(this, 'button-press-event', callback)
        }
        destroy() {
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            log('ttttttttt')
            disconnectObject(this)
        }
    }
)

var addTop = size => new Chrome({
    height: size,
    width: monitor.width,
})

var addBottom = size => new Chrome({
    height: size,
    width: monitor.width,
    y: monitor.height - size,
})

var addLeft = size => new Chrome({
    height: monitor.height,
    width: size,
})

var addRight = size => new Chrome({
    height: monitor.height,
    width: size,
    x: monitor.width - size,
})

function addChrome(size) {
    if (typeof size !== 'object') return;
    const top = size.top && addTop(size.top)
    const bottom = size.bottom && addBottom(size.bottom)
    const left = size.left && addLeft(size.left)
    const right = size.right && addRight(size.right)
    // Log.properties(right)
    return { top, bottom, left, right }
}

