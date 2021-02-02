const { GObject, Clutter, Meta, St } = imports.gi
const Main = imports.ui.main
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const Log = Extension.imports.logger
const { values } = Extension.imports.object
const ll = Log.ll


const spacing = 20

var Panel = GObject.registerClass(
    {}, 
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
            // const leftBottomLeft = new Panel({name: 'leftBottomLeft'})
            // leftBottom.add_child(leftBottomLeft)
            // const leftBottomRight = new Panel({name: 'leftBottomRight'})
            // leftBottom.add_child(leftBottomRight)
            const rightLeft = new Panel({name: 'rightLeft'})
            const rightRight = new Panel({name: 'rightRight'})
            right.add_child(rightLeft)
            right.add_child(rightRight)
            this.setSpacing(spacing)
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
        setSpacing(value) {
            const style = `border-width: ${value}px;` 
            this.style = style
            this.getAllChildren().forEach(child => {
                child.style = style
            })
        }
        getAllChildren() {
            const children = []
            recurseChildren(this)
            function recurseChildren(actor) {
                for (const child of actor.get_children()) {
                    children.push(child)
                    recurseChildren(child);
                }
            }            
            return children
        }
        getLeaves() {
            const leaves = []
            _getLeaves(this)
            return leaves
            function _getLeaves(actor) {
                if (actor.get_n_children()) {
                    actor.get_children().forEach(_getLeaves)
                    return
                }
                leaves.push(actor)
            }
        }
    }
)        


function single() {
    // this.remove_style_class_name('stage-centered')
    return [this.addPanel()]
}

function split() {
    const left = this.addPanel()
    const middle = this.addPanel()
    const right = this.addPanel()
    left.addPanel(true)
    // left.addPanel(false)
    log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
    // log(this.getPanels())
    // log(...values(left.getRect()))
    // log(...values(middle.getRect()))
    // log(...values(right.getRect()))
    // Log.properties(left)
    // log('>>', left.find_child_by_name('panelContent'))
    return [left, middle, right]
}

function centered() {
    this.add_style_class_name('stage-centered')
    return [single.call(this)]
} 


class Rect {
    constructor(x, y, width, height) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
    }
    static fromActorBox(box = new Clutter.ActorBox()) {
        return new Rect({
            x: box.get_x(),
            y: box.get_y(), 
            width: box.get_width(), 
            height: box.get_height(),
        })
    }

}


function allocationBoxToRect(actor) {
    const box = actor.get_allocation_box()
    return {
        x: box.get_x(),
        y: box.get_y(), 
        width: box.get_width(), 
        height: box.get_height(),
    }
}




function allocationBoxToRect(actor) {
    const box = actor.get_allocation_box()
    return {
        x: box.get_x(),
        y: box.get_y(), 
        width: box.get_width(), 
        height: box.get_height(),
    }
}

