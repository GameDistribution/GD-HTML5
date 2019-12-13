import gameData from "./gameData";
import options from "./options";
import Quantum from "../src/splash/quantum";
import Mars from "../src/splash/mars";

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

export const marsWithRainbow = () => {
  const splash = new Mars(
    { ...options, isConsentDomain: false, background: "rainbow" },
    gameData.result.game
  );
  return splash.getRoot();
};
export const marsWithCarbon = () => {
  const splash = new Mars(
    { ...options, isConsentDomain: false, background: "carbon" },
    gameData.result.game
  );
  return splash.getRoot();
};
export const marsWithCicada = () => {
  const splash = new Mars(
    { ...options, isConsentDomain: false, background: "cicadastripes" },
    gameData.result.game
  );
  return splash.getRoot();
};
export const marsWithPaper = () => {
  const splash = new Mars(
    { ...options, isConsentDomain: false, background: "linedpaper" },
    gameData.result.game
  );
  return splash.getRoot();
};