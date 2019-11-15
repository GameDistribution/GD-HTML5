"use strict";

import "whatwg-fetch";
import { Base64 } from "js-base64";
import UAParser from "ua-parser-js";

/** Mesage Router */
class MessageRouter {
  constructor(config) {
    this._config = config || {};
    this._url = config.url || "https://msgrt.gamedistribution.com/collect";
    this._topic_counter = {};
    this._ua = new UAParser().getResult();
  }
  send(subtopic, args) {
    // get size
    let w =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    let h =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;
    w = w - (w % 64);
    h = h - (h % 64);

    this._size = `${w} x ${h}`;

    let counter = this._topic_counter[subtopic] || 0;
    this._topic_counter[subtopic] = ++counter;
    let base = {
      gmid: this._config.gameId,
      tdmn: this._config.topDomain,
      domn: this._config.domain,
      rfrr: this._config.referrer,
      lthr: this._config.hours,
      ctry: this._config.country,
      dpth: this._config.depth,
      vers: this._config.version,
      trac: this._config.tracking,
      whlb: this._config.whitelabel,
      plat: this._config.platform,
      tpct: counter,
      args: args,
      ttle: document.title,
      size: this._size,
      brnm: this._ua.browser.name,
      brmj: this._ua.browser.major,
      osnm: this._ua.os.name,
      osvr: this._ua.os.version,
      dvmd: this._ua.device.model,
      byld: this._config.byloader,
      bylv: this._config.byloaderVersion,
      imgu: this._config.isMasterGameURL
    };

    base = encodeURIComponent(Base64.encode(JSON.stringify([base])));
    fetch(this._url + `?tp=com.gdsdk.${subtopic}&ar=${base}&ts=${Date.now()}`);
  }
  setGameData(gameData) {
    this._gameData = gameData;
    this._config.country = gameData.ctry;
  }
}

export default MessageRouter;
