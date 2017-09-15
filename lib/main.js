(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
    "name": "@gamedistribution.com/html5-sdk",
    "version": "0.0.3",
    "author": "Gamedistribution.com",
    "description": "Gamedistribution.com HTML5 SDK",
    "url": "https://gamedistribution.com",
    "license": "MIT",
    "main": "lib/main.js",
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "directories": {
        "doc": "https://github.com/GameDistribution/GD-HTML5/wiki"
    },
    "repository": {
        "type": "git",
        "url": "git@github.com:GameDistribution/GD-HTML5.git"
    },
    "devDependencies": {
        "babel-preset-es2015": "^6.6.0",
        "babelify": "^7.2.0",
        "grunt": "^1.0.1",
        "grunt-banner": "^0.6.0",
        "grunt-browser-sync": "^2.2.0",
        "grunt-browserify": "^5.2.0",
        "grunt-contrib-copy": "^1.0.0",
        "grunt-contrib-uglify": "^3.0.1",
        "grunt-contrib-watch": "^1.0.0",
        "grunt-contrib-clean": "^1.1.0"
    },
    "engines": {
        "node": ">=6.0.0"
    }
}

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _common = require('../modules/common');

var _dankLog = require('../modules/dankLog');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var instance = null;

var Analytics = function () {
    function Analytics(options) {
        _classCallCheck(this, Analytics);

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        var defaults = {
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
            this.options = (0, _common.extendDefaults)(defaults, options);
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
            ver: this.options.version
        };

        (0, _dankLog.dankLog)(this.logName, {
            gameId: this.options.gameId,
            userId: this.options.userId,
            server: this.options.serverName,
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


    _createClass(Analytics, [{
        key: '_timerHandler',
        value: function _timerHandler() {
            var action = {
                action: 'ping',
                value: 'ping'
            };

            if (this.pool.length > 0) {
                action = this.pool.shift();
            }

            try {
                this.logchannel.act = JSON.stringify(action);
                (0, _common.fetchData)(this.options.serverName, this.logchannel, this._onCompleted.bind(this));
                (0, _dankLog.dankLog)(this.logName, this.logchannel.act, 'success');
            } catch (e) {
                (0, _dankLog.dankLog)(this.logName, e, 'error');
            }
        }

        /**
         * _onCompleted - When data is fetched from submitgame, called from _timerHandler.
         * @param data: Object
         * @private
         */

    }, {
        key: '_onCompleted',
        value: function _onCompleted(data) {
            if (data && typeof data !== 'undefined') {
                try {
                    var vars = JSON.parse(data);
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
                            if (vars.res === this.logchannel.sid) {
                                var stateValue = parseInt((0, _common.getCookie)('state_' + this.options.gameId));
                                stateValue = stateValue ? stateValue : 0;
                                stateValue++;
                                (0, _common.setCookie)('visit_' + this.options.gameId, 0, 30);
                                (0, _common.setCookie)('state_' + this.options.gameId, stateValue, 30);
                            }
                            break;
                        case 'play':
                            if (vars.res === this.logchannel.sid) {
                                (0, _common.setCookie)('play_' + this.options.gameId, 0, 30);
                            }
                            break;
                        case 'custom':
                            if (vars.res === this.logchannel.sid) {
                                if (typeof vars.custom !== 'undefined') {
                                    (0, _common.setCookie)(vars.custom + '_' + this.options.gameId, 0, 30);
                                }
                            }
                            break;
                    }
                } catch (e) {
                    (0, _dankLog.dankLog)(this.logName, e, 'error');
                    this._visit();
                }
            }
        }

        /**
         * _pushLog - Here we simply push any actions into the pool.
         * @param pushAction: Object
         * @private
         */

    }, {
        key: '_pushLog',
        value: function _pushLog(pushAction) {
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

    }, {
        key: '_visit',
        value: function _visit() {
            try {
                var visitValue = parseInt((0, _common.getCookie)('visit_' + this.options.gameId));
                visitValue = visitValue ? visitValue : 0;
                var stateValue = parseInt((0, _common.getCookie)('state_' + this.options.gameId));
                stateValue = stateValue ? stateValue : 0;
                this._pushLog({
                    action: 'visit',
                    value: visitValue,
                    state: stateValue
                });
            } catch (error) {
                console.log(error);
            }
        }

        /**
         * play
         * @public
         */

    }, {
        key: 'play',
        value: function play() {
            try {
                var playValue = parseInt((0, _common.getCookie)('play_' + this.options.gameId));
                playValue = playValue ? playValue : 0;
                playValue++;
                (0, _common.setCookie)('play_' + this.options.gameId, playValue, 30);
                this._pushLog({
                    action: 'play',
                    value: playValue
                });
            } catch (error) {
                console.log(error);
            }
        }

        /**
         * customLog
         * @public
         */

    }, {
        key: 'customLog',
        value: function customLog(key) {
            try {
                if (key !== 'play' || key !== 'visit') {
                    var customValue = (0, _common.getCookie)(key + '_' + this.options.gameId);
                    customValue = customValue ? customValue : 1;
                    (0, _common.setCookie)(key + '_' + this.options.gameId, customValue, 30, this.options.gameId);
                    this._pushLog({
                        action: 'custom',
                        value: new Array({ key: key, value: customValue })
                    });
                }
            } catch (error) {
                console.log(error);
            }
        }
    }]);

    return Analytics;
}();

exports.default = Analytics;

},{"../modules/common":7,"../modules/dankLog":8}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var instance = null;

var EventBus = function () {
    function EventBus() {
        _classCallCheck(this, EventBus);

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        this.listeners = {};
    }

    _createClass(EventBus, [{
        key: '_getListenerIdx',
        value: function _getListenerIdx(eventName, callback, scope) {
            var eventListeners = this.listeners[eventName],
                i = void 0,
                idx = -1;

            if (!eventListeners || eventListeners.length === 0) {
                return idx;
            }

            for (i = 0; i < eventListeners.length; i++) {
                if (eventListeners[i].callback === callback && (!scope || scope === eventListeners[i].scope)) {
                    idx = i;
                    break;
                }
            }

            return idx;
        }
    }, {
        key: 'subscribe',
        value: function subscribe(eventName, callback, scope) {
            var listener = void 0,
                idx = void 0;

            if (!eventName) {
                throw new Error('Event name cannot be null or undefined.');
            }

            if (!callback || typeof callback !== 'function') {
                throw new Error('Listener must be of type function.');
            }

            idx = this._getListenerIdx(eventName, callback, scope);

            if (idx >= 0) return;

            listener = {
                callback: callback,
                scope: scope
            };

            this.listeners[eventName] = this.listeners[eventName] || [];
            this.listeners[eventName].push(listener);
        }

        // unsubscribe(eventName, callback, scope) {
        //     let idx;
        //
        //     if (!eventName || !callback || !this.listeners[eventName]) {
        //         return;
        //     }
        //
        //     idx = this._getListenerIdx(eventName, callback, scope);
        //
        //     if (idx === -1) return;
        //
        //     this.listeners[eventName].splice(idx, 1);
        // }

    }, {
        key: 'broadcast',
        value: function broadcast(eventName, args) {
            var eventListeners = this.listeners[eventName],
                i = void 0;

            if (!eventName || !this.listeners[eventName]) {
                return;
            }

            args = args || {};

            eventListeners.forEach(function (listener) {
                listener.callback.call(listener.scope, args);
            });
        }

        // reset() {
        //     this.listeners = {};
        // }

    }]);

    return EventBus;
}();

exports.default = EventBus;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _EventBus = require('../components/EventBus');

var _EventBus2 = _interopRequireDefault(_EventBus);

var _dankLog = require('../modules/dankLog');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var instance = null;

var ImplementationTest = function () {
    function ImplementationTest() {
        _classCallCheck(this, ImplementationTest);

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        this.eventBus = new _EventBus2.default();
    }

    _createClass(ImplementationTest, [{
        key: 'start',
        value: function start() {
            var css = '\n            #gdApi-implementation {\n                box-sizing: border-box;\n                position: fixed;\n                z-index: 100;\n                bottom: 0;\n                width: 100%;\n                padding: 10px 20px 20px;\n                background: linear-gradient(90deg,#3d1b5d,#5c3997);\n                box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);\n                color: #fff;\n                font-family: Helvetica, Arial, sans-serif;\n                font-size: 16px;\n            }\n            #gdApi-implementation > div {\n                width: 100%;\n            }\n            #gdApi-implementation > div > div {\n                float: left;\n                margin-right: 20px;\n            }\n            #gdApi-implementation > div > div:last-of-type {\n                float: right;\n                margin-right: 0;\n                text-align: right;\n            }\n            #gdApi-implementation h2 {\n                font-size: 10px;\n                color: #ffd1b1;\n                text-shadow: 0 0.07em 0 rgba(0,0,0,.5);\n                text-transform: uppercase;\n                margin-bottom: 5px;\n            }\n            #gdApi-implementation button {\n                background: #44a5ab;\n                margin-left: 2.5px;\n                padding: 10px 20px;\n                border: 0;\n                border-radius: 3px;\n                color: #fff;\n                outline: 0;\n                cursor: pointer;\n            }\n            #gdApi-implementation button:hover {\n                background: #4fb3b9;\n            }\n            #gdApi-implementation button:active {\n                background: #62bbc0;\n            }\n            #gdApi-implementation button:first-of-type {\n                margin-left: 0;\n            }\n            #gdApi-implementation button span {\n                font-size: 10px;\n                padding: 3px 6px;\n                color: rgba(255, 255, 255, 0.4);\n                background-color: rgba(0, 0, 0, 0.2);\n                border-radius: 3px;\n                margin-left: 10px;\n            }\n        ';

            var html = '\n            <div id="gdApi-implementation">\n                <div>\n                    <div>\n                        <h2>Advertisement</h2>\n                        <button id="gdApi-showBanner">showBanner</button>\n                        <button id="gdApi-cancel">Cancel</button>\n                    </div>\n                     <div>\n                        <h2>Game</h2>\n                        <button id="gdApi-pauseGame">pauseGame</button>\n                        <button id="gdApi-resumeGame">resumeGame</button>\n                    </div>\n                    <div>\n                        <h2>Analytics</h2>\n                        <button id="gdApi-playCounter">event: play</button>\n                        <button id="gdApi-logCounter">event: custom <span>key: test</span></button>\n                    </div>\n                </div>\n            </div>\n        ';

            // Add css
            var head = document.head || document.getElementsByTagName('head')[0];
            var style = document.createElement('style');
            style.type = 'text/css';
            if (style.styleSheet) {
                style.styleSheet.cssText = css;
            } else {
                style.appendChild(document.createTextNode(css));
            }
            head.appendChild(style);

            // Add html
            var body = document.body || document.getElementsByTagName('body')[0];
            var container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.zIndex = 100;
            container.style.bottom = 0;
            container.innerHTML = html;
            body.parentNode.insertBefore(container, body);

            // Ad listeners
            var pauseGame = document.getElementById('gdApi-pauseGame');
            var resumeGame = document.getElementById('gdApi-resumeGame');
            var showBanner = document.getElementById('gdApi-showBanner');
            var cancelAd = document.getElementById('gdApi-cancel');
            var playCounter = document.getElementById('gdApi-playCounter');
            var logCounter = document.getElementById('gdApi-logCounter');

            pauseGame.addEventListener('click', function () {
                window.gdApi.onPauseGame();
            });
            resumeGame.addEventListener('click', function () {
                window.gdApi.onResumeGame();
            });
            showBanner.addEventListener('click', function () {
                window.gdApi.showBanner();
            });
            cancelAd.addEventListener('click', function () {
                window.gdApi.videoAdInstance.cancel();
            });
            playCounter.addEventListener('click', function () {
                window.gdApi.play();
            });
            logCounter.addEventListener('click', function () {
                window.gdApi.customLog('test');
            });
        }
    }]);

    return ImplementationTest;
}();

exports.default = ImplementationTest;

},{"../components/EventBus":3,"../modules/dankLog":8}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _EventBus = require('../components/EventBus');

var _EventBus2 = _interopRequireDefault(_EventBus);

var _common = require('../modules/common');

var _dankLog = require('../modules/dankLog');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var instance = null;

var VideoAd = function () {
    function VideoAd(options) {
        var _this = this;

        _classCallCheck(this, VideoAd);

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        var defaults = {
            debug: false,
            prefix: 'gdApi-',
            autoplay: true,
            responsive: true,
            width: 640,
            height: 360,
            locale: 'en'
        };

        if (options) {
            this.options = (0, _common.extendDefaults)(defaults, options);
        } else {
            this.options = defaults;
        }

        this.adsLoader = null;
        this.adsManager = null;
        this.adDisplayContainer = null;
        this.eventBus = new _EventBus2.default();
        this.safetyTimer = null;
        this.requestAttempts = 0;
        this.containerTransitionSpeed = 200;
        this.preroll = true;
        this.tag = 'https://pubads.g.doubleclick.net/gampad/ads?' + 'sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&' + 'impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&' + 'cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=';

        // Analytics variables
        this.gameId = 0;
        this.eventCategory = 'AD';

        this.adsLoaderPromise = new Promise(function (resolve) {
            _this.eventBus.subscribe('AD_SDK_LOADER_READY', function (arg) {
                return resolve();
            });
        });
        this.adsManagerPromise = new Promise(function (resolve) {
            _this.eventBus.subscribe('AD_SDK_MANAGER_READY', function (arg) {
                return resolve();
            });
        });
    }

    /**
     * start - Start the VideoAd instance by first checking if we have auto play capabilities.
     * By calling start() we start the creation of the adsLoader, needed to request ads.
     * This is also the time where we can change other options based on context as well.
     * @public
     */


    _createClass(VideoAd, [{
        key: 'start',
        value: function start() {
            var _this2 = this;

            // Start ticking our safety timer. If the whole advertisement thing doesn't resolve without our set time, then screw this.
            this._startSafetyTimer();

            // Enable a responsive advertisement.
            // Assuming we only want responsive advertisements below 1024 pixel client width.
            this.options.responsive = this.options.responsive && document.documentElement.clientWidth <= 1024;
            if (this.options.responsive) {
                this.options.width = document.documentElement.clientWidth;
                this.options.height = document.documentElement.clientHeight;
            }

            // We now want to know if we're going to run the advertisement with autoplay enabled.

            // Detect if we support HTML5 video auto play, which is needed to auto start our ad.
            // Video can only auto play on non touch devices.
            // It is near impossible to detect autoplay using ontouchstart or touchpoints these days.
            // So now we just load a fake audio file, see if it runs, if it does; then auto play is supported.
            var isAutoPlayPromise = new Promise(function (resolve, reject) {
                if (_this2.options.autoplay) {
                    _this2.options.autoplay = false;
                    var mp3 = 'data:audio/mpeg;base64,/+MYxAAAAANIAUAAAASEEB/jwOFM/0MM/90b/+RhST//w4NFwOjf///PZu////9lns5GFDv//l9GlUIEEIAAAgIg8Ir/JGq3/+MYxDsLIj5QMYcoAP0dv9HIjUcH//yYSg+CIbkGP//8w0bLVjUP///3Z0x5QCAv/yLjwtGKTEFNRTMuOTeqqqqqqqqqqqqq/+MYxEkNmdJkUYc4AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
                    var ogg = 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAAOyyzPIBHgF2b3JiaXMAAAAAAUAfAABAHwAAQB8AAEAfAACZAU9nZ1MAAAAAAAAAAAAA6p4zJQEAAAANJGeqCj3//////////5ADdm9yYmlzLQAAAFhpcGguT3JnIGxpYlZvcmJpcyBJIDIwMTAxMTAxIChTY2hhdWZlbnVnZ2V0KQAAAAABBXZvcmJpcw9CQ1YBAAABAAxSFCElGVNKYwiVUlIpBR1jUFtHHWPUOUYhZBBTiEkZpXtPKpVYSsgRUlgpRR1TTFNJlVKWKUUdYxRTSCFT1jFloXMUS4ZJCSVsTa50FkvomWOWMUYdY85aSp1j1jFFHWNSUkmhcxg6ZiVkFDpGxehifDA6laJCKL7H3lLpLYWKW4q91xpT6y2EGEtpwQhhc+211dxKasUYY4wxxsXiUyiC0JBVAAABAABABAFCQ1YBAAoAAMJQDEVRgNCQVQBABgCAABRFcRTHcRxHkiTLAkJDVgEAQAAAAgAAKI7hKJIjSZJkWZZlWZameZaouaov+64u667t6roOhIasBACAAAAYRqF1TCqDEEPKQ4QUY9AzoxBDDEzGHGNONKQMMogzxZAyiFssLqgQBKEhKwKAKAAAwBjEGGIMOeekZFIi55iUTkoDnaPUUcoolRRLjBmlEluJMYLOUeooZZRCjKXFjFKJscRUAABAgAMAQICFUGjIigAgCgCAMAYphZRCjCnmFHOIMeUcgwwxxiBkzinoGJNOSuWck85JiRhjzjEHlXNOSuekctBJyaQTAAAQ4AAAEGAhFBqyIgCIEwAwSJKmWZomipamiaJniqrqiaKqWp5nmp5pqqpnmqpqqqrrmqrqypbnmaZnmqrqmaaqiqbquqaquq6nqrZsuqoum65q267s+rZru77uqapsm6or66bqyrrqyrbuurbtS56nqqKquq5nqq6ruq5uq65r25pqyq6purJtuq4tu7Js664s67pmqq5suqotm64s667s2rYqy7ovuq5uq7Ks+6os+75s67ru2rrwi65r66os674qy74x27bwy7ouHJMnqqqnqq7rmarrqq5r26rr2rqmmq5suq4tm6or26os67Yry7aumaosm64r26bryrIqy77vyrJui67r66Ys67oqy8Lu6roxzLat+6Lr6roqy7qvyrKuu7ru+7JuC7umqrpuyrKvm7Ks+7auC8us27oxuq7vq7It/KosC7+u+8Iy6z5jdF1fV21ZGFbZ9n3d95Vj1nVhWW1b+V1bZ7y+bgy7bvzKrQvLstq2scy6rSyvrxvDLux8W/iVmqratum6um7Ksq/Lui60dd1XRtf1fdW2fV+VZd+3hV9pG8OwjK6r+6os68Jry8ov67qw7MIvLKttK7+r68ow27qw3L6wLL/uC8uq277v6rrStXVluX2fsSu38QsAABhwAAAIMKEMFBqyIgCIEwBAEHIOKQahYgpCCKGkEEIqFWNSMuakZM5JKaWUFEpJrWJMSuaclMwxKaGUlkopqYRSWiqlxBRKaS2l1mJKqcVQSmulpNZKSa2llGJMrcUYMSYlc05K5pyUklJrJZXWMucoZQ5K6iCklEoqraTUYuacpA46Kx2E1EoqMZWUYgupxFZKaq2kFGMrMdXUWo4hpRhLSrGVlFptMdXWWqs1YkxK5pyUzDkqJaXWSiqtZc5J6iC01DkoqaTUYiopxco5SR2ElDLIqJSUWiupxBJSia20FGMpqcXUYq4pxRZDSS2WlFosqcTWYoy1tVRTJ6XFklKMJZUYW6y5ttZqDKXEVkqLsaSUW2sx1xZjjqGkFksrsZWUWmy15dhayzW1VGNKrdYWY40x5ZRrrT2n1mJNMdXaWqy51ZZbzLXnTkprpZQWS0oxttZijTHmHEppraQUWykpxtZara3FXEMpsZXSWiypxNhirLXFVmNqrcYWW62ltVprrb3GVlsurdXcYqw9tZRrrLXmWFNtBQAADDgAAASYUAYKDVkJAEQBAADGMMYYhEYpx5yT0ijlnHNSKucghJBS5hyEEFLKnINQSkuZcxBKSSmUklJqrYVSUmqttQIAAAocAAACbNCUWByg0JCVAEAqAIDBcTRNFFXVdX1fsSxRVFXXlW3jVyxNFFVVdm1b+DVRVFXXtW3bFn5NFFVVdmXZtoWiqrqybduybgvDqKqua9uybeuorqvbuq3bui9UXVmWbVu3dR3XtnXd9nVd+Bmzbeu2buu+8CMMR9/4IeTj+3RCCAAAT3AAACqwYXWEk6KxwEJDVgIAGQAAgDFKGYUYM0gxphhjTDHGmAAAgAEHAIAAE8pAoSErAoAoAADAOeecc84555xzzjnnnHPOOeecc44xxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY0wAwE6EA8BOhIVQaMhKACAcAABACCEpKaWUUkoRU85BSSmllFKqFIOMSkoppZRSpBR1lFJKKaWUIqWgpJJSSimllElJKaWUUkoppYw6SimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaVUSimllFJKKaWUUkoppRQAYPLgAACVYOMMK0lnhaPBhYasBAByAwAAhRiDEEJpraRUUkolVc5BKCWUlEpKKZWUUqqYgxBKKqmlklJKKbXSQSihlFBKKSWUUkooJYQQSgmhlFRCK6mEUkoHoYQSQimhhFRKKSWUzkEoIYUOQkmllNRCSB10VFIpIZVSSiklpZQ6CKGUklJLLZVSWkqpdBJSKamV1FJqqbWSUgmhpFZKSSWl0lpJJbUSSkklpZRSSymFVFJJJYSSUioltZZaSqm11lJIqZWUUkqppdRSSiWlkEpKqZSSUmollZRSaiGVlEpJKaTUSimlpFRCSamlUlpKLbWUSkmptFRSSaWUlEpJKaVSSksppRJKSqmllFpJKYWSUkoplZJSSyW1VEoKJaWUUkmptJRSSymVklIBAEAHDgAAAUZUWoidZlx5BI4oZJiAAgAAQABAgAkgMEBQMApBgDACAQAAAADAAAAfAABHARAR0ZzBAUKCwgJDg8MDAAAAAAAAAAAAAACAT2dnUwAEAAAAAAAAAADqnjMlAgAAADzQPmcBAQA=';
                    try {
                        var audio = new Audio();
                        var src = audio.canPlayType('audio/ogg') ? ogg : mp3;
                        audio.autoplay = true;
                        audio.volume = 0;
                        audio.addEventListener('playing', function () {
                            _this2.options.autoplay = true;
                        }, false);
                        audio.src = src;
                        setTimeout(function () {
                            (0, _dankLog.dankLog)('AD_SDK_AUTOPLAY', _this2.options.autoplay, 'success');
                            resolve();
                        }, 100);
                    } catch (e) {
                        (0, _dankLog.dankLog)('AD_SDK_AUTOPLAY', _this2.options.autoplay, 'warning');
                        reject(e);
                    }
                } else {
                    (0, _dankLog.dankLog)('AD_SDK_AUTOPLAY', _this2.options.autoplay, 'success');
                    resolve();
                }
            }).catch(function () {
                _this2._onError('Auto play promise did not resolve!');
            });

            // Now request the IMA SDK script.
            isAutoPlayPromise.then(function () {
                return _this2._loadIMAScript();
            }).catch(function (error) {
                return _this2._onError(error);
            });
        }

        /**
         * play - Play the loaded advertisement.
         * @public
         */

    }, {
        key: 'play',
        value: function play() {
            var _this3 = this;

            // Play the requested advertisement whenever the adsManager is ready.
            this.adsManagerPromise.then(function () {
                // The IMA HTML5 SDK uses the AdDisplayContainer to play the video ads.
                // To initialize the AdDisplayContainer, call the play() method in a user action.
                if (!_this3.adsManager || !_this3.adDisplayContainer) {
                    _this3._onError('Missing an adsManager or adDisplayContainer');
                    return;
                }
                // Always initialize the container first.
                _this3.adDisplayContainer.initialize();

                try {
                    // Initialize the ads manager. Ad rules playlist will start at this time.
                    _this3.adsManager.init(_this3.options.width, _this3.options.height, google.ima.ViewMode.NORMAL);
                    // Show the advertisement container.
                    if (_this3.adContainer) {
                        _this3.adContainer.style.display = 'block';
                        setTimeout(function () {
                            _this3.adContainer.style.opacity = 1;
                        }, 10);
                    }
                    // Call play to start showing the ad. Single video and overlay ads will
                    // start at this time; the call will be ignored for ad rules.
                    _this3.adsManager.start();
                } catch (adError) {
                    // An error may be thrown if there was a problem with the VAST response.
                    _this3._onError(adError);
                }
            });
        }

        /**
         * _cancel - Makes it possible to stop an advertisement while its loading or playing.
         * This will clear out the adsManager, stop any ad playing and allowing new ads to be called.
         * @public
         */

    }, {
        key: 'cancel',
        value: function cancel() {
            var _this4 = this;

            // Hide the advertisement.
            if (this.adContainer) {
                this.adContainer.style.opacity = 0;
                setTimeout(function () {
                    _this4.adContainer.style.display = 'none';
                }, this.containerTransitionSpeed);
            }

            // Destroy the adsManager so we can grab new ads after this.
            // If we don't then we're not allowed to call new ads based on google policies,
            // as they interpret this as an accidental video requests.
            // https://developers.google.com/interactive-media-ads/docs/sdks/android/faq#8
            Promise.all([this.adsLoaderPromise, this.adsManagerPromise]).then(function () {
                if (_this4.adsManager) {
                    _this4.adsManager.destroy();
                }
                if (_this4.adsLoader) {
                    _this4.adsLoader.contentComplete();
                }

                // Preload new ads by doing a new request.
                if (_this4.requestAttempts <= 3) {
                    if (_this4.requestAttempts > 1) {
                        (0, _dankLog.dankLog)('AD_SDK_REQUEST_ATTEMPT', _this4.requestAttempts, 'warning');
                    }
                    _this4._requestAds();
                    _this4.requestAttempts++;
                }

                // Send event to tell that the whole advertisement thing is finished.
                var eventName = 'AD_CANCELED';
                var eventMessage = 'Advertisement has been canceled.';
                _this4.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: eventMessage,
                    status: 'warning',
                    analytics: {
                        category: _this4.eventCategory,
                        action: eventName,
                        label: _this4.gameId,
                        value: eventMessage
                    }
                });
            }).catch(function (error) {
                return console.log(error);
            });
        }

        /**
         * _loadIMAScript - Loads the Google IMA script using a <script> tag.
         * @private
         */

    }, {
        key: '_loadIMAScript',
        value: function _loadIMAScript() {
            var _this5 = this;

            // Load the HTML5 IMA SDK.
            var src = this.options.debug ? '//imasdk.googleapis.com/js/sdkloader/ima3_debug.js' : '//imasdk.googleapis.com/js/sdkloader/ima3.js';
            var script = document.getElementsByTagName('script')[0];
            var ima = document.createElement('script');
            ima.type = 'text/javascript';
            ima.async = true;
            ima.src = src;
            ima.onload = function () {
                _this5._createPlayer();
            };
            ima.onerror = function () {
                // Error was most likely caused by adBlocker.
                // Todo: So if the image script fails, you also get this adblocker message, but who cares?
                var body = document.body || document.getElementsByTagName('body')[0];
                var adblockerContainer = document.createElement('div');
                adblockerContainer.id = _this5.options.prefix + 'adBlocker';
                adblockerContainer.style.position = 'fixed';
                adblockerContainer.style.zIndex = 99;
                adblockerContainer.style.top = 0;
                adblockerContainer.style.left = 0;
                adblockerContainer.style.width = '100%';
                adblockerContainer.style.height = '100%';
                adblockerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

                var adblockerImage = document.createElement('img');
                adblockerImage.src = '/gd-adblocker.jpg';
                adblockerImage.srcset = '/gd-adblocker.jpg, /gd-adblocker@2x.jpg';
                adblockerImage.style.display = 'block';
                adblockerImage.style.position = 'absolute';
                adblockerImage.style.left = '50%';
                adblockerImage.style.top = '50%';
                adblockerImage.style.width = '100%';
                adblockerImage.style.height = 'auto';
                adblockerImage.style.maxWidth = '461px';
                adblockerImage.style.maxHeight = '376px';
                adblockerImage.style.backgroundColor = '#000000';
                adblockerImage.style.transform = 'translate(-50%, -50%)';
                adblockerImage.style.boxShadow = '0 0 8px rgba(0, 0, 0, 1)';

                adblockerContainer.appendChild(adblockerImage);
                body.appendChild(adblockerContainer);

                // Return an error event.
                _this5._onError('IMA script failed to load! Probably due to an ADBLOCKER!');
            };

            // Append the IMA script to the first script tag within the document.
            script.parentNode.insertBefore(ima, script);
        }

        /**
         * _createPlayer - Creates our staging/ markup for the advertisement.
         * @private
         */

    }, {
        key: '_createPlayer',
        value: function _createPlayer() {
            var _this6 = this;

            var body = document.body || document.getElementsByTagName('body')[0];

            this.adContainer = document.createElement('div');
            this.adContainer.id = this.options.prefix + 'advertisement';
            this.adContainer.style.display = 'none';
            this.adContainer.style.position = 'fixed';
            this.adContainer.style.zIndex = 99;
            this.adContainer.style.top = 0;
            this.adContainer.style.left = 0;
            this.adContainer.style.width = '100%';
            this.adContainer.style.height = '100%';
            this.adContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.adContainer.style.opacity = 0;
            this.adContainer.style.transition = 'opacity ' + this.containerTransitionSpeed + 'ms cubic-bezier(0.55, 0, 0.1, 1)';

            var adContainerInner = document.createElement('div');
            adContainerInner.id = this.options.prefix + 'advertisement_slot';
            adContainerInner.style.position = 'absolute';
            adContainerInner.style.backgroundColor = '#000000';
            if (this.options.responsive) {
                adContainerInner.style.top = 0;
                adContainerInner.style.left = 0;
            } else {
                adContainerInner.style.left = '50%';
                adContainerInner.style.top = '50%';
                adContainerInner.style.transform = 'translate(-50%, -50%)';
                adContainerInner.style.boxShadow = '0 0 8px rgba(0, 0, 0, 1)';
            }
            adContainerInner.style.width = this.options.width + 'px';
            adContainerInner.style.height = this.options.height + 'px';

            this.adContainer.appendChild(adContainerInner);
            body.appendChild(this.adContainer);

            // We need to resize our adContainer when the view dimensions change.
            if (this.options.responsive) {
                window.addEventListener('resize', function () {
                    _this6.options.width = document.documentElement.clientWidth;
                    _this6.options.height = document.documentElement.clientHeight;
                    adContainerInner.style.width = _this6.options.width + 'px';
                    adContainerInner.style.height = _this6.options.height + 'px';
                });
            }

            this._setUpIMA();
        }

        /**
         * _setUpIMA - Create's a the adsLoader object.
         * @private
         */

    }, {
        key: '_setUpIMA',
        value: function _setUpIMA() {
            // In order for the SDK to display ads on our page, we need to tell it where to put them.
            // In the html above, we defined a div with the id "adContainer".
            // This div is set up to render on top of the video player.
            // Using the code below, we tell the SDK to render ads in that div.
            // Also provide a handle to the content video player - the SDK will poll the current time of our player to properly place mid-rolls.
            // After we create the ad display container, initialize it.
            // On mobile devices, this initialization must be done as the result of a user action! Which is done at playAds().

            // So we can run VPAID2.
            google.ima.settings.setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.ENABLED);

            // Set language.
            google.ima.settings.setLocale(this.options.locale);

            // We assume the adContainer is the DOM id of the element that will house the ads.
            this.adDisplayContainer = new google.ima.AdDisplayContainer(document.getElementById(this.options.prefix + 'advertisement_slot'));

            // Here we create an AdsLoader and define some event listeners.
            // Then create an AdsRequest object to pass to this AdsLoader.
            // We'll then wire up the 'Play' button to call our _requestAds function.

            // We will maintain only one instance of AdsLoader for the entire lifecycle of the page.
            // To make additional ad requests, create a new AdsRequest object but re-use the same AdsLoader.

            // Re-use this AdsLoader instance for the entire lifecycle of the page.
            this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

            // Add adsLoader event listeners.
            this.adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, this._onAdsManagerLoaded, false, this);
            this.adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, this._onAdError, false, this);

            // Send event that adsLoader is ready.
            var eventName = 'AD_SDK_LOADER_READY';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: this.options,
                status: 'success',
                analytics: {
                    category: this.eventCategory,
                    action: eventName,
                    label: this.gameId,
                    value: ''
                }
            });

            // Request new video ads to be pre-loaded.
            this._requestAds();
        }

        /**
         * _requestAds - Request advertisements.
         * @private
         */

    }, {
        key: '_requestAds',
        value: function _requestAds() {
            if (typeof google === 'undefined') {
                this._onError('Unable to request ad, google IMA SDK not defined.');
                return;
            }

            // First check if we can run ads. If the game is embedded within a Phone Gap/ Cordova app, then we're not allowed.
            if (navigator.userAgent.match(/Crosswalk/i) || typeof window.cordova !== 'undefined') {
                this._onError('Navigator.userAgent contains Crosswalk and/ or window.cordova. We\'re not allowed to run advertisements within Cordova.');
                return;
            }

            try {
                // Request video new ads.
                var adsRequest = new google.ima.AdsRequest();
                adsRequest.adTagUrl = this.tag;

                // Specify the linear and nonlinear slot sizes. This helps the SDK to
                // select the correct creative if multiple are returned.
                adsRequest.linearAdSlotWidth = this.options.width;
                adsRequest.linearAdSlotHeight = this.options.height;
                adsRequest.nonLinearAdSlotWidth = this.options.width;
                adsRequest.nonLinearAdSlotHeight = this.options.height;

                // We don't want overlays as we do not support video!
                adsRequest.forceNonLinearFullSlot = true;

                // Get us some ads!
                this.adsLoader.requestAds(adsRequest);

                // Send event.
                var eventName = 'AD_SDK_LOADER_READY';
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: this.tag,
                    status: 'success',
                    analytics: {
                        category: this.eventCategory,
                        action: eventName,
                        label: this.gameId,
                        value: ''
                    }
                });
            } catch (e) {
                this._onAdError(e);
            }
        }

        /**
         * _onAdsManagerLoaded - This function is called whenever the ads are ready inside the AdDisplayContainer.
         * @param adsManagerLoadedEvent
         * @private
         */

    }, {
        key: '_onAdsManagerLoaded',
        value: function _onAdsManagerLoaded(adsManagerLoadedEvent) {
            var _this7 = this;

            // Get the ads manager.
            var adsRenderingSettings = new google.ima.AdsRenderingSettings();
            adsRenderingSettings.enablePreloading = true;
            adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

            // We don't set videoContent as in the Google IMA example docs, cause we run a game, not an ad.
            this.adsManager = adsManagerLoadedEvent.getAdsManager(adsRenderingSettings);

            // Add listeners to the required events.
            // https://developers.google.com/interactive-media-ads/docs/sdks/html5/v3/apis

            // Advertisement error events.
            this.adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, this._onAdError.bind(this), false, this);

            // Advertisement regular events.
            this.adsManager.addEventListener(google.ima.AdEvent.Type.AD_BREAK_READY, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.AD_METADATA, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.CLICK, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.DURATION_CHANGE, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.FIRST_QUARTILE, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.IMPRESSION, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.INTERACTION, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.LINEAR_CHANGED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.LOG, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.MIDPOINT, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.PAUSED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.RESUMED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.THIRD_QUARTILE, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.VOLUME_CHANGED, this._onAdEvent.bind(this), this);
            this.adsManager.addEventListener(google.ima.AdEvent.Type.VOLUME_MUTED, this._onAdEvent.bind(this), this);

            // We need to resize our adContainer when the view dimensions change.
            if (this.options.responsive) {
                window.addEventListener('resize', function () {
                    _this7.adsManager.resize(_this7.options.width, _this7.options.height, google.ima.ViewMode.NORMAL);
                });
            }

            // Once the ad display container is ready and ads have been retrieved,
            // we can use the ads manager to display the ads.
            if (this.adsManager && this.adDisplayContainer) {
                this.requestAttempts = 0; // Reset attempts as we've successfully setup the adsloader (again).
                var eventName = 'AD_SDK_MANAGER_READY';
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: this.adsManager,
                    status: 'success',
                    analytics: {
                        category: this.eventCategory,
                        action: eventName,
                        label: this.gameId,
                        value: ''
                    }
                });
            }

            // Run the ad if autoplay is enabled. Only once.
            if (this.options.autoplay && this.preroll) {
                this.preroll = false;
                this.play();
            }
        }

        /**
         * _onAdEvent- This is where all the event handling takes place.
         * Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED) don't have ad object associated.
         * @param adEvent
         * @private
         */

    }, {
        key: '_onAdEvent',
        value: function _onAdEvent(adEvent) {
            var _this8 = this;

            var eventName = '';
            var eventMessage = '';
            switch (adEvent.type) {
                case google.ima.AdEvent.Type.AD_BREAK_READY:
                    eventName = 'AD_BREAK_READY';
                    eventMessage = 'Fired when an ad rule or a VMAP ad break would have played if autoPlayAdBreaks is false.';
                    break;
                case google.ima.AdEvent.Type.AD_METADATA:
                    eventName = 'AD_METADATA';
                    eventMessage = 'Fired when an ads list is loaded.';
                    break;
                case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
                    eventName = 'ALL_ADS_COMPLETED';
                    eventMessage = 'Fired when the ads manager is done playing all the ads.';

                    // Todo: maybe move this all to cancel() as it is almost similar.
                    // Hide the advertisement.
                    if (this.adContainer) {
                        this.adContainer.style.opacity = 0;
                        setTimeout(function () {
                            _this8.adContainer.style.display = 'none';
                        }, this.containerTransitionSpeed);
                    }

                    // Destroy the adsManager so we can grab new ads after this.
                    // If we don't then we're not allowed to call new ads based on google policies,
                    // as they interpret this as an accidental video requests.
                    // https://developers.google.com/interactive-media-ads/docs/sdks/android/faq#8
                    Promise.all([this.adsLoaderPromise, this.adsManagerPromise]).then(function () {
                        if (_this8.adsManager) {
                            _this8.adsManager.destroy();
                        }
                        if (_this8.adsLoader) {
                            _this8.adsLoader.contentComplete();
                        }

                        // Preload new ads by doing a new request.
                        _this8._requestAds();

                        // Send event to tell that the whole advertisement thing is finished.
                        var eventName = 'AD_SDK_FINISHED';
                        var eventMessage = 'IMA is ready for new requests.';
                        _this8.eventBus.broadcast(eventName, {
                            name: eventName,
                            message: eventMessage,
                            status: 'success',
                            analytics: {
                                category: _this8.eventCategory,
                                action: eventName,
                                label: _this8.gameId,
                                value: eventMessage
                            }
                        });
                    }).catch(function (error) {
                        return console.log(error);
                    });

                    break;
                case google.ima.AdEvent.Type.CLICK:
                    eventName = 'CLICK';
                    eventMessage = 'Fired when the ad is clicked.';
                    break;
                case google.ima.AdEvent.Type.COMPLETE:
                    eventName = 'COMPLETE';
                    eventMessage = 'Fired when the ad completes playing.';
                    break;
                case google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED:
                    eventName = 'CONTENT_PAUSE_REQUESTED';
                    eventMessage = 'Fired when content should be paused. This usually happens right before an ad is about to cover the content.';
                    break;
                case google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
                    eventName = 'CONTENT_RESUME_REQUESTED';
                    eventMessage = 'Fired when content should be resumed. This usually happens when an ad finishes or collapses.';
                    break;
                case google.ima.AdEvent.Type.DURATION_CHANGE:
                    eventName = 'DURATION_CHANGE';
                    eventMessage = 'Fired when the ad\'s duration changes.';
                    break;
                case google.ima.AdEvent.Type.FIRST_QUARTILE:
                    eventName = 'FIRST_QUARTILE';
                    eventMessage = 'Fired when the ad playhead crosses first quartile.';
                    break;
                case google.ima.AdEvent.Type.IMPRESSION:
                    eventName = 'IMPRESSION';
                    eventMessage = 'Fired when the impression URL has been pinged.';
                    break;
                case google.ima.AdEvent.Type.INTERACTION:
                    eventName = 'INTERACTION';
                    eventMessage = 'Fired when an ad triggers the interaction callback. Ad interactions contain an interaction ID string in the ad data.';
                    break;
                case google.ima.AdEvent.Type.LINEAR_CHANGED:
                    eventName = 'LINEAR_CHANGED';
                    eventMessage = 'Fired when the displayed ad changes from linear to nonlinear, or vice versa.';
                    break;
                case google.ima.AdEvent.Type.LOADED:
                    eventName = 'LOADED';
                    eventMessage = adEvent.getAd().getContentType();
                    break;
                case google.ima.AdEvent.Type.LOG:
                    var adData = adEvent.getAdData();
                    if (adData['adError']) {
                        eventName = 'LOG';
                        eventMessage = adEvent.getAdData();
                    }
                    break;
                case google.ima.AdEvent.Type.MIDPOINT:
                    eventName = 'MIDPOINT';
                    eventMessage = 'Fired when the ad playhead crosses midpoint.';
                    break;
                case google.ima.AdEvent.Type.PAUSED:
                    eventName = 'PAUSED';
                    eventMessage = 'Fired when the ad is paused.';
                    break;
                case google.ima.AdEvent.Type.RESUMED:
                    eventName = 'RESUMED';
                    eventMessage = 'Fired when the ad is resumed.';
                    break;
                case google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED:
                    eventName = 'SKIPPABLE_STATE_CHANGED';
                    eventMessage = 'Fired when the displayed ads skippable state is changed.';
                    break;
                case google.ima.AdEvent.Type.SKIPPED:
                    eventName = 'SKIPPED';
                    eventMessage = 'Fired when the ad is skipped by the user.';
                    break;
                case google.ima.AdEvent.Type.STARTED:
                    eventName = 'STARTED';
                    eventMessage = 'Fired when the ad starts playing.';
                    break;
                case google.ima.AdEvent.Type.THIRD_QUARTILE:
                    eventName = 'THIRD_QUARTILE';
                    eventMessage = 'Fired when the ad playhead crosses third quartile.';
                    break;
                case google.ima.AdEvent.Type.USER_CLOSE:
                    eventName = 'USER_CLOSE';
                    eventMessage = 'Fired when the ad is closed by the user.';
                    break;
                case google.ima.AdEvent.Type.VOLUME_CHANGED:
                    eventName = 'VOLUME_CHANGED';
                    eventMessage = 'Fired when the ad volume has changed.';
                    break;
                case google.ima.AdEvent.Type.VOLUME_MUTED:
                    eventName = 'VOLUME_MUTED';
                    eventMessage = 'Fired when the ad volume has been muted.';
                    break;
            }

            // Send the event to our eventBus.
            if (eventName !== '' && eventMessage !== '') {
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: eventMessage,
                    status: 'success',
                    analytics: {
                        category: this.eventCategory,
                        action: eventName,
                        label: this.gameId,
                        value: eventMessage
                    }
                });
            }
        }

        /**
         * _onAdError - Any ad error handling comes through here.
         * @param adErrorEvent
         * @private
         */

    }, {
        key: '_onAdError',
        value: function _onAdError(adErrorEvent) {
            var eventName = 'AD_ERROR';
            var eventMessage = adErrorEvent.getError();
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'warning',
                analytics: {
                    category: this.eventCategory,
                    action: eventName,
                    label: this.gameId,
                    value: eventMessage
                }
            });
            this.cancel();
            window.clearTimeout(this.safetyTimer);
        }

        /**
         * _onError - Any error handling comes through here.
         * @param message
         * @private
         */

    }, {
        key: '_onError',
        value: function _onError(message) {
            var eventName = 'AD_SDK_ERROR';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: message,
                status: 'error',
                analytics: {
                    category: this.eventCategory,
                    action: eventName,
                    label: this.gameId,
                    value: message
                }
            });
            this.cancel();
            window.clearTimeout(this.safetyTimer);
        }

        /**
         * _startSafetyTimer - Setup a safety timer for when the ad network doesn't respond for whatever reason.
         * The advertisement has 12 seconds to get its shit together.
         * We stop this timer when the advertisement is playing,
         * or when a user action is required to start, then we clear the timer on ad ready.
         * @private
         */

    }, {
        key: '_startSafetyTimer',
        value: function _startSafetyTimer() {
            var _this9 = this;

            // Todo: Not a big deal, but restart this timer on NEW adsrequest.
            this.safetyTimer = window.setTimeout(function () {
                var eventName = 'AD_SAFETY_TIMER';
                var eventMessage = 'Advertisement took too long to load.';
                _this9.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: eventMessage,
                    status: 'warning',
                    analytics: {
                        category: _this9.eventCategory,
                        action: eventName,
                        label: _this9.gameId,
                        value: eventMessage
                    }
                });
                _this9.cancel();
                window.clearTimeout(_this9.safetyTimer);
            }, 12000);
            if (this.options.autoplay) {
                this.eventBus.subscribe('STARTED', function () {
                    (0, _dankLog.dankLog)('AD_SAFETY_TIMER', 'Cleared the safety timer.', 'success');
                    window.clearTimeout(_this9.safetyTimer);
                });
            } else {
                this.eventBus.subscribe('AD_SDK_MANAGER_READY', function () {
                    (0, _dankLog.dankLog)('AD_SAFETY_TIMER', 'Cleared the safety timer.', 'success');
                    window.clearTimeout(_this9.safetyTimer);
                });
            }
        }
    }]);

    return VideoAd;
}();

