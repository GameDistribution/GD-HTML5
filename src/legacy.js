'use strict';

/**
 * So here we make sure everything is backwards compatible with the old GD API.
 * This is the main entry for a CDN hosted build.
 * The main entry for including the SDK as npm package is main.js.
 */
import API from './main';
const settings = window.gdApi.q[0][0];
new API(settings);
