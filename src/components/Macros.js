"use strict";

const cloneDeep = require("lodash.clonedeep");
import isPlainObject from 'is-plain-object';
import isString from 'is-string';
import isArray from 'is-array';
import isFunction from 'is-function';

class Macros {
    constructor(ctx) {
        this.game = ctx.game;
        this.bridge = ctx.bridge;
        // console.log(this.game);
    }
    
    transform(value, options) {
        let cloned = cloneDeep(value);
        return this.transformValue(cloned, options);
    }

    transformValue(value, options) {
        if (isPlainObject(value) || isArray(value)) { // ?
            for (let objKey in value) {
                value[objKey] = this.transformValue(value[objKey], options);
            }
        } else if (isString(value)) {
            // replace params here
            let regex = /\{\{(\w+)\}\}/g;
            let matched;
            let replaceItems = [];
            do {
                matched = regex.exec(value);
                if (matched) {
                    let macro = matched[0];
                    let macroKey = matched[1];
                    let macroValue = this.getMacroKeyValue(macroKey, options);
                    if (macroValue) {
                        replaceItems.push({ key: macroKey, value: macroValue })
                        // replace it
                        // console.log(macroValue);
                    }
                }
            } while (matched);
            if (replaceItems.length > 0) {
                replaceItems.forEach(item => {
                    value = value.replace(new RegExp("\{\{" + item.key + "\}\}", "g"), item.value)
                });
            }
        }
        return value;
    }

    getMacroKeyValue(key, options) {
        switch (key) {
            case "CACHEBUSTER":
                return Date.now();
            case "GAME_ID":
                return this.game.gameId;
            case "GAME_TITLE":
                return this.game.title;
            case "COUNTRY_CODE":
                return this.game.ctry;
            case "PAGE_URL":
                return this.bridge.parentURL;
            case "PAGE_URL_ESC":
                return encodeURIComponent(this.bridge.parentURL);
            case "PAGE_URL_ESC_ESC":
                return encodeURIComponent(encodeURIComponent(this.bridge.parentURL));
            case "DOMAIN_MATCHED":
                return this.bridge.domainMatched ? 1 : 0;
            case "DOMAIN_PARENT":
                return this.bridge.parentDomain;
            case "DOMAIN_TOP":
                return this.bridge.topDomain;
            case "DEPTH":
                return this.bridge.depth;
            default:
                if (options && isFunction(options.get)) return options.get(key);
                break;
        }
    }
}
export default Macros;