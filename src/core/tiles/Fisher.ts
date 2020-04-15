import { StandardTile, toProductivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { TileChecker } from "./TileChecker";
import { Water } from "./Water";

export type Fisher = StandardTile<
  "Fisher",
  "WildFish",
  "Fish",
  "Money" | "Wood" | "Tool"
>;
export const Fisher: Fisher = {
  tag: "Fisher",
  consumes: {
    WildFish: 1,
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
  },
  formula: {
    Fish: {
      WildFish: 2,
    },
  },

  allowed: TileChecker.create<Water>("Water"),

  influence: (coord): Coordinate[] => Coordinate.range(coord, 1),

  productivity: () => toProductivity(1),
  baseProductivity: () => toProductivity(1),

  create: (coord) => new FisherInstance(coord),
};

class FisherInstance extends StandardTickingInstance(Fisher) {}
