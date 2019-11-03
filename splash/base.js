import { EventEmitter } from "events";

class Base extends EventEmitter {
  constructor(options, gameData) {
    super();
    this.options = options;
    this.gameData = gameData;
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
    
  getRoot() {
    return this._root;
  }  
}

export default Base;
