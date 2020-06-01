import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { Inventory } from "../Goods";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";
import { SheepFarm } from "./SheepFarm";

export type PotatoField = StandardTile<
  "PotatoField",
  "Nothing",
  "PotatoPlant",
  "Money"
>;
export const PotatoField: PotatoField = {
  tag: "PotatoField",
  consumes: Inventory.NOTHING,
  produces: {
    PotatoPlant: 3,
  },
  costs: {
    Money: 50,
  },
  initialState: {
    PotatoPlant: 0,
  },
  formula: {
    PotatoPlant: Inventory.NOTHING,
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => SheepFarm.influence(coord),

  productivity: Productivity.simple,
  baseProductivity: Productivity.simple,

  create: (coord) => new PotatoFieldInstance(coord),
};

class PotatoFieldInstance extends StandardTickingInstance(PotatoField) {}
