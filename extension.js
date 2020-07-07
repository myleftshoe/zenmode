const { GLib } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { start, stop } = Extension.imports.main

const uuid = Extension.metadata.uuid

function init() {
    log(`***************************************************************`)
    log(`${uuid} init()`)
}

function enable() {
    log(`${uuid} enable()`)
    GLib.idle_add(GLib.PRIORITY_LOW, start)
}

function disable() {
    log(`${uuid} disable()`)
    stop()
}

