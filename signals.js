const { GObject, Clutter } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger

var Signals = class Signals {
    constructor() {
        this.signals = new Map()
    }
    connect(object, signal, callback) {
        const sid = object.connect(signal, callback)
        this.signals.set(sid, { object, signal })
        return sid
    }
    connectOnce(object, signal, callback, data) {
        const sid = object.connect(signal, (...args) => {
            this.disconnect(sid)
            callback(...args, data)
        })
        this.signals.set(sid, { object, signal })
        return sid
    }
    disconnect(sid) {
        const { object } = this.signals.get(sid) || {}
        if (!object) return
        object.disconnect(sid)
        this.signals.delete(sid)
    }
    disconnectObject(object) {
        const entries = [...this.signals.entries()]
        entries
            .filter(([sid, value]) => value.object === object)
            .map(([sid]) => this.disconnect(sid))
    }
    destroy() {
        this.signals.forEach(({ object }, sid) => {
            object.disconnect(sid)
        })
        this.signals.clear()
    }
    list() {
        this.signals.forEach(({ object, signal }, sid) => log(object, sid, signal))
    }
}

var signals = new Signals()

function defineListener(object, eventName, signalName) {
    object.prototype[eventName] = function (callback) {
        signals.connect(this, signalName, callback)
    }
}

function defineActionListener(object, actionName, eventName, signalName) {
    object.prototype[eventName] = function (callback) {
        this.set_reactive(true)
        const action = new Clutter[actionName]()
        this.add_action(action)
        signals.connect(action, signalName, callback)
    }
}

