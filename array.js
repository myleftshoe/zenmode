function loop(a) {
    let i = 0
    const len = a.length
    return function() {
        if (i >= len) 
            i = 0     
        return a[i++]
    }
}
