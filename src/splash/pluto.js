import Base from "./base";
import { Layers } from "../modules/layers";

class Pluto extends Base {
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
    const { container, extContainer } = this._insertHtml(html);

    this._root = container;
    this._container = container;
    this._extContainer = extContainer;

    // register events
    this._registerEvents();

    const loader = document.querySelector(`.${this.options.prefix}loader`);
    const playButton = document.getElementById(
      `${this.options.prefix}splash-button`
    );

    this.on("playClick", () => {
      loader.style.display = "block";
      playButton.style.display = "none";
    });
  }
  _css(options, gameData) {
    let thumbnail = this._getThumbnail(options, gameData);
    /* eslint-disable */
    const css = `
            body {
                position: inherit;
            }
            .${this.options.prefix}splash-container {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: stretch;
                position: absolute;
                width: 100%;
                height: 100%;
                top:0;
                left:0;
                background-color:black;
                color:white;
                ${this._getBackground(options, gameData)}                      
            }

            .${this.options.prefix}splash-container >.${this.options.prefix}splash-top {
            }            
            .${this.options.prefix}splash-container >.${this.options.prefix}splash-center {
              flex-grow:1;  
              display: flex;
              flex-direction: row;
              justify-content: flex-start;
              align-items: stretch;
            }
            .${this.options.prefix}splash-container >.${this.options.prefix}splash-bottom {
            }

            .${this.options.prefix}splash-center >.${this.options.prefix}splash-left {
            }            
            .${this.options.prefix}splash-center >.${this.options.prefix}splash-game {
              flex-grow:1;
              display:flex;
              flex-direction:column;
              justify-content: flex-start; 
              overflow:hidden;          
            }
            .${this.options.prefix}splash-center >.${this.options.prefix}splash-right {
            }

            .${this.options.prefix}splash-game-thumbnail{
              display:flex;
              justify-content:center;
              flex-grow:1;
            }

            .${this.options.prefix}splash-game-play{
              display:flex;
              justify-content:center;
            }

            .${this.options.prefix}splash-game-title{
              display:flex;
              justify-content:center;
            }

            .${this.options.prefix}splash-game-consent{
              display:flex;
              justify-content:center;
              padding:0.5em;

            }
            .${this.options.prefix}splash-game-thumbnail>div {
              width: 150px;
              max-height: 150px;
              border-radius: 5px;
              border: 2px solid rgba(255, 255, 255, 0.8);
              box-shadow: inset 0 5px 5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
              background-image: url(${thumbnail});
              background-position: center;
              background-size: cover;
            }

            .${this.options.prefix}splash-game-play>button{
              padding: 8px;
              border-radius: 5px;
              border:0;
              background: linear-gradient(0deg, #21A179, #1C8464);
              color: white;
              text-transform: uppercase;
              font-family: Helvetica, Arial, sans-serif;
              font-weight: bold;
              font-size: 18px;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              width: 150px;
            }

            .${this.options.prefix}splash-game-play>button:hover {
                background: linear-gradient(0deg, #1C8464, #21A179);
            }

            .${this.options.prefix}splash-game-play>button:active {
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                background: linear-gradient(0deg, #1C8464, #15674E);
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
    let consentStyle = isConsentDomain ? "display:block" : "display:none";

    html = `
          <div class="${this.options.prefix}splash-container">
            <div class="${this.options.prefix}splash-top">   
              TOP       
            </div>
            <div class="${this.options.prefix}splash-center">   
              <div class="${this.options.prefix}splash-left">   
                LEFT       
              </div>
              <div class="${this.options.prefix}splash-game">   
                <div class="${this.options.prefix}splash-game-thumbnail">   
                  <div></div>       
                </div>
                <div class="${this.options.prefix}splash-game-play">   
                  <button id="${this.options.prefix}splash-game-play-button">PLAY</button>        
                </div>
                <div class="${this.options.prefix}splash-game-title">   
                  ${gameData.title}       
                </div>
                <div class="${this.options.prefix}splash-game-consent" style=${consentStyle}>
                  <div>
                    We may show personalized ads provided by our partners, and our 
                    services can not be used by children under 16 years old without the 
                    consent of their legal guardian. By clicking "PLAY", you consent 
                    to transmit your data to our partners for advertising purposes and 
                    declare that you are 16 years old or have the permission of your 
                    legal guardian. You can review our terms
                    <a href="https://docs.google.com/document/d/e/2PACX-1vR0BAkCq-V-OkAJ3EBT4qW4sZ9k1ta9K9EAa32V9wlxOOgP-BrY9Nv-533A_zdN3yi7tYRjO1r5cLxS/pub" target="_blank">here</a>.       
                  </div>
                </div>                                          
              </div>              
              <div class="${this.options.prefix}splash-right">   
                RIGHT       
              </div>              
            </div>            
            <div class="${this.options.prefix}splash-bottom">   
              BOTTOM       
            </div>            
          </div>
      `;
    return html;
  }

  _insertHtml(html) {
    // Create our container and add the markup.
    const container = document.createElement("div");
    container.innerHTML = html;
    container.id = `${this.options.prefix}splash`;
    container.style['z-index'] = Layers.SplashContainer.zIndex;
    container.style['position'] = "fixed";
    container.style['width'] = "100%";
    container.style['height'] = "100%";
    container.style['top'] = "0";
    container.style['left'] = "0";

    const extContainer = this._getExtContainer();

    if (extContainer) {
      extContainer.style.display = "block";
      extContainer.insertBefore(container, extContainer.firstChild);
    } else {
      const body = document.body || document.getElementsByTagName("body")[0];
      body.insertBefore(container, body.firstChild);
    }

    return { container, extContainer };
  }

  _getBackground(options, gameData) {
    const background = gameData.splash.background || options.background;

    if (background === "carbon") {
      const backgroundColor = gameData.splash["background-color"] || "#131313";

      return `
      background:
      linear-gradient(27deg, #151515 5px, transparent 5px) 0 5px,
      linear-gradient(207deg, #151515 5px, transparent 5px) 10px 0px,
      linear-gradient(27deg, #222 5px, transparent 5px) 0px 10px,
      linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px,
      linear-gradient(90deg, #1b1b1b 10px, transparent 10px),
      linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424);
      background-color:${backgroundColor};
      background-size: 20px 20px;        
      `;
    } else if (background === "rainbow") {
      const backgroundColor = gameData.splash["background-color"] || "#840b2a";

      return `
      background:
      radial-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,.15) 30%, rgba(255,255,255,.3) 32%, rgba(255,255,255,0) 33%) 0 0,
      radial-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,.1) 11%, rgba(255,255,255,.3) 13%, rgba(255,255,255,0) 14%) 0 0,
      radial-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,.2) 17%, rgba(255,255,255,.43) 19%, rgba(255,255,255,0) 20%) 0 110px,
      radial-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,.2) 11%, rgba(255,255,255,.4) 13%, rgba(255,255,255,0) 14%) -130px -170px,
      radial-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,.2) 11%, rgba(255,255,255,.4) 13%, rgba(255,255,255,0) 14%) 130px 370px,
      radial-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,.1) 11%, rgba(255,255,255,.2) 13%, rgba(255,255,255,0) 14%) 0 0,
      linear-gradient(45deg, #343702 0%, #184500 20%, #187546 30%, #006782 40%, #0b1284 50%, #760ea1 60%, #83096e 70%, #840b2a 80%, #b13e12 90%, #e27412 100%);
      background-size: 470px 470px, 970px 970px, 410px 410px, 610px 610px, 530px 530px, 730px 730px, 100% 100%;
      background-color:${backgroundColor};    
      `;
    } else if (background === "linedpaper") {
      const backgroundColor = gameData.splash["background-color"] || "#fff";

      return `
      background-color:${backgroundColor};
      background-image:
      linear-gradient(90deg, transparent 79px, #abced4 79px, #abced4 81px, transparent 81px),
      linear-gradient(#eee .1em, transparent .1em);
      background-size: 100% 1.2em;     
      `;
    } else if (background === "cicadastripes") {
      const backgroundColor = gameData.splash["background-color"] || "#026873";

      return `
      background-color:${backgroundColor};
      background-image: linear-gradient(90deg, rgba(255,255,255,.07) 50%, transparent 50%),
      linear-gradient(90deg, rgba(255,255,255,.13) 50%, transparent 50%),
      linear-gradient(90deg, transparent 50%, rgba(255,255,255,.17) 50%),
      linear-gradient(90deg, transparent 50%, rgba(255,255,255,.19) 50%);
      background-size: 13px, 29px, 37px, 53px; 
      `;
    } // Carbon fibre
    else {
      const backgroundColor = gameData.splash["background-color"] || "#282828";
      return `
     background:
     radial-gradient(black 10%, transparent 10%) 0 0,
     radial-gradient(black 10%, transparent 10%) 8px 8px,
     radial-gradient(rgba(255,255,255,.1) 10%, transparent 10%) 0 1px,
     radial-gradient(rgba(255,255,255,.1) 10%, transparent 10%) 8px 9px;
     background-color:${backgroundColor};
     background-size:16px 16px;
     `;
    }
  }
}

export default Pluto;