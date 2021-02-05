const { GObject } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger
const { ll } = Log
const { merge } = Extension.imports.object
const { Pane } = Extension.imports.pane
const { layouts } = Extension.imports.layouts
const { Chrome } = Extension.imports.chrome

const primaryMonitor = global.display.get_current_monitor()
const monitor = global.display.get_monitor_geometry(primaryMonitor)


var createStage = (props) => new Stage(props)

const defaultProps = (props = {}) => merge({layout: layouts.centered, width: global.stage.width, height: global.stage.height}, props)

var Stage = GObject.registerClass(
    {
        GTypeName: 'zmStage',
        Signals: {
            'layout-changed': {}
        }
    },
    class Stage extends Pane {
        _init(props) {
            const { width, height, layout} = defaultProps(props)
            super._init({
                width,
                height,
                style_class: 'stage',
                reactive: false,
                // vertical: true,
            })
            this.frame = new StageFrame(40)
            global.stage.add_child(this)
            this.setLayout(layout)
        }
        get layout() { 
            return this._layout 
        }
        async setLayout(layout) {
            this.destroy_all_children()
            this.remove_style_class_name('stage-centered')
            layout.call(this)
            this._layout = layout
            await this.layoutComplete()
            this.emit('layout-changed')
        }
        layoutComplete() {
            return Promise.all(this.getPanes().map(allocated))
        }
        getPanes() {
            get_all_descendants(this).map((c, i) => { 
                log('#', i, c)
            })
            return get_childless_descendants(this)
            
        }
        setColor(rgb) {
            get_all_descendants(this).forEach(c => {
                c.style = `border-color: rgba(${rgb},1);`
            })
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
    constructor(vert = 40, horz = vert) {
        this.top = new Chrome({reactive: true})
        this.bottom = new Chrome()
        this.left = new Chrome({})
        this.right = new Chrome()
        this.setVert(vert)
        this.setHorz(horz)
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
