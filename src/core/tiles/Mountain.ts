import { Tile, TileInstance } from "./Tile";
import { Coordinate } from "../Coordinate";

let instance: MountainInstance | undefined;
export type Mountain = Tile<"Mountain">;
export const Mountain: Mountain = {
  tag: "Mountain",

  create: () => {
    if (instance == null) {
      instance = new MountainInstance(Coordinate.ZERO);
    }
    return instance;
  },
};

class MountainInstance extends TileInstance(Mountain) {}
