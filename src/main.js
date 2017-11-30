'use strict';

import PackageJSON from '../package.json';
import VideoAd from './components/VideoAd';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';

import {dankLog} from './modules/dankLog';
import {
    extendDefaults,
    getParentUrl,
    getParentDomain,
    getCookie,
} from './modules/common';

let instance = null;

/**
 * SDK
 */
class SDK {
    /**
     * Constructor of SDK.
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
            if (this.options.debug || localStorage.getItem('gd_debug')) {
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
            '%c %c %c Gamedistribution.com HTML5 SDK | Version: ' +
            versionInformation.version + ' (' + versionInformation.date + ' ' +
            versionInformation.time + ') %c %c %c', 'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #ffffff');
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        // Get referrer domain data.
        const referrer = getParentUrl();
        const parentDomain = getParentDomain();

        // Call Google Analytics.
        this._googleAnalytics();

        // Call Death Star.
        this._deathStar();

        // Setup all event listeners.
        // We also send a Google Analytics event for each one of our events.
        this.eventBus = new EventBus();
        this.eventBus.gameId = this.options.gameId;

        // SDK events
        this.eventBus.subscribe('SDK_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_DATA_READY',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_START', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_PAUSE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_TAG_ID_READY',
            (arg) => this._onEvent(arg));

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
            // Do a request to flag the sdk as available within the catalog.
            // This flagging allows our developer to do a request to publish
            // this game, otherwise this option would remain unavailable.
            const expression = 'controlpanel/game/edit/' + this.options.gameId;
            const regex = new RegExp(expression, 'i');
            const t = getParentUrl();
            if (t.match(regex)) {
                (new Image()).src =
                    'https://game.api.gamedistribution.com/game/updateapi/' +
                    this.options.gameId;
            }
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

        // Game API.
        // If it fails we use default data, so this should always resolve.
        let gameData = {
            gameId: '49258a0e497c42b5b5d87887f24d27a6', // Jewel Burst.
            affiliate: 'A-GAMEDIST',
            advertisements: true,
            preroll: true,
            midroll: 2 * 60000,
            title: '',
            tags: '',
            category: '',
        };
        const gameDataPromise = new Promise((resolve) => {
            const gameDataUrl = 'https://game.api.gamedistribution.com/' +
                'game/get/' + this.options.gameId.replace(/-/g, '') +
                '?domain=' + parentDomain;
            const gameDataRequest = new Request(gameDataUrl, {method: 'GET'});
            fetch(gameDataRequest).
                then((response) => {
                    const contentType = response.headers.get('content-type');
                    if (contentType &&
                        contentType.includes('application/json')) {
                        return response.json();
                    } else {
                        throw new TypeError('Oops, we didn\'t get JSON!');
                    }
                }).
                then(json => {
                    if (!json.success && json.error) {
                        dankLog('SDK_GAME_DATA_READY', json.error, 'warning');
                    }
                    try {
                        const retrievedGameData = {
                            gameId: json.result.game.gameMd5.replace(/-/g, ''),
                            affiliate: json.result.affiliate.affiliateId,
                            advertisements: json.result.game.enableAds,
                            preroll: json.result.game.preRoll,
                            midroll: json.result.game.timeAds * 60000,
                            title: json.result.game.title,
                            category: json.result.game.category,
                            tags: json.result.game.tags,
                        };
                        gameData = extendDefaults(gameData, retrievedGameData);
                        dankLog('SDK_GAME_DATA_READY', gameData, 'success');

                        // Try to send some additional analytics to Death Star.
                        try {
                            let tagsArray = [];
                            gameData.tags.forEach((tag) => {
                                tagsArray.push(tag.title.toLowerCase());
                            });
                            ga('gd.set', 'dimension2',
                                gameData.title.toLowerCase());
                            ga('gd.set', 'dimension3', tagsArray.join(', '));
                        } catch (error) {
                            console.log(error);
                        }
                    } catch (error) {
                        dankLog('SDK_GAME_DATA_READY', error, 'warning');
                    }
                    resolve(gameData);
                }).
                catch((error) => {
                    dankLog('SDK_GAME_DATA_READY', error, 'success');
                    resolve(gameData);
                });
        });

        // Tunnl.
        // Get the affiliate id from Tunnl.
        // If it fails we continue the game, so this should always resolve.
        const adTagIdPromise = new Promise((resolve) => {
            const adTagIdUrl = 'https://ana.tunnl.com/at?id=' +
                this.options.gameId + '&pageurl=' + parentDomain + '&type=1';
            const adTagIdRequest = new Request(adTagIdUrl, {method: 'GET'});
            const eventName = 'SDK_TAG_ID_READY';
            let adTagId = 'T-17112073197';
            fetch(adTagIdRequest).then(response => {
                const contentType = response.headers.get('content-type');
                if (contentType &&
                    contentType.includes('application/json')) {
                    return response.json();
                } else {
                    throw new TypeError('Oops, we didn\'t get JSON!');
                }
            }).then(json => {
                if (json.AdTagId) {
                    adTagId = json.AdTagId;
                    this.eventBus.broadcast(eventName, {
                        name: eventName,
                        message: adTagId,
                        status: 'success',
                        analytics: {
                            category: 'SDK',
                            action: eventName,
                            label: parentDomain,
                        },
                    });
                    resolve(adTagId);
                } else {
                    this.eventBus.broadcast(eventName, {
                        name: eventName,
                        message: adTagId,
                        status: 'warning',
                        analytics: {
                            category: 'SDK',
                            action: eventName,
                            label: parentDomain,
                        },
                    });
                }
                resolve(adTagId);
            }).catch((error) => {
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: error,
                    status: 'warning',
                    analytics: {
                        category: 'SDK',
                        action: eventName,
                        label: parentDomain,
                    },
                });
                resolve(adTagId);
            });
        });

        // Create the ad tag.
        // This promise can trigger the videoAdPromise.
        Promise.all([
            gameDataPromise,
            adTagIdPromise,
        ]).then((response) => {
            // Start our advertisement instance. Setting up the
            // adsLoader should resolve VideoAdPromise.
            this.videoAdInstance = new VideoAd(
                this.options.advertisementSettings);
            this.videoAdInstance.gameId = this.options.gameId;

            // Record a game "play"-event in Tunnl.
            dankLog('SDK_RECORD_GAME_PLAY', '', 'success');
            (new Image()).src = 'https://ana.tunnl.com/distevent?tid=' +
                response[1] + '&game_id=' +
                this.options.gameId +
                '&disttype=1&eventtype=1';

            // Create the actual ad tag.
            this.videoAdInstance.tag = 'https://pub.tunnl.com/' +
                'opp?tid=' + response[1] +
                '&player_width=640' +
                '&player_height=480' +
                '&page_url=' + encodeURIComponent(referrer) +
                '&game_id=' + this.options.gameId;

            // Enable some debugging perks.
            try {
                if (localStorage.getItem('gd_debug')) {
                    // So we can set a custom tag.
                    if (localStorage.getItem('gd_tag')) {
                        this.videoAdInstance.tag =
                            localStorage.getItem('gd_tag');
                    }
                    // So we can call mid rolls quickly.
                    if (localStorage.getItem('gd_midroll')) {
                        response[0].midroll =
                            localStorage.getItem('gd_midroll');
                    }
                }
            } catch (error) {
                console.log(error);
            }

            // Check if the preroll and auto play is enabled. If so, then we
            // start the adRequestTimer, blocking any attempts
            // to call any subsequent advertisement too soon, as the preroll
            // will be called automatically from our video advertisement
            // instance, instead of calling the showBanner method.
            if (response[0].preroll && this.videoAdInstance.options.autoplay) {
                this.adRequestTimer = new Date();
            }

            this.videoAdInstance.start();
        });

        // Ad ready or failed.
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

        // Now check if everything is ready.
        // We use default SDK data if the promise fails.
        this.readyPromise = Promise.all([
            gameDataPromise,
            videoAdPromise,
        ]).then((response) => {
            let eventName = 'SDK_READY';
            let eventMessage = 'Everything is ready.';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'success',
                analytics: {
                    category: 'SDK',
                    action: eventName,
                    label: this.options.gameId,
                },
            });
            return response[0];
        }).catch(() => {
            let eventName = 'SDK_ERROR';
            let eventMessage = 'The SDK failed.';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'error',
                analytics: {
                    category: 'SDK',
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
     * _googleAnalytics
     * @private
     */
    _googleAnalytics() {
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

    }

