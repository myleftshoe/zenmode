
var Log = class Log {

    static value(value, label) {
        let prefix = '';
        if (label)
            prefix = `${label}: `
        log(`${prefix}${value}`);
    }

    static properties(obj) {
        log();
        log(`PROPERTIES FOR OBJECT ${obj.constructor.name}:`);
        this.array(getProperties(obj));
    }

    static array(props) {
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
}

function getProperties(obj) {
    let properties = [];
    let currentObj = obj;
    do {
        const currentObjProperties = Object.getOwnPropertyNames(currentObj).sort().map(property => ({
            property, 
            object: currentObj.constructor.name, 
            type: typeof currentObj[property] 
        }));
        properties.push(...currentObjProperties);
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return properties;
}
