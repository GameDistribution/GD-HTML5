import Quantum from "../splash/quantum";

export default {
  title: "Splash"
};

export const quantum = () => {
  const splash = new Quantum();
  return splash.getRoot();
};
