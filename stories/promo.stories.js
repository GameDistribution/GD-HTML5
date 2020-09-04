import gameData from "./gameData";
import options from "./options";

import { Hammer } from "@bygd/gd-sdk-stone/dist/default";
import { Puzzle } from "@bygd/gd-sdk-stone/dist/default";

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