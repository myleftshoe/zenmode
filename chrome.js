const Main = imports.ui.main
const { GObject, Clutter, Meta, St } = imports.gi

const Extension = imports.misc.extensionUtils.getCurrentExtension()

const style_class = 'chrome'
const affectsStruts = true

let primaryMonitor = global.display.get_current_monitor()
let monitor = global.display.get_monitor_geometry(primaryMonitor)


class Signals {
    constructor() {
        this.signals = new Map()
    }
    connect(object, signal, callback) {
        const sid = GObject.signal_connect(object, signal, callback) 
        this.signals.set(sid, object)
        return sid
    }
    disconnect(sid) {
        const object = this._signals.get(sid)
        object.disconnect(sid)
        this.signals.delete(sid)
    }
    destroy() {
        this.signals.forEach(this._disconnect)
        this.signals.clear()
    }    
}


var Chrome = GObject.registerClass({},
    class Chrome extends St.Widget {
        _init(props) {
            super._init({
                style_class,
                reactive: true,
                ...props,
            })
            this.signals = new Signals()
            Main.layoutManager.addChrome(this, { affectsStruts })
            // this.signals.connect(this, 'enter-event', () => {
            //     global.display.set_cursor(Meta.Cursor.POINTING_HAND)
            // })
            // this.connect('leave-event', () => {
            //     global.display.set_cursor(Meta.Cursor.DEFAULT);
            // });
        }
        set onClick(callback) {
            if (typeof callback !== 'function') return;
            this.set_reactive(true)
            const clickAction = new Clutter.ClickAction()
            this.signals.connect(clickAction, 'clicked', callback)
            this.add_action(clickAction)
        }
        set onButtonPress(callback) {
            this.signals.connect(this, 'button-press-event', callback)
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

// var addRight = size => new (WithSignals(Chrome))({
//     height: monitor.height,
//     width: size,
//     x: monitor.width - size,
// })

var addRight = size => new ChromeWithSignals({
    height: monitor.height,
    width: size,
    x: monitor.width - size,
})

function createChrome(size) {
    if (typeof size !== 'object') return;
    const top = size.top && addTop(size.top)
    const bottom = size.bottom && addBottom(size.bottom)
    const left = size.left && addLeft(size.left)
    const right = size.right && addRight(size.right)
    return { top, bottom, left, right }
}


var ChromeWithSignals = WithSignals(Chrome)

function WithSignals(SuperClass) {
    return GObject.registerClass({}, class WithSignals extends SuperClass {
        _init(...props) {
            super._init(...props)
            this.signals = new Signals()
        }
        connect(signal, callback) {
            this.signals.connect(this, signal, callback)
        }
        disconnect(sid) {
            this.signals.disconnect(sid)
        }
        destroy() {
            this.signals.destroy()
            return super.destroy()
        }
    })
}
