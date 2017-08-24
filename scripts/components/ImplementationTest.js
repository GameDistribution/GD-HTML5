'use strict';

import EventBus from '../components/EventBus';

import {dankLog} from "../modules/dankLog";

let instance = null;

class ImplementationTest {

    constructor() {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        this.eventBus = new EventBus();
    }

    start() {
        const css = `
            #gdApi-implementation {
                box-sizing: border-box;
                position: fixed;
                z-index: 100;
                bottom: 0;
                width: 100%;
                padding: 10px 20px 20px;
                background: linear-gradient(90deg,#3d1b5d,#5c3997);
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 16px;
            }
            #gdApi-implementation > div {
                width: 100%;
            }
            #gdApi-implementation > div > div {
                float: left;
                margin-right: 20px;
            }
            #gdApi-implementation > div > div:last-of-type {
                float: right;
                margin-right: 0;
                text-align: right;
            }
            #gdApi-implementation h2 {
                font-size: 10px;
                color: #ffd1b1;
                text-shadow: 0 0.07em 0 rgba(0,0,0,.5);
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            #gdApi-implementation button {
                background: #44a5ab;
                margin-left: 2.5px;
                padding: 10px 20px;
                border: 0;
                border-radius: 3px;
                color: #fff;
                outline: 0;
                cursor: pointer;
            }
            #gdApi-implementation button:hover {
                background: #4fb3b9;
            }
            #gdApi-implementation button:active {
                background: #62bbc0;
            }
            #gdApi-implementation button:first-of-type {
                margin-left: 0;
            }
            #gdApi-implementation button span {
                font-size: 10px;
                padding: 3px 6px;
                color: rgba(255, 255, 255, 0.4);
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
                margin-left: 10px;
            }
            #gdApi-implementation button#gdApi-updateTag {
                border-radius: 0 3px 3px 0;
                margin-left: -7px;
            }
            #gdApi-implementation input {
                padding: 10px 13px 10px 10px;
                border: 0;
                border-radius: 3px 0 0 3px;
                color: #3d1b5d;
                outline: 0;
                width: 250px;
                margin-right: 0;
                box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.6);
            }
        `;

        const html = `
            <div id="gdApi-implementation">
                <div>
                    <div>
                        <h2>Advertisement</h2>
                        <input id="gdApi-tag" value="" placeholder="VAST tag" />
                        <button id="gdApi-updateTag">Update</button>
                        <button id="gdApi-showBanner">showBanner</button>
                        <button id="gdApi-cancel">Cancel</button>
                    </div>
                     <div>
                        <h2>Game</h2>
                        <button id="gdApi-pauseGame">pauseGame</button>
                        <button id="gdApi-resumeGame">resumeGame</button>
                    </div>
                    <div>
                        <h2>Analytics</h2>
                        <button id="gdApi-playCounter">event: play</button>
                        <button id="gdApi-logCounter">event: custom <span>key: test</span></button>
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

        // Ad listeners
        const pauseGame = document.getElementById('gdApi-pauseGame');
        const resumeGame = document.getElementById('gdApi-resumeGame');
        const updateTag = document.getElementById('gdApi-updateTag');
        const showBanner = document.getElementById('gdApi-showBanner');
        const cancelAd = document.getElementById('gdApi-cancel');
        const input = document.getElementById('gdApi-tag');
        const playCounter = document.getElementById('gdApi-playCounter');
        const logCounter = document.getElementById('gdApi-logCounter');

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
        playCounter.addEventListener('click', () => {
            window.gdApi.play();
        });
        logCounter.addEventListener('click', () => {
            window.gdApi.customLog('test');
        });

        this.eventBus.subscribe('AD_SDK_LOADER_READY', () => {
            // Set initial VAST tag.
            input.value = window.gdApi.videoAdInstance.options.tag;
            // Update tag in videoAdInstance, so we can use this new tag to request ads.
            updateTag.addEventListener('click', () => {
                window.gdApi.videoAdInstance.requestAttempts = 0; // Reset adRequest attempts.
                window.gdApi.videoAdInstance.options.tag = input.value;
                window.gdApi.videoAdInstance.cancel();
                dankLog('AD_TAG_UPDATED', tag, 'success');
            });
        });
    }
}

export default ImplementationTest;