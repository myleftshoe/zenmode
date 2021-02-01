const { GObject, Clutter, Meta, St } = imports.gi
const Main = imports.ui.main
const margin = 20


var Panel = GObject.registerClass(
    {}, 
    class Panel extends St.BoxLayout {
        _init() {
            super._init({
                x_expand: true,
                y_expand: true,
                style_class: 'panel',
                // margin_top: 100,
            })
            this.margin = margin
        }
        set margin(value) {
            this.style = `padding: ${value}px solid green;`
            this._margin = value
        }
        get margin() { return this._margin }
        getSize() { 
            const { x, y, width, height } = allocationBoxToRect(this)
            const m = margin
            return { 
                x: x + m,
                y: y + m,
                width: width - 2 * m,
                height: height - 2 * m
            }
        }

    }
)


var LayoutManager = GObject.registerClass(
    {
        Signals: {
            'layout-changed': {}
        }
    },
    class LayoutManager extends St.BoxLayout {
    _init() {
        super._init({
            width: global.stage.width,
            height: global.stage.height,
            style_class: 'stage',
            reactive: false,
        })
        global.stage.add_child(this)
        this.setLayout(single)
    }
    addPanel() {
        const panel = new Panel()
        this.add_child(panel)
        return panel
    }
    getPanels() {
        const panels = []
        const children = this.get_children()
        children.forEach(child => {
            const n = child.get_n_children()
            if (n) {
                child.get_children().forEach(c => panels.push(c))
            }
            else {
                panels.push(child)
            }
        })
        return panels
    }
    get layout() { return this._layout }
    setLayout(layout = single) {
        this.remove_all_children()
        this._layout = layout
        layout.call(this)
        this.emit('layout-changed')
        // this.layout_manager.layout_changed()
    }
    toggleSplitLayout() {
        this.setLayout(this.layout === split ? single : split)
    }
})        


function single() {
    // this.remove_style_class_name('stage-centered')
    return [this.addPanel()]
}

function split() {
    const left = this.addPanel()
    left.vertical = true
    left.add_child(new Panel())
    left.add_child(new Panel())
    const middle = this.addPanel()
    const right = this.addPanel()
    log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
    log(this.getPanels())
    return [left, middle, right]
}

function centered() {
    this.add_style_class_name('stage-centered')
    return [single.call(this)]
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

