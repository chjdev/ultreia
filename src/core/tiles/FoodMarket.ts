import { StandardTile, Productivity } from "./Tile";
import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { isBuildable } from "./utils";

export type FoodMarket = StandardTile<
  "FoodMarket",
  "Potato" | "Fish" | "Bread" | "Meat" | "Money",
  "Food",
  "Money" | "Wood" | "Tool"
>;
export const FoodMarket: FoodMarket = {
  tag: "FoodMarket",
  consumes: {
    Potato: 50,
    Fish: 50,
    Bread: 50,
    Meat: 50,
    Money: 50,
  },
  produces: {
    Food: 200,
  },
  costs: {
    Money: 500,
    Wood: 20,
    Tool: 7,
  },
  initialState: {
    Potato: 0,
    Fish: 0,
    Bread: 0,
    Meat: 0,
    Food: 0,
    Money: 0,
  },
  formula: {
    Food: [
      {
        Potato: 5,
        Money: 2,
      },
      {
        Fish: 2,
        Money: 2,
      },
      {
        Bread: 3,
        Money: 2,
      },
      {
        Meat: 1,
        Money: 2,
      },
    ],
  },

  allowed: isBuildable,

  influence: (coord): Coordinate[] => Coordinate.range(coord, 6),

  productivity: Productivity.fromStock,
  baseProductivity: Productivity.simple,

  create: (coord) => new FoodMarketInstance(coord),
};

class FoodMarketInstance extends StandardTickingInstance(FoodMarket) {}
