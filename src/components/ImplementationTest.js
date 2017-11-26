'use strict';

import EventBus from '../components/EventBus';

let instance = null;

/**
 * ImplementationTest
 */
class ImplementationTest {
    /**
     * Constructor of ImplementationTest.
     * @return {*}
     */
    constructor() {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        this.eventBus = new EventBus();
    }

    /**
     * Start testing.
     */
    start() {
        const css = `
            #gd-implementation {
                box-sizing: border-box;
                position: fixed;
                z-index: 100;
                bottom: 0;
                width: 100%;
                padding: 5px;
                background: linear-gradient(90deg,#3d1b5d,#5c3997);
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 8px;
            }
            #gd-implementation > div {
                width: 100%;
            }
            #gd-implementation > div > div {
                float: left;
                margin-right: 10px;
            }
            #gd-implementation > div > div:last-of-type {
                float: right;
                margin-right: 0;
                text-align: right;
            }
            #gd-implementation h2 {
                color: #ffd1b1;
                text-shadow: 0 0.07em 0 rgba(0,0,0,.5);
                text-transform: uppercase;
                margin-bottom: 8px;
                font-size: 8px;
                line-height: 0;
            }
            #gd-implementation button {
                background: #44a5ab;
                margin-left: 2px;
                padding: 3px 10px;
                border: 0;
                border-radius: 3px;
                color: #fff;
                outline: 0;
                cursor: pointer;
                font-size: 8px;
            }
            #gd-implementation button:hover {
                background: #4fb3b9;
            }
            #gd-implementation button:active {
                background: #62bbc0;
            }
            #gd-implementation button:first-of-type {
                margin-left: 0;
            }
        `;

        const html = `
            <div id="gd-implementation">
                <div>
                    <div>
                        <h2>Advertisement</h2>
                        <button id="gd-showBanner">showBanner</button>
                        <button id="gd-cancel">Cancel</button>
                        <button id="gd-demo">Demo VAST tag</button>
                        <button id="gd-midrollTimer">Disable delay</button>
                    </div>
                    <div>
                        <h2>Game</h2>
                        <button id="gd-pauseGame">pauseGame</button>
                        <button id="gd-resumeGame">resumeGame</button>
                    </div>
                </div>
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
        container.style.zIndex = 100;
        container.style.bottom = 0;
        container.innerHTML = html;
        body.parentNode.insertBefore(container, body);

        // Add listeners
        const pauseGame = document.getElementById('gd-pauseGame');
        const resumeGame = document.getElementById('gd-resumeGame');
        const showBanner = document.getElementById('gd-showBanner');
        const cancelAd = document.getElementById('gd-cancel');
        const demoAd = document.getElementById('gd-demo');
        const midrollTimer = document.getElementById('gd-midrollTimer');

        pauseGame.addEventListener('click', () => {
            window.gdApi.onPauseGame();
        });
        resumeGame.addEventListener('click', () => {
            window.gdApi.onResumeGame();
        });
        showBanner.addEventListener('click', () => {
            window.gdApi.showBanner();
        });
        cancelAd.addEventListener('click', () => {
            window.gdApi.videoAdInstance.cancel();
        });
        demoAd.addEventListener('click', () => {
            try {
                const tag = 'https://pubads.g.doubleclick.net/gampad/ads' +
                    '?sz=640x480&iu=/124319096/external/single_ad_samples' +
                    '&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast' +
                    '&unviewed_position_start=1&' +
                    'cust_params=deployment%3Ddevsite' +
                    '%26sample_ct%3Dlinear&correlator=';
                localStorage.setItem('gd_tag', tag);
                location.reload();
            } catch (error) {
                console.log(error);
            }
        });
        midrollTimer.addEventListener('click', () => {
            try {
                localStorage.setItem('gd_midroll', 0);
                location.reload();
            } catch (error) {
                console.log(error);
            }
        });
    }
}

export default ImplementationTest;
