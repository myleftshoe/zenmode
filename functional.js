const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const and = (...fns) => x => fns.every(f => f(x))
const or = (...fns) => x => fns.some(f => f(x))
const not = x => y => x !== y
const include = a => v => a.includes(v)
const _exclude = a => v => !a.includes(v)
function exclude(any) {
    return _exclude([...Array.isArray(arguments[0]) ? arguments[0] : arguments])
}


class AugmentedObject {
    constructor(object) {
        this.root = object
    }
    addMethod([name, func]) {
        this[name] = (params) => func(this.root, params)
    }
}

function augmentObject(object, functions) {
    const augmentedObject = new AugmentedObject(object)
    Object.entries(functions).forEach(augmentedObject.addMethod.bind(augmentedObject))
    return augmentedObject
}


// const arr = ['a', 'b', 'c', 'd', 'e', 'f']

// console.log(arr.filter(exclude(['b', 'd'])))
// console.log(arr.filter(exclude('a', 'b', 'e')))
// console.log(arr.filter(exclude('c')))
// console.log(arr.filter(not('c')))


// http://intelligiblebabble.com/clever-way-to-demethodize-native-js-methods/
var demethodize = Function.prototype.bind.bind(Function.prototype.call);

function methodize(fn) {
    return function () {
        return fn.apply(undefined, [this].concat(__slice(arguments, 0)));
    }
}

function curry(func) {

    return function curried(...args) {
        if (args.length >= func.length) {
            return func.apply(this, args);
        } else {
            return function (...args2) {
                return curried.apply(this, args.concat(args2));
            }
        }
    };

}