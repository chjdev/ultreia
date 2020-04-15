import { StandardTile } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Inn = StandardTile<
  "Inn",
  "Spirit" | "Beer",
  "Alcohol",
  "Money" | "Wood" | "Tool" | "Stone"
>;
export const Inn: Inn = {
  tag: "Inn",
  consumes: {
    Spirit: 50,
    Beer: 50,
  },
  produces: {
    Alcohol: 100,
  },
  costs: {
    Money: 500,
    Wood: 20,
    Tool: 7,
    Stone: 10,
  },
  initialState: {
    Spirit: 0,
    Beer: 0,
    Alcohol: 0,
  },
  formula: {
    Alcohol: [
      {
        Spirit: 1,
      },
      {
        Beer: 1,
      },
    ],
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  // todo based on inhabitants in vicinity
  productivity: (): number => 1,

  create: (coord) => new InnInstance(coord),
};

class InnInstance extends StandardTickingInstance(Inn) {}
