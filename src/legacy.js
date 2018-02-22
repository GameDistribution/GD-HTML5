'use strict';

/**
 * So here we make sure everything is backwards compatible with the old GD SDK.
 * This is the main entry for a CDN hosted build.
 * The main entry for including the SDK as npm package is main.js.
 */
import SDK from './main';

// Get the settings.
const settings = (typeof GD_OPTIONS === 'object' && GD_OPTIONS)
    ? GD_OPTIONS
    : (window.gdApi && typeof window.gdApi.q[0][0] === 'object' &&
        window.gdApi.q[0][0])
        ? window.gdApi.q[0][0]
        : {};

// Set the autoplay setting if we're getting legacy settings.
if (window.gdApi && typeof window.gdApi.q[0][0] === 'object' &&
    window.gdApi.q[0][0]) {
    // There are some legacy integrations using the new autoplay setting.
    if (!settings.hasOwnProperty('advertisementSettings')) {
        settings.advertisementSettings = {
            autoplay: true,
        };
    }
}

window.gdsdk = new SDK(settings);
window.gdApi = window.gdsdk;
