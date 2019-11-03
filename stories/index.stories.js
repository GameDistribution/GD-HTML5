import Quantum from "../splash/quantum";
import gameData from "./gameData";
import options from "./options";

export default {
  title: "Splash"
};

export const quantum = () => {
  const splash = new Quantum(options, gameData.result.game);
  return splash.getRoot();
};
