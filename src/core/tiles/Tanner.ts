import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { Lumberjack } from "./Lumberjack";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Tanner = StandardTile<
  "Tanner",
  "RawHide" | "Money",
  "Leather",
  "Wood" | "Tool" | "Money"
>;
export const Tanner: Tanner = {
  tag: "Tanner",
  consumes: {
    RawHide: 20,
    Money: 20,
  },
  produces: {
    Leather: 5,
  },
  costs: {
    Wood: 10,
    Tool: 5,
    Money: 300,
  },
  initialState: {
    Leather: 0,
    RawHide: 0,
    Money: 0,
  },
  formula: {
    Leather: {
      RawHide: 2,
      Money: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Lumberjack.influence(coord),

  productivity: Productivity.fromStock,
  baseProductivity: Productivity.simple,

  create: (coord) => new TannerInstance(coord),
};

class TannerInstance extends StandardTickingInstance(Tanner) {}
