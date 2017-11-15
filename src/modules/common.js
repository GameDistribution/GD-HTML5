'use strict';

/* eslint-disable */
function extendDefaults(source, properties) {
    let property;
    for (property in properties) {
        if (properties.hasOwnProperty(property)) {
            source[property] = properties[property];
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

function getParentUrl() {
    // If the referrer is gameplayer.io, else we just return href.
    // The referrer can be set by Spil games.
    if (document.referrer.indexOf('gameplayer.io') !== -1) {
        // Now check if ref is not empty, otherwise we return a default.
        const defaultUrl = 'https://gamedistribution.com/';
        if (document.referrer.indexOf('?ref=') !== -1) {
            let returnedResult = document.referrer.substr(document.referrer.indexOf(
                '?ref=') + 5);
            if (returnedResult !== '') {
                if (returnedResult === '{portal%20name}' ||
                    returnedResult === '{portal name}') {
                    returnedResult = defaultUrl;
                } else if (returnedResult.indexOf('http') !== 0) {
                    returnedResult = 'http://' + returnedResult;
                }
            } else {
                returnedResult = defaultUrl;
            }
            return returnedResult;
        } else {
            return defaultUrl;
        }
    } else {
        if (document.referrer && document.referrer !== '') {
            return document.referrer;
        } else {
            return document.location.href;
        }
    }
}

function getParentDomain() {
    const refer = (window.location !== window.parent.location)
        ? document.referrer.split('/')[2]
        : document.location.host;
    return refer.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
}

export {
    extendDefaults,
    getCookie,
    getParentUrl,
    getParentDomain,
};
/* eslint-enable */
