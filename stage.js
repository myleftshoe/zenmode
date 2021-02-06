const { GObject, Clutter, St } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger
const { ll } = Log
const { merge } = Extension.imports.object
const { Pane } = Extension.imports.pane
const { layouts } = Extension.imports.layouts
const { Chrome } = Extension.imports.chrome
const { sampleColors } = Extension.imports.metaWindow

const primaryMonitor = global.display.get_current_monitor()
const monitor = global.display.get_monitor_geometry(primaryMonitor)

const spacing = 40


var createStage = (props) => new Stage(props)

const defaultProps = (props = {}) => merge({
    layout: layouts.centered, 
    width: global.stage.width, 
    height: global.stage.height
}, props)

var Stage = GObject.registerClass(
    {
        GTypeName: 'zmStage',
        Signals: {
            'layout-changed': {}
        }
    },
    class Stage extends Pane {
        _init(props) {
            const { width, height, layout } = defaultProps(props)
            super._init({
                name: 'stage',
                width,
                height,
                style_class: 'stage',
                reactive: false,
                vertical: false,
            })
            this.frame = new StageFrame(spacing)
            global.stage.add_child(this)
            this.setLayout(layout)
        }
        show() {
            this.frame.show()
            super.show()
        }
        hide() {
            this.frame.hide()
            super.hide()
        }
        get layout() { 
            return this._layout 
        }
        setLayout(layout) {
            this.destroy_all_children()
            layout.call(this)
            this._layout = layout
            this.layoutComplete().then(() => {
                this.emit('layout-changed')
            })
        }
        layoutComplete() {
            return Promise.all(this.getPanes().map(allocated))
        }
        getPanes() {
            return get_childless_descendants(this).filter(child => child.isPane)
            
        }
        setColor(rgb) {
            this.style = `border-color: rgba(${rgb},1);`
            get_childless_descendants(this).filter(child => !child.isPane).forEach(child => {
                child.style = `background-color: rgba(${rgb},1);`
            })
            // get_all_descendants(this).forEach(c => {
            //     c.style = `border-color: rgba(${rgb},1);`
            // })
        }
        blendWithMetaWindow(metaWindow) {
            if (this.layout.panes !== 1)
                return 
            const dominantColor = sampleColors(metaWindow)
            this.setColor(dominantColor)
        }
    }
)        


function allocated(pane) {
    return new Promise(resolve => {
        const sid = pane.connect('notify::allocation', () => {
            pane.disconnect(sid)
            resolve('allocated')
        })
    })
}

function get_childless_descendants(actor) {
    const leafs = (actor) => actor.get_n_children() 
        ? actor.get_children().flatMap(leafs) 
        : [ actor ]
    return leafs(actor)
}


function get_all_descendants(actor) {
    const children = []
    const getChildren = (actor) => { 
        children.push(actor)
        if (actor.get_n_children())
            actor.get_children().forEach(getChildren)
        
    }
    getChildren(actor)
    return children
}


class StageFrame {
    constructor(vert = spacing, horz = vert) {
        this.top = new Chrome({reactive: true})
        this.bottom = new Chrome()
        this.left = new Chrome({})
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
