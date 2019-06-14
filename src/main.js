'use strict';

import 'es6-promise/auto';
import 'whatwg-fetch';
import PackageJSON from '../package.json';
import VideoAd from './components/VideoAd';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';
import MessageRouter from './components/MessageRouter';

import {dankLog, setDankLog} from './modules/dankLog';
import {
    extendDefaults,
    getParentUrl,
    getParentDomain,
    getQueryParams,
    getScript,
    getIframeDepth,
    parseJSON,
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
            '%c %c %c GameDistribution.com HTML5 SDK | Version: ' +
        version +
        ' %c %c %c',
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
        const referrer = getParentUrl();
        const parentDomain =getParentDomain();

        // Create message router. This instance is implemented temporarily.
        this.msgrt = new MessageRouter({
            gameId: this.options.gameId,
            hours: new Date().getHours(),
            domain: parentDomain,
            referrer: referrer,
        });
        // send loaded status to router
        this.msgrt.send('loaded');
        this.msgrt.send(`depth.${getIframeDepth()}`);

        // Load analytics solutions based on tracking consent.
        // ogdpr_tracking is a cookie set by our local publishers.
        const userDeclinedTracking =
      document.location.search.indexOf('gdpr-tracking=0') >= 0 ||
      document.cookie.indexOf('ogdpr_tracking=0') >= 0;
        this._analytics(userDeclinedTracking, parentDomain);

        //     // Hodl the door!
        //     const blockedDomains = ['razda.com', '74.127.72.247'];
        //     if (blockedDomains.indexOf(parentDomain) > -1) {
        //         /* eslint-disable */
        //   if (typeof window["ga"] !== "undefined") {
        //     window["ga"]("gd.send", {
        //       hitType: "event",
        //       eventCategory: "SDK_BLOCKED",
        //       eventAction: parentDomain,
        //       eventLabel: this.options.gameId + ""
        //     });
        //   }
        /* eslint-enable */

        //     // Redirect to a blocking message.
        //     // Here we allow our user to continue to a whitelisted website.
        //     // While also telling the webmaster they require to take action.
        //     // document.location = './blocked.html';
        //     document.location = `https://html5.api.gamedistribution.com/blocked.html?domain=${parentDomain}`;

        //     // STOP RIGHT THERE. THANK YOU VERY MUCH.
        //     return;
        // }

        // Test domains.
        const testDomains = [];
        this.options.testing =
      this.options.testing || testDomains.indexOf(parentDomain) > -1;
        if (this.options.testing) {
            dankLog('SDK_TESTING_ENABLED', this.options.testing, 'info');
        }

        // Whitelabel option for disabling ads.
        this.whitelabelPartner = false;
        const xanthophyll = getQueryParams('xanthophyll');
        if (
            xanthophyll.hasOwnProperty('xanthophyll') &&
      xanthophyll['xanthophyll'] === 'true'
        ) {
            this.whitelabelPartner = true;
            dankLog('SDK_WHITELABEL', this.whitelabelPartner, 'success');
        }

        try {
            // Enable debugging if visiting through our developer admin.
            if (parentDomain === 'developer.gamedistribution.com') {
                localStorage.setItem('gd_debug', 'true');
                localStorage.setItem('gd_midroll', '0');
                const tag =
          'https://pubads.g.doubleclick.net/gampad/' +
          'ads?sz=640x480&iu=/124319096/external/' +
          'single_ad_samples&ciu_szs=300x250&impl=' +
          's&gdfp_req=1&env=vp&output=vast' +
          '&unviewed_position_start=1&' +
          'cust_params=deployment%3Ddevsite' +
          '%26sample_ct%3Dlinear&correlator=';
                localStorage.setItem('gd_tag', tag);
            } else if (
                parentDomain === 'html5.api.gamedistribution.com' ||
        parentDomain === 'localhost:3000'
            ) {
                localStorage.setItem('gd_debug', 'true');
                localStorage.setItem('gd_midroll', '0');
            }
            // Open the debug console when debugging is enabled.
            if (localStorage.getItem('gd_debug')) {
                this.openConsole();
            }
        } catch (error) {
            console.log(error);
        }

        // Record a game "play"-event in Tunnl.
        new Image().src =
      'https://ana.tunnl.com/event' +
      '?page_url=' +
      encodeURIComponent(referrer) +
      '&game_id=' +
      this.options.gameId +
      '&eventtype=1';

        // Setup all event listeners.
        // We also send a Google Analytics event for each one of our events.
        this.eventBus = new EventBus();
        this.eventBus.gameId = this.options.gameId + '';

        // SDK events
        this.eventBus.subscribe('SDK_BLOCKED', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_READY', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_ERROR', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_DATA_READY', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_START', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GAME_PAUSE', arg => this._onEvent(arg));

        // GDPR events
        this.eventBus.subscribe('SDK_GDPR_TRACKING', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GDPR_TARGETING', arg => this._onEvent(arg));
        this.eventBus.subscribe('SDK_GDPR_THIRD_PARTY', arg => this._onEvent(arg));

        // IMA HTML5 SDK events
        this.eventBus.subscribe('AD_SDK_LOADER_READY', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_MANAGER_READY', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_REQUEST_ADS', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_ERROR', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_ERROR_LOAD_SCRIPTS', arg => {
            this._onEvent(arg);
            this._checkAdBlocker(arg);
        });
        this.eventBus.subscribe('AD_SDK_FINISHED', arg => {
            this._onEvent(arg);
            this._checkPrerollRequest(arg);
        });

        // Ad events
        this.eventBus.subscribe('AD_CANCELED', arg => {
            this._onEvent(arg);
            this.onResumeGame(
                'Advertisement error, no worries, start / resume the game.',
                'warning'
            );
        });
        this.eventBus.subscribe('AD_ERROR', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_SAFETY_TIMER', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_BREAK_READY', arg => this._onEvent(arg));
        this.eventBus.subscribe('AD_METADATA', arg => this._onEvent(arg));
        this.eventBus.subscribe('ALL_ADS_COMPLETED', arg => this._onEvent(arg));
        this.eventBus.subscribe('CLICK', arg => {
            this._onEvent(arg);

            // Lotame tracking.
            try {
                window['_cc13998'].bcpw('act', 'ad click');
            } catch (error) {
                // No need to throw an error or log. It's just Lotame.
            }
        });
        this.eventBus.subscribe('COMPLETE', arg => {
            this._onEvent(arg);

            // Lotame tracking.
            try {
                window['_cc13998'].bcpw('act', 'ad complete');
            } catch (error) {
                // No need to throw an error or log. It's just Lotame.
            }
        });
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', arg => {
            this._onEvent(arg);
            this.onPauseGame('New advertisements requested and loaded', 'success');
        });
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', arg => {
            this._onEvent(arg);
            this.onResumeGame(
                'Advertisement(s) are done. Start / resume the game.',
                'success'
            );
            // Do a request to flag the sdk as available within the catalog.
            // This flagging allows our developer to do a request to publish
            // this game, otherwise this option would remain unavailable.
            if (
                parentDomain === 'developer.gamedistribution.com' ||
        new RegExp('^localhost').test(parentDomain) === true
            ) {
                new Image().src =
          'https://game.api.gamedistribution.com/game/hasapi/' +
          this.options.gameId;
                try {
                    let message = JSON.stringify({
                        type: 'GD_SDK_IMPLEMENTED',
                        gameID: this.options.gameId,
                    });
                    if (window.location !== window.top.location) {
                        window.top.postMessage(message, '*');
                    } else if (
                        window.opener !== null &&
            window.opener.location !== window.location
                    ) {
                        window.opener.postMessage(message, '*');
                    }
                } catch (e) {
                    // For some reason, the postmessage didn't work (maybe there is no parent).
                    // It's ok though, we have the image fallback
                }
            }
        });
        this.eventBus.subscribe('DURATION_CHANGE', arg => this._onEvent(arg));
        this.eventBus.subscribe('FIRST_QUARTILE', arg => this._onEvent(arg));
        this.eventBus.subscribe('IMPRESSION', arg => {
            this._onEvent(arg);

            // Lotame tracking.
            try {
                window['_cc13998'].bcpw('genp', 'ad video');
                window['_cc13998'].bcpw('act', 'ad impression');
            } catch (error) {
                // No need to throw an error or log. It's just Lotame.
            }
        });
        this.eventBus.subscribe('INTERACTION', arg => this._onEvent(arg));
        this.eventBus.subscribe('LINEAR_CHANGED', arg => this._onEvent(arg));
        this.eventBus.subscribe('LOADED', arg => this._onEvent(arg));
        this.eventBus.subscribe('LOG', arg => this._onEvent(arg));
        this.eventBus.subscribe('MIDPOINT', arg => this._onEvent(arg));
        this.eventBus.subscribe('PAUSED', arg => this._onEvent(arg));
        this.eventBus.subscribe('RESUMED', arg => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPABLE_STATE_CHANGED', arg =>
            this._onEvent(arg)
        );
        this.eventBus.subscribe('SKIPPED', arg => {
            this._onEvent(arg);

            // Lotame tracking.
            try {
                window['_cc13998'].bcpw('act', 'ad skipped');
            } catch (error) {
                // No need to throw an error or log. It's just Lotame.
            }
        });
        this.eventBus.subscribe('STARTED', arg => this._onEvent(arg));
        this.eventBus.subscribe('THIRD_QUARTILE', arg => this._onEvent(arg));
        this.eventBus.subscribe('USER_CLOSE', arg => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_CHANGED', arg => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_MUTED', arg => this._onEvent(arg));

        // GDPR (General Data Protection Regulation).
        // Broadcast GDPR events to our game developer.
        // They can hook into these events to kill their own solutions.
        this._gdpr(parentDomain);

        // Only allow ads after the preroll and after a certain amount of time.
        // This time restriction is available from gameData.
        this.adRequestTimer = undefined;

        // Start our advertisement instance. Setting up the
        // adsLoader should resolve the adsLoader promise.
        this.videoAdInstance = new VideoAd(
            this.options.flashSettings.adContainerId,
            this.options.prefix,
            this.options.advertisementSettings
            // {debug: true},
        );

        // Game API.
        this.gameDataPromise = new Promise(resolve => {
            let gameData = {
                gameId: this.options.gameId
                    ? this.options.gameId + ''
                    : '49258a0e497c42b5b5d87887f24d27a6', // Jewel Burst.
                advertisements: true,
                preroll: true,
                midroll: 2 * 60000,
                title: '',
                tags: [],
                category: '',
                assets: [],
            };
            const gameDataUrl = `https://game.api.gamedistribution.com/game/get/${gameData.gameId.replace(
                /-/g,
                ''
            )}/?domain=${parentDomain}&localTime=${new Date().getHours()}&v=${PackageJSON.version}`;
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

                        /* eslint-disable */
                        if (gameData.disp_2nd_prer) {
                            let push_cuda = gameData.push_cuda;
                            if (
                                push_cuda &&
                                push_cuda.prer &&
                                push_cuda.prer.rnd_max &&
                                gameData.ctry_vst
                            ) {
                                let target = Math.floor(
                                Math.random() * Math.floor(push_cuda.prer.rnd_max)
                                );
                                let hits =
                                gameData.ctry_vst % push_cuda.prer.rnd_max === target;
                                this.videoAdInstance.maxPrerollCount = hits ? 2 : 1;
                            } else {
                                this.videoAdInstance.maxPrerollCount = 2;
                            }
                        }
                        // Blocked games                        
                        if(gameData.bloc_gard&&gameData.bloc_gard.enabled){
                            this.blocked=true;
                            if (typeof window["ga"] !== "undefined") {
                                window["ga"]("gd.send", {
                                hitType: "event",
                                eventCategory: "SDK_BLOCKED",
                                eventAction: parentDomain,
                                eventLabel: this.options.gameId + ""
                                });
                            }
                            this.msgrt.send("blocked");
                            setTimeout(()=>{
                                document.location = `https://html5.api.gamedistribution.com/blocked.html?domain=${parentDomain}`;                                
                            },1000);                         
                        }

                        /* eslint-enable */

                        // Managed by rule manager in gd admin
                        // // Added exception for some of the following domains.
                        // // It's a deal made by Sales team to set the midroll timer
                        // // to 5 minutes for these domains.
                        // const specialDomains = ['y8.com', 'pog.com', 'dollmania.com'];
                        // const triggerHappyDomains = [
                        //     'patiencespel.net',
                        //     'mahjongspielen.at',
                        //     'mahjongspel.co',
                        // ];
                        // if (specialDomains.indexOf(parentDomain) > -1) {
                        //     gameData.midroll = 5 * 60000;
                        // } else if (triggerHappyDomains.indexOf(parentDomain) > -1) {
                        //     gameData.midroll = 60000;
                        // }

                        // Controlled by rule manager in gd admin
                        // // Disable the preroll for these domains.
                        // const prerollDisabledDomains = [
                        //     'happygames.io',
                        //     'happygames-dev.gamedistribution.com',
                        // ];
                        // if (prerollDisabledDomains.indexOf(parentDomain) > -1) {
                        //     gameData.preroll = false;
                        // }

                        dankLog('SDK_GAME_DATA_READY', gameData, 'success');
                    }
                    resolve(gameData);
                })
                .catch(error => {
                    dankLog('SDK_GAME_DATA_READY', error, 'success');
                    resolve(gameData);
                });
        });

        // Create the ad tag and send some game data related info to our
        // video advertisement instance. When done we start the instance.
        this.gameDataPromise
            .then(gameData => {
                this.videoAdInstance.gameId = gameData.gameId;
                this.videoAdInstance.category = gameData.category;
                this.videoAdInstance.tags = gameData.tags;

                // Enable some debugging perks.
                try {
                    if (localStorage.getItem('gd_debug')) {
                        // So we can set a custom tag.
                        if (localStorage.getItem('gd_tag')) {
                            this.videoAdInstance.tag = localStorage.getItem('gd_tag');
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
                    // SpilGames demands a GDPR consent wall to be displayed.
                    const consentDomains = [
                        'gry.pl',
                        'oyunskor.com',
                        'juegos.com',
                        'a10.com',
                        'agame.com',
                        'spelletjes.nl',
                        'jeux.fr',
                        'gioco.it',
                        'ojogos.com.br',
                        'gamesgames.com',
                        'games.co.id',
                        'jetztspielen.de',
                        'spel.nl',
                        'spela.se',
                        'jeu.fr',
                        'spielen.com',
                        'giochi.it',
                        'games.co.uk',
                        'ourgames.ru',
                        'flashgames.ru',
                        'permainan.co.id',
                        'mousebreaker.com',
                        'gameplayer.io',
                        'oyunoyna.com',
                        'spilgames.com',
                        'spilcloud.com',
                    ];
                    const isConsentDomain =
            consentDomains.indexOf(parentDomain) > -1 &&
            document.cookie.indexOf('ogdpr_tracking=1') < 0;
                    if (!gameData.preroll) {
                        this.adRequestTimer = new Date();
                    } else if (this.videoAdInstance.options.autoplay || isConsentDomain) {
                        this._createSplash(gameData, isConsentDomain);
                    }
                }

                // Start video advertisement instance.
                this.videoAdInstance.start();
            })
            .catch(() => {
                console.log(new Error('gameDataPromise failed to resolve.'));
            });

        // Now check if everything is ready.
        this.readyPromise = Promise.all([
            this.gameDataPromise,
            this.videoAdInstance.adsLoaderPromise,
        ])
            .then(response => {
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
            })
            .catch(() => {
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
        const gdprTracking = document.location.search.indexOf('gdpr-tracking') >= 0;
        const gdprTrackingConsentGiven =
      document.location.search.indexOf('gdpr-tracking=1') >= 0;
        let gdprTrackingMessage = '';
        let gdprTrackingStyle = '';
        if (!gdprTracking) {
            gdprTrackingMessage =
        'General Data Protection Regulation consent for tracking is not set by the publisher.';
            gdprTrackingStyle = 'warning';
        } else if (gdprTrackingConsentGiven) {
            gdprTrackingMessage =
        'General Data Protection Regulation is set to allow tracking.';
            gdprTrackingStyle = 'success';
        } else {
            gdprTrackingMessage =
        'General Data Protection Regulation is set to disallow tracking.';
            gdprTrackingStyle = 'warning';
        }

        // Broadcast GDPR event.
        this.eventBus.broadcast(gdprTrackingName, {
            name: gdprTrackingName,
            message: gdprTrackingMessage,
            status: gdprTrackingStyle,
            analytics: {
                category: gdprTrackingName,
                action: domain,
                label: !gdprTracking ? 'not set' : gdprTrackingConsentGiven ? '1' : '0',
            },
        });

        // GDPR targeting - personalized advertisements.
        // Todo: At some point we will need to interprest the IAB CMP euconsent string cookie.
        // Todo: So we can pass it to the developer, or resolve this by policy.
        const gdprTargetingName = 'SDK_GDPR_TARGETING';
        const gdprTargeting =
      document.location.search.indexOf('gdpr-targeting') >= 0;
        const gdprTargetingConsentGiven =
      document.location.search.indexOf('gdpr-targeting=1') >= 0;
        let gdprTargetingMessage = '';
        let gdprTargetingStyle = '';
        if (!gdprTargeting) {
            gdprTargetingMessage =
        'General Data Protection Regulation consent for targeting is not set by the publisher.';
            gdprTargetingStyle = 'warning';
        } else if (gdprTargetingConsentGiven) {
            gdprTargetingMessage =
        'General Data Protection Regulation is set to allow personalised advertisements.';
            gdprTargetingStyle = 'success';
        } else {
            gdprTargetingMessage =
        'General Data Protection Regulation is set to disallow personalised advertisements.';
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
                label: !gdprTargeting
                    ? 'not set'
                    : gdprTargetingConsentGiven
                        ? '1'
                        : '0',
            },
        });

        // GDPR third parties - addthis, facebook etc.
        const gdprThirdPartyName = 'SDK_GDPR_THIRD_PARTY';
        const gdprThirdParty =
      document.location.search.indexOf('gdpr-third-party') >= 0;
        const gdprThirdPartyConsentGiven =
      document.location.search.indexOf('gdpr-third-party=1') >= 0;
        let gdprThirdPartyMessage = '';
        let gdprThirdPartyStyle = '';
        if (!gdprThirdParty) {
            gdprThirdPartyMessage =
        'General Data Protection Regulation consent for third parties is not set by the publisher.';
            gdprThirdPartyStyle = 'warning';
        } else if (gdprThirdPartyConsentGiven) {
            gdprThirdPartyMessage =
        'General Data Protection Regulation is set to allow third parties.';
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
                label: !gdprThirdParty
                    ? 'not set'
                    : gdprThirdPartyConsentGiven
                        ? '1'
                        : '0',
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
      if (typeof window["ga"] !== "undefined" && event.analytics) {
        window["ga"]("gd.send", {
          hitType: "event",
          eventCategory: event.analytics.category
            ? event.analytics.category
            : "",
          eventAction: event.analytics.action ? event.analytics.action : "",
          eventLabel: event.analytics.label ? event.analytics.label : ""
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
   * @param {Boolean} userDeclinedTracking
   * @param {String} parentDomain
   * @private
   */
    _analytics(userDeclinedTracking, parentDomain) {
    // Load Google Analytics.
        getScript(
            'https://www.google-analytics.com/analytics.js',
            'gdsdk_google_analytics'
        )
            .then(() => {
                window['ga'](
                    'create',
                    'UA-102601800-1',
                    {
                        name: 'gd',
                        cookieExpires: 90 * 86400,
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
                dankLog('SDK_LOAD_SCRIPT', error, 'error');
            });

        if (!userDeclinedTracking) {
            getScript(
                'https://tags.crwdcntrl.net/c/13998/cc.js?ns=_cc13998',
                'LOTCC_13998'
            )
                .then(() => {
                    // Wait for our SDK ready promise as we also want to send category data.
                    this.readyPromise.then(function(gameData) {
                        if (
                            typeof window['_cc13998'] === 'object' &&
              typeof window['_cc13998'].bcpf === 'function' &&
              typeof window['_cc13998'].bcpw === 'function'
                        ) {
                            window['_cc13998'].bcpw('act', 'play');
                            window['_cc13998'].bcpw('int', `domain : ${parentDomain}`);
                            window['_cc13998'].bcpw(
                                'int',
                                `category : ${gameData.category.toLowerCase()}`
                            );

                            // Must wait for the load event, before running Lotame.
                            if (document.readyState === 'complete') {
                                window['_cc13998'].bcpf();
                            } else {
                                window['_cc13998'].bcp();
                            }
                        }
                    });
                })
                .catch(error => {
                    dankLog('SDK_LOAD_SCRIPT', error, 'error');
                });
        }
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
        let thumbnail = gameData.assets.find(
            asset =>
                asset.hasOwnProperty('name') &&
        asset.width === 512 &&
        asset.height === 512
        );
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
            .${this.options.prefix}splash-bottom > .${
      this.options.prefix
    }splash-consent,
            .${this.options.prefix}splash-bottom > .${
      this.options.prefix
    }splash-title {
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
            .${this.options.prefix}splash-bottom > .${
      this.options.prefix
    }splash-title {
                padding: 15px 0;
                text-align: center;
                font-size: 18px;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                line-height: 100%;
            }
            .${this.options.prefix}splash-bottom > .${
      this.options.prefix
    }splash-consent a {
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
    let html = "";
    if (isConsentDomain) {
      html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${
                      this.options.prefix
                    }splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <div></div>
                            <button id="${
                              this.options.prefix
                            }splash-button">Play Game</button>
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
    } else if (gameData.gameId === "b92a4170784248bca2ffa0c08bec7a50") {
      html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${
                      this.options.prefix
                    }splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <button id="${
                              this.options.prefix
                            }splash-button">Play Game</button>
                        </div>   
                    </div>
                </div>
            `;
    } else {
      html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${
                      this.options.prefix
                    }splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <div></div>
                            <button id="${
                              this.options.prefix
                            }splash-button">Play Game</button>
                        </div>   
                    </div>
                    <div class="${this.options.prefix}splash-bottom">
                        <div class="${this.options.prefix}splash-title">${
        gameData.title
      }</div>
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
        const splashContainer = this.options.flashSettings.splashContainerId
            ? document.getElementById(this.options.flashSettings.splashContainerId)
            : null;
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
            const button = document.getElementById(
                `${this.options.prefix}splash-button`
            );
            button.addEventListener('click', () => {
                // Set consent cookie.
                const date = new Date();
                date.setDate(date.getDate() + 90); // 90 days, similar to Google Analytics.
                document.cookie = `ogdpr_tracking=1; expires=${date.toUTCString()}; path=/`;

                // Now show the advertisement and continue to the game.
                this.showBanner();
            });
        } else {
            container.addEventListener('click', () => {
                this.showBanner();
            });
        }

        // Now pause the game.
        this.onPauseGame('Pause the game and wait for a user gesture', 'success');

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
   * _checkPrerollRequest
   * @public
   */
    _checkPrerollRequest() {
        if (this.videoAdInstance.canRequestPreroll()) {
            this.videoAdInstance.requestedPrerollCount++;
            this.videoAdInstance.requestAttempts = 0;
            this.videoAdInstance
                .requestAd()
                .then(vastUrl => this.videoAdInstance.loadAd(vastUrl))
                .catch(error => {
                    this.videoAdInstance.onError(error);
                });

            // send midroll request to router
            this.msgrt.send(
                `req.ad.preroll.${this.videoAdInstance.requestedPrerollCount}`
            );
        }
    }
    /**
   * _checkAdBlocker
   * @public
   */
    _checkAdBlocker() {
        this.gameDataPromise.then(gameData=>{
            this.msgrt.send(`adblocker`);
        });
    }

    /**
   * showBanner
   * Used by our developer to call a video advertisement.
   * @public
   */
    showBanner() {
        // if(this.blocked===true) return;
        this.readyPromise
            .then(gameData => {
                if (gameData.advertisements && !this.whitelabelPartner) {
                    // Check if ad is not called too often.
                    if (typeof this.adRequestTimer !== 'undefined') {
                        const elapsed =
              new Date().valueOf() - this.adRequestTimer.valueOf();

                        if (elapsed < gameData.midroll) {
                            dankLog(
                                'SDK_SHOW_BANNER',
                                'The advertisement was requested too soon after ' +
                  'the previous advertisement was finished.',
                                'warning'
                            );
                            // Resume game for legacy purposes.
                            this.onResumeGame('Just resume the game...', 'success');

                            // send skipped request to router
                            // this.msgrt.send('req.ad.midroll.skipped');
                        } else {
                            dankLog(
                                'SDK_SHOW_BANNER',
                                'Requested the midroll advertisement.',
                                'success'
                            );
                            this.adRequestTimer = new Date();
                            // Reset the request attempt if the aforementioned
                            // requestAd() fails. So we can do an auto request
                            // for the next time we manually call requestAd().
                            this.videoAdInstance.requestAttempts = 0;
                            this.videoAdInstance.requestedMidrollCount++;
                            this.videoAdInstance
                                .requestAd()
                                .then(vastUrl => this.videoAdInstance.loadAd(vastUrl))
                                .catch(error => {
                                    this.videoAdInstance.onError(error);
                                });

                            // send midroll request to router
                            this.msgrt.send(
                                `req.ad.midroll.${this.videoAdInstance.requestedMidrollCount}`
                            );
                        }
                    } else {
                        dankLog(
                            'SDK_SHOW_BANNER',
                            'Requested the preroll advertisement.',
                            'success'
                        );
                        this.adRequestTimer = new Date();
                        // Reset the request attempt if the aforementioned
                        // requestAd() fails. So we can do an auto request
                        // for the next time we manually call requestAd().
                        this.videoAdInstance.requestAttempts = 0;
                        this.videoAdInstance.requestedPrerollCount++;
                        this.videoAdInstance
                            .requestAd()
                            .then(vastUrl => this.videoAdInstance.loadAd(vastUrl))
                            .catch(error => {
                                this.videoAdInstance.onError(error);
                            });
                        // send preroll request to router
                        this.msgrt.send(
                            `req.ad.preroll.${this.videoAdInstance.requestedPrerollCount}`
                        );
                    }
                } else {
                    this.videoAdInstance.cancel();
                    dankLog('SDK_SHOW_BANNER', 'Advertisements are disabled.', 'warning');

                    // // send disabled status to router
                    // this.msgrt.send('req.ad.disabled');
                }
            })
            .catch(error => {
                dankLog('SDK_SHOW_BANNER', error, 'error');

                // // send error status to router
                // this.msgrt.send('req.ad.error');
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
