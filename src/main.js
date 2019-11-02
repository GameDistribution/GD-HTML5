"use strict";

if (!global._babelPolyfill) {
  require("babel-polyfill");
}

import "es6-promise/auto";
import "whatwg-fetch";

import PackageJSON from "../package.json";
import EventBus from "./components/EventBus";
import ImplementationTest from "./components/ImplementationTest";
import VideoAd from "./components/VideoAd";
import MessageRouter from "./components/MessageRouter";

import { AdType } from "./modules/adType";
import { SDKEvents, IMAEvents } from "./modules/eventList";
import { dankLog, setDankLog } from "./modules/dankLog";
import {
  extendDefaults,
  getParentUrl,
  getParentDomain,
  getQueryParams,
  getScript,
  getIframeDepth,
  parseJSON,
  getMobilePlatform,
  isLocalStorageAvailable,
  getClosestTopDomain,
  Ls
} from "./modules/common";

var cloneDeep = require("lodash.clonedeep");

let instance = null;

/**
 * SDK
 */
class SDK {
  constructor(options) {
    // get loader context
    this._bridge = this._getBridgeContext();

    // URL and domain
    this._parentURL = this._bridge.parentURL
      ? this._bridge.parentURL
      : getParentUrl();
    this._parentDomain = this._bridge._parentDomain
      ? this._bridge._parentDomain
      : getParentDomain();
    // this._topDomain = getClosestTopDomain();

    // console.log(this._bridge);

    // Make this a singleton.
    if (instance) return instance;
    else instance = this;

    // Process options
    this._defaults = this._getDefaultOptions();
    this._extendDefaultOptions(this._defaults, options);

    // Console banner
    this._setConsoleBanner();

    // Load tracking services.
    this._loadGoogleAnalytics();

    // Whitelabel option for disabling ads.
    this._checkWhitelabelPartner();

    this._checkUserDeclinedTracking();

    this._initializeMessageRouter();

    this._checkConsole();

    // Setup all event listeners.
    // We also send a Google Analytics event for each one of our events.
    this._subscribeToEvents();

    // GDPR (General Data Protection Regulation).
    // Broadcast GDPR events to our game developer.
    // They can hook into these events to kill their own solutions.
    this._gdpr();

    // Get the game data once.
    this.sdkReady = new Promise(this._initializeSDKWithGameData.bind(this));
    this.sdkReady
      .then(response => {
        // sdk is ready
      })
      .catch(error => {
        // sdk has an error
      })
      .finally(() => {
        this._sendLoadedEvent();

        this._checkGDPRConsentWall();

        // ready or error
        this._initBlockingExternals();
      });
  }

  _sendLoadedEvent() {
    if (this._bridge.noLoadedEvent) return;

    // send play/load event to tunnl
    this._sendTunnlEvent(1);

    this.msgrt.send("loaded", {
      message: this._hasBlocker ? "Has Blocker" : "No Blocker"
    });
  }

  async _initializeSDKWithGameData(resolve, reject) {
    try {
      this._gameData = await this._getGameData();

      this._checkGameId();

      this._checkBlocking();

      this._changeMidrollInDebugMode();

      await this._initializeVideoAd();

      this._sendSDKReady();

      resolve(this._gameData);
    } catch (error) {
      this._sendSDKError(error);

      // Just resume the game.
      this.onResumeGame(error.message, "warning");

      // Something went wrong.
      reject(error);
    }
  }

  _getDefaultOptions() {
    const defaults = {
      debug: false,
      testing: false,
      gameId: "4f3d7d38d24b740c95da2b03dc3a2333", // Basket and ball
      prefix: "gdsdk__",
      onEvent: function(event) {
        // ...
      },
      /**
       * [DEPRECATED]
       * Properties and callbacks used for Flash games and older HTML5 implementations.
       */
      flashSettings: {
        adContainerId: "",
        splashContainerId: ""
      },
      advertisementSettings: {},
      resumeGame: function() {
        // ...
      },
      pauseGame: function() {
        // ...
      },
      onInit: function(data) {
        // ...
      },
      onError: function(data) {
        // ...
      }
    };

    return defaults;
  }

  _extendDefaultOptions(defaults, options) {
    let target = cloneDeep(defaults);
    if (options) this.options = extendDefaults(target, options);
    else this.options = target;

    this.options.gameId = this.options.gameId.trim();
  }

  _setConsoleBanner() {
    if (this._bridge.noConsoleBanner) return;

    // Set a version banner within the developer console.
    const version = PackageJSON.version;
    const banner = console.log(
      "%c %c %c GameDistribution.com HTML5 SDK | Version: " +
        version +
        " %c %c %c",
      "background: #9854d8",
      "background: #6c2ca7",
      "color: #fff; background: #450f78;",
      "background: #6c2ca7",
      "background: #9854d8",
      "background: #ffffff"
    );

    console.log.apply(console, banner);
  }

  _sendTunnlEvent(eventType) {
    // 1: play/load
    // new Image().src = `https://ana.tunnl.com/event?page_url=${encodeURIComponent(getParentUrl())}&game_id=${this.options.gameId}&eventtype=${1}`;
    fetch(
      `https://ana.tunnl.com/event?page_url=${encodeURIComponent(
        this._parentURL
      )}&game_id=${this.options.gameId}&eventtype=${eventType}`
    );
  }

