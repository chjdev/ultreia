import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type MechanicalWeaver = StandardTile<
  "MechanicalWeaver",
  "Wool" | "Cotton" | "Money",
  "Cloth",
  "Money" | "Wood" | "Stone" | "Brick" | "Tool"
>;
export const MechanicalWeaver: MechanicalWeaver = {
  tag: "MechanicalWeaver",
  consumes: {
    Wool: 120,
    Cotton: 240,
    Money: 40,
  },
  produces: {
    Cloth: 60,
  },
  costs: {
    Money: 1500,
    Wood: 20,
    Tool: 20,
    Stone: 10,
    Brick: 30,
  },
  initialState: {
    Wool: 0,
    Cotton: 0,
    Cloth: 0,
    Money: 0,
  },
  formula: {
    Cloth: [
      {
        Wool: 2,
        Money: 6,
      },
      {
        Cotton: 5,
        Money: 2,
      },
    ],
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  productivity: () => Productivity.fromNumber(1),
  baseProductivity: () => Productivity.fromNumber(1),

  create: (coord) => new MechanicalWeaverInstance(coord),
};

class MechanicalWeaverInstance extends StandardTickingInstance(
  MechanicalWeaver,
) {}
