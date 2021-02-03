const { GObject, Clutter, GLib, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger
const { merge, values } = Extension.imports.object
const { onIdle } = Extension.imports.async

const ll = Log.ll

var Panel = GObject.registerClass(
    {
        GTypeName: 'zmPanel',
    }, 
    class Panel extends St.BoxLayout {
        _init({...props} = {}) {
            super._init({
                x_expand: true,
                y_expand: true,
                style_class: 'panel',
                ...props
            })
            this.connect('actor-added', () => {
                log('actor-added', this.name)
                this.remove_style_class_name('panel')
            })
            this.connect('actor-removed', () => {
                log('actor-removed', this.name)
                if (!this.get_n_children()) {
                    this.add_style_class_name('panel')
                }
            })
        }
        getRect() {
            const [x, y] = this.get_transformed_position()
            const [w, h] = this.get_transformed_size()
            const m = 20
            return [x + m, y + m, w - 2 * m, h - 2 * m]
        }
    }
)

var createStage = (props) => new Stage(props)

const defaultProps = (props = {}) => merge({layout: layouts.single, width: global.stage.width, height: global.stage.height}, props)

var Stage = GObject.registerClass(
    {
        GTypeName: 'zmStage',
        Signals: {
            'layout-changed': {}
        }
    },
    class Stage extends Panel {
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
        async setLayout(layout) {
            this.remove_all_children()
            layout.call(this)
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

const layouts = {
    single, split, layout1, complex
}


function single() {
    const panel = new Panel()
    this.add_child(panel)
}
single.panes = 1

function split() {
    const left = new Panel()
    const right = new Panel()
    this.add_child(left)
    this.add_child(right)
}
split.panes = 2

function layout1() {
    const left = new Panel({name: 'left', vertical:true})
    const right = new Panel({name: 'right'})
    this.add_child(left)
    this.add_child(right)
    const leftTop = new Panel({name: 'leftTop'})
    const leftBottom = new Panel({name: 'leftBottom'})
    left.add_child(leftTop)
    left.add_child(leftBottom)
}
layout1.panes = 3

function complex() {
    const left = new Panel({name: 'left', vertical:true})
    const right = new Panel({name: 'right'})
    this.add_child(left)
    this.add_child(right)
    const leftTop = new Panel({name: 'leftTop'})
    const leftBottom = new Panel({name: 'leftBottom'})
    left.add_child(leftTop)
    left.add_child(leftBottom)
    // left.remove_child(leftTop)
    // left.remove_child(leftBottom)
    const leftBottomLeft = new Panel({name: 'leftBottomLeft'})
    leftBottom.add_child(leftBottomLeft)
    const leftBottomRight = new Panel({name: 'leftBottomRight'})
    leftBottom.add_child(leftBottomRight)
    const rightLeft = new Panel({name: 'rightLeft'})
    const rightRight = new Panel({name: 'rightRight'})
    right.add_child(rightLeft)
    right.add_child(rightRight)

    // log('leftBottomLeft', leftBottomLeft.get_allocation_box().get_origin(), leftBottomLeft.get_allocation_box().get_size())
    // this.leftBottomLeft = leftBottomLeft
    // this.leftBottomRight = leftBottomRight
    // this.leftBottomLeftInner = new Panel()
    // this.leftBottomLeftInner.style = 'margin: 20px';
    // this.leftBottomRightInner = new Panel()
    // this.leftBottomRightInner.style = 'margin: 20px';
    // leftBottomLeft.add_child(this.leftBottomLeftInner)
    // leftBottomRight.add_child(this.leftBottomRightInner)
}
complex.panes = 5