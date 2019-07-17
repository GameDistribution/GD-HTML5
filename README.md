[![npm](https://img.shields.io/npm/v/npm.svg)](https://nodejs.org/)
[![GitHub version](https://img.shields.io/badge/version-1.3.0-green.svg)](https://github.com/GameDistribution/GD-HTML5/)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/GameDistribution/GD-HTML5/blob/master/LICENSE)


# Gamedistribution.com HTML5 SDK
This is the documentation of the "GameDistribution.com HTML5 SDK" project.

Gamedistribution.com is the biggest broker of high quality, cross-platform games. We connect the best game developers to the biggest publishers.

Running into any issues? Check out the F.A.Q. within the Wiki of the github repository before mailing to <a href="support@gamedistribution.com" target="_blank">support@gamedistribution.com</a>

## Implementation within games
The SDK should be integrated within HTML5 games by loading it through our CDN. Specific information of the SDK features and usages can be found at the <a href="https://github.com/GameDistribution/GD-HTML5/wiki" target="_blank">wiki</a>.

### Implementation self-hosted games.
In the case where a developer wants to self-host their game; the SDK should be implemented within the game as aforementioned. The only difference is that they will have to upload a zipped `index.html`-file containing an iframe with the following query variable: `GD_SDK_REFERRER_URL`. The value of this variable should be the parentUrl. A perfect example can be found at `./index_iframe.html`. 

## Debugging
Games, which include the SDK, can be easily debugged by calling the following from a browser developer console:
```
gdsdk.openConsole();
```
The gdsdk namespace is set when creating the SDK instance. We can't change the name of this namespace as it is still used within games using the old SDK implementation.

## Repository
The SDK is maintained on a public github repository.
<a href="https://github.com/gamedistribution/GD-HTML5" target="_blank">https://github.com/gamedistribution/GD-HTML5</a>

## Deployment
Deployment of the SDK to production environments is done through TeamCity.

## Installation for development
Install the following programs:
* [NodeJS LTS](https://nodejs.org/).
* [Grunt](http://gruntjs.com/).

Pull in the rest of the requirements using npm:
```
npm install
```

Setup a local node server, watch changes and update your browser view automatically:
```
grunt
```

Make a production build:
```
grunt build
```

Make a production build of the promotion script. This script is loaded through advertisement slots to support for cross promotions:
```
grunt promo
```

## Events
### SDK EVENTS
The SDK events should be used by developers to start or pause their game or handling critical errors. Unless the errors are ad related, then they could hook into the AD_ERROR event, however; the SDK should gracefully fail, so this should not be needed.

| Event | Description |
| --- | --- |
| SDK_READY | When the SDK is ready. |
| SDK_ERROR | When the SDK has hit a critical error. |
| SDK_GAME_START | When the game should start. |
| SDK_GAME_PAUSE | When the game should pause. |
| SDK_GDPR_TRACKING | When the publishers' client has requested to not track his/ her data. Hook into this event to find out if you can record client tracking data. |
| SDK_GDPR_TARGETING | When the publishers' client has requested to not get personalised advertisements. Hook into this event to find out if you can display personalised advertisements in case you use another ad solution. |
| SDK_GDPR_THIRD_PARTY | When the publishers' client has requested to not load third party services. Hook into this event to find out if you can third party services like Facebook, AddThis, and such alike. |

### IMA SDK EVENTS
The SDK events are custom ads for handling any thing related to the IMA SDK itself.

| Event | Description |
| --- | --- |
| AD_SDK_MANAGER_READY | When the adsManager instance is ready with ads. |
| AD_SDK_CANCELED | When the ad is cancelled or stopped because its done running an ad. |

### AD EVENTS
The Gamedistribution.com SDK uses the IMA SDK for loading ads. All events of this SDK are also available to the developer.
https://developers.google.com/interactive-media-ads/docs/sdks/html5/

| Event | Description |
| --- | --- |
| AD_ERROR | When the ad it self has an error. | 
| AD_BREAK_READY | Fired when an ad rule or a VMAP ad break would have played if autoPlayAdBreaks is false. |
| AD_METADATA | Fired when an ads list is loaded. |
| ALL_ADS_COMPLETED | Fired when the ads manager is done playing all the ads. |
| CLICK | Fired when the ad is clicked. |
| COMPLETE | Fired when the ad completes playing. |
| CONTENT_PAUSE_REQUESTED | Fired when content should be paused. This usually happens right before an ad is about to cover the content. |
| CONTENT_RESUME_REQUESTED | Fired when content should be resumed. This usually happens when an ad finishes or collapses. |
| DURATION_CHANGE | Fired when the ad's duration changes. |
| FIRST_QUARTILE | Fired when the ad playhead crosses first quartile. |
| IMPRESSION | Fired when the impression URL has been pinged. |
| INTERACTION | Fired when an ad triggers the interaction callback. Ad interactions contain an interaction ID string in the ad data. |
| LINEAR_CHANGED | Fired when the displayed ad changes from linear to nonlinear, or vice versa. |
| LOADED | Fired when ad data is available. |
| LOG | Fired when a non-fatal error is encountered. The user need not take any action since the SDK will continue with the same or next ad playback depending on the error situation. |
| MIDPOINT | Fired when the ad playhead crosses midpoint. |
| PAUSED | Fired when the ad is paused. |
| RESUMED | Fired when the ad is resumed. |
| SKIPPABLE_STATE_CHANGED | Fired when the displayed ads skippable state is changed. |
| SKIPPED | Fired when the ad is skipped by the user. |
| STARTED | Fired when the ad starts playing. |
| THIRD_QUARTILE | Fired when the ad playhead crosses third quartile. |
| USER_CLOSE | Fired when the ad is closed by the user. |
| VOLUME_CHANGED | Fired when the ad volume has changed. |
| VOLUME_MUTED | Fired when the ad volume has been muted. |
