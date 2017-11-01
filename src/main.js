'use strict';

// Todo: Add unit tests and end-to-end tests using Jasmine and Nightwatch.

import PackageJSON from '../package.json';
import VideoAd from './components/VideoAd';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';
import Analytics from './components/Analytics';

import {
    extendDefaults,
    getXMLData,
    startSession,
    getParentUrl,
    getParentDomain,
    getCookie,
} from './modules/common';
import {dankLog} from './modules/dankLog';

let instance = null;

/**
 * API
 */
class API {
    /**
     * Constructor of API.
     * @param {Object} options
     * @return {*}
     */
    constructor(options) {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        // Set some defaults. We replace them with real given
        // values further down.
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
            },
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
            date: date.getDate() + '-' + (date.getMonth() + 1) + '-' +
            date.getFullYear(),
            time: date.getHours() + ':' + date.getMinutes(),
        };
        const banner = console.log(
            '%c %c %c Gamedistribution.com HTML5 API | Version: ' +
            versionInformation.version + ' (' + versionInformation.date + ' ' +
            versionInformation.time + ') %c %c %c', 'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #ffffff');
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        // Magic
        // GD analytics - analytics.gamedistribution.com
        const version = 'v501';
        const sVersion = 'v1';
        const gameServer = this.options.userId.toLowerCase().split('-');
        const referrer = getParentUrl();
        const parentDomain = getParentDomain();
        const sessionId = startSession();
        const serverId = gameServer.splice(5, 1)[0];
        const regId = gameServer.join('-');
        const serverName = (('https:' === document.location.protocol)
            ? 'https://'
            : 'http://') + regId + '.' + serverId + '.submityourgame.com/' +
            sVersion + '/';
        this.analytics = new Analytics({
            version: version,
            sVersion: sVersion,
            gameId: this.options.gameId,
            userId: this.options.userId,
            referrer: referrer,
            sessionId: sessionId,
            serverId: serverId,
            regId: regId,
            serverName: serverName,
        });

        // Also call GA and DS.
        this._thirdPartyAnalytics();

        // Setup all event listeners.
        // We also send a Google Analytics event for each one of our events.
        this.eventBus = new EventBus();
        this.eventBus.gameId = this.options.gameId;

        // API events
        this.eventBus.subscribe('API_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_DATA_READY',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_START', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_PAUSE', (arg) => this._onEvent(arg));

        // IMA HTML5 SDK events
        this.eventBus.subscribe('AD_SDK_LOADER_READY',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_MANAGER_READY',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_REQUEST_ADS',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_FINISHED', (arg) => this._onEvent(arg));

        // Ad events
        this.eventBus.subscribe('AD_CANCELED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame(
                'Advertisement error, no worries, start / resume the game.',
                'warning');
        });
        this.eventBus.subscribe('AD_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SAFETY_TIMER', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_BREAK_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_METADATA', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('ALL_ADS_COMPLETED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame(
                'Advertisement(s) are done. Start / resume the game.',
                'success');
        });
        this.eventBus.subscribe('CLICK', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('COMPLETE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', (arg) => {
            this._onEvent(arg);
            this.onPauseGame('New advertisements requested and loaded',
                'success');
        });
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('DURATION_CHANGE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('FIRST_QUARTILE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('IMPRESSION', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('INTERACTION', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LINEAR_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LOADED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LOG', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('MIDPOINT', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('PAUSED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('RESUMED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPABLE_STATE_CHANGED',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('STARTED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('THIRD_QUARTILE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('USER_CLOSE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_MUTED', (arg) => this._onEvent(arg));

        // Only allow ads after the preroll and after a certain amount of time.
        // This time restriction is available from gameData.
        this.adRequestTimer = undefined;

        // Setup our video ad promise, which should be resolved before an ad
        // can be called from a click event.
        const videoAdPromise = new Promise((resolve, reject) => {
            // The ad is preloaded and ready.
            this.eventBus.subscribe('AD_SDK_MANAGER_READY', (arg) => resolve());
            // The IMA SDK failed.
            this.eventBus.subscribe('AD_SDK_ERROR', (arg) => reject());
            // It can happen that the first ad request failed... unlucky.
            this.eventBus.subscribe('AD_CANCELED', (arg) => reject());
        });

        // Get game data. If it fails we use default data, so this should
        // always resolve.
        let gameData = {
            uuid: 'ed40354e-856f-4aae-8cca-c8b98d70dec3',
            affiliate: 'A-GAMEDIST',
            advertisements: true,
            preroll: true,
            midroll: parseInt(2) * 60000,
        };

        const gameDataLocation = (('https:' === document.location.protocol)
            ? 'https://'
            : 'http://') + serverId + '.bn.submityourgame.com/' +
            this.options.gameId + '.xml?ver=' + version + '&url=' + referrer;
        const gameDataPromise = new Promise((resolve) => {
            getXMLData(gameDataLocation).then((response) => {
                try {
                    const retrievedGameData = {
                        uuid: response.row[0].uid,
                        affiliate: response.row[0].aid,
                        advertisements: response.row[0].act === '1',
                        preroll: response.row[0].pre === '1',
                        midroll: parseInt(response.row[0].sat) * 60000,
                    };
                    gameData = extendDefaults(gameData, retrievedGameData);
                    dankLog('API_GAME_DATA_READY', gameData, 'success');

                    // Start our advertisement instance. Setting up the
                    // adsLoader should resolve VideoAdPromise.
                    this.videoAdInstance = new VideoAd(
                        this.options.advertisementSettings);
                    this.videoAdInstance.gameId = this.options.gameId;

                    // Get our adTagId from Tunnl.
                    // Todo: This is just temporary until new Tunnl is released.
                    const tagUrl = 'https://pub.tunnl.com/at?id=' +
                        gameData.uuid + '&pageurl=' + parentDomain +
                        '&type=1&time=' + new Date().toDateString();
                    const request = new Request(tagUrl, {method: 'GET'});
                    return fetch(request).
                        then((response) => {
                            // Make sure we're dealing here with json content.
                            const contentType = response.headers.get(
                                'content-type');
                            if (contentType &&
                                contentType.includes('application/json')) {
                                return response.json();
                            }
                            throw new TypeError('Oops, we haven\'t got JSON!');
                        }).
                        then(json => {
                            let adTagId = '';
                            if (json.AdTagId) {
                                adTagId = json.AdTagId;
                                dankLog('API_TAG_ID_READY', adTagId, 'success');
                            } else {
                                dankLog('API_TAG_ID_READY', adTagId, 'warning');
                            }

                            // Record a game "play"-event in Tunnl.
                            dankLog('API_RECORD_GAME_PLAY', '', 'success');
                            (new Image()).src = 'https://pub.tunnl.com/DistEvent?tid=' +
                                adTagId + '&game_id=' +
                                gameData.uuid +
                                '&disttype=1&eventtype=1';

                            // Create the actual ad tag.
                            this.videoAdInstance.tag = 'https://pub.tunnl.com/' +
                                'opp?tid=' + adTagId +
                                '&player_width=640' +
                                '&player_height=480' +
                                '&page_url=' + encodeURIComponent(referrer) +
                                '&game_id=' + gameData.uuid;

                            // Enable some debugging perks.
                            try {
                                if (localStorage.getItem('gdApi_debug')) {
                                    // So we can set a custom tag.
                                    if (localStorage.getItem('gdApi_tag')) {
                                        this.videoAdInstance.tag =
                                            localStorage.getItem('gdApi_tag');
                                    }
                                    // So we can call mid rolls quickly.
                                    if (localStorage.getItem('gdApi_midroll')) {
                                        gameData.midroll =
                                            localStorage.getItem(
                                                'gdApi_midroll');
                                    }
                                }
                            } catch (error) {
                                console.log(error);
                            }

                            this.videoAdInstance.start();

                            // Check if preroll is enabled. If so, then we
                            // start the adRequestTimer, blocking any attempts
                            // to call an advertisement too soon.
                            if (!gameData.preroll) {
                                this.adRequestTimer = new Date();
                                this.videoAdInstance.preroll = false;
                            }

                            resolve(gameData);
                        }).
                        catch((error) => {
                            console.log(error);
                            resolve(gameData);
                        });
                } catch (error) {
                    dankLog('API_GAME_DATA_READY', error, 'warning');
                    resolve(gameData);
                }
            });
        });

        // Now check if everything is ready.
        // We use default API data if the promise fails.
        this.readyPromise = Promise.all([
            gameDataPromise,
            videoAdPromise,
        ]).then((response) => {
            let eventName = 'API_READY';
            let eventMessage = 'Everything is ready.';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'success',
                analytics: {
                    category: 'API',
                    action: eventName,
                    label: this.options.gameId,
                },
            });
            return response[0];
        }).catch(() => {
            let eventName = 'API_ERROR';
            let eventMessage = 'The API failed.';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'error',
                analytics: {
                    category: 'API',
                    action: eventName,
                    label: this.options.gameId,
                },
            });
            return false;
        });
    }

    /**
     * _onEvent
     * Gives us a nice console log message for all our events going
     * through the EventBus.
     * @param {Object} event
     * @private
     */
    _onEvent(event) {
        // Show the event in the log.
        dankLog(event.name, event.message, event.status);
        // Push out a Google event for each event. Makes our
        // life easier. I think.
        try {
            /* eslint-disable */
            if (typeof ga !== 'undefined') {
                ga('gd.send', {
                    hitType: 'event',
                    eventCategory: (event.analytics.category)
                        ? event.analytics.category
                        : '',
                    eventAction: (event.analytics.action)
                        ? event.analytics.action
                        : '',
                    eventLabel: (event.analytics.label)
                        ? event.analytics.label
                        : '',
                });
            }
            /* eslint-enable */
        } catch (error) {
            console.log(error);
        }
        // Now send the event to the developer.
        this.options.onEvent(event);
    }

    /**
     * _thirdPartyAnalytics
     * Magic...
     * @private
     */
    _thirdPartyAnalytics() {
        /* eslint-disable */
        // Load Google Analytics so we can push out a Google event for
        // each of our events.
        if (typeof ga === 'undefined') {
            (function(i, s, o, g, r, a, m) {
                i['GoogleAnalyticsObject'] = r;
                i[r] = i[r] || function() {
                    (i[r].q = i[r].q || []).push(arguments);
                }, i[r].l = 1 * new Date();
                a = s.createElement(o),
                    m = s.getElementsByTagName(o)[0];
                a.async = 1;
                a.src = g;
                m.parentNode.insertBefore(a, m);
            })(window, document, 'script',
                'https://www.google-analytics.com/analytics.js', 'ga');
        }
        ga('create', 'UA-102601800-1', {'name': 'gd'}, 'auto');
        // Inject Death Star id's to the page view.
        const lcl = getCookie('brzcrz_local');
        if (lcl) {
            ga('gd.set', 'userId', lcl);
            ga('gd.set', 'dimension1', lcl);
        }
        ga('gd.send', 'pageview');

        // Project Death Star.
        // https://bitbucket.org/keygamesnetwork/datacollectionservice
        const script = document.createElement('script');
        script.innerHTML = `
            var DS_OPTIONS = {
                id: 'GAMEDISTRIBUTION',
                success: function(id) {
                    ga('gd.set', 'userId', id); 
                    ga('gd.set', 'dimension1', id);
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
            m.parentNode.insertBefore(ds, m);
        })(window, document, 'script',
            'https://game.gamemonkey.org/static/main.min.js');
        /* eslint-enable */
    }

    /**
     * showBanner
     * Used by our developer to call a video advertisement.
     * @public
     */
    showBanner() {
        this.readyPromise.then((gameData) => {
            if (gameData.advertisements) {
                // Check if ad is not called too often.
                if (typeof this.adRequestTimer !== 'undefined') {
                    const elapsed = (new Date()).valueOf() -
                        this.adRequestTimer.valueOf();
                    if (elapsed < gameData.midroll) {
                        dankLog('API_SHOW_BANNER',
                            'The advertisement was requested too soon after ' +
                            'the previous advertisement was finished.',
                            'warning');
                        // Resume game for legacy purposes.
                        this.onResumeGame(
                            'Just resume the game...',
                            'success');
                    } else {
                        dankLog('API_SHOW_BANNER',
                            'Requested the midroll advertisement.',
                            'success');
                        this.videoAdInstance.play();
                        this.adRequestTimer = new Date();
                    }
                } else {
                    dankLog('API_SHOW_BANNER',
                        'Requested the preroll advertisement.',
                        'success');
                    this.videoAdInstance.play();
                    this.adRequestTimer = new Date();
                }
            } else {
                this.videoAdInstance.cancel();
                dankLog('API_SHOW_BANNER',
                    'Advertisements are disabled.',
                    'warning');
            }
        }).catch((error) => {
            dankLog('API_SHOW_BANNER', error, 'error');
        });
    }

    /**
     * customLog
     * GD Logger sends how many times 'CustomLog' that is called
     * related to given by _key name. If you invoke 'CustomLog' many times,
     * it increases 'CustomLog' counter and sends this counter value.
     * @param {String} key
     * @public
     */
    customLog(key) { // Todo: should be public?
        this.analytics.customLog(key);
    }

    /**
     * play
     * GD Logger sends how many times 'PlayGame' is called. If you
     * invoke 'PlayGame' many times, it increases 'PlayGame' counter and
     * sends this counter value.
     * @public
     */
    play() { // Todo: should be public?
        this.analytics.play();
    }

    /**
     * onResumeGame
     * Called from various moments within the API. This sends
     * out a callback to our developer, so he/ she can allow the game to
     * resume again. We also call resumeGame() for backwards
     * compatibility reasons.
     * @param {String} message
     * @param {String} status
     */
    onResumeGame(message, status) {
        this.options.resumeGame();
        let eventName = 'API_GAME_START';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: status,
            analytics: {
                category: 'API',
                action: eventName,
                label: this.options.gameId,
            },
        });
    }

    /**
     * onPauseGame
     * Called from various moments within the API. This sends
     * out a callback to pause the game. It is required to have the game
     * paused when an advertisement starts playing.
     * @param {String} message
     * @param {String} status
     */
    onPauseGame(message, status) {
        this.options.pauseGame();
        let eventName = 'API_GAME_PAUSE';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: status,
            analytics: {
                category: 'API',
                action: eventName,
                label: this.options.gameId,
            },
        });
    }

    /**
     * openConsole
     * Enable debugging, we also set a value in localStorage,
     * so we can also enable debugging without setting the property.
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