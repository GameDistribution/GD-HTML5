'use strict';

import 'es6-promise/auto';
import 'whatwg-fetch';

if (!global._babelPolyfill) {
    require('babel-polyfill');
}

import PackageJSON from '../package.json';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';
import VideoAd from './components/VideoAd';
import MessageRouter from './components/MessageRouter';

import {AdType} from './modules/adType';
import {SDKEvents, IMAEvents} from './modules/eventList';
import {dankLog, setDankLog} from './modules/dankLog';
import {extendDefaults, getParentUrl, getParentDomain, getQueryParams, getScript, getIframeDepth, parseJSON, getMobilePlatform} from './modules/common';

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

        const defaultGameId = '4f3d7d38d24b740c95da2b03dc3a2333'; // Basket and Ball
        const defaults = {
            debug: false,
            testing: false,
            gameId: defaultGameId,
            prefix: 'gdsdk__',
            onEvent: function(event) {
                // ...
            },
            /**
             * [DEPRECATED]
             * Properties and callbacks used for Flash games and older HTML5 implementations.
             */
            flashSettings: {
                adContainerId: '',
                splashContainerId: '',
            },
            advertisementSettings: {},
            resumeGame: function() {
                // ...
            },
            pauseGame: function() {
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

        // Set a version banner within the developer console.
        const version = PackageJSON.version;
        const banner = console.log(
            '%c %c %c GameDistribution.com HTML5 SDK | Version: ' + version + ' %c %c %c',
            'background: #9854d8',
            'background: #6c2ca7',
            'color: #fff; background: #450f78;',
            'background: #6c2ca7',
            'background: #9854d8',
            'background: #ffffff'
        );
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        // Get referrer domain data.
        const parentURL = getParentUrl();
        const parentDomain = getParentDomain();

        // Record a game "play"-event in Tunnl revenue reporting.
        new Image().src = 'https://ana.tunnl.com/event' + '?page_url=' + encodeURIComponent(parentURL) + '&game_id=' + this.options.gameId + '&eventtype=1';

        // Load tracking services.
        this.constructor._loadGoogleAnalytics();

        // Whitelabel option for disabling ads.
        this.whitelabelPartner = false;
        const xanthophyll = getQueryParams('xanthophyll');
        if (xanthophyll.hasOwnProperty('xanthophyll') && xanthophyll['xanthophyll'] === 'true') {
            this.whitelabelPartner = true;
            dankLog('White label publisher', `${this.whitelabelPartner}`, 'success');
        }

        try {
            // Enable debugging if visiting through our developer admin.
            if (parentDomain === 'developer.gamedistribution.com') {
                localStorage.setItem('gd_debug', 'true');
                localStorage.setItem('gd_midroll', '0');
                localStorage.setItem(
                    'gd_tag',
                    `https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator=`
                );
            } else if (parentDomain === 'html5.api.gamedistribution.com' || parentDomain === 'localhost:3000') {
                localStorage.setItem('gd_debug', 'true');
                localStorage.setItem('gd_midroll', '0');
            }
            // Open the debug console when debugging is enabled.
            if (localStorage.getItem('gd_debug')) {
                this.openConsole();
            }
        } catch (error) {
            // console.log(error);
        }

        const userDeclinedTracking = document.location.search.indexOf('gdpr-tracking=0') >= 0 || document.cookie.indexOf('ogdpr_tracking=0') >= 0;

        // Message router initialization
        this.msgrt = new MessageRouter({
            gameId: this.options.gameId,
            hours: new Date().getHours(),
            domain: parentDomain,
            referrer: parentURL,
            depth: getIframeDepth(),
            version: version,
            tracking: userDeclinedTracking,
            whitelabel: this.whitelabelPartner,
            platform: getMobilePlatform(),
        });

        // send loaded status to router
        this.msgrt.send('loaded');

        // Setup all event listeners.
        // We also send a Google Analytics event for each one of our events.
        this._subscribeToEvents(this.options.gameId, parentDomain);

        // GDPR (General Data Protection Regulation).
        // Broadcast GDPR events to our game developer.
        // They can hook into these events to kill their own solutions.
        this._gdpr(parentDomain);

        // Only allow ads after the preroll and after a certain amount of time.
        // This time restriction is available from gameData.
        this.adRequestTimer = undefined;
        this.lastRequestedAdType = undefined;

        // VideoAd instance.
        this.adInstance = null;

        // Get the game data once.
        // Todo: little bit of anti-pattern here with the promise and async.
        this.readyPromise = new Promise(async (resolve, reject) => {
            try {
                // Get the actual game data.
                if (this.options.gameId === defaultGameId) {
                    let eventName = 'SDK_ERROR';
                    const eventError = 'Check correctness of your GAME ID. Otherwise, no revenue will be recorded.';
                    this.eventBus.broadcast(eventName, {
                        name: eventName,
                        message: eventError,
                        status: 'error',
                        analytics: {
                            category: 'SDK',
                            action: eventName,
                            label: eventError,
                        },
                    });
                }

                const gameData = await this._getGameData(this.options.gameId, parentDomain);

                // Enable some debugging perks.
                if (localStorage.getItem('gd_debug')) {
                    if (localStorage.getItem('gd_midroll')) {
                        gameData.midroll = parseInt(localStorage.getItem('gd_midroll'));
                    }
                }

                // Test domains
                this.options.testing = this.options.testing || (gameData.diagnostic && gameData.diagnostic.testing === true);
                if (this.options.testing) {
                    dankLog('Testing enabled', this.options.testing, 'info');
                }
                // If the preroll is disabled, we just set the adRequestTimer.
                // That way the first call for an advertisement is cancelled.
                // Else if the pre-roll is true and auto-play is true, then we
                // create a splash screen so we can force a user action before
                // starting a video advertisement.
                //
                // SpilGames demands a GDPR consent wall to be displayed.
                const isConsentDomain = gameData.gdpr && gameData.gdpr.consent === true;
                if (!gameData.preroll) {
                    this.adRequestTimer = new Date();
                } else if (this.options.advertisementSettings.autoplay || isConsentDomain) {
                    this._createSplash(gameData, isConsentDomain);
                }

                // Create a new VideoAd instance (singleton).
                this.adInstance = new VideoAd(
                    // Deprecated parameters.
                    this.options.flashSettings.adContainerId,
                    this.options.advertisementSettings
                );

                // Set some targeting/ reporting values.
                this.adInstance.parentURL = parentURL;
                this.adInstance.parentDomain = parentDomain;
                this.adInstance.gameId = gameData.gameId;
                this.adInstance.category = gameData.category;
                this.adInstance.tags = gameData.tags;

                // Wait for the adInstance to be ready.
                await this.adInstance.start();

                if (!(gameData.bloc_gard && gameData.bloc_gard.enabled === true)) {
                    // Try to preload an interstitial for our first showAd() request.
                    await this.adInstance.preloadAd(AdType.Interstitial, true);
                }

                // Send out event for modern implementations.
                let eventName = 'SDK_READY';
                let eventMessage = 'Everything is ready.';
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: eventMessage,
                    status: 'success',
                    analytics: {
                        category: 'SDK',
                        action: eventName,
                        label: this.options.gameId + '',
                    },
                });

                // Call legacy backwards compatibility method.
                this.options.onInit(eventMessage);

                // Return the gameData.
                resolve(gameData);
            } catch (error) {
                // Send out event for modern implementations.
                let eventName = 'SDK_ERROR';
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: error.message,
                    status: 'error',
                    analytics: {
                        category: 'SDK',
                        action: eventName,
                        label: error.message,
                    },
                });

                // [DEPRECATED] Call legacy backwards compatibility method.
                this.options.onError(error);

                // Just resume the game.
                this.onResumeGame(error.message, 'warning');

                // Something went wrong.
                reject(error);
            }
        });
    }

    /**
     * _loadGoogleAnalytics
     * @private
     */
    static _loadGoogleAnalytics() {
        const userDeclinedTracking = document.location.search.indexOf('gdpr-tracking=0') >= 0 || document.cookie.indexOf('ogdpr_tracking=0') >= 0;

        const googleScriptPaths = ['https://www.google-analytics.com/analytics.js'];

        // Load Google Analytics.
        getScript(googleScriptPaths[0], 'gdsdk_google_analytics', {
            alternates: googleScriptPaths,
            exists: () => {
                return window['ga'];
            },
        })
            .then(() => {
                window['ga'](
                    'create',
                    'UA-102601800-1',
                    {
                        name: 'gd',
                        cookieExpires: 90 * 86400,
                        sampleRate: 3, // Specifies what percentage of users should be tracked. This defaults to 100 (no users are sampled out) but large sites may need to use a lower sample rate to stay within Google Analytics processing limits.
                    },
                    'auto'
                );
                window['ga']('gd.send', 'pageview');

                // Anonymize IP for GDPR purposes.
                if (!userDeclinedTracking) {
                    window['ga']('gd.set', 'anonymizeIp', true);
                }
            })
            .catch(error => {
                throw new Error(error);
            });

        if (!userDeclinedTracking) {
            const lotameScriptPaths = ['https://tags.crwdcntrl.net/c/13998/cc.js?ns=_cc13998'];
            getScript(lotameScriptPaths[0], 'LOTCC_13998', {alternates: lotameScriptPaths})
                .then(() => {
                    if (
                        typeof window['_cc13998'] === 'object' &&
                        typeof window['_cc13998'].bcpf === 'function' &&
                        typeof window['_cc13998'].add === 'function'
                    ) {
                        window['_cc13998'].add('act', 'play');
                        window['_cc13998'].add('med', 'game');

                        // Must wait for the load event, before running Lotame.
                        if (document.readyState === 'complete') {
                            window['_cc13998'].bcpf();
                        } else {
                            window['_cc13998'].bcp();
                        }
                    }
                })
                .catch(error => {
                    throw new Error(error);
                });
        }
    }

    /**
     * _subscribeToEvents
     * @param {String} id
     * @param {String} domain
     * @private
     */
    _subscribeToEvents(id, domain) {
        this.eventBus = new EventBus();
        SDKEvents.forEach(eventName => this.eventBus.subscribe(eventName, event => this._onEvent(event), 'sdk'));

        this.eventBus.subscribe('AD_SDK_CANCELED', () => {
            this.onResumeGame('Advertisement error, no worries, start / resume the game.', 'warning');
            this.msgrt.send('ad.cancelled');
        },'sdk');

        IMAEvents.forEach(eventName => this.eventBus.subscribe(eventName, event => this._onEvent(event), 'ima'));
        this.eventBus.subscribe(
            'COMPLETE',
            () => {
                // Do a request to flag the sdk as available within the catalog.
                // This flagging allows our developer to do a request to publish
                // this game, otherwise this option would remain unavailable.
                if (domain === 'developer.gamedistribution.com' || new RegExp('^localhost').test(domain) === true) {
                    new Image().src = 'https://game.api.gamedistribution.com/game/hasapi/' + id;
                    try {
                        let message = JSON.stringify({
                            type: 'GD_SDK_IMPLEMENTED',
                            gameID: id,
                        });
                        if (window.location !== window.top.location) {
                            window.top.postMessage(message, '*');
                        } else if (window.opener !== null && window.opener.location !== window.location) {
                            window.opener.postMessage(message, '*');
                        }
                    } catch (e) {
                        // For some reason, the postmessage didn't work (maybe there is no parent).
                        // It's ok though, we have the image fallback
                    }
                }
            },
            'ima'
        );
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', () => this.onPauseGame('New advertisements requested and loaded', 'success'), 'ima');
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', () => this.onResumeGame('Advertisement(s) are done. Start / resume the game.', 'success'), 'ima');

        this.eventBus.subscribe(
            'IMPRESSION',
            arg => {
                this.msgrt.send('ad.impression');

                // set timer for future interstitial requests.
                if (this.lastRequestedAdType === AdType.Interstitial) {
                    this.adRequestTimer = new Date();
                }

                // Lotame tracking.
                try {
                    window['_cc13998'].bcpw('genp', 'ad video');
                    window['_cc13998'].bcpw('act', 'ad impression');
                } catch (error) {
                    // No need to throw an error or log. It's just Lotame.
                }
            },
            'ima'
        );

        this.eventBus.subscribe(
            'SKIPPED',
            arg => {
                // Lotame tracking.
                try {
                    window['_cc13998'].bcpw('act', 'ad skipped');
                } catch (error) {
                    // No need to throw an error or log. It's just Lotame.
                }
            },
            'ima'
        );

        this.eventBus.subscribe(
            'AD_ERROR',
            arg => {
                this.msgrt.send('ad.error', {message: arg.message});
            },
            'ima'
        );

        this.eventBus.subscribe(
            'CLICK',
            arg => {
                this.msgrt.send('ad.click');

                // Lotame tracking.
                try {
                    window['_cc13998'].bcpw('act', 'ad click');
                } catch (error) {
                    // No need to throw an error or log. It's just Lotame.
                }
            },
            'ima'
        );

        this.eventBus.subscribe(
            'COMPLETE',
            arg => {
                this.msgrt.send('ad.complete');

                // Lotame tracking.
                try {
                    window['_cc13998'].bcpw('act', 'ad complete');
                } catch (error) {
                    // No need to throw an error or log. It's just Lotame.
                }
            },
            'ima'
        );

        this.eventBus.subscribe(
            'AD_SDK_REQUEST',
            arg => {
                // Pre Adrequest event in Tunnl Reports
                new Image().src = `https://ana.tunnl.com/event?page_url=${encodeURIComponent(getParentUrl())}&game_id=${this.options.gameId}&eventtype=${2}`;
            },
            'sdk'
        );

        this.eventBus.subscribe(
            'SDK_ERROR',
            arg => {
                if (arg.message.indexOf('imasdk') != -1) {
                    this.msgrt.send(`blocker`);
                    // AdBlocker event in Tunnl Reports
                    new Image().src = `https://ana.tunnl.com/event?page_url=${encodeURIComponent(getParentUrl())}&game_id=${
                        this.options.gameId
                    }&eventtype=${3}`;
                } else {
                    this.msgrt.send(`sdk_error`, arg.message);
                }
            },
            'sdk'
        );

        this.eventBus.subscribe(
            'AD_REQUEST',
            arg => {
                this.msgrt.send(`req.ad.${arg.message}`);
            },
            'sdk'
        );

        this.eventBus.subscribe(
            'AD_REQUEST_KEYS_EMPTY',
            arg => {
                this.msgrt.send(`req.ad.keys.empty`, {message: arg.message, details: arg.details});
            },
            'sdk'
        );

        this.eventBus.subscribe(
            'AD_REQUEST_KEYS_FALLBACK',
            arg => {
                this.msgrt.send(`req.ad.keys.fallback`, {message: arg.message, details: arg.details});
            },
            'sdk'
        );
    }

    /**
     * _gdpr
     * GDPR (General Data Protection Regulation).
     * Broadcast GDPR events to our game developer.
     * They can hook into these events to kill their own solutions/ services.
     * @param {String} domain
     * @private
     */
    _gdpr(domain) {
        const tracking = document.location.search.indexOf('gdpr-tracking') >= 0;
        const trackingConsent = document.location.search.indexOf('gdpr-tracking=1') >= 0;
        const targeting = document.location.search.indexOf('gdpr-targeting') >= 0;
        const targetingConsent = document.location.search.indexOf('gdpr-targeting=1') >= 0;
        const third = document.location.search.indexOf('gdpr-third-party') >= 0;
        const thirdConsent = document.location.search.indexOf('gdpr-third-party=1') >= 0;
        const GeneralDataProtectionRegulation = [
            {
                name: 'SDK_GDPR_TRACKING',
                message: tracking ? (trackingConsent ? 'Allowed' : 'Not allowed') : 'Not set',
                status: trackingConsent ? 'success' : 'warning',
                label: tracking ? (trackingConsent ? '1' : '0') : 'not set',
            },
            {
                name: 'SDK_GDPR_TARGETING',
                message: targeting ? (targetingConsent ? 'Allowed' : 'Not allowed') : 'Not set',
                status: targetingConsent ? 'success' : 'warning',
                label: targeting ? (targetingConsent ? '1' : '0') : 'not set',
            },
            {
                name: 'SDK_GDPR_THIRD_PARTY',
                message: third ? (thirdConsent ? 'Allowed' : 'Not allowed') : 'Not set',
                status: thirdConsent ? 'success' : 'warning',
                label: third ? (thirdConsent ? '1' : '0') : 'not set',
            },
        ];
        GeneralDataProtectionRegulation.forEach(obj => {
            this.eventBus.broadcast(obj.name, {
                name: obj.name,
                message: obj.message,
                status: obj.status,
                analytics: {
                    category: obj.name,
                    action: domain,
                    label: obj.label,
                },
            });
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
        // Push out a Google event for each event. Makes our life easier. I think.
        try {
            /* eslint-disable */
            // if (typeof window['ga'] !== 'undefined' && event.analytics) {
            //     window['ga']('gd.send', {
            //         hitType: 'event',
            //         eventCategory: (event.analytics.category)
            //             ? event.analytics.category
            //             : '',
            //         eventAction: (event.analytics.action)
            //             ? event.analytics.action
            //             : '',
            //         eventLabel: (event.analytics.label)
            //             ? event.analytics.label
            //             : '',
            //     });
            // }
            /* eslint-enable */
        } catch (error) {
            throw new Error(error);
        }

        // Now send the event data to the developer.
        this.options.onEvent({
            name: event.name,
            message: event.message,
            status: event.status,
            value: event.analytics.label,
        });
    }

    /**
     * getGameData
     * @param {String} id
     * @param {String} domain
     * @return {Promise<any>}
     * @private
     */
    _getGameData(id, domain) {
        return new Promise(resolve => {
            let gameData = {
                gameId: id ? id + '' : '49258a0e497c42b5b5d87887f24d27a6', // Jewel Burst.
                advertisements: true,
                preroll: true,
                midroll: 2 * 60000,
                rewardedAds: false,
                title: '',
                tags: [],
                category: '',
                assets: [],
            };
            // const gameDataUrl = `https://game.api.gamedistribution.com/game/get/${id.replace(
            //     /-/g,
            //     ''
            // )}/?domain=${domain}&localTime=${new Date().getHours()}&v=${PackageJSON.version}`;
            const gameDataUrl = `https://game.api.gamedistribution.com/game/get/${id.replace(/-/g, '')}/?domain=${domain}&v=${PackageJSON.version}`;
            const gameDataRequest = new Request(gameDataUrl, {method: 'GET'});
            fetch(gameDataRequest)
                .then(response => {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.indexOf('application/json') !== -1) {
                        return response.json();
                    } else {
                        throw new TypeError('Oops, we didn\'t get JSON!');
                    }
                })
                .then(json => {
                    if (json.success) {
                        const retrievedGameData = {
                            gameId: json.result.game.gameMd5,
                            advertisements: json.result.game.enableAds,
                            preroll: json.result.game.preRoll,
                            midroll: json.result.game.timeAds * 60000,
                            rewardedAds: json.result.game.rewardedAds,
                            title: json.result.game.title,
                            tags: json.result.game.tags,
                            category: json.result.game.category,
                            assets: json.result.game.assets,
                            disp_2nd_prer: json.result.game.disp_2nd_prer,
                            ctry_vst: json.result.game.ctry_vst,
                            push_cuda: parseJSON(json.result.game.push_cuda),
                            bloc_gard: parseJSON(json.result.game.bloc_gard),
                            ctry: json.result.game.ctry,
                            cookie: parseJSON(json.result.game.cookie),
                            sdk: parseJSON(json.result.game.sdk),
                            gdpr: parseJSON(json.result.game.gdpr),
                            diagnostic: parseJSON(json.result.game.diagnostic),
                        };
                        gameData = extendDefaults(gameData, retrievedGameData);

                        this.msgrt.setGameData(gameData);

                        setDankLog(gameData.diagnostic);

                        // Blocked games
                        if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
                            this.msgrt.send('blocked');
                            setTimeout(() => {
                                document.location = `https://html5.api.gamedistribution.com/blocked.html?domain=${getParentDomain()}`;
                            }, 1000);
                        } else {
                            // Lotame tracking.
                            // It is critical to wait for the load event. Yes hilarious.
                            window.addEventListener('load', () => {
                                try {
                                    gameData.tags.forEach(tag => {
                                        window['_cc13998'].bcpw('int', `tags : ${tag.title.toLowerCase()}`);
                                    });

                                    window['_cc13998'].bcpw('int', `category : ${gameData.category.toLowerCase()}`);
                                } catch (error) {
                                    // No need to throw an error or log. It's just Lotame.
                                }
                            });
                        }
                    }
                    resolve(gameData);
                })
                .catch(() => {
                    // Resolve with default data.
                    resolve(gameData);
                });
        });
    }

    /**
     * _createSplash
     * Create splash screen for developers who can't add the advertisement
     * request behind a user action.
     * @param {Object} gameData
     * @param {Boolean} isConsentDomain - Determines if the publishers requires a GDPR consent wall.
     * @private
     */
    _createSplash(gameData, isConsentDomain) {
        let thumbnail = gameData.assets.find(asset => asset.hasOwnProperty('name') && asset.width === 512 && asset.height === 512);
        if (thumbnail) {
            thumbnail = `https://img.gamedistribution.com/${thumbnail.name}`;
        } else if (gameData.assets[0].hasOwnProperty('name')) {
            thumbnail = `https://img.gamedistribution.com/${gameData.assets[0].name}`;
        } else {
            thumbnail = `https://img.gamedistribution.com/logo.svg`;
        }

        /* eslint-disable */
        const css = `
            body {
                position: inherit;
            }
            .${this.options.prefix}splash-background-container {
                box-sizing: border-box;
                position: absolute;
                z-index: 664;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #000;
                overflow: hidden;
            }
            .${this.options.prefix}splash-background-image {
                box-sizing: border-box;
                position: absolute;
                top: -25%;
                left: -25%;
                width: 150%;
                height: 150%;
                background-image: url(${thumbnail});
                background-size: cover;
                filter: blur(50px) brightness(1.5);
            }
            .${this.options.prefix}splash-container {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                position: absolute;
                z-index: 665;
                bottom: 0;
                width: 100%;
                height: 100%;
            }
            .${this.options.prefix}splash-top {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                flex: 1;
                align-self: center;
                justify-content: center;
                padding: 20px;
            }
            .${this.options.prefix}splash-top > div {
                text-align: center;
            }
            .${this.options.prefix}splash-top > div > button {
                border: 0;
                margin: auto;
                padding: 10px 22px;
                border-radius: 5px;
                border: 3px solid white;
                background: linear-gradient(0deg, #dddddd, #ffffff);
                color: #222;
                text-transform: uppercase;
                text-shadow: 0 0 1px #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .${this.options.prefix}splash-top > div > button:hover {
                background: linear-gradient(0deg, #ffffff, #dddddd);
            }
            .${this.options.prefix}splash-top > div > button:active {
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                background: linear-gradient(0deg, #ffffff, #f5f5f5);
            }
            .${this.options.prefix}splash-top > div > div {
                position: relative;
                width: 150px;
                height: 150px;
                margin: auto auto 20px;
                border-radius: 100%;
                overflow: hidden;
                border: 3px solid rgba(255, 255, 255, 1);
                background-color: #000;
                box-shadow: inset 0 5px 5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
                background-image: url(${thumbnail});
                background-position: center;
                background-size: cover;
            }
            .${this.options.prefix}splash-top > div > div > img {
                width: 100%;
                height: 100%;
            }
            .${this.options.prefix}splash-bottom {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                align-self: center;
                justify-content: center;
                width: 100%;
                padding: 0 0 20px;
            }
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent,
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-title {
                box-sizing: border-box;
                width: 100%;
                padding: 20px;
                background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.5) 50%, transparent);
                color: #fff;
                text-align: left;
                font-size: 12px;
                font-family: Arial;
                font-weight: normal;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.7);
                line-height: 150%;
            }
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-title {
                padding: 15px 0;
                text-align: center;
                font-size: 18px;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                line-height: 100%;
            }
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent a {
                color: #fff;
            }
        `;
        /* eslint-enable */
        const head = document.head || document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);

        // If we want to display the GDPR consent message.
        // If it is a SpilGame, then show the splash without game name.
        // SpilGames all reside under one gameId. This is only true for their older games.
        /* eslint-disable */
        let html = '';
        if (isConsentDomain) {
            html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${this.options.prefix}splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <div></div>
                            <button id="${this.options.prefix}splash-button">Play Game</button>
                        </div>   
                    </div>
                    <div class="${this.options.prefix}splash-bottom">
                        <div class="${this.options.prefix}splash-consent">
                            We may show personalized ads provided by our partners, and our 
                            services can not be used by children under 16 years old without the 
                            consent of their legal guardian. By clicking "PLAY GAME", you consent 
                            to transmit your data to our partners for advertising purposes and 
                            declare that you are 16 years old or have the permission of your 
                            legal guardian. You can review our terms
                            <a href="https://docs.google.com/document/d/e/2PACX-1vR0BAkCq-V-OkAJ3EBT4qW4sZ9k1ta9K9EAa32V9wlxOOgP-BrY9Nv-533A_zdN3yi7tYRjO1r5cLxS/pub" target="_blank">here</a>.
                        </div>
                    </div>
                </div>
            `;
        } else if (gameData.gameId === 'b92a4170784248bca2ffa0c08bec7a50') {
            html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${this.options.prefix}splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <button id="${this.options.prefix}splash-button">Play Game</button>
                        </div>   
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${this.options.prefix}splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <div></div>
                            <button id="${this.options.prefix}splash-button">Play Game</button>
                        </div>   
                    </div>
                    <div class="${this.options.prefix}splash-bottom">
                        <div class="${this.options.prefix}splash-title">${gameData.title}</div>
                    </div>
                </div>
            `;
        }
        /* eslint-enable */

        // Create our container and add the markup.
        const container = document.createElement('div');
        container.innerHTML = html;
        container.id = `${this.options.prefix}splash`;

        // Flash bridge SDK will give us a splash container id (splash).
        // If not; then we just set the splash to be full screen.
        const splashContainer = this.options.flashSettings.splashContainerId ? document.getElementById(this.options.flashSettings.splashContainerId) : null;
        if (splashContainer) {
            splashContainer.style.display = 'block';
            splashContainer.insertBefore(container, splashContainer.firstChild);
        } else {
            const body = document.body || document.getElementsByTagName('body')[0];
            body.insertBefore(container, body.firstChild);
        }

        // Make the whole splash screen click-able.
        // Or just the button.
        if (isConsentDomain) {
            const button = document.getElementById(`${this.options.prefix}splash-button`);
            button.addEventListener('click', () => {
                // Set consent cookie.
                const date = new Date();
                date.setDate(date.getDate() + 90); // 90 days, similar to Google Analytics.
                document.cookie = `ogdpr_tracking=1; expires=${date.toUTCString()}; path=/`;

                // Now show the advertisement and continue to the game.

                this.showAd(AdType.Interstitial).catch(error => {
                    this.onResumeGame(error.message, 'warning');
                });
            });
        } else {
            container.addEventListener('click', () => {
                this.showAd(AdType.Interstitial).catch(error => {
                    this.onResumeGame(error.message, 'warning');
                });
            });
        }

        // Now pause the game.
        this.onPauseGame('Pause the game and wait for a user gesture', 'success');

        // Make sure the container is removed when an ad starts.
        this.eventBus.subscribe('SDK_GAME_PAUSE', () => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            } else if (container) {
                container.style.display = 'none';
            }
            if (splashContainer && splashContainer.parentNode) {
                splashContainer.parentNode.removeChild(splashContainer);
            } else if (splashContainer) {
                splashContainer.style.display = 'none';
            }
        });

        // Make sure the container is removed when the game is resumed.
        this.eventBus.subscribe('SDK_GAME_START', () => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            } else if (container) {
                container.style.display = 'none';
            }
            if (splashContainer && splashContainer.parentNode) {
                splashContainer.parentNode.removeChild(splashContainer);
            } else if (splashContainer) {
                splashContainer.style.display = 'none';
            }
        });
    }

    /**
     * showAd
     * Used as inner function to call a type of video advertisement.
     * @param {String} adType
     * @return {Promise<any>}
     * @private
     */
    async showAd(adType) {
        try {
            const gameData = await this.readyPromise;

            return new Promise((resolve, reject) => {
                // Check blocked game
                if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
                    reject('Game or domain is blocked.');
                    return;
                }

                // Reject in case we don't want to serve ads.
                if (!gameData.advertisements || this.whitelabelPartner) {
                    resolve('Advertisements are disabled.');
                    return;
                }

                // Check ad type
                if (!adType) {
                    adType = AdType.Interstitial;
                } else if (adType !== AdType.Interstitial && adType !== AdType.Rewarded) {
                    resolve('Unsupported an advertisement type:', adType);
                    return;
                }

                // check if the rewarded ads is enabled for the game.
                if (adType === AdType.Rewarded && !gameData.rewardedAds) {
                    resolve('Rewarded ads are disabled.');
                    return;
                }

                // Check if the interstitial advertisement is not called too often.
                if (adType === AdType.Interstitial && typeof this.adRequestTimer !== 'undefined') {
                    const elapsed = new Date().valueOf() - this.adRequestTimer.valueOf();
                    if (elapsed < gameData.midroll) {
                        resolve('The advertisement was requested too soon.');
                        return;
                    }
                }

                this.lastRequestedAdType = adType;

                // Start the pre-loaded advertisement.
                this.adInstance.startAd(adType);

                if (adType === AdType.Rewarded) {
                    this.eventBus.subscribe('COMPLETE', () => resolve('The user has fully seen the advertisement.'), 'ima');
                    this.eventBus.subscribe('SKIPPED', () => resolve('The user skipped the advertisement.'), 'ima');
                    this.eventBus.subscribe('AD_ERROR', () => resolve('VAST advertisement error.'), 'ima');
                    this.eventBus.subscribe('AD_SDK_CANCELED', () => resolve('The advertisement was canceled.'), 'sdk');
                } else {
                    this.eventBus.subscribe('SDK_GAME_START', () => resolve(), 'sdk');
                    this.eventBus.subscribe('AD_ERROR', () => resolve('VAST advertisement error.'), 'ima');
                }
            });
        } catch (error) {
            this.onResumeGame(error.message, 'warning');
            // return new Promise((resolve, reject)=>{
            //     reject(error.message);
            // });
        }
    }

    /**
     * preloadRewarded
     * Preload a rewarded ad. By default we preload interstitials.
     * The developer can use this method to check for rewarded ads availability.
     * We have to do this due to low fill rate of rewarded ads.
     * This way the developer can decide whether to show a rewarded ads button within their game.
     * @param {String} adType
     * @return {Promise<any>}
     * @public
     */
    async preloadAd(adType) {
        try {
            const gameData = await this.readyPromise;
            // Check blocked game
            if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
                throw new Error('Game or domain is blocked.');
            }

            // Check ad type
            if (!adType) {
                adType = AdType.Interstitial;
            } else if (adType !== AdType.Interstitial && adType !== AdType.Rewarded) {
                throw new Error('Unsupported an advertisement type:' + adType);
            }

            // check if the rewarded ads is enabled for the game.
            if (adType === AdType.Rewarded && !gameData.rewardedAds) {
                throw new Error('Rewarded ads are disabled.');
            }

            if (adType != AdType.Rewarded) {
                // we already preload interstitial internally
                return new Promise((resolve, reject) => {
                    resolve();
                });
            }

            return await this.adInstance.preloadAd(AdType.Rewarded, false);
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * cancelAd
     * Cancels the current loaded/ running advertisement.
     * @return {Promise<void>}
     */
    async cancelAd() {
        try {
            const gameData = await this.readyPromise;
            // Check blocked game
            if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
                throw new Error('Game or domain is blocked.');
            }

            return this.adInstance.cancel();
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * [DEPRECATED]
     * showBanner
     * Used by our developer to call a video advertisement.
     * @public
     */
    showBanner() {
        try {
            this.showAd(AdType.Interstitial).catch(error => {
                this.onResumeGame(error.message, 'warning');
            });
        } catch (error) {
            this.onResumeGame(error.message, 'warning');
        }
    }

    /**
     * [DEPRECATED]
     * customLog
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
     * [DEPRECATED]
     * play
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
        try {
            this.options.resumeGame();
        } catch (error) {
            // console.log(error);
        }
        let eventName = 'SDK_GAME_START';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: status,
            analytics: {
                category: 'SDK',
                action: eventName,
                label: this.options.gameId + '',
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
        try {
            this.options.pauseGame();
        } catch (error) {
            // console.log(error);
        }
        let eventName = 'SDK_GAME_PAUSE';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: status,
            analytics: {
                category: 'SDK',
                action: eventName,
                label: this.options.gameId + '',
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
            const implementation = new ImplementationTest(this.options.testing);
            implementation.start();
            localStorage.setItem('gd_debug', 'true');
        } catch (error) {
            console.log(error);
        }
    }
}

export default SDK;
