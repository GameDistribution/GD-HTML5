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

function getParentDomain() {
    // If we get a hardcoded referrer URL as a query parameter,
    // use that (mainly for framed games)
    let params = getQueryParams();
    const referrer = params.gd_sdk_referrer_url ?
        params.gd_sdk_referrer_url : (window.location !== window.parent.location)
        ? (document.referrer && document.referrer !== '')
            ? document.referrer.split('/')[2]
            : document.location.host
        : document.location.host;
    let domain = referrer
        .replace(/^(?:https?:\/\/)?(?:\/\/)?(?:www\.)?/i, '')
        .split('/')[0];

    // If the referrer is gameplayer.io. (Spil Games)
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        domain = 'gamedistribution.com';

        // Now check if they provide us with a referrer URL.
        const spilReferrerUrl = getQueryString('ref', document.referrer);
        if (spilReferrerUrl) {
            let returnedResult = spilReferrerUrl;
            // Guess sometimes they can give us empty or wrong values.
            if (returnedResult !== '' &&
                returnedResult !== '{portal%20name}' &&
                returnedResult !== '{spilgames}' &&
                returnedResult !== '{portal name}') {
                returnedResult = fullyDecodeURI(returnedResult);
                // Remove protocol and self resolving protocol slashes.
                domain = returnedResult
                    .replace(/^(?:https?:\/\/)?(?:\/\/)?(?:www\.)?/i, '')
                    .split('/')[0];
            }
        }

        console.info('Spil referrer domain: ' + domain);
    } else if (document.referrer.indexOf('localhost') !== -1) {
        domain = 'gamedistribution.com';
    }

    // if (params.gd_sdk_referrer_url) {
    //     console.log('self-hosted referrer domain:', domain);
    // } else {
    //     console.log('referrer domain:', domain);
    // }

    // console.info('Referrer domain: ' + domain);

    return domain;
}

function getParentUrl() {
    // If we get a hardcoded referrer URL as a query parameter,
    // use that (mainly for framed games).
    let params = getQueryParams();
    if (params.gd_sdk_referrer_url) {
        console.log('self-hosted referrer URL:', params.gd_sdk_referrer_url);
        return params.gd_sdk_referrer_url;
    }

    let url = (window.location !== window.parent.location)
        ? (document.referrer && document.referrer !== '')
            ? document.referrer
            : document.location.href
        : document.location.href;

    // If the referrer is gameplayer.io. (Spil Games)
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        url = 'https://gamedistribution.com';

        // Now check if they provide us with a referrer URL.
        const spilReferrerUrl = getQueryString('ref', document.referrer);
        if (spilReferrerUrl) {
            let returnedResult = spilReferrerUrl;
            // Guess sometimes they can give us empty or wrong values.
            if (returnedResult !== '' &&
                returnedResult !== '{portal%20name}' &&
                returnedResult !== '{spilgames}' &&
                returnedResult !== '{portal name}') {
                returnedResult = fullyDecodeURI(returnedResult);
                // Replace protocol and/ or self resolving protocol slashes.
                url = returnedResult.replace(/^(?:https?:\/\/)?(?:\/\/)?/i, '');
                url = `https://${url}`;
            }
        }

        // Get cookie consent.
        // const consent = getQueryString('consent', document.referrer);
        // if (consent) {
        //     url = `${url}/?consent=${consent}`;
        // }

        console.info('Spil referrer URL: ' + url);
    } else if (document.referrer.indexOf('localhost') !== -1) {
        url = 'https://gamedistribution.com/';
    }

    // console.info('Referrer URL: ' + url);

    return url;
}

function getQueryString(field, url) {
    var href = url ? url : window.location.href;
    var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
    var string = reg.exec(href);
    return string ? string[1] : null;
}

function getQueryParams(){
    let match;
    const pl = /\+/g;  // Regex for replacing addition symbol with a space
    const search = /([^&=]+)=?([^&]*)/g;
    const decode = function (s) {
        return decodeURIComponent(s.toLowerCase().replace(pl, " "));
    };
    const query = window.location.search.substring(1);

    let urlParams = {};
    while (match = search.exec(query)) {
        urlParams[decode(match[1])] = decode(match[2]);
    }

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
    getParentUrl,
    getParentDomain,
    getQueryParams,
    updateQueryStringParameter,
    getMobilePlatform,
    getQueryString,
};
/* eslint-enable */
