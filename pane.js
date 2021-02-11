const { Clutter, GObject, St } = imports.gi
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
            this.virtualChildren = new Set()
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
            const [width, height] = this.get_transformed_size()
            return { x, y, width, height }
        }
        addVirtualChild(child, resizeFunc) {
            this.virtualChildren.add(child)
            resizeFunc(child, this.getRect())
        }
        flash() {
            this.set_background_color(new Clutter.Color({ red: 0, green: 255, blue: 255, alpha: 100 }))
            this.save_easing_state()
            this.set_easing_duration(300)
            this.set_easing_mode(Clutter.AnimationMode.EASE_IN_CUBIC)
            this.set_background_color(new Clutter.Color({ red: 0, green: 255, blue: 255, alpha: 0 }))
            this.restore_easing_state()
        }
    }
)
