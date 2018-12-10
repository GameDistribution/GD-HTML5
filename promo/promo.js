import {extendDefaults} from '../src/modules/common';

let instance = null;

/**
 * Promo
 */
class Promo {
    /**
     * Constructor of SDK Promo.
     * @param {Object} options
     * @return {*}
     */
    constructor(options) {
        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        // Set a version banner within the developer console.
        const banner = console.log(
            '%c %c %c GameDistribution.com HTML5 SDK Promo %c %c %c',
            'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #ffffff');
        /* eslint-disable */
        console.log.apply(console, banner);
        /* eslint-enable */

        this.container = null;
        this.content = null;

        // Set some defaults. We replace them with real given
        // values further down.
        const defaults = {
            thumbnail: 'https://img.gamedistribution.com/925e5d07858a4cd2a5b49a2fc23e2cb7.jpg',
            url: 'https://gamedistribution.com/',
            buttonText: 'New game!',
            labelText: 'New',
            prefix: 'gdsdk-promotion__',
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

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
            position: absolute;
            z-index: 999;
            top: 25px;
            right: 25px;
            width: 100px;
            height: 100px;

            opacity: 0;
            transform: scale(0) translate(0, 0);
            will-change: transform;
            transition: transform .2s cubic-bezier(.25, .75, .5, 1.25),
            opacity .1s cubic-bezier(.25, .75, .5, 1.25);

            font-family: "Squada One", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
            font-size: 10px;
            text-align: center;
            letter-spacing: 1px;
        }

        .${this.options.prefix}:active .${this.options.prefix}content {
            box-shadow: 0 10px 20px rgba(0, 0, 0, .19), 0 6px 6px rgba(0, 0, 0, .13);
        }

        .${this.options.prefix}:hover .${this.options.prefix}cta {
            background-color: #46a2b1;
            border-bottom: 2px solid #165d7b;
        }

        .${this.options.prefix}big.${this.options.prefix}:hover .${this.options.prefix}cta {
            border-bottom: 4px solid #165d7b;
        }

        .${this.options.prefix}:active .${this.options.prefix}cta {
            background-color: #ff8c1d;
            border-bottom: 2px solid #fd901b;
        }

        .${this.options.prefix}big.${this.options.prefix}:active .${this.options.prefix}cta {
            border-bottom: 4px solid #fd901b;
        }

        .${this.options.prefix}big {
            width: 230px; 
            height: 230px;
            top: 50%;
            left: 50%;
            font-size: 20px;
            transform: scale(1) translate(-50%, 0);
            transition: transform .2s linear, opacity .1s linear;
        }

        .${this.options.prefix}content {
            cursor: pointer;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: #fff;
            padding: 5px;
            border-radius: 12px;
            border-bottom: 3px solid #bcc0bf;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
            text-decoration: none;
            transition: box-shadow .2s cubic-bezier(.25, .75, .5, 1.25);
        }

        .${this.options.prefix}big .${this.options.prefix}content {
            padding: 12px;
            border-radius: 22px;
            border-bottom: 6px solid #bcc0bf;
        }

        .${this.options.prefix}close {
            position: absolute;
            top: -12px;
            right: -12px;
            width: 25px;
            height: 25px;
            border: 0;
            border-radius: 100%;
            color: #fff;
            background-color: #5d3a8a;
            cursor: pointer;
            font-weight: bold;
        }

        .${this.options.prefix}close:focus {
            outline: 0;
        }

        .${this.options.prefix}close:hover {
            background-color: #fb0000;
        }

        .${this.options.prefix}close:active {
            background-color: #fe3232;
        }

        .${this.options.prefix}thumbnail {
            flex: 1;
            background-image: url('${this.options.thumbnail}');
            background-position: center center;
            background-size: cover;
            background-color: #ddd;
            width: 100%;
            height: auto;
            border-radius: 8px 8px 1px 1px;
            box-shadow: inset 0 5px 0 rgba(0, 0, 0, 0.3);
        }

        .${this.options.prefix}big .${this.options.prefix}thumbnail {
            border-radius: 15px 15px 1px 1px;
            box-shadow: inset 0 15px 0 rgba(0, 0, 0, 0.3);
        }

        .${this.options.prefix}cta {
            height: 20px;
            line-height: 20px;
            margin-top: 3px;
            white-space: nowrap;
            text-overflow: clip;
            background-color: #fd901b;
            border-bottom: 2px solid #cb2f19;
            text-transform: uppercase;
            border-radius: 1px 1px 8px 8px;
            color: #fff;
        }

        .${this.options.prefix}big .${this.options.prefix}cta {
            height: 40px;
            line-height: 42px;
            margin-top: 10px;
            border-bottom: 4px solid #cb2f19;
            border-radius: 1px 1px 15px 15px;
        }

        .${this.options.prefix}label {
            position: absolute;
            left: 2px;
            top: 5px;
            height: 20px;
            width: 25px;
            line-height: 21px;
            white-space: nowrap;
            text-overflow: clip;
            background-color: #ef265c;
            color: #fff;
            transform: rotate(-45deg);
            border-radius: 3px;
            text-transform: uppercase;
        }

        .${this.options.prefix}big .${this.options.prefix}label {
            left: 2px;
            top: 17px;
            height: 40px;
            width: 70px;
            line-height: 40px;
        }

        .${this.options.prefix}label:before {
            content: '';
            display: block;
            position: absolute;
            top: 0;
            left: -19px;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 0 20px 20px;
            border-color: transparent transparent #ef265c transparent;
        }

        .${this.options.prefix}big .${this.options.prefix}label:before {
            left: -39px;
            border-width: 0 0 40px 40px;
        }

        .${this.options.prefix}label:after {
            content: '';
            display: block;
            position: absolute;
            top: 0;
            right: -19px;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 20px 0 0 20px;
            border-color: transparent transparent transparent #ef265c;
        }

        .${this.options.prefix}big .${this.options.prefix}label:after {
            right: -39px;
            border-width: 40px 0 0 40px;
        }

        @keyframes ${this.options.prefix}shake {
            0% {
                transform: scale(1)
            }

            10%, 20% {
                transform: scale(.9) rotate(-4deg)
            }

            30%, 50%, 70% {
                transform: scale(1.1) rotate(4deg)
            }

            40%, 60% {
                transform: scale(1.1) rotate(-4deg)
            }

            80%, to {
                transform: scale(1) rotate(0)
            }
        }
    `;
        /* eslint-enable */

        const html = `
            <button class="${this.options.prefix}close">
                X
            </button>
            <div class="${this.options.prefix}label">
                ${this.options.labelText}
            </div>
            <div class="${this.options.prefix}content">
                <div class="${this.options.prefix}thumbnail"></div>
                <div class="${this.options.prefix}cta">
                    ${this.options.buttonText}
                </div>
            </div>
        `;

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
        const body = document.body || document.getElementsByTagName('body')[0];
        body.insertBefore(this.container, body.firstChild);

        this.content = this.container.getElementsByClassName(`${this.options.prefix}content`)[0];
        this.content.addEventListener('click', () => {
            this.hideSmall(() => {
                this.showBig();
            });
        });

        const closeButton = this.container.getElementsByClassName(`${this.options.prefix}close`)[0];
        closeButton.addEventListener('click', () => {
            this.hideSmall();
        });

        setTimeout(() => {
            this.container.style.transform = 'scale(1) translate(0, 0)';
            this.container.style.opacity = '1';
            setTimeout(() => {
                this.container.style.animation =
                    `${this.options.prefix}shake 0.5s cubic-bezier(.25,.75,.5,1.25) 1`;
            }, 350);
        }, 2000);
    }

    /**
     * hideSmall
     * Hide the small thumbnail badge.
     * @param {Function} callback
     */
    hideSmall(callback) {
        this.container.style.transform = 'scale(1) translate(-50%, 0)';
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.container.style.display = 'none';
            if (typeof callback === 'function') {
                callback();
            }
        }, 250);
    }

    /**
     * showBig
     * Show the big thumbnail badge.
     */
    showBig() {
        this.container.classList.add(`${this.options.prefix}big`);
        this.container.style.display = 'block';
        this.container.style.transform = 'scale(1) translate(-50%, -50%)';
        this.container.style.opacity = '1';
        this.container.style.animation = 'none';
        this.content.addEventListener('click', () => {
            document.location.href = this.options.url;
            this.container.style.transform = 'scale(1) translate(-50%, 0)';
            this.container.style.opacity = '0';
            setTimeout(() => {
                this.container.style.display = 'none';
            }, 250);
        });
    }
}

new Promo(window['GD_PROMO_OPTIONS']);
