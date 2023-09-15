'use strict';

module.exports = function(...args) {
    let message = '';
    for (let i=0; i < args.length; i++) {
        const val = args[i];
        message += (typeof val === 'string' || val instanceof String) ? val : JSON.stringify(val)
        if (i !== args.length - 1) {
            message += ' ';
        }
    }
    process.stdout.write(message);
};