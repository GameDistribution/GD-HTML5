"use strict";

/* eslint-disable */
function extendDefaults(source, properties) {
  let property;
  for (property in properties) {
    if (properties.hasOwnProperty(property)) {
      if (
        properties[property] !== null &&
        typeof properties[property] !== "undefined"
      ) {
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
  const referrer = params.gd_sdk_referrer_url
    ? params.gd_sdk_referrer_url
    : window.location !== window.parent.location
    ? document.referrer && document.referrer !== ""
      ? document.referrer.split("/")[2]
      : document.location.host
    : document.location.host;
  let domain = referrer
    .replace(/^(?:https?:\/\/)?(?:\/\/)?(?:www\.)?/i, "")
    .split("/")[0];

  // If the referrer is gameplayer.io. (Spil Games)
  if (document.referrer.indexOf("gameplayer.io") !== -1) {
    domain = "gamedistribution.com";

    // Now check if they provide us with a referrer URL.
    const spilReferrerUrl = getQueryString("ref", document.referrer);
    if (spilReferrerUrl) {
      let returnedResult = spilReferrerUrl;
      // Guess sometimes they can give us empty or wrong values.
      if (
        returnedResult !== "" &&
        returnedResult !== "{portal%20name}" &&
        returnedResult !== "{spilgames}" &&
        returnedResult !== "{portal name}"
      ) {
        returnedResult = fullyDecodeURI(returnedResult);
        // Remove protocol and self resolving protocol slashes.
        domain = returnedResult
          .replace(/^(?:https?:\/\/)?(?:\/\/)?(?:www\.)?/i, "")
          .split("/")[0];
      }
    }

    //console.info("Spil referrer domain: " + domain);
  } else if (document.referrer.indexOf("localhost") !== -1) {
    domain = "gamedistribution.com";
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
    //console.log("self-hosted referrer URL:", params.gd_sdk_referrer_url);
    return params.gd_sdk_referrer_url;
  }

  let url =
    window.location !== window.parent.location
      ? document.referrer && document.referrer !== ""
        ? document.referrer
        : document.location.href
      : document.location.href;

  // If the referrer is gameplayer.io. (Spil Games)
  if (document.referrer.indexOf("gameplayer.io") !== -1) {
    url = "https://gamedistribution.com";

    // Now check if they provide us with a referrer URL.
    const spilReferrerUrl = getQueryString("ref", document.referrer);
    if (spilReferrerUrl) {
      let returnedResult = spilReferrerUrl;
      // Guess sometimes they can give us empty or wrong values.
      if (
        returnedResult !== "" &&
        returnedResult !== "{portal%20name}" &&
        returnedResult !== "{spilgames}" &&
        returnedResult !== "{portal name}"
      ) {
        returnedResult = fullyDecodeURI(returnedResult);
        // Replace protocol and/ or self resolving protocol slashes.
        url = returnedResult.replace(/^(?:https?:\/\/)?(?:\/\/)?/i, "");
        url = `https://${url}`;
      }
    }

    // Get cookie consent.
    // const consent = getQueryString('consent', document.referrer);
    // if (consent) {
    //     url = `${url}/?consent=${consent}`;
    // }

    // console.info("Spil referrer URL: " + url);
  } else if (document.referrer.indexOf("localhost") !== -1) {
    url = "https://gamedistribution.com/";
  }

  // console.info('Referrer URL: ' + url);

  return url;
}

function getQueryString(field, url) {
  var href = url ? url : window.location.href;
  var reg = new RegExp("[?&]" + field + "=([^&#]*)", "i");
  var string = reg.exec(href);
  return string ? string[1] : null;
}

function getQueryParams() {
  let match;
  const pl = /\+/g; // Regex for replacing addition symbol with a space
  const search = /([^&=]+)=?([^&]*)/g;
  const decode = function(s) {
    return decodeURIComponent(s.toLowerCase().replace(pl, " "));
  };
  const query = window.location.search.substring(1);

  let urlParams = {};
  while ((match = search.exec(query))) {
    urlParams[decode(match[1])] = decode(match[2]);
  }

  return urlParams;
}

function isEncoded(uri) {
  uri = uri || "";
  return uri !== decodeURIComponent(uri);
}

function fullyDecodeURI(uri) {
  while (isEncoded(uri)) {
    uri = decodeURIComponent(uri);
  }
  return uri;
}

function updateQueryStringParameter(uri, key, value) {
  const re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  const separator = uri.indexOf("?") !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, "$1" + key + "=" + value + "$2");
  } else {
    return uri + separator + key + "=" + value;
  }
}

function getMobilePlatform() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return "windows";
  }

  if (/android/i.test(userAgent)) {
    return "android";
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return "ios";
  }

  return "";
}

function getScript(src, id, options) {
  return new Promise((resolve, reject) => {
    // Checks object's availability
    if (options && options.exists && options.exists()) {
      resolve();
      return;
    }

    const scriptTag =
      options && options.alternates && options.alternates.length > 0
        ? getScriptTag(options.alternates)
        : undefined;
    const library = scriptTag || document.createElement("script");

    const error_prefix =
      options && options.error_prefix ? options.error_prefix : "Failed:";

    library.onload = () => {
      if (options && options.exists && !options.exists()) {
        reject(`${error_prefix} ${src}`);
      } else {
        resolve();
      }
    };

    library.onerror = () => {
      reject(`${error_prefix} ${src}`);
    };

    if (!scriptTag) {
      library.type = "text/javascript";
      library.async = true;
      library.src = src;
      library.id = id;
      document.head.appendChild(library);
    }
  });
}

