"use strict";

import EventBus from "../components/EventBus";
import { AdType } from "../modules/adType";
import { Layers } from "../modules/layers";
import { Ls } from "../modules/common";

// import canautoplay from 'can-autoplay';

let instance = null;

/**
 * ImplementationTest
 */
class ImplementationTest {
  /**
   * Constructor of ImplementationTest.
   * @return {*}
   */
  constructor(sdk) {
    // Make this a singleton.
    if (instance) return instance;
    else instance = this;

    this.eventBus = new EventBus();
    this._sdk = sdk;
  }

  /**
   * Start testing.
   */
  start() {
    const css = `
            #gdsdk__console_container {
                display: flex;
                box-sizing: border-box;
                padding: 3px;
                background: linear-gradient(90deg,#3d1b5d,#5c3997);
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 8px;
            }
            #gdsdk__console_container button {
                flex: 1;
                background: #44a5ab;
                padding: 3px 10px;
                margin: 2px;
                border: 0;
                border-radius: 3px;
                color: #fff;
                outline: 0;
                cursor: pointer;
                font-size: 8px;
                box-shadow: 0 0 0 transparent;
                text-shadow: 0 0 0 transparent;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
            }
            #gdsdk__console_container button:hover {
                background: #4fb3b9;
            }
            #gdsdk__console_container button:active {
                background: #62bbc0;
            }
        `;

    const html = `
            <div id="gdsdk__console_container">
                <button id="gdsdk__hbgdDebug">Activate hbgd debug</button>
                <button id="gdsdk__hbgdConfig">Log idhbgd config</button>
                <!--
                <button id="gdsdk__resumeGame">Resume</button>
                <button id="gdsdk__pauseGame">Pause</button>
                -->
                <button id="gdsdk__showBanner">Interstitial</button>
                <button id="gdsdk__showRewarded">Rewarded</button>
                <button id="gdsdk__preloadRewarded">Preload rewarded</button>
                <button id="gdsdk__cancel">Cancel</button>
                <button id="gdsdk__demo">Demo VAST tag</button>
                <button id="gdsdk__disableMidrollTimer">Disable delay</button>
                <button id="gdsdk__closeDebug">Close</button>
            </div>
        `;

    // Add css
    const head = document.head || document.getElementsByTagName("head")[0];
    const style = document.createElement("style");
    style.type = "text/css";
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);

    // Add html
    const body = document.body || document.getElementsByTagName("body")[0];
    const container = document.createElement("div");
    container.id="gdsdk__console";
    container.style.position = "fixed";
    container.style.zIndex = Layers.Console.zIndex;;
    container.style.bottom = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.innerHTML = html;
    body.appendChild(container);

    // Add listeners
    // const pauseGame = document.getElementById('gdsdk__pauseGame');
    // const resumeGame = document.getElementById('gdsdk__resumeGame');
    const showBanner = document.getElementById("gdsdk__showBanner");
    const showRewarded = document.getElementById("gdsdk__showRewarded");
    const preloadRewarded = document.getElementById("gdsdk__preloadRewarded");
    const cancelAd = document.getElementById("gdsdk__cancel");
    const demoAd = document.getElementById("gdsdk__demo");
    const disableMidrollTimer = document.getElementById(
      "gdsdk__disableMidrollTimer"
    );
    const hbgdDebug = document.getElementById("gdsdk__hbgdDebug");
    const hbgdConfig = document.getElementById("gdsdk__hbgdConfig");
    const closeDebug = document.getElementById("gdsdk__closeDebug");

    if (Ls.getBoolean("gd_tag")) {
      demoAd.innerHTML = "Revert Vast tag";
      demoAd.style.background = "#ff8c1c";
    } else {
      demoAd.innerHTML = "Demo VAST tag";
      demoAd.style.background = "#44a5ab";
    }

    if (Ls.getBoolean("gd_disable_midroll_timer")) {
      disableMidrollTimer.innerHTML = "Revert delay";
      disableMidrollTimer.style.background = "#ff8c1c";
    } else {
      disableMidrollTimer.innerHTML = "Disable delay";
      disableMidrollTimer.style.background = "#44a5ab";
    }

    if (Ls.getBoolean("gd_hb_debug")) {
      hbgdDebug.innerHTML = "Revert HB Debug";
      hbgdDebug.style.background = "#ff8c1c";
    } else {
      hbgdDebug.innerHTML = "HB Debug";
      hbgdDebug.style.background = "#44a5ab";
    }

    showBanner.addEventListener("click", () => {

      let reqAd = () => {
        window.gdsdk
          .showAd(AdType.Interstitial)
          .then(() => console.info("showAd(AdType.Interstitial) resolved."))
          .catch(error => console.info(error));
      };

      // Option 1: Triggered by requestAnimationFrame
      // window.requestAnimationFrame(reqAd);

      // Option 2: Triggered by timer
      // setTimeout(reqAd, 1000);

      // Option 3: Triggered by user
      reqAd();
    });
    showRewarded.addEventListener("click", () => {
      let reqAd = () => {
        window.gdsdk
          .showAd(AdType.Rewarded)
          .then(() => console.info("showAd(AdType.Rewarded) resolved."))
          .catch(error => console.info(error));
      };

      // Option 1: Triggered by requestAnimationFrame
      // window.requestAnimationFrame(reqAd);

      // Option 2: Triggered by timer
      // setTimeout(reqAd, 1000);

      // Option 3: Triggered directly by user
      reqAd();
    });
    preloadRewarded.addEventListener("click", () => {
      window.gdsdk
        .preloadAd(AdType.Rewarded)
        .then(response => console.log(response))
        .catch(error => console.log(error.message));
    });
    cancelAd.addEventListener("click", () => {
      window.gdsdk
        .cancelAd()
        .then(response => {
          // console.log(response);
        })
        .catch(error => {
          // console.log(error.message);
        });
    });
    demoAd.addEventListener("click", () => {
      try {
        if (Ls.getBoolean("gd_tag")) Ls.remove("gd_tag");
        else Ls.set("gd_tag", true);

        location.reload();
      } catch (error) {
        console.log(error);
      }
    });
    disableMidrollTimer.addEventListener("click", () => {
      try {
        if (Ls.getBoolean("gd_disable_midroll_timer"))
          Ls.remove("gd_disable_midroll_timer");
        else Ls.set("gd_disable_midroll_timer", true);
        location.reload();
      } catch (error) {
        console.log(error);
      }
    });
    closeDebug.addEventListener("click", () => {
      try {
        if (Ls.getBoolean("gd_debug_ex")) Ls.remove("gd_debug_ex");
        else Ls.set("gd_debug_ex", true);

        location.reload();
      } catch (error) {
        console.log(error);
      }
    });
    hbgdDebug.addEventListener("click", () => {
      try {
        if (Ls.getBoolean("gd_hb_debug")) Ls.remove("gd_hb_debug");
        else Ls.set("gd_hb_debug", true);

        window.idhbgd &&
          window.idhbgd.debug(
            Ls.available && Ls.getBoolean("gd_hb_debug") ? true : false
          );

        location.reload();
      } catch (error) {
        console.log(error);
      }
    });
    hbgdConfig.addEventListener("click", () => {
      try {
        const config = window.idhbgd.getConfig();
        console.info(config);
      } catch (error) {
        console.log(error);
      }
    });
  }
}

export default ImplementationTest;
