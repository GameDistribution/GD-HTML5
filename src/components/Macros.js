"use strict";

const cloneDeep = require("lodash.clonedeep");
import isPlainObject from 'is-plain-object';
import isString from 'is-string';
import isArray from 'is-array';

class Macros {
    constructor(ctx) {
        this.game = ctx.game;
        this.bridge = ctx.bridge;

        // console.log(this);
    }

    transform(value) {

        let cloned = cloneDeep(value);

        cloned = this.transformValue(cloned);

        return cloned;
    }

    transformValue(value, key) {
        if (isPlainObject(value) || isArray(value)) { // ?
            for (let objKey in value) {
                value[objKey] = this.transformValue(value[objKey], objKey);
            }
        } else if (isString(value)) {
            // replace params here
            console.log(key, value);

            
        }

        return value;
    }
}

export default Macros;