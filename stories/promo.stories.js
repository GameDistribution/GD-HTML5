import gameData from "./gameData";
import options from "./options";
import Puzzle from "../src/promo/puzzle";
import Hammer from "../src/promo/hammer";

export default {
  title: "Promo"
};

export const hammer = () => {
  const promo = new Hammer({ ...options }, gameData.result.game);
  return promo.getRoot();
};

export const puzzle = () => {
  const promo = new Puzzle({ ...options }, gameData.result.game);
  return promo.getRoot();
};