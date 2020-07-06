const { GObject } = imports.gi

const signals = new Map()

function connect(object, signal, callback) {
    const sid = GObject.signal_connect(object, signal, callback) 
    const objectSignals = signals.get(object) || new Map()
    signals.set(object, objectSignals.set(sid, signal))
    return sid
}

function disconnect(object, sid) {
    object.disconnect(sid)
    signals.get(object).delete(sid)
}

function disconnectObject(object) {
    signals.get(object).forEach((signal, sid) => object.disconnect(signal))
    signals.delete(object)
}

function clear() {
    signals.forEach((signals, object) => disconnectObject(object))
    signals.clear()
}    

function toString(object, sid) {
    return signals.get(object).get(sid)
}

function list(object) {
    signals.get(object).forEach((signal, sid) => log(object, sid, signal))
}

function defineListener(object, name, signal) {
    return Object.defineProperty(object.prototype, name, {
        set(callback) {
            connect(object, signal, callback)
        }
    })
}

// function defineActionListener(object, actionName, eventName, signalName) {
//     return Object.defineProperty(object.prototype, eventName, {
//         set(callback) {
//             if (typeof callback !== 'function') return;
//             this.set_reactive(true)
//             const action = new Clutter[actionName]()
//             this.add_action(action)
//             signals.connect(action, signalName, callback)
//         }
//     })
// }

