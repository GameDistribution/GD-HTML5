"use strict";

const cloneDeep = require("lodash.clonedeep");
import isPlainObject from 'is-plain-object';
import isString from 'is-string';
import isArray from 'is-array';

class Macros {
    constructor(ctx) {
        this.game = ctx.game;
        this.bridge = ctx.bridge;

        // console.log(this.game);
    }

    transform(value) {

        let cloned = cloneDeep(value);

        cloned = this.transformValue(cloned);

        return cloned;
    }

    transformValue(value) {
        if (isPlainObject(value) || isArray(value)) { // ?
            for (let objKey in value) {
                value[objKey] = this.transformValue(value[objKey]);
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
                    let macroValue = this.getMacroKeyValue(macroKey);
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
    getMacroKeyValue(key) {
        switch (key) {
            case "PAGE_URL":
                return this.bridge.parentURL;
            case "PAGE_URL_ESC":
                return encodeURIComponent(this.bridge.parentURL);
            case "PAGE_URL_ESC_ESC":
                return encodeURIComponent(encodeURIComponent(this.bridge.parentURL));
            case "CACHEBUSTER":
                return Date.now();
            case "GAME_ID":
                return this.game.gameId;
        }
    }
    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
}

export default Macros;