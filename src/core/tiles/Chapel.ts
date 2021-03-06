import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type Chapel = StandardTile<
  "Chapel",
  "Money",
  "Faith",
  "Money" | "Wood" | "Tool"
>;
export const Chapel: Chapel = {
  tag: "Chapel",
  consumes: {
    Money: 10,
  },
  produces: {
    Faith: 200,
  },
  prerequisite: {
    Pioneer: 50,
  },
  costs: {
    Money: 100,
    Wood: 20,
    Tool: 5,
  },
  initialState: {
    Money: 0,
    Faith: 0,
  },
  formula: {
    Faith: {
      Money: 10,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 4),

  productivity: Productivity.fromStock,
  baseProductivity: Productivity.simple,

  create: (coord) => new ChapelInstance(coord),
};

class ChapelInstance extends StandardTickingInstance(Chapel) {}