exports.default = VideoAd;

},{"../components/EventBus":3,"../modules/common":7,"../modules/dankLog":8}],6:[function(require,module,exports){
'use strict';

var _sdk = require('./sdk');

var _sdk2 = _interopRequireDefault(_sdk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Todo: current namespace implementation is kind of weird? We need to have backwards compatability so i havent changed it now, but we should.
var settings = window.gdApi.q[0][0];
var gdApi = new _sdk2.default(settings);

// Replace/Create our namespace(s).
window.gdApi = gdApi;

},{"./sdk":9}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function extendDefaults(source, properties) {
    var property = void 0;
    for (property in properties) {
        if (properties.hasOwnProperty(property)) {
            source[property] = properties[property];
        }
    }
    return source;
}

function serialize(obj) {
    var parts = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]));
        }
    }
    return parts.join('&');
}

function fetchData(queryString, _data, response) {
    var request = void 0;
    if (window.XMLHttpRequest) {
        // Mozilla, Safari, ...
        request = new XMLHttpRequest();
    } else if (window.ActiveXObject) {
        // IE
        try {
            request = new ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
            try {
                request = new ActiveXObject('Microsoft.XMLHTTP');
            } catch (e) {
                console.log(e);
            }
        }
    }
    request.open('POST', queryString, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            var text = request.responseText;
            response(text);
        } else {
            response();
        }
    };
    request.onerror = function (error) {
        console.log(error);
        response();
    };

    request.send(serialize(_data));
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days, path) {
    var path = path || '/';
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        var expires = "; expires=" + date.toGMTString();
    } else var expires = "";
    document.cookie = name + "=" + value + expires + "; path=" + path;
}

