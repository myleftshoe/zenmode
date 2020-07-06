const { GObject, Clutter } = imports.gi

var Signals = class Signals {
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

function withSignals(SuperClass) {
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
        get _signals() { return this.signals.signals }

    })
}

function defineListener(object, eventName, signalName) {
    return Object.defineProperty(object.prototype, eventName, {
        set(callback) {
            this.connect(signalName, callback)
        }
    })
}

function defineActionListener(object, actionName, eventName, signalName) {
    const property = Object.defineProperty(object.prototype, eventName, {
        set(callback) {
            if (typeof callback !== 'function') return;
            this.set_reactive(true)
            const action = new Clutter[actionName]()
            this.add_action(action)
            this.signals.connect(action, signalName, callback)
        }
    })
}