  _checkWhitelabelPartner() {
    // Whitelabel option for disabling ads.
    this._whitelabelPartner = false;
    const xanthophyll = getQueryParams("xanthophyll");
    if (
      xanthophyll.hasOwnProperty("xanthophyll") &&
      xanthophyll["xanthophyll"] === "true"
    ) {
      this._whitelabelPartner = true;
      dankLog("White label publisher", `${this._whitelabelPartner}`, "success");
    }
  }

  _checkConsole() {
    try {
      if (!Ls.available) return;

      // Enable debugging if visiting through our developer admin.
      if (this._parentDomain === "developer.gamedistribution.com") {
        Ls.set("gd_debug_ex", true);
        Ls.set("gd_disable_midroll_timer", true);
        Ls.set("gd_tag", true);
      } else if (this._parentDomain === "localhost:3000") {
        Ls.set("gd_debug_ex", true);
        Ls.set("gd_disable_midroll_timer", true);
      }

      // Open the debug console when debugging is enabled.
      if (Ls.getBoolean("gd_debug_ex")) {
        this.openConsole();

        this.msgrt.send("dev.console", {
          message: this._parentDomain
        });
      }
    } catch (error) {
      // console.log(error);
    }
  }

  _checkUserDeclinedTracking() {
    this._userDeclinedTracking =
      document.location.search.indexOf("gdpr-tracking=0") >= 0 ||
      document.cookie.indexOf("ogdpr_tracking=0") >= 0;
  }

  _initializeMessageRouter() {
    // Message router initialization
    this.msgrt = new MessageRouter({
      gameId: this.options.gameId,
      hours: new Date().getHours(),
      topDomain: this._topDomain,
      domain: this._parentDomain,
      referrer: this._parentURL,
      depth: getIframeDepth(),
      version: PackageJSON.version,
      tracking: this._userDeclinedTracking,
      whitelabel: this._whitelabelPartner,
      platform: getMobilePlatform(),
      byloader: this._bridge.loadedByLoader
    });
  }

  _loadGoogleAnalytics() {
    const userDeclinedTracking =
      document.location.search.indexOf("gdpr-tracking=0") >= 0 ||
      document.cookie.indexOf("ogdpr_tracking=0") >= 0;
    const googleScriptPaths = ["https://www.google-analytics.com/analytics.js"];

    // Load Google Analytics.
    getScript(googleScriptPaths[0], "gdsdk_google_analytics", {
      alternates: googleScriptPaths,
      error_prefix: "Blocked:",
      exists: () => {
        return window["ga"];
      }
    })
      .then(() => {
        window["ga"](
          "create",
          "UA-60359297-49",
          {
            name: "gd",
            cookieExpires: 90 * 86400,
            sampleRate: 5 // Specifies what percentage of users should be tracked. This defaults to 100 (no users are sampled out) but large sites may need to use a lower sample rate to stay within Google Analytics processing limits.
          },
          "auto"
        );

        if (!this._bridge.noGAPageView) {
          window["ga"]("gd.send", "pageview");
        }

        // Anonymize IP for GDPR purposes.
        if (!userDeclinedTracking) {
          window["ga"]("gd.set", "anonymizeIp", true);
        }
      })
      .catch(error => {
        this._sendSDKError(error);
      });

    if (!userDeclinedTracking) {
      const lotameScriptPaths = [
        "https://tags.crwdcntrl.net/c/13998/cc.js?ns=_cc13998"
      ];
      getScript(lotameScriptPaths[0], "LOTCC_13998", {
        alternates: lotameScriptPaths
      })
        .then(() => {
          if (
            typeof window["_cc13998"] === "object" &&
            typeof window["_cc13998"].bcpf === "function" &&
            typeof window["_cc13998"].add === "function"
          ) {
            if (!this._bridge.noLotamePageView) {
              window["_cc13998"].add("act", "play");
              window["_cc13998"].add("med", "game");
            }

            // Must wait for the load event, before running Lotame.
            if (document.readyState === "complete") {
              window["_cc13998"].bcpf();
            } else {
              window["_cc13998"].bcp();
            }
          }
        })
        .catch(error => {
          this._sendSDKError(error);
        });
    }
  }

