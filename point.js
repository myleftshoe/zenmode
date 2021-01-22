var Point = class Point {
    constructor({ x, y }) {
        this.x = x
        this.y = y
    }
    static fromArray(xy = []) {
        const [x, y] = xy
        return new Point({ x, y })
    }
    toArray() {
        return [this.x, this.y]
    }
    merge({ x, y }) {
        const ix = parseInt(this.x)
        const iy = parseInt(this.y)
        const rx = isNaN(ix) ? x : ix
        const ry = isNaN(iy) ? y : iy
        return new Point({ x: rx, y: ry })
    }
    add({ x, y }) {
        return new Point({ x: this.x + x, y: this.y + y })
    }
}
