const Main = imports.ui.main;
const { GObject, Clutter, Meta, St } = imports.gi;

const Extension = imports.misc.extensionUtils.getCurrentExtension();

const style_class = 'chrome';
const affectsStruts = true;

let primaryMonitor = global.display.get_current_monitor();
let monitor =  global.display.get_monitor_geometry(primaryMonitor)


var Chrome = GObject.registerClass({},
    class Chrome extends St.Widget {
        _init(props) {
            super._init({
                style_class,
                reactive:true,
                ...props, 
            });
            Main.layoutManager.addChrome(this, { affectsStruts });
            this.connect('enter-event', () => {
                global.display.set_cursor(Meta.Cursor.POINTING_HAND);
            });
            // this.connect('leave-event', () => {
            //     global.display.set_cursor(Meta.Cursor.DEFAULT);
            // });
        }
        set onClick(callback) {
            if (typeof callback !== 'function') return;
            this.set_reactive(true);
            const clickAction = new Clutter.ClickAction();
            clickAction.connect('clicked', callback); 
            this.add_action(clickAction);
        }
    }
);

var addTop = size => new Chrome({
    height: size,
    width: monitor.width,
});

var addBottom = size => new Chrome({
    height: size,
    width: monitor.width,
    y: monitor.height - size,
});

var addLeft = size => new Chrome({
    height: monitor.height,
    width: size,
});

var addRight = size => new Chrome({
    height: monitor.height,
    width: size,
    x: monitor.width - size,
});

function createChrome(size) {
    if (typeof size !== 'object') return;
    const top = size.top && addTop(size.top);
    const bottom = size.bottom && addBottom(size.bottom);
    const left = size.left && addLeft(size.left);
    const right = size.right && addRight(size.right);
    return {top, bottom, left, right};
}