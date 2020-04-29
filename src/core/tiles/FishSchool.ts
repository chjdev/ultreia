import { StatefulTile, Productivity } from "./Tile";
import { StatefulTickingInstance } from "./TickingInstance";
import { Coordinate } from "../Coordinate";
import { Inventory } from "../Goods";

export type FishSchool = StatefulTile<"FishSchool", "Nothing", "WildFish">;
export const FishSchool: FishSchool = {
  tag: "FishSchool",
  consumes: Inventory.NOTHING,
  produces: {
    WildFish: 5,
  },
  initialState: {
    WildFish: 0,
  },
  formula: {
    WildFish: {},
  },

  productivity: Productivity.simple,
  baseProductivity: Productivity.simple,

  influence: (coord): Coordinate[] => [coord],

  create: (coord) => new FishSchoolInstance(coord),
};

class FishSchoolInstance extends StatefulTickingInstance(FishSchool) {}
