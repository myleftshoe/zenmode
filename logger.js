const Extension = imports.misc.extensionUtils.getCurrentExtension()
const uuid = Extension.metadata.uuid


function entry(func) {
    return function([k, v]) {
        func(k,v)
    }
}

function pair(k, v) {
    log(`${k}: ${v}`)
} 

log('>>>>>>>>')
entries({key1: 'val1', key2: 'val2'})
function entries(object) {
    Object.entries(object).forEach(entry(pair))
}

function arguments(any) {
    [...arguments].forEach(entries)
}

function value(...args) {
    log(uuid, ...args)
}

var ll = value

function properties(obj) {
    log();
    log(`PROPERTIES FOR OBJECT ${obj.constructor.name}:`);
    array(getProperties(obj));
}

function array(props) {
    const columnWidths = props.reduce((acc, cur) => {
        Object.keys(cur).forEach((key, index) => {
            if (cur[key].length > acc[index]) {
                acc[index] = cur[key].length
            }
        });
        return acc;
    }, new Array(Object.keys(props[0]).length).fill(0))
    const header = Object.keys(props[0]).reduce((acc, cur, index) => {
        return acc + cur.padEnd(columnWidths[index] + 4)
    }, '');
    const separator = ''.padEnd(header.length, '-');
    const lines = props.map(prop => (
        prop.property.padEnd(columnWidths[0] + 4) +
        prop.object.padEnd(columnWidths[1] + 4) +
        prop.type.padEnd(columnWidths[2] + 4)
    ));
    log();
    log(header);
    log(separator);
    lines.forEach(line => log(line));
}

function getProperties(obj) {
    let properties = [];
    let currentObj = obj;
    do {
        const currentObjProperties = Object.getOwnPropertyNames(currentObj).sort().map(property => {
            let type = ''
            try {
                type = typeof currentObj[property]
            } catch { }
            return {
                property,
                object: currentObj.constructor.name,
                type
            }
        });
        properties.push(...currentObjProperties);
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return properties;
}
