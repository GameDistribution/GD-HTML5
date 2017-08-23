'use strict';

import EventBus from '../components/EventBus';

import {extendDefaults} from '../modules/extendDefaults';
import {dankLog} from "../modules/dankLog";

let instance = null;

class VideoAd {

    constructor(options) {

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        const defaults = {
            debug: false,
            prefix: 'gdApi-',
            autoplay: true,
            responsive: true,
            width: 640,
            height: 360,
            locale: 'en',
            tag: 'https://pubads.g.doubleclick.net/gampad/ads?' +
            'sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&' +
            'impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&' +
            'cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator='
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        this.adsLoader = null;
        this.adsManager = null;
        this.adDisplayContainer = null;
        this.eventBus = new EventBus();
        this.safetyTimer = null;
        this.requestAttempts = 0;

        this.adsLoaderPromise = new Promise((resolve) => {
            this.eventBus.subscribe('AD_SDK_LOADER_READY', (arg) => resolve());
        });
        this.adsManagerPromise = new Promise((resolve) => {
            this.eventBus.subscribe('AD_SDK_MANAGER_READY', (arg) => resolve());
        });
    }

    /**
     * start - Start the VideoAd instance by first checking if we have auto play capabilities.
     * By calling start() we start the creation of the adsLoader, needed to request ads.
     * This is also the time where we can change other options based on context as well.
     * @public
     */
    start() {
        // Start ticking our safety timer. If the whole advertisement thing doesn't resolve without our set time, then screw this.
        this._startSafetyTimer();

        // Enable a responsive advertisement.
        // Assuming we only want responsive advertisements below 1024 pixel client width.
        this.options.responsive = (this.options.responsive && document.documentElement.clientWidth <= 1024);
        if (this.options.responsive) {
            this.options.width = document.documentElement.clientWidth;
            this.options.height = document.documentElement.clientHeight;
        }

        // We now want to know if we're going to run the advertisement with autoplay enabled.

        // Detect if we support HTML5 video auto play, which is needed to auto start our ad.
        // Video can only auto play on non touch devices.
        // It is near impossible to detect autoplay using ontouchstart or touchpoints these days.
        // So now we just load a fake audio file, see if it runs, if it does; then auto play is supported.
        const isAutoPlayPromise = new Promise((resolve, reject) => {
            if (this.options.autoplay) {
                this.options.autoplay = false;
                const mp3 = 'data:audio/mpeg;base64,/+MYxAAAAANIAUAAAASEEB/jwOFM/0MM/90b/+RhST//w4NFwOjf///PZu////9lns5GFDv//l9GlUIEEIAAAgIg8Ir/JGq3/+MYxDsLIj5QMYcoAP0dv9HIjUcH//yYSg+CIbkGP//8w0bLVjUP///3Z0x5QCAv/yLjwtGKTEFNRTMuOTeqqqqqqqqqqqqq/+MYxEkNmdJkUYc4AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
                const ogg = 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAAOyyzPIBHgF2b3JiaXMAAAAAAUAfAABAHwAAQB8AAEAfAACZAU9nZ1MAAAAAAAAAAAAA6p4zJQEAAAANJGeqCj3//////////5ADdm9yYmlzLQAAAFhpcGguT3JnIGxpYlZvcmJpcyBJIDIwMTAxMTAxIChTY2hhdWZlbnVnZ2V0KQAAAAABBXZvcmJpcw9CQ1YBAAABAAxSFCElGVNKYwiVUlIpBR1jUFtHHWPUOUYhZBBTiEkZpXtPKpVYSsgRUlgpRR1TTFNJlVKWKUUdYxRTSCFT1jFloXMUS4ZJCSVsTa50FkvomWOWMUYdY85aSp1j1jFFHWNSUkmhcxg6ZiVkFDpGxehifDA6laJCKL7H3lLpLYWKW4q91xpT6y2EGEtpwQhhc+211dxKasUYY4wxxsXiUyiC0JBVAAABAABABAFCQ1YBAAoAAMJQDEVRgNCQVQBABgCAABRFcRTHcRxHkiTLAkJDVgEAQAAAAgAAKI7hKJIjSZJkWZZlWZameZaouaov+64u667t6roOhIasBACAAAAYRqF1TCqDEEPKQ4QUY9AzoxBDDEzGHGNONKQMMogzxZAyiFssLqgQBKEhKwKAKAAAwBjEGGIMOeekZFIi55iUTkoDnaPUUcoolRRLjBmlEluJMYLOUeooZZRCjKXFjFKJscRUAABAgAMAQICFUGjIigAgCgCAMAYphZRCjCnmFHOIMeUcgwwxxiBkzinoGJNOSuWck85JiRhjzjEHlXNOSuekctBJyaQTAAAQ4AAAEGAhFBqyIgCIEwAwSJKmWZomipamiaJniqrqiaKqWp5nmp5pqqpnmqpqqqrrmqrqypbnmaZnmqrqmaaqiqbquqaquq6nqrZsuqoum65q267s+rZru77uqapsm6or66bqyrrqyrbuurbtS56nqqKquq5nqq6ruq5uq65r25pqyq6purJtuq4tu7Js664s67pmqq5suqotm64s667s2rYqy7ovuq5uq7Ks+6os+75s67ru2rrwi65r66os674qy74x27bwy7ouHJMnqqqnqq7rmarrqq5r26rr2rqmmq5suq4tm6or26os67Yry7aumaosm64r26bryrIqy77vyrJui67r66Ys67oqy8Lu6roxzLat+6Lr6roqy7qvyrKuu7ru+7JuC7umqrpuyrKvm7Ks+7auC8us27oxuq7vq7It/KosC7+u+8Iy6z5jdF1fV21ZGFbZ9n3d95Vj1nVhWW1b+V1bZ7y+bgy7bvzKrQvLstq2scy6rSyvrxvDLux8W/iVmqratum6um7Ksq/Lui60dd1XRtf1fdW2fV+VZd+3hV9pG8OwjK6r+6os68Jry8ov67qw7MIvLKttK7+r68ow27qw3L6wLL/uC8uq277v6rrStXVluX2fsSu38QsAABhwAAAIMKEMFBqyIgCIEwBAEHIOKQahYgpCCKGkEEIqFWNSMuakZM5JKaWUFEpJrWJMSuaclMwxKaGUlkopqYRSWiqlxBRKaS2l1mJKqcVQSmulpNZKSa2llGJMrcUYMSYlc05K5pyUklJrJZXWMucoZQ5K6iCklEoqraTUYuacpA46Kx2E1EoqMZWUYgupxFZKaq2kFGMrMdXUWo4hpRhLSrGVlFptMdXWWqs1YkxK5pyUzDkqJaXWSiqtZc5J6iC01DkoqaTUYiopxco5SR2ElDLIqJSUWiupxBJSia20FGMpqcXUYq4pxRZDSS2WlFosqcTWYoy1tVRTJ6XFklKMJZUYW6y5ttZqDKXEVkqLsaSUW2sx1xZjjqGkFksrsZWUWmy15dhayzW1VGNKrdYWY40x5ZRrrT2n1mJNMdXaWqy51ZZbzLXnTkprpZQWS0oxttZijTHmHEppraQUWykpxtZara3FXEMpsZXSWiypxNhirLXFVmNqrcYWW62ltVprrb3GVlsurdXcYqw9tZRrrLXmWFNtBQAADDgAAASYUAYKDVkJAEQBAADGMMYYhEYpx5yT0ijlnHNSKucghJBS5hyEEFLKnINQSkuZcxBKSSmUklJqrYVSUmqttQIAAAocAAACbNCUWByg0JCVAEAqAIDBcTRNFFXVdX1fsSxRVFXXlW3jVyxNFFVVdm1b+DVRVFXXtW3bFn5NFFVVdmXZtoWiqrqybduybgvDqKqua9uybeuorqvbuq3bui9UXVmWbVu3dR3XtnXd9nVd+Bmzbeu2buu+8CMMR9/4IeTj+3RCCAAAT3AAACqwYXWEk6KxwEJDVgIAGQAAgDFKGYUYM0gxphhjTDHGmAAAgAEHAIAAE8pAoSErAoAoAADAOeecc84555xzzjnnnHPOOeecc44xxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY0wAwE6EA8BOhIVQaMhKACAcAABACCEpKaWUUkoRU85BSSmllFKqFIOMSkoppZRSpBR1lFJKKaWUIqWgpJJSSimllElJKaWUUkoppYw6SimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaVUSimllFJKKaWUUkoppRQAYPLgAACVYOMMK0lnhaPBhYasBAByAwAAhRiDEEJpraRUUkolVc5BKCWUlEpKKZWUUqqYgxBKKqmlklJKKbXSQSihlFBKKSWUUkooJYQQSgmhlFRCK6mEUkoHoYQSQimhhFRKKSWUzkEoIYUOQkmllNRCSB10VFIpIZVSSiklpZQ6CKGUklJLLZVSWkqpdBJSKamV1FJqqbWSUgmhpFZKSSWl0lpJJbUSSkklpZRSSymFVFJJJYSSUioltZZaSqm11lJIqZWUUkqppdRSSiWlkEpKqZSSUmollZRSaiGVlEpJKaTUSimlpFRCSamlUlpKLbWUSkmptFRSSaWUlEpJKaVSSksppRJKSqmllFpJKYWSUkoplZJSSyW1VEoKJaWUUkmptJRSSymVklIBAEAHDgAAAUZUWoidZlx5BI4oZJiAAgAAQABAgAkgMEBQMApBgDACAQAAAADAAAAfAABHARAR0ZzBAUKCwgJDg8MDAAAAAAAAAAAAAACAT2dnUwAEAAAAAAAAAADqnjMlAgAAADzQPmcBAQA=';
                try {
                    const audio = new Audio();
                    const src = audio.canPlayType('audio/ogg') ? ogg : mp3;
                    audio.autoplay = true;
                    audio.volume = 0;
                    audio.addEventListener('playing', () => {
                        this.options.autoplay = true;
                    }, false);
                    audio.src = src;
                    setTimeout(() => {
                        dankLog('AD_SDK_AUTOPLAY', this.options.autoplay, 'success');
                        resolve();
                    }, 100);
                } catch (e) {
                    dankLog('AD_SDK_AUTOPLAY', this.options.autoplay, 'warning');
                    reject(e);
                }
            } else {
                dankLog('AD_SDK_AUTOPLAY', this.options.autoplay, 'success');
                resolve();
            }
        }).catch(() => {
            this._onError('Auto play promise did not resolve!');
        });

        // Now request the IMA SDK script.
        isAutoPlayPromise.then(() => this._loadIMAScript()).catch((error) => this._onError(error));
    }

    /**
     * play - Play the loaded advertisement.
     * @public
     */
    play() {
        // Play the requested advertisement whenever the adsManager is ready.
        this.adsManagerPromise.then(() => {
            // The IMA HTML5 SDK uses the AdDisplayContainer to play the video ads.
            // To initialize the AdDisplayContainer, call the play() method in a user action.
            if (!this.adsManager || !this.adDisplayContainer) {
                this._onError('Missing an adsManager or adDisplayContainer');
                return;
            }
            // Always initialize the container first.
            this.adDisplayContainer.initialize();

            try {
                // Initialize the ads manager. Ad rules playlist will start at this time.
                this.adsManager.init(this.options.width, this.options.height, google.ima.ViewMode.NORMAL);
                // Call play to start showing the ad. Single video and overlay ads will
                // start at this time; the call will be ignored for ad rules.
                this.adsManager.start();
            } catch (adError) {
                // An error may be thrown if there was a problem with the VAST response.
                this._onError(adError);
            }
        });
    }

    /**
     * _cancel - Makes it possible to stop an advertisement while its loading or playing.
     * This will clear out the adsManager, stop any ad playing and allowing new ads to be called.
     * @public
     */
    cancel() {
        // Todo: hide container
        // Todo: show container, with css animation
        // Destroy the adsManager so we can grab new ads after this.
        // If we don't then we're not allowed to call new ads based on google policies,
        // as they interpret this as an accidental video requests.
        // https://developers.google.com/interactive-media-ads/docs/sdks/android/faq#8
        Promise.all([
            this.adsLoaderPromise,
            this.adsManagerPromise
        ]).then(() => {
            if (this.adsManager) {
                this.adsManager.destroy();
            }
            if (this.adsLoader) {
                this.adsLoader.contentComplete();
            }

            // Preload new ads by doing a new request.
            if (this.requestAttempts <= 3) {
                if(this.requestAttempts > 1) {
                    dankLog('AD_SDK_REQUEST_ATTEMPT', this.requestAttempts, 'warning');
                }
                this._requestAds();
                this.requestAttempts++;
            }

            // Send event to tell that the whole advertisement thing is finished.
            this.eventBus.broadcast('AD_CANCELED', {
                name: 'AD_CANCELED',
                message: 'Advertisement has been canceled.',
                status: 'warning'
            });
        }).catch((error) => console.log(error));
    }

    /**
     * _loadIMAScript - Loads the Google IMA script using a <script> tag.
     * @private
     */
    _loadIMAScript() {
        // Load the HTML5 IMA SDK.
        const src = (this.options.debug) ? '//imasdk.googleapis.com/js/sdkloader/ima3_debug.js' : '//imasdk.googleapis.com/js/sdkloader/ima3.js';
        const script = document.getElementsByTagName('script')[0];
        const ima = document.createElement('script');
        ima.type = 'text/javascript';
        ima.async = true;
        ima.src = src;
        ima.onload = () => {
            this._createPlayer();
        };
        ima.onerror = () => {
            this._onError('IMA script failed to load!');
        };

        // Append the IMA script to the first script tag within the document.
        script.parentNode.insertBefore(ima, script);
    }

    /**
     * _createPlayer - Creates our staging/ markup for the advertisement.
     * @private
     */
    _createPlayer() {
        const body = document.getElementsByTagName('body')[0];

        const adContainer = document.createElement('div');
        adContainer.id = this.options.prefix + 'advertisement';
        adContainer.style.position = 'fixed';
        adContainer.style.zIndex = 99;
        adContainer.style.top = 0;
        adContainer.style.left = 0;
        adContainer.style.width = '100%';
        adContainer.style.height = '100%';
        adContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

        const adContainerInner = document.createElement('div');
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
            adContainer.style.boxShadow = '0 0 8px rgba(0, 0, 0, 1)';
        }
        adContainerInner.style.width = this.options.width + 'px';
        adContainerInner.style.height = this.options.height + 'px';

        adContainer.appendChild(adContainerInner);
        body.appendChild(adContainer);

        // We need to resize our adContainer when the view dimensions change.
        if (this.options.responsive) {
            window.addEventListener('resize', () => {
                this.options.width = document.documentElement.clientWidth;
                this.options.height = document.documentElement.clientHeight;
                adContainerInner.style.width = this.options.width + 'px';
                adContainerInner.style.height = this.options.height + 'px';
            });
        }

        this._setUpIMA();
    }

