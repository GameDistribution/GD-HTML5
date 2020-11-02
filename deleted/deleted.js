let instance = null;

/**
 * Promo
 */
class Deleted {
    /**
     * Constructor of SDK Deleted.
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
            '%c %c %c This game was deleted, please remove it in your website... ',
            'background: #9854d8',
            'background: #6c2ca7', 'color: #fff; background: #450f78;',
            'background: #6c2ca7', 'background: #9854d8',
            'background: #c4161e; color: #fff;');
        /* eslint-disable */
        console.log.apply(console, banner);

        this.options = {
            prefix: 'gdsdk-deleted__',
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
            .${this.options.prefix} h1 {
                color: #fff;
                text-align: center;
                text-transform: uppercase;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                cursor: pointer;
                font-size: 18px;
            }
        `;

        const html = `
            <h1>This game is offline/ inaccessible on this website</h1>
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
        this.container.addEventListener('click', () => {
            window.open(this.options.url, '_blank');
        });
        const body = document.body || document.getElementsByTagName('body')[0];
        body.insertBefore(this.container, body.firstChild);
    }
}

new Deleted();
