import { Coordinate } from "../Coordinate";
import { StandardTickingInstance } from "./TickingInstance";
import { InhabitantTile } from "./Inhabitant";
import { isBuildable } from "./utils";
import { isCivic } from "./checkers";

export type Pioneer = InhabitantTile<
  "Pioneer",
  "Food" | "Leather",
  "Cloth" | "Alcohol" | "Faith",
  "Money",
  "Money" | "Wood",
  "Money" | "Wood" | "Tool" | "Stone"
>;
export const Pioneer: Pioneer = {
  tag: "Pioneer",
  consumes: {
    Food: 10,
    Leather: 10,
    Cloth: 10,
    Alcohol: 10,
    Faith: 10,
  },
  requires: {
    Food: 0.4,
    Leather: 0.4,
  },
  wants: {
    Food: 0.9,
    Leather: 0.9,
    Cloth: 0.4,
    Alcohol: 0.4,
    Faith: 0.4,
  },
  produces: {
    Money: 10,
  },
  costs: {
    Money: 100,
    Wood: 3,
  },
  upgrade: {
    Money: 500,
    Wood: 50,
    Tool: 10,
    Stone: 20,
  },
  initialState: {
    Money: 0,
    Faith: 0,
    Food: 0,
    Leather: 0,
    Cloth: 0,
    Alcohol: 0,
  },
  formula: {
    Money: [
      {
        Food: 20,
        Leather: 5,
      },
      {
        Cloth: 10,
      },
      {
        Alcohol: 2,
      },
      {
        Faith: 5,
      },
    ],
  },
  maxInhabitants: 20,

  allowed: (coord) =>
    isBuildable(coord) && Coordinate.neighbors(coord).some(isCivic),

  influence: (coord): Coordinate[] => Coordinate.range(coord, 4),
  productivity: (): number => 1,
  create: (coord) => new PioneerInstance(coord),
};

class PioneerInstance extends StandardTickingInstance(Pioneer) {}
