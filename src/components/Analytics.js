'use strict';

import {
    extendDefaults,
    fetchData,
    getCookie,
    setCookie,
} from '../modules/common';
import {dankLog} from '../modules/dankLog';

let instance = null;

/**
 * Analytics
 */
class Analytics {
    /**
     * Analytics constructor.
     * @param {Object }options
     * @return {*}
     */
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
            pingTimeOut: 30000,
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        this.logName = 'ANALYTICS';
        this.pool = [];
        this.logchannel = {
            act: '', // "{"action":"ping","value":"ping"}"
            gid: this.options.gameId,
            ref: this.options.referrer,
            sid: this.options.sessionId,
            ver: this.options.version,
        };

        dankLog(this.logName, {
            gameId: this.options.gameId,
            userId: this.options.userId,
            server: this.options.serverName,
            parent: this.logchannel.ref,
            session: this.logchannel.sid,
        }, 'success');

        // Call out our first visit of this session.
        this._visit();

        setInterval(this._timerHandler.bind(this), this.options.pingTimeOut);
        // setInterval(this._timerHandler.bind(this), 5000);
    }

    /**
     * _timerHandler
     * An interval which will ping our pool data to the analytics server.
     * @private
     */
    _timerHandler() {
        let action = {
            action: 'ping',
            value: 'ping',
        };

        if (this.pool.length > 0) {
            action = this.pool.shift();
        }

        try {
            this.logchannel.act = JSON.stringify(action);
            fetchData(this.options.serverName, this.logchannel,
                this._onCompleted.bind(this));
            dankLog(this.logName, this.logchannel.act, 'success');
        } catch (e) {
            dankLog(this.logName, e, 'error');
        }
    }

    /**
     * _onCompleted
     * When data is fetched from submitgame, called from _timerHandler.
     * @param {Object} data
     * @private
     */
    _onCompleted(data) {
        if (data && typeof data !== 'undefined') {
            try {
                const vars = JSON.parse(data);
                switch (vars.act) {
                case 'cmd':
                    if (vars.res === 'visit') {
                        this._visit();
                    }
                    break;
                case 'visit':
                    if (vars.res === this.logchannel.sid) {
                        let stateValue = parseInt(
                            getCookie('state_' + this.options.gameId));
                        stateValue = (stateValue) ? stateValue : 0;
                        stateValue++;
                        setCookie('visit_' + this.options.gameId, 0, 30);
                        setCookie('state_' + this.options.gameId,
                            stateValue, 30);
                    }
                    break;
                case 'play':
                    if (vars.res === this.logchannel.sid) {
                        setCookie('play_' + this.options.gameId, 0, 30);
                    }
                    break;
                case 'custom':
                    if (vars.res === this.logchannel.sid) {
                        if (typeof vars.custom !== 'undefined') {
                            setCookie(vars.custom + '_' +
                                this.options.gameId, 0, 30);
                        }
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
     * _pushLog
     * Here we simply push any actions into the pool.
     * @param {Object} pushAction
     * @private
     */
    _pushLog(pushAction) {
        let increment = 0;
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].action === pushAction.action) {
                if (this.pool[i].action === 'custom' &&
                    this.pool[i].value[0].key === pushAction.value[0].key) {
                    this.pool[i].value[0].value++;
                } else {
                    this.pool[i].value = pushAction.value;
                }
                break;
            }
            increment++;
        }
        if (increment === this.pool.length) this.pool.push(pushAction);
    }

    /**
     * _visit
     * @private
     */
    _visit() {
        try {
            let visitValue = parseInt(
                getCookie('visit_' + this.options.gameId));
            visitValue = (visitValue) ? visitValue : 0;
            let stateValue = parseInt(
                getCookie('state_' + this.options.gameId));
            stateValue = (stateValue) ? stateValue : 0;
            this._pushLog({
                action: 'visit',
                value: visitValue,
                state: stateValue,
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
            let playValue = parseInt(getCookie('play_' + this.options.gameId));
            playValue = (playValue) ? playValue : 0;
            playValue++;
            setCookie('play_' + this.options.gameId, playValue, 30);
            this._pushLog({
                action: 'play',
                value: playValue,
            });
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * customLog
     * @param {String} key
     * @public
     */
    customLog(key) {
        try {
            if (key !== 'play' || key !== 'visit') {
                let customValue = getCookie(key + '_' + this.options.gameId);
                customValue = (customValue) ? customValue : 1;
                setCookie(key + '_' + this.options.gameId, customValue, 30,
                    this.options.gameId);
                this._pushLog({
                    action: 'custom',
                    value: new Array({key: key, value: customValue}),
                });
            }
        } catch (error) {
            console.log(error);
        }
    }
}

export default Analytics;
