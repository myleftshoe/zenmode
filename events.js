const { Clutter } = imports.gi

const aliases = {
    ALT: 'MOD1',
    LEFT_BUTTON: 'BUTTON1',
    MIDDLE_BUTTON: 'BUTTON2',
    RIGHT_BUTTON: 'BUTTON3',
}

function hasModifier(event, modifier) {
    modifier = aliases[modifier] || modifier
    return Boolean(event.get_state() & Clutter.ModifierType[`${modifier}_MASK`])
}

function getEventModifiers(event) {
    return new Proxy(event, {
        get(event, modifier) {
            return hasModifier(event, modifier)
        }
    })
}

