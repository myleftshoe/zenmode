const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);
const and = (...fns) => (x) => fns.every(f => f(x))
const or = (...fns) => (x) => fns.some(f => f(x))
const not = x => y => x !== y
const include = a => v => a.includes(v)
const _exclude = a => v => !a.includes(v)
function exclude(any) {
    return _exclude([...Array.isArray(arguments[0]) ? arguments[0] : arguments])
}

// const arr = ['a', 'b', 'c', 'd', 'e', 'f']

// console.log(arr.filter(exclude(['b', 'd'])))
// console.log(arr.filter(exclude('a', 'b', 'e')))
// console.log(arr.filter(exclude('c')))
// console.log(arr.filter(not('c')))