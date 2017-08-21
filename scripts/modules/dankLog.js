'use strict';

/**
 * dankLog - Just shows stuff in as dank as possible.
 * @param name: String
 * @param message: String
 * @param status: String - success, warning, error
 * @public
 */
function dankLog(name, message, status) {
    let theme = (status === 'error') ? 'background: #c4161e; color: #fff' : (status === 'warning') ? 'background: #ff8c1c; color: #fff' : 'background: #44a5ab; color: #fff';
    const banner = console.log('%c %c %c gdApi %c %c %c ' + name + ' ', 'background: #9854d8', 'background: #6c2ca7', 'color: #fff; background: #450f78;', 'background: #6c2ca7', 'background: #9854d8', theme, message);
    console.log.apply(console, banner);
}

export {dankLog}