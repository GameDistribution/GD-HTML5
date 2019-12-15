"use strict";
const Url = require("url-parse");

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

  // // Try to get top domain
  // let topDomain = getTopDomain();
  // if (topDomain) return topDomain;

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
  const decode = function (s) {
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
  var iFrameLevel = 0;
  var current = window;

  try {
    while (current != current.parent) {
      iFrameLevel++;
      current = current.parent;
    }
  } catch (exc) { }

  return iFrameLevel;
}

function parseJSON(value) {
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) { }
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

function getIMASampleTags() {
  // let interstitial = [
  //   "https://pubads.g.doubleclick.net/gampad/ads?sz=480x70&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dnonlinear&correlator=",
  // ];

  let interstitial = [
    "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator=",
    "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dredirectlinear&correlator=",
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

function getTopDomain() {
  let depth = getIframeDepth();
  if (depth === 0) return location.host.replace(/^www\.(.*)$/i, "$1");

  // ancestor origins
  if (location.ancestorOrigins && location.ancestorOrigins.length > 0)
    return location.ancestorOrigins[
      location.ancestorOrigins.length - 1
    ].replace(/^https?:\/\/(www\.)?(.*)$/i, "$2");

  if (depth === 1) {
    let parser = getSafeUrlParser(document.referrer);
    if (parser) return parser.host.replace(/^www\.(.*)$/i, "$1");
  }
}

function getSafeUrlParser(url) {
  if (!url || url === "") return;
  try {
    return new Url(url);
  } catch (error) { }
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
  getTopDomain,
  getIMASampleTags,
  Ls
};
/* eslint-enable */
