import { Territory } from "../Territory";
import { Coordinate } from "../Coordinate";
import { TileChecker } from "./TileChecker";

export const isBuildable = (coord: Coordinate) =>
  TileChecker.check(coord, "Grass") && Territory.hasWarehouse(coord);
