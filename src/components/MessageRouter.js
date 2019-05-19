'use strict';

import 'whatwg-fetch';
import {Base64} from 'js-base64';

/** Mesage Router */
class MessageRouter {
    /** Constructor
   * @param {Object} config
   */
    constructor(config) {
        this._config = config || {};
        this._url = config.url || 'https://msgrt.gamedistribution.com/collect';
    }
    /** Send subtopic to message router via HTTP endpoint
   * @param {String} subtopic
   * @param {Array} args
   */
    send(subtopic, args) {
        let base = [this._config.gameId, this._config.parentDomain, this._config.hours];
        if (args && args.length > 0) args.forEach(e => base.push(e));

        base = encodeURIComponent(Base64.encode(JSON.stringify(base)));
        fetch(this._url + `?tp=com.gdsdk.${subtopic}&ar=${base}&ts=${Date.now()}`);
    }
}

export default MessageRouter;
