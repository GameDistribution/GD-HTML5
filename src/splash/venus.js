import Base from "./base";
import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import {
  createBreakpoint,
  useBattery,
  useOrientation,
  useIdle
} from "react-use";

const useBreakpoint = createBreakpoint({
  XL: 1920,
  LG: 1280,
  MD: 960,
  SM: 600,
  XS: 0
});

function SplashContainer(props) {
  const { container, context } = props;
  const batteryState = useBattery();
  const breakpoint = useBreakpoint();
  const state = useOrientation();

  if (breakpoint === "XL")
    return <div> Extra Large {JSON.stringify(state, null, 2)}</div>;
  else if (breakpoint == "LG")
    return <div> Large {JSON.stringify(state, null, 2)}</div>;
  else if (breakpoint == "MD")
    return <div> Medium {JSON.stringify(state, null, 2)}</div>;
  else if (breakpoint == "SM")
    return <div> Small {JSON.stringify(state, null, 2)}</div>;
  else if (breakpoint == "XS")
    return <div> Extra Small {JSON.stringify(state, null, 2)}</div>;
  else return <div>??? {JSON.stringify(state, null, 2)}</div>;
}

// console.log(test2);
class Venus extends Base {
  constructor(options, gameData) {
    super(options, gameData);
    this.onPlayClick = this.onPlayClick.bind(this);
    this._init();
  }

  _init() {
    this._root = document.createElement("div");
    let rootStyle = {
      "box-sizing": "border-box",
      position: "absolute",
      "z-index": "664",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      "background-color": "white"
    };
    Object.assign(this._root.style, rootStyle);

    this._containerRef = React.createRef();
    ReactDOM.render(
      <SplashContainer
        container={this._containerRef}
        context={this}
      ></SplashContainer>,
      this._root
    );

    this._insertHtml();
  }

  onPlayClick() {
    console.log(this);
  }

  _insertHtml() {
    // Create our container and add the markup.
    const container = this._root;
    container.id = `${this.options.prefix}splash`;

    // Flash bridge SDK will give us a splash container id (splash).
    // If not; then we just set the splash to be full screen.
    const splashContainer = this.options.flashSettings.splashContainerId
      ? document.getElementById(this.options.flashSettings.splashContainerId)
      : null;
    if (splashContainer) {
      splashContainer.style.display = "block";
      splashContainer.insertBefore(container, splashContainer.firstChild);
    } else {
      const body = document.body || document.getElementsByTagName("body")[0];
      body.insertBefore(container, body.firstChild);
    }

    return { container, splashContainer };
  }
}
export default Venus;
