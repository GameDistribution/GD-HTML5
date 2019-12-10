"use strict";

if (!global._babelPolyfill) {
  require("babel-polyfill");
}

import EventBus from "../components/EventBus";
import { AdType } from "../modules/adType";
import {
  extendDefaults,
  getQueryString,
  getScript,
  getKeyByValue,
  isObjectEmpty,
  getIMASampleTags,
  Ls
} from "../modules/common";

import canautoplay from "can-autoplay";

let instance = null;

import isFunction from "is-function";

/**
 * VideoAd
 */
class VideoAd {
  /**
   * Constructor of VideoAd.
   * @param {String} container
   * @param {Object} options
   * @return {*}
   */
  constructor(container, options, location) {
    // Make this a singleton.
    if (instance) return instance;
    else instance = this;

    const defaults = {
      debug: false,
      width: 640,
      height: 360,
      locale: "en"
    };

    if (options) this.options = extendDefaults(defaults, options);
    else this.options = defaults;

    this.prefix = "gdsdk__";
    this.adsLoader = null;
    this.adsManager = null;
    this.adDisplayContainer = null;
    this.eventBus = new EventBus();
    this.safetyTimer = null;
    this.containerTransitionSpeed = 300;
    this.adCount = 0;
    this.adTypeCount = 0;
    this.preloadedAdType = null;
    this.requestRunning = false;
    this.parentDomain = location.parentDomain;
    this.parentURL = location.parentURL;
    this.adDisplayContainerInitialized = false;
    this.IMASampleTags = getIMASampleTags();

    // Set &npa= or other consent values. A parentURL parameter with string value 0,
    // equals given consent, which is now our default.
    this.userAllowedPersonalizedAds =
      document.location.search.indexOf("gdpr-targeting=0") >= 0 ||
      document.cookie.indexOf("ogdpr_advertisement=0") >= 0
        ? "0"
        : "1";

    // for any girlsgogames (partner) domain or subdomain
    // we dont want to allow personalizedAds
    // I added dot (.) at the end of domain name,
    // to prevent name confussion with other pages ( like game name is = girlsgogames etc.)
    if (this.parentDomain.includes("girlsgogames")) {
      this.userAllowedPersonalizedAds = false;
    }

    // Flash games load this HTML5 SDK as well. This means that sometimes
    // the ad should not be created outside of the borders of the game.
    // The Flash SDK passes us the container ID for us to use.
    // Otherwise we just create the container ourselves.
    this.thirdPartyContainer =
      container !== "" ? document.getElementById(container) : null;

    // Make sure given width and height doesn't contain non-numbers.
    this.options.width =
      typeof this.options.width === "number"
        ? this.options.width
        : this.options.width === "100%"
        ? 640
        : this.options.width.replace(/[^0-9]/g, "");
    this.options.height =
      typeof this.options.height === "number"
        ? this.options.height
        : this.options.height === "100%"
        ? 360
        : this.options.height.replace(/[^0-9]/g, "");

    const viewWidth =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    const viewHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;
    this.options.width = this.thirdPartyContainer
      ? this.thirdPartyContainer.offsetWidth
      : viewWidth;
    this.options.height = this.thirdPartyContainer
      ? this.thirdPartyContainer.offsetHeight
      : viewHeight;

    // Targeting and reporting values.
    this.gameId = "0";
    this.category = "";
    this.tags = [];
    this.eventCategory = "AD";

    // Subscribe to the LOADED event as we will want to clear our initial
    // safety timer, but also start a new one, as sometimes advertisements
    // can have trouble starting.
    this.eventBus.subscribe(
      "LOADED",
      () => {
        // Start our safety timer every time an ad is loaded.
        // It can happen that an ad loads and starts, but has an error
        // within itself, so we never get an error event from IMA.
        this._clearSafetyTimer("LOADED");
        this._startSafetyTimer(8000, "LOADED");
      },
      "ima"
    );

    // Subscribe to the STARTED event, so we can clear the safety timer
    // started from the LOADED event. This is to avoid any problems within
    // an advertisement itself, like when it doesn't start or has
    // a javascript error, which is common with VPAID.
    this.eventBus.subscribe(
      "STARTED",
      () => {
        this._clearSafetyTimer("STARTED");
      },
      "ima"
    );
  }

