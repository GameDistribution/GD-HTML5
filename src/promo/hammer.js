import Base from "./base";

class Hammer extends Base {
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
    this._ext_container = extContainer;

    // register events
    this._registerEvents();
  }

  _css(options, gameData) {
    const css = `
        body {
            position: inherit;
        }
        .${this.options.prefix}promo-container {
            display: flex;
            flex-flow: column;
            box-sizing: border-box;
            position: absolute;
            z-index: 665;
            bottom: 0;
            width: 100%;
            height: 100%;
        }
    `;
    
    return css;
  }

  _html(options, gameData) {
    let html = "";
    html = `
        <div class="${this.options.prefix}promo-container">
            <button id="${this.options.prefix}promo-button">SKIP</button>
        </div>
        `;
    return html;
  }

  _insertHtml(html) {
    // Create our container and add the markup.
    const container = document.createElement("div");
    container.innerHTML = html;
    container.id = `${this.options.prefix}promo`;

    const extContainer = this.options.flashSettings.splashContainerId
      ? document.getElementById(this.options.flashSettings.splashContainerId)
      : null;
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

export default Hammer;
