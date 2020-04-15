import { StandardTile, toProductivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Weaver = StandardTile<
  "Weaver",
  "Wool",
  "Cloth",
  "Money" | "Wood" | "Tool"
>;
export const Weaver: Weaver = {
  tag: "Weaver",
  consumes: {
    Wool: 60,
  },
  produces: {
    Cloth: 30,
  },
  costs: {
    Money: 900,
    Wood: 10,
    Tool: 10,
  },
  initialState: {
    Wool: 0,
    Cloth: 0,
  },
  formula: {
    Cloth: {
      Wool: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  productivity: () => toProductivity(1),
  baseProductivity: () => toProductivity(1),

  create: (coord) => new WeaverInstance(coord),
};

class WeaverInstance extends StandardTickingInstance(Weaver) {}
