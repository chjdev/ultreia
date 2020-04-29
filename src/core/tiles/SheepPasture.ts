import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { Inventory } from "../Goods";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";
import { SheepFarm } from "./SheepFarm";

export type SheepPasture = StandardTile<
  "SheepPasture",
  "Nothing",
  "Sheep",
  "Money"
>;
export const SheepPasture: SheepPasture = {
  tag: "SheepPasture",
  consumes: Inventory.NOTHING,
  produces: {
    Sheep: 10,
  },
  costs: {
    Money: 50,
  },
  initialState: {
    Sheep: 0,
  },
  formula: {
    Sheep: Inventory.NOTHING,
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => SheepFarm.influence(coord),

  productivity: Productivity.simple,
  baseProductivity: Productivity.simple,

  create: (coord) => new SheepPastureInstance(coord),
};

class SheepPastureInstance extends StandardTickingInstance(SheepPasture) {}
