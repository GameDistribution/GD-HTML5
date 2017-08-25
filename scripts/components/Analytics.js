'use strict';

import {extendDefaults, fetchData, getCookie, setCookie, sessionId, getParentUrl} from '../modules/common';
import {dankLog} from '../modules/dankLog';

let instance = null;

class Analytics {

    constructor(options) {

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        const defaults = {
            version: 'v501',
            sVersion: 'v1',
            gameId: '',
            userId: '',
            pingTimeOut: 30000
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        this.logName = 'ANALYTICS';
        this.callbackParam = '';
        this.post = {};
        this.pool = [];
        this.logchannel = {
            act: '', // "{"action":"ping","value":"ping"}"
            cbp: '', // ""
            gid: this.options.gameId,
            ref: getParentUrl(),
            sid: sessionId(),
            ver: this.options.version
        };

        const gameServer = this.options.userId.toLowerCase().split('-');
        this.serverId = gameServer.splice(5, 1)[0];
        this.regId = gameServer.join('-');
        this.serverName = (('https:' === document.location.protocol) ? 'https://' : 'http://') + this.regId + '.' + this.serverId + '.submityourgame.com/' + this.options.sVersion + '/';

        dankLog(this.logName, {
            gameId: this.options.gameId,
            userId: this.options.userId,
            server: this.serverName,
            parent: this.logchannel.ref,
            session: this.logchannel.sid
        }, 'success');

        // Call out our first visit of this session.
        this._visit();

        setInterval(this._timerHandler.bind(this), this.options.pingTimeOut);
        //setInterval(this._timerHandler.bind(this), 5000);
    }

    /**
     * _timerHandler - An interval which will ping our pool data to the analytics server.
     * @private
     */
    _timerHandler() {
        let action = {
            action: 'ping',
            value: 'ping'
        };

        if (this.pool.length > 0) {
            action = this.pool.shift();
        }

        this.logchannel.cbp = this.callbackParam;

        try {
            this.logchannel.act = JSON.stringify(action);
            fetchData(this.serverName, this.logchannel, this._onCompleted.bind(this));
            dankLog(this.logName, this.logchannel.act, 'success');
        } catch (e) {
            dankLog(this.logName, e, 'error');
        }
    }

    /**
     * _onCompleted - When data is fetched from submitgame, called from _timerHandler.
     * @param data: Object
     * @private
     */
    _onCompleted(data) {
        if (data && typeof data !== 'undefined') {
            try {
                const vars = JSON.parse(data);
                switch (vars.act) {
                    case 'cmd':
                        //const sendObj = {};
                        switch (vars.res) {
                            case 'visit':
                                this._visit();
                                break;
                            // Was already disabled in OLD HTML API. Leaving it here, just in case.
                            // case 'url':
                            //     sendObj.action = 'cbp';
                            //     sendObj.value = OpenURL(_data.dat.url,_data.dat.target,_data.dat.reopen);
                            //     this._pushLog(sendObj);
                            //     break;
                            // case 'js':
                            //     sendObj.action = 'cbp';
                            //     const _CallJS:Object = CallJS(_data.dat.jsdata);
                            //     sendObj.value = _CallJS.response;
                            //     sendObj.result = _CallJS.cresult;
                            //     this._pushLog(sendObj);
                            //     break;
                        }
                        break;
                    case 'visit':
                        if (vars.res === this.post.sid) {
                            let state = parseInt(getCookie('state'));
                            state++;
                            setCookie('visit', 0);
                            setCookie('state', state);
                        }
                        break;
                    case 'play':
                        if (vars.res === this.post.sid) {
                            setCookie('play', 0);
                        }
                        break;
                    case 'custom':
                        if (vars.res === this.post.sid) {
                            setCookie(vars.custom, 0);
                        }
                        break;
                }
                this.callbackParam = vars.cbp;
            } catch (e) {
                dankLog(this.logName, e, 'error');
                this._visit();
            }
        }
    }

    /**
     * _pushLog - Here we simply push any actions into the pool.
     * @param pushAction: Object
     * @private
     */
    _pushLog(pushAction) {
        for (var i = 0; i < this.pool.length; i++) {
            if (this.pool[i].action === pushAction.action) {
                if (this.pool[i].action === 'custom' && this.pool[i].value[0].key === pushAction.value[0].key) {
                    this.pool[i].value[0].value++;
                } else {
                    this.pool[i].value = pushAction.value;
                }
                break;
            }
        }
        if (i === this.pool.length) this.pool.push(pushAction);
    }

    /**
     * _visit
     * @private
     */
    _visit() {
        try {
            this._pushLog({
                action: 'visit',
                value: parseInt(getCookie('visit_' + this.options.gameId + '=')),
                state: parseInt(getCookie('state_' + this.options.gameId + '='))
            });
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * play
     * @public
     */
    play() {
        try {
            let play = getCookie('play');
            play++;
            setCookie('play', play);

            this._pushLog({
                action: 'play',
                value: parseInt(play)
            });
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * customLog
     * @public
     */
    customLog(key) {
        try {
            if (key !== 'play' || key !== 'visit') {
                let customValue = getCookie(key);
                if (customValue === 0) {
                    customValue = 1;
                    setCookie(key, customValue);
                }
                this._pushLog({
                    action: 'custom',
                    value: new Array({key: key, value: customValue})
                });
            }
        } catch (error) {
            console.log(error);
        }
    }
}

export default Analytics;