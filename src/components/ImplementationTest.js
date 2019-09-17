'use strict';

import EventBus from '../components/EventBus';
import {AdType} from '../modules/adType';

let instance = null;

/**
 * ImplementationTest
 */
class ImplementationTest {
    /**
     * Constructor of ImplementationTest.
     * @param {String} testing
     * @return {*}
     */
    constructor(testing) {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        this.testing = testing;
        this.eventBus = new EventBus();
    }

    /**
     * Start testing.
     */
    start() {
        const css = `
            #gdsdk__implementation {
                display: flex;
                box-sizing: border-box;
                position: fixed;
                z-index: 667;
                bottom: 0;
                left: 0;
                width: 100%;
                padding: 3px;
                background: linear-gradient(90deg,#3d1b5d,#5c3997);
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 8px;
            }
            #gdsdk__implementation button {
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
            #gdsdk__implementation button:hover {
                background: #4fb3b9;
            }
            #gdsdk__implementation button:active {
                background: #62bbc0;
            }
        `;

        const html = `
            <div id="gdsdk__implementation">
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
                <button id="gdsdk__midrollTimer">Disable delay</button>
                <button id="gdsdk__closeDebug">Close</button>
            </div>
        `;

        // Add css
        const head = document.head || document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);

        // Add html
        const body = document.body || document.getElementsByTagName('body')[0];
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.zIndex = '668';
        container.style.bottom = '0';
        container.innerHTML = html;
        body.appendChild(container);

        // Add listeners
        // const pauseGame = document.getElementById('gdsdk__pauseGame');
        // const resumeGame = document.getElementById('gdsdk__resumeGame');
        const showBanner = document.getElementById('gdsdk__showBanner');
        const showRewarded = document.getElementById('gdsdk__showRewarded');
        const preloadRewarded = document.getElementById('gdsdk__preloadRewarded');
        const cancelAd = document.getElementById('gdsdk__cancel');
        const demoAd = document.getElementById('gdsdk__demo');
        const midrollTimer = document.getElementById('gdsdk__midrollTimer');
        const hbgdDebug = document.getElementById('gdsdk__hbgdDebug');
        const hbgdConfig = document.getElementById('gdsdk__hbgdConfig');
        const closeDebug = document.getElementById('gdsdk__closeDebug');

        if (localStorage.getItem('gd_tag')) {
            demoAd.innerHTML = 'Revert Vast tag';
            demoAd.style.background = '#ff8c1c';
        } else {
            demoAd.innerHTML = 'Demo VAST tag';
            demoAd.style.background = '#44a5ab';
        }

        if (localStorage.getItem('gd_midroll')) {
            midrollTimer.innerHTML = 'Revert delay';
            midrollTimer.style.background = '#ff8c1c';
        } else {
            midrollTimer.innerHTML = 'Disable delay';
            midrollTimer.style.background = '#44a5ab';
        }

        // pauseGame.addEventListener('click', () => {
        //     window.gdsdk.onPauseGame('Pause game requested from debugger',
        //         'warning');
        // });
        // resumeGame.addEventListener('click', () => {
        //     window.gdsdk.onResumeGame('Resume game requested from debugger',
        //         'warning');
        // });
        showBanner.addEventListener('click', () => {
            window.gdsdk
                .showAd(AdType.Interstitial);
            // window.gdsdk
            //     .showAd(AdType.Interstitial)
            //     .then(() => console.info('showAd(AdType.Interstitial) resolved.'))
            //     .catch(error => console.info(error));
        });
        showRewarded.addEventListener('click', () => {
            window.gdsdk
                .showAd(AdType.Rewarded)
                .then(() => console.info('showAd(AdType.Rewarded) resolved.'))
                .catch(error => console.info(error));
        });
        preloadRewarded.addEventListener('click', () => {
            window.gdsdk
                .preloadAd(AdType.Rewarded)
                .then(response => console.info(response))
                .catch(error => console.info(error.message));
        });
        cancelAd.addEventListener('click', () => {
            window.gdsdk.cancelAd();
        });
        demoAd.addEventListener('click', () => {
            try {
                if (localStorage.getItem('gd_tag')) {
                    localStorage.removeItem('gd_tag');
                } else {
                    const tag = `https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator=`;
                    localStorage.setItem('gd_tag', tag);
                }
                location.reload();
            } catch (error) {
                console.log(error);
            }
        });
        midrollTimer.addEventListener('click', () => {
            try {
                if (localStorage.getItem('gd_midroll')) {
                    localStorage.removeItem('gd_midroll');
                } else {
                    localStorage.setItem('gd_midroll', '0');
                }
                location.reload();
            } catch (error) {
                console.log(error);
            }
        });
        closeDebug.addEventListener('click', () => {
            try {
                if (localStorage.getItem('gd_debug')) {
                    localStorage.removeItem('gd_debug');
                } else {
                    localStorage.setItem('gd_debug', '0');
                }
                location.reload();
            } catch (error) {
                console.log(error);
            }
        });
        hbgdDebug.addEventListener('click', () => {
            try {
                window.idhbgd.debug(true);
            } catch (error) {
                console.log(error);
            }
        });
        hbgdConfig.addEventListener('click', () => {
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
