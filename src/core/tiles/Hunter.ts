import { StandardTile, toProductivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { Lumberjack } from "./Lumberjack";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Hunter = StandardTile<
  "Hunter",
  "Game",
  "Meat" | "RawHide",
  "Wood" | "Tool" | "Money"
>;
export const Hunter: Hunter = {
  tag: "Hunter",
  consumes: {
    Game: 20,
  },
  produces: {
    Meat: 10,
    RawHide: 5,
  },
  costs: {
    Wood: 10,
    Tool: 2,
    Money: 100,
  },
  initialState: {
    Game: 0,
    Meat: 0,
    RawHide: 0,
  },
  formula: {
    Meat: {
      Game: 1,
    },
    RawHide: {
      Game: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Lumberjack.influence(coord),

  productivity: () => toProductivity(1),
  baseProductivity: () => toProductivity(1),

  create: (coord) => new HunterInstance(coord),
};

class HunterInstance extends StandardTickingInstance(Hunter) {}
