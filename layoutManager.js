const { GObject, Clutter, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger
const { values } = Extension.imports.object
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


var LayoutManager = GObject.registerClass(
    {
        GTypeName: 'zmLayoutManager',
        Signals: {
            'layout-changed': {}
        }
    },
    class LayoutManager extends Panel {
        _init() {
            super._init({
                width: global.stage.width,
                height: global.stage.height,
                style_class: 'stage',
                reactive: false,
                // vertical: true,
            })
            global.stage.add_child(this)
            this.setLayout(complex  )
        }
        setLayout(layout) {
            this.remove_all_children()
            layout.call(this)
        }
        getPanes() {
            return get_childless_descendants(this)
        }
    }
)        

function get_childless_descendants(actor) {
    const recurse = (actor) => actor.get_n_children() ? actor.get_children().flatMap(recurse) : [ actor ]
    return recurse(actor)
}

function get_childless_descendants_using_reduce(actor) {
    const recurse = (acc, cur) => cur.get_n_children() ? cur.get_children().reduce(recurse, acc) : [...acc, cur]
    return recurse([], actor)
}


function single() {
    const panel = new Panel()
    this.add_child(panel)
}

function split() {
    const left = new Panel()
    const right = new Panel()
    this.add_child(left)
    this.add_child(right)
}

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
