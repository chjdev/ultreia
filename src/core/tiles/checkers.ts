import { TileChecker } from "./TileChecker";
import { Warehouse } from "./Warehouse";

// important: prefer tag style to prevent possible cycles

export const isWarehouse = TileChecker.create<Warehouse>("Warehouse");

export const isCivic = TileChecker.create(
  "Warehouse",
  "Pioneer",
  "Chapel",
  "Inn",
  "Market",
);

export const isRoadPoint = TileChecker.not(
  TileChecker.create("Grass", "Mountain", "Forest", "Water", "FishSchool"),
);
