import { EventEmitter } from "events";

class Base extends EventEmitter {
  constructor(options, gameData) {
    super();
    this.options = options;
    this.gameData = gameData;
  }

  _registerEvents() {
    const skipButton = document.getElementById(
      `${this.options.prefix}promo-button`
    );

    skipButton.addEventListener("click", event => {
      this.emit("playClick", event);
    });

    const container = document.getElementById(`${this.options.prefix}promo`);
    container.addEventListener("click", event => {
      this.emit("containerClick", event);
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

  hide() {
    if (this._container) this._container.remove();
  }

  getRoot() {
    return this._root;
  }
}

export default Base;