function startSession() {
    var text = '';
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }return text;
}

function getXMLData(url) {
    var request = new Request(url, {
        method: 'GET'
    });
    return fetch(request).then(function (response) {
        return response.text();
    }).then(function (str) {
        var dom = parseXML(str);
        var obj = XML2Object(dom);
        return obj;
    }).catch(function (error) {
        return error;
    });
}

function parseXML(xml) {
    var dom = null;
    if (window.DOMParser) {
        try {
            dom = new DOMParser().parseFromString(xml, 'text/xml');
        } catch (e) {
            dom = null;
        }
    } else if (window.ActiveXObject) {
        try {
            dom = new ActiveXObject('Microsoft.XMLDOM');
            dom.async = false;
            if (!dom.loadXML(xml)) // parse error ..
                window.alert(dom.parseError.reason + dom.parseError.srcText);
        } catch (e) {
            dom = null;
        }
    } else {
        console.log('cannot parse xml string!');
    }
    return dom;
}

function XML2Object(xml, tab) {
    var X = {
        toObj: function toObj(xml) {
            var o = {};
            if (xml.nodeType == 1) {
                if (xml.attributes.length) for (var i = 0; i < xml.attributes.length; i++) {
                    o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
                }if (xml.firstChild) {
                    // element has child nodes ..
                    var textChild = 0,
                        cdataChild = 0,
                        hasElementChild = false;
                    for (var n = xml.firstChild; n; n = n.nextSibling) {
                        if (n.nodeType == 1) hasElementChild = true;else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++;else if (n.nodeType == 4) cdataChild++; // cdata section node
                    }
                    if (hasElementChild) {
                        if (textChild < 2 && cdataChild < 2) {
                            X.removeWhite(xml);
                            for (var n = xml.firstChild; n; n = n.nextSibling) {
                                if (n.nodeType == 3) // text node
                                    o["#text"] = X.escape(n.nodeValue);else if (n.nodeType == 4) // cdata node
                                    o["#cdata"] = X.escape(n.nodeValue);else if (o[n.nodeName]) {
                                    // multiple occurence of element ..
                                    if (o[n.nodeName] instanceof Array) o[n.nodeName][o[n.nodeName].length] = X.toObj(n);else o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                                } else // first occurence of element..
                                    o[n.nodeName] = X.toObj(n);
                            }
                        } else {
                            // mixed content
                            if (!xml.attributes.length) o = X.escape(X.innerXml(xml));else o["#text"] = X.escape(X.innerXml(xml));
                        }
                    } else if (textChild) {
                        // pure text
                        if (!xml.attributes.length) o = X.escape(X.innerXml(xml));else o["#text"] = X.escape(X.innerXml(xml));
                    } else if (cdataChild) {
                        // cdata
                        if (cdataChild > 1) o = X.escape(X.innerXml(xml));else for (var n = xml.firstChild; n; n = n.nextSibling) {
                            o["#cdata"] = X.escape(n.nodeValue);
                        }
                    }
                }
                if (!xml.attributes.length && !xml.firstChild) o = null;
            } else if (xml.nodeType == 9) {
                // document.node
                o = X.toObj(xml.documentElement);
            } else alert("unhandled node type: " + xml.nodeType);
            return o;
        },
        toJson: function toJson(o, name, ind) {
            var json = name ? "\"" + name + "\"" : "";
            if (o instanceof Array) {
                for (var i = 0, n = o.length; i < n; i++) {
                    o[i] = X.toJson(o[i], "", ind + "\t");
                }json += (name ? ":[" : "[") + (o.length > 1 ? "\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind : o.join("")) + "]";
            } else if (o == null) json += (name && ":") + "null";else if ((typeof o === 'undefined' ? 'undefined' : _typeof(o)) == "object") {
                var arr = [];
                for (var m in o) {
                    arr[arr.length] = X.toJson(o[m], m, ind + "\t");
                }json += (name ? ":{" : "{") + (arr.length > 1 ? "\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind : arr.join("")) + "}";
            } else if (typeof o == "string") json += (name && ":") + "\"" + o.toString() + "\"";else json += (name && ":") + o.toString();
            return json;
        },
        innerXml: function innerXml(node) {
            var s = "";
            if ("innerHTML" in node) s = node.innerHTML;else {
                var asXml = function asXml(n) {
                    var s = "";
                    if (n.nodeType == 1) {
                        s += "<" + n.nodeName;
                        for (var i = 0; i < n.attributes.length; i++) {
                            s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                        }if (n.firstChild) {
                            s += ">";
                            for (var c = n.firstChild; c; c = c.nextSibling) {
                                s += asXml(c);
                            }s += "</" + n.nodeName + ">";
                        } else s += "/>";
                    } else if (n.nodeType == 3) s += n.nodeValue;else if (n.nodeType == 4) s += "<![CDATA[" + n.nodeValue + "]]>";
                    return s;
                };
                for (var c = node.firstChild; c; c = c.nextSibling) {
                    s += asXml(c);
                }
            }
            return s;
        },
        escape: function escape(txt) {
            return txt.replace(/[\\]/g, "\\\\").replace(/[\"]/g, '\\"').replace(/[\n]/g, '\\n').replace(/[\r]/g, '\\r');
        },
        removeWhite: function removeWhite(e) {
            e.normalize();
            for (var n = e.firstChild; n;) {
                if (n.nodeType == 3) {
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                        var nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    } else n = n.nextSibling;
                } else if (n.nodeType == 1) {
                    // element node
                    X.removeWhite(n);
                    n = n.nextSibling;
                } else // any other node
                    n = n.nextSibling;
            }
            return e;
        }
    };
    if (xml.nodeType == 9) // document node
        xml = xml.documentElement;
    /*
        Return Xml to Json
    var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
    return "{" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "}";
    */

    return X.toObj(X.removeWhite(xml));
}

function getParentUrl() {
    // If the referrer is gameplayer.io, else we just return href.
    // The referrer can be set by Spil games.
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        // Now check if ref is not empty, otherwise we return a default.
        var defaultUrl = 'https://gamedistribution.com/';
        if (document.referrer.indexOf('?ref=') !== -1) {
            var returnedResult = document.referrer.substr(document.referrer.indexOf('?ref=') + 5);
            if (returnedResult !== '') {
                if (returnedResult === '{portal%20name}' || returnedResult === '{portal name}') {
                    returnedResult = defaultUrl;
                } else if (returnedResult.indexOf('http') !== 0) {
                    returnedResult = 'http://' + returnedResult;
                }
            } else {
                returnedResult = defaultUrl;
            }
            return returnedResult;
        } else {
            return defaultUrl;
        }
    } else {
        if (document.referrer && document.referrer !== '') {
            return document.referrer;
        } else {
            return document.location.href;
        }
    }
}

