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
            this.connect('actor-added', () => {
                log('actor-added', this.name)
                this.remove_style_class_name('pane')
            })
            this.connect('actor-removed', () => {
                log('actor-removed', this.name)
                if (!this.get_n_children()) {
                    this.add_style_class_name('pane')
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
