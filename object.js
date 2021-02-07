var merge = (a = {}, b = {}) => Object.assign(a, b)
var values = (o = {}) => [...Object.values(o)]
var keys = (o = {}) => [...Object.keys(o)]
var entries = (o = {}) => [...Object.entries(o)]
var toMap = (o = {}) => new Map(entries(o))

var defineGetter = (obj, prop, get) => Object.defineProperty(obj, prop, { get })
