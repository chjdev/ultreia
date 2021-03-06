import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Weaver = StandardTile<
  "Weaver",
  "Wool" | "Money",
  "Cloth",
  "Money" | "Wood" | "Tool"
>;
export const Weaver: Weaver = {
  tag: "Weaver",
  consumes: {
    Wool: 20,
    Money: 200,
  },
  produces: {
    Cloth: 10,
  },
  costs: {
    Money: 900,
    Wood: 10,
    Tool: 10,
  },
  initialState: {
    Wool: 0,
    Cloth: 0,
    Money: 0,
  },
  formula: {
    Cloth: {
      Wool: 2,
      Money: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  productivity: Productivity.fromStock,
  baseProductivity: Productivity.simple,

  create: (coord) => new WeaverInstance(coord),
};

class WeaverInstance extends StandardTickingInstance(Weaver) {}
