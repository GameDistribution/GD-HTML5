'use strict';

import 'whatwg-fetch';
import {Base64} from 'js-base64';

/** Mesage Router */
class MessageRouter {
    /** Constructor
   * @param {Object} config
   */
    constructor(config) {
        config = config || {};
        this._url = config.url || 'https://msgrt.gamedistribution.com/collect';
    }
    /** Send subtopic to message router via HTTP endpoint
   * @param {String} subtopic
   * @param {Array} args
   */
    send(subtopic, args) {
        args = args || [];
        args = encodeURIComponent(Base64.encode(JSON.stringify(args)));
        let timestamp = Date.now();
        fetch(this._url + `?tp=com.gdsdk.${subtopic}&ar=${args}&ts=${timestamp}`);
    }
}

export default MessageRouter;
