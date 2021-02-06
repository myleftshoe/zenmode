const { St } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Pane } = Extension.imports.pane
const Log = Extension.imports.logger
var layouts = {
    single, centered, split, layout1, complex, grid
}

function single() {
    const pane = new Pane()
    this.add_child(pane)
}
single.panes = 1

const spacerWidth = 200

function Spacer ({ name = 'spacer', width = spacerWidth} = {}) {
    return new St.Bin({
        name, 
        width,
        x_expand: false,
        y_expand: true,
        style_class: name,
    })
}

function centered() {
    this.add_child(new Spacer())
    this.add_child(new Pane())
    this.add_child(new Spacer())
}
centered.panes = 1


function split() {
    this.add_child(new Pane())
    this.add_child(new Pane())
}
split.panes = 2

function layout1() {
    const left = new Pane({vertical:true})
    const right = new Pane()
    left.add_child(new Pane())
    left.add_child(new Pane())
    this.add_child(left)
    this.add_child(right)

}
layout1.panes = 3

function grid() {
    const left = new Pane({vertical: true})
    const right = new Pane({vertical: true})
    left.add_child(new Pane())
    left.add_child(new Pane())
    right.add_child(new Pane())
    right.add_child(new Pane())
    this.add_child(left)
    this.add_child(right)
}
layout1.panes = 4


function complex() {
    const left = new Pane({vertical:true})
    const right = new Pane()
    this.add_child(left)
    this.add_child(right)
    const leftTop = new Pane()
    const leftBottom = new Pane()
    left.add_child(leftTop)
    left.add_child(leftBottom)
    // left.remove_child(leftTop)
    // left.remove_child(leftBottom)
    const leftBottomLeft = new Pane()
    leftBottom.add_child(leftBottomLeft)
    const leftBottomRight = new Pane()
    leftBottom.add_child(leftBottomRight)
    const rightLeft = new Pane()
    const rightRight = new Pane()
    right.add_child(rightLeft)
    right.add_child(rightRight)
}
complex.panes = 5