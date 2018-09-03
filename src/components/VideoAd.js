'use strict';

import EventBus from '../components/EventBus';

import {
    extendDefaults,
    updateQueryStringParameter,
    getParentDomain,
    getQueryParams,
} from '../modules/common';
import {dankLog} from '../modules/dankLog';

let instance = null;

/**
 * VideoAd
 */
class VideoAd {
    /**
     * Constructor of VideoAd.
     * @param {String} container
     * @param {String} prefix
     * @param {Object} options
     * @return {*}
     */
    constructor(container, prefix, options) {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        const defaults = {
            debug: false,
            autoplay: false,
            responsive: true,
            width: 640,
            height: 360,
            locale: 'en',
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        this.prefix = prefix;
        this.adsLoader = null;
        this.adsManager = null;
        this.adDisplayContainer = null;
        this.eventBus = new EventBus();
        this.safetyTimer = null;
        this.requestAttempts = 0;
        this.containerTransitionSpeed = 300;
        this.adCount = 0;
        this.adTypeCount = 0;
        this.requestRunning = false;
        this.parentDomain = getParentDomain();
        this.tag = 'https://pubads.g.doubleclick.net/gampad/ads' +
            '?sz=640x480&iu=/124319096/external/single_ad_samples' +
            '&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast' +
            '&unviewed_position_start=1&cust_params=deployment%3Ddevsite' +
            '%26sample_ct%3Dlinear&correlator=';

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

        // Enable a responsive advertisement.
        // Assuming we only want responsive advertisements
        // below 1024 pixel client width. Reason for this is that some
        // advertisers buy based on ad size.
        const viewWidth = window.innerWidth ||
            document.documentElement.clientWidth || document.body.clientWidth;
        const viewHeight = window.innerHeight ||
            document.documentElement.clientHeight || document.body.clientHeight;
        this.options.responsive = (this.options.responsive
            && viewWidth <= 1024);
        if (this.options.responsive || this.thirdPartyContainer) {
            // Check if the ad container is not already set.
            // This is usually done when using the Flash SDK.
            this.options.width = (this.thirdPartyContainer)
                ? this.thirdPartyContainer.offsetWidth
                : viewWidth;
            this.options.height = (this.thirdPartyContainer)
                ? this.thirdPartyContainer.offsetHeight
                : viewHeight;
        }

        // Analytics variables
        this.gameId = '0';
        this.category = '';
        this.tags = [];
        this.eventCategory = 'AD';
    }

    /**
     * start
     * Start the VideoAd instance by first checking if we
     * have auto play capabilities. By calling start() we start the
     * creation of the adsLoader, needed to request ads. This is also
     * the time where we can change other options based on context as well.
     * @public
     */
    start() {
        // Start ticking our safety timer. If the whole advertisement
        // thing doesn't resolve within our set time, then screw this.
        this._startSafetyTimer(12000, 'start()');

        // Subscribe to the AD_SDK_LOADER_READY event and clear the
        // initial safety timer set within the start of our start() method.
        this.eventBus.subscribe('AD_SDK_LOADER_READY', () => {
            this._clearSafetyTimer('AD_SDK_LOADER_READY');
        });

        // Subscribe to AD_SDK_MANAGER_READY, which is a custom event.
        // We will want to start and clear a timer when requestAds()
        // is called until the ads manager has been resolved.
        // As it can happen that an ad request stays on pending.
        // This will cause the IMA SDK adsmanager to do nothing.
        this.eventBus.subscribe('AD_SDK_MANAGER_READY', () => {
            this._clearSafetyTimer('AD_SDK_MANAGER_READY');
        });

        // Load Google IMA HTML5 SDK.
        this._loadScripts().then(() => {
            this._createPlayer();
            this._setUpIMA();
        }).catch(error => this._onError(error));

        // Setup a simple promise to resolve if the IMA loader is ready.
        // We mainly do this because showBanner() can be called before we've
        // even setup our advertisement instance.
        this.adsLoaderPromise = new Promise((resolve, reject) => {
            this.eventBus.subscribe('AD_SDK_LOADER_READY', () => resolve());
            this.eventBus.subscribe('AD_CANCELED', () => reject(new Error('Initial adsLoaderPromise failed to load.')));
        });

        // Subscribe to the LOADED event as we will want to clear our initial
        // safety timer, but also start a new one, as sometimes advertisements
        // can have trouble starting.
        this.eventBus.subscribe('LOADED', () => {
            // Start our safety timer every time an ad is loaded.
            // It can happen that an ad loads and starts, but has an error
            // within itself, so we never get an error event from IMA.
            this._clearSafetyTimer('LOADED');
            this._startSafetyTimer(8000, 'LOADED');
        });

        // Show the advertisement container.
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', () => {
            this._show();
        });

