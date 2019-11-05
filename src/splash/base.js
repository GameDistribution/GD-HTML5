import { EventEmitter } from "events";

class Base extends EventEmitter {
  constructor(options, gameData) {
    super();
    this.options = options;
    this.gameData = gameData;
  }

  getRoot() {
    return this._root;
  }

  _getThumbnail(options, gameData) {
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

    return thumbnail;
  }
  _registerEvents() {
    const playButton = document.getElementById(
      `${this.options.prefix}splash-button`
    );
    playButton.addEventListener("click", event => {
      this.emit("playClick", event);
    });

    const container = document.getElementById(`${this.options.prefix}splash`);
    container.addEventListener("click", event => {
      this.emit("containerClick", event);
    });
  }
  hide() {
    const container = this._container;
    const splashContainer = this._splashContainer;

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
  }

  _insertCss(css) {
    const head = document.head || document.getElementsByTagName("head")[0];
    const style = document.createElement("style");
    const existingStyle = document.head.querySelector(
      "style[data-gdsdk-style]"
    );
    if (existingStyle) existingStyle.remove();

    style.type = "text/css";
    style.setAttribute("data-gdsdk-style", true);

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
  }
  _getBackground(options, gameData) {
    if (options.background === "carbon") {
      return `
      background:
      linear-gradient(27deg, #151515 5px, transparent 5px) 0 5px,
      linear-gradient(207deg, #151515 5px, transparent 5px) 10px 0px,
      linear-gradient(27deg, #222 5px, transparent 5px) 0px 10px,
      linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px,
      linear-gradient(90deg, #1b1b1b 10px, transparent 10px),
      linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424);
    background-color: #131313;
    background-size: 20px 20px;        
      `;
    } else if (options.background === "rainbow") {
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
      background-color: #840b2a;      
      `;
    } else if (options.background === "linedpaper") {
      return `
      background-color: #fff;
      background-image:
      linear-gradient(90deg, transparent 79px, #abced4 79px, #abced4 81px, transparent 81px),
      linear-gradient(#eee .1em, transparent .1em);
      background-size: 100% 1.2em;     
      `;
    } else if (options.background === "cicadastripes") {
      return `
      background-color: #026873;
      background-image: linear-gradient(90deg, rgba(255,255,255,.07) 50%, transparent 50%),
      linear-gradient(90deg, rgba(255,255,255,.13) 50%, transparent 50%),
      linear-gradient(90deg, transparent 50%, rgba(255,255,255,.17) 50%),
      linear-gradient(90deg, transparent 50%, rgba(255,255,255,.19) 50%);
      background-size: 13px, 29px, 37px, 53px; 
      `;
    } // Carbon fibre
    else
      return `
     background:
     radial-gradient(black 15%, transparent 16%) 0 0,
     radial-gradient(black 15%, transparent 16%) 8px 8px,
     radial-gradient(rgba(255,255,255,.1) 15%, transparent 20%) 0 1px,
     radial-gradient(rgba(255,255,255,.1) 15%, transparent 20%) 8px 9px;
     background-color:#282828;
     background-size:16px 16px;     
     `;
  }

  _getConsentHTML() {
    return `
    We may show personalized ads provided by our partners, and our 
    services can not be used by children under 16 years old without the 
    consent of their legal guardian. By clicking "PLAY", you consent 
    to transmit your data to our partners for advertising purposes and 
    declare that you are 16 years old or have the permission of your 
    legal guardian. You can review our terms
    <a href="https://docs.google.com/document/d/e/2PACX-1vR0BAkCq-V-OkAJ3EBT4qW4sZ9k1ta9K9EAa32V9wlxOOgP-BrY9Nv-533A_zdN3yi7tYRjO1r5cLxS/pub" target="_blank">here</a>.
    `;
  }
}

export default Base;
