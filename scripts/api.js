'use strict';

import PackageJSON from '../package.json';
import VideoAd from './components/VideoAd';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';
import Analytics from './components/Analytics';

import {extendDefaults, getXMLData} from './modules/common';
import {dankLog} from './modules/dankLog';

let instance = null;

class API {

    constructor(options) {

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        // Set some defaults. We replace them with real given values further down.
        const defaults = {
            debug: false,
            gameId: '4f3d7d38d24b740c95da2b03dc3a2333',
            userId: '31D29405-8D37-4270-BF7C-8D99CCF0177F-s1',
            advertisementSettings: {},
            resumeGame: function() {
                // ...
            },
            pauseGame: function() {
                // ...
            },
            onEvent: function(event) {
                // ...
            },
            onInit: function(data) {
                // ...
            },
            onError: function(data) {
                // ...
            }
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
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
        const date = new Date();
        const versionInformation = {
            version: PackageJSON.version,
            date: date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear(),
            time: date.getHours() + ':' + date.getMinutes()
        };
        const banner = console.log('%c %c %c Gamedistribution.com HTML5 API | Version: ' + versionInformation.version + ' (' + versionInformation.date + ' ' + versionInformation.time + ') %c %c %c', 'background: #9854d8', 'background: #6c2ca7', 'color: #fff; background: #450f78;', 'background: #6c2ca7', 'background: #9854d8', 'background: #ffffff');
        console.log.apply(console, banner);

        // Setup all event listeners.
        this.eventBus = new EventBus();

        // API events
        this.eventBus.subscribe('API_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_DATA_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_START', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_PAUSE', (arg) => this._onEvent(arg));

        // IMA HTML5 SDK events
        this.eventBus.subscribe('AD_SDK_LOADER_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_MANAGER_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_REQUEST_ADS', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_FINISHED', (arg) => this._onEvent(arg));

        // Ad events
        this.eventBus.subscribe('AD_CANCELED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame('Advertisement error, no worries, start / resume the game.', 'warning');
        });
        this.eventBus.subscribe('AD_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SAFETY_TIMER', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_BREAK_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_METADATA', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('ALL_ADS_COMPLETED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame('Advertisement(s) are done. Start / resume the game.', 'success');
        });
        this.eventBus.subscribe('CLICK', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('COMPLETE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', (arg) => {
            this._onEvent(arg);
            this.onPauseGame('New advertisements requested and loaded', 'success');
        });
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('DURATION_CHANGE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('FIRST_QUARTILE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('IMPRESSION', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('INTERACTION', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LINEAR_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LOADED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_LOG', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('MIDPOINT', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('PAUSED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('RESUMED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPABLE_STATE_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('STARTED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('THIRD_QUARTILE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('USER_CLOSE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_MUTED', (arg) => this._onEvent(arg));

        // Get game data. If it fails we we use default data, so this should always resolve.
        // Todo: also noticed we have something like a mid roll timer in the old api, figure out what that was used for.
        let gameData = {
            id: 'ed40354e-856f-4aae-8cca-c8b98d70dec3',
            affiliate: 'A-GAMEDIST',
            advertisements: true,
            preroll: true, // Todo: what to do with preroll value from gameData?
            midroll: parseInt(2) * 60000
        };
        // Todo: create a real url for requesting XML data.
        // this.bannerRequestURL = (_gd_.static.useSsl ? "https://" : "http://") + _gd_.static.serverId + ".bn.submityourgame.com/" + _gd_.static.gameId + ".xml?ver="+_gd_.version + "&url="+ _gd_.static.gdApi.href;
        const gameDataLocation = 'http://s1.bn.submityourgame.com/b92a4170784248bca2ffa0c08bec7a50.xml?ver=v501&url=http://html5.gamedistribution.com';
        const gameDataPromise = new Promise((resolve) => {
            // Todo: XML sucks, replace it some day with JSON at submityourgame.com. There is also a parse to json method in getXMLData.js, but I didn't bother.
            getXMLData(gameDataLocation).then((response) => {
                try {
                    const retrievedGameData = {
                        id: response.row[0].uid,
                        affiliate: response.row[0].aid,
                        advertisements: response.row[0].act === '1',
                        preroll: response.row[0].pre === '1',
                        midroll: parseInt(response.row[0].sat) * 60000
                    };
                    gameData = extendDefaults(gameData, retrievedGameData);
                    dankLog('API_GAME_DATA_READY', gameData, 'success');

                    // Todo: what is this?
                    (new Image()).src = 'https://analytics.tunnl.com/collect?type=html5&evt=game.play&uuid=' + this.options.gameId + '&aid=' + gameData.affiliate;

                    resolve(gameData);
                } catch (error) {
                    dankLog('API_GAME_DATA_READY', error, 'warning');
                    resolve(gameData);
                }
            });
        });

        // Only allow ads after the preroll and after a certain amount of time. This time restriction is available from gameData.
        this.adRequestTimer = undefined;

        // Start our advertisement instance.
        this.videoAdInstance = new VideoAd(this.options.advertisementSettings);
        this.videoAdInstance.start();
        const videoAdPromise = new Promise((resolve, reject) => {
            this.eventBus.subscribe('AD_SDK_MANAGER_READY', (arg) => resolve());
            this.eventBus.subscribe('AD_SDK_ERROR', (arg) => reject());
        });

        // Now check if everything is ready.
        // We use default API data if the promise fails.
        this.readyPromise = Promise.all([
            gameDataPromise,
            videoAdPromise
        ]).then((response) => {
            this.eventBus.broadcast('API_READY', {
                name: 'API_READY',
                message: 'Everything is ready.',
                status: 'success'
            });
            return response[0];
        }).catch(() => {
            this.eventBus.broadcast('API_ERROR', {
                name: 'API_ERROR',
                message: 'The API failed.',
                status: 'error'
            });
            return false;
        });

        // GD analytics
        // Create magical analytics thing.
        this._gd_ = new Analytics({
            version: 'v501',
            enable: false,
            pingTimeOut: 30000,
            regId: "",
            serverId: "",
            gameId: "",
            sVersion: "v1",
            initWarning: "First, you have to call 'Log' method to connect to the server.",
            enableDebug: false,
            getServerName: function () {
                return (('https:' === document.location.protocol) ? "https://" : "http://") + this.regId + "." + this.serverId + ".submityourgame.com/" + this.sVersion + "/";
            }
        });
        // Set namespace // Todo: still needed?
        window._gd_ = this._gd_;
        // Start _gd_
        this._gd_.start(this.options.gameId, this.options.userId);

        // General analytics
        this._analytics();
    }

    /**
     * _onEvent - Gives us a nice console log message for all our events going through the EventBus.
     * @param event: Object
     * @private
     */
    _onEvent(event) {
        // Show the event in the log.
        dankLog(event.name, event.message, event.status);
        // Send the event to the developer.
        this.options.onEvent(event);
    }

    /**
     * _analytics - Magic...
     * @private
     */
    _analytics() {
        // Load Google Analytics and Project Death Star
        if (typeof _gd_ga === 'undefined') {

            // Load Analytics
            (function(i, s, o, g, r, a, m) {
                i['GoogleAnalyticsObject'] = r;
                i[r] = i[r] || function() {
                    (i[r].q = i[r].q || []).push(arguments)
                }, i[r].l = 1 * new Date();
                a = s.createElement(o),
                    m = s.getElementsByTagName(o)[0];
                a.async = 1;
                a.src = g;
                m.parentNode.insertBefore(a, m)
            })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', '_gd_ga');

            // Create analytics id. Test id: UA-102700627-1
            _gd_ga('create', 'UA-102601800-1', {'name': 'gd'}, 'auto');
            _gd_ga('gd.send', 'pageview');

            // Project Death Star.
            // https://bitbucket.org/keygamesnetwork/datacollectionservice
            const script = document.createElement('script');
            script.innerHTML = `
                var DS_OPTIONS = {
                    id: 'GAMEDISTRIBUTION',
                    success: function(id) {
                        _gd_ga('gd.set', 'userId', id); 
                        _gd_ga('gd.set', 'dimension1', id);
                    }
                }
            `;
            document.head.appendChild(script);

            // Load Death Star
            (function(window, document, element, source) {
                const ds = document.createElement(element);
                const m = document.getElementsByTagName(element)[0];
                ds.type = 'text/javascript';
                ds.async = true;
                ds.src = source;
                m.parentNode.insertBefore(ds, m)
            })(window, document, 'script', 'https://game.gamemonkey.org/static/main.min.js');
        }
    }

    /**
     * showBanner - Used by our developer to call a video advertisement.
     * @public
     */
    showBanner() {
        this.readyPromise.then((gameData) => {
            if (gameData.advertisements) {
                // Check if ad is not called too often.
                if (typeof this.adRequestTimer !== 'undefined') {
                    const elapsed = (new Date()).valueOf() - this.adRequestTimer.valueOf();
                    if (elapsed < gameData.midroll) {
                        dankLog('API_SHOWBANNER', 'The advertisement was requested too soon after the previous advertisement was finished.', 'warning');
                    } else {
                        dankLog('API_SHOWBANNER', 'Requested the midroll advertisement. It is now ready. Pause the game.', 'success');
                        this.videoAdInstance.play();
                        this.adRequestTimer = new Date();
                    }
                } else {
                    dankLog('API_SHOWBANNER', 'Requested the preroll advertisement. It is now ready. Pause the game.', 'success');
                    this.videoAdInstance.play();
                    this.adRequestTimer = new Date();
                }
            } else {
                this.videoAdInstance.cancel();
                dankLog('API_SHOWBANNER', 'Advertisements are disabled. Start / resume the game.', 'warning');
            }
        }).catch((error) => {
            dankLog('API_SHOWBANNER', error, 'error');
        });
    }

    /**
     * customLog - GD Logger sends how many times 'CustomLog' that is called related to given by _key name. If you invoke
     * 'CustomLog' many times, it increases 'CustomLog' counter and sends this counter value.
     * @param key: String
     * @public
     */
    customLog(key) { // Todo: check how this was used.
        console.log('customlog');
        this._gd_.customlog(key);
    }

    /**
     * play - GD Logger sends how many times 'PlayGame' is called. If you invoke 'PlayGame' many times, it increases
     * 'PlayGame' counter and sends this counter value.
     * @public
     */
    play() { // Todo: check how this was used.
        console.log('play');
        this._gd_.play();
    }

    /**
     * onResumeGame - Called from various moments within the API. This sends out a callback to our developer,
     * so he/ she can allow the game to resume again. We also call resumeGame() for backwards compatibility reasons.
     * @param message: String
     * @param status: String
     */
    onResumeGame(message, status) {
        this.options.resumeGame();
        this.eventBus.broadcast('API_GAME_START', {
            name: 'API_GAME_START',
            message: message,
            status: status
        });

        // Todo: enable ga
        // _gd_ga('gd.send',{
        //     hitType: 'event',
        //     eventCategory: 'Game',
        //     eventAction: 'Resume',
        //     eventLabel: this.options.gameId
        // });
    }

    /**
     * onPauseGame - Called from various moments within the API. This sends out a callback to pause the game.
     * It is required to have the game paused when an advertisement starts playing.
     * @param message: String
     * @param status: Status
     */
    onPauseGame(message, status) {
        this.options.pauseGame();
        this.eventBus.broadcast('API_GAME_PAUSE', {
            name: 'API_GAME_PAUSE',
            message: message,
            status: status
        });


        // Todo: enable ga
        // _gd_ga('gd.send',{
        //     hitType: 'event',
        //     eventCategory: 'Game',
        //     eventAction: 'Pause',
        //     eventLabel: this.options.gameId
        // });
    }

    /**
     * openConsole - Enable debugging, we also set a value in localStorage, so we can also enable debugging without setting the property.
     * This is nice for when we're trying to debug a game that is not ours.
     * @public
     */
    openConsole() {
        try {
            const implementation = new ImplementationTest();
            implementation.start();
            localStorage.setItem('gdApi_debug', true);
        } catch (error) {
            console.log(error);
        }
    }
}

export default API;