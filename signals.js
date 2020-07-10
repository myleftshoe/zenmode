const { GObject, Clutter } = imports.gi

var Signals = class Signals {
    constructor() {
        this.signals = new Map()
    }
    connect(object, signal, callback) {
        const sid = GObject.signal_connect(object, signal, callback)
        this.signals.set(sid, { object, signal })
        return sid
    }
    disconnect(sid) {
        const { object } = this.signals.get(sid) || {}
        if (!object) return
        GObject.signal_handler_disconnect(object, sid)
        this.signals.delete(sid)
    }
    disconnectObject(object) {
        [...this.signals.entries()]
            .filter((sid, value) => value.object === object)
            .map(sid => disconnect(sid))
    }
    destroy() {
        this.signals.forEach(({ object }, sid) => {
            GObject.signal_handler_disconnect(object, sid)
        })
        this.signals.clear()
    }
    list() {
        this.signals.forEach(({ object, signal }, sid) => log(object, sid, signal))
    }
}

function withSignals(SuperClass) {
    return GObject.registerClass({}, class WithSignals extends SuperClass {
        _init(...props) {
            this.signals = new Signals()
            super._init(...props)
        }
        connect(signal, callback) {
            this.signals.connect(this, signal, callback)
        }
        disconnect(sid) {
            this.signals.disconnect(sid)
        }
        destroy() {
            this.signals.destroy()
            this.signals.list()
            return super.destroy()
        }
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
    return Object.defineProperty(object.prototype, eventName, {
        set(callback) {
            if (typeof callback !== 'function') return;
            this.set_reactive(true)
            const action = new Clutter[actionName]()
            this.add_action(action)
            this.signals.connect(action, signalName, callback)
        }
    })
}

