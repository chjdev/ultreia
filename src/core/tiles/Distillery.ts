import { StandardTile } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Distillery = StandardTile<
  "Distillery",
  "Potato" | "Wheat" | "SugarCane",
  "Spirit",
  "Money" | "Wood" | "Tool" | "Stone"
>;
export const Distillery: Distillery = {
  tag: "Distillery",
  consumes: {
    Potato: 50,
    Wheat: 50,
    SugarCane: 50,
  },
  produces: {
    Spirit: 100,
  },
  costs: {
    Money: 500,
    Wood: 20,
    Tool: 7,
    Stone: 10,
  },
  initialState: {
    Potato: 0,
    Wheat: 0,
    SugarCane: 0,
    Spirit: 0,
  },
  formula: {
    Spirit: [
      {
        Potato: 5,
      },
      {
        Wheat: 10,
      },
      {
        SugarCane: 3,
      },
    ],
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  // todo based on inhabitants in vicinity
  productivity: (): number => 1,

  create: (coord) => new DistilleryInstance(coord),
};

class DistilleryInstance extends StandardTickingInstance(Distillery) {}