  _subscribeToEvents() {
    this.eventBus = new EventBus();
    SDKEvents.forEach(eventName =>
      this.eventBus.subscribe(eventName, event => this._onEvent(event), "sdk")
    );

    this.eventBus.subscribe(
      "AD_SDK_CANCELED",
      () => {
        this.onResumeGame(
          "Advertisement error, no worries, start / resume the game.",
          "warning"
        );
        this.msgrt.send("ad.cancelled");
      },
      "sdk"
    );

    IMAEvents.forEach(eventName =>
      this.eventBus.subscribe(eventName, event => this._onEvent(event), "ima")
    );
    this.eventBus.subscribe(
      "COMPLETE",
      () => {
        // Do a request to flag the sdk as available within the catalog.
        // This flagging allows our developer to do a request to publish
        // this game, otherwise this option would remain unavailable.
        if (
          this._parentDomain === "developer.gamedistribution.com" ||
          new RegExp("^localhost").test(this._parentDomain) === true
        ) {
          fetch(
            `https://game.api.gamedistribution.com/game/v2/hasapi/${
              this.options.gameId
            }?timestamp=${new Date().valueOf()}`
          );
          try {
            let message = JSON.stringify({
              type: "GD_SDK_IMPLEMENTED",
              gameID: this.options.gameId
            });
            if (window.location !== window.top.location) {
              window.top.postMessage(message, "*");
            } else if (
              window.opener !== null &&
              window.opener.location !== window.location
            ) {
              window.opener.postMessage(message, "*");
            }
          } catch (e) {
            // For some reason, the postmessage didn't work (maybe there is no parent).
            // It's ok though, we have the image fallback
          }
        }
      },
      "ima"
    );
    this.eventBus.subscribe(
      "CONTENT_PAUSE_REQUESTED",
      () =>
        this.onPauseGame("New advertisements requested and loaded", "success"),
      "ima"
    );
    this.eventBus.subscribe(
      "CONTENT_RESUME_REQUESTED",
      () =>
        this.onResumeGame(
          "Advertisement(s) are done. Start / resume the game.",
          "success"
        ),
      "ima"
    );

    this.eventBus.subscribe(
      "IMPRESSION",
      arg => {
        this.msgrt.send("ad.impression");

        // Lotame tracking.
        try {
          window["_cc13998"].bcpw("genp", "ad video");
          window["_cc13998"].bcpw("act", "ad impression");
        } catch (error) {
          // No need to throw an error or log. It's just Lotame.
        }
      },
      "ima"
    );

    this.eventBus.subscribe(
      "SKIPPED",
      arg => {
        // Lotame tracking.
        try {
          window["_cc13998"].bcpw("act", "ad skipped");
        } catch (error) {
          // No need to throw an error or log. It's just Lotame.
        }
      },
      "ima"
    );

    this.eventBus.subscribe(
      "AD_ERROR",
      arg => {
        this.msgrt.send("ad.error", {
          message: arg.message,
          details: arg.details
        });
      },
      "ima"
    );

    this.eventBus.subscribe(
      "CLICK",
      arg => {
        this.msgrt.send("ad.click");

        // Lotame tracking.
        try {
          window["_cc13998"].bcpw("act", "ad click");
        } catch (error) {
          // No need to throw an error or log. It's just Lotame.
        }
      },
      "ima"
    );

    this.eventBus.subscribe(
      "COMPLETE",
      arg => {
        this.msgrt.send("ad.complete");

        // Lotame tracking.
        try {
          window["_cc13998"].bcpw("act", "ad complete");
        } catch (error) {
          // No need to throw an error or log. It's just Lotame.
        }
      },
      "ima"
    );

    this.eventBus.subscribe(
      "AD_SDK_REQUEST",
      arg => {
        this._sendTunnlEvent(2);
      },
      "sdk"
    );

    this.eventBus.subscribe(
      "SDK_ERROR",
      arg => {
        if (arg.message.startsWith("Blocked:")) {
          if (!this._bridge.noBlockerEvent) {
            this.msgrt.send(`error`, { message: arg.message });
            if (!this._hasBlocker) {
              this._hasBlocker = true;
              this._sendTunnlEvent(3);
            }
          }
        } else {
          this.msgrt.send(`error`, { message: arg.message });
        }
      },
      "sdk"
    );

    this.eventBus.subscribe(
      "AD_REQUEST",
      arg => {
        this.msgrt.send(`req.ad.${arg.message}`);
      },
      "sdk"
    );

    this.eventBus.subscribe(
      "AD_REQUEST_KEYS_EMPTY",
      arg => {
        this.msgrt.send(`tunnl.keys.empty`, {
          message: arg.message,
          details: arg.details
        });
      },
      "sdk"
    );

    this.eventBus.subscribe(
      "AD_REQUEST_KEYS_FALLBACK",
      arg => {
        this.msgrt.send(`tunnl.keys.fallback`, {
          message: arg.message,
          details: arg.details
        });
      },
      "sdk"
    );
  }

  /**
   * _gdpr
   * GDPR (General Data Protection Regulation).
   * Broadcast GDPR events to our game developer.
   * They can hook into these events to kill their own solutions/ services.
   */
  _gdpr() {
    const tracking = document.location.search.indexOf("gdpr-tracking") >= 0;
    const trackingConsent =
      document.location.search.indexOf("gdpr-tracking=1") >= 0;
    const targeting = document.location.search.indexOf("gdpr-targeting") >= 0;
    const targetingConsent =
      document.location.search.indexOf("gdpr-targeting=1") >= 0;
    const third = document.location.search.indexOf("gdpr-third-party") >= 0;
    const thirdConsent =
      document.location.search.indexOf("gdpr-third-party=1") >= 0;
    const GeneralDataProtectionRegulation = [
      {
        name: "SDK_GDPR_TRACKING",
        message: tracking
          ? trackingConsent
            ? "Allowed"
            : "Not allowed"
          : "Not set",
        status: trackingConsent ? "success" : "warning",
        label: tracking ? (trackingConsent ? "1" : "0") : "not set"
      },
      {
        name: "SDK_GDPR_TARGETING",
        message: targeting
          ? targetingConsent
            ? "Allowed"
            : "Not allowed"
          : "Not set",
        status: targetingConsent ? "success" : "warning",
        label: targeting ? (targetingConsent ? "1" : "0") : "not set"
      },
      {
        name: "SDK_GDPR_THIRD_PARTY",
        message: third ? (thirdConsent ? "Allowed" : "Not allowed") : "Not set",
        status: thirdConsent ? "success" : "warning",
        label: third ? (thirdConsent ? "1" : "0") : "not set"
      }
    ];
    GeneralDataProtectionRegulation.forEach(obj => {
      this.eventBus.broadcast(obj.name, {
        name: obj.name,
        message: obj.message,
        status: obj.status,
        analytics: {
          category: obj.name,
          action: this._parentDomain,
          label: obj.label
        }
      });
    });
  }

