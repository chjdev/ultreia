import { Productivity, StandardTile } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";
import { TileChecker } from "./TileChecker";
import { Mountain } from "./Mountain";

export type Quarry = StandardTile<"Quarry", "Money", "Stone", "Money">;
export const Quarry: Quarry = {
  tag: "Quarry",
  consumes: {
    Money: 10,
  },
  prerequisite: {
    Pioneer: 100,
  },
  produces: {
    Stone: 10,
  },
  costs: {
    Money: 10,
  },
  initialState: {
    Stone: 0,
    Money: 0,
  },
  formula: {
    Stone: {
      Money: 2,
    },
  },

  allowed: (coord) =>
    isBuildable(coord) &&
    Coordinate.neighbors(coord).some(TileChecker.create<Mountain>("Mountain")),

  influence: (coord): Coordinate[] => Coordinate.range(coord, 1),

  productivity: Productivity.fromStock,
  baseProductivity: Productivity.simple,

  create: (coord) => new QuarryInstance(coord),
};

class QuarryInstance extends StandardTickingInstance(Quarry) {}
