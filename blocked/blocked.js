import { getQueryParams } from '@bygd/gd-sdk-era/dist/default';

let instance = null;

/**
 * Promo
 */
class Blocked {
    /**
     * Constructor of SDK Blocked.
     * @return {*}
     */
    constructor() {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        // Set a version banner within the developer console.
        const banner = console.log(
            '%c %c %c GameDistribution.com BLOCKED! %c %c %c Webmaster; please contact info@gamedistribution.com ',
            'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #c4161e; color: #fff;');
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        const params = getQueryParams();
        const domain = params.domain || 'gamedistribution.com';

        this.options = {
            // url: `https://agame.com/?utm_source=${domain}&utm_medium=sdk&utm_campaign=gd_blacklist_referrer`,
            prefix: 'gdsdk-blocked__',
        };

        this.container = null;

        this.start();
    }

    /**
     * start()
     * Starts the promo, which is usually called from an ad slot.
     */
    start() {
        /* eslint-disable */
        const css = `
            .${this.options.prefix} {
                box-sizing: border-box;
                position: fixed;
                z-index: 666;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                padding: 40px;
                overflow: hidden;
                background: linear-gradient(0deg, #333, #000);
            }
            .${this.options.prefix} h1, 
            .${this.options.prefix} h2 {
                color: #fff;
                text-align: center;
                text-transform: uppercase;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                cursor: pointer;
            }
            .${this.options.prefix} h1 {
                font-size: 18px;
            }
            .${this.options.prefix} h2 {
                font-size: 14px;
                font-weight: normal;
            }
            .${this.options.prefix} a {
                color: #fff;
            }
            .${this.options.prefix} > button {
                position: absolute;
                z-index: 1;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border: 0;
                margin: auto;
                padding: 10px 22px;
                border-radius: 5px;
                border: 3px solid white;
                background: linear-gradient(0deg, #dddddd, #ffffff);
                color: #222;
                text-transform: uppercase;
                text-shadow: 0 0 1px #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .${this.options.prefix} > button:hover {
                background: linear-gradient(0deg, #ffffff, #dddddd);
            }
            .${this.options.prefix} > button:active {
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                background: linear-gradient(0deg, #ffffff, #f5f5f5);
            }
            .${this.options.prefix} > button > div {
                position: absolute;
                z-index: 2;
                bottom: 120px;
                left: 40px;
            }
        `;

        const html = `<h1>The game is blocked for this website.</h1>`;

        // const html = `
        //     <h1>The game is blocked for this website.</h1>
        //     <h2>If you want to play this game, go to agame.com
        //         <a href="${this.options.url}" target="_blank">
        //             visit website
        //         </a>
        //     </h2>
        //     <button>
        //         Play Game
        //         <div>
        //             <div></div>
        //             <div></div>
        //         </div>
        //     </button>
        // `;

        // Add our styles.
        const head = document.head || document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        head.appendChild(style);

        // Add our fonts.
        const font = document.createElement('link');
        font.type = 'text/css';
        font.rel = 'stylesheet';
        font.href = 'https://fonts.googleapis.com/css?family=Squada+One';
        head.appendChild(font);

        // Add our markup.
        this.container = document.createElement('div');
        this.container.innerHTML = html;
        this.container.id = this.options.prefix;
        this.container.className = this.options.prefix;
        // this.container.addEventListener('click', () => {
        //     window.open(this.options.url, '_blank');
        // });
        const body = document.body || document.getElementsByTagName('body')[0];
        body.insertBefore(this.container, body.firstChild);
    }
}

new Blocked();
