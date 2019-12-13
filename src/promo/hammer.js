import Base from "./base";

class Hammer extends Base {
  constructor(options, gameData) {
    super(options, gameData);
    this._init();
  }

  _init() {
    // css
    const css = this._css();
    this._insertCss(css);

    // html
    const html = this._html();
    const { container, extContainer } = this._insertHtml(html);

    this._initIframeMode(container);
    this._initSkipButton(container);

    this._root = container;
    this._container = container;
    this._ext_container = extContainer;

    // // register events
    // this._registerEvents();
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
          background-color:black;
        }

        .${this.options.prefix}promo-iframe-container {
          flex-grow:1;
        }

        .${this.options.prefix}promo-controls-container {
          padding: 4px 0px;
          text-align:right;
        }

        .${this.options.prefix}promo-iframe-container>iframe {
          box-sizing:border-box;
          width:0;
          height:0;
          min-height:100%;
          min-width:100%;
          max-width:100%;
          max-height:100%;
        }

        #${this.options.prefix}promo-button{
          padding: 4px 16px;
          margin: auto;
          border-left: 1px solid rgba(255,255,255,0.5);
          border-top: 1px solid rgba(255,255,255,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.5);
          border-right: none;

          background: black;
          color: white;
          color: rgba(255,255,255,0.8);
          font-family: Helvetica, Arial, sans-serif;
          font-size: 14px;
          cursor: pointer;
          min-width: 150px;
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
          <div class="${this.options.prefix}promo-controls-container">
            <button id="${this.options.prefix}promo-button" disabled></button>
          </div>
          <div class="${this.options.prefix}promo-iframe-container">
            <iframe frameBorder="1"></iframe>
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

  _initIframeMode(container) {
    let iframe = container.querySelector("iframe");
    // set frame attributes
    for (let key in this.promo.attrs) {
      let value = this.promo.attrs[key];
      value = this._replaceMacros(key, value);
      iframe.setAttribute(key, value);
    }
  }

  _replaceMacros(key, value) {
    let transformedValue = value;
    for (let macroKey in this.macros) {
      let macroValue = this.macros[macroKey];
      let replaceString = "{{" + macroKey + "}}";
      transformedValue = transformedValue.replace(replaceString, macroValue);
    }
    return transformedValue;
  }

  _initSkipButton(container) {
    this.skipButton = document.getElementById(
      `${this.options.prefix}promo-button`
    );

    let skipText =
      this.promo.skipText || "You can skip this promo in {{0}} secs";

    let skipAfter = this.promo.skipAfter || 15;

    this.skipButton.innerText = skipText.replace("{{0}}", skipAfter);

    let started = Date.now();

    let updateTimer = setInterval(() => {
      let elapsed = Math.floor((Date.now() - started) / 1000);
      let remaining = skipAfter - elapsed;
      this.skipButton.innerText = skipText.replace("{{0}}", remaining);
    }, 1000);

    setTimeout(() => {
      clearInterval(updateTimer);
      this.skipButton.innerText = "SKIP";
      this.skipButton.removeAttribute("disabled");
      this._registerEvents();
    }, skipAfter * 1000);
  }
}

export default Hammer;
