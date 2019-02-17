'use strict';

import 'babel-polyfill';
import EventBus from '../components/EventBus';

import {AdType} from '../modules/adType';
import {
    extendDefaults,
    getMobilePlatform,
    getQueryString,
    getScript,
    getKeyByValue,
} from '../modules/common';
// import {dankLog} from '../modules/dankLog';

let instance = null;

/**
 * VideoAd
 */
class VideoAd {
    /**
     * Constructor of VideoAd.
     * @param {String} container
     * @param {Object} options
     * @return {*}
     */
    constructor(container, options) {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        const defaults = {
            debug: false,
            width: 640,
            height: 360,
            locale: 'en',
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        this.prefix = 'gdsdk__';
        this.adsLoader = null;
        this.adsManager = null;
        this.adDisplayContainer = null;
        this.eventBus = new EventBus();
        this.safetyTimer = null;
        this.containerTransitionSpeed = 300;
        this.adCount = 0;
        this.adTypeCount = 0;
        this.preloadedAdType = AdType.Interstitial;
        this.requestRunning = false;
        this.parentDomain = '';
        this.parentURL = '';

        // Set &npa= or other consent values. A parentURL parameter with string value 0,
        // equals given consent, which is now our default.
        this.userAllowedPersonalizedAds = document.location.search.indexOf('gdpr-targeting=0') >= 0
        || document.cookie.indexOf('ogdpr_advertisement=0') >= 0
            ? '0'
            : '1';

        // Flash games load this HTML5 SDK as well. This means that sometimes
        // the ad should not be created outside of the borders of the game.
        // The Flash SDK passes us the container ID for us to use.
        // Otherwise we just create the container ourselves.
        this.thirdPartyContainer = (container !== '')
            ? document.getElementById(container)
            : null;

        // Make sure given width and height doesn't contain non-numbers.
        this.options.width = (typeof this.options.width === 'number')
            ? this.options.width
            : (this.options.width === '100%')
                ? 640
                : this.options.width.replace(/[^0-9]/g, '');
        this.options.height = (typeof this.options.height === 'number')
            ? this.options.height
            : (this.options.height === '100%')
                ? 360
                : this.options.height.replace(/[^0-9]/g, '');

        const viewWidth = window.innerWidth ||
            document.documentElement.clientWidth || document.body.clientWidth;
        const viewHeight = window.innerHeight ||
            document.documentElement.clientHeight || document.body.clientHeight;
        this.options.width = (this.thirdPartyContainer)
            ? this.thirdPartyContainer.offsetWidth
            : viewWidth;
        this.options.height = (this.thirdPartyContainer)
            ? this.thirdPartyContainer.offsetHeight
            : viewHeight;

        // Targeting and reporting values.
        this.gameId = '0';
        this.category = '';
        this.tags = [];
        this.eventCategory = 'AD';

        // Subscribe to the LOADED event as we will want to clear our initial
        // safety timer, but also start a new one, as sometimes advertisements
        // can have trouble starting.
        this.eventBus.subscribe('LOADED', () => {
            // Start our safety timer every time an ad is loaded.
            // It can happen that an ad loads and starts, but has an error
            // within itself, so we never get an error event from IMA.
            this._clearSafetyTimer('LOADED');
            this._startSafetyTimer(8000, 'LOADED');
        }, 'ima');

        // Subscribe to the STARTED event, so we can clear the safety timer
        // started from the LOADED event. This is to avoid any problems within
        // an advertisement itself, like when it doesn't start or has
        // a javascript error, which is common with VPAID.
        this.eventBus.subscribe('STARTED', () => {
            this._clearSafetyTimer('STARTED');
        }, 'ima');
    }

    /**
     * start
     * By calling start() we start the creation of the adsLoader, needed to request ads.
     * @public
     * @return {Promise<[any , any]>}
     */
    async start() {
        try {
            // Load the PreBid header bidding solution.
            // This can load parallel to the IMA script.
            const preBidURL = (this.options.debug)
                ? 'https://test-hb.improvedigital.com/pbw/gameDistribution.min.js?v=1'
                : 'https://hb.improvedigital.com/pbw/gameDistribution.min.js?v=1';
            const preBidScript = getScript(preBidURL);

            // Set header bidding namespace.
            window.idhbgd = window.idhbgd || {};
            window.idhbgd.que = window.idhbgd.que || [];

            // Load the IMA script, wait for it to have loaded before proceeding to build
            // the markup and adsLoader instance.
            const imaURL = (this.options.debug)
                ? 'https://imasdk.googleapis.com/js/sdkloader/ima3_debug.js'
                : 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
            const imaScript = await getScript(imaURL);

            // Build the markup for the adsLoader instance.
            this._createPlayer();

            // Now the google namespace is set so we can setup the adsLoader instance
            // and bind it to the newly created markup.
            this._setUpIMA();

            // Now make sure all scripts are available.
            return await Promise.all([preBidScript, imaScript]);
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * _requestAd
     * Request advertisements.
     * @param {String} adType
     * @return {Promise} Promise that returns a VAST URL like https://pubads.g.doubleclick.net/...
     * @private
     */
    _requestAd(adType) {
        return new Promise((resolve) => {
            // If we want rewarded ads.
            if (adType === 'rewarded') {
                // Tag is supplied by Improve Digital.
                // Note: not allowed to run Google for rewarded ads!
                resolve(`https://ad.360yield.com/advast?p=13303692&w=4&h=3&minduration=5&maxduration=30&player_width=${this.options.width}&player_height=${this.options.height}&referrer=${this.parentDomain}&vast_version=3&vpaid_version=2&video_format_type=outstream&gdpr=${this.userAllowedPersonalizedAds}`);
                return;
            }

            // If we want a test ad.
            // Todo: move to top of this method as soon as most devs are finished with testing.
            if (localStorage.getItem('gd_debug') &&
                localStorage.getItem('gd_tag')) {
                resolve(localStorage.getItem('gd_tag'));
                return;
            }

            // If we want a normal interstitial with header bidding.
            try {
                // Reporting counters.
                // Reset the ad counter for midroll reporting.
                if (this.adTypeCount === 1) this.adCount = 0;
                this.adCount++;
                this.adTypeCount++;

                this._tunnlReportingKeys().then((data) => {
                    if (typeof window.idhbgd.requestAds === 'undefined') {
                        throw new Error('Prebid.js wrapper script hit an error or didn\'t exist!');
                    }

                    // Create the ad unit name based on given Tunnl data.
                    // Default is the gamedistribution.com ad unit.
                    const nsid = data.nsid ? data.nsid : 'TNL_T-17102571517';
                    const tid = data.tid ? data.tid : 'TNL_NS-18101700058';
                    const unit = `${nsid}/${tid}`;

                    // Make sure to remove these properties as we don't
                    // want to pass them as key values.
                    delete data.nsid;
                    delete data.tid;

                    // Set the consent string and pass it to the header bidding wrapper.
                    // The default always allows personalised ads.
                    // The consent string given by Tunnl is set within their system, by domain.
                    // So if you want to disable personalised ads for a complete domain by default,
                    // then generate a "fake" string and add it to Tunnl for that domain.
                    // An exception to this is whenever a proper IAB CMP solution is found, which
                    // means there is an "euconsent" cookie with a consent string. The header bidding
                    // wrapper will then ignore any consent string given by the SDK or Tunnl, and will
                    // use this user generated consent string instead.
                    const consentString = data.consent_string
                        ? data.consent_string
                        : 'BOWJjG9OWJjG9CLAAAENBx-AAAAiDAAA';

                    // Add test parameter for Tunnl.
                    Object.assign(data, {
                        tnl_system: '1',
                        tnl_content_category: this.category.toLowerCase(),
                    });

                    // Send event for Tunnl debugging.
                    if (typeof window['ga'] !== 'undefined') {
                        window['ga']('gd.send', {
                            hitType: 'event',
                            eventCategory: 'AD_REQUEST',
                            eventAction: this.parentDomain,
                            eventLabel: unit,
                        });
                    }

                    // Make the request for a VAST tag from the Prebid.js wrapper.
                    // Get logging from the wrapper using: ?idhbgd_debug=true
                    // To get a copy of the current config: copy(idhbgd.getConfig());
                    window.idhbgd.que.push(() => {
                        window.idhbgd.setAdserverTargeting(data);
                        window.idhbgd.setDfpAdUnitCode(unit);
                        window.idhbgd.setRefererUrl(encodeURIComponent(this.parentURL));

                        // This is to add a flag, which if set to false;
                        // non-personalized ads get requested from DFP and a no-consent
                        // string - BOa7h6KOa7h6KCLABBENCDAAAAAjyAAA - is sent to all SSPs.
                        // If set to true, then the wrapper will continue as if no consent was given.
                        // This is only for Google, as google is not part of the IAB group.
                        // eslint-disable-next-line
                        window.idhbgd.allowPersonalizedAds(!!parseInt(this.userAllowedPersonalizedAds));

                        // Pass on the IAB CMP euconsent string. Most SSP's are part of the IAB group.
                        // So they will interpret and apply proper consent rules based on this string.
                        window.idhbgd.setDefaultGdprConsentString(consentString);
                        window.idhbgd.requestAds({
                            callback: vastUrl => {
                                resolve(vastUrl);
                            },
                        });
                    });
                }).catch(error => {
                    throw new Error(error);
                });
            } catch (error) {
                // reject(error);
                throw new Error(error);
            }
        });
    }

    /**
     * _tunnlReportingKeys
     * Tunnl reporting needs its own custom tracking keys.
     * @return {Promise<any>}
     * @private
     */
    _tunnlReportingKeys() {
        return new Promise((resolve) => {
            // We're not allowed to run Google Ads within Cordova apps.
            // However we can retrieve different branded ads like Improve Digital.
            // So we run a special ad tag for that when running in a native web view.
            // Todo: Create a dynamic solutions to get the bundleid's for in web view ads requests.
            // http://cdn.gameplayer.io/embed/576742227280293818/?ref=http%3A%2F%2Fm.hopy.com
            // Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/32.0.1700.14 Mobile Crosswalk/3.32.53.0 Mobile Safari/537.36
            let pageUrl = '';
            if ((navigator.userAgent.match(/Crosswalk/i) ||
                    typeof window.cordova !== 'undefined') &&
                this.parentDomain === 'm.hopy.com') {
                pageUrl = 'bundle=com.hopy.frivgames';
            } else {
                pageUrl = `page_url=${encodeURIComponent(this.parentURL)}`;
                // pageUrl = `page_url=${encodeURIComponent('http://car.batugames.com')}`;
            }
            const platform = getMobilePlatform();
            const adPosition = this.adTypeCount === 1
                ? 'preroll1'
                : `midroll${this.adCount.toString()}`;

            // Custom Tunnl reporting keys used on local casual portals for media buying purposes.
            const ch = getQueryString('ch', window.location.href);
            const chDate = getQueryString('ch_date', window.location.href);
            let chParam = ch ? `&ch=${ch}` : '';
            let chDateParam = chDate ? `&ch_date=${chDate}` : '';

            const url = `https://pub.tunnl.com/opphb?${pageUrl}&player_width=${this.options.width}&player_height=${this.options.height}&ad_type=video_image&os=${platform}&game_id=${this.gameId}&ad_position=${adPosition}${chParam}${chDateParam}&correlator=${Date.now()}`;
            const request = new Request(url, {method: 'GET'});
            fetch(request)
                .then(response => {
                    const contentType = response.headers.get('content-type');
                    if (contentType &&
                        contentType.indexOf('application/json') !== -1) {
                        return response.json();
                    } else {
                        throw new TypeError('Oops, we didn\'t get JSON!');
                    }
                })
                .then(keys => resolve(keys))
                .catch(error => {
                    console.log(error);

                    // tnl_gdpr : 0 : EU user.
                    // tnl_gdpr : 1 : No EU user.
                    // tnl_gdpr_consent : 0 : No consent.
                    // tnl_gdpr_consent : 1 : Consent given.
                    const keys = {
                        'tid': 'TNL_T-17102571517',
                        'nsid': 'TNL_NS-18101700058',
                        'tnl_tid': 'T-17102571517',
                        'tnl_nsid': 'NS-18101700058',
                        'tnl_pw': this.options.width,
                        'tnl_ph': this.options.height,
                        'tnl_pt': '22',
                        'tnl_pid': 'P-17101800031',
                        'tnl_paid': '17',
                        'tnl_ad_type': 'video_image',
                        'tnl_asset_id': this.gameId.toString(),
                        'tnl_ad_pos': adPosition,
                        'tnl_skippable': '1',
                        'tnl_cp1': '',
                        'tnl_cp2': '',
                        'tnl_cp3': '',
                        'tnl_cp4': '',
                        'tnl_cp5': '',
                        'tnl_cp6': '',
                        'tnl_campaign': '2',
                        'tnl_gdpr': '0',
                        'tnl_gdpr_consent': '1',
                        'consent_string': 'BOWJjG9OWJjG9CLAAAENBx-AAAAiDAAA',
                        'tnl_content_category': this.category.toLowerCase(),
                    };

                    // Send event for Tunnl debugging.
                    if (typeof window['ga'] !== 'undefined') {
                        window['ga']('gd.send', {
                            hitType: 'event',
                            eventCategory: 'AD_REQUEST_FALLBACK',
                            eventAction: this.parentURL,
                            eventLabel: error,
                        });
                    }

                    resolve(keys);
                });
        });
    }

    /**
     * _loadAd
     * Load advertisements.
     * @param {String} vastUrl
     * @return {Promise<any>}
     * @private
     */
    _loadAd(vastUrl) {
        return new Promise((resolve) => {
            if (typeof google === 'undefined') {
                throw new Error('Unable to load ad, google IMA SDK not defined.');
            }

            try {
                // Request video new ads.
                const adsRequest = new google.ima.AdsRequest();

                // Set the VAST tag.
                adsRequest.adTagUrl = vastUrl;

                // Specify the linear and nonlinear slot sizes. This helps
                // the SDK to select the correct creative if multiple are returned.
                adsRequest.linearAdSlotWidth = this.options.width;
                adsRequest.linearAdSlotHeight = this.options.height;
                adsRequest.nonLinearAdSlotWidth = this.options.width;
                adsRequest.nonLinearAdSlotHeight = this.options.height;

                // We don't want overlays as we do not have
                // a video player as underlying content!
                // Non-linear ads usually do not invoke the ALL_ADS_COMPLETED.
                // That would cause lots of problems of course...
                adsRequest.forceNonLinearFullSlot = true;

                // Send event for Tunnl debugging.
                if (typeof window['ga'] !== 'undefined') {
                    const time = new Date();
                    const h = time.getHours();
                    const d = time.getDate();
                    const m = time.getMonth();
                    const y = time.getFullYear();
                    window['ga']('gd.send', {
                        hitType: 'event',
                        eventCategory: (this.adTypeCount === 1) ? 'AD_PREROLL' : 'AD_MIDROLL',
                        eventAction: `${this.parentDomain} | h${h} d${d} m${m} y${y}`,
                        eventLabel: vastUrl,
                    });
                }

                // Get us some ads!
                this.adsLoader.requestAds(adsRequest);

                // Done here.
                resolve(adsRequest);
            } catch (error) {
                throw new Error(error);
            }
        });
    }

    /**
     * complete
     * The ad has finished playing. Nice!
     * @public
     */
    complete() {
        this.requestRunning = false;

        // Hide the advertisement.
        this._hide();

        // Create a 1x1 ad slot when the first ad has finished playing.
        if (this.adCount === 1) {
            let tags = [];
            this.tags.forEach((tag) => {
                tags.push(tag.title.toLowerCase());
            });
            let category = this.category.toLowerCase();
            this._loadDisplayAd(this.gameId, tags, category);
        }

        // Preload a new advertisement.
        this.preloadAd(AdType.Interstitial);
    }

    /**
     * cancel
     * Makes it possible to stop an advertisement while its
     * loading or playing. This will clear out the adsManager, stop any
     * ad playing and allowing new ads to be called.
     * @public
     */
    cancel() {
        this.requestRunning = false;

        // Hide the advertisement.
        this._hide();

        // Preload a new advertisement.
        this.preloadAd(AdType.Interstitial);

        // Send event to tell that the whole advertisement thing is finished.
        let eventName = 'AD_SDK_CANCELED';
        let eventMessage = 'Advertisement has been canceled.';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: eventMessage,
            status: 'warning',
            analytics: {
                category: this.eventCategory,
                action: eventName,
                label: this.gameId,
            },
        });
    }

    /**
     * preloadAd
     * Destroy the adsManager so we can grab new ads after this.
     * If we don't then we're not allowed to call new ads based
     * on google policies, as they interpret this as an accidental
     * video requests. https://developers.google.com/interactive-
     * media-ads/docs/sdks/android/faq#8
     * @param {String} adType
     * @return {Promise<any>}
     * @public
     */
    async preloadAd(adType) {
        if (this.requestRunning) {
            throw new Error('Wait for the current running ad to finish.');
        }

        if (this.adsManager) {
            this.adsManager.destroy();
            this.adsManager = null;
        }

        if (this.adsLoader) {
            this.adsLoader.contentComplete();
        }

        try {
            const vastUrl = await this._requestAd(adType);
            const adsRequest = await this._loadAd(vastUrl);

            await Promise.all([
                vastUrl,
                adsRequest,
                new Promise(resolve => {
                    // Set the loaded adType,
                    // in case someone wants to start a rewarded ad while an interstitial is loaded.
                    this.preloadedAdType = adType;

                    // Make sure to wait for either of the following events to resolve.
                    this.eventBus.subscribe('AD_SDK_MANAGER_READY', () => resolve(), 'sdk');
                    this.eventBus.subscribe('AD_SDK_CANCEL', () => resolve(), 'sdk');
                    this.eventBus.subscribe('AD_ERROR', () => resolve(), 'sdk');
                }),
            ]);
            return adsRequest;
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * startAd
     * Call this to start showing the ad set within the adsManager instance.
     * @param {String} adType
     * @public
     */
    startAd(adType) {
        if (this.requestRunning) {
            throw new Error('An ad is already running.');
        }

        this.requestRunning = true;

        // Not allowed to run rewarded ads while interstitial is loaded.
        // So we just load up a new request with the correct AdType and start it right away.
        if (adType !== this.preloadedAdType) {
            this.requestRunning = false;
            this.preloadAd(adType)
                .then(() => this.startAd(adType))
                .catch(error => this._onError(error));
            return;
        }

        try {
            // Initialize the ads manager.
            this.adsManager.init(
                this.options.width,
                this.options.height,
                google.ima.ViewMode.NORMAL,
            );

            // Start to play the creative.
            this.adsManager.start();
        } catch (error) {
            // An error may be thrown if there was a problem with the VAST response.
            this._onError(error);
        }
    }

    /**
     * onError
     * Any error handling, unrelated to ads themselves, comes through here.
     * @param {Object} error
     * @private
     */
    _onError(error) {
        this.cancel();
        this._clearSafetyTimer('onError()');
    }

    /**
     * _hide
     * Show the advertisement container.
     * @private
     */
    _hide() {
        if (this.adContainer) {
            this.adContainer.style.opacity = '0';
            if (this.thirdPartyContainer) {
                this.thirdPartyContainer.style.opacity = '0';
            }
            setTimeout(() => {
                // We do not use display none. Otherwise element.offsetWidth
                // and height will return 0px.
                this.adContainer.style.transform = 'translateX(-9999px)';
                this.adContainer.style.zIndex = '0';
                if (this.thirdPartyContainer) {
                    this.thirdPartyContainer.style.transform =
                        'translateX(-9999px)';
                    this.thirdPartyContainer.style.zIndex = '0';
                }
            }, this.containerTransitionSpeed);
        }
    }

    /**
     * _show
     * Hide the advertisement container
     * @private
     */
    _show() {
        if (this.adContainer) {
            this.adContainer.style.transform = 'translateX(0)';
            this.adContainer.style.zIndex = '99';
            if (this.thirdPartyContainer) {
                this.thirdPartyContainer.style.transform = 'translateX(0)';
                this.thirdPartyContainer.style.zIndex = '99';
                // Sometimes our client set the container to display none.
                this.thirdPartyContainer.style.display = 'block';
            }
            setTimeout(() => {
                this.adContainer.style.opacity = '1';
                if (this.thirdPartyContainer) {
                    this.thirdPartyContainer.style.opacity = '1';
                }
            }, 10);
        }
    }

    /**
     * _createPlayer
     * Creates our staging/ markup for the advertisement.
     * @private
     */
    _createPlayer() {
        const body = document.body || document.getElementsByTagName('body')[0];

        this.adContainer = document.createElement('div');
        this.adContainer.id = `${this.prefix}advertisement`;
        this.adContainer.style.position = (this.thirdPartyContainer)
            ? 'absolute'
            : 'fixed';
        this.adContainer.style.zIndex = '0';
        this.adContainer.style.top = '0';
        this.adContainer.style.left = '0';
        this.adContainer.style.width = '100%';
        this.adContainer.style.height = '100%';
        this.adContainer.style.transform = 'translateX(-9999px)';
        this.adContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.adContainer.style.opacity = '0';
        this.adContainer.style.transition = 'opacity ' +
            this.containerTransitionSpeed +
            'ms cubic-bezier(0.55, 0, 0.1, 1)';
        if (this.thirdPartyContainer) {
            this.thirdPartyContainer.style.transform = 'translateX(-9999px)';
            this.thirdPartyContainer.style.opacity = '0';
            this.thirdPartyContainer.style.transition = 'opacity ' +
                this.containerTransitionSpeed +
                'ms cubic-bezier(0.55, 0, 0.1, 1)';
        }

        const adContainerInner = document.createElement('div');
        adContainerInner.id = `${this.prefix}advertisement_slot`;
        adContainerInner.style.position = 'absolute';
        adContainerInner.style.backgroundColor = '#000000';
        adContainerInner.style.top = '0';
        adContainerInner.style.left = '0';
        adContainerInner.style.width = this.options.width + 'px';
        adContainerInner.style.height = this.options.height + 'px';

        // Append the adContainer to our Flash container, when using the
        // Flash SDK implementation.
        if (this.thirdPartyContainer) {
            this.adContainer.appendChild(adContainerInner);
            this.thirdPartyContainer.appendChild(this.adContainer);
        } else {
            this.adContainer.appendChild(adContainerInner);
            body.appendChild(this.adContainer);
        }

        // We need to resize our adContainer
        // when the view dimensions change.
        window.addEventListener('resize', () => {
            const viewWidth = window.innerWidth ||
                document.documentElement.clientWidth ||
                document.body.clientWidth;
            const viewHeight = window.innerHeight ||
                document.documentElement.clientHeight ||
                document.body.clientHeight;
            this.options.width = (this.thirdPartyContainer)
                ? this.thirdPartyContainer.offsetWidth
                : viewWidth;
            this.options.height = (this.thirdPartyContainer)
                ? this.thirdPartyContainer.offsetHeight
                : viewHeight;
            adContainerInner.style.width = this.options.width + 'px';
            adContainerInner.style.height = this.options.height + 'px';
        });
    }

    /**
     * _setUpIMA
     * Create's a the adsLoader instance.
     * @private
     */
    _setUpIMA() {
        // In order for the SDK to display ads on our page, we need to tell
        // it where to put them. In the html above, we defined a div with
        // the id "adContainer". This div is set up to render on top of
        // the video player. Using the code below, we tell the SDK to render
        // ads in that div. Also provide a handle to the content video
        // player - the SDK will poll the current time of our player to
        // properly place mid-rolls. After we create the ad display
        // container, initialize it. On mobile devices, this initialization
        // must be done as the result of a user action! Which is done
        // at play().

        // So we can run VPAID2.
        google.ima.settings.setVpaidMode(
            google.ima.ImaSdkSettings.VpaidMode.INSECURE);

        // Set language.
        google.ima.settings.setLocale(this.options.locale);

        // https://developers.google.com/interactive-media-ads/docs/sdks/html5/skippable-ads
        google.ima.settings.setDisableCustomPlaybackForIOS10Plus(true);

        // We assume the adContainer is the DOM id of the element that
        // will house the ads.
        this.adDisplayContainer = new google.ima.AdDisplayContainer(
            document.getElementById(`${this.prefix}advertisement_slot`),
        );

        // Here we create an AdsLoader and define some event listeners.
        // Then create an AdsRequest object to pass to this AdsLoader.
        // We'll then wire up the 'Play' button to
        // call our requestAd function.

        // We will maintain only one instance of AdsLoader for the entire
        // lifecycle of the page. To make additional ad requests, create a
        // new AdsRequest object but re-use the same AdsLoader.

        // Re-use this AdsLoader instance for the entire lifecycle of the page.
        this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

        // Add adsLoader event listeners.
        this.adsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            this._onAdsManagerLoaded, false, this);
        this.adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,
            this._onAdError, false, this);
    }

    /**
     * _onAdsManagerLoaded
     * This function is called whenever the ads are ready inside
     * the AdDisplayContainer.
     * @param {Event} adsManagerLoadedEvent
     * @private
     */
    _onAdsManagerLoaded(adsManagerLoadedEvent) {
        // Get the ads manager.
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.enablePreloading = true;
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
        adsRenderingSettings.uiElements = [
            google.ima.UiElements.AD_ATTRIBUTION,
            google.ima.UiElements.COUNTDOWN,
        ];

        // We don't set videoContent as in the Google IMA example docs,
        // cause we run a game, not an ad.
        this.adsManager = adsManagerLoadedEvent.getAdsManager(
            adsRenderingSettings);

        // Add listeners to the required events.
        // https://developers.google.com/interactive-media-
        // ads/docs/sdks/html5/v3/apis

        // Advertisement error events.
        this.adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,
            this._onAdError.bind(this), false, this);

        // Advertisement regular events.
        this.adsManager.addEventListener(google.ima.AdEvent.Type.AD_BREAK_READY,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.AD_METADATA,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.CLICK,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.DURATION_CHANGE, this._onAdEvent.bind(this),
            this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.FIRST_QUARTILE,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.IMPRESSION,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.INTERACTION,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.LINEAR_CHANGED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.LOADED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.LOG,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.MIDPOINT,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.PAUSED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.RESUMED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(
            google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.STARTED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.THIRD_QUARTILE,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.VOLUME_CHANGED,
            this._onAdEvent.bind(this), this);
        this.adsManager.addEventListener(google.ima.AdEvent.Type.VOLUME_MUTED,
            this._onAdEvent.bind(this), this);

        // We need to resize our adContainer when the view dimensions change.
        window.addEventListener('resize', () => {
            this.adsManager.resize(this.options.width, this.options.height,
                google.ima.ViewMode.NORMAL);
        });

        // Load up the advertisement.
        // Always initialize the container first.
        this.adDisplayContainer.initialize();

        // Once the ad display container is ready and ads have been retrieved,
        // we can use the ads manager to display the ads.
        // Send an event to tell that our ads manager
        // has successfully loaded the VAST response.
        const time = new Date();
        const h = time.getHours();
        const d = time.getDate();
        const m = time.getMonth();
        const y = time.getFullYear();
        let eventName = 'AD_SDK_MANAGER_READY';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: this.adsManager,
            status: 'success',
            analytics: {
                category: eventName,
                action: this.parentDomain,
                label: `h${h} d${d} m${m} y${y}`,
            },
        });
    }

    /**
     * _onAdEvent
     * This is where all the event handling takes place. Retrieve the ad from
     * the event. Some events (e.g. ALL_ADS_COMPLETED) don't have ad
     * object associated.
     * @param {Event} adEvent
     * @private
     */
    _onAdEvent(adEvent) {
        // Used for analytics labeling.
        const time = new Date();
        const h = time.getHours();
        const d = time.getDate();
        const m = time.getMonth();
        const y = time.getFullYear();

        // Get the event type name.
        const eventName = getKeyByValue(google.ima.AdEvent.Type, adEvent.type);

        // Define all our events.
        let eventMessage = '';
        switch (adEvent.type) {
        case google.ima.AdEvent.Type.AD_BREAK_READY:
            eventMessage = 'Fired when an ad rule or a VMAP ad break would ' +
                    'have played if autoPlayAdBreaks is false.';
            break;
        case google.ima.AdEvent.Type.AD_METADATA:
            eventMessage = 'Fired when an ads list is loaded.';
            break;
        case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
            eventMessage = 'Fired when the ads manager is done playing all ' +
                    'the ads.';
            break;
        case google.ima.AdEvent.Type.CLICK:
            eventMessage = 'Fired when the ad is clicked.';
            break;
        case google.ima.AdEvent.Type.COMPLETE:
            eventMessage = 'Fired when the ad completes playing.';
            break;
        case google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED:
            eventMessage = 'Fired when content should be paused. This ' +
                    'usually happens right before an ad is about to cover ' +
                    'the content.';
            this._show();
            break;
        case google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
            eventMessage = 'Fired when content should be resumed. This ' +
                    'usually happens when an ad finishes or collapses.';
            this.complete();
            break;
        case google.ima.AdEvent.Type.DURATION_CHANGE:
            eventMessage = 'Fired when the ad\'s duration changes.';
            break;
        case google.ima.AdEvent.Type.FIRST_QUARTILE:
            eventMessage = 'Fired when the ad playhead crosses first ' +
                    'quartile.';
            break;
        case google.ima.AdEvent.Type.IMPRESSION:
            eventMessage = 'Fired when the impression URL has been pinged.';

            // Send out additional impression Google Analytics event.
            try {
                // Check which bidder served us the impression.
                // We can call on a Prebid.js method. If it exists we report it.
                // Our default ad provider is Ad Exchange.
                if (typeof window['pbjsgd'] !== 'undefined') {
                    const winners = window.pbjsgd.getHighestCpmBids();
                    if (this.options.debug) {
                        console.log('Winner(s)', winners);
                    }
                    // Todo: There can be multiple winners...
                    if (winners.length > 0) {
                        winners.forEach((winner) => {
                            /* eslint-disable */
                                if (typeof window['ga'] !== 'undefined' && winner.bidder) {
                                    window['ga']('gd.send', {
                                        hitType: 'event',
                                        eventCategory: `IMPRESSION_${winner.bidder.toUpperCase()}`,
                                        eventAction: this.parentDomain,
                                        eventLabel: `h${h} d${d} m${m} y${y}`,
                                    });
                                }
                                /* eslint-enable */
                        });
                    } else {
                        /* eslint-disable */
                            if (typeof window['ga'] !== 'undefined') {
                                window['ga']('gd.send', {
                                    hitType: 'event',
                                    eventCategory: 'IMPRESSION_ADEXCHANGE',
                                    eventAction: this.parentDomain,
                                    eventLabel: `h${h} d${d} m${m} y${y}`,
                                });
                            }
                            /* eslint-enable */
                    }
                }
            } catch (error) {
                console.log(error);
            }

            break;
        case google.ima.AdEvent.Type.INTERACTION:
            eventMessage = 'Fired when an ad triggers the interaction ' +
                    'callback. Ad interactions contain an interaction ID ' +
                    'string in the ad data.';
            break;
        case google.ima.AdEvent.Type.LINEAR_CHANGED:
            eventMessage = 'Fired when the displayed ad changes from ' +
                    'linear to nonlinear, or vice versa.';
            break;
        case google.ima.AdEvent.Type.LOADED:
            eventMessage = adEvent.getAd().getContentType();
            break;
        case google.ima.AdEvent.Type.LOG:
            const adData = adEvent.getAdData();
            if (adData['adError']) {
                eventMessage = adEvent.getAdData();
            }
            break;
        case google.ima.AdEvent.Type.MIDPOINT:
            eventMessage = 'Fired when the ad playhead crosses midpoint.';
            break;
        case google.ima.AdEvent.Type.PAUSED:
            eventMessage = 'Fired when the ad is paused.';
            break;
        case google.ima.AdEvent.Type.RESUMED:
            eventMessage = 'Fired when the ad is resumed.';
            break;
        case google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED:
            eventMessage = 'Fired when the displayed ads skippable state ' +
                    'is changed.';
            break;
        case google.ima.AdEvent.Type.SKIPPED:
            eventMessage = 'Fired when the ad is skipped by the user.';
            break;
        case google.ima.AdEvent.Type.STARTED:
            eventMessage = 'Fired when the ad starts playing.';
            break;
        case google.ima.AdEvent.Type.THIRD_QUARTILE:
            eventMessage = 'Fired when the ad playhead crosses third ' +
                    'quartile.';
            break;
        case google.ima.AdEvent.Type.USER_CLOSE:
            eventMessage = 'Fired when the ad is closed by the user.';
            break;
        case google.ima.AdEvent.Type.VOLUME_CHANGED:
            eventMessage = 'Fired when the ad volume has changed.';
            break;
        case google.ima.AdEvent.Type.VOLUME_MUTED:
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
                    category: eventName,
                    action: this.parentDomain,
                    label: `h${h} d${d} m${m} y${y}`,
                },
            });
        }
    }

    /**
     * _onAdError
     * Any ad error handling comes through here.
     * Something probably failed when pre-loading an advertisement.
     * Do not try to preloadAds here. This could cause a loop!
     * @param {Event} event
     * @private
     */
    _onAdError(event) {
        if (this.adsManager) {
            this.adsManager.destroy();
            this.adsManager = null;
        }

        if (this.adsLoader) {
            this.adsLoader.contentComplete();
        }

        this._clearSafetyTimer('_onAdError()');

        try {
            /* eslint-disable */
            if (typeof window['ga'] !== 'undefined') {
                let eventName = 'AD_ERROR';
                let eventMessage = event.getError().getMessage();
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: eventMessage,
                    status: 'warning',
                    analytics: {
                        category: eventName,
                        action: event.getError().getErrorCode().toString() || event.getError().getVastErrorCode().toString(),
                        label: eventMessage,
                    },
                });
            }
            /* eslint-enable */

            // Check which bidder served us a possible broken advertisement.
            // We can call on a Prebid.js method. If it exists we report it.
            // If there is no winning bid we assume the problem lies with AdExchange.
            // As our default ad provider is Ad Exchange.
            if (typeof window['pbjsgd'] !== 'undefined') {
                const winners = window.pbjsgd.getHighestCpmBids();
                if (this.options.debug) {
                    console.log('Failed winner(s) ', winners);
                }
                // Todo: There can be multiple winners...
                if (winners.length > 0) {
                    winners.forEach((winner) => {
                        const adId = winner.adId ? winner.adId : null;
                        const creativeId = winner.creativeId ? winner.creativeId : null;

                        /* eslint-disable */
                        if (typeof window['ga'] !== 'undefined' && winner.bidder) {
                            window['ga']('gd.send', {
                                hitType: 'event',
                                eventCategory: `AD_ERROR_${winner.bidder.toUpperCase()}`,
                                eventAction: event.getError().getErrorCode().toString() || event.getError().getVastErrorCode().toString(),
                                eventLabel: `${adId} | ${creativeId}`,
                            });
                        }
                        /* eslint-enable */
                    });
                } else {
                    /* eslint-disable */
                    if (typeof window['ga'] !== 'undefined') {
                        window['ga']('gd.send', {
                            hitType: 'event',
                            eventCategory: 'AD_ERROR_ADEXCHANGE',
                            eventAction: event.getError().getErrorCode().toString() || event.getError().getVastErrorCode().toString(),
                            eventLabel: event.getError().getMessage(),
                        });
                    }
                    /* eslint-enable */
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * _startSafetyTimer
     * Setup a safety timer for when the ad network
     * doesn't respond for whatever reason. The advertisement has 12 seconds
     * to get its shit together. We stop this timer when the advertisement
     * is playing, or when a user action is required to start, then we
     * clear the timer on ad ready.
     * @param {Number} time
     * @param {String} from
     * @private
     */
    _startSafetyTimer(time, from) {
        // dankLog('Safety timer', 'Invoked timer from: ' + from, 'success');
        this.safetyTimer = window.setTimeout(() => {
            this.cancel();
            this._clearSafetyTimer(from);
        }, time);
    }

    /**
     * _clearSafetyTimer
     * @param {String} from
     * @private
     */
    _clearSafetyTimer(from) {
        if (typeof this.safetyTimer !== 'undefined' &&
            this.safetyTimer !== null) {
            // dankLog('Safety timer', 'Cleared timer set at: ' + from, 'success');
            clearTimeout(this.safetyTimer);
            this.safetyTimer = undefined;

            // Do additional logging, as we need to figure out when
            // for some reason our adsloader listener is not resolving.
            if (from === '_requestAd()') {
                // Send event for Tunnl debugging.
                const time = new Date();
                const h = time.getHours();
                const d = time.getDate();
                const m = time.getMonth();
                const y = time.getFullYear();
                if (typeof window['ga'] !== 'undefined') {
                    window['ga']('gd.send', {
                        hitType: 'event',
                        eventCategory: 'AD_SDK_AD_REQUEST_ERROR',
                        eventAction: `h${h} d${d} m${m} y${y}`,
                    });
                }
            }
        }
    }

    /**
     * _loadDisplayAd
     * Create a 1x1 ad slot and call it. Only once.
     * @param {String} id
     * @param {Array} tags
     * @param {String} category
     * @private
     */
    _loadDisplayAd(id, tags, category) {
        const containerId = `${this.prefix}baguette`;
        if (document.getElementById(containerId)) {
            return;
        }

        // Create an element needed for binding the ad slot.
        const body = document.body || document.getElementsByTagName('body')[0];
        const container = document.createElement('div');
        container.id = containerId;
        container.style.zIndex = '100';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        body.appendChild(container);

        // Does the DFP script already exist?
        const useSSL = 'https:' === document.location.protocol;
        const src = `${useSSL ? 'https:' : 'http:'}//www.googletagservices.com/tag/js/gpt.js`;
        let exists = Array
            .from(document.querySelectorAll('script'))
            .map(scr => scr.src);
        if (!exists.includes(src)) {
            // Load the DFP script.
            const gads = document.createElement('script');
            gads.type = 'text/javascript';
            gads.async = true;
            gads.src = src;
            const script = document.getElementsByTagName('script')[0];
            script.parentNode.insertBefore(gads, script);
        }

        // Set namespaces for DFP.
        window['googletag'] = window['googletag'] || {};
        window['googletag']['cmd'] = window['googletag']['cmd'] || [];

        // Create the ad slot, but wait for the callback first.
        window['googletag']['cmd'].push(() => {
            // Define our ad slot.
            const displayAd = window['googletag'].defineSlot(
                '/1015413/Gamedistribution_ingame_1x1_crosspromo',
                [1, 1],
                containerId,
            ).setCollapseEmptyDiv(true, true).addService(window['googletag'].pubads());

            // Set some targeting.
            window['googletag'].pubads().setTargeting('crossid', id);
            window['googletag'].pubads().setTargeting('crosstags', tags);
            window['googletag'].pubads().setTargeting('crosscategory', category);

            // Make sure to keep the ad hidden until refreshed.
            window['googletag'].pubads().disableInitialLoad();

            // Enables all GPT services that have been defined.
            window['googletag'].enableServices();

            // Display the advertisement, but don't show it.
            window['googletag'].display(containerId);

            // Show the ad.
            window['googletag'].pubads().refresh([displayAd]);
        });
    }
}

export default VideoAd;
