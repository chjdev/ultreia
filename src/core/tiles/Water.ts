import { Tile, TileInstance } from "./Tile";
import { Coordinate } from "../Coordinate";

let instance: WaterInstance | undefined;
export type Water = Tile<"Water">;
export const Water: Water = {
  tag: "Water",

  create: () => {
    if (instance == null) {
      instance = new WaterInstance(Coordinate.ZERO);
    }
    return instance;
  },
};

class WaterInstance extends TileInstance(Water) {}