exports.extendDefaults = extendDefaults;
exports.serialize = serialize;
exports.fetchData = fetchData;
exports.getCookie = getCookie;
exports.setCookie = setCookie;
exports.startSession = startSession;
exports.getXMLData = getXMLData;
exports.parseXML = parseXML;
exports.XML2Object = XML2Object;
exports.getParentUrl = getParentUrl;

},{}],8:[function(require,module,exports){
'use strict';

/**
 * dankLog - Just shows stuff in as dank as possible.
 * @param name: String
 * @param message: String
 * @param status: String - success, warning, error
 * @public
 */

Object.defineProperty(exports, "__esModule", {
    value: true
});
function dankLog(name, message, status) {
    try {
        if (localStorage.getItem('gdApi_debug')) {
            var theme = status === 'error' ? 'background: #c4161e; color: #fff' : status === 'warning' ? 'background: #ff8c1c; color: #fff' : 'background: #44a5ab; color: #fff';
            var banner = console.log('%c %c %c gdApi %c %c %c ' + name + ' ', 'background: #9854d8', 'background: #6c2ca7', 'color: #fff; background: #450f78;', 'background: #6c2ca7', 'background: #9854d8', theme, typeof message !== 'undefined' ? message : '');
            console.log.apply(console, banner);
        }
    } catch (error) {
        console.log(error);
    }
}

exports.dankLog = dankLog;

},{}],9:[function(require,module,exports){
'use strict';

// Todo: Add unit tests and end-to-end tests using Jasmine and Nightwatch.

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

var _VideoAd = require('./components/VideoAd');

var _VideoAd2 = _interopRequireDefault(_VideoAd);

var _EventBus = require('./components/EventBus');

var _EventBus2 = _interopRequireDefault(_EventBus);

var _ImplementationTest = require('./components/ImplementationTest');

var _ImplementationTest2 = _interopRequireDefault(_ImplementationTest);

var _Analytics = require('./components/Analytics');

var _Analytics2 = _interopRequireDefault(_Analytics);

var _common = require('./modules/common');

var _dankLog = require('./modules/dankLog');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var instance = null;

var API = function () {
    function API(options) {
        var _this = this;

        _classCallCheck(this, API);

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        // Set some defaults. We replace them with real given values further down.
        var defaults = {
            debug: false,
            gameId: '4f3d7d38d24b740c95da2b03dc3a2333',
            userId: '31D29405-8D37-4270-BF7C-8D99CCF0177F-s1',
            advertisementSettings: {},
            resumeGame: function resumeGame() {
                // ...
            },
            pauseGame: function pauseGame() {
                // ...
            },
            onEvent: function onEvent(event) {
                // ...
            },
            onInit: function onInit(data) {
                // ...
            },
            onError: function onError(data) {
                // ...
            }
        };

        if (options) {
            this.options = (0, _common.extendDefaults)(defaults, options);
        } else {
            this.options = defaults;
        }

        // Open the debug console when debugging is enabled.
        try {
            if (this.options.debug || localStorage.getItem('gdApi_debug')) {
                this.openConsole();
            }
        } catch (error) {
            console.log(error);
        }

        // Set a version banner within the developer console.
        var date = new Date();
        var versionInformation = {
            version: _package2.default.version,
            date: date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear(),
            time: date.getHours() + ':' + date.getMinutes()
        };
        var banner = console.log('%c %c %c Gamedistribution.com HTML5 API | Version: ' + versionInformation.version + ' (' + versionInformation.date + ' ' + versionInformation.time + ') %c %c %c', 'background: #9854d8', 'background: #6c2ca7', 'color: #fff; background: #450f78;', 'background: #6c2ca7', 'background: #9854d8', 'background: #ffffff');
        console.log.apply(console, banner);

        // Magic
        // GD analytics
        var version = 'v501';
        var sVersion = 'v1';
        var gameServer = this.options.userId.toLowerCase().split('-');
        var referrer = (0, _common.getParentUrl)();
        var sessionId = (0, _common.startSession)();
        var serverId = gameServer.splice(5, 1)[0];
        var regId = gameServer.join('-');
        var serverName = ('https:' === document.location.protocol ? 'https://' : 'http://') + regId + '.' + serverId + '.submityourgame.com/' + sVersion + '/';
        this.analytics = new _Analytics2.default({
            version: version,
            sVersion: sVersion,
            gameId: this.options.gameId,
            userId: this.options.userId,
            referrer: referrer,
            sessionId: sessionId,
            serverId: serverId,
            regId: regId,
            serverName: serverName
        });

        // Also call GA and DS.
        this._thirdPartyAnalytics();

        // Setup all event listeners.
        // We also send a Google Analytics event for each one of our events.
        this.eventBus = new _EventBus2.default();
        this.eventBus.gameId = this.options.gameId;

        // API events
        this.eventBus.subscribe('API_READY', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('API_ERROR', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('API_GAME_DATA_READY', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('API_GAME_START', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('API_GAME_PAUSE', function (arg) {
            return _this._onEvent(arg);
        });

        // IMA HTML5 SDK events
        this.eventBus.subscribe('AD_SDK_LOADER_READY', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_SDK_MANAGER_READY', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_SDK_REQUEST_ADS', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_SDK_ERROR', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_SDK_FINISHED', function (arg) {
            return _this._onEvent(arg);
        });

        // Ad events
        this.eventBus.subscribe('AD_CANCELED', function (arg) {
            _this._onEvent(arg);
            _this.onResumeGame('Advertisement error, no worries, start / resume the game.', 'warning');
        });
        this.eventBus.subscribe('AD_ERROR', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_SAFETY_TIMER', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_BREAK_READY', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('AD_METADATA', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('ALL_ADS_COMPLETED', function (arg) {
            _this._onEvent(arg);
            _this.onResumeGame('Advertisement(s) are done. Start / resume the game.', 'success');
        });
        this.eventBus.subscribe('CLICK', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('COMPLETE', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', function (arg) {
            _this._onEvent(arg);
            _this.onPauseGame('New advertisements requested and loaded', 'success');
        });
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('DURATION_CHANGE', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('FIRST_QUARTILE', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('IMPRESSION', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('INTERACTION', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('LINEAR_CHANGED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('LOADED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('LOG', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('MIDPOINT', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('PAUSED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('RESUMED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('SKIPPABLE_STATE_CHANGED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('SKIPPED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('STARTED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('THIRD_QUARTILE', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('USER_CLOSE', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('VOLUME_CHANGED', function (arg) {
            return _this._onEvent(arg);
        });
        this.eventBus.subscribe('VOLUME_MUTED', function (arg) {
            return _this._onEvent(arg);
        });

        // Only allow ads after the preroll and after a certain amount of time. This time restriction is available from gameData.
        this.adRequestTimer = undefined;

        // Setup our video ad promise, which should be resolved before an ad can be called from a click event.
        var videoAdPromise = new Promise(function (resolve, reject) {
            _this.eventBus.subscribe('AD_SDK_MANAGER_READY', function (arg) {
                return resolve();
            });
            _this.eventBus.subscribe('AD_SDK_ERROR', function (arg) {
                return reject();
            });
        });

        // Get game data. If it fails we we use default data, so this should always resolve.
        var gameData = {
            uuid: 'ed40354e-856f-4aae-8cca-c8b98d70dec3',
            affiliate: 'A-GAMEDIST',
            advertisements: true,
            preroll: true,
            midroll: parseInt(2) * 60000
        };

        var gameDataLocation = ('https:' === document.location.protocol ? 'https://' : 'http://') + serverId + ".bn.submityourgame.com/" + this.options.gameId + ".xml?ver=" + version + "&url=" + referrer;
        //const gameDataLocation = 'http://s1.bn.submityourgame.com/b92a4170784248bca2ffa0c08bec7a50.xml?ver=v501&url=http://html5.gamedistribution.com';
        var gameDataPromise = new Promise(function (resolve) {
            // Todo: XML sucks, replace it some day with JSON at submityourgame.com. There is also a parse to json method in getXMLData.js, but I didn't bother.
            (0, _common.getXMLData)(gameDataLocation).then(function (response) {
                try {
                    var retrievedGameData = {
                        uuid: response.row[0].uid,
                        affiliate: response.row[0].aid,
                        advertisements: response.row[0].act === '1',
                        preroll: response.row[0].pre === '1',
                        midroll: parseInt(response.row[0].sat) * 60000
                    };
                    gameData = (0, _common.extendDefaults)(gameData, retrievedGameData);
                    (0, _dankLog.dankLog)('API_GAME_DATA_READY', gameData, 'success');

                    // Send a 'game loaded'-event to Vooxe reports.
                    // Sounds a bit weird doing this while the game might not even be loaded at this point,
                    // but this event has been called around this moment in the old API as well.
                    new Image().src = 'https://analytics.tunnl.com/collect?type=html5&evt=game.play&uuid=' + gameData.uuid + '&aid=' + gameData.affiliate;

                    // Start our advertisement instance. Setting up the adsLoader should resolve VideoAdPromise.
                    _this.videoAdInstance = new _VideoAd2.default(_this.options.advertisementSettings);
                    _this.videoAdInstance.gameId = _this.options.gameId;
                    if (!localStorage.getItem('gdApi_debug')) {
                        _this.videoAdInstance.tag = 'https://adtag.tunnl.com/adsr?pa=1&c=4&sz=640x480&a=' + gameData.affiliate + '&gameid=' + _this.options.gameId + '&ad_type=video_image&adapter=off&mfb=2&page_url=' + encodeURIComponent(referrer) + '';
                    }
                    _this.videoAdInstance.start();

                    // Check if preroll is enabled. If so, then we start the adRequestTimer,
                    // blocking any attempts to call an advertisement too soon.
                    if (!gameData.preroll) {
                        _this.adRequestTimer = new Date();
                        _this.videoAdInstance.preroll = false;
                    }

                    resolve(gameData);
                } catch (error) {
                    (0, _dankLog.dankLog)('API_GAME_DATA_READY', error, 'warning');
                    resolve(gameData);
                }
            });
        });

        // Now check if everything is ready.
        // We use default API data if the promise fails.
        this.readyPromise = Promise.all([gameDataPromise, videoAdPromise]).then(function (response) {
            var eventName = 'API_READY';
            var eventMessage = 'Everything is ready.';
            _this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'success',
                analytics: {
                    category: 'API',
                    action: eventName,
                    label: _this.options.gameId,
                    value: eventMessage
                }
            });
            return response[0];
        }).catch(function () {
            var eventName = 'API_ERROR';
            var eventMessage = 'The API failed.';
            _this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'error',
                analytics: {
                    category: 'API',
                    action: eventName,
                    label: _this.options.gameId,
                    value: eventMessage
                }
            });
            return false;
        });
    }

    /**
     * _onEvent - Gives us a nice console log message for all our events going through the EventBus.
     * @param event: Object
     * @private
     */


    _createClass(API, [{
        key: '_onEvent',
        value: function _onEvent(event) {
            // Show the event in the log.
            (0, _dankLog.dankLog)(event.name, event.message, event.status);
            // Push out a Google event for each event. Makes our life easier. I think.
            try {
                if (typeof _gd_ga !== 'undefined') {
                    _gd_ga('gd.send', {
                        hitType: 'event',
                        eventCategory: event.analytics.category ? event.analytics.category : '',
                        eventAction: event.analytics.action ? event.analytics.action : '',
                        eventLabel: event.analytics.label ? event.analytics.label : '',
                        eventValue: event.analytics.value ? event.analytics.value : ''
                    });
                }
            } catch (error) {
                console.log(error);
            }
            // Now send the event to the developer.
            this.options.onEvent(event);
        }

        /**
         * _thirdPartyAnalytics - Magic...
         * @private
         */

    }, {
        key: '_thirdPartyAnalytics',
        value: function _thirdPartyAnalytics() {
            if (typeof _gd_ga === 'undefined') {
                // Load Google Analytics so we can push out a Google event for each of our events.
                (function (i, s, o, g, r, a, m) {
                    i['GoogleAnalyticsObject'] = r;
                    i[r] = i[r] || function () {
                        (i[r].q = i[r].q || []).push(arguments);
                    }, i[r].l = 1 * new Date();
                    a = s.createElement(o), m = s.getElementsByTagName(o)[0];
                    a.async = 1;
                    a.src = g;
                    m.parentNode.insertBefore(a, m);
                })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', '_gd_ga');
                _gd_ga('create', 'UA-102601800-1', { 'name': 'gd' }, 'auto');
                _gd_ga('gd.send', 'pageview');

                // Project Death Star.
                // https://bitbucket.org/keygamesnetwork/datacollectionservice
                var script = document.createElement('script');
                script.innerHTML = '\n                var DS_OPTIONS = {\n                    id: \'GAMEDISTRIBUTION\',\n                    success: function(id) {\n                        _gd_ga(\'gd.set\', \'userId\', id); \n                        _gd_ga(\'gd.set\', \'dimension1\', id);\n                    }\n                }\n            ';
                document.head.appendChild(script);

                // Load Death Star
                (function (window, document, element, source) {
                    var ds = document.createElement(element);
                    var m = document.getElementsByTagName(element)[0];
                    ds.type = 'text/javascript';
                    ds.async = true;
                    ds.src = source;
                    m.parentNode.insertBefore(ds, m);
                })(window, document, 'script', 'https://game.gamemonkey.org/static/main.min.js');
            }
        }

        /**
         * showBanner - Used by our developer to call a video advertisement.
         * @public
         */

    }, {
        key: 'showBanner',
        value: function showBanner() {
            var _this2 = this;

            this.readyPromise.then(function (gameData) {
                if (gameData.advertisements) {
                    // Check if ad is not called too often.
                    if (typeof _this2.adRequestTimer !== 'undefined') {
                        var elapsed = new Date().valueOf() - _this2.adRequestTimer.valueOf();
                        if (elapsed < gameData.midroll) {
                            (0, _dankLog.dankLog)('API_SHOW_BANNER', 'The advertisement was requested too soon after the previous advertisement was finished.', 'warning');
                        } else {
                            (0, _dankLog.dankLog)('API_SHOW_BANNER', 'Requested the midroll advertisement. It is now ready. Pause the game.', 'success');
                            _this2.videoAdInstance.play();
                            _this2.adRequestTimer = new Date();
                        }
                    } else {
                        (0, _dankLog.dankLog)('API_SHOW_BANNER', 'Requested the preroll advertisement. It is now ready. Pause the game.', 'success');
                        _this2.videoAdInstance.play();
                        _this2.adRequestTimer = new Date();
                    }
                } else {
                    _this2.videoAdInstance.cancel();
                    (0, _dankLog.dankLog)('API_SHOW_BANNER', 'Advertisements are disabled. Start / resume the game.', 'warning');
                }
            }).catch(function (error) {
                (0, _dankLog.dankLog)('API_SHOW_BANNER', error, 'error');
            });
        }

        /**
         * customLog - GD Logger sends how many times 'CustomLog' that is called related to given by _key name. If you invoke
         * 'CustomLog' many times, it increases 'CustomLog' counter and sends this counter value.
         * @param key: String
         * @public
         */

    }, {
        key: 'customLog',
        value: function customLog(key) {
            // Todo: should be public?
            this.analytics.customLog(key);
        }

        /**
         * play - GD Logger sends how many times 'PlayGame' is called. If you invoke 'PlayGame' many times, it increases
         * 'PlayGame' counter and sends this counter value.
         * @public
         */

    }, {
        key: 'play',
        value: function play() {
            // Todo: should be public?
            this.analytics.play();
        }

        /**
         * onResumeGame - Called from various moments within the API. This sends out a callback to our developer,
         * so he/ she can allow the game to resume again. We also call resumeGame() for backwards compatibility reasons.
         * @param message: String
         * @param status: String
         */

    }, {
        key: 'onResumeGame',
        value: function onResumeGame(message, status) {
            this.options.resumeGame();
            var eventName = 'API_GAME_START';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: message,
                status: status,
                analytics: {
                    category: 'API',
                    action: eventName,
                    label: this.options.gameId,
                    value: message
                }
            });
        }

        /**
         * onPauseGame - Called from various moments within the API. This sends out a callback to pause the game.
         * It is required to have the game paused when an advertisement starts playing.
         * @param message: String
         * @param status: Status
         */

    }, {
        key: 'onPauseGame',
        value: function onPauseGame(message, status) {
            this.options.pauseGame();
            var eventName = 'API_GAME_PAUSE';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: message,
                status: status,
                analytics: {
                    category: 'API',
                    action: eventName,
                    label: this.options.gameId,
                    value: message
                }
            });
        }

        /**
         * openConsole - Enable debugging, we also set a value in localStorage, so we can also enable debugging without setting the property.
         * This is nice for when we're trying to debug a game that is not ours.
         * @public
         */

    }, {
        key: 'openConsole',
        value: function openConsole() {
            try {
                var implementation = new _ImplementationTest2.default();
                implementation.start();
                localStorage.setItem('gdApi_debug', true);
            } catch (error) {
                console.log(error);
            }
        }
    }]);

    return API;
}();

exports.default = API;

},{"../package.json":1,"./components/Analytics":2,"./components/EventBus":3,"./components/ImplementationTest":4,"./components/VideoAd":5,"./modules/common":7,"./modules/dankLog":8}]},{},[2,3,4,5,6,7,8,9]);
