const { St } = imports.gi
const Extension = imports.misc.extensionUtils.getCurrentExtension()
const { Pane } = Extension.imports.pane
const Log = Extension.imports.logger
var layouts = {
    single, centered, split, layout1, complex
}

function single() {
    const pane = new Pane()
    this.add_child(pane)
}
single.panes = 1

function Spacer ({ name = 'spacer', width = 250} = {}) {
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
    const left = new Pane()
    const right = new Pane()
    this.add_child(left)
    this.add_child(right)
}
split.panes = 2

function layout1() {
    const left = new Pane({name: 'left', vertical:true})
    const right = new Pane({name: 'right'})
    this.add_child(left)
    this.add_child(right)
    const leftTop = new Pane({name: 'leftTop'})
    const leftBottom = new Pane({name: 'leftBottom'})
    left.add_child(leftTop)
    left.add_child(leftBottom)
}
layout1.panes = 3

function complex() {
    const left = new Pane({name: 'left', vertical:true})
    const right = new Pane({name: 'right'})
    this.add_child(left)
    this.add_child(right)
    const leftTop = new Pane({name: 'leftTop'})
    const leftBottom = new Pane({name: 'leftBottom'})
    left.add_child(leftTop)
    left.add_child(leftBottom)
    // left.remove_child(leftTop)
    // left.remove_child(leftBottom)
    const leftBottomLeft = new Pane({name: 'leftBottomLeft'})
    leftBottom.add_child(leftBottomLeft)
    const leftBottomRight = new Pane({name: 'leftBottomRight'})
    leftBottom.add_child(leftBottomRight)
    const rightLeft = new Pane({name: 'rightLeft'})
    const rightRight = new Pane({name: 'rightRight'})
    right.add_child(rightLeft)
    right.add_child(rightRight)

    // log('leftBottomLeft', leftBottomLeft.get_allocation_box().get_origin(), leftBottomLeft.get_allocation_box().get_size())
    // this.leftBottomLeft = leftBottomLeft
    // this.leftBottomRight = leftBottomRight
    // this.leftBottomLeftInner = new Pane()
    // this.leftBottomLeftInner.style = 'margin: 20px';
    // this.leftBottomRightInner = new Pane()
    // this.leftBottomRightInner.style = 'margin: 20px';
    // leftBottomLeft.add_child(this.leftBottomLeftInner)
    // leftBottomRight.add_child(this.leftBottomRightInner)
}
complex.panes = 5