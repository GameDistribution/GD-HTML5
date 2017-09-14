'use strict';

import {extendDefaults, fetchData, getCookie, setCookie} from '../modules/common';
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
            version: '',
            sVersion: '',
            gameId: '',
            userId: '',
            referrer: '',
            sessionId: '',
            serverId: '',
            regId: '',
            serverName: '',
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
            gid: this.options.gameId,
            ref: this.options.referrer,
            sid: this.options.sessionId,
            ver: this.options.version
        };

        dankLog(this.logName, {
            gameId: this.options.gameId,
            userId: this.options.userId,
            server: this.options.serverName,
            parent: this.logchannel.ref,
            session: this.logchannel.sid
        }, 'success');

        // Call out our first visit of this session.
        this._visit();

        //setInterval(this._timerHandler.bind(this), this.options.pingTimeOut);
        setInterval(this._timerHandler.bind(this), 5000);
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

        try {
            this.logchannel.act = JSON.stringify(action);
            fetchData(this.options.serverName, this.logchannel, this._onCompleted.bind(this));
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
                            //     sendObj.value = OpenURL(_data.dat.url,_data.dat.target,_data.dat.reopen);
                            //     this._pushLog(sendObj);
                            //     break;
                            // case 'js':
                            //     const _CallJS:Object = CallJS(_data.dat.jsdata);
                            //     sendObj.value = _CallJS.response;
                            //     sendObj.result = _CallJS.cresult;
                            //     this._pushLog(sendObj);
                            //     break;
                        }
                        break;
                    case 'visit':
                        if (vars.res === this.post.sid) {
                            let state = parseInt(getCookie('state_' + this.options.gameId));
                            state++;
                            setCookie('visit_' + this.options.gameId, 0);
                            setCookie('state_' + this.options.gameId, state);
                        }
                        break;
                    case 'play':
                        if (vars.res === this.post.sid) {
                            setCookie('play_' + this.options.gameId, 0);
                        }
                        break;
                    case 'custom':
                        if (vars.res === this.post.sid) {
                            // Todo: vars.custom is not available from server.
                            setCookie(vars.custom + '_' + this.options.gameId, 0);
                        }
                        break;
                }
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
                value: parseInt(getCookie('visit_' + this.options.gameId)),
                state: parseInt(getCookie('state_' + this.options.gameId))
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
            let play = getCookie('play_' + this.options.gameId);
            play++;
            setCookie('play_' + this.options.gameId, play);
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
                let customValue = getCookie(key + '_' + this.options.gameId);
                if (customValue === 0) {
                    customValue = 1;
                    setCookie(key + '_' + this.options.gameId, customValue);
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