'use strict';

import 'es6-promise/auto';
import 'whatwg-fetch';
import PackageJSON from '../package.json';
import VideoAd from './components/VideoAd';
import VideoAdTest from './components/VideoAdTest';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';

import {dankLog} from './modules/dankLog';
import {
    extendDefaults,
    getParentUrl,
    getParentDomain,
    getMobilePlatform,
    getQueryParams,
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
            testing: false,
            gameId: '4f3d7d38d24b740c95da2b03dc3a2333',
            prefix: 'gdsdk__',
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

        // Set a version banner within the developer console.
        const version = PackageJSON.version;
        const banner = console.log(
            '%c %c %c Gamedistribution.com HTML5 SDK | Version: ' +
            version + ' %c %c %c', 'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #ffffff');
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        // Get referrer domain data.
        const referrer = getParentUrl();
        const parentDomain = getParentDomain();

        // Video header bidding domains.
        const testDomains = [
            'localhost:3000',
            'html5.api.gamedistribution.com',
            'hellokids.com',
            'fr.hellokids.com',
            'es.hellokids.com',
            'de.hellokids.com',
            'pt.hellokids.com',
            'bgames.com',
            'keygames.com',
            'spele.nl',
            'spele.be',
            'oyungemisi.com',
            'spielspiele.de',
            'spiels.at',
            'misjuegos.com',
            'waznygry.pl',
            'clavejuegos.com',
            'jouerjouer.com',
            'spiels.ch',
            'cadajuego.es',
            'nyckelspel.se',
            'starbie.co.uk',
            'hryhry.net',
            'jogojogar.com',
            'minigioco.it',
            '1001igry.ru',
            'pelaaleikkia.com',
            'cadajogo.com.br',
            'cadajogo.com',
            'funny-games.co.uk',
            'funnygames.gr',
            'funnygames.nl',
            'funnygames.pl',
            'funnygames.be',
            'funnygames.ro',
            'funnygames.com.tr',
            'funnygames.us',
            'funnygames.com.br',
            'funnygames.lt',
            'funnygames.se',
            'funnygames.hu',
            'funnygames.it',
            'funnygames.fr',
            'funnygames.in',
            'funnygames.ch',
            'funnygames.biz',
            'funnygames.es',
            'funnygames.at',
            'funnygames.com.co',
            'funnygames.fi',
            'funnygames.jp',
            'funnygames.eu',
            'funnygames.ru',
            'funnygames.org',
            'funnygames.dk',
            'funnygames.vn',
            'funnygames.com.mx',
            'funnygames.pt',
            'funnygames.cn',
            'funnygames.no',
            'funnygames.asia',
            'funnygames.pk',
            'funnygames.co.id',
            'funnygames.ph',
            'funnygames.com.ng',
            'funnygames.ie',
            'funnygames.kr',
            'funnygames.cz',
            'funnygames.ir',
            'spelletjesoverzicht.nl',
            'games.co.za',
            'youdagames.com',
            'vex3.games',
            'fbrq.io',
            'gamesmiracle.com',
            'mahjong.nl',
            'barbiegame.com.ua',
            'frivjogosonline.com.br',
            '365escape.com',
        ];
        this.options.testing = this.options.testing || testDomains.indexOf(parentDomain) > -1;
        if (this.options.testing) dankLog('SDK_TESTING_ENABLED', this.options.testing, 'info');

        // Get platform.
        const platform = getMobilePlatform();

        // Whitelabel option for disabling ads.
        this.whitelabelPartner = false;
        const xanthophyll = getQueryParams('xanthophyll');
        if (xanthophyll.hasOwnProperty('xanthophyll') &&
            xanthophyll['xanthophyll'] === 'true') {
            this.whitelabelPartner = true;
            dankLog('SDK_WHITELABEL', this.whitelabelPartner, 'success');
        }

        try {
            // Enable debugging if visiting through our developer admin.
            if (parentDomain === 'developer.gamedistribution.com') {
                localStorage.setItem('gd_debug', true);
                localStorage.setItem('gd_midroll', '0');
                const tag = 'https://pubads.g.doubleclick.net/gampad/' +
                    'ads?sz=640x480&iu=/124319096/external/' +
                    'single_ad_samples&ciu_szs=300x250&impl=' +
                    's&gdfp_req=1&env=vp&output=vast' +
                    '&unviewed_position_start=1&' +
                    'cust_params=deployment%3Ddevsite' +
                    '%26sample_ct%3Dlinear&correlator=';
                localStorage.setItem('gd_tag', tag);
            }
            // Open the debug console when debugging is enabled.
            if (localStorage.getItem('gd_debug')) {
                this.openConsole();
            }
        } catch (error) {
            console.log(error);
        }

        // Record a game "play"-event in Tunnl.
        (new Image()).src = 'https://ana.tunnl.com/event' +
            '?page_url=' + encodeURIComponent(referrer) +
            '&game_id=' + this.options.gameId +
            '&eventtype=1';

        // Setup all event listeners.
        // We also send a Google Analytics event for each one of our events.
        this.eventBus = new EventBus();
        this.eventBus.gameId = this.options.gameId + '';

        // SDK events
        this.eventBus.subscribe('SDK_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_DATA_READY',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_START', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_PAUSE', (arg) => this._onEvent(arg));

        // GDPR events
        this.eventBus.subscribe('SDK_GDPR_TRACKING', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GDPR_TARGETING', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GDPR_THIRD_PARTY', (arg) => this._onEvent(arg));

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
        this.eventBus.subscribe('ALL_ADS_COMPLETED',
            (arg) => this._onEvent(arg));
        this.eventBus.subscribe('CLICK', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('COMPLETE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', (arg) => {
            this._onEvent(arg);
            this.onPauseGame('New advertisements requested and loaded',
                'success');
        });
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame(
                'Advertisement(s) are done. Start / resume the game.',
                'success');
            // Do a request to flag the sdk as available within the catalog.
            // This flagging allows our developer to do a request to publish
            // this game, otherwise this option would remain unavailable.
            if (parentDomain === 'developer.gamedistribution.com' ||
                new RegExp('^localhost').test(parentDomain) === true) {
                (new Image()).src =
                    'https://game.api.gamedistribution.com/game/hasapi/' +
                    this.options.gameId;
                try {
                    let message = JSON.stringify({
                        type: 'GD_SDK_IMPLEMENTED',
                        gameID: this.options.gameId,
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
        });
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

        // GDPR (General Data Protection Regulation).
        // Broadcast GDPR events to our game developer.
        // They can hook into these events to kill their own solutions.
        this._gdpr(parentDomain);

        // Only allow ads after the preroll and after a certain amount of time.
        // This time restriction is available from gameData.
        this.adRequestTimer = undefined;

        // Start our advertisement instance. Setting up the
        // adsLoader should resolve the adsLoader promise.
        this.videoAdInstance =
            this.options.testing ?
                new VideoAdTest(
                    this.options.flashSettings.adContainerId,
                    this.options.prefix,
                    this.options.advertisementSettings
                ) :
                new VideoAd(
                    this.options.flashSettings.adContainerId,
                    this.options.prefix,
                    this.options.advertisementSettings
                );

        // Game API.
        const gameDataPromise = new Promise((resolve) => {
            let gameData = {
                gameId: (this.options.gameId) ? this.options.gameId + '' : '49258a0e497c42b5b5d87887f24d27a6', // Jewel Burst.
                advertisements: true,
                preroll: true,
                midroll: 2 * 60000,
                title: '',
                tags: [],
                category: '',
                assets: [],
            };
            const gameDataUrl = `https://game.api.gamedistribution.com/game/get/${gameData.gameId.replace(/-/g, '')}/?domain=${parentDomain}`;
            const gameDataRequest = new Request(gameDataUrl, {method: 'GET'});
            fetch(gameDataRequest).
                then((response) => {
                    const contentType = response.headers.get('content-type');
                    if (contentType &&
                        contentType.indexOf('application/json') !== -1) {
                        return response.json();
                    } else {
                        throw new TypeError('Oops, we didn\'t get JSON!');
                    }
                }).
                then(json => {
                    if (json.error) {
                        dankLog('SDK_GAME_DATA_READY', json.error, 'warning');
                    } else if (json.success) {
                        const retrievedGameData = {
                            gameId: json.result.game.gameMd5,
                            advertisements: json.result.game.enableAds,
                            preroll: json.result.game.preRoll,
                            midroll: json.result.game.timeAds * 60000,
                            title: json.result.game.title,
                            tags: json.result.game.tags,
                            category: json.result.game.category,
                            assets: json.result.game.assets,
                        };
                        gameData = extendDefaults(gameData, retrievedGameData);

                        // Added exception for some of the following domains.
                        // It's a deal made by Sales team to set the midroll timer
                        // to 5 minutes for these domains.
                        const specialDomains = [
                            'y8.com',
                            'pog.com',
                            'dollmania.com',
                        ];
                        const spilDomains = [
                            'fibun.com',
                            'gioco.it',
                            'spel.se',
                            'ojogos.pt',
                            'girlsgogames.se',
                            'gameplayer.io',
                            'girlsgogames.com.br',
                            'girlsgogames.nl',
                            'zapjuegos.com',
                            'a10.com',
                            'gamesgames.com',
                            'spielen.com',
                            'spelletjes.nl',
                            'spela.se',
                            'spel.nl',
                            'permainan.co.id',
                            'oyunskor.com',
                            'oyunoyna.com',
                            'ourgames.ru',
                            'ojogos.com.br',
                            'mousebreaker.com',
                            'juegosdechicas.com',
                            'juegos.com',
                            'jeux.fr',
                            'jeu.fr',
                            'jetztspielen.de',
                            'giochi.it',
                            'spilgames.com',
                            'gry.pl',
                            'girlsgogames.ru',
                            'girlsgogames.pl',
                            'girlsgogames.it',
                            'girlsgogames.fr',
                            'girlsgogames.de',
                            'girlsgogames.com',
                            'girlsgogames.co.uk',
                            'girlsgogames.co.id',
                            'games.co.uk',
                            'games.co.id',
                            'flashgames.ru',
                            'agame.com',

                            // Test mid-roll timer
                            'spele.nl',
                            'spele.be',
                            'funnygames.nl',
                            'funnygames.be',
                        ];
                        const triggerHappyDomains = [
                            'patiencespel.net',
                            'mahjongspielen.at',
                            'mahjongspel.co',
                        ];
                        if (specialDomains.indexOf(parentDomain) > -1) {
                            gameData.midroll = 5 * 60000;
                        } else if (spilDomains.indexOf(parentDomain) > -1) {
                            gameData.midroll = 2 * 60000;
                        } else if (triggerHappyDomains.indexOf(parentDomain) > -1) {
                            gameData.midroll = 60000;
                        }

                        dankLog('SDK_GAME_DATA_READY', gameData, 'success');

                        // Try to send some additional analytics to Death Star.
                        // Also display our cross promotion.
                        if (typeof window['ga'] !== 'undefined' &&
                            gameData.gameId !== 'b92a4170784248bca2ffa0c08bec7a50') {
                            try {
                                let tags = [];
                                gameData.tags.forEach((tag) => {
                                    tags.push(tag.title.toLowerCase());
                                });
                                // Populate user data.
                                // We don't want to send data from Spil games as all their
                                // games are running under one gameId, category etc...
                                window['ga']('gd.set', 'dimension2', gameData.title.toLowerCase());
                                window['ga']('gd.set', 'dimension3', tags.join(', '));
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    }
                    resolve(gameData);
                }).
                catch((error) => {
                    dankLog('SDK_GAME_DATA_READY', error, 'success');
                    resolve(gameData);
                });
        });

        // Create the ad tag and send some game data related info to our
        // video advertisement instance. When done we start the instance.
        gameDataPromise.then((gameData) => {
            this.videoAdInstance.gameId = gameData.gameId;
            this.videoAdInstance.category = gameData.category;
            this.videoAdInstance.tags = gameData.tags;

            if (!this.options.testing) {
                // We still have a lot of games not using a user action to
                // start an advertisement. Causing the video ad to be paused,
                // as auto play is not supported.
                // Todo: Should we still do this?.
                const adType = (platform !== '')
                    ? '&ad_type=image'
                    : '';

                // We're not allowed to run Google Ads within Cordova apps.
                // However we can retrieve different branded ads like Improve Digital.
                // So we run a special ad tag for that when running in a native web view.
                // Todo: Create a dynamic solutions to get the bundleid's for in web view ads requests.
                // http://cdn.gameplayer.io/embed/576742227280293818/?ref=http%3A%2F%2Fm.hopy.com
                // Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/32.0.1700.14 Mobile Crosswalk/3.32.53.0 Mobile Safari/537.36
                let pageUrl = '';
                if ((navigator.userAgent.match(/Crosswalk/i) ||
                        typeof window.cordova !== 'undefined') &&
                    parentDomain === 'm.hopy.com') {
                    pageUrl = 'bundle=com.hopy.frivgames';
                } else {
                    pageUrl = `page_url=${encodeURIComponent(referrer)}`;
                }

                // Create the actual ad tag.
                this.videoAdInstance.tag = `https://pub.tunnl.com/opp?${pageUrl}&player_width=640&player_height=480${adType}&os=${platform}&game_id=${gameData.gameId}&correlator=${Date.now()}`;
            }

            // Enable some debugging perks.
            try {
                if (localStorage.getItem('gd_debug')) {
                    // So we can set a custom tag.
                    if (localStorage.getItem('gd_tag') && !this.options.testing) {
                        this.videoAdInstance.tag =
                            localStorage.getItem('gd_tag');
                    }
                    // So we can call mid rolls quickly.
                    if (localStorage.getItem('gd_midroll')) {
                        gameData.midroll = localStorage.getItem('gd_midroll');
                    }
                }
            } catch (error) {
                console.log(error);
            }

            // If the preroll is disabled, we just set the adRequestTimer.
            // That way the first call for an advertisement is cancelled.
            // Else if the preroll is true and autoplay is true, then we
            // create a splash screen so we can force a user action before
            // starting a video advertisement.
            if (gameData.advertisements) {
                if (!gameData.preroll) {
                    this.adRequestTimer = new Date();
                } else if (this.videoAdInstance.options.autoplay) {
                    this._createSplash(gameData);
                }
            }

            this.videoAdInstance.start();
        }).catch(() => {
            console.log(new Error('gameDataPromise failed to resolve.'));
        });

        // Now check if everything is ready.
        this.readyPromise = Promise.all([
            gameDataPromise,
            this.videoAdInstance.adsLoaderPromise,
        ]).then((response) => {
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

            // Return the game data.
            return response[0];
        }).catch(() => {
            // Send out event for modern implementations.
            let eventName = 'SDK_ERROR';
            let eventMessage = 'The SDK failed.';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: eventMessage,
                status: 'error',
                analytics: {
                    category: 'SDK',
                    action: eventName,
                    label: this.options.gameId + '',
                },
            });

            // Call legacy backwards compatibility method.
            this.options.onError(eventMessage);

            // Return nothing. We're done.
            return false;
        });
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
        // GDPR tracking - analytics.
        const gdprTrackingName = 'SDK_GDPR_TRACKING';
        const gdprTracking = (document.location.search.indexOf('gdpr-tracking') >= 0);
        const gdprTrackingConsentGiven = (document.location.search.indexOf('gdpr-tracking=1') >= 0);
        let gdprTrackingMessage = '';
        let gdprTrackingStyle = '';
        if (!gdprTracking) {
            gdprTrackingMessage =
                'General Data Protection Regulation consent for tracking is not set by the publisher.';
            gdprTrackingStyle = 'warning';
        } else if (gdprTrackingConsentGiven) {
            gdprTrackingMessage = 'General Data Protection Regulation is set to allow tracking.';
            gdprTrackingStyle = 'success';
        } else {
            gdprTrackingMessage = 'General Data Protection Regulation is set to disallow tracking.';
            gdprTrackingStyle = 'warning';
        }

        // Load analytics solutions based on tracking consent.
        this._analytics(gdprTrackingConsentGiven);

        // Broadcast GDPR event.
        this.eventBus.broadcast(gdprTrackingName, {
            name: gdprTrackingName,
            message: gdprTrackingMessage,
            status: gdprTrackingStyle,
            analytics: {
                category: gdprTrackingName,
                action: domain,
                label: (!gdprTracking) ? 'not set' : (gdprTrackingConsentGiven) ? '1' : '0',
            },
        });

        // GDPR targeting - personalized advertisements.
        const gdprTargetingName = 'SDK_GDPR_TARGETING';
        const gdprTargeting = (document.location.search.indexOf('gdpr-targeting') >= 0);
        const gdprTargetingConsentGiven = (document.location.search.indexOf('gdpr-targeting=1') >= 0);
        let gdprTargetingMessage = '';
        let gdprTargetingStyle = '';
        if (!gdprTargeting) {
            gdprTargetingMessage =
                'General Data Protection Regulation consent for targeting is not set by the publisher.';
            gdprTargetingStyle = 'warning';
        } else if (gdprTargetingConsentGiven) {
            gdprTargetingMessage = 'General Data Protection Regulation is set to allow personalised advertisements.';
            gdprTargetingStyle = 'success';
        } else {
            gdprTargetingMessage = 'General Data Protection Regulation is set to disallow personalised advertisements.';
            gdprTargetingStyle = 'warning';
        }

        // Broadcast GDPR event.
        this.eventBus.broadcast(gdprTargetingName, {
            name: gdprTargetingName,
            message: gdprTargetingMessage,
            status: gdprTargetingStyle,
            analytics: {
                category: gdprTargetingName,
                action: domain,
                label: (!gdprTargeting) ? 'not set' : (gdprTargetingConsentGiven) ? '1' : '0',
            },
        });

        // GDPR third parties - addthis, facebook etc.
        const gdprThirdPartyName= 'SDK_GDPR_THIRD_PARTY';
        const gdprThirdParty = (document.location.search.indexOf('gdpr-third-party') >= 0);
        const gdprThirdPartyConsentGiven = (document.location.search.indexOf('gdpr-third-party=1') >= 0);
        let gdprThirdPartyMessage = '';
        let gdprThirdPartyStyle = '';
        if (!gdprThirdParty) {
            gdprThirdPartyMessage =
                'General Data Protection Regulation consent for third parties is not set by the publisher.';
            gdprThirdPartyStyle = 'warning';
        } else if (gdprThirdPartyConsentGiven) {
            gdprThirdPartyMessage = 'General Data Protection Regulation is set to allow third parties.';
            gdprThirdPartyStyle = 'success';
        } else {
            gdprThirdPartyMessage =
                'General Data Protection Regulation is set to disallow third parties.';
            gdprThirdPartyStyle = 'warning';
        }

        // Broadcast GDPR event.
        this.eventBus.broadcast(gdprThirdPartyName, {
            name: gdprThirdPartyName,
            message: gdprThirdPartyMessage,
            status: gdprThirdPartyStyle,
            analytics: {
                category: gdprThirdPartyName,
                action: domain,
                label: (!gdprThirdParty) ? 'not set' : (gdprThirdPartyConsentGiven) ? '1' : '0',
            },
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
            if (typeof window['ga'] !== 'undefined' && event.analytics) {
                window['ga']('gd.send', {
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
     * _analytics
     * @param {Boolean} consent
     * @private
     */
    _analytics(consent) {
        /* eslint-disable */
        // Load Google Analytics so we can push out a Google event for
        // each of our events.
        if (typeof window['ga'] === 'undefined') {
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
        window['ga']('create', 'UA-102601800-1', {
            'name': 'gd',
            'cookieExpires': 90 * 86400,
        }, 'auto');
        window['ga']('gd.send', 'pageview');

        // Anonymize IP.
        if(!consent) {
            window['ga']('set', 'anonymizeIp', true);
        }

        // GameDistribution DMPKit Tag Manager
        if(consent) {
            (function (w, d, s, l, h, m) {
                w[l] = w[l] || [];
                const f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s), dl = l != 'dmpkitdl' ? '&l=' + l : '';
                j.async = true;
                j.src = '//' + m + '/tm.js?id=' + h + dl;
                f.parentNode.insertBefore(j, f);
            })(window, document, 'script', 'dmpkitdl', 'ddc15dec-6bf1-4844-a362-c601005250e1', 'static-dmp.mediaglacier.com');
        }
        /* eslint-enable */
    }

    /**
     * _createSplash
     * Create splash screen for developers who can't add the advertisement
     * request behind a user action.
     * @param {Object} gameData
     * @private
     */
    _createSplash(gameData) {
        let thumbnail =
            gameData.assets.find(asset => asset.hasOwnProperty('name') && asset.width === 512 && asset.height === 512);
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
                z-index: 98;
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
                z-index: 99;
                bottom: 0;
                width: 100%;
                height: 100%;
                cursor: pointer;
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
                font-family: Arial;
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
            .${this.options.prefix}splash-bottom > div {
                box-sizing: border-box;
                width: 100%;
                padding: 15px 0;
                background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.5) 50%, transparent);
                color: #fff;
                text-align: center;
                font-size: 18px;
                font-family: Arial;
                font-weight: bold;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.7);
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

        // If it is a Spil game, then show something different.
        // Spil games all reside under one gameId.
        /* eslint-disable */
        let html = '';
        if (gameData.gameId === 'b92a4170784248bca2ffa0c08bec7a50') {
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
                        <div>${gameData.title}</div>
                    </div>
                </div>
            `;
        }
        /* eslint-enable */

        // Create our container and add the markup.
        const container = document.createElement('div');
        container.innerHTML = html;
        container.id = this.options.prefix + 'splash';
        container.addEventListener('click', () => {
            this.showBanner();
        });

        // Flash bridge SDK will give us a splash container id (splash).
        // If not; then we just set the splash to be full screen.
        const splashContainer = (this.options.flashSettings.splashContainerId)
            ? document.getElementById(
                this.options.flashSettings.splashContainerId)
            : null;
        if (splashContainer) {
            splashContainer.style.display = 'block';
            splashContainer.insertBefore(container, splashContainer.firstChild);
        } else {
            const body = document.body ||
                document.getElementsByTagName('body')[0];
            body.insertBefore(container, body.firstChild);
        }

        // Now pause the game.
        this.onPauseGame('Pause the game and wait for a user gesture',
            'success');

        // Make sure the container is removed when an ad starts.
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', () => {
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
     * showBanner
     * Used by our developer to call a video advertisement.
     * @public
     */
    showBanner() {
        this.readyPromise.then((gameData) => {
            if (gameData.advertisements &&
                !this.whitelabelPartner) {
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
                        this.adRequestTimer = new Date();
                        // Reset the request attempt if the aforementioned
                        // requestAd() fails. So we can do an auto request
                        // for the next time we manually call requestAd().
                        this.videoAdInstance.requestAttempts = 0;
                        if (this.options.testing) {
                            this.videoAdInstance.requestAd()
                                .then(vastUrl => this.videoAdInstance.loadAd(vastUrl))
                                .catch(error => {
                                    this.videoAdInstance.onError(error);
                                });
                        } else {
                            this.videoAdInstance.requestAd();
                        }
                    }
                } else {
                    dankLog('SDK_SHOW_BANNER',
                        'Requested the preroll advertisement.',
                        'success');
                    this.adRequestTimer = new Date();
                    // Reset the request attempt if the aforementioned
                    // requestAd() fails. So we can do an auto request
                    // for the next time we manually call requestAd().
                    this.videoAdInstance.requestAttempts = 0;
                    if (this.options.testing) {
                        this.videoAdInstance.requestAd()
                            .then(vastUrl => this.videoAdInstance.loadAd(vastUrl))
                            .catch(error => {
                                this.videoAdInstance.onError(error);
                            });
                    } else {
                        this.videoAdInstance.requestAd();
                    }
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
        try {
            this.options.resumeGame();
        } catch (error) {
            console.log(error);
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
            console.log(error);
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
            localStorage.setItem('gd_debug', true);
        } catch (error) {
            console.log(error);
        }
    }
}

export default SDK;