        // Subscribe to the STARTED event, so we can clear the safety timer
        // started from the LOADED event. This is to avoid any problems within
        // an advertisement itself, like when it doesn't start or has
        // a javascript error, which is common with VPAID.
        this.eventBus.subscribe('STARTED', () => {
            this._clearSafetyTimer('STARTED');
        });
    }

    /**
     * requestAd
     * Request advertisements.
     * @public
     */
    requestAd() {
        if (typeof google === 'undefined') {
            this._onError('Unable to request ad, google IMA SDK not defined.');
            return;
        }

        if (this.requestRunning) {
            dankLog('AD_SDK_REQUEST', 'A request is already running', 'warning');
            return;
        }

        this.requestRunning = true;

        try {
            // Request video new ads.
            const adsRequest = new google.ima.AdsRequest();

            // Update our adTag. We add additional parameters so Tunnl
            // can use the values as new metrics within reporting.
            this.adCount++;
            const positionCount = this.adCount - 1;
            const requestAttempts = this.requestAttempts + 1;
            // If there is a re-request attempt for a preroll then make
            // sure we increment the adCount but still ask for a preroll.
            if (this.requestAttempts === 0) {
                this.adTypeCount++;
            }
            this.tag = updateQueryStringParameter(this.tag, 'ad_count',
                this.adCount);
            this.tag = updateQueryStringParameter(this.tag, 'ad_position',
                (this.adTypeCount === 1) ? 'preroll' : 'midroll');
            if (this.adTypeCount > 1) {
                this.tag = updateQueryStringParameter(this.tag, 'ad_midroll_count',
                    positionCount.toString());
            }
            this.tag = updateQueryStringParameter(this.tag, 'ad_request_count',
                requestAttempts.toString());

            // GDPR personalised advertisement ruling.
            // Not sending a consent value would result in the user accepting on Tunnl side.
            // However, if a publisher supports the consent string, then they will probably
            // always send it, but the content of it is set to disable all parties. Thus we
            // heavily rely on Tunnl properly reading out all these values.
            let params = getQueryParams();
            if (params.EuConsent) {
                this.tag = updateQueryStringParameter(this.tag, 'npa', params.EuConsent);
            }

            adsRequest.adTagUrl = this.tag;

            dankLog('AD_SDK_TAG_URL', adsRequest.adTagUrl, 'success');

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
                    eventCategory: (this.adCount === 1) ? 'AD_PREROLL' : 'AD_MIDROLL',
                    eventAction: `${this.parentDomain} | h${h} d${d} m${m} y${y}`,
                    eventLabel: this.tag,
                });
            }

            // Start a safety timer which is cleared when the ads manager resolves.
            // We do this because it can happen that an ad request keeps
            // pending until forever.
            this._startSafetyTimer(8000, 'requestAd()');

            // Get us some ads!
            this.adsLoader.requestAds(adsRequest);
        } catch (e) {
            this._onAdError(e);
        }
    }

    /**
     * cancel
     * Makes it possible to stop an advertisement while its
     * loading or playing. This will clear out the adsManager, stop any
     * ad playing and allowing new ads to be called.
     * @public
     */
    cancel() {
        // Destroy the adsManager so we can grab new ads after this.
        // If we don't then we're not allowed to call new ads based
        // on google policies, as they interpret this as an accidental
        // video requests. https://developers.google.com/interactive-
        // media-ads/docs/sdks/android/faq#8
        this.adsLoaderPromise.then(() => {
            if (this.adsLoader) {
                this.adsLoader.contentComplete();
            }
            if (this.adsManager) {
                this.adsManager.destroy();
            }

            // Preload new ads by doing a new request.
            // Only try once. Only for 1 specific domain; testing purposes.
            if (this.requestAttempts === 0 &&
                this.parentDomain === '1001spiele.de') {
                dankLog('AD_SDK_REQUEST_ATTEMPT',
                    'Trying to request an advertisement again in 3 seconds...',
                    'warning');

                // Increment our request attempt count.
                this.requestAttempts++;

                // Try a new request. Good chance we might get an ad now.
                // Set a delay so our DSP can adjust its price.
                setTimeout(() => {
                    // We're done with the current request.
                    this.requestRunning = false;

                    // Make the "automatic" request.
                    this.requestAd();
                }, 3000);
            } else {
                // Hide the advertisement.
                this._hide();

                // We're done with the current request.
                this.requestRunning = false;
            }
        }).catch(() => {
            console.log(new Error('adsLoaderPromise failed to load.'));
        });

        // Send event to tell that the whole advertisement
        // thing is finished.
        let eventName = 'AD_CANCELED';
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
     * _loadScripts
     * Loads the Google IMA script using a <script> tag.
     * @return {Promise<any[]>}
     * @private
     */
    _loadScripts() {
        const IMA = new Promise((resolve, reject) => {
            const src = (this.options.debug)
                ? '//imasdk.googleapis.com/js/sdkloader/ima3_debug.js'
                : '//imasdk.googleapis.com/js/sdkloader/ima3.js';
            const script = document.getElementsByTagName('script')[0];
            const ima = document.createElement('script');
            ima.type = 'text/javascript';
            ima.async = true;
            ima.src = src;
            ima.onload = () => {
                resolve();
            };
            ima.onerror = () => {
                reject('IMA script failed to load! Probably due to an ADBLOCKER!');
            };
            script.parentNode.insertBefore(ima, script);
        });

        return Promise.all([IMA]);
    }

    /**
     * _createPlayer
     * Creates our staging/ markup for the advertisement.
     * @private
     */
    _createPlayer() {
        const body = document.body || document.getElementsByTagName('body')[0];

        this.adContainer = document.createElement('div');
        this.adContainer.id = this.prefix + 'advertisement';
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
        adContainerInner.id = this.prefix + 'advertisement_slot';
        adContainerInner.style.position = 'absolute';
        adContainerInner.style.backgroundColor = '#000000';
        if (this.options.responsive || this.thirdPartyContainer) {
            adContainerInner.style.top = '0';
            adContainerInner.style.left = '0';
        } else {
            adContainerInner.style.left = '50%';
            adContainerInner.style.top = '50%';
            adContainerInner.style.transform = 'translate(-50%, -50%)';
            adContainerInner.style.boxShadow = '0 0 8px rgba(0, 0, 0, 1)';
        }
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
        if (this.options.responsive || this.thirdPartyContainer) {
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
    }

    /**
     * _setUpIMA
     * Create's a the adsLoader object.
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
            google.ima.ImaSdkSettings.VpaidMode.ENABLED);

        // Set language.
        google.ima.settings.setLocale(this.options.locale);

        // We assume the adContainer is the DOM id of the element that
        // will house the ads.
        this.adDisplayContainer = new google.ima.AdDisplayContainer(
            document.getElementById(this.prefix
                + 'advertisement_slot'),
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

        // Send event that our adsLoader is ready.
        let eventName = 'AD_SDK_LOADER_READY';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: this.options,
            status: 'success',
            analytics: {
                category: this.eventCategory,
                action: eventName,
                label: this.gameId,
            },
        });
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
        if (this.options.responsive || this.thirdPartyContainer) {
            window.addEventListener('resize', () => {
                this.adsManager.resize(this.options.width, this.options.height,
                    google.ima.ViewMode.NORMAL);
            });
        }

        // Once the ad display container is ready and ads have been retrieved,
        // we can use the ads manager to display the ads.
        if (this.adsManager && this.adDisplayContainer) {
            // Send an event to tell that our ads manager
            // has successfully loaded the VAST response.
            let eventName = 'AD_SDK_MANAGER_READY';
            this.eventBus.broadcast(eventName, {
                name: eventName,
                message: this.adsManager,
                status: 'success',
                analytics: {
                    category: this.eventCategory,
                    action: eventName,
                    label: this.gameId,
                },
            });

            // Start the advertisement.
            // Always initialize the container first.
            this.adDisplayContainer.initialize();

            try {
                // Initialize the ads manager. Ad rules playlist will
                // start at this time.
                this.adsManager.init(this.options.width, this.options.height,
                    google.ima.ViewMode.NORMAL);
                // Call play to start showing the ad. Single video and
                // overlay ads will start at this time; the call will be
                // ignored for ad rules.
                this.adsManager.start();
            } catch (adError) {
                // An error may be thrown if there was a problem with the
                // VAST response.
                this._onError(adError);
            }
        }
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
        let eventName = '';
        let eventMessage = '';
        switch (adEvent.type) {
        case google.ima.AdEvent.Type.AD_BREAK_READY:
            eventName = 'AD_BREAK_READY';
            eventMessage = 'Fired when an ad rule or a VMAP ad break would ' +
                'have played if autoPlayAdBreaks is false.';
            break;
        case google.ima.AdEvent.Type.AD_METADATA:
            eventName = 'AD_METADATA';
            eventMessage = 'Fired when an ads list is loaded.';
            break;
        case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
            eventName = 'ALL_ADS_COMPLETED';
            eventMessage = 'Fired when the ads manager is done playing all ' +
                'the ads.';
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
            eventMessage = 'Fired when content should be paused. This ' +
                'usually happens right before an ad is about to cover ' +
                'the content.';
            break;
        case google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
            eventName = 'CONTENT_RESUME_REQUESTED';
            eventMessage = 'Fired when content should be resumed. This ' +
                'usually happens when an ad finishes or collapses.';

            // Hide the advertisement.
            this._hide();

            // Destroy the adsManager so we can grab new ads after this.
            // If we don't then we're not allowed to call new ads based
            // on google policies, as they interpret this as an accidental
            // video requests. https://developers.google.com/interactive-
            // media-ads/docs/sdks/android/faq#8
            this.adsLoaderPromise.then(() => {
                if (this.adsLoader) {
                    this.adsLoader.contentComplete();
                }
                if (this.adsManager) {
                    this.adsManager.destroy();
                }

                // Create a 1x1 ad slot when the first ad has finished playing.
                if (this.adCount === 1) {
                    let tags = [];
                    this.tags.forEach((tag) => {
                        tags.push(tag.title.toLowerCase());
                    });
                    let category = this.category.toLowerCase();
                    this._loadDisplayAd(this.gameId, tags, category);
                }

                // We're done with the current request.
                this.requestRunning = false;

                // Send event to tell that the whole advertisement
                // thing is finished.
                let eventName = 'AD_SDK_FINISHED';
                let eventMessage = 'IMA is ready for new requests.';
                this.eventBus.broadcast(eventName, {
                    name: eventName,
                    message: eventMessage,
                    status: 'success',
                    analytics: {
                        category: this.eventCategory,
                        action: eventName,
                        label: this.gameId,
                    },
                });
            }).catch(() => {
                console.log(new Error('adsLoaderPromise failed to load.'));
            });

            break;
        case google.ima.AdEvent.Type.DURATION_CHANGE:
            eventName = 'DURATION_CHANGE';
            eventMessage = 'Fired when the ad\'s duration changes.';
            break;
        case google.ima.AdEvent.Type.FIRST_QUARTILE:
            eventName = 'FIRST_QUARTILE';
            eventMessage = 'Fired when the ad playhead crosses first ' +
                'quartile.';
            break;
        case google.ima.AdEvent.Type.IMPRESSION:
            eventName = 'IMPRESSION';
            eventMessage = 'Fired when the impression URL has been pinged.';
            break;
        case google.ima.AdEvent.Type.INTERACTION:
            eventName = 'INTERACTION';
            eventMessage = 'Fired when an ad triggers the interaction ' +
                'callback. Ad interactions contain an interaction ID ' +
                'string in the ad data.';
            break;
        case google.ima.AdEvent.Type.LINEAR_CHANGED:
            eventName = 'LINEAR_CHANGED';
            eventMessage = 'Fired when the displayed ad changes from ' +
                'linear to nonlinear, or vice versa.';
            break;
        case google.ima.AdEvent.Type.LOADED:
            eventName = 'LOADED';
            eventMessage = adEvent.getAd().getContentType();
            break;
        case google.ima.AdEvent.Type.LOG:
            const adData = adEvent.getAdData();
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
            eventMessage = 'Fired when the displayed ads skippable state ' +
                'is changed.';
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
            eventMessage = 'Fired when the ad playhead crosses third ' +
                'quartile.';
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
                },
            });
        }
    }

    /**
     * _onAdError
     * Any ad error handling comes through here.
     * @param {Event} adErrorEvent
     * @private
     */
    _onAdError(adErrorEvent) {
        let eventName = 'AD_ERROR';
        let eventMessage = adErrorEvent.getError();
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: eventMessage,
            status: 'warning',
            analytics: {
                category: this.eventCategory,
                action: eventName,
                label: eventMessage,
            },
        });
        this.cancel();
        this._clearSafetyTimer('AD_ERROR');
    }

    /**
     * _onError
     * Any error handling comes through here.
     * @param {String} message
     * @private
     */
    _onError(message) {
        let eventName = 'AD_SDK_ERROR';
        this.eventBus.broadcast(eventName, {
            name: eventName,
            message: message,
            status: 'error',
            analytics: {
                category: this.eventCategory,
                action: eventName,
                label: message,
            },
        });
        this.cancel();
        this._clearSafetyTimer('AD_SDK_ERROR');
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
        dankLog('AD_SAFETY_TIMER', 'Invoked timer from: ' + from,
            'success');
        this.safetyTimer = window.setTimeout(() => {
            let eventName = 'AD_SAFETY_TIMER';
            let eventMessage = 'Advertisement took too long to load.';
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
            dankLog('AD_SAFETY_TIMER', 'Cleared timer set at: ' + from,
                'success');
            clearTimeout(this.safetyTimer);
            this.safetyTimer = undefined;

            // Do additional logging, as we need to figure out when
            // for some reason our adsloader listener is not resolving.
            if (from === 'requestAd()') {
                // Send event for Tunnl debugging.
                if (typeof window['ga'] !== 'undefined') {
                    window['ga']('gd.send', {
                        hitType: 'event',
                        eventCategory: 'AD_SDK_AD_REQUEST_ERROR',
                        eventAction: this.gameId,
                        eventLabel: this.tag,
                    });
                }
            }
        }
    }

    /**
     * _loadDisplayAd
     * Create a 1x1 ad slot and call it.
     * @param {String} id
     * @param {Array} tags
     * @param {String} category
     * @private
     */
    _loadDisplayAd(id, tags, category) {
        // Create an element needed for binding the ad slot.
        const body = document.body || document.getElementsByTagName('body')[0];
        const container = document.createElement('div');
        container.id = `${this.prefix}baguette`;
        container.style.zIndex = '100';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        body.appendChild(container);

        // Load the DFP script.
        const gads = document.createElement('script');
        gads.async = true;
        gads.type = 'text/javascript';
        const useSSL = 'https:' === document.location.protocol;
        gads.src = `${(useSSL ? 'https:' : 'http:')}//www.googletagservices.com/tag/js/gpt.js`; // eslint-disable-line
        const script = document.getElementsByTagName('script')[0];
        script.parentNode.insertBefore(gads, script);

        // Set namespaces for DFP.
        window['googletag'] = window['googletag'] || {};
        window['googletag']['cmd'] = window['googletag']['cmd'] || [];

        // Create the ad slot, but wait for the callback first.
        googletag.cmd.push(() => {
            let ads = [];
            // Define our ad slot.
            ads[0] = googletag.defineSlot(
                '/1015413/Gamedistribution_ingame_1x1_crosspromo',
                [1, 1],
                `${this.prefix}baguette`
            )
                .setCollapseEmptyDiv(true, true)
                .addService(googletag.pubads());

            // Set some targeting.
            googletag.pubads().setTargeting('crossid', id);
            googletag.pubads().setTargeting('crosstags', tags);
            googletag.pubads().setTargeting('crosscategory', category);

            // Make sure to keep the ad hidden until refreshed.
            googletag.pubads().disableInitialLoad();

            // Enables all GPT services that have been defined.
            googletag.enableServices();

            // Display the advertisement, but don't show it.
            googletag.display(`${this.prefix}baguette`);

            // Show the ad.
            googletag.pubads().refresh([ads[0]]);
        });
    }
}

export default VideoAd;
