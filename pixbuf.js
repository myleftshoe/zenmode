const { Gdk } = imports.gi

function getColorFrequencies(pixbuf) {
    const pixels = pixbuf.get_pixels()

    const colors = new Map()

    const step = pixbuf.get_has_alpha() ? 4 : 3
    for (let i = 0; i < pixels.length; i += step) {
        const rgba = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`
        let count = colors.get(rgba) || 0
        colors.set(rgba, ++count)
    }

    const sorted = [...colors].sort((a, b) => a[1] < b[1] )
    return sorted
}

var getDominantColor = (pixbuf) => getColorFrequencies(pixbuf)[0][0]
