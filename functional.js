const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);
const not = x => y => x !== y
const include = a => v => a.includes(v)
const exclude = a => v => !a.includes(v)
