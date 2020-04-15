import { StandardTile, toProductivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type SheepFarm = StandardTile<
  "SheepFarm",
  "Sheep",
  "Wool",
  "Money" | "Wood" | "Tool"
>;
export const SheepFarm: SheepFarm = {
  tag: "SheepFarm",
  consumes: {
    Sheep: 20,
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
  },
  formula: {
    Wool: {
      Sheep: 2,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 3),

  productivity: () => toProductivity(1),
  baseProductivity: () => toProductivity(1),

  create: (coord) => new SheepFarmInstance(coord),
};

class SheepFarmInstance extends StandardTickingInstance(SheepFarm) {}
