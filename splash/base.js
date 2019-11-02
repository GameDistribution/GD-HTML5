import { EventEmitter } from "events";

class Base extends EventEmitter {
  constructor(config) {
    super();
  }
  _init() {
    let root = document.createElement("div");
    let style = {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      "box-sizing": "border-box",
      display: "flex",
      "flex-direction": "column",
      "background-color": "green"
    };
    Object.assign(root.style, style);
    this._root = root;
  }
  getRoot() {
    return this._root;
  }
}

export default Base;
