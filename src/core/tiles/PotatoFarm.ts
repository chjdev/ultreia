import { StandardTile } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type PotatoFarm = StandardTile<
  "PotatoFarm",
  "PotatoPlant",
  "Potato",
  "Money" | "Wood" | "Tool"
>;
export const PotatoFarm: PotatoFarm = {
  tag: "PotatoFarm",
  consumes: {
    PotatoPlant: 20,
  },
  produces: {
    Potato: 10,
  },
  costs: {
    Money: 500,
    Wood: 20,
    Tool: 7,
  },
  initialState: {
    PotatoPlant: 0,
    Potato: 0,
  },
  formula: {
    Potato: {
      PotatoPlant: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 3),

  productivity: (): number => 1,

  create: (coord) => new PotatoFarmInstance(coord),
};

class PotatoFarmInstance extends StandardTickingInstance(PotatoFarm) {}
