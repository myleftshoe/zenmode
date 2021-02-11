var pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
var compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
var and = (...fns) => x => fns.every(f => f(x))
var or = (...fns) => x => fns.some(f => f(x))
var not = x => y => x !== y
var include = a => v => a.includes(v)
var excludeUnary = a => v => !a.includes(v)
var exclude = (...any) => excludeUnary(Array.isArray(any[0]) ? any[0] : any)


class AugmentedObject {
    constructor(object) {
        this.root = object
    }
    addMethod([name, func]) {
        this[name] = function (params) {
            const result = func(this.root, params)
            return result === this.root ? this : result
        }
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


/****************************************************************
 * EXPERIMENTAL (NOT USED)
 */



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