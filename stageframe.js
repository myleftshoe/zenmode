const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Chrome } = Extension.imports.chrome

const primaryMonitor = global.display.get_current_monitor()
const monitor = global.display.get_monitor_geometry(primaryMonitor)

const spacing = 40

var StageFrame = class StageFrame {
    constructor(vert = spacing, horz = vert) {
        this.top = new Chrome({reactive: true})
        this.bottom = new Chrome()
        this.left = new Chrome()
        this.right = new Chrome()
        this.setVert(vert)
        this.setHorz(horz)
    }
    show() {
        this.top.show()
        this.bottom.show()
        this.left.show()
        this.right.show()
    }
    hide() {
        this.top.hide()
        this.bottom.hide()
        this.left.hide()
        this.right.hide()
    }
    setVert(size) {
        this.top.width = monitor.width
        this.top.height = size
        this.bottom.y = monitor.height - size
        this.bottom.width = monitor.width
        this.bottom.height = size
    }
    setHorz(size) {
        this.left.width = size;
        this.left.height = monitor.height
        this.right.x = monitor.width - size
        this.right.width = size
        this.right.height = monitor.height
    }
}