    /**
     * _setUpIMA - Create's a the adsLoader object.
     * @private
     */
    _setUpIMA() {
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
        this.adDisplayContainer = new google.ima.AdDisplayContainer(
            document.getElementById(this.options.prefix + 'advertisement_slot')
        );

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
        this.eventBus.broadcast('AD_SDK_LOADER_READY', {
            name: 'AD_SDK_LOADER_READY',
            message: this.options,
            status: 'success'
        });

        // Request new video ads to be pre-loaded.
        this._requestAds();
    }

    /**
     * _requestAds - Request advertisements.
     * @private
     */
    _requestAds() {
        if (typeof google === 'undefined') {
            this._onError('Unable to request ad, google IMA SDK not defined.');
            return;
        }

        try {
            // Request video new ads.
            const adsRequest = new google.ima.AdsRequest();
            adsRequest.adTagUrl = this.options.tag;

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
            this.eventBus.broadcast('AD_SDK_REQUEST_ADS', {
                name: 'AD_SDK_REQUEST_ADS',
                message: this.options.tag,
                status: 'success'
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
    _onAdsManagerLoaded(adsManagerLoadedEvent) {
        // Get the ads manager.
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
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
            window.addEventListener('resize', () => {
                this.adsManager.resize(this.options.width, this.options.height, google.ima.ViewMode.NORMAL);
            });
        }

        // Once the ad display container is ready and ads have been retrieved,
        // we can use the ads manager to display the ads.
        if (this.adsManager && this.adDisplayContainer) {
            this.requestAttempts = 0; // Reset attempts as we've successfully setup the adsloader (again).
            this.eventBus.broadcast('AD_SDK_MANAGER_READY', {
                name: 'AD_SDK_MANAGER_READY',
                message: this.adsManager,
                status: 'success'
            });
        }
    }

    /**
     * _onAdEvent- This is where all the event handling takes place.
     * @param adEvent
     * @private
     */
    _onAdEvent(adEvent) {
        // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED) don't have ad object associated.
        switch (adEvent.type) {
            case google.ima.AdEvent.Type.AD_BREAK_READY:
                this.eventBus.broadcast('AD_BREAK_READY', {
                    name: 'AD_BREAK_READY',
                    message: 'Fired when an ad rule or a VMAP ad break would have played if autoPlayAdBreaks is false.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.AD_METADATA:
                this.eventBus.broadcast('AD_METADATA', {
                    name: 'AD_METADATA',
                    message: 'Fired when an ads list is loaded.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
                this.eventBus.broadcast('ALL_ADS_COMPLETED', {
                    name: 'AD_ALL_ADS_COMPLETED',
                    message: 'Fired when the ads manager is done playing all the ads.',
                    status: 'success'
                });

                // Destroy the adsManager so we can grab new ads after this.
                // If we don't then we're not allowed to call new ads based on google policies,
                // as they interpret this as an accidental video requests.
                // https://developers.google.com/interactive-media-ads/docs/sdks/android/faq#8
                Promise.all([
                    this.adsLoaderPromise,
                    this.adsManagerPromise
                ]).then(() => {
                    if (this.adsManager) {
                        this.adsManager.destroy();
                    }
                    if (this.adsLoader) {
                        this.adsLoader.contentComplete();
                    }

                    // Preload new ads by doing a new request.
                    this._requestAds();

                    // Send event to tell that the whole advertisement thing is finished.
                    this.eventBus.broadcast('AD_SDK_FINISHED', {
                        name: 'AD_SDK_FINISHED',
                        message: 'IMA is ready for new requests.',
                        status: 'success'
                    });
                }).catch((error) => console.log(error));

                break;
            case google.ima.AdEvent.Type.CLICK:
                this.eventBus.broadcast('CLICK', {
                    name: 'AD_CLICK',
                    message: 'Fired when the ad is clicked.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.COMPLETE:
                this.eventBus.broadcast('COMPLETE', {
                    name: 'AD_COMPLETE',
                    message: 'Fired when the ad completes playing.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED:
                this.eventBus.broadcast('CONTENT_PAUSE_REQUESTED', {
                    name: 'AD_CONTENT_PAUSE_REQUESTED',
                    message: 'Fired when content should be paused. This usually happens right before an ad is about to cover the content.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
                this.eventBus.broadcast('CONTENT_RESUME_REQUESTED', {
                    name: 'AD_CONTENT_RESUME_REQUESTED',
                    message: 'Fired when content should be resumed. This usually happens when an ad finishes or collapses.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.DURATION_CHANGE:
                this.eventBus.broadcast('DURATION_CHANGE', {
                    name: 'AD_DURATION_CHANGE',
                    message: 'Fired when the ad\'s duration changes.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.FIRST_QUARTILE:
                this.eventBus.broadcast('FIRST_QUARTILE', {
                    name: 'AD_FIRST_QUARTILE',
                    message: 'Fired when the ad playhead crosses first quartile.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.IMPRESSION:
                this.eventBus.broadcast('IMPRESSION', {
                    name: 'AD_IMPRESSION',
                    message: 'Fired when the impression URL has been pinged.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.INTERACTION:
                this.eventBus.broadcast('INTERACTION', {
                    name: 'AD_BREAK_READY',
                    message: 'Fired when an ad triggers the interaction callback. Ad interactions contain an interaction ID string in the ad data.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.LINEAR_CHANGED:
                this.eventBus.broadcast('LINEAR_CHANGED', {
                    name: 'AD_LINEAR_CHANGED',
                    message: 'Fired when the displayed ad changes from linear to nonlinear, or vice versa.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.LOADED:
                this.eventBus.broadcast('LOADED', {
                    name: 'AD_LOADED',
                    message: 'Fired when ad data is available.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.LOG:
                const adData = adEvent.getAdData();
                if (adData['adError']) {
                    this.eventBus.broadcast('LOG', {
                        name: 'AD_LOG',
                        message: adEvent.getAdData(),
                        status: 'warning'
                    });
                }
                break;
            case google.ima.AdEvent.Type.MIDPOINT:
                this.eventBus.broadcast('MIDPOINT', {
                    name: 'AD_MIDPOINT',
                    message: 'Fired when the ad playhead crosses midpoint.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.PAUSED:
                this.eventBus.broadcast('PAUSED', {
                    name: 'AD_PAUSED',
                    message: 'Fired when the ad is paused.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.RESUMED:
                this.eventBus.broadcast('RESUMED', {
                    name: 'AD_RESUMED',
                    message: 'Fired when the ad is resumed.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED:
                this.eventBus.broadcast('SKIPPABLE_STATE_CHANGED', {
                    name: 'AD_SKIPPABLE_STATE_CHANGED',
                    message: 'Fired when the displayed ads skippable state is changed.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.SKIPPED:
                this.eventBus.broadcast('SKIPPED', {
                    name: 'AD_SKIPPED',
                    message: 'Fired when the ad is skipped by the user.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.STARTED:
                this.eventBus.broadcast('STARTED', {
                    name: 'AD_STARTED',
                    message: 'Fired when the ad starts playing.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.THIRD_QUARTILE:
                this.eventBus.broadcast('THIRD_QUARTILE', {
                    name: 'AD_THIRD_QUARTILE',
                    message: 'Fired when the ad playhead crosses third quartile.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.USER_CLOSE:
                this.eventBus.broadcast('USER_CLOSE', {
                    name: 'AD_USER_CLOSE',
                    message: 'Fired when the ad is closed by the user.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.VOLUME_CHANGED:
                this.eventBus.broadcast('VOLUME_CHANGED', {
                    name: 'AD_VOLUME_CHANGED',
                    message: 'Fired when the ad volume has changed.',
                    status: 'success'
                });
                break;
            case google.ima.AdEvent.Type.VOLUME_MUTED:
                this.eventBus.broadcast('VOLUME_MUTED', {
                    name: 'AD_VOLUME_MUTED',
                    message: 'Fired when the ad volume has been muted.',
                    status: 'success'
                });
                break;
        }
    }

    /**
     * _onAdError - Any ad error handling comes through here.
     * @param adErrorEvent
     * @private
     */
    _onAdError(adErrorEvent) {
        this.eventBus.broadcast('AD_ERROR', {
            name: 'AD_ERROR',
            message: adErrorEvent.getError(),
            status: 'warning'
        });
        this.cancel();
        window.clearTimeout(this.safetyTimer);
    }

    /**
     * _onError - Any error handling comes through here.
     * @param message
     * @private
     */
    _onError(message) {
        this.eventBus.broadcast('AD_SDK_ERROR', {
            name: 'AD_SDK_ERROR',
            message: message,
            status: 'error'
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
    _startSafetyTimer() {
        // Todo: restart this timer on NEW adsrequest.
        this.safetyTimer = window.setTimeout(() => {
            this.eventBus.broadcast('AD_SAFETY_TIMER', {
                name: 'AD_SAFETY_TIMER',
                message: 'Advertisement took too long to load.',
                status: 'warning'
            });
            this.cancel();
            window.clearTimeout(this.safetyTimer);
        }, 12000);
        if (this.options.autoplay) {
            this.eventBus.subscribe('STARTED', () => {
                dankLog('AD_SDK_SAFETY_TIMER', 'Cleared the safety timer.', 'success');
                window.clearTimeout(this.safetyTimer);
            });
        } else {
            this.eventBus.subscribe('AD_SDK_MANAGER_READY', () => {
                dankLog('AD_SDK_SAFETY_TIMER', 'Cleared the safety timer.', 'success');
                window.clearTimeout(this.safetyTimer);
            });
        }
    }
}

export default VideoAd;