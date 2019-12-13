import { EventEmitter } from "events";

class Base extends EventEmitter {
  constructor(options, gameData) {
    super();
    this.options = options;
    this.gameData = gameData;
    this.promo = gameData.loader.promo;
    this.macros = {
      GAME_ID: gameData.gameMd5,
      GAME_TITLE: gameData.title,
      URL: location.href,
      REFERRER_URL: document.referrer || location.href
    };
    let escaped = {};
    for (let key in this.macros) {
      let value = this.macros[key];
      escaped[key + "_ESC"] = encodeURIComponent(value);
      escaped[key + "_ESC_ESC"] = encodeURIComponent(encodeURIComponent(value));
    }
    this.macros = { ...this.macros, ...escaped };
  }
  _registerEvents() {
    this.skipButton.addEventListener("click", event => {
      this.emit("skipClick", event);
    });
  }

  _insertCss(css) {
    const head = document.head || document.getElementsByTagName("head")[0];
    const style = document.createElement("style");
    const existingStyle = document.head.querySelector(
      "style[data-gdsdk-promo-style]"
    );
    if (existingStyle) existingStyle.remove();

    style.type = "text/css";
    style.setAttribute("data-gdsdk-promo-style", true);

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
  }

  _getExtContainer() {
    if (!this.options.flashSettings.splashContainerId) return;
    return document.getElementById(
      this.options.flashSettings.splashContainerId
    );
  }

  hide() {
    if (this._container) this._container.remove();
  }

  getRoot() {
    return this._root;
  }
}

export default Base;
