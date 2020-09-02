import Base from "./base";
import {Layers} from "@bygd/gd-sdk-era/dist/default";

class Rocket extends Base {
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

    const walkthroughButton = document.getElementById(
        `${this.options.prefix}walkthrough-button`
    );

    const scrollToWalkthrough = function() {
        window.parent.postMessage('scrollToWalkthrough', "*");
    }
    walkthroughButton.addEventListener('click', scrollToWalkthrough);

    const categoryMascot = document.getElementById('categoryMascot');

    this.on("playClick", () => {
      loader.style.display = "block";
      playButton.style.display = "none";
      walkthroughButton.style.display = "none";
      categoryMascot.style.display = "none";
    });
  }
  _css(options, gameData) {
    let thumbnail = this._getThumbnail(options, gameData);
    
    const mascotPath = "https://kizicdn.com/assets/games/mascots/kizi-maskot-";
    let mascot = "";
    const size = "@2x";

    switch(gameData.category) {
        case 'Girls' :
            mascot = `${mascotPath}girls${size}.png`;
            break;
        case 'Hypercasual' :
            mascot = `${mascotPath}strategy${size}.png`;
            break;
        case 'Puzzle' :
            mascot = `${mascotPath}puzzle${size}.png`;
            break;
        case 'Baby' :
            mascot = `${mascotPath}baby${size}.png`;
            break;
        case 'Soccer' :
            mascot = `${mascotPath}soccer${size}.png`;
            break;
        case 'Cooking' :
            mascot = `${mascotPath}cooking${size}.png`;
            break;
        case 'Racing' :
            mascot = `${mascotPath}race${size}.png`;
            break;
        case 'Action' :
            mascot = `${mascotPath}action${size}.png`;
            break;
        default:
            mascot = `${mascotPath}default${size}.png`;
    };

    /* eslint-disable */
    const css = `
    
            body {
                position: inherit;
                background: none;
                border-radius: 40px 40px 0px 0px;
                overflow: hidden;
            }

            .${this.options.prefix}splash-background-container {
                box-sizing: border-box;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow:hidden;
                border-radius: 40px 40px 0px 0px;
                background: rgb(0,81,168);
                background: -moz-linear-gradient(14deg, rgba(0,81,168,1) 0%, rgba(0,118,248,1) 100%);
                background: -webkit-linear-gradient(14deg, rgba(0,81,168,1) 0%, rgba(0,118,248,1) 100%);
                background: linear-gradient(14deg, rgba(0,81,168,1) 0%, rgba(0,118,248,1) 100%);
                filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#0051a8",endColorstr="#0076f8",GradientType=1);                
            }

            .${this.options.prefix}sdk-version{
                position: absolute;
                right: 0px;
                bottom: 5px;
                font-size: 8px;
                padding-top: 6px;
                padding-right: 6px;
                color: #49a1ff;
            }

            .${this.options.prefix}splash-container {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                position: absolute;
                top: 0;
                left:0;
                width: 100%;
                height: 100%;
            }

            .${this.options.prefix}splash-container .mascot {
                position: relative;
                width: 40%;
                height: 250px;
                border-radius: 20px;
                overflow: hidden;
                background-image: url(${mascot});
                background-position: bottom;
                background-size: contain;
                background-repeat: no-repeat;
                bottom: 0;
                left: 0;
                position: absolute;
            }

            .${this.options.prefix}splash-top {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                flex: 1;
                align-self: center;
                justify-content: center;
            }

            .${this.options.prefix}splash-bottom {
              display: flex;
              flex-flow: column;
              box-sizing: border-box;
              align-self: center;
              justify-content: center;
              width: 100%;
              padding-left:6px;
              padding-right:6px;
              padding-bottom:6px;
            }

            .${this.options.prefix}splash-top > div {
                text-align: center;
            }

            .${this.options.prefix}splash-top > div > button {
                margin: auto;
                padding: 8px;
                border-radius: 30px;
                border: 0;
                background-color: #59B21F;
                width: 210px;
                height: 48px;
                box-shadow: 0px 5px 0 #3E8E0D;
                position: relative;
                overflow: hidden;
                outline: none;
                cursor: pointer;
            }

            .${this.options.prefix}splash-top > div > button .text {
                color: white;
                text-transform: uppercase;
                font-family: 'Oswald', sans-serif;
                font-size: 17px;
                position: absolute;
                z-index: 1;
                text-align: center;
                position: absolute;
                z-index: 1;
                left: 0;
                top: 12px;
                width: 100%;
            }

            .${this.options.prefix}splash-top > div > button.walkthrough {
                background-color: #EA2E40;
                box-shadow: 0px 5px 0 #AD0B1A;
                margin-top: 15px;
                padding-left: 45px;
                height: 40px;
            }

            .${this.options.prefix}splash-top > div > button.walkthrough .text{
                top: 8px;
            }
            
            .${this.options.prefix}splash-top > div > button.walkthrough .icon {
                width: 34px;
                height: 34px;
                top: 3px;
                left: 20px;
                z-index: 9;
                position: absolute;
            }
            
            .${this.options.prefix}splash-top > div > button.walkthrough .icon svg {
                width: 100%;
                height: 100%;
            }

            .${this.options.prefix}splash-top > div > button.walkthrough .text {
                text-indent: 33px;
                text-transform: capitalize;
            }
            
            .bubbles {
                position: absolute;
                width: 100%;
                height: 100%;
                left: 0;
                top: 0;
            }

            .green-bubbles .bubble:before,
            .green-bubbles .bubble:after {
                position: absolute;
                background: #449C0C;
                content: " ";
                border-radius: 50%;
                display: block;
            }

            .green-bubbles .left {
                width: 1px;
                height: 1px;
                position: absolute;
                display: block;
            }

            .green-bubbles .left:before {
                width: 30px;
                height: 30px;
                left: 0px;
                top: -17px;
            }

            .green-bubbles .left:after {
                position: absolute;
                width: 50px;
                height: 50px;
                background: #449C0C;
                content: " ";
                left: 10px;
                top: 34px;
                border-radius: 50%;
            }

            .green-bubbles .right:after {
                position: absolute;
                width: 56px;
                right: 0px;
                top: 17px;
                height: 55px;
                background: #449C0C;
                content: " ";
                border-radius: 50%;
            }

            .red-bubbles .bubble:before,
            .red-bubbles .bubble:after {
                position: absolute;
                background: #FF4859;
                content: " ";
                border-radius: 50%;
            }

            .red-bubbles .left {
                width: 1px;
                height: 1px;
                display: block;
                position: absolute;
            }

            .red-bubbles .left:before {
                width: 30px;
                height: 30px;
                left: -10px;
                top: -10px;
            }

            .red-bubbles .left:after {
                width: 20px;
                height: 20px;
                left: 60px;
                top: 37px;
            }

            .red-bubbles .right:after {
                width: 36px;
                height: 50px;
                right: 0px;
                top: -33px;
            }

            
            
            .${this.options.prefix}splash-top > div {
                display: flex;
                flex-direction: column;
            }

            .${this.options.prefix}splash-top > div > button:hover {
                background: #3E8E0C;
                box-shadow: 0px 5px 0 #347909;
            }

            .${this.options.prefix}splash-top > div > button:active {
                background: #337b06;
                box-shadow: 0px 5px 0 #2b7100;
            }

            .${this.options.prefix}splash-top > div > button:hover .green-bubbles .left:after,
            .${this.options.prefix}splash-top > div > button:hover .green-bubbles .left:before,
            .${this.options.prefix}splash-top > div > button:hover .green-bubbles .right:after {
                background: #52b513;
            }

            .${this.options.prefix}splash-top > div > button.walkthrough:hover {
                background: #c7192a;
                box-shadow: 0px 5px 0 #af1623;
            }

            .${this.options.prefix}splash-top > div > button.walkthrough:active {
                background: #ad0d1d;
                box-shadow: 0px 5px 0 #980e1a;
            }

            .${this.options.prefix}splash-top > div > button.walkthrough:hover .red-bubbles .left:after,
            .${this.options.prefix}splash-top > div > button.walkthrough:hover .red-bubbles .left:before,
            .${this.options.prefix}splash-top > div > button.walkthrough:hover .red-bubbles .right:after {
                background: #fb5b6a;
            }

              .${this.options.prefix}splash-top > div > div.game-image {
                position: relative;
                width: 120px;
                height: 120px;
                margin: auto auto 20px;
                border-radius: 20px;
                overflow: hidden;
                background-image: url(${thumbnail});
                background-position: center;
                background-size: cover;
            }

            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent {
                box-sizing: border-box;
                width: 100%;
                color: #3991ef;
                text-align: justify;
                position: absolute;
                font-size: 12px;
                font-family: Arial;
                font-weight: normal;
                background: rgba(0, 56, 111, 0.78);
                line-height: 150%;
                padding: 10px 30px 10px;
                left: 0;
                bottom: 0;
            }
            .${this.options.prefix}splash-top > .game > .${this.options.prefix}splash-title {
                box-sizing: border-box;
                width: 100%;
                color: #fff;
                text-align: justify;
                font-weight: normal;
                text-align: center;
                line-height: 150%;
                font-family: 'Oswald', sans-serif;
                font-size: 20px;
                text-align: center;
                padding-bottom: 20px;
                cursor: default;
                text-transform: uppercase;
            }

            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent a {
                color: #60bdea !important;
            }

            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent a:hover,
            .${this.options.prefix}splash-bottom > .${this.options.prefix}splash-consent a:active {
                color: #9cdfff !important;
            }
            
            .${this.options.prefix}loader,
            .${this.options.prefix}loader:after {
              border-radius: 50%;
              width: 1.5em;
              height: 1.5em;
            }

            .${this.options.prefix}loader {
              margin: 0px auto;
              font-size: 10px;
              position: relative;
              text-indent: -9999em;
              border-top: 1.1em solid rgba(255, 255, 255, 0.2);
              border-right: 1.1em solid rgba(255, 255, 255, 0.2);
              border-bottom: 1.1em solid rgba(255, 255, 255, 0.2);
              border-left: 1.1em solid #ffffff;
              -webkit-transform: translateZ(0);
              -ms-transform: translateZ(0);
              transform: translateZ(0);
              -webkit-animation: ${this.options.prefix}load8 1.1s infinite linear;
              animation: ${this.options.prefix}load8 1.1s infinite linear;
              display:none;
            }
            @-webkit-keyframes ${this.options.prefix}load8 {
              0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
              }
              100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
              }
            }
            @keyframes ${this.options.prefix}load8 {
              0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
              }
              100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
              }
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

    const lifebuoy = `
    <?xml version="1.0" encoding="utf-8"?>
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 41 41" style="enable-background:new 0 0 41 41;" xml:space="preserve">
            <g>
                <rect x="-0.2" y="0.3" style="opacity:0;fill:#FFFFFF;" width="41" height="41"/>
                <g>
		            <g id="Group_7" transform="translate(0.527 0.527)">
                        <path id="Path_2724" style="fill:#FF7680;" d="M35.8,16.1c-1.5-5.8-6-10.3-11.8-11.8h-8.3c-5.8,1.5-10.3,6-11.8,11.8v8.3
                            c1.5,5.8,6,10.3,11.8,11.8H24c5.8-1.5,10.3-6,11.8-11.8V16.1z M19.8,31.8l-3.4-2.5c-2.6-1-4.6-3-5.6-5.6l-2.6-3.4l2.6-3.4
                            c1-2.6,3-4.6,5.6-5.6l3.4-2.6l3.4,2.6c2.6,1,4.6,3,5.6,5.6l2.6,3.4l-2.6,3.4c-1,2.6-3,4.7-5.6,5.6L19.8,31.8z"/>
                    </g>
                    <path id="Path_2725" style="fill:#F44854;" d="M36.3,25c-1.5,5.8-6,10.3-11.8,11.8h-2c8.8-2.3,14.1-11.2,11.8-20.1
                        c-1.5-5.8-6-10.3-11.8-11.8h2c5.8,1.5,10.3,6,11.8,11.8L36.3,25z"/>
                    <g id="Group_8" transform="translate(12.308 0)">
                        <path id="Path_2726" style="fill:#EEF7FF;" d="M12.2,4.8l-0.1,0.6l-0.7,6.3c-2.2-0.8-4.6-0.8-6.7,0L3.9,4.8c1-0.3,2-0.4,3.1-0.5
                            c0.4,0,0.7,0,1.1,0C9.4,4.3,10.8,4.5,12.2,4.8L12.2,4.8z"/>
                    </g>
                    <g id="Group_9" transform="translate(12.308 25.469)">
                        <path id="Path_2727" style="fill:#EEF7FF;" d="M12.2,11.3c-1.4,0.4-2.8,0.5-4.2,0.5c-0.4,0-0.7,0-1.1,0c-1-0.1-2.1-0.2-3.1-0.5
                            l0.8-6.9c2.2,0.8,4.6,0.8,6.7,0l0.7,6.3L12.2,11.3z"/>
                    </g>
                    <g id="Group_10" transform="translate(25.469 12.308)">
                        <path id="Path_2728" style="fill:#EEF7FF;" d="M11.3,8.5c0,1.4-0.2,2.8-0.5,4.2l-1.9-0.2l-5.1-0.6c0.8-2.2,0.8-4.6,0-6.7l5.1-0.6
                            l1.9-0.2C11.2,5.7,11.3,7.1,11.3,8.5z"/>
                    </g>
                    <g id="Group_11" transform="translate(0 12.308)">
                        <path id="Path_2729" style="fill:#EEF7FF;" d="M10.7,8.5c0,1.2,0.2,2.3,0.6,3.4l-6.9,0.8c-0.7-2.7-0.7-5.6,0-8.3l6.9,0.8
                            C10.9,6.2,10.7,7.3,10.7,8.5z"/>
                    </g>
                    <g id="Group_12" transform="translate(15.403 0)">
                        <path id="Path_2730" style="fill:#D8E5EF;" d="M9,5.5c-1.6-0.6-3.4-1-5.2-1.1c0.4,0,0.7,0,1.1,0c1.4,0,2.8,0.2,4.2,0.5L9,5.5z"/>
                        <path id="Path_2731" style="fill:#D8E5EF;" d="M9,36.1l0.1,0.6c-1.4,0.4-2.8,0.5-4.2,0.5c-0.4,0-0.7,0-1.1,0
                            C5.6,37.1,7.4,36.8,9,36.1z"/>
                        <path id="Path_2732" style="fill:#D8E5EF;" d="M21.4,20.8c0,1.4-0.2,2.8-0.5,4.2L19,24.7c0.6-2.6,0.6-5.3,0-7.9l1.9-0.2
                            C21.2,18,21.4,19.4,21.4,20.8z"/>
                    </g>
                </g>
            </g>
        </svg>`;

    html = `<style>
            @import url('https://fonts.googleapis.com/css2?family=Oswald&display=swap');
            </style>
                <div class="${this.options.prefix}splash-background-container">
                  <div class="${this.options.prefix}sdk-version">${this.options.version}</div>
                  <div class="${this.options.prefix}splash-container">
                    <div id="categoryMascot" class="mascot"></div>
                      <div class="${this.options.prefix}splash-top">
                          <div class="game">
                            <div class="${this.options.prefix}splash-title">${gameData.title}</div>
                            <div class="game-image"></div>
                            <button id="${this.options.prefix}splash-button">
                                    <span class="text">PLAY NOW</span>
                                    <span class="bubbles green-bubbles">
                                        <i class="left bubble"></i>
                                        <i class="right bubble"></i>
                                    </span>
                                </button>
                                <button class="walkthrough" id="${this.options.prefix}walkthrough-button">
                                    <span class="icon">${lifebuoy}</span>
                                    <span class="text">Watch Walkthrough</span>
                                    <span class="bubbles red-bubbles">
                                        <i class="left bubble"></i>
                                        <i class="right bubble"></i>
                                    </span>
                                </button>

                            <div class="${this.options.prefix}loader">Loading...</div>
                          </div>
                      </div>
                        <div class="${this.options.prefix}splash-bottom">
                            <div class="${this.options.prefix}splash-consent" style=${consentStyle}>
                            We may show personalized ads provided by our partners, and our 
                            services can not be used by children under 16 years old without the 
                            consent of their legal guardian. By clicking "PLAY", you consent 
                            to transmit your data to our partners for advertising purposes and 
                            declare that you are 16 years old or have the permission of your 
                            legal guardian. You can review our terms
                            <a href="https://azerion.com/business/privacy.html" target="_blank">here</a>.
                            </div>
                        </div>
                     
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
}

export default Rocket;