  _checkGameId() {
    if (this.options.gameId === this._defaults.gameId) {
      this._sendSDKError(
        "Check correctness of your GAME ID. Otherwise, no revenue will be recorded."
      );
    }
  }

  _getDefaultGameData() {
    return {
      gameId: this.options.gameId,
      advertisements: true,
      preroll: true,
      midroll: 2 * 60000,
      rewardedAds: false,
      title: "",
      tags: [],
      category: "",
      assets: []
    };
  }

  _getGameDataUrl() {
    // const gameDataUrl = `https://game.api.gamedistribution.com/game/get/${id.replace(
    //     /-/g,
    //     ''
    // )}/?domain=${domain}&localTime=${new Date().getHours()}&v=${PackageJSON.version}`;
    const gameDataUrl = `https://game.api.gamedistribution.com/game/v2/get/${this.options.gameId.replace(
      /-/g,
      ""
    )}/?domain=${this._parentDomain}&v=${
      PackageJSON.version
    }&localTime=${new Date().getHours()}`;

    return gameDataUrl;
  }

  _checkBlocking() {
    const gameData = this._gameData;

    if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
      this.msgrt.send("blocked");
      setTimeout(() => {
        document.location = `https://html5.api.gamedistribution.com/blocked.html?domain=${this._parentDomain}`;
      }, 1000);
    } else {
      // Lotame tracking.
      // It is critical to wait for the load event. Yes hilarious.
      window.addEventListener("load", () => {
        try {
          gameData.tags.forEach(tag => {
            window["_cc13998"].bcpw("int", `tags : ${tag.title.toLowerCase()}`);
          });

          window["_cc13998"].bcpw(
            "int",
            `category : ${gameData.category.toLowerCase()}`
          );
        } catch (error) {
          // No need to throw an error or log. It's just Lotame.
        }
      });
    }
  }

  _changeMidrollInDebugMode() {
    const gameData = this._gameData;

    if (!Ls.available) return;

    // Enable some debugging perks.
    if (Ls.getBoolean("gd_debug_ex")) {
      if (Ls.getBoolean("gd_disable_midroll_timer")) gameData.midroll = 0;
      else gameData.midroll = this._getDefaultGameData().midroll;
    }
  }

  _checkGDPRConsentWall() {
    const gameData = this._gameData;

    // If the preroll is disabled, we just set the adRequestTimer.
    // That way the first call for an advertisement is cancelled.
    // Else if the pre-roll is true and auto-play is true, then we
    // create a splash screen so we can force a user action before
    // starting a video advertisement.
    //
    // SpilGames demands a GDPR consent wall to be displayed.
    const isConsentDomain = gameData.gdpr && gameData.gdpr.consent === true;
    if (!gameData.preroll) {
      this.adRequestTimer = new Date();
    } else if (this.options.advertisementSettings.autoplay || isConsentDomain) {
      this._createSplash(gameData, isConsentDomain);
    }
  }

  async _initializeVideoAd() {
    const gameData = this._gameData;

    if (gameData.sdk && gameData.sdk.enabled)
      this.options.advertisementSettings = extendDefaults(
        this.options.advertisementSettings,
        gameData.sdk
      );

    // console.log(this.options.advertisementSettings);

    // Create a new VideoAd instance (singleton).
    this.adInstance = new VideoAd(
      // Deprecated parameters.
      this.options.flashSettings.adContainerId,
      this.options.advertisementSettings
    );

    // Set some targeting/ reporting values.
    this.adInstance.parentURL = this._parentURL;
    this.adInstance.parentDomain = this._parentDomain;
    this.adInstance.gameId = gameData.gameId;
    this.adInstance.category = gameData.category;
    this.adInstance.tags = gameData.tags;

    // Wait for the adInstance to be ready.
    await this.adInstance.start();
  }

  _sendSDKReady() {
    // Send out event for modern implementations.
    let eventName = "SDK_READY";
    let eventMessage = "Everything is ready.";
    this.eventBus.broadcast(eventName, {
      message: eventMessage,
      status: "success"
    });

    // Call legacy backwards compatibility method.
    try {
      this.options.onInit(eventMessage);
    } catch (error) {
      dankLog("DEVELOPER_ERROR", error.message, "warning");
      if (this.msgrt) {
        this.msgrt.send("dev.error", {
          message: error.message,
          details: "onInit"
        });
      }
    }
  }

  _sendSDKError(error) {
    error = error.message ? error : { message: error };

    // Send out event for modern implementations.
    let eventName = "SDK_ERROR";
    this.eventBus.broadcast(eventName, {
      message: error.message,
      status: "error"
    });

    try {
      this.options.onError(error);
    } catch (error) {
      dankLog("DEVELOPER_ERROR", error.message, "warning");
      if (this.msgrt) {
        this.msgrt.send("dev.error", {
          message: error.message,
          details: "onError"
        });
      }
    }
  }

  /**
   * _onEvent
   * Gives us a nice console log message for all our events going
   * through the EventBus.
   * @param {Object} event
   * @private
   */
  _onEvent(event) {
    // Show the event in the log.
    dankLog(event.name, event.message, event.status);
    // Push out a Google event for each event. Makes our life easier. I think.
    // try {
    /* eslint-disable */
    // if (typeof window['ga'] !== 'undefined' && event.analytics) {
    //     window['ga']('gd.send', {
    //         hitType: 'event',
    //         eventCategory: (event.analytics.category)
    //             ? event.analytics.category
    //             : '',
    //         eventAction: (event.analytics.action)
    //             ? event.analytics.action
    //             : '',
    //         eventLabel: (event.analytics.label)
    //             ? event.analytics.label
    //             : '',
    //     });
    // }
    /* eslint-enable */
    // } catch (error) {
    //   throw new Error(error);
    // }

    // Now send the event data to the developer.
    try {
      this.options.onEvent({
        name: event.name,
        message: event.message,
        status: event.status
      });
    } catch (error) {
      dankLog("DEVELOPER_ERROR", error.message, "warning");
      if (this.msgrt) {
        this.msgrt.send("dev.error", { message: message, details: "onEvent" });
      }
    }
  }

  /**
   * getGameData
   * @return {Promise<any>}
   * @private
   */
  _getGameData() {
    return new Promise(resolve => {
      let defaultGameData = this._getDefaultGameData();
      const gameDataUrl = this._getGameDataUrl();

      fetch(gameDataUrl)
        .then(response => {
          return response.json();
        })
        .then(json => {
          if (json.success) {
            const retrievedGameData = {
              gameId: json.result.game.gameMd5,
              advertisements: json.result.game.enableAds,
              preroll: json.result.game.preRoll,
              midroll: json.result.game.timeAds * 60000,
              rewardedAds: json.result.game.rewardedAds,
              title: json.result.game.title,
              tags: json.result.game.tags,
              category: json.result.game.category,
              assets: json.result.game.assets,
              disp_2nd_prer: json.result.game.disp_2nd_prer,
              ctry_vst: json.result.game.ctry_vst,
              block_exts: parseJSON(json.result.game.push_cuda),
              bloc_gard: parseJSON(json.result.game.bloc_gard),
              ctry: json.result.game.ctry,
              cookie: parseJSON(json.result.game.cookie),
              sdk: parseJSON(json.result.game.sdk),
              gdpr: parseJSON(json.result.game.gdpr),
              diagnostic: parseJSON(json.result.game.diagnostic)
            };

            let gameData = extendDefaults(
              cloneDeep(defaultGameData),
              retrievedGameData
            );

            if (this._bridge.noPreroll) gameData.preroll = false;

            this.msgrt.setGameData(gameData);

            setDankLog(gameData.diagnostic);

            resolve(gameData);
          } else {
            defaultGameData.failed = true;
            resolve(defaultGameData);
          }
        })
        .catch(() => {
          defaultGameData.failed = true;
          resolve(defaultGameData);
        });
    });
  }

  /**
   * _createSplash
   * Create splash screen for developers who can't add the advertisement
   * request behind a user action.
   * @param {Object} gameData
   * @param {Boolean} isConsentDomain - Determines if the publishers requires a GDPR consent wall.
   * @private
   */
  _createSplash(gameData, isConsentDomain) {
    let thumbnail = gameData.assets.find(
      asset =>
        asset.hasOwnProperty("name") &&
        asset.width === 512 &&
        asset.height === 512
    );
    if (thumbnail) {
      thumbnail = `https://img.gamedistribution.com/${thumbnail.name}`;
    } else if (gameData.assets[0].hasOwnProperty("name")) {
      thumbnail = `https://img.gamedistribution.com/${gameData.assets[0].name}`;
    } else {
      thumbnail = `https://img.gamedistribution.com/logo.svg`;
    }

    /* eslint-disable */
    const css = `
            body {
                position: inherit;
            }
            .${this.options.prefix}splash-background-container {
                box-sizing: border-box;
                position: absolute;
                z-index: 664;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #000;
                overflow: hidden;
            }
            .${this.options.prefix}splash-background-image {
                box-sizing: border-box;
                position: absolute;
                top: -25%;
                left: -25%;
                width: 150%;
                height: 150%;
                background-image: url(${thumbnail});
                background-size: cover;
                filter: blur(50px) brightness(1.5);
            }
            .${this.options.prefix}splash-container {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                position: absolute;
                z-index: 665;
                bottom: 0;
                width: 100%;
                height: 100%;
            }
            .${this.options.prefix}splash-top {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                flex: 1;
                align-self: center;
                justify-content: center;
                padding: 20px;
            }
            .${this.options.prefix}splash-top > div {
                text-align: center;
            }
            .${this.options.prefix}splash-top > div > button {
                border: 0;
                margin: auto;
                padding: 10px 22px;
                border-radius: 5px;
                border: 3px solid white;
                background: linear-gradient(0deg, #dddddd, #ffffff);
                color: #222;
                text-transform: uppercase;
                text-shadow: 0 0 1px #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .${this.options.prefix}splash-top > div > button:hover {
                background: linear-gradient(0deg, #ffffff, #dddddd);
            }
            .${this.options.prefix}splash-top > div > button:active {
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                background: linear-gradient(0deg, #ffffff, #f5f5f5);
            }
            .${this.options.prefix}splash-top > div > div {
                position: relative;
                width: 150px;
                height: 150px;
                margin: auto auto 20px;
                border-radius: 100%;
                overflow: hidden;
                border: 3px solid rgba(255, 255, 255, 1);
                background-color: #000;
                box-shadow: inset 0 5px 5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
                background-image: url(${thumbnail});
                background-position: center;
                background-size: cover;
            }
            .${this.options.prefix}splash-top > div > div > img {
                width: 100%;
                height: 100%;
            }
            .${this.options.prefix}splash-bottom {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                align-self: center;
                justify-content: center;
                width: 100%;
                padding: 0 0 20px;
            }
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent,
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-title {
                box-sizing: border-box;
                width: 100%;
                padding: 20px;
                background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.5) 50%, transparent);
                color: #fff;
                text-align: left;
                font-size: 12px;
                font-family: Arial;
                font-weight: normal;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.7);
                line-height: 150%;
            }
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-title {
                padding: 15px 0;
                text-align: center;
                font-size: 18px;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                line-height: 100%;
            }
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent a {
                color: #fff;
            }
        `;
    /* eslint-enable */
    const head = document.head || document.getElementsByTagName("head")[0];
    const style = document.createElement("style");
    style.type = "text/css";
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);

    // If we want to display the GDPR consent message.
    // If it is a SpilGame, then show the splash without game name.
    // SpilGames all reside under one gameId. This is only true for their older games.
    /* eslint-disable */
    let html = "";
    if (isConsentDomain) {
      html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${this.options.prefix}splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <div></div>
                            <button id="${this.options.prefix}splash-button">Play Game</button>
                        </div>   
                    </div>
                    <div class="${this.options.prefix}splash-bottom">
                        <div class="${this.options.prefix}splash-consent">
                            We may show personalized ads provided by our partners, and our 
                            services can not be used by children under 16 years old without the 
                            consent of their legal guardian. By clicking "PLAY GAME", you consent 
                            to transmit your data to our partners for advertising purposes and 
                            declare that you are 16 years old or have the permission of your 
                            legal guardian. You can review our terms
                            <a href="https://docs.google.com/document/d/e/2PACX-1vR0BAkCq-V-OkAJ3EBT4qW4sZ9k1ta9K9EAa32V9wlxOOgP-BrY9Nv-533A_zdN3yi7tYRjO1r5cLxS/pub" target="_blank">here</a>.
                        </div>
                    </div>
                </div>
            `;
    } else if (gameData.gameId === "b92a4170784248bca2ffa0c08bec7a50") {
      html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${this.options.prefix}splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <button id="${this.options.prefix}splash-button">Play Game</button>
                        </div>   
                    </div>
                </div>
            `;
    } else {
      html = `
                <div class="${this.options.prefix}splash-background-container">
                    <div class="${this.options.prefix}splash-background-image"></div>
                </div>
                <div class="${this.options.prefix}splash-container">
                    <div class="${this.options.prefix}splash-top">
                        <div>
                            <div></div>
                            <button id="${this.options.prefix}splash-button">Play Game</button>
                        </div>   
                    </div>
                    <div class="${this.options.prefix}splash-bottom">
                        <div class="${this.options.prefix}splash-title">${gameData.title}</div>
                    </div>
                </div>
            `;
    }
    /* eslint-enable */

    // Create our container and add the markup.
    const container = document.createElement("div");
    container.innerHTML = html;
    container.id = `${this.options.prefix}splash`;

    // Flash bridge SDK will give us a splash container id (splash).
    // If not; then we just set the splash to be full screen.
    const splashContainer = this.options.flashSettings.splashContainerId
      ? document.getElementById(this.options.flashSettings.splashContainerId)
      : null;
    if (splashContainer) {
      splashContainer.style.display = "block";
      splashContainer.insertBefore(container, splashContainer.firstChild);
    } else {
      const body = document.body || document.getElementsByTagName("body")[0];
      body.insertBefore(container, body.firstChild);
    }

    // Make the whole splash screen click-able.
    // Or just the button.
    if (isConsentDomain) {
      const button = document.getElementById(
        `${this.options.prefix}splash-button`
      );
      button.addEventListener("click", () => {
        // Set consent cookie.
        const date = new Date();
        date.setDate(date.getDate() + 90); // 90 days, similar to Google Analytics.
        document.cookie = `ogdpr_tracking=1; expires=${date.toUTCString()}; path=/`;

        // Now show the advertisement and continue to the game.

        this.showAd(AdType.Interstitial).catch(error => {
          this.onResumeGame(error.message, "warning");
        });
      });
    } else {
      container.addEventListener("click", () => {
        this.showAd(AdType.Interstitial).catch(error => {
          this.onResumeGame(error.message, "warning");
        });
      });
    }

    // Now pause the game.
    this.onPauseGame("Pause the game and wait for a user gesture", "success");

    // Make sure the container is removed when an ad starts.
    this.eventBus.subscribe("SDK_GAME_PAUSE", () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      } else if (container) {
        container.style.display = "none";
      }
      if (splashContainer && splashContainer.parentNode) {
        splashContainer.parentNode.removeChild(splashContainer);
      } else if (splashContainer) {
        splashContainer.style.display = "none";
      }
    });

    // Make sure the container is removed when the game is resumed.
    this.eventBus.subscribe("SDK_GAME_START", () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      } else if (container) {
        container.style.display = "none";
      }
      if (splashContainer && splashContainer.parentNode) {
        splashContainer.parentNode.removeChild(splashContainer);
      } else if (splashContainer) {
        splashContainer.style.display = "none";
      }
    });
  }

  /**
   * [DEPRECATED]
   * showBanner
   * Used by our developer to call a video advertisement.
   * @public
   */
  showBanner() {
    try {
      this.showAd(AdType.Interstitial).catch(error => {
        this.onResumeGame(error.message, "warning");
      });
    } catch (error) {
      this.onResumeGame(error.message, "warning");
    }
  }

  /**
   * showAd
   * Used as inner function to call a type of video advertisement.
   * @param {String} adType
   * @return {Promise<any>}
   * @private
   */
  async showAd(adType) {
    return new Promise(async (resolve, reject) => {
      try {
        const gameData = await this.sdkReady;

        // Check blocked game
        if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
          throw new Error("Game or domain is blocked.");
        }

        // Reject in case we don't want to serve ads.
        if (!gameData.advertisements || this._whitelabelPartner) {
          throw new Error("Advertisements are disabled.");
        }

        // Check ad type
        if (!adType) {
          adType = AdType.Interstitial;
        } else if (
          adType !== AdType.Interstitial &&
          adType !== AdType.Rewarded
        ) {
          throw new Error("Unsupported an advertisement type: ", adType);
        }

        // check if the rewarded ads is enabled for the game.
        if (adType === AdType.Rewarded && !gameData.rewardedAds) {
          throw new Error("Rewarded ads are disabled.");
        }

        // Check if the interstitial advertisement is not called too often.
        if (
          adType === AdType.Interstitial &&
          typeof this.adRequestTimer !== "undefined"
        ) {
          const elapsed = new Date().valueOf() - this.adRequestTimer.valueOf();
          if (elapsed < gameData.midroll) {
            throw new Error("The advertisement was requested too soon.");
          }
        }

        // The scope should be cleaned up. It requires better solution.
        let scopeName = "main.showad";
        this.eventBus.unsubscribeScope(scopeName);

        let failed = args => {
          this.eventBus.unsubscribeScope(scopeName);
          this.onResumeGame(args.message, "warning");
          reject(args.message);
        };

        let succeded = args => {
          this.adRequestTimer = new Date();
          this.eventBus.unsubscribeScope(scopeName);
          resolve(args.message);
        };

        this.eventBus.subscribe("AD_ERROR", args => failed(args), scopeName);
        this.eventBus.subscribe("COMPLETE", args => succeded(args), scopeName);
        this.eventBus.subscribe(
          "ALL_ADS_COMPLETED",
          args => succeded(args),
          scopeName
        );
        this.eventBus.subscribe("SKIPPED", args => succeded(args), scopeName);
        this.eventBus.subscribe(
          "USER_CLOSE",
          args => succeded(args),
          scopeName
        );

        // Start the advertisement.
        await this.adInstance.startAd(adType);
      } catch (error) {
        this.onResumeGame(error.message, "warning");
        reject(error.message);
      }
    });
  }

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
  async preloadAd(adType) {
    return new Promise(async (resolve, reject) => {
      try {
        const gameData = await this.sdkReady;

        // Check blocked game
        if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
          throw new Error("Game or domain is blocked.");
        }

        // Check ad type
        if (!adType) {
          adType = AdType.Rewarded;
        } else if (
          adType !== AdType.Interstitial &&
          adType !== AdType.Rewarded
        ) {
          throw new Error("Unsupported an advertisement type:" + adType);
        }

        // check if the rewarded ads is enabled for the game.
        if (adType === AdType.Rewarded && !gameData.rewardedAds) {
          throw new Error("Rewarded ads are disabled.");
        }
        const result = await this.adInstance.preloadAd(adType);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * cancelAd
   * Cancels the current loaded/ running advertisement.
   * @return {Promise<void>}
   */
  async cancelAd() {
    return new Promise(async (reject, resolve) => {
      try {
        const gameData = await this.sdkReady;

        // Check blocked game
        if (gameData.bloc_gard && gameData.bloc_gard.enabled === true) {
          throw new Error("Game or domain is blocked.");
        }

        this.adInstance.cancel();
        resolve();
      } catch (error) {
        this.onResumeGame(error.message, "warning");
        reject(error.message);
      }
    });
  }

  /**
   * showDisplayAd
   * Used by our developer to call a display/banner advertisement.
   * @param {Object} options
   * @return {Promise<any>}
   * @public
   */
  showDisplayAd(options) {
    return this.adInstance.loadDisplayAd(options);
  }

  /**
   * onResumeGame
   * Called from various moments within the SDK. This sends
   * out a callback to our developer, so he/ she can allow the game to
   * resume again. We also call resumeGame() for backwards
   * compatibility reasons.
   * @param {String} message
   * @param {String} status
   */
  onResumeGame(message, status) {
    this._allowExternals({ enabled: false });

    try {
      this.options.resumeGame();
    } catch (error) {
      dankLog("DEVELOPER_ERROR", error.message, "warning");
      if (this.msgrt) {
        this.msgrt.send("dev.error", {
          message: error.message,
          details: "resumeGame"
        });
      }
    }

    let eventName = "SDK_GAME_START";
    this.eventBus.broadcast(eventName, {
      name: eventName,
      message: message,
      status: status,
      analytics: {
        category: "SDK",
        action: eventName,
        label: this.options.gameId + ""
      }
    });
  }

  /**
   * onPauseGame
   * Called from various moments within the SDK. This sends
   * out a callback to pause the game. It is required to have the game
   * paused when an advertisement starts playing.
   * @param {String} message
   * @param {String} status
   */
  onPauseGame(message, status) {
    this._allowExternals({ enabled: true });

    try {
      this.options.pauseGame();
    } catch (error) {
      dankLog("DEVELOPER_ERROR", error.message, "warning");
      if (this.msgrt) {
        this.msgrt.send("dev.error", {
          message: error.message,
          details: "pauseGame"
        });
      }
    }
    let eventName = "SDK_GAME_PAUSE";
    this.eventBus.broadcast(eventName, {
      name: eventName,
      message: message,
      status: status,
      analytics: {
        category: "SDK",
        action: eventName,
        label: this.options.gameId + ""
      }
    });
  }

  /**
   * openConsole
   * Enable debugging, we also set a value in localStorage,
   * so we can also enable debugging without setting the property.
   * This is nice for when we're trying to debug a game that is not ours.
   * @public
   */
  openConsole() {
    try {
      const implementation = new ImplementationTest(this);
      implementation.start();
      Ls.set("gd_debug_ex", true);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * _initExternals
   * @private
   */
  _initBlockingExternals() {
    const gameData = this._gameData;
    const block =
      gameData.failed || (gameData.block_exts && gameData.block_exts.enabled);
    if (!block) return;

    this.window_open = window.open;
    this._allowExternals({ enabled: false });
    this._removeExternalsInHtml({ enabled: false });
  }

  /**
   * _allowExternals
   * @private
   * @param {Object} options
   */
  _allowExternals(options) {
    if (typeof this.window_open === "undefined") return;

    if (options.enabled === false) {
      window.open = url => {
        this.msgrt.send("external", { message: `C> ${url}` });
        // if (url.startsWith('https://play.google.com')||url.startsWith('https://itunes.apple.com')) {
        //     this.window_open.call(null, url);
        // }
      };
    } else {
      window.open = this.window_open;
    }
  }
  /**
   * _removeExternalsInHtml
   * @private
   * @param {Object} options   *
   */
  _removeExternalsInHtml(options) {
    if (options.enabled === false) {
      let links = window.document.querySelectorAll("a");
      links.forEach(el => {
        let url = el.getAttribute("href");
        el.setAttribute("href", "#");
        el.onclick = evt => {
          evt.preventDefault();
          this.msgrt.send("external", { message: `H> ${url}` });
          return false;
        };
      });
    }
  }

  _getBridgeContext() {
    // Embeddable by game loader
    let matched = location.href.match(
      /http[s]?:\/\/(html5-internal\.gamedistribution\.com|html5\.gamedistribution\.com\/[A-Za-z0-9]{8})\/(.*)$/i
    );

    let canBeLoadedByLoader = (matched &&
    matched.length > 1 &&
    matched[1].length > 0
    ? matched[1]
    : undefined)
      ? true
      : false;
    let loadedByLoader = canBeLoadedByLoader; // temp

    const config =
      location.hash &&
      location.hash.length > 1 &&
      location.hash.indexOf("#config=") != -1
        ? JSON.parse(
            atob(location.hash.substr(location.hash.indexOf("#config=") + 8))
          ) // cut #config=
        : {};

    const parentURL =
      loadedByLoader && config.parentURL ? config.parentURL : undefined;
    const parentDomain =
      loadedByLoader && config.parentDomain ? config.parentDomain : undefined;

    let noSplashScreen = loadedByLoader; // temp
    let noConsoleBanner = loadedByLoader; //temp
    let noLoadedEvent = loadedByLoader; // temp
    let noBlockerEvent = loadedByLoader; // temp
    let noPreroll =
      loadedByLoader &&
      (typeof config.hasImpression === "undefined"
        ? true
        : config.hasImpression); // temp
    let noGAPageView = loadedByLoader; // temp
    let noLotamePageView = loadedByLoader; // temp
    let version = config;

    // is gd game url
    matched = location.href.match(
      /http[s]?:\/\/(html5\.gamedistribution\.com\/[A-Fa-f0-9]{32})(.*)$/i
    );

    let isLegacyGameURL = (matched &&
    matched.length > 1 &&
    matched[1].length > 0
    ? matched[1]
    : undefined)
      ? true
      : false;

    return {
      canBeLoadedByLoader: canBeLoadedByLoader,
      loadedByLoader,
      isLegacyGameURL,
      noSplashScreen,
      noConsoleBanner,
      noLoadedEvent,
      noBlockerEvent,
      noPreroll,
      parentURL,
      parentDomain,
      noGAPageView,
      noLotamePageView
    };
  }
}

export default SDK;
