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
        this._topic_counter = {};
    }
    /** Send subtopic to message router via HTTP endpoint
   * @param {String} subtopic
   * @param {Array} args
   */
    send(subtopic, args) {
        let counter = this._topic_counter[subtopic] || 0;
        this._topic_counter[subtopic] = ++counter;
        let base = {
            gmid: this._config.gameId,
            domn: this._config.domain,
            rfrr: this._config.referrer,
            lthr: this._config.hours,
            ctry: this._config.country,
            tpct: counter,
            args: args,
        };

        base = encodeURIComponent(Base64.encode(JSON.stringify([base])));
        fetch(this._url + `?tp=com.gdsdk.${subtopic}&ar=${base}&ts=${Date.now()}`);
    }
    /** Set game data when loaded
   * @param {Object} gameData
   */    
    setGameData(gameData) {
        this._gameData=gameData;
        this._config.ctry=gameData.ctry;
    }
}

export default MessageRouter;
