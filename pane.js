const { GObject, St } = imports.gi

var Pane = GObject.registerClass(
    {
        GTypeName: 'zmPane',
    }, 
    class Pane extends St.BoxLayout {
        _init({...props} = {}) {
            super._init({
                x_expand: true,
                y_expand: true,
                style_class: 'pane',
                ...props
            })
            // this.layout_manager.set_spacing(40)
        }
        getRect() {
            const [x, y] = this.get_transformed_position()
            const [w, h] = this.get_transformed_size()
            const m = 20
            return [x, y, w, h]
            return [x + m, y + m, w - 2 * m, h - 2 * m]
        }
    }
)
