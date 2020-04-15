import { StandardTile, toProductivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";
import { Inventory } from "../Goods";

export type Forest = StandardTile<
  "Forest",
  "Nothing",
  "Tree" | "Game",
  "Money"
>;
export const Forest: Forest = {
  tag: "Forest",
  consumes: Inventory.NOTHING,
  produces: {
    Tree: 10,
    Game: 5,
  },
  costs: {
    Money: 10,
  },
  initialState: {
    Tree: 0,
    Game: 0,
  },
  formula: {
    Tree: Inventory.NOTHING,
    Game: Inventory.NOTHING,
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 1),

  productivity: () => toProductivity(1),
  baseProductivity: () => toProductivity(1),

  create: (coord) => new ForestInstance(coord),
};

class ForestInstance extends StandardTickingInstance(Forest) {}
