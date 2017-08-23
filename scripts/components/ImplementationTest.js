'use strict';

let instance = null;

class ImplementationTest {

    constructor() {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }
    }

    start(options) {
        const css = `
            #gdApi-implementation {
                box-sizing: border-box;
                position: fixed;
                z-index: 100;
                bottom: 0;
                width: 100%;
                padding: 20px;
                background: linear-gradient(90deg,#3d1b5d,#5c3997);
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 16px;
            }
            #gdApi-implementation > div {
                display: flex;
            }
            #gdApi-implementation > div > div:first-of-type {
                flex: 1;
            }
            #gdApi-implementation button {
                background: #44a5ab;
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
            #gdApi-implementation button span {
                font-size: 10px;
                padding: 3px 6px;
                color: rgba(255, 255, 255, 0.4);
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
                margin-left: 10px;
            }
            #gdApi-implementation button#gdApi-showBanner {
                border-radius: 0 3px 3px 0;
                margin-left: -7px;
            }
            #gdApi-implementation input {
                padding: 10px 13px 10px 10px;
                border: 0;
                border-radius: 3px 0 0 3px;
                color: #3d1b5d;
                outline: 0;
                width: 200px;
                margin-right: 0;
                box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.6);
            }
             
            
        `;
        const html = `
            <div id="gdApi-implementation">
                <div>
                    <div>
                        Analytics:
                        <button id="gdApi-playCounter">play</button>
                        <button id="gdApi-logCounter">log <span>key: 1212412412412412</span></button>
                    </div>
                    <div>
                        Game:
                        <button id="gdApi-pauseGame">pauseGame</button>
                        <button id="gdApi-resumeGame">resumeGame</button>
                    </div>
                    <div>
                        Advertisement:
                        <input value="${options.advertisementSettings.tag}" placeholder="VAST tag" />
                        <button id="gdApi-showBanner">showBanner</button>
                        <button id="gdApi-cancel">Cancel</button>
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
        pauseGame.addEventListener('click', () => {
            window.gdApi.pauseGame();
        });
        const resumeGame = document.getElementById('gdApi-resumeGame');
        resumeGame.addEventListener('click', () => {
            window.gdApi.resumeGame();
        });
        const showBanner = document.getElementById('gdApi-showBanner');
        showBanner.addEventListener('click', () => {
            window.gdApi.showBanner();
        });
        const cancelAd = document.getElementById('gdApi-cancel');
        cancelAd.addEventListener('click', () => {
            window.gdApi.videoAdInstance.cancel();
        });

    }

}

export default ImplementationTest;