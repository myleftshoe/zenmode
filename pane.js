const { GObject, St } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { merge } = Extension.imports.object

const spacing = 40

const separator = (vertical = false) => new St.Bin({
    name: separator.name,
    style_class: separator.name,
    ...vertical ? separator.vertical : separator.horizontal
})

separator.size = spacing

separator.horizontal = { 
    width: separator.size,
    x_expand: false,
    y_expand: true,
}

separator.vertical = { 
    height: separator.size,
    x_expand: true,
    y_expand: false,
}

const defaultProps = (props = {}) => merge({
    name: 'pane',
    x_expand: true,
    y_expand: true,
    style_class: 'pane',
}, props)


var Pane = GObject.registerClass(
    {
        GTypeName: 'zmPane',
    }, 
    class Pane extends St.BoxLayout {
        _init(props) {
            const initProps = defaultProps(props)
            super._init(initProps)
        }
        get isPane() { return true }
        add_child(actor) {
            if (actor.name === separator.name) return
            super.add_child(actor)
            if (this.get_n_children() > 1) {
                this.insert_child_below(separator(this.vertical), actor)
            }
            this.remove_style_class_name('pane')
        }
        getRect() {
            const [x, y] = this.get_transformed_position()
            const [w, h] = this.get_transformed_size()
            return [x, y, w, h]
        }
    }
)
