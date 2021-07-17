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
        const gameId = params.id || '49258a0e497c42b5b5d87887f24d27a6';
        const gameImg = params.img || 'https://img.gamedistribution.com/49258a0e497c42b5b5d87887f24d27a6-512x512.jpeg';
        const title = params.title || 'Jewel Burst';
        this.options = {
            url: `https://html5.gamedistribution.com/${gameId}`,
            prefix: 'gdsdk-blocked__',
            img: gameImg,
            title: title
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
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .${this.options.prefix} h1, 
            .${this.options.prefix} h2 {
                color: #fff;
                text-align: center;
                text-transform: uppercase;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
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
            .${this.options.prefix} .thumbnail {
                width: 150px;
                height: 150px;
                border-radius: 4px;
                background-position: center;
                background-size: cover!;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                background: url("${this.options.img}") 0% 0% / cover;
            }
            .${this.options.prefix} > .play {
                box-sizing: border-box;
                z-index: 1;
                border: 0;
                width: 150px;
                padding: 10px 22px;
                border-radius: 5px;
                border: 3px solid white;
                margin: 16px;
                background: linear-gradient(0deg, #dddddd, #ffffff);
                color: #222;
                text-transform: uppercase;
                text-shadow: 0 0 1px #fff;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                -webkit-appearance: button;
                -moz-appearance: button;
                appearance: button;
            
                text-decoration: none;
                color: initial;
                text-align: center;         
            }

            .${this.options.prefix} > .play:hover {
                background: linear-gradient(0deg, #ffffff, #dddddd);
            }
            .${this.options.prefix} > .play:active {
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                background: linear-gradient(0deg, #ffffff, #f5f5f5);
            }

            .${this.options.prefix} a[target="_blank"]::after {
                content: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg==);
                margin: 0 3px 0 5px;
            }
        `;

        // const html = `<h1>The game is blocked for this website.</h1>`;

        const html = `
            <h1>${this.options.title} is blocked for this website.</h1>
            <h2>If you want to play <b><span style='font-size:1.1em'>${this.options.title}</span></b>, 
                <a href="${this.options.url}" target="_blank">
                    click Play
                </a>
            </h2>
            <div style='display:flex;justify-content:center;'>
                <div class='thumbnail'></div>
            </div>
            <a href="${this.options.url}" target="_blank" class='play'>
                Play
            </a>
        `;
        // Add our styles.
        const head = document.head || document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
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
