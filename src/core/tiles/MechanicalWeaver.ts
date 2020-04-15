import { StandardTile } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type MechanicalWeaver = StandardTile<
  "MechanicalWeaver",
  "Wool" | "Cotton",
  "Cloth",
  "Money" | "Wood" | "Stone" | "Brick" | "Tool"
>;
export const MechanicalWeaver: MechanicalWeaver = {
  tag: "MechanicalWeaver",
  consumes: {
    Wool: 120,
    Cotton: 240,
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
  },
  formula: {
    Cloth: {
      Wool: 2,
      Cotton: 5,
    },
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  productivity: (): number => 1,

  create: (coord) => new MechanicalWeaverInstance(coord),
};

class MechanicalWeaverInstance extends StandardTickingInstance(
  MechanicalWeaver,
) {}
