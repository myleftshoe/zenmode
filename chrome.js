const Main = imports.ui.main
const { GObject, Clutter, Meta, St } = imports.gi

const Extension = imports.misc.extensionUtils.getCurrentExtension()

const style_class = 'chrome'
const affectsStruts = true

let primaryMonitor = global.display.get_current_monitor()
let monitor = global.display.get_monitor_geometry(primaryMonitor)

var Chrome = GObject.registerClass({},
    class Chrome extends St.Widget {
        _init(props) {
            super._init({
                style_class,
                reactive: true,
                ...props,
            })
            this._signals = new Map()
            Main.layoutManager.addChrome(this, { affectsStruts })
            this._connect('enter-event', () => {
                global.display.set_cursor(Meta.Cursor.POINTING_HAND)
            })
            // this.connect('leave-event', () => {
            //     global.display.set_cursor(Meta.Cursor.DEFAULT);
            // });
        }
        _connect(signal, callback, object) {
            let sid
            if (object) 
                sid = object.connect(signal, callback) 
            else 
                sid = super.connect(signal, callback)
            this._signals.set(sid, object)
            return sid
        }
        _disconnect(sid) {
            const object = this._signals.get(sid)
            if (object)
                object.disconnect(sid)
            else 
                super.disconnect(sid)
            this._signals.delete(sid)
        }
        connect(signal, callback, object) {
            return this._connect(signal, callback, object)
        }
        disconnect(sid) {
            this._disconnect(sid)
        }
        destroy() {
            this._signals.forEach(this._disconnect)
            this._signals.clear()
        }
        set onClick(callback) {
            if (typeof callback !== 'function') return;
            this.set_reactive(true)
            const clickAction = new Clutter.ClickAction()
            this._connect('clicked', callback, clickAction)
            this.add_action(clickAction)
        }
        set onButtonPress(callback) {
            this._connect('button-press-event', callback)
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

function createChrome(size) {
    if (typeof size !== 'object') return;
    const top = size.top && addTop(size.top)
    const bottom = size.bottom && addBottom(size.bottom)
    const left = size.left && addLeft(size.left)
    const right = size.right && addRight(size.right)
    return { top, bottom, left, right }
}
