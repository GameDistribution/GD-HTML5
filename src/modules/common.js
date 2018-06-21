'use strict';

/* eslint-disable */
function extendDefaults(source, properties) {
    let property;
    for (property in properties) {
        if (properties.hasOwnProperty(property)) {
            if(properties[property] !== null &&
                typeof properties[property] !== 'undefined') {
                source[property] = properties[property];
            }
        }
    }
    return source;
}

function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function getParentDomain() {
    // If we get a hardcoded referrer URL as a query parameter,
    // use that (mainly for framed games)
    let params = getQueryParams();
    const referrer = params.GD_SDK_REFERRER_URL ?
        params.GD_SDK_REFERRER_URL : (window.location !== window.parent.location)
        ? (document.referrer && document.referrer !== '')
            ? document.referrer.split('/')[2]
            : document.location.host
        : document.location.host;
    let domain = referrer.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];

    // If the referrer is gameplayer.io. (Spil Games)
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        domain = 'gamedistribution.com';
        // Now check if they provide us with a referrer URL.
        if (document.referrer.indexOf('?ref=') !== -1) {
            let returnedResult = document.referrer.substr(document.referrer.indexOf(
                '?ref=') + 5);
            // Guess sometimes they can give us empty or wrong values.
            if (returnedResult !== '' &&
                returnedResult !== '{portal%20name}' &&
                returnedResult !== '{portal name}') {
                returnedResult = fullyDecodeURI(returnedResult);
                domain = returnedResult.replace(
                    /^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
                console.info('Spil referrer domain: ' + domain);
            }
        }
    }
    return domain;
}

function getParentUrl() {
    // If we get a hardcoded referrer URL as a query parameter,
    // use that (mainly for framed games).
    let params = getQueryParams();
    if (params.GD_SDK_REFERRER_URL) {
        return params.GD_SDK_REFERRER_URL;
    }

    let url = (window.location !== window.parent.location)
        ? (document.referrer && document.referrer !== '')
            ? document.referrer
            : document.location.href
        : document.location.href;

    // If the referrer is gameplayer.io. (Spil Games)
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        url = 'https://gamedistribution.com/';
        // Now check if they provide us with a referrer URL.
        if (document.referrer.indexOf('?ref=') !== -1) {
            let returnedResult = document.referrer.substr(document.referrer.indexOf(
                '?ref=') + 5);
            // Guess sometimes they can give us empty or wrong values.
            if (returnedResult !== '' &&
                returnedResult !== '{portal%20name}' &&
                returnedResult !== '{spilgames}' &&
                returnedResult !== '{portal name}') {
                returnedResult = fullyDecodeURI(returnedResult);
                url = (returnedResult.indexOf('http') === -1) ? 'http://' +
                    returnedResult : returnedResult;
                console.info('Spil referrer URL: ' + url);
            }
        }
    } else if (document.referrer.indexOf('localhost') !== -1) {
        url = 'https://gamedistribution.com/';
    }
    return url;
}

function getQueryParams(){
    let match;
    const pl = /\+/g;  // Regex for replacing addition symbol with a space
    const search = /([^&=]+)=?([^&]*)/g;
    const decode = function (s) {
        return decodeURIComponent(s.replace(pl, " "));
    };
    const query = window.location.search.substring(1);

    let urlParams = {};
    while (match = search.exec(query))
        urlParams[decode(match[1])] = decode(match[2]);

    return urlParams;
}

function isEncoded(uri) {
    uri = uri || '';
    return uri !== decodeURIComponent(uri);
}

function fullyDecodeURI(uri){
    while (isEncoded(uri)){
        uri = decodeURIComponent(uri);
    }
    return uri;
}

function updateQueryStringParameter(uri, key, value) {
    const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
    const separator = uri.indexOf('?') !== -1 ? '&' : '?';
    if (uri.match(re)) {
        return uri.replace(re, '$1' + key + '=' + value + '$2');
    } else {
        return uri + separator + key + '=' + value;
    }
}

function getMobilePlatform() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
        return 'windows';
    }

    if (/android/i.test(userAgent)) {
        return 'android';
    }

    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return 'ios';
    }

    return '';
}

export {
    extendDefaults,
    getCookie,
    getParentUrl,
    getParentDomain,
    updateQueryStringParameter,
    getMobilePlatform,
};
/* eslint-enable */
