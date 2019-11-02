import Base from "./base";

class Quantum extends Base {
  constructor(config) {
    super(config);

    this._init();
  }
  _init() {
    super._init();
    this._root.appendChild(this._test1());
    this._root.appendChild(this._test1());
    this._root.appendChild(this._test1());
  }

  _test1() {
    const el1 = document.createElement("button");
    el1.type = "button";
    el1.innerText = "PLAY";
    el1.style.height = "100%";
    // el1.addEventListener("click", e => console.log(e));
    return el1;
  }
}

export default Quantum;
