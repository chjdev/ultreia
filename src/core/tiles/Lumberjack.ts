import { StandardTile, Productivity } from "./Tile";
import { StandardTickingInstance } from "./TickingInstance";
import { Coordinate } from "../Coordinate";
import { isBuildable } from "./utils";
import { Forest } from "./Forest";

export type Lumberjack = StandardTile<
  "Lumberjack",
  "Tree" | "Money",
  "Wood",
  "Money" | "Tool"
>;
export const Lumberjack: Lumberjack = {
  tag: "Lumberjack",
  consumes: { Tree: 30, Money: 20 },
  produces: {
    Wood: 20,
  },
  costs: {
    Money: 100,
    Tool: 5,
  },
  formula: {
    Wood: {
      Tree: 5,
      Money: 5,
    },
  },
  initialState: {
    Tree: 0,
    Wood: 0,
    Money: 0,
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 1),

  productivity: Productivity.fromStock,
  baseProductivity: (coord) =>
    Productivity.fromTileReachability<Lumberjack, Forest>(
      Lumberjack,
      "Forest",
      coord,
      3,
    ),

  create: (coord) => new LumberjackInstance(coord),
};

class LumberjackInstance extends StandardTickingInstance(Lumberjack) {}
