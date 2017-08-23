'use strict';

import {extendDefaults} from '../modules/extendDefaults';
import {fetchData, log, getCookie, setCookie, sessionId, getParentUrl} from '../modules/common';

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
            enable: false,
            pingTimeOut: 30000,
            regId: "",
            serverId: "",
            gameId: "",
            sVersion: "v1",
            initWarning: "First, you have to call 'Log' method to connect to the server.",
            enableDebug: false,
            getServerName: function() {
                // ...
            }
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        // static stuff todo: wtf is this?
        this.static = {
            enable: false, // true
            gameId: '', // "4f3d7d38d24b740c95da2b03dc3a2333"
            pingTimeOut: 0, // 0
            regId: '', // "31d29405-8d37-4270-bf7c-8d99ccf0177f"
            serverId: '' //  "s1"
        };

        this.initialTimeout = 0;
        this.callbackParam = ''; // Todo: not used?
        this.post = {};

        // log channel todo: wtf is this?
        this.logchannel = {
            act: '', // "{"action":"ping","value":"ping"}"
            cbp: '', // ""
            gid: '', //  "4f3d7d38d24b740c95da2b03dc3a2333"
            ref: '', // ""
            sid: '', // "DIIvN7MNqhOlZ9h55EWKSsDR4m5NMTqp"
            ver: '' // "v501"
        };

        // log request
        this.pool = [];
    }

    /**
     * LOGGER
     */
    start(gameId, regId) {

        if (this.static.enable) {
            log('API is already initialised.');
        } else {
            const gameServer = regId.toLowerCase().split('-');
            this.static.serverId = gameServer.splice(5, 1)[0];
            this.static.regId = gameServer.join('-');
            this.static.gameId = gameId;

            this.logchannel.gid = gameId;
            this.logchannel.ref = getParentUrl();
            this.logchannel.sid = sessionId();
            this.logchannel.ver = this.options.version;

            this.static.enable = true;

            this.visit();

            this.init();
            log('Game Distribution HTML5 API Init');
        }
    }

    visit() {
        if (this.static.enable) {
            const sendObj = {};
            sendObj.action = 'visit';
            sendObj.value = parseInt(getCookie('visit'));
            sendObj.state = parseInt(getCookie('state'));
            this.pushLog(sendObj);
        }
    }

    play() {
        if (this.static.enable) {
            const sendObj = {};
            sendObj.action = 'play';
            sendObj.value = this.incPlay();
            this.pushLog(sendObj);
        }
    }

    customlog(_key) {
        if (this.static.enable) {
            if (_key !== 'play' || _key !== 'visit') {
                let customValue = getCookie(_key);
                if (customValue === 0) {
                    customValue = 1;
                    setCookie(_key, customValue);
                }

                const sendObj = {};
                sendObj.action = 'custom';
                sendObj.value = new Array({key: _key, value: customValue});
                this.pushLog(sendObj);
            }
        }
    }

    incPlay() {
        let play = getCookie('play');
        play++;
        setCookie('play', play);
        return parseInt(play);
    }

    ping() {
        if (this.static.enable) {
            const sendObj = {};
            sendObj.action = 'ping';
            sendObj.value = 'ping';
            return sendObj;
        }
    }

    /**
     * LOGCHANNEL
     */
    init() {
        if (this.static.enable) {
            this.initialTimeout = setInterval(this.timerHandler.bind(this), this.static.pingTimeOut);
        }
    }

    timerHandler(e) {
        if (this.static.enable) {
            log('timerHandler: ' + this.initialTimeout);

            let actionArray = this.ping();
            if (this.pool.length > 0) {
                actionArray = this.pool.shift();
            }

            this.logchannel.cbp = this.callbackParam; // Todo: seems to not being used.
            try {
                this.logchannel.act = JSON.stringify(actionArray);
                fetchData('', this.logchannel, this.onCompleted);
                log('Send action: ' + this.logchannel.act);
            } catch (e) {
                log('Send error: ' + e);
            }
        }
    }

    onCompleted(data) {
        if (data !== null && data !== '') {
            try {
                const vars = JSON.parse(data);
                this.doResponse(vars);
                this.callbackParam = vars.cbp;
            }
            catch (e) {
                log('onCompleted Error: ' + e);
                this.visit();
            }
        }
    }

    /**
     * LOGREQUEST
     */
    pushLog(_pushAction) {
        let i = 0;
        for (i < this.pool.length; i++;) {
            if (this.pool[i].action === _pushAction.action) {
                if (this.pool[i].action === 'custom' && this.pool[i].value[0].key === _pushAction.value[0].key) {
                    this.pool[i].value[0].value++;
                } else {
                    this.pool[i].value = _pushAction.value;
                }
                break;
            }
        }
        if (i === this.pool.length) {
            this.pool.push(_pushAction);
        }
    }

    doResponse(_data) {
        switch (_data.act) {
            case 'cmd':
                //const sendObj = {};
                switch (_data.res) {
                    case 'visit':
                        this.visit();
                        break;

                    // Was already disabled in OLD HTML API. Leaving it here, just in case.
                    // case 'url':
                    //     sendObj.action = 'cbp';
                    //     sendObj.value = OpenURL(_data.dat.url,_data.dat.target,_data.dat.reopen);
                    //     this.pushLog(sendObj);
                    //     break;
                    // case 'js':
                    //     sendObj.action = 'cbp';
                    //     const _CallJS:Object = CallJS(_data.dat.jsdata);
                    //     sendObj.value = _CallJS.response;
                    //     sendObj.result = _CallJS.cresult;
                    //     this.pushLog(sendObj);
                    //     break;

                }
                break;
            case 'visit':
                if (_data.res === this.post.sid) {
                    let state = parseInt(getCookie('state'));
                    state++;
                    setCookie('visit', 0);
                    setCookie('state', state);
                }
                break;
            case 'play':
                if (_data.res === this.post.sid) {
                    setCookie('play', 0);
                }
                break;
            case 'custom':
                if (_data.res === this.post.sid) {
                    setCookie(_data.custom, 0);
                }
                break;
        }
    }
}

export default Analytics;