function getIframeDepth() {
  var iframe_level = 0;
  var current = window;

  try {
    while (current != current.parent) {
      iframe_level++;
      current = current.parent;
    }
  } catch (exc) {}

  return iframe_level;
}

function getMaxZIndex() {
  var zi,
    tmp = Array.from(document.querySelectorAll("body *")).map(a =>
      parseFloat(window.getComputedStyle(a).zIndex)
    );
  zi = tmp.length;
  tmp = tmp.filter(a => !isNaN(a));
  return tmp.length ? Math.max(tmp.sort((a, b) => a - b).pop(), zi) : zi;
}

function parseJSON(value) {
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {}
  }
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function isObjectEmpty(obj) {
  if (!obj) return false;

  for (var key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}

function getScriptTag(sources) {
  if (!sources || !sources.length) return;

  let scriptTags = document.querySelectorAll("script");
  if (!scriptTags) return;

  for (var i in scriptTags) {
    let script = scriptTags[i];
    if (sources.includes(script.src)) return script;
  }
}

function isLocalStorageAvailable() {
  var test = Date.now();
  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
function getClosestTopFrame() {
  let closestFrame = window;
  let hasCrossDomainError = false;

  try {
    while (closestFrame.parent.document !== closestFrame.document) {
      if (closestFrame.parent.document) {
        closestFrame = closestFrame.parent;
      } else {
        //chrome/ff set exception here
        hasCrossDomainError = true;
        break;
      }
    }
  } catch (e) {
    // Safari needs try/catch so sets exception here
    hasCrossDomainError = true;
  }

  return {
    closestFrame,
    hasCrossDomainError
  };
}

// get best page URL using info from getClosestTop
function getClosestTopPageUrl({ hasCrossDomainError, closestFrame }) {
  let closestPageTopUrl = "";

  if (!hasCrossDomainError) {
    // easy case- we can get top frame location
    closestPageTopUrl = closestFrame.location.href;
  } else {
    try {
      try {
        // If friendly iframe
        closestPageTopUrl = window.top.location.href;
      } catch (e) {
        //If chrome use ancestor origin array
        let aOrigins = window.location.ancestorOrigins;
        //Get last origin which is top-domain (chrome only):
        closestPageTopUrl = aOrigins[aOrigins.length - 1];
      }
    } catch (e) {
      closestPageTopUrl = closestFrame.document.referrer;
    }
  }

  return closestPageTopUrl;
}

function getClosestTopDomain() {
  try {
    let closestTopFrame = getClosestTopFrame();
    let closestTopPageUrl = getClosestTopPageUrl(closestTopFrame);
    let parser = window.document.createElement("a");
    parser.href = closestTopPageUrl;
    return parser.host;
  } catch (error) {}
}

function getIMASampleTags() {
  // let interstitial = [
  //   "https://pubads.g.doubleclick.net/gampad/ads?sz=480x70&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dnonlinear&correlator=",
  // ];

  let interstitial = [
    "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator=",
    // "https://pubads.g.doubleclick.net/gampad/ads?sz=480x70&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dnonlinear&correlator=",
    "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dredirectlinear&correlator=",
    // "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinearvpaid2js&correlator=",
    "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dredirecterror&correlator="
  ];

  let rewarded = [
    "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator="
  ];

  return {
    interstitial,
    rewarded
  };
}

function lsHasItem(key) {
  let value = localStorage.getItem(key);
  return value ? true : false;
}

function lsGetBoolean(key, defaultValue) {
  if (!lsHasItem(key)) return defaultValue;

  let value = localStorage.getItem(key);

  return value === "true" || value === true || value === 1 || value === "1"; // weird! (temp)
}

function lsGetNumber(key, defaultValue) {
  if (!lsHasItem(key)) return defaultValue;

  let value = localStorage.getItem(key);

  return Number(value);
}

function lsGetString(key, defaultValue) {
  if (!lsHasItem(key)) return defaultValue;

  let value = localStorage.getItem(key);

  return value.toString();
}

function lsRemoveItem(key) {
  localStorage.removeItem(key);
}

function lsSetItem(key, value) {
  localStorage.setItem(key, value);
}

const Ls = {
  has: lsHasItem,
  getBoolean: lsGetBoolean,
  getNumber: lsGetNumber,
  getString: lsGetString,
  available: isLocalStorageAvailable(),
  remove: lsRemoveItem,
  set: lsSetItem
};

export {
  extendDefaults,
  getParentUrl,
  getParentDomain,
  getQueryParams,
  getMobilePlatform,
  getQueryString,
  getScript,
  getIframeDepth,
  parseJSON,
  getKeyByValue,
  isObjectEmpty,
  getScriptTag,
  getClosestTopDomain,
  getIMASampleTags,
  Ls,
  getMaxZIndex
};

/* eslint-enable */
