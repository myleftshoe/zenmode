const Signals = imports.signals
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { start, stop } = Extension.imports.main

const uuid = Extension.metadata.uuid

function init() {
    log(`***************************************************************`)
    log(`${uuid} init()`)
    Signals.addSignalMethods(Extension)
}

function enable() {
    log(`${uuid} enable()`)
    start()
    Extension.loaded = true
}

function disable() {
    log(`${uuid} disable()`)
    stop()
    Extension.loaded = false
}