    /**
     * _deathStar
     * @private
     */
    _deathStar() {
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
                        dankLog('SDK_SHOW_BANNER',
                            'The advertisement was requested too soon after ' +
                            'the previous advertisement was finished.',
                            'warning');
                        // Resume game for legacy purposes.
                        this.onResumeGame(
                            'Just resume the game...',
                            'success');
                    } else {
                        dankLog('SDK_SHOW_BANNER',
                            'Requested the midroll advertisement.',
                            'success');
                        this.videoAdInstance.requestAds();
                        this.videoAdInstance.play();
                        this.adRequestTimer = new Date();
                    }
                } else {
                    dankLog('SDK_SHOW_BANNER',
                        'Requested the preroll advertisement.',
                        'success');
                    this.videoAdInstance.play();
                    this.adRequestTimer = new Date();
                }
            } else {
                this.videoAdInstance.cancel();
                dankLog('SDK_SHOW_BANNER',
                    'Advertisements are disabled.',
                    'warning');
            }
        }).catch((error) => {
            dankLog('SDK_SHOW_BANNER', error, 'error');
        });
    }

    /**
     * customLog [deprecated]
     * GD Logger sends how many times 'CustomLog' that is called
     * related to given by _key name. If you invoke 'CustomLog' many times,
     * it increases 'CustomLog' counter and sends this counter value.
     * @param {String} key
     * @public
     */
    customLog(key) {
        // ...
    }

    /**
     * play [deprecated]
     * GD Logger sends how many times 'PlayGame' is called. If you
     * invoke 'PlayGame' many times, it increases 'PlayGame' counter and
     * sends this counter value.
     * @public
     */
    play() {
        // ...
    }

    /**
     * onResumeGame
     * Called from various moments within the SDK. This sends
     * out a callback to our developer, so he/ she can allow the game to
     * resume again. We also call resumeGame() for backwards
     * compatibility reasons.
     * @param {String} message
     * @param {String} status
     */
    onResumeGame(message, status) {
        this.options.resumeGame();
        let eventName = 'SDK_GAME_START';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: status,
            analytics: {
                category: 'SDK',
                action: eventName,
                label: this.options.gameId,
            },
        });
    }

    /**
     * onPauseGame
     * Called from various moments within the SDK. This sends
     * out a callback to pause the game. It is required to have the game
     * paused when an advertisement starts playing.
     * @param {String} message
     * @param {String} status
     */
    onPauseGame(message, status) {
        this.options.pauseGame();
        let eventName = 'SDK_GAME_PAUSE';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: status,
            analytics: {
                category: 'SDK',
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
            localStorage.setItem('gd_debug', true);
        } catch (error) {
            console.log(error);
        }
    }
}

export default SDK;
