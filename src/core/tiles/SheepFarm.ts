import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";
import { SheepPasture } from "./SheepPasture";

export type SheepFarm = StandardTile<
  "SheepFarm",
  "Sheep" | "Money",
  "Wool",
  "Money" | "Wood" | "Tool"
>;
export const SheepFarm: SheepFarm = {
  tag: "SheepFarm",
  consumes: {
    Sheep: 20,
    Money: 20,
  },
  produces: {
    Wool: 10,
  },
  costs: {
    Money: 500,
    Wood: 20,
    Tool: 7,
  },
  initialState: {
    Sheep: 0,
    Wool: 0,
    Money: 0,
  },
  formula: {
    Wool: {
      Sheep: 2,
      Money: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 3),

  productivity: Productivity.fromStock,
  baseProductivity: (coord) =>
    Productivity.fromTileReachability<SheepFarm, SheepPasture>(
      SheepFarm,
      "SheepPasture",
      coord,
      2,
    ),

  create: (coord) => new SheepFarmInstance(coord),
};

class SheepFarmInstance extends StandardTickingInstance(SheepFarm) {}
