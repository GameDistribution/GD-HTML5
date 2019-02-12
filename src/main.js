'use strict';

import 'es6-promise/auto';
import 'whatwg-fetch';
import 'babel-polyfill';
import PackageJSON from '../package.json';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';
import VideoAd from './components/VideoAd';

import {AdType} from './modules/adType';
import {ConsentDomain, BlockedDomain, TestDomain} from './modules/domainList';
import {SDKEvents, IMAEvents} from './modules/eventList';
import {dankLog} from './modules/dankLog';
import {
    extendDefaults,
    getParentUrl,
    getParentDomain,
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
            '%c %c %c GameDistribution.com HTML5 SDK | Version: ' +
            version + ' %c %c %c', 'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #ffffff');
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        // Get referrer domain data.
        const parentURL = getParentUrl();
        const parentDomain = getParentDomain();

        // Record a game "play"-event in Tunnl.
        (new Image()).src = 'https://ana.tunnl.com/event' +
            '?page_url=' + encodeURIComponent(parentURL) +
            '&game_id=' + this.options.gameId +
            '&eventtype=1';

        // Load analytics solutions based on tracking consent.
        // ogdpr_tracking is a cookie set by our local publishers.
        const trackingConsent = (document.location.search.indexOf('gdpr-tracking=1') >= 0)
            || document.cookie.indexOf('ogdpr_tracking=1') > 0;
        this._analytics(trackingConsent);

        // Hodl the door!
        if (BlockedDomain.indexOf(parentDomain) > -1) {
            /* eslint-disable */
            if (typeof window['ga'] !== 'undefined') {
                window['ga']('gd.send', {
                    hitType: 'event',
                    eventCategory: 'SDK_BLOCKED',
                    eventAction: parentDomain,
                    eventLabel: this.options.gameId + '',
                });
            }
            /* eslint-enable */

            // Redirect to a blocking message.
            // Here we allow our user to continue to a whitelisted website.
            // While also telling the webmaster they require to take action.
            // document.location = './blocked.html';
            document.location = `https://html5.api.gamedistribution.com/blocked.html?domain=${parentDomain}`;

            // STOP RIGHT THERE. THANK YOU VERY MUCH.
            return;
        }

        // Test domains.
        this.options.testing = this.options.testing || TestDomain.indexOf(parentDomain) > -1;
        if (this.options.testing) {
            dankLog('SDK_TESTING_ENABLED', this.options.testing, 'info');
        }

        // Whitelabel option for disabling ads.
        this.whitelabelPartner = false;
        const xanthophyll = getQueryParams('xanthophyll');
        if (xanthophyll.hasOwnProperty('xanthophyll') &&
            xanthophyll['xanthophyll'] === 'true') {
            this.whitelabelPartner = true;
            dankLog('SDK_WHITELABEL', `${this.whitelabelPartner}`, 'success');
        }

        try {
            // Enable debugging if visiting through our developer admin.
            if (parentDomain === 'developer.gamedistribution.com') {
                localStorage.setItem('gd_debug', 'true');
                localStorage.setItem('gd_midroll', '0');
                const tag = 'https://pubads.g.doubleclick.net/gampad/' +
                    'ads?sz=640x480&iu=/124319096/external/' +
                    'single_ad_samples&ciu_szs=300x250&impl=' +
                    's&gdfp_req=1&env=vp&output=vast' +
                    '&unviewed_position_start=1&' +
                    'cust_params=deployment%3Ddevsite' +
                    '%26sample_ct%3Dlinear&correlator=';
                localStorage.setItem('gd_tag', tag);
            } else if (parentDomain === 'html5.api.gamedistribution.com'
                || parentDomain === 'localhost:3000') {
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

        // VideoAd instance.
        this.adInstance = null;

        // Get the game data once.
        this.readyPromise = new Promise(async (resolve, reject) => {
            try {
                // Get the actual game data.
                const gameData = await this._getGameData(this.options.gameId, parentDomain);

                // Enable some debugging perks.
                if (localStorage.getItem('gd_debug')) {
                    if (localStorage.getItem('gd_midroll')) {
                        gameData.midroll = parseInt(localStorage.getItem('gd_midroll'));
                    }
                }

                // If the preroll is disabled, we just set the adRequestTimer.
                // That way the first call for an advertisement is cancelled.
                // Else if the preroll is true and autoplay is true, then we
                // create a splash screen so we can force a user action before
                // starting a video advertisement.
                //
                // SpilGames demands a GDPR consent wall to be displayed.
                const isConsentDomain = ConsentDomain.indexOf(parentDomain) > -1
                    && document.cookie.indexOf('ogdpr_tracking=1') < 0;
                if (!gameData.preroll) {
                    this.adRequestTimer = new Date();
                } else if (this.options.advertisementSettings.autoplay || isConsentDomain) {
                    this._createSplash(gameData, isConsentDomain);
                }

                // Create a new Interstitial instance.
                this.adInstance = new VideoAd(
                    this.options.flashSettings.adContainerId,
                    this.options.advertisementSettings,
                );

                this.adInstance.gameId = gameData.gameId;
                this.adInstance.category = gameData.category;
                this.adInstance.tags = gameData.tags;

                // Start the adInstance.
                this.adInstance.start();

                // Make sure the ad instance is loaded.
                await this.adInstance.adsLoaderPromise;

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
                    message: error,
                    status: 'error',
                    analytics: {
                        category: 'SDK',
                        action: eventName,
                        label: error,
                    },
                });

                // Call legacy backwards compatibility method.
                this.options.onError(error);

                // Something went wrong.
                reject(error);
            }
        });
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
        this.eventBus.subscribe('AD_CANCELED', () => this.onResumeGame(
            'Advertisement error, no worries, start / resume the game.',
            'warning'), 'sdk');
        IMAEvents.forEach(eventName => this.eventBus.subscribe(eventName, event => this._onEvent(event), 'ima'));
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', () => this.onPauseGame(
            'New advertisements requested and loaded',
            'success'), 'ima');
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', () => {
            this.onResumeGame(
                'Advertisement(s) are done. Start / resume the game.',
                'success');
            // Do a request to flag the sdk as available within the catalog.
            // This flagging allows our developer to do a request to publish
            // this game, otherwise this option would remain unavailable.
            if (domain === 'developer.gamedistribution.com' ||
                new RegExp('^localhost').test(domain) === true) {
                (new Image()).src =
                    'https://game.api.gamedistribution.com/game/hasapi/' +
                    id;
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
        }, 'ima');
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
        // Todo: At some point we will need to interprest the IAB CMP euconsent string cookie.
        // Todo: So we can pass it to the developer, or resolve this by policy.
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
            window['ga']('gd.set', 'anonymizeIp', true);
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
        const splashContainer = (this.options.flashSettings.splashContainerId)
            ? document.getElementById(
                this.options.flashSettings.splashContainerId)
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
            const button = document.getElementById(`${this.options.prefix}splash-button`);
            button.addEventListener('click', () => {
                // Set consent cookie.
                const date = new Date();
                date.setDate(date.getDate() + 90); // 90 days, similar to Google Analytics.
                document.cookie = `ogdpr_tracking=1; expires=${date.toUTCString()}; path=/`;

                // Now show the advertisement and continue to the game.
                this.showAd(AdType.Interstitial);
            });
        } else {
            container.addEventListener('click', () => {
                this.showAd(AdType.Interstitial);
            });
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
     * getGameData
     * @param {String} id
     * @param {String} domain
     * @return {Promise<any>}
     * @private
     */
    _getGameData(id, domain) {
        return new Promise(resolve => {
            let gameData = {
                gameId: (id) ? id + '' : '49258a0e497c42b5b5d87887f24d27a6', // Jewel Burst.
                advertisements: true,
                preroll: true,
                midroll: 2 * 60000,
                title: '',
                tags: [],
                category: '',
                assets: [],
            };
            const gameDataUrl = `https://game.api.gamedistribution.com/game/get/${id.replace(/-/g, '')}/?domain=${domain}`;
            const gameDataRequest = new Request(gameDataUrl, {method: 'GET'});
            fetch(gameDataRequest).then((response) => {
                const contentType = response.headers.get('content-type');
                if (contentType &&
                    contentType.indexOf('application/json') !== -1) {
                    return response.json();
                } else {
                    throw new TypeError('Oops, we didn\'t get JSON!');
                }
            }).then(json => {
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
                    const triggerHappyDomains = [
                        'patiencespel.net',
                        'mahjongspielen.at',
                        'mahjongspel.co',
                    ];
                    if (specialDomains.indexOf(domain) > -1) {
                        gameData.midroll = 5 * 60000;
                    } else if (triggerHappyDomains.indexOf(domain) > -1) {
                        gameData.midroll = 60000;
                    }

                    dankLog('SDK_GAME_DATA_READY', gameData.gameId, 'success');
                }
                resolve(gameData);
            }).catch(error => {
                dankLog('SDK_GAME_DATA_READY', error, 'error');
                resolve(gameData);
            });
        });
    }

    /**
     * showAd
     * Used by our developer to call a certain video advertisement.
     * @param {String} adType
     * @return {Promise<any>}
     * @public
     */
    showAd(adType) {
        return new Promise(async (resolve, reject) => {
            try {
                // Wait for our readyPromise to resolve.
                const gameData = await this.readyPromise;

                // Reject in case we don't want to serve ads.
                if (!gameData.advertisements || this.whitelabelPartner) {
                    reject(new Error('Advertisements are disabled.'));
                    return;
                }

                // Check if the interstitial advertisement is not called too often.
                if (adType === 'interstitial' && typeof this.adRequestTimer !== 'undefined') {
                    const elapsed = (new Date()).valueOf() - this.adRequestTimer.valueOf();
                    if (elapsed < gameData.midroll) {
                        reject(new Error('The advertisement was requested too soon.'));
                        return;
                    }
                } else {
                    this.adRequestTimer = new Date();
                }

                // Get the VAST URL.
                const vastUrl = await this.adInstance.requestAd(adType);

                // Load and start the advertisement.
                await this.adInstance.loadAd(vastUrl);

                // Resolve once the proper event callback is returned.
                this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', () => resolve(), 'ima');
            } catch (error) {
                this.onResumeGame(error, 'warning');
                reject(error);
            }
        });
    }

    /**
     * [DEPRECATED]
     * showBanner
     * Used by our developer to call a video advertisement.
     * @public
     */
    showBanner() {
        try {
            this.showAd(AdType.Interstitial);
        } catch (error) {
            this.onResumeGame(error, 'warning');
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
