import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { Lumberjack } from "./Lumberjack";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";
import { Forest } from "./Forest";

export type Hunter = StandardTile<
  "Hunter",
  "Game" | "Money",
  "Meat" | "RawHide",
  "Wood" | "Tool" | "Money"
>;
export const Hunter: Hunter = {
  tag: "Hunter",
  consumes: {
    Game: 20,
    Money: 20,
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
    Money: 0,
  },
  formula: {
    Meat: {
      Game: 1,
      Money: 2,
    },
    RawHide: {
      Game: 1,
      Money: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Lumberjack.influence(coord),

  productivity: Productivity.fromStock,
  baseProductivity: (coord) =>
    Productivity.fromTileReachability<Hunter, Forest>(Hunter, "Forest", coord),

  create: (coord) => new HunterInstance(coord),
};

class HunterInstance extends StandardTickingInstance(Hunter) {}
