'use strict';

import PackageJSON from '../package.json';
import VideoAd from './components/VideoAd';
import EventBus from './components/EventBus';
import ImplementationTest from './components/ImplementationTest';

import {getXMLData} from './modules/getXMLData';
import {extendDefaults} from './modules/extendDefaults';
import {dankLog} from './modules/dankLog';

let instance = null;

class API {

    constructor(options) {

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        // Set some defaults. We replace them with real given values further down.
        const defaults = {
            debug: true,
            gameId: '4f3d7d38d24b740c95da2b03dc3a2333',
            userId: '31D29405-8D37-4270-BF7C-8D99CCF0177F-s1',
            advertisementSettings: {},
            resumeGame: function() {
                // ...
            },
            pauseGame: function() {
                // ...
            },
            onInit: function(data) {
                // ...
            },
            onEvent: function(event) {
                // ...
            },
            onError: function(data) {
                // ...
            }
        };

        if (options) {
            this.options = extendDefaults(defaults, options);
        } else {
            this.options = defaults;
        }

        // Set a version banner within the developer console.
        const date = new Date();
        const versionInformation = {
            version: PackageJSON.version,
            date: date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear(),
            time: date.getHours() + ':' + date.getMinutes()
        };
        const banner = console.log('%c %c %c Gamedistribution.com HTML5 API | Version: ' + versionInformation.version + ' (' + versionInformation.date + ' ' + versionInformation.time + ') %c %c %c', 'background: #9854d8', 'background: #6c2ca7', 'color: #fff; background: #450f78;', 'background: #6c2ca7', 'background: #9854d8', 'background: #ffffff');
        console.log.apply(console, banner);

        // Setup all event listeners.
        this.eventBus = new EventBus();

        // API events
        this.eventBus.subscribe('API_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_DATA_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_START', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('API_GAME_PAUSE', (arg) => this._onEvent(arg));

        // IMA HTML5 SDK events
        this.eventBus.subscribe('AD_SDK_LOADER_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_MANAGER_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_REQUEST_ADS', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SDK_FINISHED', (arg) => this._onEvent(arg));

        // Ad events
        this.eventBus.subscribe('AD_CANCELED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame('Advertisement error, no worries, start / resume the game.', 'warning');
        });
        this.eventBus.subscribe('AD_ERROR', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_SAFETY_TIMER', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_BREAK_READY', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('AD_METADATA', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('ALL_ADS_COMPLETED', (arg) => {
            this._onEvent(arg);
            this.onResumeGame('Advertisement(s) are done. Start / resume the game.', 'success');
        });
        this.eventBus.subscribe('CLICK', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('COMPLETE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('CONTENT_PAUSE_REQUESTED', (arg) => {
            this._onEvent(arg);
            this.onPauseGame('New advertisements requested and loaded', 'success');
        });
        this.eventBus.subscribe('CONTENT_RESUME_REQUESTED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('DURATION_CHANGE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('FIRST_QUARTILE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('IMPRESSION', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('INTERACTION', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LINEAR_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('LOADED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('MIDPOINT', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('PAUSED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('RESUMED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPABLE_STATE_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('SKIPPED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('STARTED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('THIRD_QUARTILE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('USER_CLOSE', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_CHANGED', (arg) => this._onEvent(arg));
        this.eventBus.subscribe('VOLUME_MUTED', (arg) => this._onEvent(arg));

        // Get game data. If it fails we we use default data, so this should always resolve.
        // Todo: also noticed we have something like a mid roll timer in the old api, figure out what that was used for.
        let gameData = {
            id: 'b92a4170-7842-48bc-a2ff-a0c08bec7a50', // Todo: set proper default for id.
            affiliate: 'A-GAMEDIST',
            advertisements: true,
            preroll: true // Todo: what to do with preroll value from gameData?
        };
        // Todo: create a real url for requesting XML data.
        // this.bannerRequestURL = (_gd_.static.useSsl ? "https://" : "http://") + _gd_.static.serverId + ".bn.submityourgame.com/" + _gd_.static.gameId + ".xml?ver="+_gd_.version + "&url="+ _gd_.static.gdApi.href;
        const gameDataLocation = 'http://s1.bn.submityourgame.com/b92a4170784248bca2ffa0c08bec7a50.xml?ver=v501&url=http://html5.gamedistribution.com';
        const gameDataPromise = new Promise((resolve) => {
            // Todo: XML sucks, replace it some day with JSON at submityourgame.com.
            getXMLData(gameDataLocation).then((response) => {
                try {
                    const retrievedGameData = {
                        id: response.row[0].uid,
                        affiliate: response.row[0].aid,
                        advertisements: response.row[0].act === '1',
                        preroll: response.row[0].pre === '1'
                    };
                    gameData = extendDefaults(gameData, retrievedGameData);
                    dankLog('API_GAME_DATA_READY', gameData, 'success');
                    resolve(gameData);
                } catch (error) {
                    dankLog('API_GAME_DATA_READY', error, 'warning');
                    resolve(gameData);
                }
            });
        });

        // Start our advertisement instance.
        this.videoAdInstance = new VideoAd(this.options.advertisementSettings);
        this.videoAdInstance.start();
        const videoAdPromise = new Promise((resolve, reject) => {
            this.eventBus.subscribe('AD_SDK_MANAGER_READY', (arg) => resolve());
            this.eventBus.subscribe('AD_SDK_ERROR', (arg) => reject());
        });

        // Now check if everything is ready.
        // We use default API data if the promise fails.
        this.readyPromise = Promise.all([
            gameDataPromise,
            videoAdPromise
        ]).then((response) => {
            this.eventBus.broadcast('API_READY', {
                name: 'API_READY',
                message: 'Everything is ready.',
                status: 'success'
            });
            return response[0];
        }).catch(() => {
            this.eventBus.broadcast('API_READY', {
                name: 'API_ERROR',
                message: 'The API failed.',
                status: 'error'
            });
            return false;
        });

        // Todo: only for testing.
        this.showBanner();

        // Todo: only show this based on debug cookie.
        const implementation = new ImplementationTest();
        implementation.start(this.options);
    }

    /**
     * _onEvent - Gives us a nice console log message for all our events going through the EventBus.
     * @param event: Object
     * @private
     */
    _onEvent(event) {
        // Show the event in the log.
        dankLog(event.name, event.message, event.status);
        // Send the event to the developer.
        this.options.onEvent(event);
    }

    /**
     * showBanner - Used by our developer to call a video advertisement.
     * @public
     */
    showBanner() {
        this.readyPromise.then((gameData) => {
            if (gameData.advertisements) {
                this.videoAdInstance.play();
            } else {
                this.videoAdInstance.cancel();
                this.onResumeGame('Advertisements and/ or pre-roll is disabled. Start / resume the game.', 'warning');
            }
        }).catch((error) => {
            this.onResumeGame(error, 'error');
        });
    }

    /**
     * customLog - GD Logger sends how many times 'CustomLog' that is called related to given by _key name. If you invoke
     * 'CustomLog' many times, it increases 'CustomLog' counter and sends this counter value.
     * @param key: String
     * @public
     */
    customLog(key) {
        // Todo: wtf is customLog() :D
    }

    /**
     * play - GD Logger sends how many times 'PlayGame' is called. If you invoke 'PlayGame' many times, it increases
     * 'PlayGame' counter and sends this counter value.
     * @public
     */
    play() {
        console.info('Call play');
    }


    href() {
        console.info('Call href');
    }

    /**
     * onResumeGame - Called from various moments within the API. This sends out an event to our developer,
     * so he/ she can allow the game to resume again. We also call resumeGame() for backwards compatibility reasons.
     * @param message: String
     * @param status: String
     */
    onResumeGame(message, status) {
        this.options.resumeGame();
        this.eventBus.broadcast('API_GAME_START', {
            name: 'API_GAME_START',
            message: message,
            status: status
        });

        // Todo: enable ga
        // _gd_ga('gd.send',{
        //     hitType: 'event',
        //     eventCategory: 'Game',
        //     eventAction: 'Resume',
        //     eventLabel: this.options.gameId
        // });
    }

    onPauseGame(message, status) {
        this.options.pauseGame();
        this.eventBus.broadcast('API_GAME_PAUSE', {
            name: 'API_GAME_PAUSE',
            message: message,
            status: status
        });


        // Todo: enable ga
        // _gd_ga('gd.send',{
        //     hitType: 'event',
        //     eventCategory: 'Game',
        //     eventAction: 'Pause',
        //     eventLabel: this.options.gameId
        // });
    }
}

export default API;