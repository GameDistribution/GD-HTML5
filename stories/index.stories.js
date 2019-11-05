import gameData from "./gameData";
import options from "./options";
import Quantum from "../src/splash/quantum";
import Mars from "../src/splash/mars";
import Venus from "../src/splash/venus";

export default {
  title: "Splash"
};

export const quantum = () => {
  const splash = new Quantum(
    { ...options, isConsentDomain: false },
    gameData.result.game
  );
  return splash.getRoot();
};
export const quantumWithConstent = () => {
  const splash = new Quantum(
    { ...options, isConsentDomain: true },
    gameData.result.game
  );
  return splash.getRoot();
};

export const mars = () => {
  const splash = new Mars(
    { ...options, isConsentDomain: false },
    gameData.result.game
  );
  return splash.getRoot();
};

export const marsWithConsent = () => {
  const splash = new Mars(
    { ...options, isConsentDomain: true },
    gameData.result.game
  );
  return splash.getRoot();
};

export const venus = () => {
  const splash = new Venus(
    { ...options, isConsentDomain: false },
    gameData.result.game
  );
  return splash.getRoot();
};
