'use strict';

/**
 * So here we make sure everything is backwards compatible with the old GD SDK.
 * This is the main entry for a CDN hosted build.
 * The main entry for including the SDK as npm package is main.js.
 */
import SDKInternal from './main';
import {AdType} from './modules/adType';

// Get the settings.
const settings =
    typeof GD_OPTIONS === 'object' && GD_OPTIONS
        ? GD_OPTIONS
        : window.gdApi && typeof window.gdApi.q[0][0] === 'object' && window.gdApi.q[0][0]
            ? window.gdApi.q[0][0]
            : {};

// Set the autoplay setting if we're getting legacy settings.
if (window.gdApi && typeof window.gdApi.q[0][0] === 'object' && window.gdApi.q[0][0]) {
    // There are some legacy integrations using the new autoplay setting.
    if (!settings.hasOwnProperty('advertisementSettings')) {
        settings.advertisementSettings = {
            autoplay: true,
        };
    }
}

// Internal sdk instance
const sdk = new SDKInternal(settings);

/**
 */
function SDKDeprecated() {
    /**
     * [DEPRECATED]
     * showBanner
     * Used by our developer to call a video advertisement.
     * @public
     */
    this.showBanner = function() {
        sdk.showBanner();
    };

    /**
     * [DEPRECATED]
     * play
     * GD Logger sends how many times 'PlayGame' is called. If you
     * invoke 'PlayGame' many times, it increases 'PlayGame' counter and
     * sends this counter value.
     * @public
     */
    this.play = function() {};

    /**
     * [DEPRECATED]
     * customLog
     * GD Logger sends how many times 'CustomLog' that is called
     * related to given by _key name. If you invoke 'CustomLog' many times,
     * it increases 'CustomLog' counter and sends this counter value.
     * @param {String} key
     * @public
     */
    this.customLog = function() {};
}

/**
 */
function SDK() {
    /**
     * AdType
     * Supported ad types
     */
    this.AdType = AdType;

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
    this.preloadAd = function(adType) {
        return sdk.preloadAd(adType);
    };

    /**
     * showAd
     * Used by our developer to call a type of video advertisement.
     * @param {String} adType
     * @param {object} options
     * @return {Promise<any>}
     * @public
     */
    this.showAd = function(adType, options) {
        if (adType === AdType.Display) {
            return sdk.showDisplayAd(options);
        }
        return sdk.showAd(adType);
    };

    /**
     * cancelAd
     * Cancels the current loaded/ running advertisement.
     * @return {Promise<void>}
     */
    this.cancelAd = function() {
        return sdk.cancelAd();
    };

    /**
     * openConsole
     * Enable debugging, we also set a value in localStorage,
     * so we can also enable debugging without setting the property.
     * This is nice for when we're trying to debug a game that is not ours.
     * @public
     */
    this.openConsole = function() {
        sdk.openConsole();
    };
}

SDK.prototype = new SDKDeprecated();
window.gdsdk = new SDK();
window.gdApi = window.gdsdk;