  /**
   * start
   * By calling start() we start the creation of the adsLoader, needed to request ads.
   * @public
   * @return {Promise<[any , any]>}
   */
  async start() {
    try {
      // Load the PreBid header bidding solution.
      // This can load parallel to the IMA script.
      // const preBidScriptPaths = [
      //   "https://test-hb.improvedigital.com/pbw/gameDistribution.min.js",
      //   "https://hb.improvedigital.com/pbw/gameDistributionV1.1.min.js",
      //   "http://test-hb.improvedigital.com/pbw/gameDistribution.min.js",
      //   "http://hb.improvedigital.com/pbw/gameDistributionV1.1.min.js"
      // ];

      // const preBidURL = this.options.debug
      //   ? preBidScriptPaths[0]
      //   : preBidScriptPaths[1];

      const preBidScriptPaths = [
        "https://hb.improvedigital.com/pbw/gameDistributionV1.1.min.js",
        "http://hb.improvedigital.com/pbw/gameDistributionV1.1.min.js"
      ];

      const preBidURL = preBidScriptPaths[0];

      // set game id for hb (bannner ads) before script loading.
      window.HB_OPTIONSgd = { gameId: this.gameId };

      await getScript(preBidURL, "gdsdk_prebid", {
        alternates: preBidScriptPaths,
        error_prefix: "Blocked:",
        exists: () => {
          return window["idhbgd"];
        }
      });

      // Set header bidding namespace.
      window.idhbgd = window.idhbgd || {};
      window.idhbgd.que = window.idhbgd.que || [];

      // Load the IMA script, wait for it to have loaded before proceeding to build
      // the markup and adsLoader instance.
      const imaScriptPaths = [
        "https://imasdk.googleapis.com/js/sdkloader/ima3_debug.js",
        "https://imasdk.googleapis.com/js/sdkloader/ima3.js",
        "http://imasdk.googleapis.com/js/sdkloader/ima3_debug.js",
        "http://imasdk.googleapis.com/js/sdkloader/ima3.js"
      ];
      const imaURL = this.options.debug ? imaScriptPaths[0] : imaScriptPaths[1];
      await getScript(imaURL, "gdsdk_ima", {
        alternates: imaScriptPaths,
        error_prefix: "Blocked:",
        exists: () => {
          return window["google"] && window["google"]["ima"];
        }
      });

      // Build the markup for the adsLoader instance.
      this._createPlayer();

      // Now the google namespace is set so we can setup the adsLoader instance
      // and bind it to the newly created markup.
      this._setUpIMA();
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * _getAdVastUrl
   * Request adtagurl from headerlift.
   * @param {String} adType
   * @return {Promise} Promise that returns a VAST URL like https://pubads.g.doubleclick.net/...
   * @private
   */
  _getAdVastUrl(adType) {
    return new Promise(resolve => {
      // If we want a test ad.
      if (
        Ls.available &&
        Ls.getBoolean("gd_debug_ex") &&
        Ls.getBoolean("gd_tag")
      ) {
        let imaSamples = this.IMASampleTags[adType];
        let index = Math.floor(Math.random() * imaSamples.length);
        let sampleTag = imaSamples[index];
        resolve(sampleTag);
        return;
      }

      // If we want a normal interstitial with header bidding.
      try {
        // Reporting counters.
        // Reset the ad counter for midroll reporting.
        if (this.adTypeCount === 1) this.adCount = 0;
        this.adCount++;
        this.adTypeCount++;

        this._getTunnlKeys(adType)
          .then(({ data }) => {
            if (typeof window.idhbgd.requestAds === "undefined") {
              throw new Error(
                "Prebid.js wrapper script hit an error or didn't exist!"
              );
            }

            // Create the ad unit name based on given Tunnl data.
            // Default is the gamedistribution.com ad unit.
            const nsid = data.nsid ? data.nsid : "TNL_T-17102571517";
            const tid = data.tid ? data.tid : "TNL_NS-18101700058";
            const unit = `${nsid}/${tid}`;

            // Make sure to remove these properties as we don't
            // want to pass them as key values.
            delete data.nsid;
            delete data.tid;

            // Set the consent string and pass it to the header bidding wrapper.
            // The default always allows personalised ads.
            // The consent string given by Tunnl is set within their system, by domain.
            // So if you want to disable personalised ads for a complete domain by default,
            // then generate a "fake" string and add it to Tunnl for that domain.
            // An exception to this is whenever a proper IAB CMP solution is found, which
            // means there is an "euconsent" cookie with a consent string. The header bidding
            // wrapper will then ignore any consent string given by the SDK or Tunnl, and will
            // use this user generated consent string instead.
            const consentString = data.consent_string
              ? data.consent_string
              : "BOWJjG9OWJjG9CLAAAENBx-AAAAiDAAA";

            // Add test parameter for Tunnl.
            Object.assign(data, {
              tnl_system: "1",
              tnl_content_category: this.category.toLowerCase()
            });

            // Send ad request event
            this.eventBus.broadcast("AD_REQUEST", {
              message: data.tnl_ad_pos
            });

            // Make the request for a VAST tag from the Prebid.js wrapper.
            // Get logging from the wrapper using: ?idhbgd_debug=true
            // To get a copy of the current config: copy(idhbgd.getConfig());
            window.idhbgd.que.push(() => {
              window.idhbgd.setAdserverTargeting(data);
              window.idhbgd.setDfpAdUnitCode(unit);
              window.idhbgd.setRefererUrl(encodeURIComponent(this.parentURL));

              // This is to add a flag, which if set to false;
              // non-personalized ads get requested from DFP and a no-consent
              // string - BOa7h6KOa7h6KCLABBENCDAAAAAjyAAA - is sent to all SSPs.
              // If set to true, then the wrapper will continue as if no consent was given.
              // This is only for Google, as google is not part of the IAB group.
              // eslint-disable-next-line
              window.idhbgd.allowPersonalizedAds(
                !!parseInt(this.userAllowedPersonalizedAds)
              );

              // enable 'rewardedVideo' in second release requested by Jozef;
              // let slotId='video1';
              let slotId =
                data.tnl_ad_pos === "rewarded"
                  ? "rewardedVideo"
                  : data.tnl_ad_pos === "gdbanner"
                  ? "gd__banner"
                  : "video1";

              // Pass on the IAB CMP euconsent string. Most SSP's are part of the IAB group.
              // So they will interpret and apply proper consent rules based on this string.
              window.idhbgd.setDefaultGdprConsentString(consentString);
              window.idhbgd.requestAds({
                slotIds: [slotId],
                callback: vastUrl => {
                  resolve(vastUrl);
                }
              });
            });
          })
          .catch(error => {
            throw new Error(error);
          });
      } catch (error) {
        // reject(error);
        throw new Error(error);
      }
    });
  }

  /**
   * _tunnlReportingKeys
   * Tunnl reporting needs its own custom tracking keys.
   * @param {String} adType
   * @return {Promise<any>}
   * @private
   */
  _getTunnlKeys(adType) {
    return new Promise(resolve => {
      // We're not allowed to run Google Ads within Cordova apps.
      // However we can retrieve different branded ads like Improve Digital.
      // So we run a special ad tag for that when running in a native web view.
      // Todo: Create a dynamic solutions to get the bundleid's for in web view ads requests.
      // http://cdn.gameplayer.io/embed/576742227280293818/?ref=http%3A%2F%2Fm.hopy.com
      // Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/32.0.1700.14 Mobile Crosswalk/3.32.53.0 Mobile Safari/537.36
      let pageUrl = "";
      if (
        (navigator.userAgent.match(/Crosswalk/i) ||
          typeof window.cordova !== "undefined") &&
        this.parentDomain === "m.hopy.com"
      ) {
        pageUrl = "bundle=com.hopy.frivgames";
      } else {
        pageUrl = `page_url=${encodeURIComponent(this.parentURL)}`;
      }

      // const platform = getMobilePlatform();
      const adPosition =
        adType === AdType.Rewarded
          ? "rewarded"
          : !this.noPreroll && this.adTypeCount === 1
          ? "preroll"
          : `midroll`;

      // Custom Tunnl reporting keys used on local casual portals for media buying purposes.
      const ch = getQueryString("ch", window.location.href);
      const chDate = getQueryString("ch_date", window.location.href);
      let chParam = ch ? `&ch=${ch}` : "";
      let chDateParam = chDate ? `&ch_date=${chDate}` : "";

      // let rewarded = adType === AdType.Rewarded ? 1 : 0;
      const url = `https://pub.tunnl.com/opphb?${pageUrl}&player_width=${
        this.options.width
      }&player_height=${this.options.height}&ad_type=video_image&game_id=${
        this.gameId
      }&ad_position=${adPosition}${chParam}${chDateParam}&correlator=${Date.now()}`;

      const request = new Request(url, { method: "GET" });
      fetch(request)
        .then(response => {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
          } else {
            throw new TypeError("Oops, we didn't get JSON!");
          }
        })
        .then(keys => {
          if (isObjectEmpty(keys)) {
            keys = this._createTunnlReportingFallbackKeys(adPosition);

            // Send ad request event
            this.eventBus.broadcast("AD_REQUEST_KEYS_EMPTY", {
              message: "Tunnl returned empty response.",
              details: url
            });
          }

          resolve({ data: keys, url: url });
        })
        .catch(error => {
          const keys = this._createTunnlReportingFallbackKeys(adPosition);

          this.eventBus.broadcast("AD_REQUEST_KEYS_FALLBACK", {
            message: error.message,
            details: url
          });

          resolve({ data: keys, url: url });
        });
    });
  }

  /**
   * _createTunnlReportingFallbackKeys
   * Create Tunnl fallback keys
   * @param {String} adPosition
   * @return {Object}
   * @private
   */
  _createTunnlReportingFallbackKeys(adPosition) {
    // tnl_gdpr : 0 : EU user.
    // tnl_gdpr : 1 : No EU user.
    // tnl_gdpr_consent : 0 : No consent.
    // tnl_gdpr_consent : 1 : Consent given.
    const keys = {
      tid: "TNL_T-17102571517",
      nsid: "TNL_NS-18101700058",
      tnl_tid: "T-17102571517",
      tnl_nsid: "NS-18101700058",
      tnl_pw: this.options.width,
      tnl_ph: this.options.height,
      tnl_pt: "22",
      tnl_pid: "P-17101800031",
      tnl_paid: "17",
      tnl_ad_type: "video_image",
      tnl_asset_id: this.gameId.toString(),
      tnl_ad_pos: adPosition,
      tnl_skippable: "1",
      tnl_cp1: "",
      tnl_cp2: "",
      tnl_cp3: "",
      tnl_cp4: "",
      tnl_cp5: "",
      tnl_cp6: "",
      tnl_campaign: "2",
      tnl_gdpr: "0",
      tnl_gdpr_consent: "1",
      consent_string: "BOWJjG9OWJjG9CLAAAENBx-AAAAiDAAA",
      tnl_content_category: this.category.toLowerCase()
    };

    return keys;
  }

  /**
   * _loadAd
   * Load advertisements.
   * @param {String} vastUrl
   * @param {Object} context
   * @return {Promise<any>}
   * @private
   */
  _requestAd(vastUrl, context) {
    context = context || {};

    return new Promise(resolve => {
      if (typeof google === "undefined") {
        throw new Error("Unable to load ad, google IMA SDK not defined.");
      }

      // Send sdk ad request event
      this.eventBus.broadcast("AD_SDK_REQUEST");

      try {
        // Request video new ads.
        const adsRequest = new google.ima.AdsRequest();

        // Set the VAST tag.
        adsRequest.adTagUrl = vastUrl;

        // Specify the linear and nonlinear slot sizes. This helps
        // the SDK to select the correct creative if multiple are returned.
        adsRequest.linearAdSlotWidth = this.options.width;
        adsRequest.linearAdSlotHeight = this.options.height;
        adsRequest.nonLinearAdSlotWidth = this.options.width;
        adsRequest.nonLinearAdSlotHeight = this.options.height;

        // We don't want overlays as we do not have
        // a video player as underlying content!
        // Non-linear ads usually do not invoke the ALL_ADS_COMPLETED.
        // That would cause lots of problems of course...
        adsRequest.forceNonLinearFullSlot = true;

        if (this.options.vast_load_timeout)
          adsRequest.vastLoadTimeout = this.options.vast_load_timeout;

        if (this.options.autoplay_signal)
          adsRequest.setAdWillAutoPlay(context.autoplayAllowed);

        if (this.options.volume_signal)
          adsRequest.setAdWillPlayMuted(context.autoplayRequiresMute);

        // Get us some ads!
        this.adsLoader.requestAds(adsRequest, { ...context, vastUrl });

        // Done here.
        resolve(adsRequest);
      } catch (error) {
        throw new Error(error);
      }
    });
  }

  /**
   * complete
   * The ad has finished playing. Nice!
   * @public
   * @param {Object} adEvent
   */
  complete(adEvent) {
    // console.log('completed', adEvent.getAd());

    this.requestRunning = false;

    // Hide the advertisement.
    this._hide();

    // // Create a 1x1 ad slot when the first ad has finished playing.
    // if (this.adCount === 1) {
    //   let tags = [];
    //   this.tags.forEach(tag => {
    //     tags.push(tag.title.toLowerCase());
    //   });
    //   let category = this.category.toLowerCase();
    //   this._loadPromoAd(this.gameId, tags, category);
    // }
  }

  /**
   * cancel
   * Makes it possible to stop an advertisement while its
   * loading or playing. This will clear out the adsManager, stop any
   * ad playing and allowing new ads to be called.
   * @public
   */
  cancel() {
    this.requestRunning = false;

    this._resetAdsLoader();

    // Hide the advertisement.
    this._hide();

    // Send event to tell that the whole advertisement thing is finished.
    let eventName = "AD_SDK_CANCELED";
    let eventMessage = "Advertisement has been canceled.";
    this.eventBus.broadcast(eventName, {
      name: eventName,
      message: eventMessage,
      status: "warning",
      analytics: {
        category: this.eventCategory,
        action: eventName,
        label: this.gameId
      }
    });
  }

  /**
   * _checkAutoPlay
   * @return {Object}
   * @private
   */

  async _checkAutoPlay() {
    return new Promise((resolve, reject) => {
      canautoplay
        .video({ inline: true, muted: false })
        .then(({ result, error }) => {
          if (result === true)
            resolve({
              autoplayAllowed: true,
              autoplayRequiresMute: false
            });
          else
            resolve({
              autoplayAllowed: true,
              autoplayRequiresMute: true
            });
        });
    });
  }

  async _initDisplayContainerWithAutoPlay() {
    let autoplay = await this._checkAutoPlay(false);
    this._autoplay = autoplay;
    // console.log(autoplay);

    this.video_ad_player.autoplay = autoplay.autoplayAllowed;
    this.video_ad_player.volume = autoplay.autoplayRequiresMute ? 0 : 1;
    this.video_ad_player.muted = autoplay.autoplayRequiresMute ? true : false;

    if (!autoplay.adDisplayContainerInitialized) {
      this.adDisplayContainer.initialize();
      this.adDisplayContainerInitialized = true;
    }

    return autoplay;
  }

  /**
   * startAd
   * Call this to start showing the ad set within the adsManager instance.
   * @param {String} adType
   * @return {Promise<any>}
   * @public
   */
  async startAd(adType) {
    if (adType === AdType.Interstitial) {
      return this._startInterstitialAd();
    } else if (adType === AdType.Rewarded) {
      return this._startRewardedAd();
    } else throw new Error("Unsupported ad type");
  }

  /**
   * preloadAd
   * Destroy the adsManager so we can grab new ads after this.
   * If we don't then we're not allowed to call new ads based
   * on google policies, as they interpret this as an accidental
   * video requests. https://developers.google.com/interactive-
   * media-ads/docs/sdks/android/faq#8
   * @param {String} adType
   * @return {Promise<any>}
   * @public
   */
  async preloadAd(adType) {
    if (adType === AdType.Interstitial) {
      return this._preloadInterstitialAd();
    } else if (adType === AdType.Rewarded) {
      return this._preloadRewardedAd();
    } else throw new Error("Unsupported ad type");
  }

  /**
   * loadDisplayAd
   * Create a banner ad
   * @param {Object} options
   * @return {Promise<any>}
   */
  async loadDisplayAd(options) {
    return new Promise((resolve, reject) => {
      try {
        const containerId = options ? options.containerId : null;
        if (!containerId) {
          reject(`Container id is not specified`);
        }

        const container = document.getElementById(containerId);
        if (!document.getElementById(containerId)) {
          reject(`No container is found with this id - ${containerId}`);
        }

        if (typeof window.idhbgd.requestAds === "undefined") {
          reject("Prebid.js wrapper script hit an error or didn't exist!");
        }

        // Create an element needed for binding the ad slot.
        const adSlot = `gd__banner@${containerId}`;
        if (!document.getElementById(adSlot)) {
          /* eslint-disable */
          const css = `
                    .gd__banner{
                        z-index: 999;
                        height: 100%;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                    }`;

          if (!document.getElementById("gd__banner__style")) {
            const style = document.createElement("style");
            style.type = "text/css";
            style.id = "gd__banner__style";
            if (style.styleSheet) {
              style.styleSheet.cssText = css;
            } else {
              style.appendChild(document.createTextNode(css));
            }
            container.appendChild(style);
          }

          const bannerSlot = document.createElement("div");
          bannerSlot.id = adSlot;
          bannerSlot.classList.add("gd__banner");
          container.appendChild(bannerSlot);
        }

        window.idhbgd.que.push(() => {
          window.idhbgd.setRefererUrl(encodeURIComponent(this.parentURL));
          window.idhbgd.allowPersonalizedAds(
            !!parseInt(this.userAllowedPersonalizedAds)
          );
          window.idhbgd.setDefaultGdprConsentString(
            "BOWJjG9OWJjG9CLAAAENBx-AAAAiDAAA"
          );

          const slots = {};
          slots[adSlot] = {
            maxSize: [container.offsetWidth, container.offsetHeight]
          }; // we can specify max ad size like { maxSize: [1000, 300] },
          window.idhbgd.requestAds({
            slots: slots,
            callback: data => {
              console.log(data);
            }
          });
        });

        resolve();
      } catch (error) {
        reject(error.message);
      }
    });
  }

  /**
   * startInterstitialAd
   * Call this to start showing the ad set within the adsManager instance.
   * @public
   */
  async _startInterstitialAd() {
    if (this.requestRunning) {
      this.eventBus.broadcast("AD_IS_ALREADY_RUNNING", { status: "warning" });
      return;
    }

    this.requestRunning = true;

    let options = await this._initDisplayContainerWithAutoPlay();

    await this._loadInterstitialAd(options);

    try {
      if (options.autoplayRequiresMute) this.adsManager.setVolume(0);

      // Initialize the ads manager.
      this.adsManager.init(
        this.options.width,
        this.options.height,
        google.ima.ViewMode.NORMAL
      );

      // Start to play the creative.
      this.adsManager.start();
    } catch (error) {
      // An error may be thrown if there was a problem with the VAST response.
      this._onError(error);
      throw error;
    }
  }

  /**
   * _preloadInterstitialAd
   * Destroy the adsManager so we can grab new ads after this.
   * If we don't then we're not allowed to call new ads based
   * on google policies, as they interpret this as an accidental
   * video requests. https://developers.google.com/interactive-
   * media-ads/docs/sdks/android/faq#8
   * @param {Object} options
   * @return {Promise<any>}
   * @private
   */
  async _loadInterstitialAd(options) {
    this._resetAdsLoader();

    try {
      let vastUrl =
        this.preloadedInterstitialAdVastUrl ||
        (await this._getAdVastUrl(AdType.Interstitial));
      delete this.preloadedInterstitialAdVastUrl;

      const adsRequest = await this._requestAd(vastUrl, {
        adType: AdType.Interstitial,
        ...options
      });

      await Promise.all([
        vastUrl,
        adsRequest,
        new Promise((resolve, reject) => {
          // It should be cleaned up. It requires better solution.
          let scopeName = "videoad.preloadad";
          this.eventBus.unsubscribeScope(scopeName);
          // Make sure to wait for either of the following events to resolve.
          this.eventBus.subscribe(
            "AD_SDK_MANAGER_READY",
            () => resolve(),
            scopeName
          );
          this.eventBus.subscribe("AD_SDK_CANCEL", () => resolve(), scopeName);
          this.eventBus.subscribe(
            "AD_ERROR",
            () => reject("VAST error. No ad this time"),
            scopeName
          );
        })
      ]);
      return adsRequest;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * _startRewardedAd
   * Call this to start showing the ad set within the adsManager instance.
   * @private
   */
  async _startRewardedAd() {
    if (this.requestRunning) {
      this.eventBus.broadcast("AD_IS_ALREADY_RUNNING", { status: "warning" });
      return;
    }

    this.requestRunning = true;

    let options = await this._initDisplayContainerWithAutoPlay();

    await this._loadRewardedAd(options);

    try {
      if (options.autoplayRequiresMute) this.adsManager.setVolume(0);

      // Initialize the ads manager.
      this.adsManager.init(
        this.options.width,
        this.options.height,
        google.ima.ViewMode.NORMAL
      );

      // Start to play the creative.
      this.adsManager.start();
    } catch (error) {
      // An error may be thrown if there was a problem with the VAST response.
      this._onError(error);

      throw error;
    }
  }

  /**
   * _loadRewardedAd
   * Destroy the adsManager so we can grab new ads after this.
   * If we don't then we're not allowed to call new ads based
   * on google policies, as they interpret this as an accidental
   * video requests. https://developers.google.com/interactive-
   * media-ads/docs/sdks/android/faq#8
   * @return {Promise<any>}
   * @param {Object} options
   * @public
   */
  async _loadRewardedAd(options) {
    this._resetAdsLoader();

    try {
      let vastUrl =
        this.preloadedRewardedAdVastUrl ||
        (await this._getAdVastUrl(AdType.Rewarded));
      delete this.preloadedRewardedAdVastUrl;

      const adsRequest = await this._requestAd(vastUrl, {
        adType: AdType.Rewarded,
        ...options
      });

      await Promise.all([
        vastUrl,
        adsRequest,
        new Promise((resolve, reject) => {
          // It should be cleaned up. It requires better solution.
          let scopeName = "videoad.preloadad";
          this.eventBus.unsubscribeScope(scopeName);
          // Make sure to wait for either of the following events to resolve.
          this.eventBus.subscribe(
            "AD_SDK_MANAGER_READY",
            () => resolve(),
            scopeName
          );
          this.eventBus.subscribe("AD_SDK_CANCEL", () => resolve(), scopeName);
          this.eventBus.subscribe(
            "AD_ERROR",
            () => reject("VAST error. No ad this time"),
            scopeName
          );
        })
      ]);
      return adsRequest;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * _preloadInterstitialAd
   * Destroy the adsManager so we can grab new ads after this.
   * If we don't then we're not allowed to call new ads based
   * on google policies, as they interpret this as an accidental
   * video requests. https://developers.google.com/interactive-
   * media-ads/docs/sdks/android/faq#8
   * @return {Promise<any>}
   * @public
   */
  async _preloadInterstitialAd() {
    try {
      this.preloadedInterstitialAdVastUrl = await this._getAdVastUrl(
        AdType.Interstitial
      );
      return this.preloadedInterstitialAdVastUrl;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * _preloadRewardedAd
   * Destroy the adsManager so we can grab new ads after this.
   * If we don't then we're not allowed to call new ads based
   * on google policies, as they interpret this as an accidental
   * video requests. https://developers.google.com/interactive-
   * media-ads/docs/sdks/android/faq#8
   * @return {Promise<any>}
   * @public
   */
  async _preloadRewardedAd() {
    try {
      this.preloadedRewardedAdVastUrl = await this._getAdVastUrl(
        AdType.Rewarded
      );
      return this.preloadedRewardedAdVastUrl;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * onError
   * Any error handling, unrelated to ads themselves, comes through here.
   * @param {Object} error
   * @private
   */
  _onError(error) {
    this.cancel();
    this._clearSafetyTimer("onError()");
  }

  /**
   * _hide
   * Show the advertisement container.
   * @private
   */
  _hide() {
    this.video_ad_player.src = "";

    if (this.adContainer) {
      this.adContainer.style.opacity = "0";
      if (this.thirdPartyContainer) {
        this.thirdPartyContainer.style.opacity = "0";
      }
      setTimeout(() => {
        // We do not use display none. Otherwise element.offsetWidth
        // and height will return 0px.
        this.adContainer.style.transform = "translateX(-9999px)";
        this.adContainer.style.zIndex = "0";
        if (this.thirdPartyContainer) {
          this.thirdPartyContainer.style.transform = "translateX(-9999px)";
          this.thirdPartyContainer.style.zIndex = "0";
        }
      }, this.containerTransitionSpeed);
    }
  }

  /**
   * _show
   * Hide the advertisement container
   * @private
   */
  _show() {
    if (this.adContainer) {
      this.adContainer.style.transform = "translateX(0)";
      this.adContainer.style.zIndex = "99";
      if (this.thirdPartyContainer) {
        this.thirdPartyContainer.style.transform = "translateX(0)";
        this.thirdPartyContainer.style.zIndex = "99";
        // Sometimes our client set the container to display none.
        this.thirdPartyContainer.style.display = "block";
      }
      setTimeout(() => {
        this.adContainer.style.opacity = "1";
        if (this.thirdPartyContainer) {
          this.thirdPartyContainer.style.opacity = "1";
        }
      }, 10);
    }
  }

  /**
   * _createPlayer
   * Creates our staging/ markup for the advertisement.
   * @private
   */
  _createPlayer() {
    const body = document.body || document.getElementsByTagName("body")[0];

    this.adContainer = document.createElement("div");
    this.adContainer.id = `${this.prefix}advertisement`;
    this.adContainer.style.position = this.thirdPartyContainer
      ? "absolute"
      : "fixed";
    this.adContainer.style.zIndex = "0";
    this.adContainer.style.top = "0";
    this.adContainer.style.left = "0";
    this.adContainer.style.width = "100%";
    this.adContainer.style.height = "100%";
    this.adContainer.style.transform = "translateX(-9999px)";
    this.adContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.adContainer.style.opacity = "0";
    this.adContainer.style.transition =
      "opacity " +
      this.containerTransitionSpeed +
      "ms cubic-bezier(0.55, 0, 0.1, 1)";
    if (this.thirdPartyContainer) {
      this.thirdPartyContainer.style.transform = "translateX(-9999px)";
      this.thirdPartyContainer.style.opacity = "0";
      this.thirdPartyContainer.style.transition =
        "opacity " +
        this.containerTransitionSpeed +
        "ms cubic-bezier(0.55, 0, 0.1, 1)";
    }

    // const VIDEO = new Blob([new Uint8Array([0, 0, 0, 28, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 105, 115, 111, 50, 109, 112, 52, 49, 0, 0, 0, 8, 102, 114, 101, 101, 0, 0, 2, 239, 109, 100, 97, 116, 33, 16, 5, 32, 164, 27, 255, 192, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 55, 167, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 33, 16, 5, 32, 164, 27, 255, 192, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 55, 167, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 2, 194, 109, 111, 111, 118, 0, 0, 0, 108, 109, 118, 104, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 232, 0, 0, 0, 47, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 1, 236, 116, 114, 97, 107, 0, 0, 0, 92, 116, 107, 104, 100, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 47, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 36, 101, 100, 116, 115, 0, 0, 0, 28, 101, 108, 115, 116, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 47, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 100, 109, 100, 105, 97, 0, 0, 0, 32, 109, 100, 104, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 172, 68, 0, 0, 8, 0, 85, 196, 0, 0, 0, 0, 0, 45, 104, 100, 108, 114, 0, 0, 0, 0, 0, 0, 0, 0, 115, 111, 117, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 83, 111, 117, 110, 100, 72, 97, 110, 100, 108, 101, 114, 0, 0, 0, 1, 15, 109, 105, 110, 102, 0, 0, 0, 16, 115, 109, 104, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 36, 100, 105, 110, 102, 0, 0, 0, 28, 100, 114, 101, 102, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 12, 117, 114, 108, 32, 0, 0, 0, 1, 0, 0, 0, 211, 115, 116, 98, 108, 0, 0, 0, 103, 115, 116, 115, 100, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 87, 109, 112, 52, 97, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 16, 0, 0, 0, 0, 172, 68, 0, 0, 0, 0, 0, 51, 101, 115, 100, 115, 0, 0, 0, 0, 3, 128, 128, 128, 34, 0, 2, 0, 4, 128, 128, 128, 20, 64, 21, 0, 0, 0, 0, 1, 244, 0, 0, 1, 243, 249, 5, 128, 128, 128, 2, 18, 16, 6, 128, 128, 128, 1, 2, 0, 0, 0, 24, 115, 116, 116, 115, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 4, 0, 0, 0, 0, 28, 115, 116, 115, 99, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 28, 115, 116, 115, 122, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 115, 0, 0, 1, 116, 0, 0, 0, 20, 115, 116, 99, 111, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 44, 0, 0, 0, 98, 117, 100, 116, 97, 0, 0, 0, 90, 109, 101, 116, 97, 0, 0, 0, 0, 0, 0, 0, 33, 104, 100, 108, 114, 0, 0, 0, 0, 0, 0, 0, 0, 109, 100, 105, 114, 97, 112, 112, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 45, 105, 108, 115, 116, 0, 0, 0, 37, 169, 116, 111, 111, 0, 0, 0, 29, 100, 97, 116, 97, 0, 0, 0, 1, 0, 0, 0, 0, 76, 97, 118, 102, 53, 54, 46, 52, 48, 46, 49, 48, 49])], {type: 'video/mp4'})

    let video_ad_player = document.createElement("video");
    video_ad_player.setAttribute("playsinline", true);
    video_ad_player.setAttribute("webkit-playsinline", true);
    video_ad_player.id = `${this.prefix}advertisement_video`;
    video_ad_player.style.position = "absolute";
    video_ad_player.style.backgroundColor = "#000000";
    video_ad_player.style.top = "0";
    video_ad_player.style.left = "0";
    video_ad_player.style.width = this.options.width + "px";
    video_ad_player.style.height = this.options.height + "px";

    this.video_ad_player = video_ad_player;

    this.adContainer.appendChild(video_ad_player);

    const adContainerInner = document.createElement("div");
    adContainerInner.id = `${this.prefix}advertisement_slot`;
    adContainerInner.style.position = "absolute";
    adContainerInner.style.top = "0";
    adContainerInner.style.left = "0";
    adContainerInner.style.width = this.options.width + "px";
    adContainerInner.style.height = this.options.height + "px";
    this.adContainerInner = adContainerInner;

    // Append the adContainer to our Flash container, when using the
    // Flash SDK implementation.
    if (this.thirdPartyContainer) {
      this.adContainer.appendChild(adContainerInner);
      this.thirdPartyContainer.appendChild(this.adContainer);
    } else {
      this.adContainer.appendChild(adContainerInner);
      body.appendChild(this.adContainer);
    }

    let handle_dimensions = () => {
      const viewWidth =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
      const viewHeight =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;
      this.options.width = this.thirdPartyContainer
        ? this.thirdPartyContainer.offsetWidth
        : viewWidth;
      this.options.height = this.thirdPartyContainer
        ? this.thirdPartyContainer.offsetHeight
        : viewHeight;
      adContainerInner.style.width = this.options.width + "px";
      adContainerInner.style.height = this.options.height + "px";
      video_ad_player.style.width = this.options.width + "px";
      video_ad_player.style.height = this.options.height + "px";
    };

    // We need to resize our adContainer
    // when the view dimensions change.
    window.addEventListener("resize", handle_dimensions);
    window.document.addEventListener("DOMContentLoaded", handle_dimensions);
  }

  /**
   * _setUpIMA
   * Create's a the adsLoader instance.
   * @private
   */
  _setUpIMA() {
    // In order for the SDK to display ads on our page, we need to tell
    // it where to put them. In the html above, we defined a div with
    // the id "adContainer". This div is set up to render on top of
    // the video player. Using the code below, we tell the SDK to render
    // ads in that div. Also provide a handle to the content video
    // player - the SDK will poll the current time of our player to
    // properly place mid-rolls. After we create the ad display
    // container, initialize it. On mobile devices, this initialization
    // must be done as the result of a user action! Which is done
    // at play().

    // We assume the adContainer is the DOM id of the element that
    // will house the ads.
    this.adDisplayContainer = new google.ima.AdDisplayContainer(
      this.adContainerInner,
      this.video_ad_player
    );

    // Here we create an AdsLoader and define some event listeners.
    // Then create an AdsRequest object to pass to this AdsLoader.
    // We'll then wire up the 'Play' button to
    // call our requestAd function.

    // We will maintain only one instance of AdsLoader for the entire
    // lifecycle of the page. To make additional ad requests, create a
    // new AdsRequest object but re-use the same AdsLoader.

    // Re-use this AdsLoader instance for the entire lifecycle of the page.
    this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);
    this.adsLoader.getSettings().setDisableCustomPlaybackForIOS10Plus(true);
    this.adsLoader.getSettings().setLocale(this.options.locale);
    this.adsLoader.getSettings().setVpaidMode(this._getVPAIDMode());

    // Add adsLoader event listeners.
    this.adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      this._onAdsManagerLoaded,
      false,
      this
    );
    this.adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      this._onAdError,
      false,
      this
    );
  }

  /**
   * _onAdsManagerLoaded
   * This function is called whenever the ads are ready inside
   * the AdDisplayContainer.
   * @param {Event} adsManagerLoadedEvent
   * @private
   */
  _onAdsManagerLoaded(adsManagerLoadedEvent) {
    // Get the ads manager.
    const adsRenderingSettings = new google.ima.AdsRenderingSettings();
    adsRenderingSettings.autoAlign = true;
    adsRenderingSettings.enablePreloading = true;
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    adsRenderingSettings.uiElements = [
      google.ima.UiElements.AD_ATTRIBUTION,
      google.ima.UiElements.COUNTDOWN
    ];

    // We don't set videoContent as in the Google IMA example docs,
    // cause we run a game, not an ad.
    this.adsManager = adsManagerLoadedEvent.getAdsManager(
      this.video_ad_player,
      adsRenderingSettings
    );

    // Add listeners to the required events.
    // https://developers.google.com/interactive-media-
    // ads/docs/sdks/html5/v3/apis

    // Advertisement error events.
    this.adsManager.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      this._onAdError.bind(this),
      false,
      this
    );

    // Advertisement regular events.
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.AD_BREAK_READY,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.AD_METADATA,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.CLICK,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.COMPLETE,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.DURATION_CHANGE,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.FIRST_QUARTILE,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.IMPRESSION,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.INTERACTION,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.LINEAR_CHANGED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.LOADED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.LOG,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.MIDPOINT,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.PAUSED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.RESUMED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.SKIPPED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.STARTED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.THIRD_QUARTILE,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.USER_CLOSE,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.VOLUME_CHANGED,
      this._onAdEvent.bind(this),
      this
    );
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.VOLUME_MUTED,
      this._onAdEvent.bind(this),
      this
    );

    // We need to resize our adContainer when the view dimensions change.
    window.addEventListener("resize", () => {
      if (this.adsManager) {
        this.adsManager.resize(
          this.options.width,
          this.options.height,
          google.ima.ViewMode.NORMAL
        );
      }
    });

    // Load up the advertisement.
    // Always initialize the container first.
    if (!this.adDisplayContainerInitialized) {
      this.adDisplayContainer.initialize();
      this.adDisplayContainerInitialized = true;
    }

    // Once the ad display container is ready and ads have been retrieved,
    // we can use the ads manager to display the ads.
    // Send an event to tell that our ads manager
    // has successfully loaded the VAST response.
    const time = new Date();
    const h = time.getHours();
    const d = time.getDate();
    const m = time.getMonth();
    const y = time.getFullYear();
    let eventName = "AD_SDK_MANAGER_READY";
    this.eventBus.broadcast(eventName, {
      name: eventName,
      message: "AD SDK is ready",
      status: "success",
      analytics: {
        category: eventName,
        action: this.parentDomain,
        label: `h${h} d${d} m${m} y${y}`
      }
    });
  }

  /**
   * _onAdEvent
   * This is where all the event handling takes place. Retrieve the ad from
   * the event. Some events (e.g. ALL_ADS_COMPLETED) don't have ad
   * object associated.
   * @param {Event} adEvent
   * @private
   */
  _onAdEvent(adEvent) {
    // Used for analytics labeling.
    const time = new Date();
    const h = time.getHours();
    const d = time.getDate();
    const m = time.getMonth();
    const y = time.getFullYear();

    // Get the event type name.
    const eventName = getKeyByValue(google.ima.AdEvent.Type, adEvent.type);

    // Define all our events.
    let eventMessage = "";
    switch (adEvent.type) {
      case google.ima.AdEvent.Type.AD_BREAK_READY:
        eventMessage =
          "Fired when an ad rule or a VMAP ad break would " +
          "have played if autoPlayAdBreaks is false.";
        break;
      case google.ima.AdEvent.Type.AD_METADATA:
        eventMessage = "Fired when an ads list is loaded.";
        break;
      case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
        eventMessage =
          "Fired when the ads manager is done playing all " + "the ads.";
        break;
      case google.ima.AdEvent.Type.CLICK:
        eventMessage = "Fired when the ad is clicked.";
        break;
      case google.ima.AdEvent.Type.COMPLETE:
        eventMessage = "Fired when the ad completes playing.";
        break;
      case google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED:
        eventMessage =
          "Fired when content should be paused. This " +
          "usually happens right before an ad is about to cover " +
          "the content.";
        this._show();
        break;
      case google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
        eventMessage =
          "Fired when content should be resumed. This " +
          "usually happens when an ad finishes or collapses.";
        this.complete(adEvent);
        break;
      case google.ima.AdEvent.Type.DURATION_CHANGE:
        eventMessage = "Fired when the ad's duration changes.";
        break;
      case google.ima.AdEvent.Type.FIRST_QUARTILE:
        eventMessage =
          "Fired when the ad playhead crosses first " + "quartile.";
        break;
      case google.ima.AdEvent.Type.IMPRESSION:
        eventMessage = "Fired when the impression URL has been pinged.";

        // Send out additional impression Google Analytics event.
        try {
          // Check which bidder served us the impression.
          // We can call on a Prebid.js method. If it exists we report it.
          // Our default ad provider is Ad Exchange.
          if (typeof window["pbjsgd"] !== "undefined") {
            const winners = window.pbjsgd.getHighestCpmBids();
            if (this.options.debug) {
              // console.log('Winner(s)', winners);
            }
            // Todo: There can be multiple winners...
            if (winners.length > 0) {
              winners.forEach(winner => {
                /* eslint-disable */
                // if (typeof window['ga'] !== 'undefined' && winner.bidder) {
                //     window['ga']('gd.send', {
                //         hitType: 'event',
                //         eventCategory: `IMPRESSION_${winner.bidder.toUpperCase()}`,
                //         eventAction: this.parentDomain,
                //         eventLabel: `h${h} d${d} m${m} y${y}`,
                //     });
                // }
                /* eslint-enable */
              });
            } else {
              /* eslint-disable */
              // if (typeof window['ga'] !== 'undefined') {
              //     window['ga']('gd.send', {
              //         hitType: 'event',
              //         eventCategory: 'IMPRESSION_ADEXCHANGE',
              //         eventAction: this.parentDomain,
              //         eventLabel: `h${h} d${d} m${m} y${y}`,
              //     });
              // }
              /* eslint-enable */
            }
          }
        } catch (error) {
          // console.log(error);
        }

        break;
      case google.ima.AdEvent.Type.INTERACTION:
        eventMessage =
          "Fired when an ad triggers the interaction " +
          "callback. Ad interactions contain an interaction ID " +
          "string in the ad data.";
        break;
      case google.ima.AdEvent.Type.LINEAR_CHANGED:
        eventMessage =
          "Fired when the displayed ad changes from " +
          "linear to nonlinear, or vice versa.";
        break;
      case google.ima.AdEvent.Type.LOADED:
        eventMessage = adEvent.getAd().getContentType();
        // this._show();
        break;
      case google.ima.AdEvent.Type.LOG:
        const adData = adEvent.getAdData();
        if (adData["adError"]) {
          eventMessage = adEvent.getAdData();
        }
        break;
      case google.ima.AdEvent.Type.MIDPOINT:
        eventMessage = "Fired when the ad playhead crosses midpoint.";
        break;
      case google.ima.AdEvent.Type.PAUSED:
        eventMessage = "Fired when the ad is paused.";
        break;
      case google.ima.AdEvent.Type.RESUMED:
        eventMessage = "Fired when the ad is resumed.";
        break;
      case google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED:
        eventMessage =
          "Fired when the displayed ads skippable state " + "is changed.";
        break;
      case google.ima.AdEvent.Type.SKIPPED:
        eventMessage = "Fired when the ad is skipped by the user.";
        break;
      case google.ima.AdEvent.Type.STARTED:
        eventMessage = "Fired when the ad starts playing.";
        break;
      case google.ima.AdEvent.Type.THIRD_QUARTILE:
        eventMessage =
          "Fired when the ad playhead crosses third " + "quartile.";
        break;
      case google.ima.AdEvent.Type.USER_CLOSE:
        eventMessage = "Fired when the ad is closed by the user.";
        break;
      case google.ima.AdEvent.Type.VOLUME_CHANGED:
        eventMessage = "Fired when the ad volume has changed.";
        break;
      case google.ima.AdEvent.Type.VOLUME_MUTED:
        eventMessage = "Fired when the ad volume has been muted.";
        break;
    }

    // Send the event to our eventBus.
    if (eventName !== "" && eventMessage !== "") {
      this.eventBus.broadcast(eventName, {
        name: eventName,
        message: eventMessage,
        status: "success",
        analytics: {
          category: eventName,
          action: this.parentDomain,
          label: `h${h} d${d} m${m} y${y}`
        }
      });
    }
  }

  /**
   * _onAdError
   * Any ad error handling comes through here.
   * Something probably failed when pre-loading an advertisement.
   * Do not try to preloadAds here. This could cause a loop!
   * @param {Event} event
   * @private
   */
  _onAdError(event) {
    this.requestRunning = false;

    this._resetAdsLoader();
    this._clearSafetyTimer("_onAdError()");
    this._hide();

    try {
      /* eslint-disable */
      // if (typeof window['ga'] !== 'undefined') {
      let context = event.getUserRequestContext();
      let eventName = "AD_ERROR";
      let imaError = event.getError();
      // let eventMessage = imaError.getMessage();
      let eventMessage =
        imaError.getErrorCode().toString() ||
        imaError.getVastErrorCode().toString();

      let eventInnerMessage = this._getInnerErrorCode(imaError);
      let details = eventInnerMessage;

      this.eventBus.broadcast(eventName, {
        message: eventMessage,
        details: details,
        status: "warning",
        analytics: {
          category: eventName,
          action: eventInnerMessage,
          label: eventMessage
        }
      });

      this.eventBus.broadcast("AD_SDK_ERROR_VASTURL", {
        message: context.adType,
        details: context.vastUrl
      });

      // }
      /* eslint-enable */

      // Check which bidder served us a possible broken advertisement.
      // We can call on a Prebid.js method. If it exists we report it.
      // If there is no winning bid we assume the problem lies with AdExchange.
      // As our default ad provider is Ad Exchange.
      // if (typeof window["pbjsgd"] !== "undefined") {
      //   const winners = window.pbjsgd.getHighestCpmBids();
      //   if (this.options.debug) {
      //     // console.log('Failed winner(s) ', winners);
      //   }
      //   // Todo: There can be multiple winners...
      //   if (winners.length > 0) {
      //     winners.forEach(winner => {
      //       // const adId = winner.adId ? winner.adId : null;
      //       // const creativeId = winner.creativeId ? winner.creativeId : null;
      //       /* eslint-disable */
      //       // if (typeof window['ga'] !== 'undefined' && winner.bidder) {
      //       //     window['ga']('gd.send', {
      //       //         hitType: 'event',
      //       //         eventCategory: `AD_ERROR_${winner.bidder.toUpperCase()}`,
      //       //         eventAction: event.getError().getErrorCode().toString() || event.getError().getVastErrorCode().toString(),
      //       //         eventLabel: `${adId} | ${creativeId}`,
      //       //     });
      //       // }
      //       /* eslint-enable */
      //     });
      //   } else {
      //     /* eslint-disable */
      //     // if (typeof window['ga'] !== 'undefined') {
      //     //     window['ga']('gd.send', {
      //     //         hitType: 'event',
      //     //         eventCategory: 'AD_ERROR_ADEXCHANGE',
      //     //         eventAction: event.getError().getErrorCode().toString() || event.getError().getVastErrorCode().toString(),
      //     //         eventLabel: event.getError().getMessage(),
      //     //     });
      //     // }
      //     /* eslint-enable */
      //   }
      // }
    } catch (error) {
      // console.log(error);
    }
  }

  _resetAdsLoader() {
    if (this.adsManager) {
      this.adsManager.destroy();
      this.adsManager = null;
    }

    if (this.adsLoader) {
      this.adsLoader.contentComplete();
    }
  }

  /**
   * _startSafetyTimer
   * Setup a safety timer for when the ad network
   * doesn't respond for whatever reason. The advertisement has 12 seconds
   * to get its shit together. We stop this timer when the advertisement
   * is playing, or when a user action is required to start, then we
   * clear the timer on ad ready.
   * @param {Number} time
   * @param {String} from
   * @private
   */
  _startSafetyTimer(time, from) {
    // dankLog('Safety timer', 'Invoked timer from: ' + from, 'success');
    this.safetyTimer = window.setTimeout(() => {
      this.cancel();
      this._clearSafetyTimer(from);
    }, time);
  }

  /**
   * _clearSafetyTimer
   * @param {String} from
   * @private
   */
  _clearSafetyTimer(from) {
    if (typeof this.safetyTimer !== "undefined" && this.safetyTimer !== null) {
      // dankLog('Safety timer', 'Cleared timer set at: ' + from, 'success');
      clearTimeout(this.safetyTimer);
      this.safetyTimer = undefined;
    }
  }

  /**
   * _loadPromoAd
   * Create a 1x1 ad slot and call it. Only once.
   * @param {String} id
   * @param {Array} tags
   * @param {String} category
   * @private
   */
  _loadPromoAd(id, tags, category) {
    const containerId = `${this.prefix}baguette`;
    if (document.getElementById(containerId)) {
      return;
    }

    // Create an element needed for binding the ad slot.
    const body = document.body || document.getElementsByTagName("body")[0];
    const container = document.createElement("div");
    container.id = containerId;
    container.style.zIndex = "100";
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    body.appendChild(container);

    // Does the DFP script already exist?
    const useSSL = "https:" === document.location.protocol;
    const src = `${
      useSSL ? "https:" : "http:"
    }//www.googletagservices.com/tag/js/gpt.js`;
    let exists = Array.from(document.querySelectorAll("script")).map(
      scr => scr.src
    );
    if (!exists.includes(src)) {
      // Load the DFP script.
      const gads = document.createElement("script");
      gads.type = "text/javascript";
      gads.async = true;
      gads.src = src;
      const script = document.getElementsByTagName("script")[0];
      script.parentNode.insertBefore(gads, script);
    }

    // Set namespaces for DFP.
    window["googletag"] = window["googletag"] || {};
    window["googletag"]["cmd"] = window["googletag"]["cmd"] || [];

    // Create the ad slot, but wait for the callback first.
    window["googletag"]["cmd"].push(() => {
      // Define our ad slot.
      const displayAd = window["googletag"]
        .defineSlot(
          "/1015413/Gamedistribution_ingame_1x1_crosspromo",
          [1, 1],
          containerId
        )
        .setCollapseEmptyDiv(true, true)
        .addService(window["googletag"].pubads());

      // Set some targeting.
      window["googletag"].pubads().setTargeting("crossid", id);
      window["googletag"].pubads().setTargeting("crosstags", tags);
      window["googletag"].pubads().setTargeting("crosscategory", category);

      // Make sure to keep the ad hidden until refreshed.
      window["googletag"].pubads().disableInitialLoad();

      // Enables all GPT services that have been defined.
      window["googletag"].enableServices();

      // Display the advertisement, but don't show it.
      window["googletag"].display(containerId);

      // Show the ad.
      window["googletag"].pubads().refresh([displayAd]);
    });
  }

  _getVPAIDMode() {
    if (this.options.vpaid_mode === "disabled")
      return google.ima.ImaSdkSettings.VpaidMode.DISABLED;
    else if (this.options.vpaid_mode === "insecure")
      return google.ima.ImaSdkSettings.VpaidMode.INSECURE;
    else return google.ima.ImaSdkSettings.VpaidMode.ENABLED;
  }

  _getInnerErrorCode(error) {
    if (!isFunction(error.getInnerError)) return;

    let innerError = error.getInnerError();
    if (!innerError) return;

    if (
      isFunction(innerError.getErrorCode) &&
      isFunction(innerError.getVastErrorCode)
    )
      return (
        innerError.getErrorCode().toString() ||
        innerError.getVastErrorCode().toString()
      );

    return innerError.message;
  }
}

export default VideoAd;
