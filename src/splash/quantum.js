import Base from "./base";

class Quantum extends Base {
  constructor(options, gameData) {
    super(options, gameData);
    this._init();
  }
  _init() {
    // css
    const css = this._css(this.options, this.gameData);
    this._insertCss(css);

    // html
    const html = this._html(this.options, this.gameData);
    const { container, splashContainer } = this._insertHtml(html);

    this._root = container;
    this._container = container;
    this._splashContainer = splashContainer;

    // register events
    this._registerEvents();
  }

  _css(options, gameData) {
    let thumbnail = this._getThumbnail(options, gameData);
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

    return css;
  }
  
  _html(options, gameData) {
    const { isConsentDomain } = options;
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

    return html;
  }

  _insertHtml(html) {
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

    return { container, splashContainer };
  }
}

export default Quantum;
