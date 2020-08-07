
const { GLib } = imports.gi

function onIdle(callback, priority = GLib.PRIORITY_HIGH_IDLE + 10) {
    GLib.idle_add(priority, () => {
        callback()
        return false
    })
}