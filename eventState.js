const { Clutter } = imports.gi

function getEventState(event) {
    return new EventState(event)
}

// Private
class EventState {
    constructor(event) {
        this.state = event.get_state()
    }
    hasModifier(modifier) {
        return Boolean(this.state & Clutter.ModifierType[`${modifier}_MASK`])
    }
    hasModifiers(modifiers) {
        return modifiers.reduce((acc, cur) => acc && this.hasModifier(cur), true)
    }
    get shiftKey() {
        return this.hasModifier('SHIFT')
    }
    get altKey() {
        return this.hasModifier('MOD1')
    }
    get leftButton() {
        return this.hasModifier('BUTTON1')
    }
    get middleButton() {
        return this.hasModifier('BUTTON2')
    }
    get rightButton() {
        return this.hasModifier('BUTTON3')
    }
}
