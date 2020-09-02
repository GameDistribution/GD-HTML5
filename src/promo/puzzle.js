import Base from "./base";
import { Layers } from "@bygd/gd-sdk-era/dist/default";

export default class Puzzle extends Base {
  constructor(options, gameData) {
    super(options, gameData);
    this._init();
  }

  _init() {

    this._slotId = this.gameData.promo.puzzle.slotId || "gd__preroll_banner";

    // css
    const css = this._css();
    this._insertCss(css);

    // html
    const html = this._html();
    const { container, extContainer } = this._insertHtml(html);
    this._initDisplayMode(container);
    this._initSkipButton(container);

    this._root = container;
    this._container = container;
    this._ext_container = extContainer;

    // Promo container
    this._promoContainer = document.querySelector(`.${this.options.prefix}promo-container`);
    // Promo controls container
    this._promoControlsContainer = document.querySelector(`.${this.options.prefix}promo-controls-container`);

    // this._promoContainer.style['background-color'] = 'black';
    // this._promoControlsContainer.style['visibility'] = 'visible';

    // register events
    this._registerEvents();
  }
  getSlotId() {
    return this._slotId;
  }
  getSlotContainerId() {
    return this._slotId + "_container";
  }
  _css() {
    const css = `
        body {
            position: inherit;
        }

        .${this.options.prefix}promo-container {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: stretch;
          position: absolute;
          width: 100%;
          height: 100%;
          top:0;
          left:0;
        }

        .${this.options.prefix}promo-display-container {
          flex-grow:1;
          position:relative;
        }
        
        .${this.options.prefix}promo-controls-container {
          padding: 4px 0px;
          text-align:right;
          visibility:hidden;
        }

        .${this.options.prefix}promo-display-container>div {
          box-sizing:border-box;
          width:0;
          height:0;
          min-height:100%;
          min-width:100%;
          max-width:100%;
          max-height:100%;
          overflow:hidden;
          position:absolute;
        }

        #${this.options.prefix}promo-message{
          box-sizing:border-box;
          padding: 4px 16px;
          margin: auto;
          color: white;
          color: rgba(255,255,255,0.8);
          font-family: Helvetica, Arial, sans-serif;
          font-size: 14px;
          cursor: pointer;
          min-width: 150px;
          float:left;
          text-align:left;
          margin-bottom:8px;
        }

        #${this.options.prefix}promo-button{
          box-sizing:border-box;
          padding: 4px 16px;
          margin: auto;
          border: 1px solid rgba(255,255,255,0.5);
          color: white;
          color: rgba(255,255,255,0.8);
          font-family: Helvetica, Arial, sans-serif;
          font-size: 18px;
          cursor: pointer;
          min-width: 150px;
          margin-bottom:8px;
          background: black;
        }

        #${this.options.prefix}promo-button:hover {
            background: linear-gradient(0deg, #1C8464, #21A179);
        }

        #${this.options.prefix}promo-button:active {
            background: linear-gradient(0deg, #1C8464, #15674E);
        }

        #${this.options.prefix}promo-button:disabled,#${this.options.prefix}promo-button[disabled]{
          background: black;
        }
    `;

    return css;
  }

  _html() {
    let html = "";
    html = `
        <div class="${this.options.prefix}promo-container">
          <div class="${this.options.prefix}promo-display-container">
            <div id="${this.getSlotContainerId()}"></div>
          </div>
          <div class="${this.options.prefix}promo-controls-container">
            <button id="${this.options.prefix}promo-button" disabled></button>
            <span id="${this.options.prefix}promo-message"></span>
          </div>
        </div>
        `;
    return html;
  }

  _insertHtml(html) {
    // Create our container and add the markup.
    const container = document.createElement("div");
    container.innerHTML = html;
    container.id = `${this.options.prefix}promo`;
    container.style['z-index'] = Layers.PromoContainer.zIndex;
    container.style['position'] = "fixed";
    container.style['width'] = "100%";
    container.style['height'] = "100%";
    container.style['top'] = "0";
    container.style['left'] = "0";
    // container.style['visibility'] = 'hidden';

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

  _initDisplayMode(container) {
    // let iframe = container.querySelector("iframe");
    // set frame attributes
    for (let key in this.promo.attrs) {
      let value = this.promo.attrs[key];
      value = this._replaceMacros(value);
      //iframe.setAttribute(key, value);
    }
  }

  _replaceMacros(value) {
    let transformedValue = value;
    // MACROS
    for (let macroKey in this.macros) {
      let macroValue = this.macros[macroKey];
      let replaceString = "{{" + macroKey + "}}";
      replaceString = this._escapeRegExp(replaceString);
      transformedValue = transformedValue.replace(new RegExp(replaceString, "g"), macroValue);
    }
    // DICT
    for (let dictKey in this.dict) {
      let dictValue = this.dict[dictKey];
      let replaceString = "{{DICT[" + dictKey + "]}}";
      replaceString = this._escapeRegExp(replaceString);
      transformedValue = transformedValue.replace(new RegExp(replaceString, "g"), dictValue);
    }
    return transformedValue;
  }

  _initSkipButton(container) {

    this.skipButton = document.getElementById(
      `${this.options.prefix}promo-button`
    );

    this.textBeforeAdCloseLabel = document.getElementById(
      `${this.options.prefix}promo-message`
    );

    let textBeforeSkip = this.promo.textBeforeSkip || "You can skip this ad in {{0}} secs";

    let textOnSkip = this.promo.textOnSkip || "SKIP";

    let skipAfter = this.promo.skipAfter || 15;

    let textBeforeAdClose = this.promo.textBeforeAdClose || "Ad will be closed in {{0}} secs";

    let adDuration = this.promo.adDuration || 30;

    skipAfter = skipAfter > adDuration ? adDuration : skipAfter;

    this.skipButton.innerText = textBeforeSkip.replace("{{0}}", skipAfter);

    let started = Date.now();

    let updateTimerForTextOnSkip = setInterval(() => {
      let elapsed = Math.floor((Date.now() - started) / 1000);
      let remaining = skipAfter - elapsed;
      this.skipButton.innerText = textBeforeSkip.replace("{{0}}", remaining);
    }, 250);

    setTimeout(() => {
      clearInterval(updateTimerForTextOnSkip);
      this.skipButton.innerText = this._replaceMacros(textOnSkip);
      this.skipButton.removeAttribute("disabled");

      let updateTimerForTextBeforeAdClose = setInterval(() => {
        let elapsed = Math.floor((Date.now() - started) / 1000);
        let remaining = adDuration - elapsed;
        // this.skipButton.innerText = textBeforeSkip.replace("{{0}}", remaining);
        this.textBeforeAdCloseLabel.innerText = textBeforeAdClose.replace("{{0}}", remaining);
      }, 250);

      setTimeout(() => {
        clearInterval(updateTimerForTextBeforeAdClose);
        this.emit('adCompleted');
      }, (adDuration - skipAfter) * 1000);

    }, skipAfter * 1000);
  }

  _escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  show() {
    this._promoContainer.style['background-color'] = 'black';
    this._promoControlsContainer.style['visibility'] = 'visible';
  }
}