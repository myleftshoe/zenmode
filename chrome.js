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
        _init(props) {
            super._init({
                style_class,
                reactive: true,
                ...props,
            })
            this.signals = new Signals()
            Main.layoutManager.addChrome(this, { affectsStruts })
        }
        set onClick(callback) {
            if (typeof callback !== 'function') return;
            this.set_reactive(true)
            const clickAction = new Clutter.ClickAction()
            this.signals.connect(clickAction, 'clicked', callback)
            this.add_action(clickAction)
        }
    }
)

function composeChrome() {
    const ComposedChrome = withSignals(_Chrome)
    // defineListener(ComposedChrome, 'onButtonPress', 'button-press-event')
    defineActionListener(ComposedChrome, 'ClickAction', 'onButtonPress', 'clicked')
    return ComposedChrome
}

const Chrome = composeChrome()

function createChrome(...props) {
    const edge = new Chrome(...props)
    edge.connect('enter-event', () => {
        global.display.set_cursor(Meta.Cursor.POINTING_HAND)
    })
    log(edge._signals.forEach((v, k) => log(v, k)))
    return edge
}

// ChromeWithSignals.prototype.addAction = function() {log('ddddddddddd')}
// function withButtonPress(SuperClass) {
//     return GObject.registerClass({}, class WithButtonPress extends SuperClass {
//         _init(...props) {
//             super._init(...props)
//             this.connect('enter-event', () => {
//                 global.display.set_cursor(Meta.Cursor.POINTING_HAND)
//             })
//         }
//         set onButtonPress(callback) {
//             this.connect('button-press-event', callback)
//         }
//     })
// }

// var Chrome = withButtonPress(ChromeWithSignals)

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

function addChrome(size) {
    if (typeof size !== 'object') return;
    const top = size.top && addTop(size.top)
    // top.addAction()
    const bottom = size.bottom && addBottom(size.bottom)
    const left = size.left && addLeft(size.left)
    const right = size.right && addRight(size.right)
    return { top, bottom, left, right }
}

