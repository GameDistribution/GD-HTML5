'use strict';

function getXMLData(url) {
    const request = new Request(url, {
        method: 'GET'
    });
    return fetch(request)
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, 'text/xml'))
        .catch((error) => error);
}

export { getXMLData }