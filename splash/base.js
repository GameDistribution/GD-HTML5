import { EventEmitter } from "events";

class Base extends EventEmitter {
  constructor(options,gameData) {
    super();
    this.options=options;
    this.gameData=gameData;
  }
}

export default Base;
