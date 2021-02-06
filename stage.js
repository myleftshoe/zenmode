const { GObject, Clutter, St } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { merge } = Extension.imports.object
const { Pane } = Extension.imports.pane
const { StageFrame } = Extension.imports.stageframe
const { layouts } = Extension.imports.layouts
const { sampleColors } = Extension.imports.metaWindow
const Log = Extension.imports.logger
const { ll } = Log


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
            this.frame = new StageFrame()
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
