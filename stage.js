const { GObject } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger
const { ll } = Log
const { merge } = Extension.imports.object
const { Pane } = Extension.imports.pane
const { layouts } = Extension.imports.layouts


var createStage = (props) => new Stage(props)

const defaultProps = (props = {}) => merge({layout: layouts.single, width: global.stage.width, height: global.stage.height}, props)

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
            global.stage.add_child(this)
            this.setLayout(layout)
        }
        get layout() { 
            return this._layout 
        }
        async setLayout(layout) {
            this.remove_all_children()
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
            return get_childless_descendants(this)
            
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
