'use strict';

import 'whatwg-fetch';

/** Mesage Router */
class MessageRouter {
    /** Constructor
   * @param {Object} config
   */
    constructor(config) {
        config = config || {};
        this._url = config.url || 'https://msgrt.gamedistribution.com/game';
    }
    /** Send subtopic to message router via HTTP endpoint
   * @param {String} subtopic
   * @param {Array} args
   */
    send(subtopic, args) {
        fetch(this._url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: 'com.gdsdk.' + subtopic,
                args: args || [],
            }),
        });
    }
}

export default MessageRouter;
