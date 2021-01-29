function mergeProperties(object, from) {
    const mergedObject = { ...object }
    for (key in from) {
        mergedObject[key] = mergedObject[key] || from[key] 
    }
    return mergedObject
}
