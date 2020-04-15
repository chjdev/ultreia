import { Tile, TileInstance } from "./Tile";
import { Coordinate } from "../Coordinate";

let instance: GrassInstance | undefined;
export type Grass = Tile<"Grass">;
export const Grass: Grass = {
  tag: "Grass",

  create: () => {
    if (instance == null) {
      instance = new GrassInstance(Coordinate.ZERO);
    }
    return instance;
  },
};

class GrassInstance extends TileInstance(Grass) {}
