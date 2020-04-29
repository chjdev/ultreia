import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { TileChecker } from "./TileChecker";
import { Water } from "./Water";
import { FishSchool } from "./FishSchool";
import { Territory } from "../Territory";

export type Fisher = StandardTile<
  "Fisher",
  "WildFish" | "Money",
  "Fish",
  "Money" | "Wood" | "Tool"
>;
export const Fisher: Fisher = {
  tag: "Fisher",
  consumes: {
    WildFish: 10,
    Money: 20,
  },
  produces: {
    Fish: 10,
  },
  costs: {
    Money: 500,
    Wood: 20,
    Tool: 7,
  },
  initialState: {
    WildFish: 0,
    Fish: 0,
    Money: 0,
  },
  formula: {
    Fish: {
      WildFish: 2,
      Money: 4,
    },
  },

  allowed: (coord) =>
    Territory.hasWarehouse(coord) && TileChecker.check<Water>(coord, "Water"),

  influence: (coord): Coordinate[] => Coordinate.range(coord, 1),

  productivity: Productivity.fromStock,
  baseProductivity: (coord) =>
    Productivity.fromTileReachability<Fisher, FishSchool>(
      Fisher,
      "FishSchool",
      coord,
      2,
    ),
  create: (coord) => new FisherInstance(coord),
};

class FisherInstance extends StandardTickingInstance(Fisher) {}
