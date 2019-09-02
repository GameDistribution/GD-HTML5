/**
 * createLoader
 * Create splash screen for developers who can't add the advertisement
 * request behind a user action.
 * @param {Object} gameData
 * @param {Boolean} redirectUrl
 * @param {Object} options
 * @private
 */
function createLoader(gameData, redirectUrl, options) {
    let thumbnail = gameData.assets.find(asset => asset.hasOwnProperty('name') && asset.width === 512 && asset.height === 512);
    if (thumbnail) {
        thumbnail = `https://img.gamedistribution.com/${thumbnail.name}`;
    } else if (gameData.assets[0].hasOwnProperty('name')) {
        thumbnail = `https://img.gamedistribution.com/${gameData.assets[0].name}`;
    } else {
        thumbnail = `https://img.gamedistribution.com/logo.svg`;
    }

    /* eslint-disable */
    const css = `
            body {
                position: inherit;
            }
            .${options.prefix}splash-background-container {
                box-sizing: border-box;
                position: absolute;
                z-index: 664;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #000;
                overflow: hidden;
            }
            .${options.prefix}splash-background-image {
                box-sizing: border-box;
                position: absolute;
                top: -25%;
                left: -25%;
                width: 150%;
                height: 150%;
                background-image: url(${thumbnail});
                background-size: cover;
                filter: blur(50px) brightness(1.5);
            }
            .${options.prefix}splash-container {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                position: absolute;
                z-index: 665;
                bottom: 0;
                width: 100%;
                height: 100%;
            }
            .${options.prefix}splash-top {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                flex: 1;
                align-self: center;
                justify-content: center;
                padding: 20px;
            }
            .${options.prefix}splash-top > div {
                text-align: center;
            }
            .${options.prefix}splash-top > div > button {
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
                font-weight: bold;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .${options.prefix}splash-top > div > button:hover {
                background: linear-gradient(0deg, #ffffff, #dddddd);
            }
            .${options.prefix}splash-top > div > button:active {
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                background: linear-gradient(0deg, #ffffff, #f5f5f5);
            }
            .${options.prefix}splash-top > div > div {
                position: relative;
                width: 150px;
                height: 150px;
                margin: auto auto 20px;
                border-radius: 100%;
                overflow: hidden;
                border: 3px solid rgba(255, 255, 255, 1);
                background-color: #000;
                box-shadow: inset 0 5px 5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
                background-image: url(${thumbnail});
                background-position: center;
                background-size: cover;
            }
            .${options.prefix}splash-top > div > div > img {
                width: 100%;
                height: 100%;
            }
            .${options.prefix}splash-bottom {
                display: flex;
                flex-flow: column;
                box-sizing: border-box;
                align-self: center;
                justify-content: center;
                width: 100%;
                padding: 0 0 20px;
            }
            .${options.prefix}splash-bottom > .${options.prefix}splash-consent,
            .${options.prefix}splash-bottom > .${options.prefix}splash-title {
                box-sizing: border-box;
                width: 100%;
                padding: 20px;
                background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.5) 50%, transparent);
                color: #fff;
                text-align: left;
                font-size: 12px;
                font-family: Arial;
                font-weight: normal;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.7);
                line-height: 150%;
            }
            .${options.prefix}splash-bottom > .${options.prefix}splash-title {
                padding: 15px 0;
                text-align: center;
                font-size: 18px;
                font-family: Helvetica, Arial, sans-serif;
                font-weight: bold;
                line-height: 100%;
            }
            .${options.prefix}splash-bottom > .${options.prefix}splash-consent a {
                color: #fff;
            }
        `;
    /* eslint-enable */
    const head = document.head || document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);

    /* eslint-disable */
    let html = `
        <div class="${options.prefix}splash-background-container">
            <div class="${options.prefix}splash-background-image"></div>
        </div>
        <div class="${options.prefix}splash-container">
            <div class="${options.prefix}splash-top">
                <div>
                    <div></div>
                    <button id="${options.prefix}splash-button">Play Game</button>
                </div>   
            </div>
            <div class="${options.prefix}splash-bottom">
                <div class="${options.prefix}splash-title">${gameData.title}</div>
            </div>
        </div>`;
    /* eslint-enable */

    // Create our container and add the markup.
    const container = document.createElement('div');
    container.innerHTML = html;
    container.id = `${options.prefix}splash`;

    // Flash bridge SDK will give us a splash container id (splash).
    // If not; then we just set the splash to be full screen.
    const splashContainer = options.flashSettings.splashContainerId ? document.getElementById(options.flashSettings.splashContainerId) : null;
    if (splashContainer) {
        splashContainer.style.display = 'block';
        splashContainer.insertBefore(container, splashContainer.firstChild);
    } else {
        const body = document.body || document.getElementsByTagName('body')[0];
        body.insertBefore(container, body.firstChild);
    }

    const button = document.getElementById(`${options.prefix}splash-button`);
    button.addEventListener('click', () => {
        // Set consent cookie.
        document.location = redirectUrl;
    });

    // // Now pause the game.
    // this.onPauseGame('Pause the game and wait for a user gesture', 'success');

    // // Make sure the container is removed when an ad starts.
    // this.eventBus.subscribe('SDK_GAME_PAUSE', () => {
    //     if (container && container.parentNode) {
    //         container.parentNode.removeChild(container);
    //     } else if (container) {
    //         container.style.display = 'none';
    //     }
    //     if (splashContainer && splashContainer.parentNode) {
    //         splashContainer.parentNode.removeChild(splashContainer);
    //     } else if (splashContainer) {
    //         splashContainer.style.display = 'none';
    //     }
    // });

    // // Make sure the container is removed when the game is resumed.
    // this.eventBus.subscribe('SDK_GAME_START', () => {
    //     if (container && container.parentNode) {
    //         container.parentNode.removeChild(container);
    //     } else if (container) {
    //         container.style.display = 'none';
    //     }
    //     if (splashContainer && splashContainer.parentNode) {
    //         splashContainer.parentNode.removeChild(splashContainer);
    //     } else if (splashContainer) {
    //         splashContainer.style.display = 'none';
    //     }
    // });
}

export {createLoader};
